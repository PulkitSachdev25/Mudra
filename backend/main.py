import os
import random
import json
import logging
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
        if client_type == "presenter":
            room["presenter"] = websocket
            logger.info(f"Presenter connected to room {room_code}")
        else:
            room["audience"].append(websocket)
            logger.info(f"Audience connected to room {room_code}. Total audience: {len(room['audience'])}")
            # Send current state and existing MOM cards to new audience member
            await websocket.send_text(json.dumps({
                "type": "INIT_STATE",
                "current_slide": room["current_slide"],
                "mom_cards": room["mom_cards"],
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
                    title = payload.get("title", "Resource")
                    logger.info(f"AirBlast dispatched for room {room_code}: {url}")
                    await manager.broadcast_to_audience(room_code, {
                        "type": "AIRBLAST_URL",
                        "url": url,
                        "title": title
                    })

                elif msg_type == "MOM_CARD":
                    card = payload.get("card", {})
                    if room_code in manager.rooms:
                        manager.rooms[room_code]["mom_cards"].append(card)
                    await manager.broadcast_to_audience(room_code, {
                        "type": "MOM_CARD",
                        "card": card
                    })

                elif msg_type == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))

            except json.JSONDecodeError:
                logger.error("Invalid JSON message received on websocket")
    except WebSocketDisconnect:
        await manager.unregister_socket(room_code, client_type, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.unregister_socket(room_code, client_type, websocket)

@app.post("/api/summarize")
async def summarize_action_snap(req: SummarizeRequest):
    timestamp = datetime.now().strftime("%I:%M %p")
    card_id = f"mom-{int(datetime.now().timestamp() * 1000)}"
    transcript_text = (req.transcript or "").strip()
    
    # Try calling Google Gemini API if key is available
    api_key = os.environ.get("GEMINI_API_KEY", "")
    summary_data = None

    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            prompt = f"""You are Mudrā AI Meeting Minutes assistant. The speaker just triggered a key meeting minutes snap on Slide {req.slide_index}.
Here is the spoken audio transcript from the speaker around this moment:
"{transcript_text if transcript_text else 'Discussion regarding this slide architecture and implementation.'}"

Generate a crisp, structured JSON with:
1. "title": A short 3-5 word topic title.
2. "takeaway": 1-2 sentence core discussion takeaway.
3. "action_items": An array of 2 actionable bullet points.

Return ONLY valid JSON matching this structure:
{{
  "title": "string",
  "takeaway": "string",
  "action_items": ["string", "string"]
}}"""

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            parsed = json.loads(response.text)
            summary_data = {
                "title": parsed.get("title", f"Key Takeaway - Slide {req.slide_index}"),
                "takeaway": parsed.get("takeaway", "Key architectural principle established."),
                "action_items": parsed.get("action_items", ["Follow up on slide items", "Review implementation details"])
            }
        except Exception as e:
            logger.warning(f"Gemini API call failed, using heuristic summary: {e}")

    if not summary_data:
        # High quality heuristic generator when offline or no API key provided
        if transcript_text:
            first_sentence = transcript_text.split('.')[0]
            summary_data = {
                "title": f"Slide {req.slide_index}: Key Decision",
                "takeaway": first_sentence if len(first_sentence) > 10 else f"Crucial insights discussed for Slide {req.slide_index}.",
                "action_items": [
                    "Implement the discussed pipeline parameters",
                    "Coordinate across presenter and audience interfaces"
                ]
            }
        else:
            summary_data = {
                "title": f"Slide {req.slide_index} Spatial MOM",
                "takeaway": f"Recorded discussion point on Slide {req.slide_index}.",
                "action_items": [
                    "Follow up on presentation action items",
                    "Review slide visual and architecture notes"
                ]
            }

    card = {
        "id": card_id,
        "timestamp": timestamp,
        "slide_index": req.slide_index,
        "image_data": req.image_data,
        "title": summary_data["title"],
        "takeaway": summary_data["takeaway"],
        "action_items": summary_data["action_items"],
        "transcript_raw": transcript_text
    }

    # Store and broadcast to audience
    if req.room_code in manager.rooms:
        manager.rooms[req.room_code]["mom_cards"].append(card)
        await manager.broadcast_to_audience(req.room_code, {
            "type": "MOM_CARD",
            "card": card
        })

    return {"status": "success", "card": card}
