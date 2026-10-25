import React, { useState, useEffect } from 'react';
import { soundEngine } from '../utils/soundEffects';

export default function CinematicIntro({ onComplete }) {
  // phase: 'idle' | 'parting' | 'sliding_up' | 'done'
  const [phase, setPhase] = useState('idle');

  // Preload images into memory
  useEffect(() => {
    const urls = ['/god_valley_left.png', '/god_valley_right.png', '/god_valley_full.png'];
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
      console.warn('Intro sound warning:', e);
    }

    // Stage 1: Visibly part the two hands/cliffs to their respective sides
    setPhase('parting');

    // Stage 2: As the hands part outward, slide the MUDRA screen upwards
    setTimeout(() => {
      setPhase('sliding_up');
    }, 750);

    // Stage 3: Complete transition to reveal the original screen
    setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, 1700);
  };

  if (phase === 'done') {
    return null;
  }

  const isParting = phase === 'parting' || phase === 'sliding_up';
  const isSlidingUp = phase === 'sliding_up';

  return (
    <div
      onClick={handleClick}
      className={`fixed inset-0 z-50 bg-[#060709] flex flex-col items-center justify-between p-6 sm:p-10 select-none cursor-pointer overflow-hidden transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSlidingUp ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Background Matrix & Subtle Spotlight */}
      <div className="absolute inset-0 bg-textured-matrix opacity-70 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(14,165,233,0.14),transparent_70%)] pointer-events-none" />

      {/* Top Header Label */}
      <div className="z-10 w-full max-w-5xl flex justify-between items-center opacity-40">
        <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
          Stage Bridge
        </span>
        <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
          Zero-Touch Navigation
        </span>
      </div>

      {/* Center Hero: Grand MUDRA Title */}
      <div className="z-10 flex flex-col items-center text-center my-auto">
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_45px_rgba(255,255,255,0.3)] mb-2">
          MUDRĀ
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-zinc-400 font-medium tracking-[0.25em] uppercase max-w-md">
          Spatial Presentation & Stage Bridge
        </p>
      </div>

      {/* The Hands / God Valley Rock Towers
          Both left and right images are mounted in the DOM from the start, forming the complete image seamlessly.
          When clicked, left slides out to the left (-120vw), and right slides out to the right (+120vw).
      */}
      <div className="relative z-20 w-full max-w-4xl h-[42vh] sm:h-[48vh] my-auto flex items-center justify-center overflow-visible">
        {/* Left Hand / Rock Tower */}
        <img
          src="/god_valley_left.png"
          alt="Mudra Left Hand"
          style={{
            transform: isParting ? 'translateX(-120vw) rotate(-5deg)' : 'translateX(0) rotate(0)',
            opacity: isParting ? 0.2 : 1,
            transition: 'transform 1.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.3s ease',
          }}
          className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(14,165,233,0.35)] pointer-events-none select-none"
        />

        {/* Right Hand / Rock Tower */}
        <img
          src="/god_valley_right.png"
          alt="Mudra Right Hand"
          style={{
            transform: isParting ? 'translateX(120vw) rotate(5deg)' : 'translateX(0) rotate(0)',
            opacity: isParting ? 0.2 : 1,
            transition: 'transform 1.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.3s ease',
          }}
          className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(14,165,233,0.35)] pointer-events-none select-none"
        />
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
