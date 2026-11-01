import React from 'react';
import { ArrowDown, Split } from 'lucide-react';
import { toBinary, toHex } from '../../core/paging/addressTranslator';
import type { TranslationStep } from '../../core/paging/types';

interface BitSplitterProps {
  currentStep: TranslationStep | null;
  offsetBits: number;
  pageBits: number;
}

export const BitSplitter: React.FC<BitSplitterProps> = ({
  currentStep,
  offsetBits,
  pageBits,
}) => {
  const totalBits = pageBits + offsetBits;
  const virtualAddress = currentStep && currentStep.virtualAddress >= 0 ? currentStep.virtualAddress : 0;
  const binaryString = toBinary(virtualAddress, totalBits);

  const pageBinary = binaryString.slice(0, pageBits);
  const offsetBinary = binaryString.slice(pageBits);

  return (
    <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Split className="w-4 h-4 text-[var(--color-accent-primary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            Hardware Bit-Level Address Splitter
          </h4>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-text-subtle)]">
          {totalBits}-bit Architecture ({pageBits}p + {offsetBits}d)
        </span>
      </div>

      {/* Bit Container */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2 font-mono">
        
        {/* Page Number Field (High Bits) */}
        <div className="flex-1 p-3 rounded-lg border-2 border-[var(--color-accent-primary)] bg-[var(--color-bg-surface-elevated)] text-center relative overflow-hidden">
          <div className="text-[10px] text-[var(--color-accent-primary)] font-bold uppercase tracking-wider mb-1">
            Virtual Page Number (p) • {pageBits} Bits
          </div>
          <div className="text-xl font-bold text-[var(--color-text-main)]">
            {currentStep && currentStep.pageNumber >= 0 ? `Page ${currentStep.pageNumber}` : '—'}
          </div>
          <div className="text-xs text-[var(--color-text-subtle)] mt-1 tracking-widest">
            {pageBinary}
          </div>
          <div className="text-[10px] font-mono text-[var(--color-accent-primary)] mt-0.5">
            {currentStep && currentStep.pageNumber >= 0 ? toHex(currentStep.pageNumber, 2) : '0x0'}
          </div>
        </div>

        {/* Divider icon */}
        <div className="flex items-center justify-center text-[var(--color-text-subtle)] px-1">
          <ArrowDown className="w-4 h-4 sm:-rotate-90 text-[var(--color-border-accent)]" />
        </div>

        {/* Offset Field (Low Bits) */}
        <div className="flex-[2] p-3 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-center relative">
          <div className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-1">
            Page Offset (d) • {offsetBits} Bits
          </div>
          <div className="text-xl font-bold text-[var(--color-text-main)]">
            {currentStep && currentStep.offset >= 0 ? `+${currentStep.offset} bytes` : '—'}
          </div>
          <div className="text-xs text-[var(--color-text-subtle)] mt-1 tracking-widest break-all">
            {offsetBinary}
          </div>
          <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5">
            {currentStep && currentStep.offset >= 0 ? currentStep.offsetHex : '0x000'}
          </div>
        </div>

      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--color-text-muted)] font-mono border-t border-[var(--color-border-subtle)] pt-2">
        <span>Raw Address: {currentStep ? currentStep.rawInput : 'Waiting for input'}</span>
        <span className="font-semibold text-[var(--color-text-main)]">
          Hex: {currentStep && currentStep.virtualAddressHex ? currentStep.virtualAddressHex : '0x0000'}
        </span>
      </div>
    </div>
  );
};
