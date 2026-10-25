import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRoomWebSocket } from '../hooks/useRoomWebSocket';
import { SAMPLE_SLIDES } from '../utils/sampleDeck';
import { renderSampleSlideToCanvas, renderPdfPageToCanvas, loadPdfDocument, extractFirstLinkFromPdfPage } from '../utils/pdfLoader';
import { 
  ChevronLeft, ChevronRight, Upload, Presentation, 
  Maximize2, Minimize2, LogOut, Users, Wifi, Sparkles 
} from 'lucide-react';

import { useMediaPipeGestures } from '../hooks/useMediaPipeGestures';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { soundEngine } from '../utils/soundEffects';

export default function PresenterCockpit({ roomCode, onLeave, onSlideChange, onTriggerAirblast, onTriggerMOMSnap }) {
  const [deckType, setDeckType] = useState('sample'); // 'sample' | 'pdf'
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(SAMPLE_SLIDES.length);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [shuffleDirection, setShuffleDirection] = useState('next'); // 'next' | 'prev'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [airblastActive, setAirblastActive] = useState(false);
  const [activeAirblastUrl, setActiveAirblastUrl] = useState('');
  const [currentLink, setCurrentLink] = useState(null);
  const currentLinkRef = useRef(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const { isConnected, audienceCount, sendMessage } = useRoomWebSocket({
    roomCode,
    clientType: 'presenter',
    onMessage: (msg) => {
      console.log('[PresenterCockpit] Received socket message', msg);
    }
  });

  // Persistent refs to prevent stale closure bugs in continuous animation frames
  const currentSlideRef = useRef(1);
  const totalPagesRef = useRef(totalPages);
  const deckTypeRef = useRef(deckType);

  useEffect(() => {
    currentSlideRef.current = currentSlide;
  }, [currentSlide]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  useEffect(() => {
    deckTypeRef.current = deckType;
  }, [deckType]);

  // Synchronous, crisp slide navigation
  const nextSlide = useCallback(() => {
    const cur = currentSlideRef.current;
    const max = totalPagesRef.current;
    if (cur < max) {
      const target = cur + 1;
      currentSlideRef.current = target;
      setCurrentSlide(target);
      setShuffleDirection('next');
      sendMessage({ type: 'SLIDE_UPDATE', slide: target });
      if (onSlideChange) onSlideChange(target);
    }
  }, [sendMessage, onSlideChange]);

  const prevSlide = useCallback(() => {
    const cur = currentSlideRef.current;
    if (cur > 1) {
      const target = cur - 1;
      currentSlideRef.current = target;
      setCurrentSlide(target);
      setShuffleDirection('prev');
      sendMessage({ type: 'SLIDE_UPDATE', slide: target });
      if (onSlideChange) onSlideChange(target);
    }
  }, [sendMessage, onSlideChange]);

  // Handle AirBlast trigger (clean non-blocking toast, dynamically dispatches active slide link)
  const handleAirblastTrigger = useCallback(() => {
    const cur = currentSlideRef.current;
    const activeUrl = currentLinkRef.current;

    if (!activeUrl) {
      console.log(`[AirBlast] No link detected on slide ${cur}`);
      setActiveAirblastUrl(`No Link Detected on Slide #${cur}`);
      setAirblastActive(true);
      setTimeout(() => {
        setAirblastActive(false);
      }, 2000);
      return;
    }

    setActiveAirblastUrl(activeUrl);
    setAirblastActive(true);

    try {
      soundEngine.playAirblastChime();
    } catch (e) {
      console.warn('Audio chime warning:', e);
    }

    const slideTitle = deckTypeRef.current === 'sample' 
      ? (SAMPLE_SLIDES[cur - 1]?.title || `Slide ${cur}`)
      : `Slide ${cur}`;

    sendMessage({
      type: 'AIRBLAST_URL',
      url: activeUrl,
      title: slideTitle,
      slide_index: cur,
    });

    if (onTriggerAirblast) onTriggerAirblast(activeUrl);

    setTimeout(() => {
      setAirblastActive(false);
    }, 2500);
  }, [sendMessage, onTriggerAirblast]);

  const [momToast, setMomToast] = useState('');

  // Continuous speech recognition rolling buffer
  const { isListening, getRecentTranscript } = useSpeechRecognition({ active: true });

  // Handle MOM snapshot trigger
  const handleMOMSnapTrigger = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setMomToast('Action Snap Captured! Synthesizing AI Minutes...');
    const imageData = canvas.toDataURL('image/jpeg', 0.88);
    const transcript = getRecentTranscript(60);

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode,
          slide_index: currentSlide,
          image_data: imageData,
          transcript: transcript,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMomToast(`Minutes Created: ${data.card.title}`);
        if (onTriggerMOMSnap) onTriggerMOMSnap(data.card);
      } else {
        setMomToast('Minutes Captured & Dispatched!');
      }
    } catch (err) {
      console.warn('Backend summarize call failed:', err);
      setMomToast('Minutes Dispatched Locally');
    }

    setTimeout(() => {
      setMomToast('');
    }, 3500);
  }, [roomCode, currentSlide, getRecentTranscript, onTriggerMOMSnap]);

  // In-Browser MediaPipe Hand Gesture Engine
  const { visionStatus, cameraPermission, modelLoaded, detectedGestureLabel, videoRef } = useMediaPipeGestures({
    active: true,
    onSwipeNext: nextSlide,
    onSwipePrev: prevSlide,
    onAirblast: handleAirblastTrigger,
    onMOMSnap: handleMOMSnapTrigger,
  });

  const statusColor = visionStatus;

  // Render current slide onto canvas
  const renderCurrentSlide = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (deckType === 'sample') {
      const slide = SAMPLE_SLIDES[currentSlide - 1];
      if (slide) {
        renderSampleSlideToCanvas(slide, canvas);
      }
    } else if (deckType === 'pdf' && pdfDoc) {
      renderPdfPageToCanvas(pdfDoc, currentSlide, canvas);
    }
  }, [deckType, pdfDoc, currentSlide]);

  useEffect(() => {
    renderCurrentSlide();
  }, [renderCurrentSlide]);

  // Keyboard navigation fallback
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Handle PDF file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = await loadPdfDocument(file);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setDeckType('pdf');
      setCurrentSlide(1);
      sendMessage({ type: 'SLIDE_UPDATE', slide: 1 });
    } catch (err) {
      console.error('Failed to load PDF file:', err);
      alert('Could not load PDF document. Please check the file.');
    }
  };

  const handleLoadSample = () => {
    setPdfDoc(null);
    setDeckType('sample');
    setTotalPages(SAMPLE_SLIDES.length);
    setCurrentSlide(1);
    sendMessage({ type: 'SLIDE_UPDATE', slide: 1 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsFullscreen(false);
    }
  };

  // Automatically scan the active slide for hyperlinks (supports both PDF documents and sample keynote)
  useEffect(() => {
    let isCancelled = false;
    async function updateActiveLink() {
      let link = null;
      if (deckType === 'sample') {
        const slide = SAMPLE_SLIDES[currentSlide - 1];
        link = slide?.link || null;
      } else if (deckType === 'pdf' && pdfDoc) {
        link = await extractFirstLinkFromPdfPage(pdfDoc, currentSlide);
      }
      if (!isCancelled) {
        setCurrentLink(link);
        currentLinkRef.current = link;
      }
    }
    updateActiveLink();
    return () => {
      isCancelled = true;
    };
  }, [deckType, pdfDoc, currentSlide]);

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen w-full bg-textured-matrix flex flex-col justify-between items-center p-4 select-none overflow-hidden"
    >
      {/* Hidden webcam video stream for MediaPipe HandLandmarker */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 640,
          height: 480,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Top Header & Right Frosted Status Square */}
      <header className="z-30 w-full max-w-6xl flex items-center justify-between px-6 py-3">
        {/* Left: Minimal Logo & Room Code */}
        <div className="flex items-center gap-3 glass-panel px-4 py-2 rounded-xl">
          <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center font-bold text-xs text-white">
            M
          </div>
          <span className="text-xs font-semibold tracking-wide text-white">Mudrā Cockpit</span>
          <span className="text-zinc-600">•</span>
          <span className="text-xs font-mono text-zinc-300">Room #{roomCode}</span>
        </div>

        {/* Right: The Minimal Frosted Status Square (NO text beside it, strictly as requested!) */}
        <div className="flex items-center gap-3">
          <div 
            title={
              statusColor === 'green' ? 'Gesture Triggered' :
              statusColor === 'yellow' ? 'Hand Tracked & Ready' :
              'No Hand in View / Out of Frame'
            }
            style={
              statusColor === 'green'
                ? {
                    backgroundColor: '#10b981',
                    borderColor: '#6ee7b7',
                    boxShadow: '0 0 24px rgba(16, 185, 129, 1), 0 0 10px rgba(16, 185, 129, 0.8), inset 0 0 8px rgba(255, 255, 255, 0.6)',
                  }
                : statusColor === 'yellow'
                ? {
                    backgroundColor: '#f59e0b',
                    borderColor: '#fde68a',
                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.95), 0 0 8px rgba(245, 158, 11, 0.7), inset 0 0 8px rgba(255, 255, 255, 0.5)',
                  }
                : {
                    backgroundColor: '#ef4444',
                    borderColor: '#fca5a5',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.95), 0 0 8px rgba(239, 68, 68, 0.7), inset 0 0 8px rgba(255, 255, 255, 0.5)',
                  }
            }
            className="w-8 h-8 rounded-xl border-2 transition-all duration-200 cursor-default"
          />
        </div>
      </header>

      {/* Spatial MOM Snapshot Toast Banner */}
      {momToast && (
        <div className="z-30 w-full max-w-lg mx-auto -mt-1 mb-2 animate-in slide-in-from-top-3 duration-200">
          <div className="glass-panel px-4 py-2 rounded-xl border border-amber-400/40 bg-amber-950/30 flex items-center justify-center gap-2.5 shadow-xl text-center">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-xs font-medium text-amber-200 tracking-wide">{momToast}</span>
          </div>
        </div>
      )}

      {/* AirBlast Dispatched Toast Banner (Non-blocking, never freezes screen) */}
      {airblastActive && (
        <div className="z-30 w-full max-w-lg mx-auto -mt-1 mb-2 animate-in slide-in-from-top-3 duration-200">
          <div className={`glass-panel px-4 py-2 rounded-xl border flex items-center justify-center gap-2.5 text-center ${
            activeAirblastUrl.startsWith('No Link')
              ? 'border-amber-400/50 bg-amber-950/40 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
              : 'border-emerald-400/50 bg-emerald-950/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${activeAirblastUrl.startsWith('No Link') ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping`}></span>
            <span className={`text-xs font-medium tracking-wide ${activeAirblastUrl.startsWith('No Link') ? 'text-amber-200' : 'text-emerald-200'}`}>
              {activeAirblastUrl.startsWith('No Link') ? activeAirblastUrl : `AirBlast: Link Broadcasted to Audience (${activeAirblastUrl})`}
            </span>
          </div>
        </div>
      )}

      {/* Main Presentation Stage with Card Shuffle Animation */}
      <main className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto px-4">
        {/* Presentation Canvas Card */}
        <div 
          className={`relative w-full max-h-[75vh] aspect-[16/9] glass-panel rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border transition-all duration-300 ${
            airblastActive 
              ? 'border-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.3)]' 
              : 'border-white/10'
          } ${
            shuffleDirection === 'next' ? 'slide-shuffle-next' : 'slide-shuffle-prev'
          }`}
          key={currentSlide}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />

          {/* Current Slide Link Indicator Badge */}
          {currentLink && (
            <div className={`absolute top-4 left-4 z-10 glass-card px-3 py-1.5 rounded-lg border transition-all duration-300 flex items-center gap-2 ${
              airblastActive 
                ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-105' 
                : 'border-emerald-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full bg-emerald-400 ${airblastActive ? 'animate-ping' : ''}`}></span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                {airblastActive ? 'AirBlast Broadcasted' : 'AirBlast Link Ready'}
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Bottom macOS Frosted Glass Dock */}
      <footer className="z-30 w-full max-w-2xl px-6 py-3 glass-panel rounded-2xl flex items-center justify-between mb-2">
        {/* Navigation Arrows & Counter */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevSlide}
            disabled={currentSlide <= 1}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white transition-colors cursor-pointer"
            title="Previous Slide (or swipe right)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="font-mono text-xs font-semibold tracking-wider text-zinc-200 px-2">
            {String(currentSlide).padStart(2, '0')} <span className="text-zinc-600">/</span> {String(totalPages).padStart(2, '0')}
          </div>

          <button
            onClick={nextSlide}
            disabled={currentSlide >= totalPages}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white transition-colors cursor-pointer"
            title="Next Slide (or swipe left)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Deck Switcher Controls */}
        <div className="flex items-center gap-2">
          {deckType === 'pdf' ? (
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 transition-colors cursor-pointer"
            >
              <Presentation className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sample Keynote</span>
            </button>
          ) : (
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-zinc-400" />
              <span>Upload PDF</span>
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          )}

          {/* Audience Counter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400">
            <Users className="w-3.5 h-3.5" />
            <span className="font-mono">{audienceCount}</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit */}
          <button
            onClick={onLeave}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            title="End Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
