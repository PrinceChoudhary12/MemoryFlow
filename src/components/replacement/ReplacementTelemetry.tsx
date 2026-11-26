import React from 'react';
import { Award, Zap, Activity, Info } from 'lucide-react';
import type { DualAlgorithmStep, ReplacementStats } from '../../core/replacement/types';

interface ReplacementTelemetryProps {
  stats: ReplacementStats;
  currentStep: DualAlgorithmStep | null;
}

export const ReplacementTelemetry: React.FC<ReplacementTelemetryProps> = ({
  stats,
  currentStep,
}) => {
  return (
    <div className="rounded-2xl glass-panel p-5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] flex items-center justify-center border border-[var(--color-accent-primary)]/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">
              Algorithmic Benchmark Telemetry
            </h3>
            <p className="text-[11px] text-[var(--color-text-subtle)]">
              Real-time hits, faults, and efficiency delta
            </p>
          </div>
        </div>

        {/* Winner Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-[var(--color-bg-surface-elevated)] border-[var(--color-border-medium)]">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[var(--color-text-muted)]">Leader: </span>
          <span
            className={`font-mono ${
              stats.winner === 'LRU'
                ? 'text-purple-400'
                : stats.winner === 'FIFO'
                ? 'text-blue-400'
                : 'text-emerald-400'
            }`}
          >
            {stats.winner === 'TIE' ? 'Even Tie' : `${stats.winner} (+${Math.abs(stats.faultDelta)} faults)`}
          </span>
        </div>
      </div>

      {/* Dual Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FIFO Telemetry Card */}
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
              FIFO Performance
            </span>
            <span className="text-xs font-mono text-[var(--color-text-subtle)]">
              {stats.totalAccesses} Accesses
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              <span className="text-[10px] text-[var(--color-text-subtle)] block">Hits</span>
              <span className="font-mono text-lg font-bold text-emerald-400">
                {stats.fifo.hits}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-subtle)] block">
                {stats.fifo.hitRatio}%
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              <span className="text-[10px] text-[var(--color-text-subtle)] block">Faults</span>
              <span className="font-mono text-lg font-bold text-rose-400">
                {stats.fifo.faults}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-subtle)] block">
                {stats.fifo.faultRatio}%
              </span>
            </div>
          </div>
        </div>

        {/* LRU Telemetry Card */}
        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">
              LRU Performance
            </span>
            <span className="text-xs font-mono text-[var(--color-text-subtle)]">
              {stats.totalAccesses} Accesses
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              <span className="text-[10px] text-[var(--color-text-subtle)] block">Hits</span>
              <span className="font-mono text-lg font-bold text-emerald-400">
                {stats.lru.hits}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-subtle)] block">
                {stats.lru.hitRatio}%
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              <span className="text-[10px] text-[var(--color-text-subtle)] block">Faults</span>
              <span className="font-mono text-lg font-bold text-rose-400">
                {stats.lru.faults}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-subtle)] block">
                {stats.lru.faultRatio}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Step Explanation & Diagnostics */}
      {currentStep ? (
        <div className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[var(--color-text-main)] font-semibold">
            <Info className="w-3.5 h-3.5 text-[var(--color-accent-warning)]" />
            <span>Step #{currentStep.stepIndex + 1} Decision Log (Page {currentStep.pageNumber}):</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              <span className="text-blue-400 font-bold block mb-0.5">FIFO:</span>
              <span className="text-[var(--color-text-muted)]">{currentStep.fifo.explanation}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              <span className="text-purple-400 font-bold block mb-0.5">LRU:</span>
              <span className="text-[var(--color-text-muted)]">{currentStep.lru.explanation}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-subtle)] flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--color-accent-warning)] shrink-0" />
          <span>Press <strong>Step Forward</strong> or <strong>Auto Play</strong> to begin live frame replacement benchmarking.</span>
        </div>
      )}
    </div>
  );
};
