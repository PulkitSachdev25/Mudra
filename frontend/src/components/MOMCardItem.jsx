import React, { useRef, useState, useEffect } from 'react';
import { CheckSquare, MessageSquare, Clock, Sparkles } from 'lucide-react';

export default function MOMCardItem({
  card,
  activeTool, // 'pen' | 'highlighter' | 'eraser' | 'none'
  activeColor, // hex color
  onUpdateAnnotation, // callback with card.id, drawingData, userNote
}) {
  const [userNote, setUserNote] = useState('');
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  // Sync image snapshot onto canvas as background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !card.image_data) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = card.image_data;
    img.onload = () => {
      canvas.width = img.width || 800;
      canvas.height = img.height || 450;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Notify parent of baseline snapshot
      if (onUpdateAnnotation) {
        onUpdateAnnotation(card.id, canvas.toDataURL('image/jpeg', 0.9), userNote);
      }
    };
  }, [card.image_data]);

  // Drawing event handlers
  const startDrawing = (e) => {
    if (activeTool === 'none') return;
    isDrawingRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    lastPointRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentPoint = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);

    if (activeTool === 'pen') {
      ctx.strokeStyle = activeColor || '#38bdf8';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 1.0;
    } else if (activeTool === 'highlighter') {
      ctx.strokeStyle = activeColor || '#facc15';
      ctx.lineWidth = 18;
      ctx.lineCap = 'square';
      ctx.globalAlpha = 0.45;
    } else if (activeTool === 'eraser') {
      // Re-draw original image segment or erase
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 1.0;
    }

    ctx.stroke();
    ctx.globalAlpha = 1.0; // Reset alpha
    lastPointRef.current = currentPoint;
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    if (onUpdateAnnotation && canvasRef.current) {
      onUpdateAnnotation(
        card.id,
        canvasRef.current.toDataURL('image/jpeg', 0.9),
        userNote
      );
    }
  };

  const handleNoteChange = (e) => {
    const val = e.target.value;
    setUserNote(val);
    if (onUpdateAnnotation && canvasRef.current) {
      onUpdateAnnotation(
        card.id,
        canvasRef.current.toDataURL('image/jpeg', 0.9),
        val
      );
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl w-full border border-white/10 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
      {/* Card Header: Timestamp & Slide Badge */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-white/10 text-white font-mono text-xs font-semibold">
            Slide #{card.slide_index}
          </span>
          <span className="text-sm font-semibold text-white tracking-wide">
            {card.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{card.timestamp}</span>
        </div>
      </div>

      {/* Main Grid: Visual Snapshot (Annotatable) & AI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Annotatable Slide Canvas */}
        <div className="flex flex-col">
          <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-inner group">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className={`w-full h-full object-contain ${
                activeTool !== 'none' ? 'cursor-crosshair' : 'cursor-default'
              }`}
            />
            {activeTool !== 'none' && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-zinc-300 pointer-events-none font-mono">
                Annotation Mode Active ({activeTool})
              </div>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5 px-1">
            Draw directly over the slide snapshot using toolbar tools above
          </p>
        </div>

        {/* Right: AI Summary & Personal Note */}
        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            {/* Core Takeaway */}
            <div className="glass-card p-3.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Core Takeaway</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {card.takeaway}
              </p>
            </div>

            {/* Action Items */}
            {card.action_items && card.action_items.length > 0 && (
              <div className="glass-card p-3.5 rounded-xl border border-white/5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-2">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Action Items</span>
                </div>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {card.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Attendee Personal Note Input */}
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Your Personal Notes</span>
            </div>
            <textarea
              rows={2}
              value={userNote}
              onChange={handleNoteChange}
              placeholder="Type your personal insights, questions, or notes here..."
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
