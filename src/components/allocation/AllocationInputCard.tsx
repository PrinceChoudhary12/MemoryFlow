import React, { useState } from 'react';
import { Sliders, BookOpen, PlusCircle, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ALLOCATION_PRESETS,
  parseAllocationStream,
} from '../../core/allocation/allocationEngine';
import type {
  ActiveProcessSummary,
  AllocationOperation,
  AllocationStrategy,
} from '../../core/allocation/types';

const STRATEGY_LABEL: Record<AllocationStrategy, string> = {
  FIRST_FIT: 'First-Fit',
  BEST_FIT: 'Best-Fit',
  WORST_FIT: 'Worst-Fit',
};

interface AllocationInputCardProps {
  operations: AllocationOperation[];
  minHoleThresholdKb: number;
  activePresetId: string;
  activeProcesses: ActiveProcessSummary[];
  onSelectPreset: (presetId: string) => void;
  onApplyStream: (ops: AllocationOperation[], thresholdKb: number) => void;
  onSubmitOperation: (op: AllocationOperation) => void;
  disabled?: boolean;
}

function formatOperations(ops: AllocationOperation[]): string {
  return ops
    .map((op) =>
      op.type === 'ALLOCATE' ? `A ${op.processId} ${op.size}` : `D ${op.processId}`
    )
    .join(', ');
}

