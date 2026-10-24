---
doc: prd
status: approved
---

# Mudrā — Product Requirements

A zero-install, browser-based spatial presentation and stage bridge that uses webcam computer vision gestures to control slide decks, broadcast live links to audience devices via WebSockets, and capture automated AI meeting minutes.
Source: `scope.md > The Unique Kernel` and `scope.md > The Core Loop`.

## The Core Journey

1. **Presenter Launch & Setup**:
   - The presenter opens Mudrā on their browser.
   - They click **"Start Session"**, which prompts for camera and microphone permissions and generates a random 4-digit room code (e.g., `5821`).
   - The presenter drags-and-drops their presentation PDF into the dropzone, or clicks **"Load Sample Keynote"** (pre-bundled deck with embedded AirBlast links).
   - The app transitions to the full-screen Presenter Stage View.

2. **Audience Connection**:
   - Audience members navigate to the receiver URL on their phone or laptop.
   - They enter the 4-digit room code and click **"Join Presentation"**.
   - They see a clean live-session screen: *"Connected to Room #5821 - Live Minutes Feed"*, with an empty state waiting for the first snap and a prominent **"Download Minutes (PDF)"** action bar.

3. **Touchless Slide Navigation**:
   - The presenter speaks naturally while standing in front of their laptop camera.
   - Top-right corner status pill indicates vision status:
     - **Red**: Hand out of webcam frame.
     - **Yellow**: Hand detected in frame (tracking active).
     - **Green**: Gesture registered and executed.
   - To advance: Presenter performs an open-hand swipe right-to-left across the camera FOV -> Advances to next slide.
   - To rewind: Presenter performs an open-hand swipe left-to-right across the camera FOV -> Rewinds to previous slide.
   - Built-in 0.8s cooldown prevents rapid accidental double-skips.
   - Fallback: Standard keyboard arrow keys (Left/Right) and a subtle slide counter (`Slide 3 of 12`) in the bottom corner.

4. **Spatial Link Push (AirBlast)**:
   - When reaching an interactive slide containing a live URL (e.g., code repo, quiz, or demo), the presenter shows a **closed fist** (priming/holding the link) and then **opens their hand flat toward the camera** (blast release).
   - The presenter's status pill flashes green and plays a subtle, crisp "ding/chime" sound confirmation. The presenter's screen remains uninterrupted on the slide.
   - Over WebSockets, the signaling server broadcasts the target URL to all connected audience screens.
   - Each audience screen automatically opens the target URL in a new browser tab.

5. **Gesture-Cued Action Snaps (Spatial MOM)**:
   - When a key audience question, discussion, or decision occurs, the presenter makes a two-finger framing gesture (index finger and thumb forming a frame).
   - An interactive, glowing bounding box appears on the presenter's screen, dynamically tracking the presenter's fingers to select the specific visual region of interest on the slide.
   - Holding the frame for 1.2s triggers the snapshot:
     - The selected region of the slide canvas is cropped losslessly.
     - The background speech recognition buffer extracts the transcript of what was spoken during this segment.
     - A backend Gemini API call synthesizes the discussion into a concise summary (Context + Key Takeaway / Action Item).
   - The resulting MOM Card (Timestamp, Cropped Slide Image, Summary Bullet Points) instantly streams into every audience member's feed.

6. **Audience Export**:
   - At any time or when the talk concludes, audience members click **"Download Minutes as PDF"**.
   - A multi-page PDF report compiles all captured slide snapshots and formatted Gemini summaries in chronological order for instant offline takeaway.

## Screens and Layout

### Surface 1: Presenter Screen (Sender)
- **Setup View**:
  - Clean modal with **"Start Session"** button.
  - 4-digit room code badge with "Copy Link" helper.
  - Dropzone for presentation PDF (`.pdf`) + secondary button **"Load Sample Keynote"**.
  - Permission check indicator (Camera & Microphone status).
- **Stage View (Presentation Mode)**:
  - Fullscreen presentation canvas rendering active PDF slide.
  - Top-Right corner HUD status pill: Minimal circular/pill indicator (Red / Yellow / Green). No distracting webcam feed.
  - Bottom-Left/Right HUD: Discreet slide counter (e.g. `4 / 15`).
  - Framing Reticle Overlay: Visible only when index-thumb framing gesture is detected, displaying a smooth bounding frame around the selected slide area.

### Surface 2: Audience Screen (Receiver)
- **Join View**:
  - Simple 4-digit room code numeric keypad/input.
  - "Join Room" button.
- **Minutes Feed View**:
  - Top persistent bar: Room Code badge, connection status pulse, and **"Download Minutes (PDF)"** action button.
  - Main scrollable stream: Chronological list of MOM cards:
    - Card header: Timestamp (`e.g., 10:14 AM - Slide 4`).
    - Visual: Cropped slide snapshot image.
    - AI Summary: Clear bullet points (Core Discussion + Action Item).
  - Background WebSocket listener: Listens for `AIRBLAST_URL` events and auto-opens target links in a new tab.

