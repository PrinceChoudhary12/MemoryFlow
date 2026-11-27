import React from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward, Gauge } from 'lucide-react';

interface ReplacementControlsProps {
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onStepForward: () => void;
  onStepBackward: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onJumpToEnd: () => void;
  onSpeedChange: (speed: number) => void;
  canStepForward: boolean;
  canStepBackward: boolean;
}

export const ReplacementControls: React.FC<ReplacementControlsProps> = ({
  currentStepIndex,
  totalSteps,
  isPlaying,
  playbackSpeed,
  onStepForward,
  onStepBackward,
  onTogglePlay,
  onReset,
  onJumpToEnd,
  onSpeedChange,
  canStepForward,
  canStepBackward,
}) => {
  const displayStep = currentStepIndex + 1; // 0 when not started
  const progressPercent = totalSteps > 0 ? (displayStep / totalSteps) * 100 : 0;

  return (
    <div className="rounded-2xl glass-panel p-4 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Step Indicator & Progress */}
        <div className="flex items-center gap-3">
          <div className="text-xs">
            <span className="text-[var(--color-text-subtle)]">Step: </span>
            <span className="font-mono font-bold text-sm text-[var(--color-text-main)]">
              {displayStep}
            </span>
            <span className="text-[var(--color-text-subtle)]"> / {totalSteps}</span>
          </div>

          <div className="w-28 sm:w-36 h-2 rounded-full bg-[var(--color-bg-muted)] overflow-hidden border border-[var(--color-border-subtle)]">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-accent-warning)] to-[var(--color-accent-primary)] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Reset */}
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset simulation"
            className="p-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)] transition-colors"
            title="Reset simulation to initial state"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Step Backward */}
          <button
            type="button"
            onClick={onStepBackward}
            aria-label="Step backward"
            disabled={!canStepBackward || isPlaying}
            className="p-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Step backward (rewind one page reference)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
            disabled={!canStepForward && !isPlaying}
            className={`px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/25'
                : 'bg-[var(--color-accent-warning)] text-[var(--color-accent-contrast)] shadow-[var(--color-accent-warning)]/20 hover:opacity-95'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isPlaying ? 'Pause simulation' : 'Play simulation automatically'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Auto Play</span>
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            type="button"
            onClick={onStepForward}
            aria-label="Step forward"
            disabled={!canStepForward || isPlaying}
            className="p-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Step forward (evaluate next page reference)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Jump to End */}
          <button
            type="button"
            onClick={onJumpToEnd}
            aria-label="Run to end"
            disabled={!canStepForward || isPlaying}
            className="p-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Fast forward to end of sequence"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-surface-elevated)] p-1 rounded-xl border border-[var(--color-border-subtle)]">
          <Gauge className="w-3.5 h-3.5 text-[var(--color-text-subtle)] ml-1" />
          {[0.5, 1.0, 2.0, 4.0].map((speed) => {
            const isSelected = playbackSpeed === speed;
            return (
              <button
                key={speed}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                  isSelected
                    ? 'bg-[var(--color-accent-warning)] text-[var(--color-accent-contrast)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                {speed}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
