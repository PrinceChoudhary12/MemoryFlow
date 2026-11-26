import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, ArrowDownUp, Clock, FileText } from 'lucide-react';
import type { VirtualMemoryStats, VirtualMemoryStep } from '../../core/virtualMemory/types';

interface VirtualMemoryTelemetryProps {
  stats: VirtualMemoryStats;
  currentStep: VirtualMemoryStep | null;
  history: VirtualMemoryStep[];
}

export const VirtualMemoryTelemetry: React.FC<VirtualMemoryTelemetryProps> = ({
  stats,
  currentStep,
  history,
}) => {
  return (
    <div className="space-y-4">
      
      {/* 4 Telemetry Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>Total References</span>
            <Activity className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--color-text-main)]">
            {stats.totalAccesses}
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>Page Hits</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-500">
            {stats.hits} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">({stats.hitRatio}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>Page Faults</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-500">
            {stats.pageFaults} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">({stats.pageFaultRate}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>Dirty Writebacks</span>
            <ArrowDownUp className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-500">
            {stats.dirtyWritebacks}
          </div>
        </div>
      </div>

      {/* Step Diagnostic Banner */}
      {currentStep && (
        <div
          className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
            currentStep.status === 'HIT'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : currentStep.status === 'FAULT_WITH_EVICTION'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : currentStep.status === 'FAULT_RESOLVED'
              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          <div className="font-bold flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Step #{currentStep.stepNumber} Diagnostic:
            </span>
            <span className="font-mono text-[10px]">
              {currentStep.accessType} Access
            </span>
          </div>
          <p>{currentStep.explanation}</p>
        </div>
      )}

      {/* Chronological Event History */}
      <div className="p-4 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            <FileText className="w-4 h-4 text-[var(--color-accent-primary)]" />
            Demand Paging Event Trace
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-subtle)]">
            {history.length} Event(s)
          </span>
        </div>

        {history.length > 0 ? (
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            {history.slice().reverse().map((step) => (
              <div
                key={step.stepNumber}
                className="p-2 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-subtle)]">#{step.stepNumber}</span>
                  <span className="font-semibold text-[var(--color-text-main)]">{step.rawInput}</span>
                  <span className="text-[10px] text-[var(--color-text-subtle)]">→ P#{step.pageNumber}</span>
                </div>
                <div>
                  {step.status === 'HIT' ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      HIT (Frame {step.frameNumber})
                    </span>
                  ) : step.status === 'FAULT_WITH_EVICTION' ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                      FAULT + EVICT
                    </span>
                  ) : step.status === 'FAULT_RESOLVED' ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                      FAULT RESOLVED
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                      INVALID
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[var(--color-text-subtle)] italic py-2">
            No demand paging events recorded yet.
          </div>
        )}
      </div>

    </div>
  );
};