export const AllocationInputCard: React.FC<AllocationInputCardProps> = ({
  operations,
  minHoleThresholdKb,
  activePresetId,
  activeProcesses,
  onSelectPreset,
  onApplyStream,
  onSubmitOperation,
  disabled = false,
}) => {
  const [streamText, setStreamText] = useState(() => formatOperations(operations));
  const [thresholdKb, setThresholdKb] = useState(minHoleThresholdKb);
  const [validation, setValidation] = useState(() =>
    parseAllocationStream(formatOperations(operations))
  );
  const [prevOperations, setPrevOperations] = useState(operations);
  const [prevThreshold, setPrevThreshold] = useState(minHoleThresholdKb);

  // Sync during render when preset/external ops change
  if (operations !== prevOperations) {
    setPrevOperations(operations);
    const formatted = formatOperations(operations);
    setStreamText(formatted);
    setValidation(parseAllocationStream(formatted));
  }

  if (minHoleThresholdKb !== prevThreshold) {
    setPrevThreshold(minHoleThresholdKb);
    setThresholdKb(minHoleThresholdKb);
  }

  // Ad-hoc allocation state
  const [newPid, setNewPid] = useState('P5');
  const [newSize, setNewSize] = useState('128');
  const [adHocError, setAdHocError] = useState<string | null>(null);

  const handleStreamChange = (text: string) => {
    setStreamText(text);
    setValidation(parseAllocationStream(text));
  };

  const handleApply = () => {
    if (validation.valid) {
      onApplyStream(validation.operations, thresholdKb);
    }
  };

  const handleThresholdChange = (val: number) => {
    setThresholdKb(val);
    if (validation.valid) {
      onApplyStream(validation.operations, val);
    }
  };

  const handleAdHocAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = newPid.trim();
    if (!pid || /\s/.test(pid)) {
      setAdHocError('Process ID must be non-empty without spaces.');
      return;
    }

    const size = Number(newSize.trim());
    if (!newSize.trim() || !Number.isInteger(size) || size <= 0) {
      setAdHocError('Size must be a positive integer (KB).');
      return;
    }

    setAdHocError(null);
    onSubmitOperation({ type: 'ALLOCATE', processId: pid, size });
    // Auto-increment default PID suggestion if numeric suffix
    const match = pid.match(/^([A-Za-z]+)(\d+)$/);
    if (match) {
      setNewPid(`${match[1]}${parseInt(match[2], 10) + 1}`);
    }
  };

  return (
    <div className="rounded-2xl glass-panel p-5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)] flex items-center justify-center border border-[var(--color-accent-danger)]/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-main)]">
              Workload & Partition Config
            </h2>
            <p className="text-[11px] text-[var(--color-text-subtle)]">
              Presets, custom operation stream, or live allocate/free
            </p>
          </div>
        </div>

        {/* Min Split Threshold Selector */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Minimum leftover hole threshold">
          <span className="text-[10px] font-semibold text-[var(--color-text-subtle)] hidden sm:inline">
            Min Split:
          </span>
          {[0, 16, 32, 64].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={thresholdKb === t}
              disabled={disabled}
              onClick={() => handleThresholdChange(t)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                thresholdKb === t
                  ? 'bg-[var(--color-accent-danger)] text-[var(--color-accent-contrast)] shadow-sm'
                  : 'bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
              title={`Minimum leftover hole threshold (${t} KB)`}
            >
              {t}K
            </button>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-muted)] flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Educational Scenarios:</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {ALLOCATION_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={isActive}
                disabled={disabled}
                onClick={() => onSelectPreset(preset.id)}
                className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                  isActive
                    ? 'bg-[var(--color-accent-danger)]/15 border-[var(--color-accent-danger)] text-[var(--color-text-main)] font-semibold shadow-sm'
                    : 'bg-[var(--color-bg-surface-elevated)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-medium)]'
                }`}
              >
                <div className="truncate font-medium">{preset.label}</div>
                <div className="text-[10px] text-[var(--color-text-subtle)] truncate">
                  {preset.operations.length} ops • {preset.minHoleThresholdKb} KB threshold
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Operation Stream Editor */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="allocation-operation-stream" className="text-xs font-semibold text-[var(--color-text-muted)]">
            Operation Stream:
          </label>
          <span className="text-[10px] font-mono text-[var(--color-text-subtle)]">
            A &lt;PID&gt; &lt;KB&gt;, D &lt;PID&gt;
          </span>
        </div>

        <textarea
          id="allocation-operation-stream"
          rows={2}
          value={streamText}
          disabled={disabled}
          onChange={(e) => handleStreamChange(e.target.value)}
          aria-invalid={!validation.valid}
          aria-describedby={!validation.valid ? 'allocation-stream-error' : undefined}
          placeholder="e.g., A P1 212, A P2 417, D P1"
          className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-accent-danger)] resize-none"
        />

        {validation.valid ? (
          <div role="status" aria-live="polite" className="flex items-center justify-between text-[11px] text-emerald-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valid stream: {validation.operations.length} operations
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={handleApply}
              className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-accent-danger)] text-[var(--color-accent-contrast)] hover:opacity-90 transition-opacity"
            >
              Apply Stream
            </button>
          </div>
        ) : (
          <div id="allocation-stream-error" role="status" aria-live="polite" className="flex items-center gap-1 text-[11px] text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{validation.error}</span>
          </div>
        )}
      </div>

      {/* Live Ad-hoc Allocate & Deallocate */}
      <div className="pt-2 border-t border-[var(--color-border-subtle)] space-y-2">
        <form onSubmit={handleAdHocAllocate} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newPid}
            disabled={disabled}
            onChange={(e) => {
              setNewPid(e.target.value);
              if (adHocError) setAdHocError(null);
            }}
            placeholder="PID"
            className="w-20 font-mono text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)]"
            aria-label="Process ID"
            aria-invalid={adHocError ? true : undefined}
            aria-describedby={adHocError ? 'allocation-operation-error' : undefined}
          />
          <input
            type="number"
            min={1}
            step={1}
            value={newSize}
            disabled={disabled}
            onChange={(e) => {
              setNewSize(e.target.value);
              if (adHocError) setAdHocError(null);
            }}
            placeholder="Size KB"
            className="w-24 font-mono text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)]"
            aria-label="Process Size in KB"
            aria-invalid={adHocError ? true : undefined}
            aria-describedby={adHocError ? 'allocation-operation-error' : undefined}
          />
          <button
            type="submit"
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Allocate</span>
          </button>
        </form>

        {adHocError && (
          <div id="allocation-operation-error" role="alert" className="flex items-center gap-1 text-[11px] text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{adHocError}</span>
          </div>
        )}

        {activeProcesses.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--color-text-subtle)]">
              Allocated Processes (click to free):
            </span>
            {activeProcesses.map(({ processId, allocatedIn }) => {
              const isPartial = allocatedIn.length < 3;
              const strategyNames = allocatedIn.map((s) => STRATEGY_LABEL[s]).join(', ');
              return (
                <button
                  key={processId}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSubmitOperation({ type: 'DEALLOCATE', processId })}
                  title={`Allocated in: ${strategyNames}. Click to deallocate ${processId}.`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border transition-colors disabled:opacity-40 ${
                    isPartial
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                  }`}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>{processId}</span>
                  {isPartial && (
                    <span className="text-[9px] opacity-85">({strategyNames})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
