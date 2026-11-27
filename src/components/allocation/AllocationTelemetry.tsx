import React from 'react';
import { Activity, Info, Zap } from 'lucide-react';
import type {
  AllocationOperation,
  TripleStrategyStep,
} from '../../core/allocation/types';

interface AllocationTelemetryProps {
  operations: AllocationOperation[];
  currentStepIndex: number;
  history: TripleStrategyStep[];
  onSelectStep: (index: number) => void;
}

export const AllocationTelemetry: React.FC<AllocationTelemetryProps> = ({
  operations,
  currentStepIndex,
  history,
  onSelectStep,
}) => {
  const currentStep =
    currentStepIndex >= 0 && currentStepIndex < history.length
      ? history[currentStepIndex]
      : null;

  return (
    <div className="rounded-2xl glass-panel p-5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-4">
      {/* Operation Queue Ribbon */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--color-accent-danger)]" />
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">
              Operation Queue & Step Diagnostic Log
            </h3>
          </div>
          <span className="text-[11px] text-[var(--color-text-subtle)]">
            Click any operation to jump
          </span>
        </div>

        <div className="overflow-x-auto pb-1 scrollbar-thin" role="region" aria-label="Allocation operation queue" tabIndex={0}>
          <div className="flex items-center gap-2 min-w-max">
            {operations.map((op, idx) => {
              const isCurrent = idx === currentStepIndex;
              const stepRecord = history[idx];
              const isAlloc = op.type === 'ALLOCATE';

              return (
                <button
                  key={idx}
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Operation ${idx + 1}: ${isAlloc ? `allocate ${op.processId}, ${op.size} KB` : `deallocate ${op.processId}`}`}
                  onClick={() => onSelectStep(idx)}
                  className={`px-3 py-1.5 rounded-xl border text-left font-mono text-xs transition-all ${
                    isCurrent
                      ? 'bg-[var(--color-accent-danger)] text-[var(--color-accent-contrast)] border-[var(--color-accent-danger)] shadow-md font-bold'
                      : stepRecord
                      ? 'bg-[var(--color-bg-surface-elevated)] border-[var(--color-border-medium)] text-[var(--color-text-main)]'
                      : 'bg-[var(--color-bg-muted)] border-dashed border-[var(--color-border-subtle)] text-[var(--color-text-subtle)] opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] opacity-75">
                    <span>#{idx + 1}</span>
                    {stepRecord && (
                      <span className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            stepRecord.firstFit.success ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                          title={`First-Fit: ${stepRecord.firstFit.success ? 'OK' : stepRecord.firstFit.failureReason}`}
                        />
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            stepRecord.bestFit.success ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                          title={`Best-Fit: ${stepRecord.bestFit.success ? 'OK' : stepRecord.bestFit.failureReason}`}
                        />
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            stepRecord.worstFit.success ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                          title={`Worst-Fit: ${stepRecord.worstFit.success ? 'OK' : stepRecord.worstFit.failureReason}`}
                        />
                      </span>
                    )}
                  </div>
                  <div>
                    {isAlloc ? `+ ${op.processId} (${op.size}K)` : `− Free ${op.processId}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Step Explanations */}
      {currentStep ? (
        <div className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[var(--color-text-main)] font-semibold">
            <Info className="w-3.5 h-3.5 text-[var(--color-accent-danger)]" />
            <span>
              Step #{currentStep.stepIndex + 1} Decision Log (
              {currentStep.operation.type === 'ALLOCATE'
                ? `Allocate ${currentStep.operation.processId}: ${currentStep.operation.size} KB`
                : `Deallocate ${currentStep.operation.processId}`}
              ):
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              <span className="text-blue-400 font-bold block mb-1">First-Fit:</span>
              <span className="text-[var(--color-text-muted)]">{currentStep.firstFit.explanation}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              <span className="text-emerald-400 font-bold block mb-1">Best-Fit:</span>
              <span className="text-[var(--color-text-muted)]">{currentStep.bestFit.explanation}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              <span className="text-purple-400 font-bold block mb-1">Worst-Fit:</span>
              <span className="text-[var(--color-text-muted)]">{currentStep.worstFit.explanation}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-subtle)] flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--color-accent-danger)] shrink-0" />
          <span>
            Press <strong>Step Forward</strong> or <strong>Auto Play</strong> to execute the memory workload across First-Fit, Best-Fit, and Worst-Fit.
          </span>
        </div>
      )}
    </div>
  );
};
