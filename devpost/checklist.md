---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Project scaffold, landing experience, and Python WebSocket room signaling**
  Becomes usable: A running frontend with the sleek textured black landing screen, reactive finger trail, and a Python FastAPI WebSocket server generating 4-digit room codes and pairing Presenter and Audience screens.
  Why now: Slices must be end-to-end; establishing the client-server bridge and room handshake first ensures every subsequent gesture and broadcast has a live pipe to travel across.
  PRD ref: `prd.md > The Core Journey` (steps 1 & 2)
  Spec ref: `spec.md > Components > Component 1: LandingExperience`, `spec.md > Components > Component 7: PythonSignalingServer`
  Build: Initialize React + Vite + Tailwind frontend and Python FastAPI backend; build sleek landing page with reactive finger trail; implement WebSocket room manager with 4-digit handshake.
  Verify (mechanical): Start backend and frontend; verify room generation on Presenter view and successful connection on Audience view (`/audience`).
  Learner check: Open the app on two tabs, click "Start Session", copy the 4-digit code on the second tab, and confirm both sides show connected.
  Commit: `Scaffold project, landing experience, and Python WebSocket signaling`

- [x] **2. Presenter Cockpit, PDF.js engine, card shuffle, and top-right frosted status square**
  Becomes usable: Presenter can drop in any PDF or click "Load Sample Keynote" to see crisp slides rendered on an HTML5 canvas with a card-shuffle transition, keyboard arrow fallbacks, and the silent top-right frosted glass status indicator.
  Why now: The presentation canvas is the visual anchor of the app; getting PDF rendering and the minimal feedback square solid gives gestures their physical target.
  PRD ref: `prd.md > Screens and Layout > Surface 1: Presenter Screen`, `prd.md > Features and Behavior > Slide Deck Engine`
  Spec ref: `spec.md > Components > Component 2: PresenterCockpit`, `spec.md > Look and Feel`
  Build: Integrate PDF.js on HTML5 canvas, build sample keynote deck with pre-mapped demo links, create card-shuffle CSS animation, and render top-right square indicator with Red/Yellow/Green state props.
  Verify (mechanical): Load sample keynote; advance and rewind slides with keyboard; verify canvas renders cleanly and status square transitions.
  Learner check: Drop in a PDF or click "Load Sample Keynote", cycle through slides, and inspect the card-shuffle animation and status square.
  Commit: `Add Presenter Cockpit with PDF.js canvas, sample keynote, and status square`

- [x] **3. In-browser MediaPipe gesture engine (swipes, AirBlast pose, and V-hold snap)**
  Becomes usable: Real-time hand tracking through the webcam controlling slides via horizontal swipes, detecting fist-to-palm AirBlast poses, and detecting 1-second Two-Finger ("V") hold for MOM snaps, driving the top-right status square.
  Why now: This is the unique kernel of Mudrā. Proving MediaPipe landmark math directly in the browser ensures vision performance and gesture reliability early.
  PRD ref: `prd.md > Features and Behavior > Computer Vision Gesture Engine`
  Spec ref: `spec.md > Components > Component 3: VisionGestureEngine`, `spec.md > Stack`
  Build: Load `@mediapipe/tasks-vision` HandLandmarker; build `useMediaPipeGestures` hook with horizontal swipe ($\Delta X$, 0.8s cooldown), fist-to-palm pose classifier, and two-finger "V" hold detector; wire up top-right status square.
  Verify (mechanical): Run camera test feed in developer console; verify hand presence turns square Yellow, swipes advance slides, and gestures flash Green.
  Learner check: Stand before the webcam: wave hand across to advance/rewind slides without touching keyboard.
  Commit: `Implement MediaPipe gesture engine for swipes, AirBlast, and V-hold snaps`

