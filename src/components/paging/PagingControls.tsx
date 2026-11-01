import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  Sparkles
} from 'lucide-react';

interface PagingControlsProps {
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

export const PAGING_PRESETS = [
  {
    id: 'locality',
    label: 'High Locality (Hits)',
    description: 'Loops across pages 1 and 2 to demonstrate repeated Page Hits.',
    stream: ['0x1000', '0x1040', '0x2000', '0x1080', '0x2040', '0x10C0', '0x2080'],
  },
  {
    id: 'sequential',
    label: 'Sequential Sweeps (Faults)',
    description: 'Sequentially accesses distinct pages to demonstrate demand paging and frame allocation.',
    stream: ['0x0000', '0x1000', '0x2000', '0x3000', '0x4000', '0x5000', '0x6000', '0x7000'],
  },
  {
    id: 'saturation',
    label: 'Memory Saturation (Full)',
    description: 'References 9 distinct pages into 8 frames to trigger and demonstrate the FAULT_MEMORY_FULL event.',
    stream: ['0x0000', '0x1000', '0x2000', '0x3000', '0x4000', '0x5000', '0x6000', '0x7000', '0x8000'],
  },
  {
    id: 'boundaries',
    label: 'Page Edge Boundaries',
    description: 'Tests address translations right at 4095 and 4096 byte thresholds.',
    stream: ['4095', '4096', '8191', '8192', '12287', '12288'],
  },
];

export const PagingControls: React.FC<PagingControlsProps> = ({
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
      
      {/* Left: Playback buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onStepBackward}
          disabled={!canStepBackward}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-main)] text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
          title="Step Backward (Revert Previous State)"
        >
          <SkipBack className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Step Back</span>
        </button>

        <button
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium text-xs shadow-md transition"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            color: 'var(--color-accent-contrast)',
            boxShadow: '0 2px 10px 0 var(--color-accent-glow)',
          }}
          title={isPlaying ? 'Pause auto-play' : 'Play stream automatically'}
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
          onClick={onStepForward}
          disabled={!canStepForward}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-main)] text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
          title="Step Forward to Next Memory Reference"
        >
          <span>Step Forward</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-danger)] hover:text-[var(--color-accent-danger)] text-[var(--color-text-muted)] text-xs transition"
          title="Reset Simulation to Initial State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Reset</span>
        </button>
      </div>

      {/* Center: Playback Speed Toggle */}
      <div className="flex items-center gap-1 bg-[var(--color-bg-surface-elevated)] p-1 rounded-lg border border-[var(--color-border-subtle)]">
        <span className="text-[10px] uppercase font-mono px-1.5 text-[var(--color-text-subtle)]">Speed:</span>
        {[0.5, 1.0, 1.5, 2.0].map((s) => (
          <button
            key={s}
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
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] uppercase font-mono text-[var(--color-text-subtle)] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[var(--color-accent-warning)]" />
          Presets:
        </span>
        {PAGING_PRESETS.map((p) => (
          <button
            key={p.id}
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
