import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRoomWebSocket } from '../hooks/useRoomWebSocket';
import { SAMPLE_SLIDES } from '../utils/sampleDeck';
import { renderSampleSlideToCanvas, renderPdfPageToCanvas, loadPdfDocument } from '../utils/pdfLoader';
import { 
  ChevronLeft, ChevronRight, Upload, Presentation, 
  Maximize2, Minimize2, LogOut, Users, Wifi, Sparkles 
} from 'lucide-react';

import { useMediaPipeGestures } from '../hooks/useMediaPipeGestures';

export default function PresenterCockpit({ roomCode, onLeave, onSlideChange, onTriggerAirblast, onTriggerMOMSnap }) {
  const [deckType, setDeckType] = useState('sample'); // 'sample' | 'pdf'
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(SAMPLE_SLIDES.length);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [shuffleDirection, setShuffleDirection] = useState('next'); // 'next' | 'prev'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [airblastActive, setAirblastActive] = useState(false);
  const [activeAirblastUrl, setActiveAirblastUrl] = useState('');

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const { isConnected, audienceCount, sendMessage } = useRoomWebSocket({
    roomCode,
    clientType: 'presenter',
    onMessage: (msg) => {
      console.log('[PresenterCockpit] Received socket message', msg);
    }
  });

  // Handle slide navigation
  const goToSlide = useCallback((newIndex, direction = 'next') => {
    if (newIndex < 1 || newIndex > totalPages) return;
    setShuffleDirection(direction);
    setCurrentSlide(newIndex);
    sendMessage({ type: 'SLIDE_UPDATE', slide: newIndex });
    if (onSlideChange) onSlideChange(newIndex);
  }, [totalPages, sendMessage, onSlideChange]);

  const nextSlide = useCallback(() => {
    goToSlide(currentSlide + 1, 'next');
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentSlide - 1, 'prev');
  }, [currentSlide, goToSlide]);

  // Handle AirBlast trigger
  const handleAirblastTrigger = useCallback(() => {
    const slide = deckType === 'sample' ? SAMPLE_SLIDES[currentSlide - 1] : null;
    const url = slide?.link || 'https://github.com/PulkitSachdev25/Mudra';
    setActiveAirblastUrl(url);
    setAirblastActive(true);
    if (onTriggerAirblast) onTriggerAirblast(url);

    sendMessage({
      type: 'AIRBLAST_URL',
      url,
      title: slide?.title || 'Mudrā Stage Resource'
    });

    setTimeout(() => {
      setAirblastActive(false);
    }, 2500);
  }, [deckType, currentSlide, sendMessage, onTriggerAirblast]);

  // Handle MOM snapshot trigger
  const handleMOMSnapTrigger = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageData = canvas.toDataURL('image/jpeg', 0.92);
    if (onTriggerMOMSnap) {
      onTriggerMOMSnap({ slideIndex: currentSlide, imageData });
    }
  }, [currentSlide, onTriggerMOMSnap]);

  // In-Browser MediaPipe Hand Gesture Engine
  const { visionStatus, cameraPermission, modelLoaded, videoRef } = useMediaPipeGestures({
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

  // Determine current active link on slide (if any) for AirBlast
  const currentLink = deckType === 'sample' 
    ? SAMPLE_SLIDES[currentSlide - 1]?.link 
    : null;

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
        className="hidden pointer-events-none"
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
              'No Hand in View'
            }
            className={`w-7 h-7 rounded-lg glass-card border-2 transition-all duration-300 cursor-default ${
              statusColor === 'green' 
                ? 'border-emerald-400 bg-emerald-400/30 shadow-[0_0_18px_rgba(52,211,153,0.7)] scale-110' 
                : statusColor === 'yellow'
                ? 'border-amber-400/80 bg-amber-400/15 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'border-red-500/80 bg-red-500/15 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
            }`}
          />
        </div>
      </header>

      {/* Main Presentation Stage with Card Shuffle Animation */}
      <main className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto px-4">
        {/* AirBlast Cinematic Focus Spotlight / Blur */}
        {airblastActive && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 rounded-3xl p-8">
            <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in-95 duration-200">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                AirBlast Active
              </span>
              <h3 className="text-xl font-bold text-white mt-3">Link Pushed to Audience</h3>
              <p className="text-xs text-zinc-400 mt-2 font-mono break-all">{activeAirblastUrl}</p>
            </div>
          </div>
        )}

        {/* Presentation Canvas Card */}
        <div 
          className={`relative w-full max-h-[75vh] aspect-[16/9] glass-panel rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/10 ${
            shuffleDirection === 'next' ? 'slide-shuffle-next' : 'slide-shuffle-prev'
          }`}
          key={currentSlide}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />

          {/* Current Slide Link Indicator Badge */}
          {currentLink && !airblastActive && (
            <div className="absolute top-4 left-4 z-10 glass-card px-3 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                AirBlast Link Ready
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
