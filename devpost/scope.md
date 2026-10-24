---
doc: scope
status: approved
---

# Mudrā

A zero-install, browser-native spatial presentation and stage bridge using webcam computer vision gestures to control slide decks, broadcast live links to audience devices via WebSockets, and capture automated AI meeting minutes.

## The Unique Kernel
Physical, touchless stage presence without clickers or phone checking: the presenter controls their slides with intuitive spatial hand swipes, pushes demo URLs directly to audience devices with an open-palm push gesture (AirBlast), and captures visual snapshot + AI-summarized action items with a framing gesture (Spatial MOM)—keeping complete eye contact and stage momentum.

## Who It's For
Technical speakers, conference keynote presenters, professors, and workshop leads presenting across dual-screen or multi-device setups.
- **Today's pain**: Fumbling with physical hardware clickers, turning back to touch a spacebar, shouting out shortened URLs or pasting links into chat, and losing critical Q&A notes because nobody can take notes while presenting.
- **With Mudrā**: Natural hand gestures navigate the talk, audience phones/laptops receive synced links automatically, and visual minutes of meeting build live on audience screens.

## The Core Loop
1. **Host & Connect**: The presenter opens Mudrā on their laptop, starts a room with a 4-digit code, and either drops in their slide PDF (or clicks "Load Sample Keynote"). Audience members open the audience URL and enter the 4-digit code.
2. **Present & Navigate**: The presenter speaks and navigates slides hands-free using horizontal swipe gestures, guided by an unobtrusive traffic-light status pill in the top-right corner (Red = hand out of frame, Yellow = tracking hand, Green = gesture executed).
3. **Push Resources (AirBlast)**: At interactive moments, the presenter makes an open-palm push gesture; all connected audience screens automatically launch the mapped interactive URL (quiz, code sandbox, demo) in a new tab without interrupting the presenter's view.
4. **Capture Meeting Minutes (Spatial MOM)**: When a key insight or question arises, the presenter makes a two-finger framing snap. Mudrā captures a lossless canvas snapshot of the active slide plus the recent speech transcript, generating an AI summary card that streams immediately to audience screens.
5. **Audience Takeaway**: Audience members watch their live MOM feed grow with timestamps, slide captures, and summaries, and download the full bundle (text + images) at the end of the session.

## Inspiration & Identity
- **Aesthetic**: Minimalist, clean keynote stage UI. Deep dark mode, subtle glassmorphic indicators, crisp typography, and high-contrast presentation canvas.
- **Presenter view**: Immersive full-screen slide canvas with a tiny corner status pill that doesn't distract the room.
- **Audience view**: Clean real-time timeline feed showing live MOM cards and quick-export controls.

## Why This Matters to the Learner
- Hands-on mastery of browser-native MediaPipe computer vision pipelines and landmark geometry without heavy external machine learning dependencies.
- Building a real-world, dual-surface real-time stage tool using Python WebSockets and Web Speech API.

## What "Working" Looks Like
A crisp 60-second live demo showing two screens side-by-side:
1. **Presenter Screen (Sender)**: Drops a PDF or loads the sample keynote. The top-right status pill changes from Yellow to Green as hand swipe gestures cleanly advance and rewind slides without touching the keyboard.
2. **Audience Screen (Receiver)**: Connected via 4-digit room code. 
   - When the presenter performs an open-palm push gesture, the audience screen immediately pops open the target URL in a new tab.
   - When the presenter performs a two-finger framing snap, a new Action Item card containing the slide image snapshot and an AI-generated concise summary immediately appears in the audience's live MOM feed.
   - The audience clicks "Export Minutes" to download the complete summary bundle.

## The POC Boundary
- **In**:
  - Browser-native MediaPipe Hand Landmarker for 3 core gestures: Left/Right swipe (slide navigation), Open-palm push (AirBlast link trigger), and Two-finger framing snap (MOM capture).
  - Unobtrusive corner HUD status pill: Red (no hand), Yellow (hand detected), Green (gesture triggered).
  - PDF.js rendering on HTML5 canvas with drag-and-drop PDF upload + instant "Load Sample Keynote" button with pre-mapped demo URLs.
  - Lightweight Python WebSocket server (FastAPI/websockets) managing ephemeral 4-digit room code pairing.
  - Browser Web Speech API for continuous presenter transcript buffering (rolling 30s window).
  - AI Action Snap summary generation (via backend Gemini/LLM API) packaging slide canvas snapshot + transcript into a structured MOM card.
  - Audience screen real-time feed with live MOM card streaming and client-side download/export (JSON/Markdown + images).

## Later
- Speaker notes preview on presenter secondary display.
- Real-time audience reactions (thumbs up, questions submitted from audience back to presenter HUD).
- Multi-speaker handoff in a single room.

## Explicitly Cut
- **Persistent Database**: Ephemeral in-memory WebSocket rooms only. No SQL or persistent storage needed for the POC.
- **User Authentication / Accounts**: Zero-install, instant room code handshake.
- **Complex Slide Animations / Transitions**: Focused on clean, instantaneous canvas page rendering.
- **PiP Webcam Display on Main Stage**: Presenter's video feed stays hidden from the presentation display; replaced by the minimal 3-state status pill.
- **Opening pushed links on presenter window**: Pushed URLs open only on receiver/audience screens so the presenter never loses slide focus.
