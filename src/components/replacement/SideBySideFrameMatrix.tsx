import React from 'react';
import { CheckCircle2, XCircle, History } from 'lucide-react';
import type { DualAlgorithmStep, FrameSlot } from '../../core/replacement/types';

interface SideBySideFrameMatrixProps {
  referenceString: number[];
  currentStepIndex: number;
  frameCount: number;
  fifoFrames: FrameSlot[];
  lruFrames: FrameSlot[];
  history: DualAlgorithmStep[];
  onSelectStep?: (index: number) => void;
}

export const SideBySideFrameMatrix: React.FC<SideBySideFrameMatrixProps> = ({
  referenceString,
  currentStepIndex,
  frameCount,
  fifoFrames,
  lruFrames,
  history,
  onSelectStep,
}) => {
  const currentStep = currentStepIndex >= 0 ? history[currentStepIndex] : null;

  return (
    <div className="space-y-6">
      {/* 1. Reference String Ribbon */}
      <div className="rounded-2xl glass-panel p-4 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-warning)] animate-ping" />
            <span className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
              Page Reference Stream Ribbon
            </span>
          </div>
          <span className="text-[11px] text-[var(--color-text-subtle)]">
            Click any step to jump
          </span>
        </div>

        {/* Horizontal scrollable page chips */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-center gap-2 min-w-max">
            {referenceString.map((page, index) => {
              const isCurrent = index === currentStepIndex;
              const isPast = index < currentStepIndex;
              const stepData = history[index];

              return (
                <button
                  key={index}
                  onClick={() => onSelectStep?.(index)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[52px] border transition-all ${
                    isCurrent
                      ? 'bg-[var(--color-accent-warning)] text-[var(--color-accent-contrast)] border-[var(--color-accent-warning)] shadow-lg shadow-[var(--color-accent-warning)]/30 scale-105 font-bold z-10'
                      : isPast
                      ? 'bg-[var(--color-bg-surface-elevated)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border-medium)]'
                      : 'bg-[var(--color-bg-muted)] border-dashed border-[var(--color-border-subtle)] text-[var(--color-text-subtle)] opacity-70'
                  }`}
                >
                  <span className="text-[10px] font-mono opacity-80">#{index + 1}</span>
                  <span className="text-base font-mono font-extrabold my-0.5">{page}</span>

                  {/* Dual Mini Indicators */}
                  {stepData ? (
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          stepData.fifo.status === 'HIT' ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                        title={`FIFO: ${stepData.fifo.status}`}
                      />
                      <span
                        className={`w-2 h-2 rounded-full ${
                          stepData.lru.status === 'HIT' ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                        title={`LRU: ${stepData.lru.status}`}
                      />
                    </div>
                  ) : (
                    <div className="w-5 h-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 text-[11px] text-[var(--color-text-subtle)] pt-1 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Page Hit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span>Page Fault</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span>(Left: FIFO, Right: LRU)</span>
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Dual Matrix (FIFO vs LRU) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ================= FIFO PANEL ================= */}
        <div className="rounded-2xl glass-panel p-5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                FIFO
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  First-In, First-Out
                </h3>
                <p className="text-[11px] text-[var(--color-text-subtle)]">
                  Evicts earliest loaded page (queue order)
                </p>
              </div>
            </div>

            {currentStep && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${
                  currentStep.fifo.status === 'HIT'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {currentStep.fifo.status === 'HIT' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {currentStep.fifo.status}
              </span>
            )}
          </div>

          {/* Current Frame Snapshot */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--color-text-muted)] flex items-center justify-between">
              <span>Physical Frame Contents:</span>
              {currentStep?.fifo.victimPage !== null && currentStep?.fifo.victimPage !== undefined && (
                <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Evicted Page {currentStep.fifo.victimPage}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {fifoFrames.map((slot) => {
                const isReplaced = currentStep?.fifo.replacedFrameIndex === slot.frameIndex;
                const hasPage = slot.pageNumber !== null;

                return (
                  <div
                    key={slot.frameIndex}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      isReplaced
                        ? 'border-rose-400 bg-rose-500/10 shadow-md shadow-rose-500/10'
                        : hasPage
                        ? 'border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)]'
                        : 'border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-subtle)] font-mono">
                      <span>Frame {slot.frameIndex}</span>
                      {hasPage && slot.loadedAt >= 0 && (
                        <span>Loaded @ #{slot.loadedAt + 1}</span>
                      )}
                    </div>

                    <div className="my-2 text-center">
                      {hasPage ? (
                        <span className="font-mono text-2xl font-black text-[var(--color-text-main)]">
                          {slot.pageNumber}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-[var(--color-text-subtle)] italic">
                          Empty
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-center font-mono">
                      {isReplaced ? (
                        <span className="text-rose-400 font-semibold">New Arrival</span>
                      ) : hasPage ? (
                        <span className="text-[var(--color-text-subtle)]">Residing</span>
                      ) : (
                        <span className="text-[var(--color-text-subtle)]">Available</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical Matrix Table */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
              <History className="w-3.5 h-3.5" />
              <span>Step Execution Matrix (FIFO):</span>
            </div>

            <div className="overflow-x-auto max-h-56 scrollbar-thin rounded-xl border border-[var(--color-border-subtle)]">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead>
                  <tr className="bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-subtle)] border-b border-[var(--color-border-subtle)]">
                    <th className="p-2 text-center font-semibold">Step</th>
                    <th className="p-2 text-center font-semibold">Page</th>
                    {Array.from({ length: frameCount }, (_, i) => (
                      <th key={i} className="p-2 text-center font-semibold">
                        F{i}
                      </th>
                    ))}
                    <th className="p-2 text-center font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
                  {history.length === 0 ? (
                    <tr>
                      <td
                        colSpan={frameCount + 3}
                        className="p-4 text-center text-[var(--color-text-subtle)] italic"
                      >
                        Simulation not started. Press Step Forward or Auto Play.
                      </td>
                    </tr>
                  ) : (
                    history.map((h, i) => {
                      const isHighlighted = i === currentStepIndex;
                      return (
                        <tr
                          key={i}
                          className={`transition-colors cursor-pointer ${
                            isHighlighted
                              ? 'bg-[var(--color-accent-warning)]/15 font-bold'
                              : 'hover:bg-[var(--color-bg-surface-elevated)]'
                          }`}
                          onClick={() => onSelectStep?.(i)}
                        >
                          <td className="p-2 text-center text-[var(--color-text-subtle)]">
                            #{h.stepIndex + 1}
                          </td>
                          <td className="p-2 text-center text-[var(--color-text-main)] font-bold">
                            {h.pageNumber}
                          </td>
                          {h.fifo.frames.map((frameVal, fIdx) => (
                            <td key={fIdx} className="p-2 text-center text-[var(--color-text-main)]">
                              {frameVal !== null ? frameVal : '-'}
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                h.fifo.status === 'HIT'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {h.fifo.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================= LRU PANEL ================= */}
        <div className="rounded-2xl glass-panel p-5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/20">
                LRU
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  Least Recently Used
                </h3>
                <p className="text-[11px] text-[var(--color-text-subtle)]">
                  Evicts page unused for longest time
                </p>
              </div>
            </div>

            {currentStep && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${
                  currentStep.lru.status === 'HIT'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {currentStep.lru.status === 'HIT' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {currentStep.lru.status}
              </span>
            )}
          </div>

          {/* Current Frame Snapshot */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--color-text-muted)] flex items-center justify-between">
              <span>Physical Frame Contents:</span>
              {currentStep?.lru.victimPage !== null && currentStep?.lru.victimPage !== undefined && (
                <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Evicted Page {currentStep.lru.victimPage}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {lruFrames.map((slot) => {
                const isReplaced = currentStep?.lru.replacedFrameIndex === slot.frameIndex;
                const hasPage = slot.pageNumber !== null;

                return (
                  <div
                    key={slot.frameIndex}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      isReplaced
                        ? 'border-rose-400 bg-rose-500/10 shadow-md shadow-rose-500/10'
                        : hasPage
                        ? 'border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)]'
                        : 'border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-subtle)] font-mono">
                      <span>Frame {slot.frameIndex}</span>
                      {hasPage && slot.lastAccessedAt >= 0 && (
                        <span>Last @ #{slot.lastAccessedAt + 1}</span>
                      )}
                    </div>

                    <div className="my-2 text-center">
                      {hasPage ? (
                        <span className="font-mono text-2xl font-black text-[var(--color-text-main)]">
                          {slot.pageNumber}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-[var(--color-text-subtle)] italic">
                          Empty
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-center font-mono">
                      {isReplaced ? (
                        <span className="text-rose-400 font-semibold">New Arrival</span>
                      ) : hasPage ? (
                        <span className="text-[var(--color-text-subtle)]">Active</span>
                      ) : (
                        <span className="text-[var(--color-text-subtle)]">Available</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical Matrix Table */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
              <History className="w-3.5 h-3.5" />
              <span>Step Execution Matrix (LRU):</span>
            </div>

            <div className="overflow-x-auto max-h-56 scrollbar-thin rounded-xl border border-[var(--color-border-subtle)]">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead>
                  <tr className="bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-subtle)] border-b border-[var(--color-border-subtle)]">
                    <th className="p-2 text-center font-semibold">Step</th>
                    <th className="p-2 text-center font-semibold">Page</th>
                    {Array.from({ length: frameCount }, (_, i) => (
                      <th key={i} className="p-2 text-center font-semibold">
                        F{i}
                      </th>
                    ))}
                    <th className="p-2 text-center font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
                  {history.length === 0 ? (
                    <tr>
                      <td
                        colSpan={frameCount + 3}
                        className="p-4 text-center text-[var(--color-text-subtle)] italic"
                      >
                        Simulation not started. Press Step Forward or Auto Play.
                      </td>
                    </tr>
                  ) : (
                    history.map((h, i) => {
                      const isHighlighted = i === currentStepIndex;
                      return (
                        <tr
                          key={i}
                          className={`transition-colors cursor-pointer ${
                            isHighlighted
                              ? 'bg-[var(--color-accent-warning)]/15 font-bold'
                              : 'hover:bg-[var(--color-bg-surface-elevated)]'
                          }`}
                          onClick={() => onSelectStep?.(i)}
                        >
                          <td className="p-2 text-center text-[var(--color-text-subtle)]">
                            #{h.stepIndex + 1}
                          </td>
                          <td className="p-2 text-center text-[var(--color-text-main)] font-bold">
                            {h.pageNumber}
                          </td>
                          {h.lru.frames.map((frameVal, fIdx) => (
                            <td key={fIdx} className="p-2 text-center text-[var(--color-text-main)]">
                              {frameVal !== null ? frameVal : '-'}
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                h.lru.status === 'HIT'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {h.lru.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
