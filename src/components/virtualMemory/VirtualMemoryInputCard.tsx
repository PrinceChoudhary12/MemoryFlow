import React, { useState, useEffect } from 'react';
import { HardDrive, Send, AlertCircle, Database, SlidersHorizontal, Edit3, BookOpen } from 'lucide-react';
import type { VirtualMemoryConfig, AccessType } from '../../core/virtualMemory/types';

interface VirtualMemoryInputCardProps {
  config: VirtualMemoryConfig;
  onUpdateConfig: (newConfig: VirtualMemoryConfig) => void;
  onTranslateSingle: (addressInput: string, accessType: AccessType) => void;
  onUpdateStream: (streamText: string) => void;
  currentStreamText: string;
  isStreamMode: boolean;
  onToggleMode: (streamMode: boolean) => void;
}

export const VirtualMemoryInputCard: React.FC<VirtualMemoryInputCardProps> = ({
  config,
  onUpdateConfig,
  onTranslateSingle,
  onUpdateStream,
  currentStreamText,
  isStreamMode,
  onToggleMode,
}) => {
  const [singleInput, setSingleInput] = useState('0x1000');
  const [accessType, setAccessType] = useState<AccessType>('READ');
  const [streamInput, setStreamInput] = useState(currentStreamText);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setStreamInput(currentStreamText);
  }, [currentStreamText]);

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const trimmed = singleInput.trim();
    if (!trimmed) {
      setValidationError('Please enter a logical address like 0x1000 or 4096.');
      return;
    }
    onTranslateSingle(trimmed, accessType);
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStream(streamInput);
  };

  return (
    <div className="glass-panel p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] space-y-5">
      
      {/* Title & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[var(--color-accent-tertiary)]" />
          <h3 className="font-bold text-sm text-[var(--color-text-main)]">
            Demand Paging Console
          </h3>
        </div>

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
            Single
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
            Sequence
          </button>
        </div>
      </div>

      {/* Geometry Configurations */}
      <div className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-main)]">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
            Hardware Geometry
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-subtle)]">
            {config.virtualSpaceKb / config.pageSizeKb} Pages / {config.ramSizeKb / config.pageSizeKb} Frames
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[10px] text-[var(--color-text-muted)] mb-1">
              Virtual Memory Space
            </label>
            <select
              value={config.virtualSpaceKb}
              onChange={(e) =>
                onUpdateConfig({ ...config, virtualSpaceKb: Number(e.target.value) })
              }
              className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-xs focus:outline-none focus:border-[var(--color-accent-primary)]"
            >
              <option value={32}>32 KB (8 Pages)</option>
              <option value={64}>64 KB (16 Pages)</option>
              <option value={128}>128 KB (32 Pages)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-[var(--color-text-muted)] mb-1">
              Physical RAM Capacity
            </label>
            <select
              value={config.ramSizeKb}
              onChange={(e) =>
                onUpdateConfig({ ...config, ramSizeKb: Number(e.target.value) })
              }
              className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-xs focus:outline-none focus:border-[var(--color-accent-primary)]"
            >
              <option value={8}>8 KB (2 Frames)</option>
              <option value={16}>16 KB (4 Frames)</option>
              <option value={32}>32 KB (8 Frames)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mode A: Single Address Translation */}
      {!isStreamMode ? (
        <form onSubmit={handleSingleSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-[var(--color-text-main)]">
              Logical Address & Access Type:
            </label>
            
            {/* Read vs Write Selector Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setAccessType('READ')}
                className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                  accessType === 'READ'
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                    : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-main)]'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                READ
              </button>
              <button
                type="button"
                onClick={() => setAccessType('WRITE')}
                className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                  accessType === 'WRITE'
                    ? 'bg-amber-500/20 text-amber-400 font-bold'
                    : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-main)]'
                }`}
                title="Write access marks the page Dirty (requires writeback upon eviction)"
              >
                <Edit3 className="w-3 h-3" />
                WRITE
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              placeholder="e.g. 0x1000 or 4096"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-sm focus:outline-none focus:border-[var(--color-accent-primary)]"
            />

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-xs shadow-md transition"
              style={{
                backgroundColor: 'var(--color-accent-primary)',
                color: 'var(--color-accent-contrast)',
              }}
            >
              <span>Access</span>
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
            <span>Page Size: 4 KB (4096 Bytes)</span>
            <span>Write Mode = Sets Dirty Bit</span>
          </div>
        </form>
      ) : (
        /* Mode B: Sequence Reference Stream */
        <form onSubmit={handleStreamSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-[var(--color-text-main)]">
            Reference Sequence (Comma-Separated with :R or :W):
          </label>
          <textarea
            value={streamInput}
            onChange={(e) => setStreamInput(e.target.value)}
            rows={3}
            placeholder="e.g. 0x1000:R, 0x2000:W, 0x1050:R, 0x3000:W, 0x4000:R"
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

      {/* Demand Paging Notes */}
      <div className="p-3 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-muted)] space-y-1">
        <div className="font-semibold text-[var(--color-text-main)] flex items-center gap-1">
          <span>Lazy Loading Mechanism:</span>
        </div>
        <p>Pages are brought from disk into RAM only on reference. If valid bit is 0, OS triggers page fault interrupt handler.</p>
      </div>

    </div>
  );
};
