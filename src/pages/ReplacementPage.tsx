import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import {
  ReplacementEngine,
  REPLACEMENT_PRESETS,
} from '../core/replacement/replacementEngine';
import { ReplacementInputCard } from '../components/replacement/ReplacementInputCard';
import { ReplacementControls } from '../components/replacement/ReplacementControls';
import { SideBySideFrameMatrix } from '../components/replacement/SideBySideFrameMatrix';
import { BeladyAnomalyCard } from '../components/replacement/BeladyAnomalyCard';
import { ReplacementTelemetry } from '../components/replacement/ReplacementTelemetry';

interface ReplacementPageProps {
  onBack: () => void;
}

export const ReplacementPage: React.FC<ReplacementPageProps> = ({ onBack }) => {
  // Initialize ReplacementEngine with Silberschatz preset
  const [engine] = useState(() => new ReplacementEngine());

  // React state synchronized with engine
  const [referenceString, setReferenceString] = useState<number[]>(() =>
    engine.getReferenceString()
  );
  const [frameCount, setFrameCount] = useState<number>(() =>
    engine.getFrameCount()
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() =>
    engine.getCurrentStepIndex()
  );
  const [fifoFrames, setFifoFrames] = useState(() => engine.getFifoFrames());
  const [lruFrames, setLruFrames] = useState(() => engine.getLruFrames());
  const [history, setHistory] = useState(() => engine.getHistory());
  const [stats, setStats] = useState(() => engine.getStats());
  const [beladyResult, setBeladyResult] = useState(() =>
    engine.getBeladyAnalysis(2, 6)
  );

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [activePresetId, setActivePresetId] = useState<string>(
    REPLACEMENT_PRESETS[0].id
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to synchronize React states with engine
  const syncWithEngine = useCallback(() => {
    setReferenceString(engine.getReferenceString());
    setFrameCount(engine.getFrameCount());
    setCurrentStepIndex(engine.getCurrentStepIndex());
    setFifoFrames(engine.getFifoFrames());
    setLruFrames(engine.getLruFrames());
    setHistory(engine.getHistory());
    setStats(engine.getStats());
    setBeladyResult(engine.getBeladyAnalysis(2, 6));
  }, [engine]);

  // Stepping controls
  const handleStepForward = useCallback(() => {
    const step = engine.stepForward();
    if (!step) {
      setIsPlaying(false);
    }
    syncWithEngine();
  }, [engine, syncWithEngine]);

  const handleStepBackward = () => {
    engine.stepBackward();
    syncWithEngine();
  };

  const handleReset = () => {
    setIsPlaying(false);
    engine.reset();
    syncWithEngine();
  };

  const handleJumpToEnd = () => {
    setIsPlaying(false);
    engine.stepTo(referenceString.length - 1);
    syncWithEngine();
  };

  const handleSelectStep = (targetIndex: number) => {
    setIsPlaying(false);
    engine.stepTo(targetIndex);
    syncWithEngine();
  };

  const handleTogglePlay = () => {
    if (!engine.canStepForward() && !isPlaying) {
      // Loop or restart if at end
      engine.reset();
      syncWithEngine();
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const handleApplyConfig = (pages: number[], frames: number) => {
    setIsPlaying(false);
    setActivePresetId('');
    engine.setFrameCount(frames);
    engine.setReferenceString(pages);
    syncWithEngine();
  };

  const handleSelectPreset = (presetId: string) => {
    setIsPlaying(false);
    setActivePresetId(presetId);
    engine.loadPreset(presetId);
    syncWithEngine();
  };

  // Playback timer effect
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(100, Math.round(1000 / playbackSpeed));
      timerRef.current = setInterval(() => {
        if (engine.canStepForward()) {
          handleStepForward();
        } else {
          setIsPlaying(false);
        }
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, engine, handleStepForward]);

  const currentStep =
    currentStepIndex >= 0 && currentStepIndex < history.length
      ? history[currentStepIndex]
      : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)] transition-colors"
            title="Return to Studio Overview"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-accent-warning)]/15 text-[var(--color-accent-warning)] flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text-main)]">
                FIFO & LRU Page Replacement Studio
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--color-accent-warning)]/15 text-[var(--color-accent-warning)] border border-[var(--color-accent-warning)]/30">
                v0.5.0 Live
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Dual algorithmic execution engine with step-by-step frame matrix and Belady's Anomaly verification
            </p>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            FIFO Queue
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            LRU Stack
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Belady Detector
          </span>
        </div>
      </div>

      {/* 2. Controls and Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ReplacementInputCard
            referenceString={referenceString}
            frameCount={frameCount}
            onApply={handleApplyConfig}
            onSelectPreset={handleSelectPreset}
            activePresetId={activePresetId}
            disabled={isPlaying}
          />
        </div>
        <div className="lg:col-span-5 flex flex-col justify-between">
          <ReplacementControls
            currentStepIndex={currentStepIndex}
            totalSteps={referenceString.length}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
            onJumpToEnd={handleJumpToEnd}
            onSpeedChange={setPlaybackSpeed}
            canStepForward={engine.canStepForward()}
            canStepBackward={engine.canStepBackward()}
          />

          <div className="mt-4 p-4 rounded-2xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-elevated)] text-xs text-[var(--color-text-muted)] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text-main)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-warning)]" />
              <span>Comparative Principles:</span>
            </div>
            <p className="leading-relaxed">
              • <strong>FIFO:</strong> Simplest hardware implementation (circular buffer/queue). Subject to Belady's Anomaly.
            </p>
            <p className="leading-relaxed">
              • <strong>LRU:</strong> Optimal approximation algorithm. Requires hardware counters or stack registers. Guaranteed immune to Belady's Anomaly.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Side-by-Side Dual Frame Matrix & Step Trace */}
      <SideBySideFrameMatrix
        referenceString={referenceString}
        currentStepIndex={currentStepIndex}
        frameCount={frameCount}
        fifoFrames={fifoFrames}
        lruFrames={lruFrames}
        history={history}
        onSelectStep={handleSelectStep}
      />

      {/* 4. Telemetry and Belady's Anomaly Analyzer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ReplacementTelemetry stats={stats} currentStep={currentStep} />
        </div>
        <div className="lg:col-span-5">
          <BeladyAnomalyCard
            detection={beladyResult}
            currentFrameCount={frameCount}
          />
        </div>
      </div>
    </div>
  );
};
