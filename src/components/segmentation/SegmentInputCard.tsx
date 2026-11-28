import React, { useState } from 'react';
import { 
  Split, 
  Send, 
  AlertCircle, 
  PlusCircle, 
  SlidersHorizontal,
  Database
} from 'lucide-react';
import type { SegmentationConfig, Segment } from '../../core/segmentation/types';

interface SegmentInputCardProps {
  config: SegmentationConfig;
  segments: Segment[];
  onUpdateConfig: (newConfig: SegmentationConfig) => { success: boolean; error?: string };
  onTranslateSingle: (addressInput: string) => void;
  onUpdateStream: (streamText: string) => void;
  onAddSegment: (newSegment: Omit<Segment, 'accessCount'>) => { success: boolean; error?: string };
  currentStreamText: string;
  isStreamMode: boolean;
  onToggleMode: (streamMode: boolean) => void;
}

export const SegmentInputCard: React.FC<SegmentInputCardProps> = ({
  config,
  segments,
  onUpdateConfig,
  onTranslateSingle,
  onUpdateStream,
  onAddSegment,
  currentStreamText,
  isStreamMode,
  onToggleMode,
}) => {
  const [singleInput, setSingleInput] = useState('(0, 500)');
  const [streamDraft, setStreamDraft] = useState({
    value: currentStreamText,
    source: currentStreamText,
  });
  const streamInput = streamDraft.source === currentStreamText
    ? streamDraft.value
    : currentStreamText;
  const [validationError, setValidationError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // New Segment form states
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [newSegName, setNewSegName] = useState('');
  const [newSegBase, setNewSegBase] = useState('26000');
  const [newSegLimit, setNewSegLimit] = useState('2000');
  const [addError, setAddError] = useState<string | null>(null);

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const trimmed = singleInput.trim();
    if (!trimmed) {
      setValidationError('Please enter a logical address like (0, 500).');
      return;
    }
    onTranslateSingle(trimmed);
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStream(streamInput);
  };

  const handleConfigUpdate = (newConfig: SegmentationConfig) => {
    const result = onUpdateConfig(newConfig);
    setConfigError(result.success ? null : result.error ?? 'Memory configuration was rejected.');
  };

  const handleCreateSegment = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const base = Number(newSegBase);
    const limit = Number(newSegLimit);

    if (
      !newSegBase.trim() ||
      !newSegLimit.trim() ||
      !Number.isSafeInteger(base) ||
      !Number.isSafeInteger(limit) ||
      base < 0 ||
      limit <= 0
    ) {
      setAddError('Base and Limit must be safe integers; Base must be non-negative and Limit positive.');
      return;
    }

    const nextId = segments.length > 0 ? Math.max(...segments.map((s) => s.id)) + 1 : 0;
    const colors = ['#ec4899', '#3b82f6', '#14b8a6', '#f97316', '#a855f7'];
    const color = colors[nextId % colors.length];

    const result = onAddSegment({
      id: nextId,
      name: newSegName.trim() || `Segment ${nextId}`,
      base,
      limit,
      isValid: true,
      color,
    });

    if (result && !result.success) {
      setAddError(result.error || 'Placement failed. Check RAM limits and overlap.');
      return;
    }

    setNewSegName('');
    setAddError(null);
    setIsAddingSegment(false);
  };

  return (
    <div className="glass-panel p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] space-y-5">
      
      {/* Title & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Split className="w-4 h-4 text-[var(--color-accent-secondary)]" />
          <h3 className="font-bold text-sm text-[var(--color-text-main)]">
            Logical Address & Segments
          </h3>
        </div>

        <div className="flex items-center p-0.5 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[11px]">
          <button
            type="button"
            onClick={() => onToggleMode(false)}
            aria-pressed={!isStreamMode}
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
            aria-pressed={isStreamMode}
            className={`px-2.5 py-1 rounded-md transition ${
              isStreamMode
                ? 'bg-[var(--color-bg-muted)] text-[var(--color-accent-primary)] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Stream
          </button>
        </div>
      </div>

      {/* Geometry Configurations */}
      <div className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-main)]">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
            Configurable Memory Size
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-subtle)]">
            {segments.length} Active Segments
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label htmlFor="segmentation-logical-space" className="block text-[10px] text-[var(--color-text-muted)] mb-1">
              Logical Space
            </label>
            <select
              id="segmentation-logical-space"
              value={config.logicalSpaceKb}
              aria-invalid={configError ? true : undefined}
              aria-describedby={configError ? 'segmentation-config-error' : undefined}
              onChange={(e) =>
                handleConfigUpdate({ ...config, logicalSpaceKb: Number(e.target.value) })
              }
              className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-xs focus:border-[var(--color-accent-primary)]"
            >
              <option value={32}>32 KB</option>
              <option value={64}>64 KB (16-bit)</option>
              <option value={128}>128 KB</option>
            </select>
          </div>

          <div>
            <label htmlFor="segmentation-physical-ram" className="block text-[10px] text-[var(--color-text-muted)] mb-1">
              Physical RAM
            </label>
            <select
              id="segmentation-physical-ram"
              value={config.ramSizeKb}
              aria-invalid={configError ? true : undefined}
              aria-describedby={configError ? 'segmentation-config-error' : undefined}
              onChange={(e) =>
                handleConfigUpdate({ ...config, ramSizeKb: Number(e.target.value) })
              }
              className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-xs focus:border-[var(--color-accent-primary)]"
            >
              <option value={32}>32 KB (32768 B)</option>
              <option value={64}>64 KB (65536 B)</option>
            </select>
          </div>
        </div>
        {configError && (
          <div id="segmentation-config-error" role="alert" className="flex items-center gap-1.5 text-[11px] text-[var(--color-accent-danger)]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{configError}</span>
          </div>
        )}
      </div>

      {/* Mode A: Single Address Translation */}
      {!isStreamMode ? (
        <form onSubmit={handleSingleSubmit} className="space-y-3">
          <label htmlFor="segmentation-address" className="block text-xs font-medium text-[var(--color-text-main)]">
            Logical Address &lt;Segment, Offset&gt;:
          </label>

          <div className="flex flex-col items-stretch gap-2 min-[375px]:flex-row min-[375px]:items-center">
            <input
              id="segmentation-address"
              type="text"
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              aria-invalid={validationError ? true : undefined}
              aria-describedby={validationError ? 'segmentation-address-error' : undefined}
              placeholder="e.g. (0, 500) or (1, 2048)"
              className="min-w-0 flex-1 px-3 py-2 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-sm focus:border-[var(--color-accent-primary)]"
            />

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-medium text-xs shadow-md transition min-[375px]:w-auto"
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
            <div id="segmentation-address-error" role="alert" className="flex items-center gap-1.5 text-xs text-[var(--color-accent-danger)]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
            <span>Condition: 0 &le; Offset &lt; Limit</span>
            <span>Formula: Physical = Base + Offset</span>
          </div>
        </form>
      ) : (
        /* Mode B: Reference Stream Sequence */
        <form onSubmit={handleStreamSubmit} className="space-y-3">
          <label htmlFor="segmentation-stream" className="block text-xs font-medium text-[var(--color-text-main)]">
            Reference Sequence &lt;s, d&gt; (Comma-Separated):
          </label>
          <textarea
            id="segmentation-stream"
            value={streamInput}
            onChange={(e) => setStreamDraft({
              value: e.target.value,
              source: currentStreamText,
            })}
            rows={3}
            placeholder="e.g. (0, 500), (0, 4096), (1, 200), (2, 2500)"
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] font-mono text-xs focus:border-[var(--color-accent-primary)]"
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

      {/* Add Custom Segment Section */}
      <div className="border-t border-[var(--color-border-subtle)] pt-3">
        {!isAddingSegment ? (
          <button
            type="button"
            onClick={() => setIsAddingSegment(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border-medium)] hover:border-[var(--color-accent-primary)] text-[var(--color-text-main)] text-xs font-medium transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
            <span>Add Custom Segment</span>
          </button>
        ) : (
          <form onSubmit={handleCreateSegment} className="space-y-2 p-3 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-main)]">
              New Segment Definition
            </div>
            <label htmlFor="new-segment-name" className="sr-only">Segment name</label>
            <input
              id="new-segment-name"
              type="text"
              placeholder="Segment Name (e.g. Shared Lib)"
              value={newSegName}
              onChange={(e) => setNewSegName(e.target.value)}
              className="w-full px-2.5 py-1 rounded-md border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-xs font-mono"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="new-segment-base" className="text-[10px] text-[var(--color-text-muted)]">Base Address</label>
                <input
                  id="new-segment-base"
                  type="number"
                  placeholder="26000"
                  value={newSegBase}
                  onChange={(e) => setNewSegBase(e.target.value)}
                  aria-invalid={addError ? true : undefined}
                  aria-describedby={addError ? 'segment-add-error' : undefined}
                  className="w-full px-2.5 py-1 rounded-md border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-xs font-mono"
                />
              </div>
              <div>
                <label htmlFor="new-segment-limit" className="text-[10px] text-[var(--color-text-muted)]">Limit / Size</label>
                <input
                  id="new-segment-limit"
                  type="number"
                  placeholder="2000"
                  value={newSegLimit}
                  onChange={(e) => setNewSegLimit(e.target.value)}
                  aria-invalid={addError ? true : undefined}
                  aria-describedby={addError ? 'segment-add-error' : undefined}
                  className="w-full px-2.5 py-1 rounded-md border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-xs font-mono"
                />
              </div>
            </div>
            {addError && (
              <div id="segment-add-error" role="alert" className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-1 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-accent-contrast)] text-xs font-semibold hover:opacity-90 transition"
              >
                Add to Table
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingSegment(false);
                  setAddError(null);
                }}
                className="px-3 py-1 rounded-md border border-[var(--color-border-medium)] text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-base)] transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};
