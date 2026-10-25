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
  const [detectedGesture, setDetectedGesture] = useState(''); // e.g. 'Right Palm', 'Left Palm', 'Fist', 'Peace'

  const videoRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const isDetectingRef = useRef(false);

  // Gesture cooldowns and hold timers
  const nextSlideCooldownRef = useRef(0);
  const prevSlideCooldownRef = useRef(0);
  const airblastCooldownRef = useRef(0);
  const momSnapCooldownRef = useRef(0);

  const leftPalmHoldStartRef = useRef(0);
  const rightPalmHoldStartRef = useRef(0);
  const fistHoldStartRef = useRef(0);
  const vHoldStartRef = useRef(0);

  const flashGreen = useCallback((gestureName) => {
    setVisionStatus('green');
    if (gestureName) setDetectedGesture(gestureName);
    setTimeout(() => {
      setVisionStatus('yellow');
      setDetectedGesture('');
    }, 700);
  }, []);

  // 1. Initialize Webcam Stream immediately
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
        console.log('[Camera] Webcam access granted.');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.warn('[Camera] Autoplay issue:', e));
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
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 2, // Track both left and right hands
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
            numHands: 2,
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
              // No hands in view
              setVisionStatus((prev) => (prev === 'green' ? 'green' : 'red'));
              leftPalmHoldStartRef.current = 0;
              rightPalmHoldStartRef.current = 0;
              fistHoldStartRef.current = 0;
              vHoldStartRef.current = 0;
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

  // 4. Multi-Hand Gesture Processor with Left/Right Distinction
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

      // Determine finger extension states
      const isIndexExtended = indexTip.y < indexMcp.y - 0.06;
      const isMiddleExtended = middleTip.y < middleMcp.y - 0.06;
      const isRingExtended = ringTip.y < ringMcp.y - 0.06;
      const isPinkyExtended = pinkyTip.y < pinkyMcp.y - 0.06;

      const isIndexCurled = indexTip.y > indexMcp.y - 0.02;
      const isMiddleCurled = middleTip.y > middleMcp.y - 0.02;
      const isRingCurled = ringTip.y > ringMcp.y - 0.02;
      const isPinkyCurled = pinkyTip.y > pinkyMcp.y - 0.02;

      // -----------------------------------------------------------------
      // GESTURE 3: Fist Closed (either hand) -> AirBlast
      // -----------------------------------------------------------------
      const isFist = isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled;
      if (isFist) {
        if (fistHoldStartRef.current === 0) {
          fistHoldStartRef.current = now;
        } else if (now - fistHoldStartRef.current >= 350 && now > airblastCooldownRef.current) {
          console.log('[Gesture] Fist Closed -> AirBlast Triggered!');
          airblastCooldownRef.current = now + 2000; // 2s cooldown
          fistHoldStartRef.current = 0;
          flashGreen('AirBlast (Fist)');
          if (onAirblast) onAirblast();
          return;
        }
      } else {
        fistHoldStartRef.current = 0;
      }

      // -----------------------------------------------------------------
      // GESTURE 4: Peace Sign (2 fingers: Index + Middle) -> Spatial MOM
      // -----------------------------------------------------------------
      const isVPose =
        isIndexExtended &&
        isMiddleExtended &&
        isRingCurled &&
        isPinkyCurled &&
        Math.abs(indexTip.x - middleTip.x) > 0.025;

      if (isVPose) {
        if (vHoldStartRef.current === 0) {
          vHoldStartRef.current = now;
        } else if (now - vHoldStartRef.current >= 750 && now > momSnapCooldownRef.current) {
          console.log('[Gesture] Peace Sign (2 Fingers) -> Spatial MOM Triggered!');
          momSnapCooldownRef.current = now + 3000; // 3s cooldown
          vHoldStartRef.current = 0;
          flashGreen('Spatial MOM');
          if (onMOMSnap) onMOMSnap();
          return;
        }
      } else {
        vHoldStartRef.current = 0;
      }

      // -----------------------------------------------------------------
      // GESTURE 1 & 2: Open Palm (All fingers extended) -> Left vs Right Hand
      // -----------------------------------------------------------------
      const isOpenPalm = isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended;

      if (isOpenPalm) {
        // Distinguish Left vs Right hand
        // In mirrored user selfie camera:
        // When user raises their Right hand, MediaPipe category is 'Right', thumbTip.x is to the left of pinkyTip.x
        // When user raises their Left hand, MediaPipe category is 'Left', thumbTip.x is to the right of pinkyTip.x
        const isRightHand = (category === 'Right') || (thumbTip.x < pinkyTip.x && wrist.x > 0.45);
        const isLeftHand = (category === 'Left') || (thumbTip.x > pinkyTip.x && wrist.x < 0.55);

        if (isRightHand && !isLeftHand) {
          // RIGHT PALM OPEN -> NEXT SLIDE
          leftPalmHoldStartRef.current = 0;
          if (rightPalmHoldStartRef.current === 0) {
            rightPalmHoldStartRef.current = now;
          } else if (now - rightPalmHoldStartRef.current >= 300 && now > nextSlideCooldownRef.current) {
            console.log('[Gesture] Right Palm Open -> Next Slide');
            nextSlideCooldownRef.current = now + 900; // 0.9s cooldown
            rightPalmHoldStartRef.current = 0;
            flashGreen('Next Slide');
            if (onSwipeNext) onSwipeNext();
            return;
          }
        } else if (isLeftHand) {
          // LEFT PALM OPEN -> PREVIOUS SLIDE
          rightPalmHoldStartRef.current = 0;
          if (leftPalmHoldStartRef.current === 0) {
            leftPalmHoldStartRef.current = now;
          } else if (now - leftPalmHoldStartRef.current >= 300 && now > prevSlideCooldownRef.current) {
            console.log('[Gesture] Left Palm Open -> Prev Slide');
            prevSlideCooldownRef.current = now + 900; // 0.9s cooldown
            leftPalmHoldStartRef.current = 0;
            flashGreen('Prev Slide');
            if (onSwipePrev) onSwipePrev();
            return;
          }
        }
      } else {
        leftPalmHoldStartRef.current = 0;
        rightPalmHoldStartRef.current = 0;
      }
    }
  };

  return {
    visionStatus,
    cameraPermission,
    modelLoaded,
    detectedGesture,
    videoRef,
  };
}
