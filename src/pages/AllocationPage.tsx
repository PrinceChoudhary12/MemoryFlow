import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Maximize2, Sparkles } from 'lucide-react';
import {
  AllocationEngine,
  ALLOCATION_PRESETS,
} from '../core/allocation/allocationEngine';
import type { AllocationOperation } from '../core/allocation/types';
import { AllocationInputCard } from '../components/allocation/AllocationInputCard';
import { AllocationControls } from '../components/allocation/AllocationControls';
import { PartitionMemoryMap } from '../components/allocation/PartitionMemoryMap';
import { AllocationComparisonBoard } from '../components/allocation/AllocationComparisonBoard';
import { AllocationTelemetry } from '../components/allocation/AllocationTelemetry';

interface AllocationPageProps {
  onBack: () => void;
}

export const AllocationPage: React.FC<AllocationPageProps> = ({ onBack }) => {
  const [engine] = useState(() => new AllocationEngine(ALLOCATION_PRESETS[0]));

  const [snapshot, setSnapshot] = useState(() => engine.getState());
  const [operations, setOperations] = useState(() => engine.getOperations());
  const [minHoleThresholdKb, setMinHoleThresholdKb] = useState(() =>
    engine.getMinHoleThresholdKb()
  );
  const [activeProcesses, setActiveProcesses] = useState(() =>
    engine.getActiveProcessSummary()
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [activePresetId, setActivePresetId] = useState(ALLOCATION_PRESETS[0].id);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncWithEngine = useCallback(() => {
    setSnapshot(engine.getState());
    setOperations(engine.getOperations());
    setMinHoleThresholdKb(engine.getMinHoleThresholdKb());
    setActiveProcesses(engine.getActiveProcessSummary());
  }, [engine]);

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
    engine.stepTo(operations.length - 1);
    syncWithEngine();
  };

  const handleSelectStep = (targetIndex: number) => {
    setIsPlaying(false);
    engine.stepTo(targetIndex);
    syncWithEngine();
  };

  const handleTogglePlay = () => {
    if (!engine.canStepForward() && !isPlaying) {
      engine.reset();
      syncWithEngine();
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSelectPreset = (presetId: string) => {
    setIsPlaying(false);
    setActivePresetId(presetId);
    engine.loadPreset(presetId);
    syncWithEngine();
  };

  const handleApplyStream = (ops: AllocationOperation[], thresholdKb: number) => {
    setIsPlaying(false);
    setActivePresetId('');
    engine.configureCustom({
      operations: ops,
      minHoleThresholdKb: thresholdKb,
    });
    syncWithEngine();
  };

  const handleSubmitOperation = (op: AllocationOperation) => {
    setIsPlaying(false);
    setActivePresetId('');
    engine.submitOperation(op);
    syncWithEngine();
  };

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(120, Math.round(1000 / playbackSpeed));
      timerRef.current = setInterval(() => {
        if (engine.canStepForward()) {
          handleStepForward();
        } else {
          setIsPlaying(false);
        }
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, engine, handleStepForward]);

  const currentTriple =
    snapshot.stepIndex >= 0 && snapshot.stepIndex < snapshot.history.length
      ? snapshot.history[snapshot.stepIndex]
      : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Header Banner */}
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
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-accent-danger)]/15 text-[var(--color-accent-danger)] flex items-center justify-center">
                <Maximize2 className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text-main)]">
                Dynamic Memory Allocation Studio
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--color-accent-danger)]/15 text-[var(--color-accent-danger)] border border-[var(--color-accent-danger)]/30">
                v0.6.0 Live
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Synchronized First-Fit, Best-Fit, and Worst-Fit partition splitting, coalescing, and fragmentation lab
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            First-Fit
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Best-Fit
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Worst-Fit
          </span>
        </div>
      </div>

      {/* Config & Playback Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <AllocationInputCard
            operations={operations}
            minHoleThresholdKb={minHoleThresholdKb}
            activePresetId={activePresetId}
            activeProcesses={activeProcesses}
            onSelectPreset={handleSelectPreset}
            onApplyStream={handleApplyStream}
            onSubmitOperation={handleSubmitOperation}
            disabled={isPlaying}
          />
        </div>
        <div className="lg:col-span-5 flex flex-col justify-between">
          <AllocationControls
            currentStepIndex={snapshot.stepIndex}
            totalSteps={operations.length}
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
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-danger)]" />
              <span>Fragmentation Formulas:</span>
            </div>
            <p className="leading-relaxed font-mono text-[11px]">
              • <strong>External Frag:</strong> Total Free − Largest Hole
            </p>
            <p className="leading-relaxed font-mono text-[11px]">
              • <strong>Internal Frag:</strong> Σ (Allocated Size − Requested Size)
            </p>
          </div>
        </div>
      </div>

      {/* Three-Way Partition Maps */}
      <PartitionMemoryMap
        firstFit={snapshot.firstFit}
        bestFit={snapshot.bestFit}
        worstFit={snapshot.worstFit}
        currentSteps={
          currentTriple
            ? {
                firstFit: currentTriple.firstFit,
                bestFit: currentTriple.bestFit,
                worstFit: currentTriple.worstFit,
              }
            : undefined
        }
        onDeallocateProcess={(pid) =>
          handleSubmitOperation({ type: 'DEALLOCATE', processId: pid })
        }
      />

      {/* Strategy Benchmark & Diagnostic Telemetry */}
      <AllocationComparisonBoard
        firstFit={snapshot.firstFit}
        bestFit={snapshot.bestFit}
        worstFit={snapshot.worstFit}
      />

      <AllocationTelemetry
        operations={operations}
        currentStepIndex={snapshot.stepIndex}
        history={snapshot.history}
        onSelectStep={handleSelectStep}
      />
    </div>
  );
};
