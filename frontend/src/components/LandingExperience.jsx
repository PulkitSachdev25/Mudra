import React, { useState, useEffect } from 'react';
import { Presentation, Users, ArrowRight, Info, X, Hand, Share2, Camera } from 'lucide-react';
import FingerTrailCanvas from './FingerTrailCanvas';
import { soundEngine } from '../utils/soundEffects';

export default function LandingExperience({ onStartHost, onJoinAudience }) {
  const [audienceCode, setAudienceCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [curtainDismissed, setCurtainDismissed] = useState(false);

  // Preload hand cliff assets
  useEffect(() => {
    const urls = ['/god_valley_left.png', '/god_valley_right.png'];
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  const handleStartIntro = () => {
    if (introStarted) return;
    setIntroStarted(true);
    try {
      soundEngine.playIntroWhoosh();
    } catch (e) {
      console.warn('Intro sound error:', e);
    }
    setTimeout(() => {
      setCurtainDismissed(true);
    }, 4200);
  };

  const handleCreateHost = async () => {
    setIsCreatingRoom(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Could not create room');
      const data = await res.json();
      onStartHost(data.room_code);
    } catch (err) {
      console.warn('Backend offline, generating local room code', err);
      const fallbackCode = Math.floor(1000 + Math.random() * 9000).toString();
      onStartHost(fallbackCode);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const clean = audienceCode.trim();
    if (clean.length !== 4) {
      setErrorMsg('Please enter a valid 4-digit room code');
      return;
    }
    onJoinAudience(clean);
  };

  return (
    <div 
      onClick={handleStartIntro}
      className={`relative min-h-screen w-full bg-textured-matrix flex flex-col items-center justify-between p-6 select-none overflow-hidden ${
        !introStarted ? 'cursor-pointer' : ''
      }`}
    >
      {/* Interactive Finger Trail Canvas Overlay */}
      <FingerTrailCanvas />

      {/* Full-Screen God Valley Parting Curtain Overlay */}
      {!curtainDismissed && (
        <div
          className={`fixed inset-0 z-40 flex flex-col items-center justify-between p-6 overflow-hidden pointer-events-none transition-opacity duration-[1200ms] ${
            introStarted ? 'opacity-0 delay-[2500ms]' : 'bg-[#060709]'
          }`}
        >
          {/* Subtle Ambient Spotlight behind Hands */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(14,165,233,0.18),transparent_70%)] pointer-events-none" />

          {/* Top subtle marker */}
          <div className="z-10 w-full max-w-5xl flex justify-between items-center opacity-30 pt-2 font-mono text-[11px] text-zinc-400 uppercase tracking-widest">
            <span>Spatial Engine</span>
            <span>Zero-Touch Gesture Stage</span>
          </div>

          {/* Central Full-Screen Hands Container */}
          <div className="relative w-full max-w-5xl h-[65vh] sm:h-[75vh] my-auto flex items-center justify-center overflow-visible select-none">
            {/* Left Hand / Rock Tower */}
            <img
              src="/god_valley_left.png"
              alt="God Valley Left"
              style={{
                transform: introStarted ? 'translateX(-125vw) rotate(-5deg)' : 'translateX(0) rotate(0)',
                opacity: introStarted ? 0 : 1,
                transition: 'transform 3.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 3.2s ease',
              }}
              className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_25px_60px_rgba(14,165,233,0.4)]"
            />

            {/* Right Hand / Rock Tower */}
            <img
              src="/god_valley_right.png"
              alt="God Valley Right"
              style={{
                transform: introStarted ? 'translateX(125vw) rotate(5deg)' : 'translateX(0) rotate(0)',
                opacity: introStarted ? 0 : 1,
                transition: 'transform 3.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 3.2s ease',
              }}
              className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_25px_60px_rgba(14,165,233,0.4)]"
            />
          </div>

          {/* Bottom Floating Pulsing Prompt */}
          {!introStarted ? (
            <div className="z-10 flex flex-col items-center gap-2 pb-6 animate-pulse">
              <span className="text-xs font-mono uppercase tracking-[0.35em] text-zinc-300">
                Click anywhere to enter
              </span>
              <div className="w-16 h-0.5 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            </div>
          ) : (
            <div className="h-10" />
          )}
        </div>
      )}

      {/* Top Bar - Only Info button on right, unveiled smoothly */}
      <div 
        style={{
          transform: introStarted ? 'translateY(0)' : 'translateY(-40px)',
          opacity: introStarted ? 1 : 0,
          transition: 'transform 3.0s cubic-bezier(0.16, 1, 0.3, 1), opacity 2.4s ease',
        }}
        className="z-30 w-full max-w-5xl flex justify-end items-center pt-2"
      >
        {/* Right Info Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowInfoModal(true);
          }}
          className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-zinc-300 hover:text-white hover:border-white/25 active:scale-95 transition-all cursor-pointer shadow-lg"
          title="Gestures & Stage Bridge Info"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Dashboard Main Content: MUDRĀ Logo and Zoom-Animated Host/Join Cards */}
      <main 
        style={{
          transform: introStarted ? 'translateY(0) scale(1)' : 'translateY(120px) scale(0.96)',
          opacity: introStarted ? 1 : 0,
          pointerEvents: introStarted ? 'auto' : 'none',
          transition: 'transform 3.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 2.6s ease',
        }}
        className="z-20 w-full max-w-4xl flex flex-col items-center text-center my-auto py-6"
      >
        {/* Big Bold Centered Title - Font & Styling Strictly Preserved */}
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-white mb-2 uppercase drop-shadow-2xl">
          MUDRĀ
        </h1>

        <p className="text-sm md:text-base text-zinc-400 font-medium tracking-[0.2em] uppercase max-w-md mb-10">
          Spatial Presentation & Stage Bridge
        </p>

        {/* Dual Card Container: Host & Audience with Interactive Zoom Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-3xl">
          {/* Host Card - Zoom on Hover */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col justify-between text-left group border border-white/10 hover:border-white/30 hover:scale-[1.04] hover:-translate-y-1.5 transition-all duration-300 ease-out hover:shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_35px_rgba(56,189,248,0.15)] relative overflow-hidden">
            {/* Subtle gradient hover sheen */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-5 group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all duration-300 shadow-md">
                <Presentation className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-wide group-hover:text-white transition-colors">
                Host Presentation
              </h2>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-normal">
                Launch the Presenter Cockpit, drop in your PDF keynote, and control the stage with zero-touch spatial hand gestures.
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateHost();
              }}
              disabled={isCreatingRoom}
              className="mt-8 w-full py-4 px-5 rounded-2xl bg-white text-black font-bold text-xs tracking-wider uppercase hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl group-hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] disabled:opacity-50"
            >
              <span>{isCreatingRoom ? 'Creating Room...' : 'Start Session'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Join Audience Card - Zoom on Hover */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col justify-between text-left group border border-white/10 hover:border-white/30 hover:scale-[1.04] hover:-translate-y-1.5 transition-all duration-300 ease-out hover:shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_35px_rgba(16,185,129,0.15)] relative overflow-hidden">
            {/* Subtle gradient hover sheen */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-5 group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all duration-300 shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-wide group-hover:text-white transition-colors">
                Join as Audience
              </h2>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-normal">
                Pair your screen using the 4-digit stage code to receive live pushed links and annotate real-time meeting minutes.
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.stopPropagation();
                handleJoin(e);
              }} 
              onClick={(e) => e.stopPropagation()}
              className="mt-8 flex flex-col gap-2.5"
            >
              <div className="flex gap-2.5">
                <input
                  type="text"
                  maxLength={4}
                  value={audienceCode}
                  onChange={(e) => setAudienceCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="4-digit code"
                  className="flex-1 bg-black/60 border border-white/15 rounded-2xl px-4 py-3.5 text-center text-sm font-mono tracking-widest text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/30 transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 font-bold text-xs tracking-wider uppercase active:scale-[0.98] transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                  Join
                </button>
              </div>
              {errorMsg && (
                <p className="text-[11px] text-red-400 px-1 font-mono">{errorMsg}</p>
              )}
            </form>
          </div>
        </div>
      </main>



      {/* Info Modal ('i' Button Trigger) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel p-8 rounded-3xl max-w-lg w-full relative border border-white/15 shadow-2xl">
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Info className="w-5 h-5 text-zinc-300" />
              <span>Gesture Guide & Controls</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 mb-6">
              Mudrā runs in-browser computer vision on your webcam stream to detect natural stage gestures.
            </p>

            <div className="space-y-4">
              {/* Left & Right Palm Open Nav */}
              <div className="glass-card p-4 rounded-xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Hand className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Slide Navigation (Open Palms)</h4>
                  <ul className="text-xs text-zinc-400 mt-1 space-y-1">
                    <li><strong className="text-white">Right Palm Open:</strong> Advance to Next Slide</li>
                    <li><strong className="text-white">Left Palm Open:</strong> Rewind to Previous Slide</li>
                  </ul>
                </div>
              </div>

              {/* Fist Closed AirBlast */}
              <div className="glass-card p-4 rounded-xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">AirBlast Link Push (Closed Fist)</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Make a <strong className="text-white">closed fist</strong>. A pleasant chime rings out, the target link is captured, and all audience screens immediately redirect to the link.
                  </p>
                </div>
              </div>

              {/* Peace Sign Spatial MOM */}
              <div className="glass-card p-4 rounded-xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Camera className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Spatial MOM (Peace Sign)</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Hold up a <strong className="text-white">Peace Sign (2 fingers: index & middle)</strong>. Mudrā freezes the slide canvas and transcribes recent speech to stream Gemini AI meeting minutes.
                  </p>
                </div>
              </div>

              {/* Status Square Guide */}
              <div className="glass-card p-4 rounded-xl">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5">
                  Top-Right Status Square Color Guide
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
                    <span className="block font-bold">Red</span>
                    <span className="text-[10px] text-zinc-400">Out of view</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300">
                    <span className="block font-bold">Yellow</span>
                    <span className="text-[10px] text-zinc-400">Tracking hand</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-400/10 border border-emerald-400/30 text-emerald-300">
                    <span className="block font-bold">Green</span>
                    <span className="text-[10px] text-zinc-400">Gesture fired</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs tracking-wider uppercase transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
