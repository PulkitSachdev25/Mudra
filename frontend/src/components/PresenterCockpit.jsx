import React from 'react';
import { useRoomWebSocket } from '../hooks/useRoomWebSocket';
import { LogOut, Users, Wifi } from 'lucide-react';

export default function PresenterCockpit({ roomCode, onLeave }) {
  const { isConnected, audienceCount } = useRoomWebSocket({
    roomCode,
    clientType: 'presenter',
    onMessage: (msg) => {
      console.log('[PresenterCockpit] Received message:', msg);
    }
  });

  return (
    <div className="min-h-screen w-full bg-textured-matrix flex flex-col items-center justify-between p-6">
      <header className="w-full max-w-5xl flex items-center justify-between px-6 py-3.5 glass-panel rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-bold text-sm text-white">
            M
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Presenter Cockpit</h1>
            <p className="text-[11px] text-zinc-400 font-mono">Room: #{roomCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-card text-zinc-300">
            <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-card text-zinc-300">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span>Audience: {audienceCount}</span>
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

      <main className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center text-center my-8">
        <div className="glass-panel p-10 rounded-2xl max-w-md w-full">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Stage Ready</p>
          <h2 className="text-2xl font-bold text-white mb-2">Room #{roomCode} Active</h2>
          <p className="text-xs text-zinc-400 mb-6">
            Signaling server is active. Share this 4-digit code with audience devices.
          </p>
          <div className="p-4 rounded-xl bg-black/50 border border-white/10 text-3xl font-mono tracking-widest text-white mb-4">
            {roomCode}
          </div>
        </div>
      </main>

      <footer className="text-[11px] text-zinc-500">
        Mudrā Cockpit • Ready for PDF & MediaPipe initialization in Slice 2
      </footer>
    </div>
  );
}
