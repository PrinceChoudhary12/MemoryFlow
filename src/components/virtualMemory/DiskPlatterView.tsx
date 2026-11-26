import React from 'react';
import { HardDrive, Disc, ArrowDownUp, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { SwapPage, VirtualMemoryStep } from '../../core/virtualMemory/types';

interface DiskPlatterViewProps {
  swapDisk: SwapPage[];
  currentStep: VirtualMemoryStep | null;
}

export const DiskPlatterView: React.FC<DiskPlatterViewProps> = ({
  swapDisk,
  currentStep,
}) => {
  const isSwapEvent = currentStep && (currentStep.status === 'FAULT_RESOLVED' || currentStep.status === 'FAULT_WITH_EVICTION');
  const activePage = currentStep?.pageNumber;
  const victimPage = currentStep?.victimPage?.pageNumber;

  const residentCount = swapDisk.filter((s) => s.isLoadedInRam).length;
  const diskOnlyCount = swapDisk.length - residentCount;

  return (
    <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col h-full">
      
      {/* Title & Stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[var(--color-accent-tertiary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            Secondary Storage Backing Store (Swap Disk)
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-emerald-400 font-semibold">{residentCount} Swapped In</span>
          <span className="text-[var(--color-text-subtle)]">•</span>
          <span className="text-[var(--color-text-muted)]">{diskOnlyCount} on Disk</span>
        </div>
      </div>

      {/* Disk Animation Banner */}
      <div className="p-3 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <Disc
              className={`w-8 h-8 text-[var(--color-accent-tertiary)] ${
                isSwapEvent ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '3s' }}
            />
            {isSwapEvent && (
              <span className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
              <span>Magnetic Swap Platter</span>
              {isSwapEvent && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  Head Active (I/O)
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">
              Secondary swap partitions holding swapped-out virtual pages.
            </p>
          </div>
        </div>

        {currentStep && currentStep.victimPage?.wasDirty && (
          <div className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span>Writeback Page #{victimPage}</span>
          </div>
        )}
      </div>

      {/* Grid of Swap Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 overflow-y-auto max-h-[220px]">
        {swapDisk.map((block) => {
          const isTarget = activePage === block.pageNumber;
          const isVictim = victimPage === block.pageNumber;

          return (
            <div
              key={block.swapBlockId}
              className={`p-2 rounded-lg border text-[11px] font-mono transition-all ${
                isTarget
                  ? 'border-emerald-500 bg-emerald-500/15 font-bold shadow-sm'
                  : isVictim
                  ? 'border-rose-500 bg-rose-500/15 font-bold'
                  : block.isLoadedInRam
                  ? 'border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)]'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]/60 text-[var(--color-text-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--color-text-main)]">
                  Block #{block.swapBlockId}
                </span>
                {block.isLoadedInRam ? (
                  <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    In RAM
                  </span>
                ) : (
                  <span className="text-[9px] text-[var(--color-text-subtle)]">
                    On Disk
                  </span>
                )}
              </div>

              <div className="text-[10px] text-[var(--color-text-muted)] mt-1 truncate">
                {block.name}
              </div>

              <div className="flex items-center justify-between mt-1 text-[9px]">
                <span className="text-[var(--color-accent-primary)] font-bold">
                  Page #{block.pageNumber}
                </span>
                {block.isDirty && (
                  <span className="flex items-center gap-0.5 text-rose-400 font-semibold">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    Dirty
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[10px] text-[var(--color-text-subtle)] font-mono border-t border-[var(--color-border-subtle)] pt-2">
        <span>Backing Store: Disk Swap Partition</span>
        <span>Lazy loading via Demand Paging</span>
      </div>
    </div>
  );
};
