import React from 'react';
import { Cpu, Search, AlertTriangle, HardDrive, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import type { VirtualMemoryStep, InterruptCyclePhaseName } from '../../core/virtualMemory/types';

interface InterruptCycleStepperProps {
  currentStep: VirtualMemoryStep | null;
}

const getPhaseIcon = (name: InterruptCyclePhaseName) => {
  switch (name) {
    case 'CPU_REFERENCE':
      return Cpu;
    case 'TLB_MMU_LOOKUP':
      return Search;
    case 'OS_TRAP_INTERRUPT':
      return AlertTriangle;
    case 'DISK_READ_SWAP':
    case 'DIRTY_WRITEBACK':
      return HardDrive;
    case 'FRAME_ALLOCATION':
    case 'TABLE_UPDATE':
      return ArrowRight;
    case 'INSTRUCTION_RESTART':
    default:
      return RotateCcw;
  }
};

export const InterruptCycleStepper: React.FC<InterruptCycleStepperProps> = ({ currentStep }) => {
  const isHit = currentStep?.status === 'HIT';
  const isFault = currentStep && (currentStep.status === 'FAULT_RESOLVED' || currentStep.status === 'FAULT_WITH_EVICTION');
  const phases = currentStep?.phases || [];

  return (
    <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col h-full">
      
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[var(--color-accent-primary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            Page Fault Interrupt Execution Cycle
          </h4>
        </div>
        {currentStep && (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
              isHit
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : isFault
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
            }`}
          >
            {isHit ? 'Fast TLB Hit' : isFault ? 'OS Trap Handled' : 'Idle'}
          </span>
        )}
      </div>

      {/* Execution Cycle Timeline */}
      {phases.length > 0 ? (
        <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
          {phases.map((phase) => {
            const Icon = getPhaseIcon(phase.name);
            return (
              <div
                key={phase.phase}
                className="p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] text-xs font-mono transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-[var(--color-text-main)]">
                      {phase.title}
                    </span>
                  </div>
                  <span className="text-[10px] flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Complete
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] pl-7 leading-relaxed">
                  {phase.description}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--color-text-subtle)] border border-dashed border-[var(--color-border-subtle)] rounded-lg">
          <Cpu className="w-8 h-8 text-[var(--color-border-medium)] mb-2 animate-pulse" />
          <p>Awaiting memory reference to trigger hardware interrupt cycle.</p>
          <span className="text-[10px] text-[var(--color-text-subtle)] mt-1 font-mono">
            Execute a step or reference stream to trace MMU trap execution.
          </span>
        </div>
      )}

      {currentStep && (
        <div className="mt-3 pt-2.5 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[11px] font-mono">
          <span className="text-[var(--color-text-subtle)]">Latency:</span>
          <span className="font-bold text-[var(--color-accent-primary)]">
            {currentStep.stepLatencyNs.toLocaleString()} ns
          </span>
        </div>
      )}
    </div>
  );
};
