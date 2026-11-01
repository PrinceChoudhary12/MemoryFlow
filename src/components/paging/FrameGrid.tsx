import React from 'react';
import { Server } from 'lucide-react';
import type { PhysicalFrame, TranslationStep } from '../../core/paging/types';

interface FrameGridProps {
  physicalFrames: PhysicalFrame[];
  currentStep: TranslationStep | null;
  pageSizeKb: number;
}

export const FrameGrid: React.FC<FrameGridProps> = ({
  physicalFrames,
  currentStep,
  pageSizeKb,
}) => {
  const occupiedCount = physicalFrames.filter((f) => f.isOccupied).length;
  const freeCount = physicalFrames.length - occupiedCount;

  return (
    <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col h-full">
      
      {/* Title & Free/Occupied Gauge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[var(--color-accent-secondary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            Physical RAM Frame Matrix
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-emerald-500 font-semibold">{occupiedCount} In-Use</span>
          <span className="text-[var(--color-text-subtle)]">•</span>
          <span className="text-[var(--color-text-muted)]">{freeCount} Free</span>
        </div>
      </div>

      {/* Frame Cells Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
        {physicalFrames.map((frame) => {
          const isActive = currentStep && currentStep.frameNumber === frame.frameIndex;
          const isHit = isActive && currentStep.status === 'HIT';
          const isFault = isActive && currentStep.status === 'FAULT_RESOLVED';

          const frameBaseAddress = frame.frameIndex * pageSizeKb * 1024;
          const baseHex = '0x' + frameBaseAddress.toString(16).toUpperCase().padStart(4, '0');

          return (
            <div
              key={frame.frameIndex}
              className={`relative p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isActive
                  ? isHit
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                    : isFault
                    ? 'border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-500/20 scale-[1.02]'
                    : 'border-[var(--color-accent-primary)] bg-[var(--color-accent-glow)]'
                  : frame.isOccupied
                  ? 'border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] hover:border-[var(--color-border-accent)]'
                  : 'border-dashed border-[var(--color-border-medium)] bg-[var(--color-bg-base)]/50 opacity-70'
              }`}
            >
              {/* Top Frame Tag */}
              <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                <span className="font-bold text-[var(--color-text-main)]">
                  F#{frame.frameIndex.toString().padStart(2, '0')}
                </span>
                <span className="text-[var(--color-text-subtle)] text-[9px]">
                  {baseHex}
                </span>
              </div>

              {/* Center Content */}
              <div className="py-2 text-center">
                {frame.isOccupied ? (
                  <div>
                    <div className="text-sm font-bold text-[var(--color-accent-primary)]">
                      Page {frame.pageNumber}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">
                      Allocated Slot
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-[var(--color-text-subtle)] italic">
                    Free Frame
                  </div>
                )}
              </div>

              {/* Bottom State Bar */}
              <div className="pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[9px] font-mono">
                {frame.isOccupied ? (
                  <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Resident
                  </span>
                ) : (
                  <span className="text-[var(--color-text-subtle)]">Available</span>
                )}
                {isActive && (
                  <span className="text-[var(--color-accent-primary)] font-bold uppercase animate-pulse">
                    Active Read
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--color-text-subtle)] font-mono border-t border-[var(--color-border-subtle)] pt-2">
        <span>Frame Size: {pageSizeKb} KB ({pageSizeKb * 1024} B)</span>
        <span>Hardware RAM Slots: {physicalFrames.length}</span>
      </div>
    </div>
  );
};
