import React, { useState } from 'react';
import { useRoomWebSocket } from '../hooks/useRoomWebSocket';
import { LogOut, Wifi, FileDown, Layers } from 'lucide-react';

export default function AudienceWorkspace({ roomCode, onLeave }) {
  const [momCards, setMomCards] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(1);

  const { isConnected } = useRoomWebSocket({
    roomCode,
    clientType: 'audience',
    onMessage: (msg) => {
      console.log('[AudienceWorkspace] Received message:', msg);
      if (msg.type === 'SLIDE_UPDATE') {
        setCurrentSlide(msg.slide);
      } else if (msg.type === 'AIRBLAST_URL') {
        if (msg.url) {
          window.open(msg.url, '_blank');
        }
      } else if (msg.type === 'MOM_CARD') {
        setMomCards((prev) => [msg.card, ...prev]);
      } else if (msg.type === 'INIT_STATE') {
        if (msg.current_slide) setCurrentSlide(msg.current_slide);
        if (msg.mom_cards) setMomCards(msg.mom_cards);
      }
    }
  });

  return (
    <div className="min-h-screen w-full bg-textured-matrix flex flex-col items-center justify-between p-6">
      <header className="w-full max-w-4xl flex items-center justify-between px-6 py-3.5 glass-panel rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-bold text-sm text-white">
            M
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Audience Workspace</h1>
            <p className="text-[11px] text-zinc-400 font-mono">Room: #{roomCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-card text-zinc-300">
            <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span>{isConnected ? 'Live' : 'Connecting...'}</span>
          </div>

          <button
            onClick={onLeave}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Leave Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center text-center my-8">
        <div className="glass-panel p-10 rounded-2xl max-w-md w-full">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mx-auto mb-4">
            <Layers className="w-6 h-6 text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connected to Room #{roomCode}</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Minutes of meeting will stream here automatically as the presenter captures action snaps.
          </p>
          <div className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-zinc-400 inline-block font-mono">
            Current Slide on Stage: {currentSlide}
          </div>
        </div>
      </main>

      <footer className="text-[11px] text-zinc-500">
        Mudrā Audience Stream • Annotation & PDF export will unlock in later slices
      </footer>
    </div>
  );
}
