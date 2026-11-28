import React from 'react';
import { SEGMENTATION_PRESETS } from './segmentationPresets';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  Sparkles
} from 'lucide-react';

interface SegmentationControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  canStepForward: boolean;
  canStepBackward: boolean;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onSelectPreset: (presetId: string) => void;
  activePreset: string;
}



export const SegmentationControls: React.FC<SegmentationControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onReset,
  canStepForward,
  canStepBackward,
  playbackSpeed,
  onSpeedChange,
  onSelectPreset,
  activePreset,
}) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-wrap items-center justify-between gap-4">
      
      {/* Left: Playback controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStepBackward}
          aria-label="Step Back"
          disabled={!canStepBackward}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-main)] text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
          title="Step Backward (Revert Previous State)"
        >
          <SkipBack className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Step Back</span>
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium text-xs shadow-md transition"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            color: 'var(--color-accent-contrast)',
            boxShadow: '0 2px 10px 0 var(--color-accent-glow)',
          }}
          title={isPlaying ? 'Pause stream' : 'Play stream automatically'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Play</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onStepForward}
          aria-label="Step forward"
          disabled={!canStepForward}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-main)] text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
          title="Step Forward to Next Memory Reference"
        >
          <span>Step Forward</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onReset}
          aria-label="Reset simulation"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-danger)] hover:text-[var(--color-accent-danger)] text-[var(--color-text-muted)] text-xs transition"
          title="Reset Simulation State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Reset</span>
        </button>
      </div>

      {/* Center: Speed Multiplier */}
      <div className="flex items-center gap-1 bg-[var(--color-bg-surface-elevated)] p-1 rounded-lg border border-[var(--color-border-subtle)]">
        <span className="text-[10px] uppercase font-mono px-1.5 text-[var(--color-text-subtle)]">Speed:</span>
        {[0.5, 1.0, 1.5, 2.0].map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={playbackSpeed === s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
              playbackSpeed === s
                ? 'font-bold bg-[var(--color-bg-muted)] text-[var(--color-accent-primary)] border border-[var(--color-border-medium)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Right: Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label="Segmentation presets">
        <span className="text-[10px] uppercase font-mono text-[var(--color-text-subtle)] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[var(--color-accent-warning)]" />
          Presets:
        </span>
        {SEGMENTATION_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={activePreset === p.id}
            onClick={() => onSelectPreset(p.id)}
            className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs transition border ${
              activePreset === p.id
                ? 'border-[var(--color-accent-primary)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] font-semibold'
                : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
            title={p.description}
          >
            {p.label}
          </button>
        ))}
      </div>

    </div>
  );
};
