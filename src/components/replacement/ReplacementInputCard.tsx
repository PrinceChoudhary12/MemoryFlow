import React, { useState } from 'react';
import { Sliders, Shuffle, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { REPLACEMENT_PRESETS, parseReferenceString } from '../../core/replacement/replacementEngine';

interface ReplacementInputCardProps {
  referenceString: number[];
  frameCount: number;
  onApply: (pages: number[], frames: number) => void;
  onSelectPreset: (presetId: string) => void;
  activePresetId?: string;
  disabled?: boolean;
}

export const ReplacementInputCard: React.FC<ReplacementInputCardProps> = ({
  referenceString,
  frameCount,
  onApply,
  onSelectPreset,
  activePresetId,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState(() => referenceString.join(', '));
  const [selectedFrames, setSelectedFrames] = useState(frameCount);
  const [validation, setValidation] = useState(() => parseReferenceString(inputText));

  const [prevReferenceString, setPrevReferenceString] = useState(referenceString);
  const [prevFrameCount, setPrevFrameCount] = useState(frameCount);

  // Sync state during render when props change without effect cascade
  if (referenceString !== prevReferenceString) {
    setPrevReferenceString(referenceString);
    setInputText(referenceString.join(', '));
    setValidation(parseReferenceString(referenceString.join(', ')));
  }

  if (frameCount !== prevFrameCount) {
    setPrevFrameCount(frameCount);
    setSelectedFrames(frameCount);
  }

  const handleInputChange = (text: string) => {
    setInputText(text);
    const parsed = parseReferenceString(text);
    setValidation(parsed);
  };

  const handleApply = () => {
    if (validation.valid && validation.pages.length > 0) {
      onApply(validation.pages, selectedFrames);
    }
  };

  const handleFrameChange = (frames: number) => {
    setSelectedFrames(frames);
    if (validation.valid && validation.pages.length > 0) {
      onApply(validation.pages, frames);
    }
  };

  const handleGenerateRandom = () => {
    const length = 16;
    const maxPage = 6;
    const randomPages = Array.from({ length }, () => Math.floor(Math.random() * maxPage));
    const text = randomPages.join(', ');
    setInputText(text);
    const parsed = parseReferenceString(text);
    setValidation(parsed);
    if (parsed.valid) {
      onApply(parsed.pages, selectedFrames);
    }
  };

  return (
    <div className="rounded-2xl glass-panel p-5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)] flex items-center justify-center border border-[var(--color-accent-warning)]/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-main)]">Sequence & Frame Config</h2>
            <p className="text-[11px] text-[var(--color-text-subtle)]">Custom stream or textbook presets</p>
          </div>
        </div>

        <button
          onClick={handleGenerateRandom}
          disabled={disabled}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--color-bg-muted)] hover:bg-[var(--color-border-medium)] text-[var(--color-text-main)] transition-colors border border-[var(--color-border-subtle)] disabled:opacity-50"
          title="Generate random reference sequence"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Random</span>
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-muted)] flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Textbook & Educational Presets:</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {REPLACEMENT_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                disabled={disabled}
                className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                  isActive
                    ? 'bg-[var(--color-accent-warning)]/15 border-[var(--color-accent-warning)] text-[var(--color-text-main)] font-semibold shadow-sm'
                    : 'bg-[var(--color-bg-surface-elevated)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-medium)]'
                }`}
              >
                <div className="truncate font-medium">{preset.label.split('(')[0].trim()}</div>
                <div className="text-[10px] text-[var(--color-text-subtle)] truncate">
                  {preset.defaultFrameCount} frames • {preset.referenceString.length} refs
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reference String Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--color-text-muted)]">
            Page Reference String:
          </label>
          <span className="text-[10px] text-[var(--color-text-subtle)]">
            Comma, space, or bracket separated (0-99)
          </span>
        </div>

        <div className="relative">
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g., 7, 0, 1, 2, 0, 3, 0, 4, 2, 3"
            className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-warning)] resize-none"
          />
        </div>

        {/* Validation Status */}
        {validation.valid ? (
          <div className="flex items-center justify-between text-[11px] text-emerald-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valid sequence: {validation.pages.length} page accesses
            </span>
            <button
              onClick={handleApply}
              disabled={disabled}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-accent-warning)] text-[var(--color-accent-contrast)] hover:opacity-90 transition-opacity"
            >
              Apply Sequence
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{validation.error}</span>
          </div>
        )}
      </div>

      {/* Frame Count Selector */}
      <div className="pt-2 border-t border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3">
        <label className="text-xs font-semibold text-[var(--color-text-muted)]">
          Allocated Physical Frames:
        </label>
        <div className="flex items-center gap-1.5">
          {[2, 3, 4, 5, 6].map((count) => {
            const isSelected = selectedFrames === count;
            return (
              <button
                key={count}
                onClick={() => handleFrameChange(count)}
                disabled={disabled}
                className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                  isSelected
                    ? 'bg-[var(--color-accent-warning)] text-[var(--color-accent-contrast)] shadow-md shadow-[var(--color-accent-warning)]/20'
                    : 'bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)]'
                }`}
              >
                {count}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
