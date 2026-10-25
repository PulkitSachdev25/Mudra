import React, { useState } from 'react';
import { useRoomWebSocket } from '../hooks/useRoomWebSocket';
import MOMCardItem from './MOMCardItem';
import { exportMinutesToPDF } from '../utils/pdfExporter';
import { 
  LogOut, Wifi, FileDown, Layers, ExternalLink, 
  PenTool, Highlighter, Eraser, MousePointer 
} from 'lucide-react';

export default function AudienceWorkspace({ roomCode, onLeave }) {
  const [momCards, setMomCards] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [pushedLinkToast, setPushedLinkToast] = useState(null);

  // Annotation Toolbar State
  const [activeTool, setActiveTool] = useState('none'); // 'none' | 'pen' | 'highlighter' | 'eraser'
  const [activeColor, setActiveColor] = useState('#38bdf8');
  const [annotationsMap, setAnnotationsMap] = useState({}); // card.id -> { imageData, note }
  const [isExporting, setIsExporting] = useState(false);

  const { isConnected } = useRoomWebSocket({
    roomCode,
    clientType: 'audience',
    onMessage: (msg) => {
      console.log('[AudienceWorkspace] Received message:', msg);
      if (msg.type === 'SLIDE_UPDATE') {
        setCurrentSlide(msg.slide);
      } else if (msg.type === 'AIRBLAST_URL') {
        if (msg.url) {
          setPushedLinkToast({
            url: msg.url,
            title: msg.title || 'Interactive Stage Link',
          });

          // Guaranteed new tab open via unique target and fallback anchor click
          try {
            const uniqueTarget = `_mudra_tab_${Date.now()}`;
            const opened = window.open(msg.url, uniqueTarget, 'noopener,noreferrer');
            if (!opened || opened.closed || typeof opened.closed === 'undefined') {
              const a = document.createElement('a');
              a.href = msg.url;
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } catch (e) {
            console.warn('Popup blocked, toast provides manual click:', e);
          }

          // Add link card to MoM cards in chronological order
          const linkCard = msg.link_card || {
            id: `link_${Date.now()}`,
            type: 'link',
            slide_index: msg.slide_index || currentSlide,
            title: msg.title || 'Stage Resource Link',
            url: msg.url,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            takeaway: `Presenter pushed interactive resource link for Slide #${msg.slide_index || currentSlide}.`,
            action_items: [`Open resource: ${msg.url}`],
          };

          setMomCards((prev) => {
            if (prev.some((c) => c.id === linkCard.id)) return prev;
            return [...prev, linkCard]; // Append in chronological order
          });

          setTimeout(() => {
            setPushedLinkToast(null);
          }, 6000);
        }
      } else if (msg.type === 'MOM_CARD') {
        setMomCards((prev) => {
          // Avoid duplicate card IDs, append in chronological order
          if (prev.some((c) => c.id === msg.card.id)) return prev;
          return [...prev, msg.card];
        });
      } else if (msg.type === 'INIT_STATE') {
        if (msg.current_slide) setCurrentSlide(msg.current_slide);
        if (msg.mom_cards) setMomCards(msg.mom_cards);
      }
    }
  });

  const handleUpdateAnnotation = (cardId, imageData, note) => {
    setAnnotationsMap((prev) => ({
      ...prev,
      [cardId]: { imageData, note },
    }));
  };

  const handleDownloadPDF = async () => {
    if (momCards.length === 0) {
      alert('No meeting minutes cards captured yet.');
      return;
    }
    setIsExporting(true);
    try {
      await exportMinutesToPDF({
        roomCode,
        cards: momCards,
        annotationsMap,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const colors = ['#38bdf8', '#10b981', '#f59e0b', '#f43f5e', '#ffffff'];

  return (
    <div className="min-h-screen w-full bg-textured-matrix flex flex-col items-center justify-between p-4 md:p-6 select-none overflow-x-hidden">
      {/* Top Header Dock */}
      <header className="z-30 w-full max-w-5xl flex items-center justify-between px-6 py-3.5 glass-panel rounded-2xl">
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
            <span>{isConnected ? 'Stage Live' : 'Connecting...'}</span>
          </div>

          {/* Sticky Download as a PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting || momCards.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-zinc-200 active:scale-95 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer shadow-lg"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Compiling PDF...' : 'Download as PDF'}</span>
          </button>

          <button
            onClick={onLeave}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Leave Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Pushed AirBlast Toast Banner */}
      {pushedLinkToast && (
        <div className="z-30 w-full max-w-5xl mt-3 animate-in slide-in-from-top-4 duration-300">
          <div className="glass-panel p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                  AirBlast Received: {pushedLinkToast.title}
                </p>
                <p className="text-xs text-zinc-300 font-mono truncate max-w-md">
                  {pushedLinkToast.url}
                </p>
              </div>
            </div>
            <a
              href={pushedLinkToast.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wide uppercase transition-colors shrink-0 shadow-lg cursor-pointer"
            >
              <span>Open Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Floating macOS Frosted Glass Annotation Toolbar */}
      <div className="sticky top-20 z-20 my-4 glass-panel px-5 py-2.5 rounded-2xl flex items-center gap-4 shadow-2xl border border-white/10">
        <span className="text-xs font-medium text-zinc-400 tracking-wide pr-2 border-r border-white/10 hidden sm:inline">
          Annotation Tools
        </span>

        {/* Tool Selectors */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTool('none')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeTool === 'none' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:bg-white/10'
            }`}
            title="Browse / Pointer"
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeTool === 'pen' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:bg-white/10'
            }`}
            title="Pen Draw"
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('highlighter')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeTool === 'highlighter' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:bg-white/10'
            }`}
            title="Highlighter"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeTool === 'eraser' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:bg-white/10'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette (Active if Pen or Highlighter selected) */}
        {activeTool !== 'none' && activeTool !== 'eraser' && (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10 animate-in fade-in duration-150">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                  activeColor === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main Content: Live Feed of MOM Cards or Empty Waiting State */}
      <main className="flex-1 w-full max-w-5xl flex flex-col items-center justify-start my-4 space-y-6">
        {momCards.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl max-w-md w-full text-center my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mx-auto mb-4 shadow-inner">
              <Layers className="w-6 h-6 text-zinc-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connected to Room #{roomCode}</h2>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Minutes of meeting will stream here automatically as the presenter takes action snaps on stage.
            </p>
            <div className="px-4 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-zinc-300 font-mono inline-block">
              Current Stage Slide: #{currentSlide}
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {momCards.map((card) => (
              <MOMCardItem
                key={card.id}
                card={card}
                activeTool={activeTool}
                activeColor={activeColor}
                onUpdateAnnotation={handleUpdateAnnotation}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="z-20 text-[11px] text-zinc-500 tracking-wide mt-6">
        Mudrā Audience Stream • Live Annotations & Instant PDF Export
      </footer>
    </div>
  );
}
