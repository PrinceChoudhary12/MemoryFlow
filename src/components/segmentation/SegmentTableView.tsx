import React, { useState } from 'react';
import { Table, CheckCircle2, ShieldAlert, Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react';
import type { Segment, SegmentTranslationStep } from '../../core/segmentation/types';
import { toHex } from '../../core/segmentation/segmentationTranslator';

interface SegmentTableViewProps {
  segments: Segment[];
  currentStep: SegmentTranslationStep | null;
  onRemoveSegment?: (id: number) => void;
  onUpdateSegment?: (id: number, updates: Partial<Omit<Segment, 'id'>>) => { success: boolean; error?: string };
}

export const SegmentTableView: React.FC<SegmentTableViewProps> = ({
  segments,
  currentStep,
  onRemoveSegment,
  onUpdateSegment,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editBase, setEditBase] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = (seg: Segment) => {
    setEditingId(seg.id);
    setEditName(seg.name);
    setEditBase(seg.base.toString());
    setEditLimit(seg.limit.toString());
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = (id: number) => {
    if (!onUpdateSegment) return;
    const base = Number(editBase);
    const limit = Number(editLimit);

    if (
      !editBase.trim() ||
      !editLimit.trim() ||
      !Number.isSafeInteger(base) ||
      !Number.isSafeInteger(limit) ||
      base < 0 ||
      limit <= 0
    ) {
      setEditError('Base and Limit must be safe integers; Base must be non-negative and Limit positive.');
      return;
    }

    const res = onUpdateSegment(id, {
      name: editName.trim() || `Segment ${id}`,
      base,
      limit,
    });

    if (res && !res.success) {
      setEditError(res.error || 'Failed to update segment.');
      return;
    }

    setEditingId(null);
    setEditError(null);
  };

  return (
    <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col h-full">
      
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[var(--color-accent-secondary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            Hardware Segment Descriptor Table
          </h4>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-text-subtle)]">
          {segments.length} Logical Descriptors
        </span>
      </div>

      {editError && (
        <div id="segment-edit-error" role="alert" className="mb-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-400 flex items-center gap-1.5 font-mono">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{editError}</span>
        </div>
      )}

      {/* Table Container */}
      <div
        className="flex-1 overflow-auto max-h-[300px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]"
        role="region"
        aria-label="Scrollable segment descriptor table"
        tabIndex={0}
      >
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-[var(--color-bg-surface-elevated)] border-b border-[var(--color-border-medium)] text-[10px] uppercase text-[var(--color-text-subtle)]">
            <tr>
              <th className="py-2 px-3">Seg ID</th>
              <th className="py-2 px-3">Segment Name</th>
              <th className="py-2 px-3">Base Address</th>
              <th className="py-2 px-3">Limit (Size)</th>
              <th className="py-2 px-3">Status / Hits</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {segments.map((seg) => {
              const isTarget = currentStep && currentStep.segmentId === seg.id;
              const isSuccess = isTarget && currentStep.status === 'VALID_TRANSLATION';
              const isTrap = isTarget && currentStep.status === 'FAULT_LIMIT_EXCEEDED';
              const isEditing = editingId === seg.id;

              if (isEditing) {
                return (
                  <tr key={seg.id} className="bg-[var(--color-bg-surface-elevated)]">
                    <td className="py-2 px-3 font-bold text-[var(--color-accent-primary)]">
                      S#{seg.id}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        aria-label={`Segment ${seg.id} name`}
                        aria-invalid={editError ? true : undefined}
                        aria-describedby={editError ? 'segment-edit-error' : undefined}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-0.5 rounded border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-xs text-[var(--color-text-main)] font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        aria-label={`Segment ${seg.id} base address`}
                        aria-invalid={editError ? true : undefined}
                        aria-describedby={editError ? 'segment-edit-error' : undefined}
                        value={editBase}
                        onChange={(e) => setEditBase(e.target.value)}
                        className="w-24 px-2 py-0.5 rounded border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-xs text-[var(--color-accent-primary)] font-mono font-bold"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        aria-label={`Segment ${seg.id} limit`}
                        aria-invalid={editError ? true : undefined}
                        aria-describedby={editError ? 'segment-edit-error' : undefined}
                        value={editLimit}
                        onChange={(e) => setEditLimit(e.target.value)}
                        className="w-24 px-2 py-0.5 rounded border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] text-xs text-[var(--color-accent-secondary)] font-mono font-bold"
                      />
                    </td>
                    <td className="py-2 px-3 text-[10px] text-[var(--color-text-subtle)]">
                      Editing
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => saveEdit(seg.id)}
                          aria-label={`Save segment ${seg.id} changes`}
                          className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20 transition"
                          title="Save Changes"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          aria-label={`Cancel editing segment ${seg.id}`}
                          className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] transition"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={seg.id}
                  className={`transition-colors ${
                    isTarget
                      ? isSuccess
                        ? 'bg-[var(--color-accent-glow)] font-bold text-[var(--color-text-main)]'
                        : isTrap
                        ? 'bg-rose-500/15 font-bold text-[var(--color-text-main)]'
                        : 'bg-[var(--color-bg-surface-elevated)]'
                      : 'hover:bg-[var(--color-bg-surface-elevated)]/50 text-[var(--color-text-muted)]'
                  }`}
                >
                  <td className="py-2 px-3 flex items-center gap-1.5">
                    {isTarget && (
                      <span className="w-1.5 h-1.5 rounded-full animate-ping bg-[var(--color-accent-secondary)]" />
                    )}
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                      style={{ backgroundColor: seg.color || 'var(--color-accent-primary)' }}
                    />
                    <span>S#{seg.id}</span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-[var(--color-text-main)]">
                    {seg.name}
                  </td>
                  <td className="py-2 px-3 text-[var(--color-accent-primary)] font-semibold">
                    {toHex(seg.base, 4)} <span className="text-[10px] text-[var(--color-text-muted)]">({seg.base})</span>
                  </td>
                  <td className="py-2 px-3 text-[var(--color-accent-secondary)] font-semibold">
                    {toHex(seg.limit, 4)} <span className="text-[10px] text-[var(--color-text-muted)]">({seg.limit} B)</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      {isTrap ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          Trap
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Valid
                        </span>
                      )}
                      {seg.accessCount > 0 && (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-subtle)] border border-[var(--color-border-subtle)]">
                          {seg.accessCount} hits
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onUpdateSegment && (
                        <button
                          onClick={() => startEdit(seg)}
                          aria-label={`Edit ${seg.name} base and limit`}
                          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-surface-elevated)] transition"
                          title="Edit Base & Limit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      {onRemoveSegment && seg.id > 3 && (
                        <button
                          onClick={() => onRemoveSegment(seg.id)}
                          aria-label={`Delete ${seg.name}`}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition"
                          title="Delete custom segment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--color-text-subtle)] font-mono">
        <span>Base: Physical start in RAM</span>
        <span>Limit: Maximum valid offset bound</span>
      </div>
    </div>
  );
};
