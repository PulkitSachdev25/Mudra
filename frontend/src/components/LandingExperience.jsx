import React, { useState, useEffect } from 'react';
import { Presentation, Users, ArrowRight, Info, X, Hand, Share2, Camera } from 'lucide-react';
import FingerTrailCanvas from './FingerTrailCanvas';
import ScrambleText from './ScrambleText';
import { soundEngine } from '../utils/soundEffects';

function CornerCrosshairs() {
  return (
    <>
      <span className="absolute top-2 left-2 text-zinc-500 font-mono text-[10px] leading-none pointer-events-none select-none">+</span>
      <span className="absolute top-2 right-2 text-zinc-500 font-mono text-[10px] leading-none pointer-events-none select-none">+</span>
      <span className="absolute bottom-2 left-2 text-zinc-500 font-mono text-[10px] leading-none pointer-events-none select-none">+</span>
      <span className="absolute bottom-2 right-2 text-zinc-500 font-mono text-[10px] leading-none pointer-events-none select-none">+</span>
    </>
  );
}

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
      className={`relative min-h-screen w-full bg-[#060709] flex flex-col items-center justify-between p-6 select-none overflow-hidden ${
        !introStarted ? 'cursor-pointer' : ''
      }`}
    >
      {/* Interactive Monochrome 21-Node MediaPipe Wireframe Canvas */}
      <FingerTrailCanvas />

      {/* Full-Screen God Valley Parting Curtain Overlay */}
      {!curtainDismissed && (
        <div
          className={`fixed inset-0 z-40 flex flex-col items-center justify-between p-6 overflow-hidden pointer-events-none transition-opacity duration-[1200ms] ${
            introStarted ? 'opacity-0 delay-[2500ms]' : 'bg-[#060709]'
          }`}
        >
          {/* Subtle Ambient Monochrome Spotlight */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />

          {/* Top Subtle Hardware Label */}
          <div className="z-10 w-full max-w-5xl flex justify-between items-center opacity-30 pt-2 font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
            <span>[SYS // SPATIAL_CORE]</span>
            <span>[TOPOLOGY // 21_LANDMARKS]</span>
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
              className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
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
              className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
            />
          </div>

          {/* Bottom Floating Pulsing Prompt */}
          {!introStarted ? (
            <div className="z-10 flex flex-col items-center gap-2 pb-6 animate-pulse">
              <span className="text-xs font-mono uppercase tracking-[0.35em] text-zinc-400">
                Click anywhere to enter
              </span>
              <div className="w-16 h-[1px] bg-zinc-600" />
            </div>
          ) : (
            <div className="h-10" />
          )}
        </div>
      )}

      {/* Top Bar - Only Info button on right with corner crosshairs */}
      <div 
        style={{
          transform: introStarted ? 'translateY(0)' : 'translateY(-40px)',
          opacity: introStarted ? 1 : 0,
          transition: 'transform 3.0s cubic-bezier(0.16, 1, 0.3, 1), opacity 2.4s ease',
        }}
        className="z-30 w-full max-w-5xl flex justify-end items-center pt-2"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowInfoModal(true);
          }}
          className="relative w-10 h-10 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-500 flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all cursor-pointer shadow-lg"
          title="Gestures & Stage Bridge Info"
        >
          <CornerCrosshairs />
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Dashboard Main Content: MUDRĀ Title & Industrial Cards */}
      <main 
        style={{
          transform: introStarted ? 'translateY(0) scale(1)' : 'translateY(120px) scale(0.96)',
          opacity: introStarted ? 1 : 0,
          pointerEvents: introStarted ? 'auto' : 'none',
          transition: 'transform 3.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 2.6s ease',
        }}
        className="z-20 w-full max-w-4xl flex flex-col items-center text-center my-auto py-6"
      >
        {/* Big Bold Centered Title - Interactive Text Scramble on Hover */}
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-white mb-2 uppercase drop-shadow-2xl">
          <ScrambleText text="MUDRĀ" />
        </h1>

        <p className="text-sm md:text-base text-zinc-400 font-mono tracking-[0.25em] uppercase max-w-md mb-10 text-xs">
          [ SPATIAL_PRESENTATION // STAGE_BRIDGE ]
        </p>

        {/* Dual Card Container: Industrial Hardware Aesthetic with Corner Crosshairs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-3xl">
          {/* Host Card [CH_01 // HOST_NODE] */}
          <div className="relative bg-zinc-950/85 border border-zinc-800 hover:border-zinc-500 p-8 rounded-2xl flex flex-col justify-between text-left group hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 ease-out shadow-2xl overflow-hidden cursor-default">
            <CornerCrosshairs />

            <div>
              {/* Monospace Hardware Label */}
              <div className="flex items-center justify-between font-mono text-[11px] text-zinc-500 uppercase tracking-wider mb-6 pb-2.5 border-b border-zinc-800">
                <span className="text-zinc-400 font-bold">[CH_01 // HOST_NODE]</span>
                <span>WEBCAM_CV</span>
              </div>

              <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-4 group-hover:border-zinc-500 transition-colors">
                <Presentation className="w-5 h-5 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-white tracking-wide font-sans">
                Host Presentation
              </h2>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-sans">
                Launch the Presenter Cockpit, load keynote PDF slides, and control presentation flow via touchless physical hand gestures.
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateHost();
              }}
              disabled={isCreatingRoom}
              className="mt-8 w-full py-3.5 px-4 rounded-xl bg-white text-black font-mono font-bold text-xs tracking-wider uppercase hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl disabled:opacity-50"
            >
              <span>{isCreatingRoom ? 'INITIALIZING...' : <ScrambleText text="START_SESSION ->" />}</span>
            </button>
          </div>

          {/* Join Audience Card [CH_02 // SYNC_RECEIVER] */}
          <div className="relative bg-zinc-950/85 border border-zinc-800 hover:border-zinc-500 p-8 rounded-2xl flex flex-col justify-between text-left group hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 ease-out shadow-2xl overflow-hidden cursor-default">
            <CornerCrosshairs />

            <div>
              {/* Monospace Hardware Label */}
              <div className="flex items-center justify-between font-mono text-[11px] text-zinc-500 uppercase tracking-wider mb-6 pb-2.5 border-b border-zinc-800">
                <span className="text-zinc-400 font-bold">[CH_02 // SYNC_RECEIVER]</span>
                <span>WSS_TELEMETRY</span>
              </div>

              <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-4 group-hover:border-zinc-500 transition-colors">
                <Users className="w-5 h-5 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-white tracking-wide font-sans">
                Join as Audience
              </h2>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-sans">
                Synchronize attendee devices with live stage push links, stream action snaps, and export LIFO meeting minutes.
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
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={audienceCode}
                  onChange={(e) => setAudienceCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="4-DIGIT CODE"
                  className="flex-1 bg-black/90 border border-zinc-800 focus:border-zinc-400 rounded-xl px-4 py-3 text-center text-xs font-mono tracking-widest text-white placeholder:text-zinc-600 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 font-mono font-bold text-xs tracking-wider uppercase active:scale-[0.98] transition-all cursor-pointer shadow-lg"
                >
                  <ScrambleText text="JOIN" />
                </button>
              </div>
              {errorMsg && (
                <p className="text-[11px] text-zinc-400 font-mono px-1">ERR // {errorMsg}</p>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* Info Modal ('i' Button Trigger) - Strictly Monochrome Industrial Hardware Aesthetic */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative bg-zinc-950 border border-zinc-700 p-8 rounded-2xl max-w-xl w-full text-left shadow-2xl overflow-hidden">
            <CornerCrosshairs />

            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-5 right-5 p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Hardware Modal Header */}
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>[SYS_MANUAL // GESTURE_PROTOCOL_V2.5]</span>
            </div>

            <h3 className="text-xl font-bold text-white tracking-wide font-sans mb-1">
              <ScrambleText text="Gesture Operations & Controls" />
            </h3>
            <p className="text-xs text-zinc-400 font-mono mb-6 leading-relaxed">
              In-browser computer vision on webcam input analyzing 21 hand landmarks in real time.
            </p>

            <div className="space-y-3 font-mono">
              {/* Left & Right Palm Open Nav */}
              <div className="p-3.5 rounded-xl bg-black/70 border border-zinc-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Hand className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">
                    [OP_01 // DUAL_PALM_NAV]
                  </div>
                  <ul className="text-xs text-zinc-400 mt-1 space-y-1">
                    <li><strong className="text-white">RIGHT PALM OPEN:</strong> Step forward to next slide</li>
                    <li><strong className="text-white">LEFT PALM OPEN:</strong> Step backward to previous slide</li>
                  </ul>
                </div>
              </div>

              {/* Fist Closed AirBlast */}
              <div className="p-3.5 rounded-xl bg-black/70 border border-zinc-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Share2 className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">
                    [OP_02 // AIRBLAST_DISPATCH]
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Form a <strong className="text-white">CLOSED FIST</strong>. Dynamic link parser scans active slide and opens resource URL in a new window for all paired audience nodes.
                  </p>
                </div>
              </div>

              {/* Peace Sign Spatial MOM */}
              <div className="p-3.5 rounded-xl bg-black/70 border border-zinc-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Camera className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">
                    [OP_03 // SPATIAL_MOM_SYNAPSE]
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Hold up a <strong className="text-white">PEACE SIGN (2 FINGERS)</strong>. Freezes slide snapshot, captures rolling speech buffer, and synthesizes structured Gemini AI meeting minutes.
                  </p>
                </div>
              </div>

              {/* Status Indicator Guide (Strictly Monochrome) */}
              <div className="p-3.5 rounded-xl bg-black/70 border border-zinc-800">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  [TELEMETRY_HUD // SENSOR_LOCK_STATES]
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400">
                    <span className="block font-bold text-white">[STANDBY]</span>
                    <span>Hand out of view</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-600 text-zinc-300">
                    <span className="block font-bold text-white">[LOCKED]</span>
                    <span>Landmarks tracked</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800 border border-white text-white">
                    <span className="block font-bold">[TRIGGERED]</span>
                    <span>Command fired</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-6 w-full py-3 rounded-xl bg-white text-black font-mono font-bold text-xs tracking-wider uppercase hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <ScrambleText text="[DISMISS // GOT_IT]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
