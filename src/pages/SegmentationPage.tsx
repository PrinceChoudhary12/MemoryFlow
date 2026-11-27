import React, { useState, useEffect, useCallback } from 'react';
import { Split, ArrowLeft } from 'lucide-react';
import { SegmentationEngine, DEFAULT_SEGMENTATION_CONFIG, DEFAULT_SEGMENTS } from '../core/segmentation/segmentationEngine';
import { parseAddressStream } from '../core/segmentation/segmentationTranslator';
import { SegmentationControls, SEGMENTATION_PRESETS } from '../components/segmentation/SegmentationControls';
import { SegmentInputCard } from '../components/segmentation/SegmentInputCard';
import { SegmentTableView } from '../components/segmentation/SegmentTableView';
import { PhysicalMemoryMap } from '../components/segmentation/PhysicalMemoryMap';
import { SegmentationTelemetry } from '../components/segmentation/SegmentationTelemetry';
import type { SegmentationConfig, Segment } from '../core/segmentation/types';
import { useAnalytics } from '../context/AnalyticsContext';

interface SegmentationPageProps {
  onBack: () => void;
}

export const SegmentationPage: React.FC<SegmentationPageProps> = ({ onBack }) => {
  const { captureSnapshot } = useAnalytics();
  const [engine] = useState(() => {
    const eng = new SegmentationEngine(DEFAULT_SEGMENTATION_CONFIG, DEFAULT_SEGMENTS);
    eng.setReferenceStream(SEGMENTATION_PRESETS[0].stream);
    return eng;
  });

  // React state reflecting engine state
  const [config, setConfig] = useState<SegmentationConfig>(() => engine.getConfig());
  const [segments, setSegments] = useState(() => engine.getSegments());
  const [memoryBlocks, setMemoryBlocks] = useState(() => engine.getMemoryMap());
  const [stats, setStats] = useState(() => engine.getStats());
  const [history, setHistory] = useState(() => engine.getHistory());
  const [currentStep, setCurrentStep] = useState(() => engine.getCurrentStep());

  // Interactive controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [activePreset, setActivePreset] = useState('typical');
  const [isStreamMode, setIsStreamMode] = useState(false);
  const [streamText, setStreamText] = useState(() => SEGMENTATION_PRESETS[0].stream.join(', '));

  const syncWithEngine = useCallback(() => {
    setSegments(engine.getSegments());
    setMemoryBlocks(engine.getMemoryMap());
    setStats(engine.getStats());
    setHistory(engine.getHistory());
    setCurrentStep(engine.getCurrentStep());
    void captureSnapshot(engine);
  }, [engine, captureSnapshot]);

  useEffect(() => {
    void captureSnapshot(engine);
  }, [engine, captureSnapshot]);

  const handleTranslateSingle = (inputAddress: string) => {
    engine.translateAddress(inputAddress);
    syncWithEngine();
  };

  const handleStepForward = () => {
    const step = engine.stepForward();
    if (!step) {
      setIsPlaying(false);
    }
    syncWithEngine();
  };

  const handleStepBackward = () => {
    engine.stepBackward();
    syncWithEngine();
  };

  const handleReset = () => {
    setIsPlaying(false);
    engine.reset();
    syncWithEngine();
  };

  const handleUpdateConfig = (newConfig: SegmentationConfig) => {
    setIsPlaying(false);
    engine.setConfig(newConfig);
    setConfig(newConfig);
    syncWithEngine();
  };

  const handleAddSegment = (newSegment: Omit<Segment, 'accessCount'>) => {
    const result = engine.addSegment(newSegment);
    if (result.success) {
      syncWithEngine();
    }
    return result;
  };

  const handleUpdateSegment = (id: number, updates: Partial<Omit<Segment, 'id'>>) => {
    const result = engine.updateSegment(id, updates);
    if (result.success) {
      syncWithEngine();
    }
    return result;
  };

  const handleRemoveSegment = (id: number) => {
    engine.removeSegment(id);
    syncWithEngine();
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = SEGMENTATION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsPlaying(false);
    setActivePreset(presetId);
    setStreamText(preset.stream.join(', '));
    engine.reset();
    engine.setReferenceStream(preset.stream);
    syncWithEngine();
  };

  const handleUpdateStream = (newStreamText: string) => {
    setIsPlaying(false);
    setStreamText(newStreamText);
    const parsedArray = parseAddressStream(newStreamText);
    engine.reset();
    engine.setReferenceStream(parsedArray);
    setActivePreset('custom');
    syncWithEngine();
  };

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.round(1500 / playbackSpeed);
    const timer = setInterval(() => {
      if (engine.canStepForward()) {
        engine.stepForward();
        syncWithEngine();
      } else {
        setIsPlaying(false);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, engine, syncWithEngine]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview Studio</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-accent-secondary)] font-semibold">
            Milestone v0.3.0 Active
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Hardware Protection Lab
          </span>
        </div>
      </div>

      {/* Main Studio Card Header */}
      <div className="p-6 rounded-2xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--color-accent-secondary)]/15 shadow-lg text-[var(--color-accent-secondary)]">
              <Split className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
                  Segmentation Simulator & Memory Protection Lab
                </h1>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--color-bg-muted)] text-[var(--color-accent-secondary)] border border-[var(--color-border-medium)]">
                  v0.3.0
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Logical memory partitions (Code, Data, Stack, Heap) mapped to physical RAM with Base & Limit registers and Segmentation Fault traps.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Ribbon */}
      <SegmentationControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onStepForward={handleStepForward}
        onStepBackward={handleStepBackward}
        onReset={handleReset}
        canStepForward={engine.canStepForward()}
        canStepBackward={engine.canStepBackward()}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        onSelectPreset={handleSelectPreset}
        activePreset={activePreset}
      />

      {/* 3-Column Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Input Console & Config (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          <SegmentInputCard
            config={config}
            segments={segments}
            onUpdateConfig={handleUpdateConfig}
            onTranslateSingle={handleTranslateSingle}
            onUpdateStream={handleUpdateStream}
            onAddSegment={handleAddSegment}
            currentStreamText={streamText}
            isStreamMode={isStreamMode}
            onToggleMode={setIsStreamMode}
          />
        </div>

        {/* Center Column: Segment Table & Physical RAM Map (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <SegmentTableView
            segments={segments}
            currentStep={currentStep}
            onRemoveSegment={handleRemoveSegment}
            onUpdateSegment={handleUpdateSegment}
          />

          <PhysicalMemoryMap
            memoryBlocks={memoryBlocks}
            currentStep={currentStep}
            ramSizeKb={config.ramSizeKb}
          />
        </div>

        {/* Right Column: Telemetry, Protection Math & Event Trace (3 Cols) */}
        <div className="lg:col-span-3 space-y-5">
          <SegmentationTelemetry
            stats={stats}
            currentStep={currentStep}
            history={history}
          />
        </div>

      </div>

    </div>
  );
};
