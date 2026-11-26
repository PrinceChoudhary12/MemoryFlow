import React from 'react';
import { 
  Activity, 
  CheckCircle2, 
  ShieldAlert, 
  Percent, 
  Calculator, 
  Clock, 
  FileText 
} from 'lucide-react';
import type { SegmentationStats, SegmentTranslationStep } from '../../core/segmentation/types';
import { toHex } from '../../core/segmentation/segmentationTranslator';

interface SegmentationTelemetryProps {
  stats: SegmentationStats;
  currentStep: SegmentTranslationStep | null;
  history: SegmentTranslationStep[];
}

export const SegmentationTelemetry: React.FC<SegmentationTelemetryProps> = ({
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
            <span>Total Accesses</span>
            <Activity className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--color-text-main)]">
            {stats.totalAccesses}
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>Valid Translations</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-500">
            {stats.validTranslations}
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>SegFaults</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-500">
            {stats.segmentationFaults}
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] mb-1">
            <span>Success Rate</span>
            <Percent className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--color-text-main)]">
            {stats.successRate}%
          </div>
        </div>
      </div>

      {/* Live Hardware Translation Mathematics */}
      <div className="p-4 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
          <Calculator className="w-4 h-4 text-[var(--color-accent-primary)]" />
          Segmentation Protection & Translation
        </div>

        {currentStep && currentStep.segmentId >= 0 ? (
          <div className="space-y-2 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-subtle)]">1. Table Lookup: </span>
              <span className="text-[var(--color-text-main)] font-semibold">
                Segment S#{currentStep.segmentId} ({currentStep.segmentName}) →{' '}
                {currentStep.base !== null ? (
                  <>
                    Base: <strong className="text-[var(--color-accent-primary)]">{toHex(currentStep.base, 4)}</strong>, Limit: <strong className="text-[var(--color-accent-secondary)]">{currentStep.limit} B</strong>
                  </>
                ) : (
                  <strong className="text-rose-400">Not in table</strong>
                )}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-subtle)]">2. Limit Check: </span>
              {currentStep.limit !== null ? (
                currentStep.offset < currentStep.limit ? (
                  <span className="text-emerald-500 font-semibold">
                    Offset ({currentStep.offset}) &lt; Limit ({currentStep.limit}) → PASS
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold">
                    Offset ({currentStep.offset}) &ge; Limit ({currentStep.limit}) → TRAP (SegFault)
                  </span>
                )
              ) : (
                <span className="text-rose-400 font-bold">TRAP (Invalid Segment ID)</span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-subtle)]">3. Physical Address: </span>
              {currentStep.status === 'VALID_TRANSLATION' && currentStep.physicalAddress !== null && currentStep.base !== null ? (
                <span className="text-emerald-500 font-semibold">
                  Base ({currentStep.base}) + Offset ({currentStep.offset}) ={' '}
                  <strong>{currentStep.physicalAddress} ({currentStep.physicalAddressHex})</strong>
                </span>
              ) : (
                <span className="text-rose-400 font-semibold italic">
                  Aborted: CPU Memory Protection Violation Interrupt
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-subtle)] text-center italic">
            Enter a logical address &lt;s, d&gt; to evaluate segment boundary checks.
          </div>
        )}
      </div>

      {/* Step Explanation Banner */}
      {currentStep && (
        <div
          className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
            currentStep.status === 'VALID_TRANSLATION'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
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
            Segmentation Event Trace
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
                  <span className="font-semibold text-[var(--color-text-main)]">{step.rawInput}</span>
                  <span className="text-[10px] text-[var(--color-text-subtle)]">→ S#{step.segmentId}</span>
                </div>
                <div className="flex items-center gap-2">
                  {step.status === 'VALID_TRANSLATION' ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                      VALID ({step.physicalAddressHex})
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                      SEGFAULT
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
