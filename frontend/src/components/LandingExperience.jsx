import React, { useState } from 'react';
import { Presentation, Users, ArrowRight, Info, X, Hand, Share2, Camera, Sparkles } from 'lucide-react';
import FingerTrailCanvas from './FingerTrailCanvas';
import CinematicIntro from './CinematicIntro';

export default function LandingExperience({ onStartHost, onJoinAudience }) {
  const [audienceCode, setAudienceCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

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
    <div className="relative min-h-screen w-full bg-textured-matrix flex flex-col items-center justify-between p-6 select-none overflow-hidden">
      {/* Cinematic God Valley Entrance Overlay */}
      {showIntro && <CinematicIntro onComplete={() => setShowIntro(false)} />}

      {/* Interactive Finger Trail Canvas Overlay */}
      <FingerTrailCanvas />

      {/* Top Bar with Info Button on Right */}
      <div className="z-30 w-full max-w-5xl flex justify-end items-center pt-2">
        <button
          onClick={() => setShowInfoModal(true)}
          className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-zinc-300 hover:text-white hover:border-white/25 active:scale-95 transition-all cursor-pointer shadow-lg"
          title="Gestures & Stage Bridge Info"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Center Hero with Big MUDRĀ */}
      <main className="z-20 w-full max-w-4xl flex flex-col items-center text-center my-auto py-8">
        {/* Big Bold Centered Title */}
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-white mb-2 uppercase drop-shadow-2xl">
          MUDRĀ
        </h1>

        <p className="text-sm md:text-base text-zinc-400 font-medium tracking-wide max-w-md mb-10">
          Spatial Presentation & Stage Bridge
        </p>

        {/* Dual Card Container: Host & Audience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Host Card */}
          <div className="glass-panel p-7 rounded-2xl flex flex-col justify-between text-left group hover:border-white/20 transition-all duration-200">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                <Presentation className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Host Presentation</h2>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Launch the Presenter Cockpit, drop in your PDF keynote, and control the stage with zero-touch spatial hand gestures.
              </p>
            </div>

            <button
              onClick={handleCreateHost}
              disabled={isCreatingRoom}
              className="mt-8 w-full py-3.5 px-4 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl disabled:opacity-50"
            >
              <span>{isCreatingRoom ? 'Creating Room...' : 'Start Session'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Join Audience Card */}
          <div className="glass-panel p-7 rounded-2xl flex flex-col justify-between text-left group hover:border-white/20 transition-all duration-200">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Join as Audience</h2>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Pair your screen using the 4-digit stage code to receive live pushed links and annotate real-time meeting minutes.
              </p>
            </div>

            <form onSubmit={handleJoin} className="mt-8 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={audienceCode}
                  onChange={(e) => setAudienceCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="4-digit code"
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs tracking-wider uppercase active:scale-[0.98] transition-all cursor-pointer"
                >
                  Join
                </button>
              </div>
              {errorMsg && (
                <p className="text-[11px] text-red-400 px-1">{errorMsg}</p>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="z-20 text-[11px] text-zinc-600 tracking-wider uppercase font-mono">
        MUDRĀ • BROWSER-NATIVE SPATIAL BRIDGE
      </footer>

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
