import os
import random
import json
import logging
import re
import base64
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mudra-backend")

app = FastAPI(title="Mudrā Realtime Bridge & MOM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SummarizeRequest(BaseModel):
    room_code: str
    slide_index: int
    image_data: str  # base64 data url
    transcript: Optional[str] = ""

class SessionReportRequest(BaseModel):
    room_code: str
    total_duration_seconds: float
    slide_durations: Dict[str, float]
    target_durations: Dict[str, float]
    filler_word_counts: Dict[str, int]
    total_filler_words: int
    pacing_accuracy_percent: float
    full_transcript: Optional[str] = ""

class RoomManager:
    def __init__(self):
        # room_code -> { "presenter": WebSocket, "audience": [WebSocket], "current_slide": int, "mom_cards": [] }
        self.rooms: Dict[str, dict] = {}

    def create_room(self, requested_code: Optional[str] = None) -> str:
        if requested_code and requested_code not in self.rooms:
            code = requested_code
        else:
            for _ in range(100):
                code = str(random.randint(1000, 9999))
                if code not in self.rooms:
                    break
        self.rooms[code] = {
            "presenter": None,
            "audience": [],
            "current_slide": 1,
            "mom_cards": [],
            "questions": [],
            "created_at": datetime.now().isoformat()
        }
        logger.info(f"Created room {code}")
        return code

    def room_exists(self, room_code: str) -> bool:
        return room_code in self.rooms

    async def register_socket(self, room_code: str, client_type: str, websocket: WebSocket):
        if room_code not in self.rooms:
            self.create_room(room_code)
        
        room = self.rooms[room_code]
        if "questions" not in room:
            room["questions"] = []

        if client_type == "presenter":
            room["presenter"] = websocket
            logger.info(f"Presenter connected to room {room_code}")
            await websocket.send_text(json.dumps({
                "type": "INIT_STATE",
                "current_slide": room["current_slide"],
                "mom_cards": room["mom_cards"],
                "questions": room["questions"],
                "audience_count": len(room["audience"])
            }))
        else:
            room["audience"].append(websocket)
            logger.info(f"Audience connected to room {room_code}. Total audience: {len(room['audience'])}")
            # Send current state, MOM cards, and Q&A questions to new audience member
            await websocket.send_text(json.dumps({
                "type": "INIT_STATE",
                "current_slide": room["current_slide"],
                "mom_cards": room["mom_cards"],
                "questions": room["questions"],
                "audience_count": len(room["audience"])
            }))
            # Notify presenter of new count
            if room["presenter"]:
                try:
                    await room["presenter"].send_text(json.dumps({
                        "type": "AUDIENCE_COUNT",
                        "count": len(room["audience"])
                    }))
                except Exception:
                    pass

    async def unregister_socket(self, room_code: str, client_type: str, websocket: WebSocket):
        if room_code in self.rooms:
            room = self.rooms[room_code]
            if client_type == "presenter":
                if room["presenter"] == websocket:
                    room["presenter"] = None
                    logger.info(f"Presenter disconnected from room {room_code}")
            elif websocket in room["audience"]:
                room["audience"].remove(websocket)
                logger.info(f"Audience member left room {room_code}. Remaining: {len(room['audience'])}")
                if room["presenter"]:
                    try:
                        await room["presenter"].send_text(json.dumps({
                            "type": "AUDIENCE_COUNT",
                            "count": len(room["audience"])
                        }))
                    except Exception:
                        pass

    async def broadcast_to_audience(self, room_code: str, message: dict):
        if room_code in self.rooms:
            dead_sockets = []
            for ws in self.rooms[room_code]["audience"]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception as e:
                    logger.warning(f"Failed to send to audience socket: {e}")
                    dead_sockets.append(ws)
            for dead in dead_sockets:
                if dead in self.rooms[room_code]["audience"]:
                    self.rooms[room_code]["audience"].remove(dead)

    async def broadcast_to_all(self, room_code: str, message: dict):
        if room_code in self.rooms:
            room = self.rooms[room_code]
            if room["presenter"]:
                try:
                    await room["presenter"].send_text(json.dumps(message))
                except Exception:
                    pass
            await self.broadcast_to_audience(room_code, message)

manager = RoomManager()

@app.get("/")
def read_root():
    return {"app": "Mudrā API", "status": "active", "rooms_active": len(manager.rooms)}

@app.post("/api/rooms")
def create_room():
    code = manager.create_room()
    return {"room_code": code}

@app.get("/api/rooms/{room_code}")
def check_room(room_code: str):
    exists = manager.room_exists(room_code)
    if not exists:
        raise HTTPException(status_code=404, detail="Room not found")
    room = manager.rooms[room_code]
    return {
        "room_code": room_code,
        "active": True,
        "current_slide": room["current_slide"],
        "audience_count": len(room["audience"]),
        "mom_cards_count": len(room["mom_cards"])
    }

@app.websocket("/ws/{room_code}/{client_type}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, client_type: str):
    await websocket.accept()
    await manager.register_socket(room_code, client_type, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                msg_type = payload.get("type")

                if msg_type == "SLIDE_UPDATE":
                    new_slide = payload.get("slide", 1)
                    if room_code in manager.rooms:
                        manager.rooms[room_code]["current_slide"] = new_slide
                    await manager.broadcast_to_audience(room_code, {
                        "type": "SLIDE_UPDATE",
                        "slide": new_slide
                    })

                elif msg_type == "AIRBLAST_URL":
                    url = payload.get("url", "")
                    title = payload.get("title", "Stage Resource")
                    slide_index = payload.get("slide_index", 1)
                    logger.info(f"AirBlast dispatched for room {room_code}: {url}")
                    card_id = f"link_{int(datetime.now().timestamp() * 1000)}"
                    timestamp_str = datetime.now().strftime("%H:%M:%S")
                    link_card = {
                        "id": card_id,
                        "type": "link",
                        "slide_index": slide_index,
                        "title": title or "Stage Resource Link",
                        "url": url,
                        "timestamp": timestamp_str,
                        "takeaway": f"Presenter pushed interactive resource link for Slide #{slide_index}.",
                        "action_items": [f"Explore link: {url}"]
                    }
                    if room_code in manager.rooms:
                        manager.rooms[room_code]["mom_cards"].append(link_card)

                    await manager.broadcast_to_audience(room_code, {
                        "type": "AIRBLAST_URL",
                        "url": url,
                        "title": title,
                        "slide_index": slide_index,
                        "link_card": link_card
                    })

                elif msg_type == "MOM_CARD":
                    card = payload.get("card", {})
                    if room_code in manager.rooms:
                        manager.rooms[room_code]["mom_cards"].append(card)
                    await manager.broadcast_to_audience(room_code, {
                        "type": "MOM_CARD",
                        "card": card
                    })

                elif msg_type == "ASK_QUESTION":
                    slide_index = payload.get("slide_index", 1)
                    question_text = (payload.get("question") or "").strip()
                    author = payload.get("author", "Audience Member")
                    if question_text and room_code in manager.rooms:
                        ai_answer = get_gemini_qa_answer(question_text, slide_index)
                        q_obj = {
                            "id": f"q_{int(datetime.now().timestamp() * 1000)}_{random.randint(100, 999)}",
                            "slide_index": slide_index,
                            "question": question_text,
                            "author": author,
                            "votes": 1,
                            "ai_answer": ai_answer,
                            "timestamp": datetime.now().strftime("%I:%M %p")
                        }
                        if "questions" not in manager.rooms[room_code]:
                            manager.rooms[room_code]["questions"] = []
                        manager.rooms[room_code]["questions"].append(q_obj)
                        await manager.broadcast_to_all(room_code, {
                            "type": "QUESTION_ADDED",
                            "question": q_obj
                        })

                elif msg_type == "UPVOTE_QUESTION":
                    q_id = payload.get("question_id")
                    if q_id and room_code in manager.rooms:
                        questions = manager.rooms[room_code].get("questions", [])
                        for q in questions:
                            if q["id"] == q_id:
                                q["votes"] = q.get("votes", 0) + 1
                                await manager.broadcast_to_all(room_code, {
                                    "type": "QUESTION_UPVOTED",
                                    "question_id": q_id,
                                    "votes": q["votes"]
                                })
                                break

                elif msg_type == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))

            except json.JSONDecodeError:
                logger.error("Invalid JSON message received on websocket")
    except WebSocketDisconnect:
        await manager.unregister_socket(room_code, client_type, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.unregister_socket(room_code, client_type, websocket)

def filter_filler_words(text: str) -> str:
    """
    Strips out vocal filler words (um, uh, like, you know, etc.)
    and verbal repetitions from the transcript.
    """
    if not text:
        return ""
    pattern = r'\b(um+|uh+|er+|ah+|like|you know|basically|literally|i mean)\b'
    cleaned = re.sub(pattern, '', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b(but|and|so)\s+(but|and|so)\b', r'\1', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def get_gemini_qa_answer(question_text: str, slide_index: int = 1) -> str:
    """
    Synthesize an authoritative, direct 1-2 line answer to audience doubts using Gemini API.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return "Answer queued for presenter live response."
    
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        prompt = f"""You are the Mudrā Presentation AI Assistant. An attendee asked this question during Slide {slide_index}:
"{question_text}"

Provide a crisp, direct, and helpful answer in exactly 1 to 2 lines. Do not use conversational greetings, filler, or preamble."""

        candidate_models = ["gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.8-flash"]
        for m in candidate_models:
            try:
                res = client.models.generate_content(model=m, contents=prompt)
                if res.text and res.text.strip():
                    return res.text.strip()
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"Failed to generate Gemini Q&A answer: {e}")

    return "Answer queued for presenter live response."

@app.post("/api/summarize")
async def summarize_action_snap(req: SummarizeRequest):
    timestamp = datetime.now().strftime("%I:%M %p")
    card_id = f"mom-{int(datetime.now().timestamp() * 1000)}"
    
    # Analyze slide visually with Google Gemini Vision API (Zero audio dependency)
    api_key = os.environ.get("GEMINI_API_KEY", "")
    summary_data = None

    if api_key and req.image_data:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            
            # Extract base64 image bytes from canvas
            header, encoded = req.image_data.split(",", 1) if "," in req.image_data else ("", req.image_data)
            image_bytes = base64.b64decode(encoded)
            img_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

            prompt = f"""You are analyzing a presentation slide image captured during Slide {req.slide_index}.
Extract and return a valid JSON object with the following fields directly from the visual content of the slide:
1. "title": A concise 3 to 5 word title summarizing the slide topic.
2. "core_takeaway": The single most important concept, principle, or message on the slide.
3. "metrics": An array of important numbers, percentages, or statistics found on the slide and an explanation of what they mean (e.g. ["99.9% - System availability uptime", "10x - Speed improvement"]). If no numbers or metrics are shown on the slide, return an empty array [].
4. "links": An array of web URLs or domain links found on the slide (e.g. ["https://..."]). If there are 0 links on the slide, return an empty array [].
5. "action_points": An array of 2 to 3 actionable next steps, key points, or practical takeaways from this slide.

Return ONLY a valid JSON object matching this schema:
{{
  "title": "string",
  "core_takeaway": "string",
  "metrics": ["string"],
  "links": ["string"],
  "action_points": ["string"]
}}"""

            candidate_models = ["gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.8-flash"]
            for model_name in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[img_part, prompt],
                        config=types.GenerateContentConfig(response_mime_type="application/json")
                    )
                    parsed = json.loads(response.text)
                    if "core_takeaway" in parsed:
                        summary_data = {
                            "title": parsed.get("title", f"Slide {req.slide_index} Insights"),
                            "core_takeaway": str(parsed.get("core_takeaway", "Core slide takeaway captured.")),
                            "metrics": [m for m in parsed.get("metrics", []) if m],
                            "links": [l for l in parsed.get("links", []) if l],
                            "action_points": [a for a in parsed.get("action_points", []) if a]
                        }
                        logger.info(f"Generated slide vision summary using {model_name}")
                        break
                except Exception as err:
                    logger.warning(f"Vision model {model_name} failed: {err}")
                    continue

        except Exception as e:
            logger.warning(f"Gemini slide vision call failed: {e}")

    if not summary_data:
        # High quality visual fallback
        summary_data = {
            "title": f"Slide {req.slide_index} Overview",
            "core_takeaway": f"Core takeaway and architectural takeaways for Slide {req.slide_index}.",
            "metrics": [],
            "links": [],
            "action_points": [
                f"Review Slide {req.slide_index} key principles",
                "Synthesize takeaways across presenter and audience interfaces"
            ]
        }

    card = {
        "id": card_id,
        "timestamp": timestamp,
        "slide_index": req.slide_index,
        "image_data": req.image_data,
        "title": summary_data["title"],
        "core_takeaway": summary_data["core_takeaway"],
        "metrics": summary_data["metrics"],
        "links": summary_data["links"],
        "action_points": summary_data["action_points"],
        "takeaway": summary_data["core_takeaway"],
        "takeaway_bullets": summary_data["action_points"]
    }

    # Store and broadcast to audience
    if req.room_code in manager.rooms:
        manager.rooms[req.room_code]["mom_cards"].append(card)
        await manager.broadcast_to_audience(req.room_code, {
            "type": "MOM_CARD",
            "card": card
        })

    return {"status": "success", "card": card}

@app.post("/api/session-report")
async def generate_session_report(req: SessionReportRequest):
    # Format slide pacing lines for telemetry analysis
    slide_summary_lines = []
    worst_overstay = None
    worst_rush = None
    max_overstay_pct = 0
    max_rush_pct = 0

    for slide_key, actual_sec in sorted(req.slide_durations.items(), key=lambda x: int(x[0]) if x[0].isdigit() else str(x[0])):
        target_sec = req.target_durations.get(slide_key, 60.0)
        actual_min = actual_sec / 60.0
        target_min = target_sec / 60.0
        diff_pct = ((actual_sec - target_sec) / target_sec) * 100 if target_sec > 0 else 0
        status_str = f"+{diff_pct:.0f}% over" if diff_pct > 0 else f"{diff_pct:.0f}% under" if diff_pct < 0 else "on target"
        slide_summary_lines.append(f"Slide {slide_key}: {actual_sec:.0f}s ({actual_min:.1f}m) vs target {target_sec:.0f}s ({target_min:.1f}m) [{status_str}]")

        if diff_pct > max_overstay_pct:
            max_overstay_pct = diff_pct
            worst_overstay = slide_key
        elif diff_pct < -max_rush_pct:
            max_rush_pct = abs(diff_pct)
            worst_rush = slide_key

    slide_summary_text = "\n".join(slide_summary_lines) if slide_summary_lines else "Single slide session."
    filler_breakdown_text = ", ".join(f"{k}: {v}" for k, v in req.filler_word_counts.items() if v > 0) or "Zero filler words detected."

    api_key = os.environ.get("GEMINI_API_KEY", "")
    report_data = None

    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            prompt = f"""You are the Mudrā Presentation Coach & Telemetry Analyst.
Analyze this presentation session telemetry:

Total Session Duration: {req.total_duration_seconds:.0f} seconds ({req.total_duration_seconds / 60:.1f} minutes)
Calculated Pacing Accuracy: {req.pacing_accuracy_percent:.1f}%
Slide Timing Breakdown:
{slide_summary_text}

Total Filler Words Counted: {req.total_filler_words}
Filler Words Breakdown: {filler_breakdown_text}

Spoken Presentation Transcript:
"{req.full_transcript if req.full_transcript else 'Technical presentation delivered without verbal audio transcript.'}"

Instructions:
1. Provide a professional, encouraging analysis.
2. CRITICAL CONSTRAINT: Do NOT assign letter grades (no A, B, C, D, or F) as they can be demoralizing. Focus on percentages, confidence levels, and technical cadence.
3. Compute an overall flow_score between 1 and 100 based on rhythm, verbal fluency, and pacing.
4. Provide a concise pacing_critique highlighting specific slides where the speaker rushed or overstayed.
5. Provide a confidence_rating (such as "Authoritative", "Conversational", "Deliberate", "Hesitant").
6. Provide an improvement_vs_benchmark comparing filler words and cadence to standard technical conference talks.
7. Provide 2 to 4 actionable_coaching_cues for future rehearsal.

Return ONLY a valid JSON object matching this schema:
{{
  "flow_score": 85,
  "filler_word_count": {req.total_filler_words},
  "pacing_critique": "string",
  "confidence_rating": "string",
  "improvement_vs_benchmark": "string",
  "actionable_coaching_cues": ["string", "string"]
}}"""

            candidate_models = ["gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.8-flash"]
            for model_name in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(response_mime_type="application/json")
                    )
                    parsed = json.loads(response.text)
                    if "flow_score" in parsed and "pacing_critique" in parsed:
                        report_data = {
                            "flow_score": int(parsed.get("flow_score", 85)),
                            "filler_word_count": int(parsed.get("filler_word_count", req.total_filler_words)),
                            "pacing_critique": str(parsed.get("pacing_critique", "Balanced delivery across slides.")),
                            "confidence_rating": str(parsed.get("confidence_rating", "Conversational")),
                            "improvement_vs_benchmark": str(parsed.get("improvement_vs_benchmark", "Strong presentation rhythm.")),
                            "actionable_coaching_cues": parsed.get("actionable_coaching_cues", [
                                "Maintain steady cadence on transition slides",
                                "Pause silently rather than using verbal fillers"
                            ])
                        }
                        logger.info(f"Generated session report via {model_name}")
                        break
                except Exception as err:
                    logger.warning(f"Session report call on {model_name} failed: {err}")
                    continue

        except Exception as e:
            logger.warning(f"Gemini session report failed: {e}")

    if not report_data:
        # High quality telemetry fallback
        critique_parts = []
        if worst_overstay:
            critique_parts.append(f"Overstayed on Slide {worst_overstay} by {max_overstay_pct:.0f}%")
        if worst_rush:
            critique_parts.append(f"rushed Slide {worst_rush} by {max_rush_pct:.0f}%")
        
        critique_str = ", ".join(critique_parts) if critique_parts else "Consistent rhythm maintained throughout all slides."

        confidence = "Authoritative" if req.total_filler_words < 5 else "Conversational" if req.total_filler_words < 12 else "Hesitant"
        flow_score = min(98, max(50, int(req.pacing_accuracy_percent * 0.75 + max(0, 25 - req.total_filler_words * 2))))

        report_data = {
            "flow_score": flow_score,
            "filler_word_count": req.total_filler_words,
            "pacing_critique": critique_str,
            "confidence_rating": confidence,
            "improvement_vs_benchmark": f"{max(15, 75 - req.total_filler_words * 4)}% cleaner delivery than baseline technical keynotes",
            "actionable_coaching_cues": [
                f"Calibrate pacing on Slide {worst_overstay or 1} to prevent compounding time constraints.",
                "Embrace silent micro-pauses when transitioning between presentation concepts."
            ]
        }

    report_data["pacing_accuracy_percent"] = req.pacing_accuracy_percent
    return {"status": "success", "report": report_data}
