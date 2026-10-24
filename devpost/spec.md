---
doc: spec
status: approved
---

# Mudrā — Technical Specification

A zero-install, browser-native spatial presentation and stage bridge using webcam computer vision gestures to control slide decks, broadcast live links to audience devices via WebSockets, and capture automated AI meeting minutes.
PRD ref: `prd.md > Mudrā — Product Requirements`.

## How This Works, In Plain Language

Mudrā runs as a dual-surface web application backed by a lightweight Python signaling server:
1. **The Presenter Cockpit** opens on a laptop with a webcam. The presenter uploads a presentation PDF (or clicks the sample keynote). Using browser-native MediaPipe hand tracking, the presenter's gestures control the presentation:
   - **Horizontal Swiping** smoothly shuffles slides forward and backward without physical clickers.
   - **AirBlast (Fist to Open Palm)** detects the first link in the active slide, brings it forward with a cinematic focus blur, chimes an audio confirmation, and pushes it across WebSockets.
   - **Spatial MOM (Two-Finger "V" Hold)** freezes the full slide canvas losslessly, pairs it with the live microphone transcript, and requests an AI summary card.
2. **The Audience Workspace** opens on attendees' laptops or mobile phones via a 4-digit room code. Attendees don't see redundant slide mirroring; instead, they receive an interactive, personal live feed of MOM cards. Attendees use a frosted glass toolbar to draw annotations and type personal notes directly on each card, with a persistent button to export everything as a combined PDF report.

## The Core Journey Through the System

1. **Session Boot & Pairing**:
   - Presenter visits `http://localhost:5173` -> clicks "Start Session" -> requests webcam/mic -> Python backend (`main.py`) generates 4-digit code (e.g. `4821`) and registers room in memory.
   - Audience visits `http://localhost:5173/audience` -> enters `4821` -> WebSocket handshake connects audience socket to presenter's room.
   - PRD ref: `prd.md > The Core Journey > Step 1 & 2`.
2. **Slide Navigation (Card Shuffle)**:
   - Presenter swipes hand across webcam -> MediaPipe computes $\Delta X$ velocity -> triggers slide index update -> React renders horizontal card shuffle animation -> broadcasts `SLIDE_UPDATE` over WebSocket.
   - PRD ref: `prd.md > Features and Behavior > Computer Vision Gesture Engine`.
3. **AirBlast Link Push**:
   - Presenter shows fist -> opens palm towards camera -> MediaPipe detects open palm -> extracts first URL on slide -> UI triggers backdrop blur with link highlight -> plays chime sound -> sends `AIRBLAST_URL` message to WebSocket server -> server broadcasts to all connected audience clients -> audience browser automatically opens the URL in a new tab -> presenter screen unblurs.
   - PRD ref: `prd.md > The Core Journey > Step 4`.
4. **Spatial MOM Snapshot & AI Summary**:
   - Presenter holds two-finger "V" peace sign for 1.0 second -> status square flashes green -> frontend extracts full slide snapshot via `canvas.toDataURL('image/jpeg')` -> grabs recent spoken words from Web Speech API buffer -> sends payload to Python backend `/api/summarize` -> backend calls Gemini API (`gemini-2.5-flash`) -> returns structured `{ title, takeaway, action_items }` -> broadcasts `MOM_CARD` to audience.
   - PRD ref: `prd.md > The Core Journey > Step 5`.
5. **Audience Annotation & PDF Export**:
   - Audience workspace receives `MOM_CARD` -> animates card into feed -> attendee uses frosted glass pen/text tools to annotate -> attendee clicks "Download as a PDF" -> `jspdf` compiles all slide images, Gemini summaries, and personal annotations into a formatted PDF document.
   - PRD ref: `prd.md > The Core Journey > Step 6`.

## Stack