## Look and Feel
- **Theme**: Keynote Dark Mode. Deep obsidian/slate background (`#0b0f19` / `#0f172a`) to match stage environments.
- **Typography**: Modern, crisp sans-serif (Inter/Outfit). High legibility slide canvas with crisp text rendering.
- **HUD Accents**:
  - Disconnected / Hand absent: Rose Red (`#ef4444`).
  - Tracking Hand: Amber Gold (`#f59e0b`).
  - Gesture Fired: Emerald Neon (`#10b981`).
- **Framing Reticle**: Sleek neon cyan/emerald laser bounding box with corner brackets when framing a MOM snap.
- **Audio Feedback**: Subtle high-frequency chime sound on AirBlast push. Silent on navigation to avoid disturbing speaker rhythm.

## Features and Behavior

### Slide Deck Engine
- Client-side PDF rendering using PDF.js onto an HTML5 canvas.
- Instant "Load Sample Keynote" button pre-loads a 5-slide interactive presentation with sample links (e.g. GitHub repo, interactive poll, live demo sandbox).
- Lossless canvas-to-blob extraction for instant region cropping.

### Computer Vision Gesture Engine (MediaPipe Hand Landmarker)
- In-browser execution via WebGL/WebAssembly. Zero native driver installation.
- Three registered gesture classifiers:
  1. **Horizontal Swipe**: Velocity/displacement of hand center across X-axis with 0.8s debounce cooldown.
  2. **AirBlast (Fist to Open Palm)**: State machine tracking hand closure (fist detected) transitioning to full palm extension facing the camera.
  3. **Spatial MOM (Index-Thumb Frame)**: Euclidean distance and relative angles between thumb tip and index tip determining bounding box coordinates on the canvas.

### Audio Transcription & AI Minutes Generator
- Continuous rolling buffer of spoken words via browser Web Speech API (`SpeechRecognition`).
- On MOM snap trigger:
  - Bundles cropped canvas image + rolling speech transcript.
  - Calls Gemini API via Python backend to generate structured JSON:
    - `headline`: Brief topic title.
    - `takeaway`: 1-2 sentence core discussion takeaway.
    - `action_items`: List of actionable follow-ups.
- Broadcasts MOM card payload to connected audience WebSockets.

### Audience PDF Minutes Compiler
- Client-side PDF generation (e.g. via jsPDF) compiling all session MOM cards into an exportable, formatted document with images and text summaries.

## States and Boundaries

- **First Use / Arrival**: Presenter sees permissions & PDF upload screen; audience sees room code input.
- **Camera/Mic Denied**: Clear inline error toast alerting presenter to grant permissions, with instant keyboard fallback mode enabled.
- **Hand Out of Frame**: Status pill turns Red; no gestures fire inadvertently.
- **Hand In Frame**: Status pill turns Yellow; gestures actively evaluated.
- **Gesture Triggered**: Status pill turns Green for 400ms.
- **Empty Audience State**: "Presentation in progress. Minutes of meeting will appear here automatically as key points are framed."
- **Network Disconnect**: Automatic WebSocket reconnection attempts with status pill warning.
- **Persistence Boundary**: Ephemeral session. Room state exists in memory for the duration of the presentation. Audience can download PDF before closing tab.

## Product Decisions
- **PDF Canvas over Image uploads**: Direct PDF rendering allows speakers to export directly from Google Slides, Canva, or PowerPoint without converting every page to separate images.
- **Fist-to-Palm AirBlast**: Two-state gesture avoids accidental link triggers when naturally moving hands while speaking.
- **Index-Thumb Framing**: Physical framing gesture feels magical on stage and lets speakers focus the summary on a specific chart or diagram rather than the whole slide.
- **Pushed links open in new tab only for receivers**: Keeps the presenter's screen undisturbed so the audience can explore resources on their own devices.
- **Chime sound for AirBlast only**: Navigation swiping remains completely silent so speakers aren't accompanied by robotic beeps every slide turn.

## What We're Building
- [ ] Presenter interface with PDF upload, "Load Sample Keynote", and full-screen canvas stage.
- [ ] Top-right 3-state vision HUD pill (Red/Yellow/Green) and slide counter.
- [ ] In-browser MediaPipe hand tracking: Swipe Navigation (0.8s cooldown), AirBlast (Fist-to-Palm), and Spatial MOM (Index-Thumb Framing box).
- [ ] Audio chime feedback for AirBlast.
- [ ] Python WebSocket signaling server pairing Presenter and Audience with 4-digit room codes.
- [ ] Web Speech API rolling transcript buffer.
- [ ] Backend Gemini API integration for generating structured MOM summaries from audio transcript + canvas crop.
- [ ] Audience interface with real-time MOM card stream, automatic new-tab link opening, and instant "Download Minutes (PDF)" export.

## Deferred From the POC
- Custom speaker notes on secondary presenter monitor.
- Interactive audience live polling / thumbs-up back to presenter HUD.
- Multi-room persistence in a database.

## Non-Goals
- User authentication, login accounts, and password recovery.
- Full video streaming between screens (WebSockets handles event data and snapshots, not heavy video feeds).
- Complex slide animations/transitions within PDF pages.

## Open Questions
- None blocking spec: Gemini API key will be passed via backend `.env` file.
