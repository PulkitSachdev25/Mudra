import React, { useState, useEffect } from 'react';
import { soundEngine } from '../utils/soundEffects';

export default function CinematicIntro({ onComplete }) {
  // phase: 'idle' | 'parting' | 'sliding_up' | 'done'
  const [phase, setPhase] = useState('idle');

  // Preload images into cache so transition is 100% instantaneous and smooth
  useEffect(() => {
    const urls = ['/god_valley_full.png', '/god_valley_left.png', '/god_valley_right.png'];
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  const handleClick = () => {
    if (phase !== 'idle') return;

    try {
      soundEngine.playIntroWhoosh();
    } catch (e) {
      console.warn('Intro sound error:', e);
    }

    // Step 1: Switch to left & right pictures and start moving them to their respective sides
    setPhase('parting');

    // Step 2: As the cliffs move to their sides, slide the MUDRA screen and whole curtain upwards
    setTimeout(() => {
      setPhase('sliding_up');
    }, 450);

    // Step 3: Complete transition to reveal the original screen fully
    setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, 1450);
  };

  if (phase === 'done') {
    return null;
  }

  const isParting = phase === 'parting' || phase === 'sliding_up';
  const isSlidingUp = phase === 'sliding_up';

  return (
    <div
      onClick={handleClick}
      className={`fixed inset-0 z-50 bg-[#060709] flex flex-col items-center justify-between p-6 sm:p-10 select-none cursor-pointer overflow-hidden transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSlidingUp ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Background Matrix & Subtle Cinematic Spotlight */}
      <div className="absolute inset-0 bg-textured-matrix opacity-70 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(14,165,233,0.12),transparent_70%)] pointer-events-none" />

      {/* Top Header Placeholder for Balance */}
      <div className="z-10 w-full max-w-5xl flex justify-between items-center opacity-40">
        <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
          Stage Bridge
        </span>
        <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
          Zero-Touch Navigation
        </span>
      </div>

      {/* Central Hero Block: Grand Title & Subtitle */}
      <div className="z-10 flex flex-col items-center text-center my-auto transition-transform duration-700 ease-out">
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_45px_rgba(255,255,255,0.3)] mb-2">
          MUDRĀ
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-zinc-400 font-medium tracking-[0.25em] uppercase max-w-md">
          Spatial Presentation & Stage Bridge
        </p>
      </div>

      {/* God Valley Cinematic Overlay */}
      <div className="relative z-20 w-full max-w-4xl aspect-[666/375] my-auto flex items-center justify-center overflow-visible">
        {/* Full Image (Visible in Idle state) */}
        {!isParting && (
          <img
            src="/god_valley_full.png"
            alt="God Valley"
            className="w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(14,165,233,0.3)] transition-transform duration-500 hover:scale-[1.02]"
          />
        )}

        {/* Left Picture: Overlay and move to the left side on click */}
        {isParting && (
          <img
            src="/god_valley_left.png"
            alt="God Valley Left"
            style={{
              transform: isParting ? 'translateX(-130vw) rotate(-4deg)' : 'translateX(0)',
              transition: 'transform 1.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.3s ease',
              opacity: isParting ? 0.3 : 1,
            }}
            className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(14,165,233,0.4)] pointer-events-none"
          />
        )}

        {/* Right Picture: Overlay and move to the right side on click */}
        {isParting && (
          <img
            src="/god_valley_right.png"
            alt="God Valley Right"
            style={{
              transform: isParting ? 'translateX(130vw) rotate(4deg)' : 'translateX(0)',
              transition: 'transform 1.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.3s ease',
              opacity: isParting ? 0.3 : 1,
            }}
            className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(14,165,233,0.4)] pointer-events-none"
          />
        )}
      </div>

      {/* Bottom Floating Hint */}
      <div className="z-10 flex flex-col items-center gap-2 pb-4 transition-opacity duration-300">
        <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-zinc-400 animate-pulse">
          Click anywhere to enter
        </span>
        <div className="w-10 h-0.5 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>
    </div>
  );
}