- [x] **4. AirBlast stage bridge, slide link focus blur, and audience auto-redirect**
  Becomes usable: Making the fist-to-open-palm gesture highlights the first link on the active slide with a cinematic background blur, plays a crisp audio chime, and automatically opens the URL in a new tab on all connected audience devices.
  Why now: Completes the real-time stage push feature, connecting the vision engine to the WebSocket bridge and audience screens.
  PRD ref: `prd.md > The Core Journey > Step 4`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Components > Component 4: AirBlastManager`, `spec.md > Data Model`
  Build: Add slide link extractor; trigger backdrop blur and link pop animation; generate Web Audio chime; emit `AIRBLAST_URL` over WebSocket; handle auto-redirect in audience view.
  Verify (mechanical): Trigger AirBlast on a slide with a link; verify chime sound plays, backdrop blurs, and audience WebSocket client receives the payload and triggers window.open.
  Learner check: Open Presenter and Audience side-by-side; perform fist-to-open-palm on slide with a link; confirm audience tab pops open the link in a new tab.
  Commit: `Implement AirBlast WebSocket link push and audience auto-redirect`

- [x] **5. Spatial MOM: Web Speech API buffer, Gemini AI minutes, and live audience stream**
  Becomes usable: Holding a 2-finger "V" peace sign for 1.0 second captures the entire slide canvas, gathers the live spoken audio transcript, calls Gemini API via the Python backend, and streams a structured MOM card to audience screens.
  Why now: Completes the third core capability (AI meeting minutes), connecting browser speech recognition and Gemini API summarization to the live audience feed.
  PRD ref: `prd.md > The Core Journey > Step 5`, `prd.md > Features and Behavior > Audio Transcription & AI Minutes Generator`
  Spec ref: `spec.md > Components > Component 5: SpeechTranscriptionBuffer`, `spec.md > Components > Component 7: PythonSignalingServer`
  Build: Integrate browser `SpeechRecognition` continuous buffer; capture `canvas.toDataURL('image/jpeg')` on V-hold; call backend `/api/summarize` with Gemini SDK; broadcast `MOM_CARD` to audience feed.
  Verify (mechanical): Trigger V-hold; verify backend receives image + transcript, Gemini generates summary JSON, and audience client renders the MOM card.
  Learner check: Speak a few sentences while holding up peace sign on a slide; verify a MOM card with slide snapshot and AI summary appears in audience feed.
  Commit: `Integrate Web Speech API and Gemini AI for live MOM card streaming`

- [x] **6. Audience annotation workspace and combined PDF minutes compiler**
  Becomes usable: Audience members can draw annotations and type personal notes directly on their received MOM cards using a frosted glass toolbar, then click "Download as a PDF" to export the complete formatted report.
  Why now: Completes the audience takeaway loop, fulfilling the final user requirement without needing server-side storage.
  PRD ref: `prd.md > Screens and Layout > Surface 2: Audience Screen`, `prd.md > The Core Journey > Step 6`
  Spec ref: `spec.md > Components > Component 6: AudienceWorkspace`, `spec.md > Stack`
  Build: Create canvas drawing/text overlay on MOM cards with frosted glass pen/eraser/text dock; implement `jspdf` compiler stitching all cards and annotations into an offline PDF download.
  Verify (mechanical): Add drawing marks and text notes to a test MOM card; click "Download as a PDF"; verify generated PDF contains images, text, and annotations.
  Learner check: Open audience view, annotate a MOM card with drawing and notes, click "Download as a PDF", and inspect the exported file.
  Commit: `Add audience annotation tools and multi-page PDF minutes compiler`

## Hands-on Checkpoints

- [x] Early usable behavior explored — Slice 3 (Presenter Cockpit + MediaPipe Gestures controlling slides hands-free)
- [ ] Final kick-the-tires exploration and feedback completed — Slice 6 (Full dual-screen stage bridge, AirBlast push, Gemini MOM, and PDF export)

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [to be recorded on completion]
Route and stops: [to be recorded on completion]
Edit outcome: [to be recorded on completion]
Reflection: [to be recorded on completion]
Activity mode: [to be recorded on completion]

## Revisions

