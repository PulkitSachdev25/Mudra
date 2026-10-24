import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export function useMediaPipeGestures({
  active = true,
  onSwipeNext,
  onSwipePrev,
  onAirblast,
  onMOMSnap,
}) {
  const [visionStatus, setVisionStatus] = useState('red'); // 'red' (no hand) | 'yellow' (tracking) | 'green' (gesture)
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [modelLoaded, setModelLoaded] = useState(false);

  const videoRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const isDetectingRef = useRef(false);

  // Gesture state tracking
  const swipeCooldownRef = useRef(0);
  const wristHistoryRef = useRef([]);

  // AirBlast state machine (Fist -> Open Palm)
  const fistArmedTimestampRef = useRef(0);
  const airblastCooldownRef = useRef(0);

  // MOM Snap state machine (V / Peace sign held for 1s)
  const vPoseStartTimestampRef = useRef(0);
  const momSnapCooldownRef = useRef(0);

  const flashGreen = useCallback(() => {
    setVisionStatus('green');
    setTimeout(() => {
      setVisionStatus('yellow');
    }, 600);
  }, []);

  // 1. Initialize Webcam Stream immediately (parallel to model loading)
  useEffect(() => {
    if (!active) return;
    let stream = null;

    async function startCamera() {
      try {
        console.log('[Camera] Requesting webcam access...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
        setCameraPermission('granted');
        console.log('[Camera] Webcam access granted.');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.warn('[Camera] Autoplay caught:', e));
          };
        }
      } catch (err) {
        console.warn('[Camera] Permission denied or unavailable:', err);
        setCameraPermission('denied');
        setVisionStatus('red');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [active]);

  // 2. Initialize MediaPipe HandLandmarker
  useEffect(() => {
    if (!active) return;
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        console.log('[MediaPipe] Initializing FilesetResolver...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (isCancelled) return;

        console.log('[MediaPipe] Creating HandLandmarker...');
        let landmarker;
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuError) {
          console.warn('[MediaPipe] GPU delegate failed, falling back to CPU:', gpuError);
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        if (isCancelled) return;
        handLandmarkerRef.current = landmarker;
        setModelLoaded(true);
        console.log('[MediaPipe] HandLandmarker loaded successfully.');
      } catch (err) {
        console.error('[MediaPipe] Failed to initialize HandLandmarker:', err);
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, [active]);

  // 3. Start Frame-by-Frame Detection Loop
  useEffect(() => {
    if (!active || !modelLoaded) return;
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;
    if (!video || !landmarker) return;

    let lastVideoTime = -1;
    isDetectingRef.current = true;

    const detect = () => {
      if (!isDetectingRef.current) return;

      if (video.readyState >= 2) {
        const currentTime = video.currentTime;
        if (currentTime !== lastVideoTime) {
          lastVideoTime = currentTime;
          const now = performance.now();
          try {
            const results = landmarker.detectForVideo(video, now);

            if (results && results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              processHandLandmarks(landmarks, now);
            } else {
              // No hand in camera view
              setVisionStatus((prev) => (prev === 'green' ? 'green' : 'red'));
              vPoseStartTimestampRef.current = 0;
              wristHistoryRef.current = [];
            }
          } catch (e) {
            console.warn('[MediaPipe] Detection frame error:', e);
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);

    return () => {
      isDetectingRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [active, modelLoaded]);

  // 4. Classify Gestures from 21 3D Landmarks
  const processHandLandmarks = (landmarks, now) => {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];
    const ringMcp = landmarks[13];
    const pinkyMcp = landmarks[17];

    // Hand is present -> Turn yellow (or keep green if currently flashing)
    setVisionStatus((prev) => (prev === 'green' ? 'green' : 'yellow'));

    // --- CLASSIFIER 1: Horizontal Swipe Navigation (0.8s cooldown) ---
    if (now > swipeCooldownRef.current) {
      wristHistoryRef.current.push({ x: wrist.x, time: now });
      wristHistoryRef.current = wristHistoryRef.current.filter((h) => now - h.time <= 300);

      if (wristHistoryRef.current.length >= 3) {
        const oldest = wristHistoryRef.current[0];
        const newest = wristHistoryRef.current[wristHistoryRef.current.length - 1];
        const deltaX = newest.x - oldest.x;

        // In mirrored user camera:
        // Moving right (deltaX > 0.14) -> Next Slide
        // Moving left (deltaX < -0.14) -> Prev Slide
        if (deltaX > 0.14) {
          console.log('[Gesture] Swipe Forward (Next Slide)');
          swipeCooldownRef.current = now + 800;
          wristHistoryRef.current = [];
          flashGreen();
          if (onSwipeNext) onSwipeNext();
          return;
        } else if (deltaX < -0.14) {
          console.log('[Gesture] Swipe Backward (Prev Slide)');
          swipeCooldownRef.current = now + 800;
          wristHistoryRef.current = [];
          flashGreen();
          if (onSwipePrev) onSwipePrev();
          return;
        }
      }
    }

    // --- CLASSIFIER 2: AirBlast (Closed Fist -> Open Palm Blast) ---
    const isIndexCurled = indexTip.y > indexMcp.y - 0.02;
    const isMiddleCurled = middleTip.y > middleMcp.y - 0.02;
    const isRingCurled = ringTip.y > ringMcp.y - 0.02;
    const isPinkyCurled = pinkyTip.y > pinkyMcp.y - 0.02;
    const isFist = isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled;

    const isIndexExtended = indexTip.y < indexMcp.y - 0.07;
    const isMiddleExtended = middleTip.y < middleMcp.y - 0.07;
    const isRingExtended = ringTip.y < ringMcp.y - 0.07;
    const isPinkyExtended = pinkyTip.y < pinkyMcp.y - 0.07;
    const isOpenPalm = isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended;

    if (isFist) {
      fistArmedTimestampRef.current = now;
    } else if (isOpenPalm && now > airblastCooldownRef.current) {
      // If fist was armed within the last 1.5s
      if (now - fistArmedTimestampRef.current < 1500 && fistArmedTimestampRef.current > 0) {
        console.log('[Gesture] AirBlast Triggered!');
        fistArmedTimestampRef.current = 0;
        airblastCooldownRef.current = now + 2000;
        flashGreen();
        if (onAirblast) onAirblast();
        return;
      }
    }

    // --- CLASSIFIER 3: Spatial MOM (Two-Finger "V" / Peace Sign Held for 1.0s) ---
    const isVPose =
      isIndexExtended &&
      isMiddleExtended &&
      isRingCurled &&
      isPinkyCurled &&
      Math.abs(indexTip.x - middleTip.x) > 0.025;

    if (isVPose) {
      if (vPoseStartTimestampRef.current === 0) {
        vPoseStartTimestampRef.current = now;
      } else {
        const holdDuration = now - vPoseStartTimestampRef.current;
        if (holdDuration >= 1000 && now > momSnapCooldownRef.current) {
          console.log('[Gesture] Spatial MOM Snap Triggered! (V-Hold 1.0s)');
          momSnapCooldownRef.current = now + 3000;
          vPoseStartTimestampRef.current = 0;
          flashGreen();
          if (onMOMSnap) onMOMSnap();
        }
      }
    } else {
      vPoseStartTimestampRef.current = 0;
    }
  };

  return {
    visionStatus,
    cameraPermission,
    modelLoaded,
    videoRef,
  };
}
