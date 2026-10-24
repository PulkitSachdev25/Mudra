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

  // Gesture state tracking
  const swipeCooldownRef = useRef(0);
  const lastWristXRef = useRef(null);
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
    }, 500);
  }, []);

  // Initialize MediaPipe HandLandmarker
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

        console.log('[MediaPipe] Loading HandLandmarker model...');
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        if (isCancelled) return;
        handLandmarkerRef.current = landmarker;
        setModelLoaded(true);
        console.log('[MediaPipe] HandLandmarker loaded and ready.');
      } catch (err) {
        console.error('[MediaPipe] Failed to load HandLandmarker:', err);
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

  // Start webcam video stream
  useEffect(() => {
    if (!active || !modelLoaded) return;
    let stream = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
        setCameraPermission('granted');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            startDetectionLoop();
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
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [active, modelLoaded]);

  // Main Detection Loop running at video frame rate
  const startDetectionLoop = () => {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;

    let lastVideoTime = -1;

    const detect = () => {
      if (video && landmarker && video.readyState >= 2) {
        const currentTime = video.currentTime;
        if (currentTime !== lastVideoTime) {
          lastVideoTime = currentTime;
          const now = performance.now();
          const results = landmarker.detectForVideo(video, now);

          if (results && results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            processHandLandmarks(landmarks, now);
          } else {
            // No hand in view
            setVisionStatus('red');
            vPoseStartTimestampRef.current = 0;
            wristHistoryRef.current = [];
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);
  };

  // Process 21 3D landmarks for our 3 classifiers
  const processHandLandmarks = (landmarks, now) => {
    // 0: Wrist, 4: Thumb tip, 8: Index tip, 12: Middle tip, 16: Ring tip, 20: Pinky tip
    // MCP base joints: 5: Index MCP, 9: Middle MCP, 13: Ring MCP, 17: Pinky MCP
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

    // Default to tracking (yellow) unless a gesture fires
    setVisionStatus((prev) => (prev === 'green' ? 'green' : 'yellow'));

    // ----------------------------------------------------
    // CLASSIFIER 1: Horizontal Swipe Navigation (0.8s cooldown)
    // ----------------------------------------------------
    if (now > swipeCooldownRef.current) {
      wristHistoryRef.current.push({ x: wrist.x, time: now });
      // Keep only last 250ms of history
      wristHistoryRef.current = wristHistoryRef.current.filter(
        (h) => now - h.time <= 250
      );

      if (wristHistoryRef.current.length >= 3) {
        const oldest = wristHistoryRef.current[0];
        const newest = wristHistoryRef.current[wristHistoryRef.current.length - 1];
        const deltaX = newest.x - oldest.x;

        // In mirrored video: moving right (increasing x) is forward, moving left is backward
        if (deltaX > 0.16) {
          console.log('[Gesture] Swipe Forward detected (Next Slide)');
          swipeCooldownRef.current = now + 800; // 0.8s cooldown
          wristHistoryRef.current = [];
          flashGreen();
          if (onSwipeNext) onSwipeNext();
          return;
        } else if (deltaX < -0.16) {
          console.log('[Gesture] Swipe Backward detected (Prev Slide)');
          swipeCooldownRef.current = now + 800; // 0.8s cooldown
          wristHistoryRef.current = [];
          flashGreen();
          if (onSwipePrev) onSwipePrev();
          return;
        }
      }
    }

    // ----------------------------------------------------
    // CLASSIFIER 2: AirBlast (Fist -> Open Palm)
    // ----------------------------------------------------
    // Measure distance of tips to MCPs or wrist to detect curled vs extended
    const isIndexCurled = indexTip.y > indexMcp.y - 0.02;
    const isMiddleCurled = middleTip.y > middleMcp.y - 0.02;
    const isRingCurled = ringTip.y > ringMcp.y - 0.02;
    const isPinkyCurled = pinkyTip.y > pinkyMcp.y - 0.02;

    const isFist = isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled;

    const isIndexExtended = indexTip.y < indexMcp.y - 0.08;
    const isMiddleExtended = middleTip.y < middleMcp.y - 0.08;
    const isRingExtended = ringTip.y < ringMcp.y - 0.08;
    const isPinkyExtended = pinkyTip.y < pinkyMcp.y - 0.08;

    const isOpenPalm = isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended;

    if (isFist) {
      fistArmedTimestampRef.current = now;
    } else if (isOpenPalm && now > airblastCooldownRef.current) {
      // Check if fist was armed within the last 1.2 seconds
      if (now - fistArmedTimestampRef.current < 1200 && fistArmedTimestampRef.current > 0) {
        console.log('[Gesture] AirBlast triggered! (Fist to Open Palm)');
        fistArmedTimestampRef.current = 0;
        airblastCooldownRef.current = now + 2000; // 2s cooldown
        flashGreen();
        if (onAirblast) onAirblast();
        return;
      }
    }

    // ----------------------------------------------------
    // CLASSIFIER 3: Spatial MOM (Two-Finger "V" / Peace Sign Held for 1.0s)
    // ----------------------------------------------------
    const isVPose = 
      isIndexExtended && 
      isMiddleExtended && 
      isRingCurled && 
      isPinkyCurled &&
      Math.abs(indexTip.x - middleTip.x) > 0.03; // Fingers separated in V

    if (isVPose) {
      if (vPoseStartTimestampRef.current === 0) {
        vPoseStartTimestampRef.current = now;
      } else {
        const holdDuration = now - vPoseStartTimestampRef.current;
        if (holdDuration >= 1000 && now > momSnapCooldownRef.current) {
          console.log('[Gesture] Spatial MOM Snap triggered! (V-Hold 1.0s)');
          momSnapCooldownRef.current = now + 3000; // 3s cooldown
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