### Frontend
- **Framework**: React 18 + Vite (fast HMR, lightweight).
- **Styling**: Tailwind CSS (sleek black theme, frosted glass utilities, textured pattern overlays).
- **Computer Vision**: `@mediapipe/tasks-vision` (v0.10.x HandLandmarker) running directly in-browser via WebAssembly and WebGL. Zero native installations.
  - [MediaPipe Tasks Vision Web Docs](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker/web_js)
- **PDF Engine**: `pdfjs-dist` (v3.x / v4.x) rendering PDF pages directly onto an HTML5 canvas.
  - [Mozilla PDF.js Docs](https://mozilla.github.io/pdf.js/)
- **PDF Compilation**: `jspdf` + `html2canvas` for compiling audience MOM cards and annotations into an exportable PDF document.
  - [jsPDF Docs](https://artskydj.github.io/jsPDF/docs/)
- **Audio & Speech**: Browser-native `SpeechRecognition` / `webkitSpeechRecognition` for rolling transcript buffering; Web Audio API synthesize synthesizer/audio buffer for the AirBlast chime.

### Backend
- **Runtime**: Python 3.10+
- **Framework**: `FastAPI` + `uvicorn` (asynchronous, high performance).
  - [FastAPI Documentation](https://fastapi.tiangolo.com/)
- **Real-Time Communication**: Native `websockets` handling in-memory room routing.
- **AI Engine**: `google-genai` SDK calling Gemini models (e.g. `gemini-2.5-flash`) via `GEMINI_API_KEY`.
  - [Google GenAI SDK Docs](https://googleapis.github.io/python-genai/)

## Where It Runs and How Someone Tries It

- **Runtime**: Local development environment (Windows/macOS/Linux).
- **Environment Configuration**:
  - `backend/.env` with `GEMINI_API_KEY=your_api_key_here`
- **Start Commands**:
  1. Backend:
     ```bash
     cd backend
     python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
     ```
  2. Frontend:
     ```bash
     cd frontend
     npm run dev
     ```
- **Demo Verification**:
  - Open `http://localhost:5173` on Tab 1 (Presenter Cockpit).
  - Open `http://localhost:5173/audience` on Tab 2 (Audience Workspace).
  - Enter the 4-digit room code to establish real-time sync.

## Look and Feel
Implements `prd.md > Look and Feel`.
- **Aesthetic**: Deep sleek black (`#070709` / `#0d0e12`), completely free of cheesy AI gradients.
- **Textures**: Subtle geometric grid and textured dot matrix patterns layered across backgrounds.
- **Glassmorphism**: macOS-inspired floating menus and toolbars (`backdrop-blur-md bg-white/[0.04] border border-white/[0.08] shadow-2xl`).
- **Interactive Element**: Smooth interactive finger/cursor trail on the landing screen.
- **Presenter Visual Feedback**: A single, clean frosted-glass square in the top-right corner with zero text:
  - `border-red-500/80 bg-red-500/10` (Hand out of frame).
  - `border-amber-400/80 bg-amber-400/10` (Hand tracked, ready).
  - `border-emerald-400 bg-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.5)]` (Gesture executed).
- **Transitions**: Card-shuffle horizontal slide push animation for deck navigation; cinematic background blur with link spotlighting during AirBlast.

## Components

### Component 1: `LandingExperience`
- Renders the inviting entry screen with textured black backdrop, reactive finger trail, and macOS frosted glass card.
- Lets user choose between "Host a Keynote" (launches Presenter Cockpit) or "Join Audience" (opens 4-digit room code input).
- Implements `prd.md > The Core Journey > Step 1`.

### Component 2: `PresenterCockpit`
- Hosts the PDF.js HTML5 presentation canvas in prominent center view.
- Provides drag-and-drop PDF upload and "Load Sample Keynote" quickstart button.
- Embeds the top-right minimal frosted-glass status square.
- Manages slide index, keyboard arrow fallbacks, and the card-shuffle animation.
- Implements `prd.md > Screens and Layout > Surface 1: Presenter Screen`.

### Component 3: `VisionGestureEngine`
- Initializes MediaPipe `HandLandmarker` on a hidden/off-screen `<video>` stream.
- Analyzes landmarks at 30 FPS to classify:
  - **Swipe Navigation**: Wrist displacement $\Delta X$ with 0.8s cooldown.
  - **AirBlast**: Fist pose (all fingertips curled to base) transitioning to open palm facing camera.
  - **Spatial MOM**: Two-finger "V" (peace sign: index and middle extended, ring and pinky curled) held for 1.0 second.
- Updates the status square color state and dispatches gesture events.
- Implements `prd.md > Features and Behavior > Computer Vision Gesture Engine`.

### Component 4: `AirBlastManager`
- Scans current slide metadata or text content for the first URL.
- On AirBlast trigger: activates focus blur on slide canvas, plays Web Audio chime, sends WebSocket message, and lifts blur after transmission.
- Implements `prd.md > The Core Journey > Step 4`.

### Component 5: `SpeechTranscriptionBuffer`
- Runs browser `SpeechRecognition` in continuous mode.
- Maintains a rolling 60-second window buffer of spoken words.
- Provides recent transcript text when Spatial MOM fires.
- Implements `prd.md > Features and Behavior > Audio Transcription & AI Minutes Generator`.

### Component 6: `AudienceWorkspace`
- Connects to room via WebSocket.
- Displays dynamic timeline feed of incoming MOM cards with smooth scroll entry.
- Floating macOS frosted glass toolbar with Pen, Highlighter, and Text Note annotation tools allowing attendee to draw/write directly over cards.
- Sticky "Download as a PDF" action button compiling all annotated cards into an exportable PDF document.
- Implements `prd.md > Screens and Layout > Surface 2: Audience Screen`.

### Component 7: `PythonSignalingServer` (`backend/main.py`)
- FastAPI application managing room connections:
  - `ws://localhost:8000/ws/{room_code}/{client_type}`
- Routes slide sync and AirBlast URL broadcasts.
- Endpoint `POST /api/summarize`: Receives slide image base64 + speech transcript, invokes Gemini API, returns structured JSON summary card.
- Implements `prd.md > Features and Behavior > Audio Transcription & AI Minutes Generator`.

## Data Model

### Ephemeral Room State (In-Memory on Python Server)
```python
rooms = {
    "4821": {
        "presenter_ws": WebSocket,
        "audience_ws": [WebSocket, ...],
        "current_slide": 1,
        "mom_cards": []
    }
}
```

### WebSocket Message Protocol
```json
// Slide Navigation
{ "type": "SLIDE_UPDATE", "slide": 3 }

// AirBlast Link Push
{ "type": "AIRBLAST_URL", "url": "https://github.com/google/mediapipe" }

// Spatial MOM Card Broadcast
{
  "type": "MOM_CARD",
  "card": {
    "id": "mom-1",
    "timestamp": "10:14 AM",
    "slide_index": 3,
    "image_data": "data:image/jpeg;base64,...",
    "title": "MediaPipe In-Browser Vision Architecture",
    "takeaway": "Running HandLandmarker in WebAssembly eliminates native OS driver installs and provides sub-30ms landmark tracking.",
    "action_items": [
      "Benchmark WebGL vs CPU delegate performance on mobile browsers",
      "Tune fist-to-palm confidence threshold for stage lighting"
    ]
  }
}
```

## File Structure

```
BUILDWITHAI/
├── backend/
│   ├── main.py               # FastAPI app, WebSocket room router, Gemini summary endpoint
│   ├── requirements.txt      # fastapi, uvicorn, websockets, google-genai, python-dotenv
│   └── .env                  # GEMINI_API_KEY
├── frontend/
│   ├── index.html            # App shell, fonts, favicon
│   ├── package.json          # react, vite, tailwindcss, @mediapipe/tasks-vision, pdfjs-dist, jspdf
│   ├── vite.config.js        # Vite bundler config with top-level await for WASM
│   ├── tailwind.config.js    # Sleek black theme, frosted glass styles
│   └── src/
│       ├── main.jsx          # React DOM entry point
│       ├── App.jsx           # Router: Landing, Presenter Cockpit, Audience View
│       ├── components/
│       │   ├── LandingExperience.jsx     # Sleek textured landing, finger trail
│       │   ├── PresenterCockpit.jsx      # Slide canvas, card shuffle, top-right status square
│       │   ├── AudienceWorkspace.jsx     # Live MOM card stream, annotation tools, PDF export
│       │   ├── AnnotationCanvas.jsx      # Pen/text overlay for audience cards
│       │   └── FrostedDock.jsx           # macOS-style glass toolbar
│       ├── hooks/
│       │   ├── useMediaPipeGestures.js   # Hand tracking, swipe, airblast, V-hold detection
│       │   ├── useSpeechRecognition.js   # Rolling transcript buffer
│       │   └── useRoomWebSocket.js       # Real-time WebSocket room hook
│       ├── utils/
│       │   ├── pdfLoader.js              # PDF.js rendering & canvas image extraction
│       │   ├── sampleDeck.js             # Pre-configured 5-slide keynote with AirBlast URLs
│       │   ├── soundEffects.js           # Web Audio API chime generator for AirBlast
│       │   └── pdfExporter.js            # jsPDF compiler for audience minutes
│       └── index.css                     # Global styles, textures, animations
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   └── spec.md
├── .gitignore
└── README.md
```

## External Services and Dependencies

1. **Google Gemini API**:
   - Model: `gemini-2.5-flash` via `google-genai` Python SDK.
   - Purpose: Synthesizes speech transcript + slide snapshot into concise meeting minutes.
   - Auth: Passed via `GEMINI_API_KEY` in `backend/.env`.
2. **MediaPipe Tasks Vision Models**:
   - `hand_landmarker.task` loaded from Google's official CDN (`https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`).

## Important Failure Modes

- **Camera Permission Denied / Unavailable**: Status square shows persistent red with a subtle inline warning modal; presenter can immediately navigate using standard Left/Right keyboard arrow keys.
- **Microphone / Speech Recognition Unsupported (e.g. non-Chromium browser)**: Spatial MOM gracefully falls back to using slide OCR/text content or a placeholder transcript without halting the presentation.
- **WebSocket Disconnect**: Frontends show a discreet reconnecting pulse on the status bar and buffer local state until the connection is re-established.

## What Was Simplified and Why

- **Full-Slide Snapshot instead of 2D Reticle Crop**: Per learner decision, capturing the full canvas (`canvas.toDataURL('image/jpeg')`) with a 1-second Two-Finger ("V") hold prevents coordinate drift and gives audience members complete visual context on their cards.
- **Client-Side jsPDF Export instead of Server-Side Rendering**: Generating the audience PDF in-browser allows immediate, zero-latency downloads including attendee annotations without burdening the Python server.
- **Ephemeral In-Memory Rooms instead of Database**: 4-digit rooms live in memory during the active presentation, eliminating setup overhead and databases.

## Decisions and Open Issues

- **Learner Decision**: Sleek black aesthetic with textured patterns and no cheesy AI gradients.
- **Learner Decision**: Frosted-glass square status indicator on top-right with zero text labels.
- **Learner Decision**: Audience members get personal pen/text annotation tools on their MOM cards before exporting to PDF.
- **Learner Decision**: AirBlast extracts the first URL on the slide, focuses it with a background blur and chime sound, and automatically redirects receivers in a new tab.
- **MediaPipe Learning Goal**: Gesture classifiers are organized cleanly into `useMediaPipeGestures.js` with documented geometric calculations (velocity $\Delta X$ for swipe, fingertip curl for fist, and index/middle separation for "V" hold) so the learner can explore and tune landmark math directly.
- **Open Issues**: None blocking build.
