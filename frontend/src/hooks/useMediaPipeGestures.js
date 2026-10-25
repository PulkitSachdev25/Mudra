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
  const [cameraPermission, setCameraPermission] = useState('prompt');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [detectedGestureLabel, setDetectedGestureLabel] = useState('');

  const videoRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const isDetectingRef = useRef(false);

  // Keep references to latest callbacks to PREVENT stale closures
  const onSwipeNextRef = useRef(onSwipeNext);
  const onSwipePrevRef = useRef(onSwipePrev);
  const onAirblastRef = useRef(onAirblast);
  const onMOMSnapRef = useRef(onMOMSnap);

  useEffect(() => {
    onSwipeNextRef.current = onSwipeNext;
  }, [onSwipeNext]);
  useEffect(() => {
    onSwipePrevRef.current = onSwipePrev;
  }, [onSwipePrev]);
  useEffect(() => {
    onAirblastRef.current = onAirblast;
  }, [onAirblast]);
  useEffect(() => {
    onMOMSnapRef.current = onMOMSnap;
  }, [onMOMSnap]);

  // Gesture cooldown timestamps
  const rightPalmCooldownRef = useRef(0);
  const leftPalmCooldownRef = useRef(0);
  const fistCooldownRef = useRef(0);
  const momSnapCooldownRef = useRef(0);

  // Require gesture hold durations
  const rightPalmHoldStartRef = useRef(0);
  const leftPalmHoldStartRef = useRef(0);
  const fistHoldStartRef = useRef(0);
  const peaceHoldStartRef = useRef(0);

  const flashGreen = useCallback((label) => {
    setVisionStatus('green');
    if (label) setDetectedGestureLabel(label);
    setTimeout(() => {
      setVisionStatus('yellow');
      setDetectedGestureLabel('');
    }, 600);
  }, []);

  // 1. Initialize Webcam Stream
  useEffect(() => {
    if (!active) return;
    let stream = null;

    async function startCamera() {
      try {
        console.log('[Camera] Starting user media stream...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
        setCameraPermission('granted');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch((e) => console.warn('[Camera] Play issue:', e));
          };
        }
      } catch (err) {
        console.warn('[Camera] Permission denied or device error:', err);
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

  // 2. Initialize MediaPipe HandLandmarker with 2 hands support
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
        let landmarker;
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuError) {
          console.warn('[MediaPipe] GPU fallback to CPU:', gpuError);
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        if (isCancelled) return;
        handLandmarkerRef.current = landmarker;
        setModelLoaded(true);
        console.log('[MediaPipe] HandLandmarker loaded.');
      } catch (err) {
        console.error('[MediaPipe] Initialization failed:', err);
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

  // 3. Continuous Video Detection Loop
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
              setVisionStatus((prev) => (prev === 'green' ? 'green' : 'yellow'));
              processAllHands(results, now);
            } else {
              setVisionStatus((prev) => (prev === 'green' ? 'green' : 'red'));
              rightPalmHoldStartRef.current = 0;
              leftPalmHoldStartRef.current = 0;
              fistHoldStartRef.current = 0;
              peaceHoldStartRef.current = 0;
            }
          } catch (e) {
            console.warn('[MediaPipe] Frame detection error:', e);
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

  // 4. Gesture Classifier
  const processAllHands = (results, now) => {
    const hands = results.landmarks;
    const handedness = results.handednesses || [];

    for (let i = 0; i < hands.length; i++) {
      const landmarks = hands[i];
      const category = handedness[i]?.[0]?.categoryName || '';

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

      // Finger Extension States
      const isIndexExtended = indexTip.y < indexMcp.y - 0.05;
      const isMiddleExtended = middleTip.y < middleMcp.y - 0.05;
      const isRingExtended = ringTip.y < ringMcp.y - 0.05;
      const isPinkyExtended = pinkyTip.y < pinkyMcp.y - 0.05;

      const isIndexCurled = indexTip.y > indexMcp.y - 0.02;
      const isMiddleCurled = middleTip.y > middleMcp.y - 0.02;
      const isRingCurled = ringTip.y > ringMcp.y - 0.02;
      const isPinkyCurled = pinkyTip.y > pinkyMcp.y - 0.02;

      // -------------------------------------------------------------
      // 1. Fist Closed (either hand) -> AirBlast
      // -------------------------------------------------------------
      const isFist = isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled;
      if (isFist) {
        if (now < fistCooldownRef.current) {
          fistHoldStartRef.current = 0;
        } else if (fistHoldStartRef.current === 0) {
          fistHoldStartRef.current = now;
        } else if (now - fistHoldStartRef.current >= 350) {
          console.log('[Gesture] Fist Closed -> AirBlast Triggered!');
          fistCooldownRef.current = now + 2500; // 2.5s cooldown
          fistHoldStartRef.current = 0;
          flashGreen('AirBlast');
          if (onAirblastRef.current) onAirblastRef.current();
          return;
        }
      } else {
        fistHoldStartRef.current = 0;
      }

      // -------------------------------------------------------------
      // 2. Peace Sign (2 fingers: Index + Middle) -> Spatial MOM
      // -------------------------------------------------------------
      const isPeaceSign =
        isIndexExtended &&
        isMiddleExtended &&
        isRingCurled &&
        isPinkyCurled &&
        Math.abs(indexTip.x - middleTip.x) > 0.025;

      if (isPeaceSign) {
        if (now < momSnapCooldownRef.current) {
          peaceHoldStartRef.current = 0;
        } else if (peaceHoldStartRef.current === 0) {
          peaceHoldStartRef.current = now;
        } else if (now - peaceHoldStartRef.current >= 650) {
          console.log('[Gesture] Peace Sign -> Spatial MOM Triggered!');
          momSnapCooldownRef.current = now + 2500; // 2.5s cooldown
          peaceHoldStartRef.current = 0;
          flashGreen('Spatial MOM');
          if (onMOMSnapRef.current) onMOMSnapRef.current();
          return;
        }
      } else {
        peaceHoldStartRef.current = 0;
      }

      // -------------------------------------------------------------
      // 3. Open Palm (All 4 main fingers extended) -> Left vs Right Hand
      // -------------------------------------------------------------
      const isOpenPalm = isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended;

      if (isOpenPalm) {
        // Robust physical hand classification:
        // In an unmirrored webcam feed facing the user:
        // 1. User's physical RIGHT hand:
        //    - Appears on the camera frame's left side (wrist.x < 0.5)
        //    - MediaPipe reports categoryName: 'Left'
        //    - Palm facing camera: thumbTip.x > pinkyTip.x
        // 2. User's physical LEFT hand:
        //    - Appears on the camera frame's right side (wrist.x > 0.5)
        //    - MediaPipe reports categoryName: 'Right'
        //    - Palm facing camera: thumbTip.x < pinkyTip.x
        let rightScore = 0;
        let leftScore = 0;

        if (category === 'Left') rightScore += 2;
        if (category === 'Right') leftScore += 2;

        if (wrist.x < 0.48) rightScore += 2;
        if (wrist.x > 0.52) leftScore += 2;

        if (thumbTip.x > pinkyTip.x) rightScore += 1;
        if (thumbTip.x < pinkyTip.x) leftScore += 1;

        const isPhysicalRight = rightScore > leftScore;
        const isPhysicalLeft = leftScore > rightScore;

        if (isPhysicalRight) {
          // RIGHT PALM -> NEXT SLIDE
          leftPalmHoldStartRef.current = 0;
          if (now < rightPalmCooldownRef.current) {
            rightPalmHoldStartRef.current = 0;
          } else if (rightPalmHoldStartRef.current === 0) {
            rightPalmHoldStartRef.current = now;
          } else if (now - rightPalmHoldStartRef.current >= 220) {
            console.log('[Gesture] Right Palm -> Next Slide');
            rightPalmCooldownRef.current = now + 900; // 0.9s cooldown
            rightPalmHoldStartRef.current = 0;
            flashGreen('Next Slide');
            if (onSwipeNextRef.current) onSwipeNextRef.current();
            return;
          }
        } else if (isPhysicalLeft) {
          // LEFT PALM -> PREVIOUS SLIDE
          rightPalmHoldStartRef.current = 0;
          if (now < leftPalmCooldownRef.current) {
            leftPalmHoldStartRef.current = 0;
          } else if (leftPalmHoldStartRef.current === 0) {
            leftPalmHoldStartRef.current = now;
          } else if (now - leftPalmHoldStartRef.current >= 220) {
            console.log('[Gesture] Left Palm -> Prev Slide');
            leftPalmCooldownRef.current = now + 900; // 0.9s cooldown
            leftPalmHoldStartRef.current = 0;
            flashGreen('Prev Slide');
            if (onSwipePrevRef.current) onSwipePrevRef.current();
            return;
          }
        }
      } else {
        rightPalmHoldStartRef.current = 0;
        leftPalmHoldStartRef.current = 0;
      }
    }
  };

  return {
    visionStatus,
    cameraPermission,
    modelLoaded,
    detectedGestureLabel,
    videoRef,
  };
}
