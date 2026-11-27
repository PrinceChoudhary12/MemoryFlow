import React, { useState } from 'react';
import { 
  Cpu, 
  Send, 
  AlertCircle, 
  SlidersHorizontal,
  Database
} from 'lucide-react';
import type { PagingConfig } from '../../core/paging/types';
import { calculateGeometry } from '../../core/paging/addressTranslator';

interface AddressInputCardProps {
  config: PagingConfig;
  onUpdateConfig: (newConfig: PagingConfig) => void;
  onTranslateSingle: (addressInput: string) => void;
  onUpdateStream: (streamText: string) => void;
  currentStreamText: string;
  isStreamMode: boolean;
  onToggleMode: (streamMode: boolean) => void;
}

export const AddressInputCard: React.FC<AddressInputCardProps> = ({
  config,
  onUpdateConfig,
  onTranslateSingle,
  onUpdateStream,
  currentStreamText,
  isStreamMode,
  onToggleMode,
}) => {
  const [singleInput, setSingleInput] = useState('0x4844');
  const [inputFormat, setInputFormat] = useState<'hex' | 'dec'>('hex');
  const [streamInput, setStreamInput] = useState(currentStreamText);
  const [validationError, setValidationError] = useState<string | null>(null);

  const geometry = calculateGeometry(config);

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const trimmed = singleInput.trim();
    if (!trimmed) {
      setValidationError('Please enter a virtual address.');
      return;
    }
    onTranslateSingle(trimmed);
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStream(streamInput);
  };

  return (
    <div className="glass-panel p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] space-y-5">
      
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[var(--color-accent-primary)]" />
          <h3 className="font-bold text-sm text-[var(--color-text-main)]">
            Input & Geometry Console
          </h3>
        </div>

        {/* Segmented Pill for Single vs Stream Mode */}
        <div className="flex items-center p-0.5 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[11px]">
          <button
            type="button"
            onClick={() => onToggleMode(false)}
            className={`px-2.5 py-1 rounded-md transition ${
              !isStreamMode
                ? 'bg-[var(--color-bg-muted)] text-[var(--color-accent-primary)] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Single Address
          </button>
          <button
            type="button"
            onClick={() => onToggleMode(true)}
            className={`px-2.5 py-1 rounded-md transition ${
              isStreamMode
                ? 'bg-[var(--color-bg-muted)] text-[var(--color-accent-primary)] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Trace Stream
          </button>
        </div>
      </div>

      {/* Geometry Configurations (Independent Virtual Space & RAM Size) */}
      <div className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-main)]">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-accent-secondary)]" />
            Configurable Memory Geometry
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-subtle)]">
            {geometry.totalVirtualPages} Pages / {geometry.totalPhysicalFrames} Frames
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {/* Virtual Space Selector */}
          <div>
            <label className="block text-[10px] text-[var(--color-text-muted)] mb-1">
              Virtual Space
            </label>
            <select
              value={config.virtualSpaceKb}
              onChange={(e) =>
                onUpdateConfig({ ...config, virtualSpaceKb: Number(e.target.value) })
              }
              className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-xs focus:outline-none focus:border-[var(--color-accent-primary)]"
            >
              <option value={32}>32 KB (8 p)</option>
              <option value={64}>64 KB (16 p)</option>
              <option value={128}>128 KB (32 p)</option>
            </select>
          </div>

          {/* Physical RAM Selector */}
          <div>
            <label className="block text-[10px] text-[var(--color-text-muted)] mb-1">
              Physical RAM
            </label>
            <select
              value={config.ramSizeKb}
              onChange={(e) =>
                onUpdateConfig({ ...config, ramSizeKb: Number(e.target.value) })
              }
              className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-xs focus:outline-none focus:border-[var(--color-accent-primary)]"
            >
              <option value={16}>16 KB (4 f)</option>
              <option value={32}>32 KB (8 f)</option>
              <option value={64}>64 KB (16 f)</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <div>
            <label className="block text-[10px] text-[var(--color-text-muted)] mb-1">
              Page Size
            </label>
            <select
              value={config.pageSizeKb}
              onChange={(e) =>
                onUpdateConfig({ ...config, pageSizeKb: Number(e.target.value) })
              }
              className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-xs focus:outline-none focus:border-[var(--color-accent-primary)]"
            >
              <option value={1}>1 KB (1024 B)</option>
              <option value={2}>2 KB (2048 B)</option>
              <option value={4}>4 KB (4096 B)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-text-subtle)] pt-1 border-t border-[var(--color-border-subtle)]">
          <span>Max Addr: 0x{geometry.maxVirtualAddress.toString(16).toUpperCase()}</span>
          <span>Offset: {geometry.offsetBits} bits</span>
          <span>Page: {geometry.pageBits} bits</span>
        </div>
      </div>

      {/* Mode A: Single Address Translation */}
      {!isStreamMode ? (
        <form onSubmit={handleSingleSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--color-text-main)]">
              Virtual Address Input:
            </label>
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setInputFormat('hex')}
                className={`px-1.5 py-0.5 rounded ${
                  inputFormat === 'hex'
                    ? 'bg-[var(--color-accent-primary)] text-[var(--color-accent-contrast)]'
                    : 'text-[var(--color-text-muted)] bg-[var(--color-bg-surface-elevated)]'
                }`}
              >
                HEX
              </button>
              <button
                type="button"
                onClick={() => setInputFormat('dec')}
                className={`px-1.5 py-0.5 rounded ${
                  inputFormat === 'dec'
                    ? 'bg-[var(--color-accent-primary)] text-[var(--color-accent-contrast)]'
                    : 'text-[var(--color-text-muted)] bg-[var(--color-bg-surface-elevated)]'
                }`}
              >
                DEC
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={singleInput}
                onChange={(e) => setSingleInput(e.target.value)}
                placeholder={inputFormat === 'hex' ? 'e.g. 0x4844' : 'e.g. 18500'}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-sm focus:outline-none focus:border-[var(--color-accent-primary)]"
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-[var(--color-text-subtle)]">
                {inputFormat === 'hex' ? '16-bit' : 'Bytes'}
              </span>
            </div>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-xs shadow-md transition"
              style={{
                backgroundColor: 'var(--color-accent-primary)',
                color: 'var(--color-accent-contrast)',
              }}
            >
              <span>Translate</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {validationError && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-accent-danger)]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
            <span>Valid Range: 0 to {geometry.maxVirtualAddress}</span>
            <span>Offset Mask: 0x{(geometry.pageSizeBytes - 1).toString(16).toUpperCase()}</span>
          </div>
        </form>
      ) : (
        /* Mode B: Reference Stream Sequence */
        <form onSubmit={handleStreamSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-[var(--color-text-main)]">
            Reference Access Sequence (Comma-Separated):
          </label>
          <textarea
            value={streamInput}
            onChange={(e) => setStreamInput(e.target.value)}
            rows={3}
            placeholder="e.g. 0x1000, 0x1040, 0x2000, 0x1080, 0x3000"
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-xs focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-surface-elevated)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border-medium)] text-[var(--color-text-main)] text-xs font-medium transition"
          >
            <Database className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
            <span>Load Sequence into Stepper</span>
          </button>
        </form>
      )}

    </div>
  );
};
