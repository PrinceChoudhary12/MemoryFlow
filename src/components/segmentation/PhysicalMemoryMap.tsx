import React from 'react';
import { Server, MapPin } from 'lucide-react';
import type { PhysicalMemoryBlock, SegmentTranslationStep } from '../../core/segmentation/types';
import { toHex } from '../../core/segmentation/segmentationTranslator';

interface PhysicalMemoryMapProps {
  memoryBlocks: PhysicalMemoryBlock[];
  currentStep: SegmentTranslationStep | null;
  ramSizeKb: number;
}

export const PhysicalMemoryMap: React.FC<PhysicalMemoryMapProps> = ({
  memoryBlocks,
  currentStep,
  ramSizeKb,
}) => {
  const ramSizeBytes = ramSizeKb * 1024;
  const allocatedBytes = memoryBlocks
    .filter((b) => b.isAllocated)
    .reduce((sum, b) => sum + b.size, 0);
  const freeBytes = ramSizeBytes - allocatedBytes;
  const utilization = ((allocatedBytes / ramSizeBytes) * 100).toFixed(1);

  // Fragmentation metrics
  const freeHoles = memoryBlocks.filter((b) => !b.isAllocated);
  const totalHoles = freeHoles.length;
  const largestHole = freeHoles.length > 0 ? Math.max(...freeHoles.map((b) => b.size)) : 0;

  // Target physical address pointer
  const activePhysAddress =
    currentStep && currentStep.status === 'VALID_TRANSLATION' && currentStep.physicalAddress !== null
      ? currentStep.physicalAddress
      : null;

  return (
    <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col h-full">
      
      {/* Title & Metrics */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[var(--color-accent-tertiary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            Physical RAM Continuous Allocation Map
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-[var(--color-accent-primary)] font-semibold">
            {allocatedBytes} B Used ({utilization}%)
          </span>
          <span className="text-[var(--color-text-subtle)]">•</span>
          <span className="text-[var(--color-text-muted)]">{freeBytes} B Free</span>
        </div>
      </div>

      {/* Graphical Memory Bar */}
      <div className="relative my-3">
        {/* Memory Bar */}
        <div
          role="img"
          aria-label={`Physical memory map with ${memoryBlocks.length} blocks across ${ramSizeKb} KB RAM`}
          className="h-12 w-full rounded-xl flex border border-[var(--color-border-medium)] bg-[var(--color-bg-base)]"
        >
          {memoryBlocks.map((block, idx) => {
            const widthPct = (block.size / ramSizeBytes) * 100;
            const isTargetBlock =
              activePhysAddress !== null &&
              activePhysAddress >= block.startAddress &&
              activePhysAddress <= block.endAddress;

            return (
              <div
                key={idx}
                style={{
                  flex: `0 0 ${widthPct}%`,
                  minWidth: 0,
                  borderTop: block.isAllocated ? `3px solid ${block.color || 'var(--color-accent-primary)'}` : undefined,
                }}
                className={`relative h-full flex flex-col justify-center items-center text-[10px] font-mono transition-all border-r border-black/20 ${
                  block.isAllocated
                    ? isTargetBlock
                      ? 'bg-emerald-500/80 text-white font-bold animate-pulse'
                      : 'bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)]'
                    : 'bg-[var(--color-bg-base)] text-[var(--color-text-subtle)] opacity-40 hover:opacity-75'
                }`}
                title={
                  block.isAllocated
                    ? `${block.segmentName}: ${toHex(block.startAddress, 4)} - ${toHex(block.endAddress, 4)} (${block.size} B)`
                    : `Free Hole: ${toHex(block.startAddress, 4)} - ${toHex(block.endAddress, 4)} (${block.size} B)`
                }
              >
                {widthPct > 8 && (
                  <span className="truncate px-1 font-semibold">
                    {block.isAllocated ? block.segmentName?.split(' ')[0] : 'Hole'}
                  </span>
                )}
                {widthPct > 12 && (
                  <span className="text-[9px] text-[var(--color-text-subtle)]">
                    {block.size} B
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Physical Address Pin Marker */}
        {activePhysAddress !== null && (
          <div
            className="absolute -top-3.5 transform -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-300 pointer-events-none"
            style={{ left: `${Math.min(99, Math.max(1, (activePhysAddress / ramSizeBytes) * 100))}%` }}
          >
            <MapPin className="w-4 h-4 text-emerald-400 animate-bounce" />
            <div className="px-1.5 py-0.5 rounded bg-black/90 text-emerald-400 text-[9px] font-mono font-bold shadow">
              {toHex(activePhysAddress, 4)}
            </div>
          </div>
        )}
      </div>

      {/* External Fragmentation Analysis Metric */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[10px] font-mono mb-2">
        <span className="text-[var(--color-text-muted)]">
          External Fragmentation: <strong className="text-[var(--color-accent-warning)]">{totalHoles} Free Hole(s)</strong>
        </span>
        <span className="text-[var(--color-text-subtle)]">
          Largest Block: <strong className="text-[var(--color-text-main)]">{largestHole} B</strong>
        </span>
      </div>

      {/* Memory Blocks Inspector List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--color-border-subtle)] text-[10px] font-mono">
        {memoryBlocks.map((b, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg border ${
              b.isAllocated
                ? 'border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)]'
                : 'border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]/40 text-[var(--color-text-subtle)]'
            }`}
            aria-label={`${b.isAllocated ? b.segmentName : 'Free memory hole'}: ${b.size} bytes, addresses ${toHex(b.startAddress, 4)} through ${toHex(b.endAddress, 4)}`}
          >
            <div className="font-semibold truncate">
              {b.isAllocated ? b.segmentName : 'Free Memory Hole'}
            </div>
            <div className="text-[9px] text-[var(--color-text-subtle)] mt-0.5">
              {toHex(b.startAddress, 4)} - {toHex(b.endAddress, 4)}
            </div>
            <div className="text-[9px] text-[var(--color-accent-primary)] font-bold mt-0.5">
              {b.size} Bytes
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--color-text-subtle)] font-mono border-t border-[var(--color-border-subtle)] pt-2">
        <span>RAM Range: 0x0000 to {toHex(ramSizeBytes - 1, 4)}</span>
        <span>Visualizes Variable Size Partitions & External Holes</span>
      </div>
    </div>
  );
};
