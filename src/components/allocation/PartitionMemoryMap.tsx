import React from 'react';
import { Server, CheckCircle2, XCircle, Combine } from 'lucide-react';
import type {
  AllocationStepResult,
  StrategyState,
} from '../../core/allocation/types';

interface PartitionMemoryMapProps {
  firstFit: StrategyState;
  bestFit: StrategyState;
  worstFit: StrategyState;
  currentSteps?: {
    firstFit: AllocationStepResult | null;
    bestFit: AllocationStepResult | null;
    worstFit: AllocationStepResult | null;
  };
  onDeallocateProcess?: (processId: string) => void;
}

const STRATEGY_META = [
  {
    key: 'firstFit' as const,
    title: 'First-Fit',
    subtitle: 'First hole ≥ requested size (lowest address)',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    key: 'bestFit' as const,
    title: 'Best-Fit',
    subtitle: 'Smallest hole ≥ requested size (minimizes leftover)',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    key: 'worstFit' as const,
    title: 'Worst-Fit',
    subtitle: 'Largest hole ≥ requested size (maximizes leftover)',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
];

export const PartitionMemoryMap: React.FC<PartitionMemoryMapProps> = ({
  firstFit,
  bestFit,
  worstFit,
  currentSteps,
  onDeallocateProcess,
}) => {
  const stateMap = { firstFit, bestFit, worstFit };

  return (
    <div className="rounded-2xl glass-panel p-5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)] flex items-center justify-center border border-[var(--color-accent-danger)]/20">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">
              Physical Memory Partition Maps (Three-Way Live Comparison)
            </h3>
            <p className="text-[11px] text-[var(--color-text-subtle)]">
              Proportional contiguous address space • Click any allocated block to free it
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-subtle)]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-400" />
            Allocated Process
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[var(--color-bg-base)] border border-dashed border-[var(--color-border-medium)]" />
            Free Hole
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-500/30 border border-slate-400/40" />
            Reserved / OS
          </span>
        </div>
      </div>

      {/* Strategy Rows */}
      <div className="space-y-4">
        {STRATEGY_META.map(({ key, title, subtitle, badgeClass }) => {
          const st = stateMap[key];
          const step = currentSteps?.[key] ?? null;
          const totalKb = Math.max(st.metrics.totalMemoryKb, 1);

          return (
            <div
              key={key}
              className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-elevated)] space-y-2.5"
            >
              {/* Row Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${badgeClass}`}
                  >
                    {title}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-subtle)] hidden sm:inline">
                    {subtitle}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-[var(--color-text-muted)]">
                    Util: <strong className="text-[var(--color-text-main)]">{st.metrics.utilizationPercent}%</strong>
                  </span>
                  <span className="text-[var(--color-text-subtle)]">•</span>
                  <span className="text-[var(--color-text-muted)]">
                    Holes: <strong className="text-[var(--color-text-main)]">{st.metrics.freeHoleCount}</strong>
                  </span>

                  {step && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        step.success
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {step.success ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {step.success
                        ? step.coalescedCount > 0
                          ? `Coalesced (${step.coalescedCount})`
                          : step.splitOccurred
                          ? 'Split & Fit'
                          : 'Exact / Fit'
                        : step.failureReason}
                    </span>
                  )}
                </div>
              </div>

              {/* Memory Bar */}
              <div className="h-14 w-full rounded-xl overflow-hidden flex border border-[var(--color-border-medium)] bg-[var(--color-bg-base)]">
                {st.partitions.map((part) => {
                  const pct = (part.size / totalKb) * 100;
                  const isNewlyAllocated =
                    step?.success &&
                    step.operation.type === 'ALLOCATE' &&
                    part.status === 'ALLOCATED' &&
                    part.processId === step.operation.processId;

                  const isCoalescedHighlight =
                    step?.success &&
                    step.operation.type === 'DEALLOCATE' &&
                    step.coalescedCount > 0 &&
                    part.status === 'FREE' &&
                    step.allocatedStartAddress !== null &&
                    part.startAddress <= step.allocatedStartAddress &&
                    part.startAddress + part.size > step.allocatedStartAddress;

                  if (part.status === 'RESERVED') {
                    return (
                      <div
                        key={part.id}
                        style={{ width: `${Math.max(pct, 1.2)}%` }}
                        className="h-full bg-slate-500/20 border-r border-[var(--color-border-subtle)] flex flex-col items-center justify-center text-[9px] font-mono text-[var(--color-text-subtle)] select-none"
                        title={`Reserved (${part.label ?? 'OS'}): ${part.startAddress}–${part.startAddress + part.size} KB (${part.size} KB)`}
                      >
                        {pct >= 4 ? `${part.size}K` : ''}
                      </div>
                    );
                  }

                  if (part.status === 'ALLOCATED') {
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => part.processId && onDeallocateProcess?.(part.processId)}
                        style={{
                          width: `${Math.max(pct, 2.5)}%`,
                          borderTop: `3px solid ${part.color ?? 'var(--color-accent-primary)'}`,
                          backgroundColor: isNewlyAllocated
                            ? `${part.color ?? '#10b981'}35`
                            : `${part.color ?? '#06b6d4'}18`,
                        }}
                        className={`h-full border-r border-black/20 flex flex-col items-center justify-center px-1 text-[10px] font-mono transition-all duration-300 hover:brightness-110 cursor-pointer ${
                          isNewlyAllocated ? 'ring-2 ring-inset ring-emerald-400' : ''
                        }`}
                        title={`${part.processId}: ${part.size} KB allocated (req: ${part.requestedSize} KB) @ ${part.startAddress}–${part.startAddress + part.size} KB. Click to free.`}
                      >
                        <span className="font-bold text-[var(--color-text-main)] truncate max-w-full">
                          {part.processId}
                        </span>
                        <span className="text-[9px] text-[var(--color-text-muted)] truncate max-w-full">
                          {part.size}K
                        </span>
                      </button>
                    );
                  }

                  // FREE hole
                  return (
                    <div
                      key={part.id}
                      style={{ width: `${Math.max(pct, 2.5)}%` }}
                      className={`h-full border-r border-dashed border-[var(--color-border-medium)] flex flex-col items-center justify-center px-1 text-[10px] font-mono transition-all duration-300 ${
                        isCoalescedHighlight
                          ? 'bg-amber-500/15 text-amber-500 ring-1 ring-inset ring-amber-400/60'
                          : 'bg-[var(--color-bg-base)] text-[var(--color-text-subtle)]'
                      }`}
                      title={`Free Hole: ${part.size} KB @ ${part.startAddress}–${part.startAddress + part.size} KB`}
                    >
                      <span className="flex items-center gap-0.5 truncate max-w-full">
                        {isCoalescedHighlight && <Combine className="w-2.5 h-2.5 shrink-0" />}
                        {part.size}K
                      </span>
                      {pct >= 6 && (
                        <span className="text-[9px] opacity-70 truncate">Free</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
