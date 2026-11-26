import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import type { BeladyDetectionResult } from '../../core/replacement/types';

interface BeladyAnomalyCardProps {
  detection: BeladyDetectionResult;
  currentFrameCount: number;
}

export const BeladyAnomalyCard: React.FC<BeladyAnomalyCardProps> = ({
  detection,
  currentFrameCount,
}) => {
  const maxFaults = Math.max(...detection.resultsByFrame.map((r) => r.faults), 1);

  return (
    <div className="rounded-2xl glass-panel p-5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              detection.hasAnomaly
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
            }`}
          >
            {detection.hasAnomaly ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">
              Belady's Anomaly Analyzer (FIFO)
            </h3>
            <p className="text-[11px] text-[var(--color-text-subtle)]">
              Verifying whether increasing frames increases page faults
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
            detection.hasAnomaly
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {detection.hasAnomaly ? 'Anomaly Detected' : 'Normal Monotonicity'}
        </span>
      </div>

      {/* Frame vs Fault Comparison Bar Chart */}
      <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold">
          <span>Physical Frame Count (2 to 6)</span>
          <span>FIFO Page Faults</span>
        </div>

        <div className="space-y-2">
          {detection.resultsByFrame.map((res) => {
            const isCurrent = res.frameCount === currentFrameCount;
            const barWidth = Math.max(12, Math.round((res.faults / maxFaults) * 100));

            return (
              <div
                key={res.frameCount}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isCurrent
                    ? 'bg-[var(--color-accent-warning)]/10 border-[var(--color-accent-warning)] shadow-sm'
                    : 'bg-[var(--color-bg-surface-elevated)] border-[var(--color-border-subtle)]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-[90px]">
                  <span className="font-mono text-xs font-bold text-[var(--color-text-main)]">
                    {res.frameCount} Frames
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-accent-warning)] text-[var(--color-accent-contrast)] font-bold">
                      Active
                    </span>
                  )}
                </div>

                {/* Progress bar container */}
                <div className="flex-1 h-3 rounded-full bg-[var(--color-bg-muted)] overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCurrent
                        ? 'bg-[var(--color-accent-warning)]'
                        : 'bg-blue-400/80'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="text-right min-w-[70px] font-mono">
                  <span className="text-xs font-extrabold text-[var(--color-text-main)]">
                    {res.faults} faults
                  </span>
                  <span className="text-[10px] text-[var(--color-text-subtle)] block">
                    {res.hitRatio}% hits
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Anomaly Details or Normal Banner */}
      {detection.hasAnomaly ? (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>Counter-Intuitive Result Detected:</span>
          </div>

          <ul className="space-y-1 list-disc list-inside font-mono text-[11px] text-[var(--color-text-main)]">
            {detection.anomalyPairs.map((pair, idx) => (
              <li key={idx}>
                {pair.lowerFrames} Frames ({pair.lowerFaults} faults) ➔{' '}
                <span className="font-bold text-amber-400">
                  {pair.higherFrames} Frames ({pair.higherFaults} faults)
                </span>{' '}
                [+{pair.faultIncrease} page fault!]
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t border-amber-500/20 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
            <span className="font-semibold text-amber-300">Theoretical Cause: </span>
            FIFO is not a <em>Stack Algorithm</em>. The set of pages in memory with {detection.anomalyPairs[0]?.lowerFrames} frames is not guaranteed to be a subset of pages with {detection.anomalyPairs[0]?.higherFrames} frames. In contrast, <strong>LRU is guaranteed to never experience Belady's Anomaly</strong>.
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-subtle)] flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
          <p className="leading-relaxed">
            In this sequence, increasing the allocated physical frames consistently reduces or maintains page faults under FIFO.
          </p>
        </div>
      )}
    </div>
  );
};
