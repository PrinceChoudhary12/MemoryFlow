import React from 'react';
import { Table, CheckCircle2, XCircle } from 'lucide-react';
import type { PageTableEntry, TranslationStep } from '../../core/paging/types';

interface PageTableViewProps {
  pageTable: PageTableEntry[];
  currentStep: TranslationStep | null;
}

export const PageTableView: React.FC<PageTableViewProps> = ({
  pageTable,
  currentStep,
}) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[var(--color-accent-primary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            Operating System Page Table
          </h4>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-text-subtle)]">
          {pageTable.length} Virtual Entries
        </span>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-y-auto max-h-[360px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-[var(--color-bg-surface-elevated)] border-b border-[var(--color-border-medium)] text-[10px] uppercase text-[var(--color-text-subtle)]">
            <tr>
              <th className="py-2 px-3">Page #</th>
              <th className="py-2 px-3">Frame #</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3 text-right">Hits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {pageTable.map((entry) => {
              const isTarget = currentStep && currentStep.pageNumber === entry.pageNumber;
              const isHit = isTarget && currentStep.status === 'HIT';
              const isFault = isTarget && (currentStep.status === 'FAULT_RESOLVED' || currentStep.status === 'FAULT_MEMORY_FULL');

              return (
                <tr
                  key={entry.pageNumber}
                  className={`transition-colors ${
                    isTarget
                      ? isHit
                        ? 'bg-[var(--color-accent-glow)] font-bold text-[var(--color-text-main)]'
                        : isFault
                        ? 'bg-amber-500/15 font-bold text-[var(--color-text-main)]'
                        : 'bg-[var(--color-bg-surface-elevated)]'
                      : 'hover:bg-[var(--color-bg-surface-elevated)]/50 text-[var(--color-text-muted)]'
                  }`}
                >
                  <td className="py-1.5 px-3 flex items-center gap-1.5">
                    {isTarget && (
                      <span className="w-1.5 h-1.5 rounded-full animate-ping bg-[var(--color-accent-primary)]" />
                    )}
                    <span>P#{entry.pageNumber.toString().padStart(2, '0')}</span>
                  </td>
                  <td className="py-1.5 px-3">
                    {entry.frameNumber !== null ? (
                      <span className="font-semibold text-[var(--color-accent-primary)]">
                        Frame {entry.frameNumber}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-subtle)] opacity-60">— (On Disk)</span>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    {entry.isValid ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        <XCircle className="w-2.5 h-2.5" />
                        Invalid
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-right text-[var(--color-text-subtle)]">
                    {entry.accessCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] font-mono">
        <span>Green: Resident in RAM</span>
        <span>Red: Disk Backing</span>
      </div>
    </div>
  );
};
