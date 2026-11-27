import React from 'react';
import { Award, BarChart3 } from 'lucide-react';
import type { StrategyState } from '../../core/allocation/types';

interface AllocationComparisonBoardProps {
  firstFit: StrategyState;
  bestFit: StrategyState;
  worstFit: StrategyState;
}

export const AllocationComparisonBoard: React.FC<AllocationComparisonBoardProps> = ({
  firstFit,
  bestFit,
  worstFit,
}) => {
  const strategies = [
    { label: 'First-Fit', accent: 'text-blue-400', border: 'border-blue-500/25', state: firstFit },
    { label: 'Best-Fit', accent: 'text-emerald-400', border: 'border-emerald-500/25', state: bestFit },
    { label: 'Worst-Fit', accent: 'text-purple-400', border: 'border-purple-500/25', state: worstFit },
  ];

  const hasExecutedOps = strategies.some(
    (s) => s.state.successfulAllocations > 0 || s.state.failedAllocations > 0
  );

  // Determine leader by most successful allocations, tie-break by lowest external fragmentation
  const sorted = [...strategies].sort((a, b) => {
    if (b.state.successfulAllocations !== a.state.successfulAllocations) {
      return b.state.successfulAllocations - a.state.successfulAllocations;
    }
    return a.state.metrics.externalFragmentationKb - b.state.metrics.externalFragmentationKb;
  });
  const top = sorted[0];
  const leaders = sorted.filter(
    (s) =>
      s.state.successfulAllocations === top.state.successfulAllocations &&
      s.state.metrics.externalFragmentationKb === top.state.metrics.externalFragmentationKb
  );

  let leaderText = 'Ready';
  let leaderClass = 'text-[var(--color-text-muted)]';
  if (hasExecutedOps) {
    if (leaders.length === 1) {
      leaderText = top.label;
      leaderClass = top.accent;
    } else if (leaders.length === 2) {
      leaderText = `${leaders[0].label} & ${leaders[1].label}`;
      leaderClass = 'text-amber-400';
    } else {
      leaderText = '3-Way Tie';
      leaderClass = 'text-amber-400';
    }
  }

  return (
    <div className="rounded-2xl glass-panel p-5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] flex items-center justify-center border border-[var(--color-accent-primary)]/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">
              Three-Way Strategy Benchmark
            </h3>
            <p className="text-[11px] text-[var(--color-text-subtle)]">
              Utilization = Allocated / User Pool ({firstFit.metrics.userPoolKb} KB)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-[var(--color-bg-surface-elevated)] border-[var(--color-border-medium)]">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[var(--color-text-muted)]">Leader: </span>
          <span className={`font-mono ${leaderClass}`}>
            {leaderText}
          </span>
        </div>
      </div>

      {/* 3-Column Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {strategies.map(({ label, accent, border, state }) => {
          const m = state.metrics;
          return (
            <div
              key={label}
              className={`p-4 rounded-xl border ${border} bg-[var(--color-bg-surface-elevated)] space-y-3`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wide ${accent}`}>
                  {label}
                </span>
                <span className="font-mono text-xs font-bold text-[var(--color-text-main)]">
                  {m.utilizationPercent}% Util
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                  <span className="text-[10px] text-[var(--color-text-subtle)] block">Allocated</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {state.successfulAllocations}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                  <span className="text-[10px] text-[var(--color-text-subtle)] block">Failed</span>
                  <span className="text-sm font-bold text-rose-400">
                    {state.failedAllocations}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] font-mono pt-1 border-t border-[var(--color-border-subtle)]">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-subtle)]">Total Free:</span>
                  <span className="text-[var(--color-text-main)]">{m.totalFreeKb} KB ({m.freeHoleCount} holes)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-subtle)]">Largest Hole:</span>
                  <span className="text-[var(--color-text-main)]">{m.largestHoleKb} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-subtle)]">External Frag:</span>
                  <span className="text-amber-400 font-semibold">
                    {m.externalFragmentationKb} KB ({m.externalFragmentationPercent}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-subtle)]">Internal Frag:</span>
                  <span className="text-[var(--color-text-main)]">{m.internalFragmentationKb} KB</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
