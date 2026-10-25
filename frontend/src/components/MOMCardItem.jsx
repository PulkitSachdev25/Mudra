import React, { useRef, useState, useEffect } from 'react';
import { CheckSquare, MessageSquare, Clock, ExternalLink } from 'lucide-react';

function CornerCrosshairs() {
  return (
    <>
      <span className="absolute top-2 left-2 text-zinc-700 font-mono text-[9px] leading-none pointer-events-none select-none">+</span>
      <span className="absolute top-2 right-2 text-zinc-700 font-mono text-[9px] leading-none pointer-events-none select-none">+</span>
      <span className="absolute bottom-2 left-2 text-zinc-700 font-mono text-[9px] leading-none pointer-events-none select-none">+</span>
      <span className="absolute bottom-2 right-2 text-zinc-700 font-mono text-[9px] leading-none pointer-events-none select-none">+</span>
    </>
  );
}

export default function MOMCardItem({
  card,
  cardNumber,
  isLatest,
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

  // Coordinate extraction helper supporting both Mouse and Mobile Touch events
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    if (clientX === undefined || clientY === undefined) return null;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Drawing event handlers
  const startDrawing = (e) => {
    if (activeTool === 'none') return;
    if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
    isDrawingRef.current = true;
    const coords = getCoordinates(e);
    if (coords) {
      lastPointRef.current = coords;
    }
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentPoint = getCoordinates(e);
    if (!currentPoint) return;

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

  const stopDrawing = (e) => {
    if (!isDrawingRef.current) return;
    if (e && e.cancelable && e.type.startsWith('touch')) e.preventDefault();
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

  // Dedicated render layout for AirBlast Resource Link Cards
  if (card.type === 'link' || (!card.image_data && card.url)) {
    return (
      <div className="relative bg-zinc-950/85 p-6 rounded-2xl w-full border border-zinc-800 hover:border-zinc-700 shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 duration-300 overflow-hidden">
        <CornerCrosshairs />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
          <div className="flex items-center gap-2.5 flex-wrap">
            {cardNumber !== undefined && (
              <span className={`px-2.5 py-0.5 rounded-md font-mono text-xs font-bold border ${
                isLatest
                  ? 'bg-zinc-800 text-white border-zinc-600'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800'
              }`}>
                {cardNumber}
              </span>
            )}
            <span className="text-sm font-semibold text-white tracking-wide font-sans">
              Link Incoming
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>{card.timestamp}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left: Terminal Link Box with Hairline Zinc Border */}
          <div className="flex flex-col justify-center p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
              [DISPATCHED_STAGE_RESOURCE]
            </span>
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-white text-zinc-300 hover:text-white transition-all duration-200 font-mono text-xs break-all group cursor-pointer shadow-lg"
            >
              <span className="truncate mr-2 text-zinc-300 group-hover:text-white">{card.url}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </a>
            <p className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
              Click to open terminal link in new window
            </p>
          </div>

          {/* Right: Context & Personal Note */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800">
              <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
                [CONTEXT // STAGE_TRIGGER]
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {card.takeaway || `Presenter pushed live interactive URL for Slide #${card.slide_index}.`}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
              <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase mb-1.5">
                <MessageSquare className="w-3 h-3 text-zinc-500" />
                <span>Your Notes on this Link</span>
              </div>
              <textarea
                value={userNote}
                onChange={handleNoteChange}
                placeholder="Type any personal notes or follow-ups for this link..."
                className="w-full h-16 bg-black/70 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none font-sans"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-zinc-950/85 p-6 rounded-2xl w-full border border-zinc-800 hover:border-zinc-700 shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 duration-300 overflow-hidden">
      <CornerCrosshairs />

      {/* Card Header: Number, Title & Timestamp */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          {cardNumber !== undefined && (
            <span className={`px-2.5 py-0.5 rounded-md font-mono text-xs font-bold border ${
              isLatest
                ? 'bg-zinc-800 text-white border-zinc-600'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800'
            }`}>
              {cardNumber}
            </span>
          )}
          <span className="text-sm font-semibold text-white tracking-wide font-sans">
            {card.title?.replace(/^Slide\s*\d+\s*(Spatial MOM|:)?\s*/i, '').trim() || card.title || 'Discussion Takeaways'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>{card.timestamp}</span>
        </div>
      </div>

      {/* Main Grid: Visual Snapshot (Annotatable) & AI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Annotatable Slide Canvas */}
        <div className="flex flex-col">
          <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-zinc-800 bg-black/90 shadow-inner group">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
              style={{ touchAction: activeTool !== 'none' ? 'none' : 'auto' }}
              className={`w-full h-full object-contain ${
                activeTool !== 'none' ? 'cursor-crosshair touch-none' : 'cursor-default'
              }`}
            />
            {activeTool !== 'none' && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/90 text-[10px] text-zinc-300 pointer-events-none font-mono border border-zinc-800">
                Annotation Mode Active ({activeTool})
              </div>
            )}
          </div>
          <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase mt-1.5 px-1">
            Draw directly over slide snapshot
          </p>
        </div>

        {/* Right: AI Summary & Personal Note */}
        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            {/* Core Takeaway */}
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800">
              <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase mb-1">
                [CORE_TAKEAWAY]
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {card.takeaway}
              </p>
            </div>

            {/* Action Items */}
            {card.action_items && card.action_items.length > 0 && (
              <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800">
                <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase mb-2">
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Action Items</span>
                </div>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {card.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-zinc-500 font-mono shrink-0 select-none">-</span>
                      <span className="font-sans text-xs text-zinc-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Attendee Personal Note Input */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
              <span>Your Personal Notes</span>
            </div>
            <textarea
              rows={2}
              value={userNote}
              onChange={handleNoteChange}
              placeholder="Type your personal insights, questions, or notes here..."
              className="w-full bg-black/70 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none font-sans transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
