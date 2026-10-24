import React, { useState } from 'react';
import { Presentation, Users, Sparkles, Hand, Share2, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import FingerTrailCanvas from './FingerTrailCanvas';

export default function LandingExperience({ onStartHost, onJoinAudience }) {
  const [audienceCode, setAudienceCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleCreateHost = async () => {
    setIsCreatingRoom(true);
    setErrorMsg('');
    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:8000/api/rooms`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Could not create room');
      const data = await res.json();
      onStartHost(data.room_code);
    } catch (err) {
      console.warn('Backend offline, generating local room code', err);
      // Fallback 4-digit code if backend isn't reached yet
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
    <div className="relative min-h-screen w-full bg-textured-matrix flex flex-col items-center justify-between p-6 overflow-hidden">
      {/* Interactive Finger Trail Canvas Overlay */}
      <FingerTrailCanvas />

      {/* Top macOS Navigation Dock */}
      <header className="z-20 w-full max-w-4xl flex items-center justify-between px-6 py-3.5 glass-panel rounded-2xl mt-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-bold tracking-wider text-sm shadow-inner text-white">
            M
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white">Mudrā</h1>
            <p className="text-[11px] text-zinc-400 -mt-0.5">Spatial Stage Bridge</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Vision v1.0 Ready
          </span>
        </div>
      </header>

      {/* Hero Content */}
      <main className="z-20 w-full max-w-4xl flex flex-col items-center text-center my-auto py-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-card text-xs text-zinc-300 mb-6 border border-white/10">
          <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
          <span>Zero-Install In-Browser Computer Vision</span>
        </div>

        <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white max-w-2xl leading-[1.15]">
          Present with Presence. <br />
          <span className="text-zinc-400">Bridge the Stage Spatially.</span>
        </h2>

        <p className="text-sm md:text-base text-zinc-400 max-w-lg mt-4 leading-relaxed">
          Navigate slides with webcam hand gestures, air-blast live links directly to audience devices, and capture AI meeting minutes without breaking eye contact.
        </p>

        {/* Action Dual Card Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl mt-10">
          {/* Host Card */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between text-left group hover:border-white/25 transition-all duration-200">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                <Presentation className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Host Presentation</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Start a session, drop your PDF keynote, and control the room with hands-free spatial gestures.
              </p>
            </div>

            <button
              onClick={handleCreateHost}
              disabled={isCreatingRoom}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <span>{isCreatingRoom ? 'Creating Room...' : 'Start Session'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Join Audience Card */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between text-left group hover:border-white/25 transition-all duration-200">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Join as Audience</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Connect your device to receive pushed demo links, annotate live MOM cards, and export minutes.
              </p>
            </div>

            <form onSubmit={handleJoin} className="mt-6 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={audienceCode}
                  onChange={(e) => setAudienceCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="4-digit code"
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-center text-sm font-mono tracking-widest text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-medium text-xs tracking-wider uppercase active:scale-[0.98] transition-all cursor-pointer"
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

        {/* 3 Core Gesture Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-8">
          <div className="glass-card p-3 rounded-xl flex items-center gap-2.5 text-left">
            <Hand className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-zinc-200">Contact-Lock Swipes</p>
              <p className="text-[10px] text-zinc-500">Left/Right slide shuffle</p>
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl flex items-center gap-2.5 text-left">
            <Share2 className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-zinc-200">AirBlast Link Push</p>
              <p className="text-[10px] text-zinc-500">Fist to palm stage broadcast</p>
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl flex items-center gap-2.5 text-left">
            <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-zinc-200">Spatial AI MOM</p>
              <p className="text-[10px] text-zinc-500">Two-finger V snapshot & notes</p>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="z-20 text-[11px] text-zinc-500 tracking-wide">
        Mudrā Spatial Stage Bridge • Privacy-First In-Browser Execution
      </footer>
    </div>
  );
}
