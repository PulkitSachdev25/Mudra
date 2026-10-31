import React, { useState, useEffect } from 'react';
import { useRoomWebSocket } from '../hooks/useRoomWebSocket';
import MOMCardItem from './MOMCardItem';
import { exportMinutesToPDF } from '../utils/pdfExporter';
import { soundEngine } from '../utils/soundEffects';
import { 
  LogOut, FileDown, Layers, ExternalLink, 
  PenTool, Highlighter, Eraser, MousePointer,
  MessageSquare, X, ThumbsUp, Sparkles, Send, HelpCircle
} from 'lucide-react';

export default function AudienceWorkspace({ roomCode, onLeave }) {
  const [momCards, setMomCards] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [pushedLinkToast, setPushedLinkToast] = useState(null);

  // Q&A Forum State
  const [questions, setQuestions] = useState([]);
  const [isQaOpen, setIsQaOpen] = useState(false);
  const [forumInputText, setForumInputText] = useState('');

  // Annotation Toolbar State
  const [activeTool, setActiveTool] = useState('none'); // 'none' | 'pen' | 'highlighter' | 'eraser'
  const [activeColor, setActiveColor] = useState('#38bdf8');
  const [annotationsMap, setAnnotationsMap] = useState({}); // card.id -> { imageData, note }
  const [isExporting, setIsExporting] = useState(false);

  // Helper to open a URL in a new window/tab
  const openUrlInNewWindow = (url) => {
    let opened = null;
    try {
      opened = window.open(url, '_blank');
      if (!opened || opened.closed || typeof opened.closed === 'undefined') {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.warn('[AirBlast] window.open failed:', e);
    }
    return opened;
  };

  const { isConnected, sendMessage } = useRoomWebSocket({
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
            title: 'Link Incoming',
          });

          try {
            soundEngine.playAirblastChime();
          } catch (e) {
            console.warn('Audio chime warning:', e);
          }

          openUrlInNewWindow(msg.url);

          const handleCapturingTapToOpen = () => {
            window.open(msg.url, '_blank', 'noopener,noreferrer');
            ['click', 'touchend', 'pointerdown', 'keydown'].forEach((evt) => {
              window.removeEventListener(evt, handleCapturingTapToOpen, true);
            });
          };
          ['click', 'touchend', 'pointerdown', 'keydown'].forEach((evt) => {
            window.addEventListener(evt, handleCapturingTapToOpen, { capture: true, once: true });
          });

          const linkCard = msg.link_card || {
            id: `link_${Date.now()}`,
            type: 'link',
            slide_index: msg.slide_index || currentSlide,
            title: 'Link Incoming',
            url: msg.url,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            takeaway: `Presenter pushed interactive resource link for Slide #${msg.slide_index || currentSlide}.`,
            action_items: [`Open resource: ${msg.url}`],
          };

          setMomCards((prev) => {
            if (prev.some((c) => c.id === linkCard.id)) return prev;
            return [...prev, linkCard];
          });

          setTimeout(() => {
            setPushedLinkToast(null);
          }, 8000);
        }
      } else if (msg.type === 'MOM_CARD') {
        setMomCards((prev) => {
          if (prev.some((c) => c.id === msg.card.id)) return prev;
          return [...prev, msg.card];
        });
      } else if (msg.type === 'INIT_STATE') {
        if (msg.current_slide) setCurrentSlide(msg.current_slide);
        if (msg.mom_cards) setMomCards(msg.mom_cards);
        if (msg.questions) setQuestions(msg.questions);
      } else if (msg.type === 'QUESTION_ADDED') {
        if (msg.question) {
          setQuestions((prev) => [msg.question, ...prev.filter((q) => q.id !== msg.question.id)]);
        }
      } else if (msg.type === 'QUESTION_UPVOTED') {
        setQuestions((prev) =>
          prev.map((q) => (q.id === msg.question_id ? { ...q, votes: msg.votes } : q))
        );
      }
    }
  });

  const handleAskDoubt = (slideIndex, questionText) => {
    if (!questionText || !questionText.trim()) return;
    sendMessage({
      type: 'ASK_QUESTION',
      slide_index: slideIndex || currentSlide,
      question: questionText.trim(),
      author: 'Audience Member',
    });
  };

  const handleUpvoteQuestion = (questionId) => {
    sendMessage({
      type: 'UPVOTE_QUESTION',
      question_id: questionId,
    });
  };

  const handleForumSubmit = (e) => {
    e.preventDefault();
    if (!forumInputText.trim()) return;
    handleAskDoubt(currentSlide, forumInputText.trim());
    setForumInputText('');
  };

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

  // Sort questions by votes descending
  const sortedQuestions = [...questions].sort((a, b) => (b.votes || 0) - (a.votes || 0));

  return (
    <div className="min-h-screen w-full bg-textured-matrix flex flex-col items-center justify-between p-4 md:p-6 select-none overflow-x-hidden">
      {/* Top Header Dock */}
      <header className="z-30 w-full max-w-5xl flex items-center justify-between px-6 py-3.5 glass-panel rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <img src="/mudra_logo_transparent.png" alt="Mudrā Logo" className="h-5 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Audience Workspace</h1>
            <p className="text-[11px] text-zinc-400 font-mono">Room: #{roomCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          {/* Q&A Forum Toggle Button */}
          <button
            onClick={() => setIsQaOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-400 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer shadow-md"
            title="Open Audience Q&A Forum"
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Q&A Forum</span>
            {questions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-black font-bold text-[10px]">
                {questions.length}
              </span>
            )}
          </button>

          {/* Sticky Download as a PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting || momCards.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-zinc-200 active:scale-95 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer shadow-lg"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'PDF'}</span>
          </button>

          <button
            onClick={onLeave}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Leave Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Pushed AirBlast Toast Banner */}
      {pushedLinkToast && (
        <div className="z-30 w-full max-w-5xl mt-3 animate-in slide-in-from-top-4 duration-300">
          <div className="relative bg-zinc-950/90 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 flex items-center justify-between shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                  [AIRBLAST // {pushedLinkToast.title}]
                </p>
                <p className="text-xs text-zinc-300 font-mono truncate max-w-md mt-0.5">
                  {pushedLinkToast.url}
                </p>
              </div>
            </div>
            <a
              href={pushedLinkToast.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs tracking-wider uppercase transition-all shrink-0 shadow-lg cursor-pointer active:scale-95"
            >
              <span>Open Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Floating Monochrome Industrial Annotation Toolbar */}
      <div className="sticky top-20 z-20 my-4 bg-zinc-950/90 px-5 py-2.5 rounded-2xl flex items-center gap-4 shadow-2xl border border-zinc-800 backdrop-blur-md">
        <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase pr-2 border-r border-zinc-800 hidden sm:inline">
          [TOOLS // ANNOTATION]
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
            {[...momCards].reverse().map((card, idx) => {
              const cardNumber = momCards.length - idx;
              return (
                <MOMCardItem
                  key={card.id}
                  card={card}
                  cardNumber={cardNumber}
                  isLatest={idx === 0}
                  activeTool={activeTool}
                  activeColor={activeColor}
                  onUpdateAnnotation={handleUpdateAnnotation}
                  onAskDoubt={handleAskDoubt}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Audience Q&A Forum Sidebar Drawer */}
      {isQaOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsQaOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Panel */}
          <aside className="relative z-10 w-80 sm:w-96 h-full bg-[#090a0d] border-l border-zinc-800 shadow-2xl flex flex-col justify-between text-zinc-200 animate-in slide-in-from-right duration-300">
            {/* Top Bar */}
            <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="font-mono text-[9px] tracking-widest text-zinc-500 uppercase">
                    [LIVE_QNA_FORUM // ROOM #{roomCode}]
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Audience Q&A & Doubts
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsQaOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Close Forum"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Doubt Input Form inside Forum */}
            <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/30">
              <form onSubmit={handleForumSubmit} className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
                  <span>Ask a Doubt (Slide #{currentSlide})</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={forumInputText}
                    onChange={(e) => setForumInputText(e.target.value)}
                    placeholder="Type your question for Gemini & host..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-white rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-colors font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!forumInputText.trim()}
                    className="px-3 py-1.5 rounded-xl bg-white text-black font-mono text-xs font-bold disabled:opacity-40 hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>

            {/* Scrollable Questions List (Ranked by Votes) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {sortedQuestions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs space-y-2">
                  <HelpCircle className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p>No doubts asked yet.</p>
                  <p className="text-[10px] text-zinc-600">
                    Ask a doubt under any MoM card or above to see 1-2 line Gemini AI answers!
                  </p>
                </div>
              ) : (
                sortedQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-zinc-900 text-zinc-400 border border-zinc-800">
                          Slide #{q.slide_index}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{q.timestamp}</span>
                      </div>

                      {/* Upvote Button */}
                      <button
                        onClick={() => handleUpvoteQuestion(q.id)}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-400 text-zinc-200 hover:text-white font-mono text-xs transition-colors cursor-pointer active:scale-95"
                        title="Upvote this question"
                      >
                        <span className="text-emerald-400 font-bold">▲</span>
                        <span className="font-bold">{q.votes || 1}</span>
                      </button>
                    </div>

                    {/* Question Text */}
                    <p className="text-xs font-medium text-white font-sans leading-snug">
                      {q.question}
                    </p>

                    {/* Gemini AI 1-2 Line Answer Box */}
                    {q.ai_answer && (
                      <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-1 text-[9px] font-mono tracking-widest uppercase text-sky-400">
                          <Sparkles className="w-3 h-3 text-sky-400" />
                          <span>Gemini Answer</span>
                        </div>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                          {q.ai_answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-950/90 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>{sortedQuestions.length} Questions Asked</span>
              <button
                onClick={() => setIsQaOpen(false)}
                className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Footer */}
      <footer className="z-20 text-[11px] text-zinc-500 tracking-wide mt-6">
        Mudrā Audience Stream | Live Annotations & Instant PDF Export
      </footer>
    </div>
  );
}
