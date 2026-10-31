import React from 'react';
import { X, Award, Clock, MessageSquare, ArrowRight, TrendingUp, AlertCircle, BarChart2 } from 'lucide-react';

function CornerCrosshairs() {
  return (
    <>
      <span className="absolute top-2 left-2 text-zinc-600 font-mono text-[9px] leading-none pointer-events-none select-none">+</span>
      <span className="absolute top-2 right-2 text-zinc-600 font-mono text-[9px] leading-none pointer-events-none select-none">+</span>
      <span className="absolute bottom-2 left-2 text-zinc-600 font-mono text-[9px] leading-none pointer-events-none select-none">+</span>
      <span className="absolute bottom-2 right-2 text-zinc-600 font-mono text-[9px] leading-none pointer-events-none select-none">+</span>
    </>
  );
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function SessionReportModal({
  isOpen,
  onClose,
  onEndSession,
  reportData,
  slideDurations = {},
  targetDurations = {},
  fillerCounts = {},
  totalFillerWords = 0,
  roomCode,
}) {
  if (!isOpen || !reportData) return null;

  const {
    flow_score = 85,
    pacing_critique = 'Consistent pacing maintained across the presentation.',
    confidence_rating = 'Conversational',
    improvement_vs_benchmark = 'Clean delivery with minimal verbal clutter.',
    actionable_coaching_cues = [],
    pacing_accuracy_percent = 88,
  } = reportData;

  // Sorted list of visited slides
  const slideKeys = Object.keys(slideDurations)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        <CornerCrosshairs />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <div className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
                [POST_SESSION_TELEMETRY // ROOM #{roomCode}]
              </div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Presentation Pacing & Speech Cadence Report
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Close Report"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Top 4 Key Telemetry Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Flow Score */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                [FLOW_SCORE]
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-mono font-bold text-white tracking-tight">
                  {flow_score}
                </span>
                <span className="text-xs font-mono text-zinc-500">/ 100</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, flow_score))}%` }}
                />
              </div>
            </div>

            {/* Pacing Accuracy */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                [PACING_ACCURACY]
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-mono font-bold text-white tracking-tight">
                  {Math.round(pacing_accuracy_percent)}
                </span>
                <span className="text-sm font-mono text-zinc-400">%</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-sans mt-1">
                Based on target slide budgets
              </span>
            </div>

            {/* Filler Words Count */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                [FILLER_WORDS]
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-mono font-bold text-white tracking-tight">
                  {totalFillerWords}
                </span>
                <span className="text-xs font-mono text-zinc-500">detected</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-sans mt-1">
                Real-time speech listener
              </span>
            </div>

            {/* Confidence Rating */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                [CONFIDENCE_INDEX]
              </span>
              <div className="mt-2">
                <span className="text-lg font-mono font-bold text-white truncate block">
                  {confidence_rating}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-sans mt-1">
                Vocal tone & cadence index
              </span>
            </div>
          </div>

          {/* Pacing Critique Box */}
          <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 space-y-1.5">
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>[PACING_CRITIQUE]</span>
            </div>
            <p className="text-xs text-zinc-200 leading-relaxed font-sans">
              {pacing_critique}
            </p>
          </div>

          {/* Slide Pacing Breakdown Table */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950/60">
            <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
              <div className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>[SLIDE_PACING_TELEMETRY]</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                CUMULATIVE SCREEN TIME
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-[10px] text-zinc-500 uppercase bg-zinc-900/20">
                    <th className="py-2.5 px-4">Slide</th>
                    <th className="py-2.5 px-4">Actual Time</th>
                    <th className="py-2.5 px-4">Target Budget</th>
                    <th className="py-2.5 px-4">Accuracy</th>
                    <th className="py-2.5 px-4 text-right">Cadence Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {slideKeys.length > 0 ? (
                    slideKeys.map((slideNum) => {
                      const actual = slideDurations[slideNum] || 0;
                      const target = targetDurations[slideNum] || 60;
                      const diff = actual - target;
                      const diffPct = target > 0 ? Math.round((diff / target) * 100) : 0;
                      const accuracyPct = Math.max(
                        0,
                        Math.min(100, Math.round((1 - Math.min(Math.abs(diff) / target, 1)) * 100))
                      );

                      return (
                        <tr key={slideNum} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-white">#{slideNum}</td>
                          <td className="py-2.5 px-4 text-zinc-300">{formatDuration(actual)}</td>
                          <td className="py-2.5 px-4 text-zinc-500">{formatDuration(target)}</td>
                          <td className="py-2.5 px-4 text-zinc-300 font-semibold">{accuracyPct}%</td>
                          <td className="py-2.5 px-4 text-right">
                            {diffPct === 0 ? (
                              <span className="text-zinc-400">ON TARGET</span>
                            ) : diffPct > 0 ? (
                              <span className="text-amber-400">+{diffPct}% OVER</span>
                            ) : (
                              <span className="text-sky-400">{diffPct}% UNDER</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-zinc-500 text-xs font-sans">
                        No slide navigation telemetry recorded during session.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Filler Word Matrix & Benchmark Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filler Word Breakdown */}
            <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 space-y-3">
              <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase flex items-center justify-between">
                <span>[FILLER_WORD_TALLY]</span>
                <span className="text-zinc-400">CLIENT-SIDE AUDIO MONITOR</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries({
                  um: fillerCounts.um || 0,
                  uh: fillerCounts.uh || 0,
                  like: fillerCounts.like || 0,
                  basically: fillerCounts.basically || 0,
                  'you know': fillerCounts.you_know || 0,
                  literally: fillerCounts.literally || 0,
                  actually: fillerCounts.actually || 0,
                  'i mean': fillerCounts.i_mean || 0,
                }).map(([word, count]) => (
                  <div
                    key={word}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                  >
                    <span className="text-[11px] font-sans text-zinc-400">{word}</span>
                    <span className="text-xs font-mono font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benchmark Comparison */}
            <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 space-y-2 flex flex-col justify-between">
              <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                <span>[BENCHMARK_ANALYSIS]</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {improvement_vs_benchmark}
              </p>
              <div className="font-mono text-[10px] text-zinc-500 uppercase">
                Relative to standard tech keynotes (3-4 fillers/min baseline)
              </div>
            </div>
          </div>

          {/* Actionable Coaching Cues */}
          {actionable_coaching_cues && actionable_coaching_cues.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2.5">
              <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                [ACTIONABLE_COACHING_CUES]
              </div>
              <ul className="space-y-2">
                {actionable_coaching_cues.map((cue, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <span className="text-zinc-500 font-mono text-xs select-none">-</span>
                    <span className="font-sans leading-relaxed">{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-500">
            MUDRA REALTIME ANALYTICS ENGINE
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              Back to Cockpit
            </button>
            {onEndSession && (
              <button
                onClick={onEndSession}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-mono font-semibold transition-all cursor-pointer shadow-lg"
              >
                End & Exit Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
