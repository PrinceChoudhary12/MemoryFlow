import React from 'react';
import { Table, Layers, CheckCircle2, XCircle, ShieldAlert, Cpu } from 'lucide-react';
import type { VMPageTableEntry, VMPhysicalFrame, VirtualMemoryStep } from '../../core/virtualMemory/types';
import { toHex } from '../../core/virtualMemory/eatCalculator';

interface VirtualMemoryViewsProps {
  pageTable: VMPageTableEntry[];
  physicalFrames: VMPhysicalFrame[];
  currentStep: VirtualMemoryStep | null;
  pageSizeKb: number;
}

export const VirtualMemoryViews: React.FC<VirtualMemoryViewsProps> = ({
  pageTable,
  physicalFrames,
  currentStep,
  pageSizeKb,
}) => {
  const activePage = currentStep?.pageNumber;
  const activeFrame = currentStep?.frameNumber;
  const victimPage = currentStep?.victimPage?.pageNumber;

  return (
    <div className="space-y-5">
      
      {/* 1. Extended Virtual Page Table (Valid & Dirty Bits) */}
      <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-[var(--color-accent-primary)]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
              Extended Page Table (Demand Paging Descriptor)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-subtle)]">
            {pageTable.length} Virtual Entries
          </span>
        </div>

        <div className="overflow-y-auto max-h-[220px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-[var(--color-bg-surface-elevated)] border-b border-[var(--color-border-medium)] text-[10px] uppercase text-[var(--color-text-subtle)]">
              <tr>
                <th className="py-2 px-3">Virtual Page</th>
                <th className="py-2 px-3">Valid Bit</th>
                <th className="py-2 px-3">Dirty Bit</th>
                <th className="py-2 px-3">RAM Frame</th>
                <th className="py-2 px-3">Swap Disk Slot</th>
                <th className="py-2 px-3 text-right">Accesses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {pageTable.map((entry) => {
                const isTarget = activePage === entry.pageNumber;
                const isVictim = victimPage === entry.pageNumber;

                return (
                  <tr
                    key={entry.pageNumber}
                    className={`transition-colors ${
                      isTarget
                        ? 'bg-[var(--color-accent-glow)] font-bold text-[var(--color-text-main)]'
                        : isVictim
                        ? 'bg-rose-500/15 font-bold text-[var(--color-text-main)]'
                        : 'hover:bg-[var(--color-bg-surface-elevated)]/50 text-[var(--color-text-muted)]'
                    }`}
                  >
                    <td className="py-1.5 px-3 flex items-center gap-1.5">
                      {isTarget && (
                        <span className="w-1.5 h-1.5 rounded-full animate-ping bg-[var(--color-accent-primary)]" />
                      )}
                      <span>Page #{entry.pageNumber}</span>
                    </td>
                    <td className="py-1.5 px-3">
                      {entry.isValid ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          1 (RAM)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-2.5 h-2.5" />
                          0 (Disk)
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      {entry.isDirty ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          1 (Dirty)
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-subtle)]">
                          0 (Clean)
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 font-semibold">
                      {entry.frameNumber !== null ? (
                        <span className="text-[var(--color-accent-primary)]">
                          Frame #{entry.frameNumber}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-subtle)]">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-[var(--color-text-subtle)]">
                      Block #{entry.swapBlockId}
                    </td>
                    <td className="py-1.5 px-3 text-right text-[var(--color-text-muted)]">
                      {entry.accessCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Physical RAM Frame Matrix */}
      <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--color-accent-secondary)]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
              Physical RAM Hardware Frames
            </h4>
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-subtle)]">
            {physicalFrames.filter((f) => f.isOccupied).length} / {physicalFrames.length} Frames Allocated
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {physicalFrames.map((frame) => {
            const isTarget = activeFrame === frame.frameIndex;
            const pageSizeBytes = pageSizeKb * 1024;
            const baseAddress = frame.frameIndex * pageSizeBytes;

            return (
              <div
                key={frame.frameIndex}
                className={`p-3 rounded-xl border font-mono transition-all ${
                  isTarget
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-md ring-1 ring-emerald-500/50'
                    : frame.isOccupied
                    ? 'border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)]'
                    : 'border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]/50 text-[var(--color-text-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-[var(--color-text-main)]">
                    Frame #{frame.frameIndex}
                  </span>
                  {frame.isOccupied && frame.isDirty && (
                    <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/15 px-1 rounded border border-amber-500/20">
                      Dirty
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-[var(--color-text-subtle)]">
                  {toHex(baseAddress, 4)} - {toHex(baseAddress + pageSizeBytes - 1, 4)}
                </div>

                <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[11px]">
                  {frame.isOccupied ? (
                    <>
                      <span className="text-[var(--color-accent-primary)] font-bold flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        Page #{frame.pageNumber}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-semibold">
                        In RAM
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] italic text-[var(--color-text-subtle)]">
                      Empty Frame
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
