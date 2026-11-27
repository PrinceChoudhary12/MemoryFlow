import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  FastForward,
  Gauge,
} from 'lucide-react';

interface AllocationControlsProps {
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

export const AllocationControls: React.FC<AllocationControlsProps> = ({
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
  const displayStep = currentStepIndex + 1;
  const progressPercent = totalSteps > 0 ? (displayStep / totalSteps) * 100 : 0;

  return (
    <div className="rounded-2xl glass-panel p-4 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Step Indicator & Progress */}
        <div className="flex items-center gap-3">
          <div className="text-xs">
            <span className="text-[var(--color-text-subtle)]">Operation: </span>
            <span className="font-mono font-bold text-sm text-[var(--color-text-main)]">
              {displayStep}
            </span>
            <span className="text-[var(--color-text-subtle)]"> / {totalSteps}</span>
          </div>

          <div className="w-28 sm:w-36 h-2 rounded-full bg-[var(--color-bg-muted)] overflow-hidden border border-[var(--color-border-subtle)]">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-accent-danger)] to-[var(--color-accent-warning)] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="p-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)] transition-colors"
            title="Reset memory partitions to baseline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onStepBackward}
            disabled={!canStepBackward || isPlaying}
            className="p-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Step backward (restore previous partitions)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={!canStepForward && !isPlaying}
            className={`px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/25'
                : 'bg-[var(--color-accent-danger)] text-[var(--color-accent-contrast)] shadow-[var(--color-accent-danger)]/20 hover:opacity-95'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isPlaying ? 'Pause playback' : 'Auto-play operations'}
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

          <button
            onClick={onStepForward}
            disabled={!canStepForward || isPlaying}
            className="p-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Step forward (execute next operation)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onJumpToEnd}
            disabled={!canStepForward || isPlaying}
            className="p-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Run all remaining operations"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-surface-elevated)] p-1 rounded-xl border border-[var(--color-border-subtle)]">
          <Gauge className="w-3.5 h-3.5 text-[var(--color-text-subtle)] ml-1" />
          {[0.5, 1.0, 2.0, 4.0].map((speed) => {
            const isSelected = playbackSpeed === speed;
            return (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                  isSelected
                    ? 'bg-[var(--color-accent-danger)] text-[var(--color-accent-contrast)] shadow-sm'
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
