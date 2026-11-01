import React from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertOctagon, 
  Percent, 
  Calculator, 
  Clock, 
  FileText 
} from 'lucide-react';
import type { SimulationStats, TranslationStep, PagingConfig } from '../../core/paging/types';

interface PagingTelemetryProps {
  stats: SimulationStats;
  currentStep: TranslationStep | null;
  history: TranslationStep[];
  config: PagingConfig;
  onJumpToStep?: (index: number) => void;
}

export const PagingTelemetry: React.FC<PagingTelemetryProps> = ({
  stats,
  currentStep,
  history,
  config,
}) => {
  const pageSizeBytes = config.pageSizeKb * 1024;

  return (
    <div className="space-y-4">
      
      {/* 4 Telemetry Metric Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>Total Accesses</span>
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
            {stats.hits}
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>Page Faults</span>
            <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-500">
            {stats.faults}
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>Hit Ratio</span>
            <Percent className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--color-text-main)]">
            {stats.hitRatio}%
          </div>
        </div>
      </div>

      {/* Live Math Formulation Box */}
      <div className="p-4 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
          <Calculator className="w-4 h-4 text-[var(--color-accent-primary)]" />
          Live Hardware Translation Breakdown
        </div>

        {currentStep && currentStep.virtualAddress >= 0 ? (
          <div className="space-y-2 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-subtle)]">1. Page Number: </span>
              <span className="text-[var(--color-text-main)] font-semibold">
                floor({currentStep.virtualAddress} / {pageSizeBytes}) ={' '}
                <strong className="text-[var(--color-accent-primary)]">Page {currentStep.pageNumber}</strong>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-subtle)]">2. Page Offset: </span>
              <span className="text-[var(--color-text-main)] font-semibold">
                {currentStep.virtualAddress} mod {pageSizeBytes} ={' '}
                <strong className="text-[var(--color-accent-secondary)]">{currentStep.offset} bytes ({currentStep.offsetHex})</strong>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-subtle)]">3. Physical Address: </span>
              {currentStep.frameNumber !== null ? (
                <span className="text-emerald-500 font-semibold">
                  ({currentStep.frameNumber} * {pageSizeBytes}) + {currentStep.offset} ={' '}
                  <strong>{currentStep.physicalAddress} ({currentStep.physicalAddressHex})</strong>
                </span>
              ) : (
                <span className="text-amber-500 font-semibold italic">
                  Unresolved (Memory Saturated — Replacement Needed)
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-subtle)] text-center italic">
            Enter an address or step the simulation stream to calculate physical translation.
          </div>
        )}
      </div>

      {/* Step Explanation Banner */}
      {currentStep && (
        <div
          className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
            currentStep.status === 'HIT'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : currentStep.status === 'FAULT_RESOLVED'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : currentStep.status === 'FAULT_MEMORY_FULL'
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)]'
          }`}
        >
          <div className="font-bold flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Step {currentStep.stepNumber} Diagnostic:</span>
          </div>
          <p>{currentStep.explanation}</p>
        </div>
      )}

      {/* Chronological Event History */}
      <div className="p-4 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            <FileText className="w-4 h-4 text-[var(--color-accent-primary)]" />
            Translation Event Trace
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-subtle)]">
            {history.length} Event(s)
          </span>
        </div>

        {history.length > 0 ? (
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {history.slice().reverse().map((step) => (
              <div
                key={step.stepNumber}
                className="p-2 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-subtle)]">#{step.stepNumber}</span>
                  <span className="font-semibold text-[var(--color-text-main)]">{step.virtualAddressHex}</span>
                  <span className="text-[10px] text-[var(--color-text-subtle)]">→ P#{step.pageNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  {step.status === 'HIT' ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                      HIT (F#{step.frameNumber})
                    </span>
                  ) : step.status === 'FAULT_RESOLVED' ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                      FAULT (Alloc F#{step.frameNumber})
                    </span>
                  ) : step.status === 'FAULT_MEMORY_FULL' ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                      MEM FULL
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] text-gray-400">
                      INVALID
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[var(--color-text-subtle)] italic py-2">
            No translation events recorded yet.
          </div>
        )}
      </div>

    </div>
  );
};
