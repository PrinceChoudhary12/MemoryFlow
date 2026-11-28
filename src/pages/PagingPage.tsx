import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers, ArrowLeft } from 'lucide-react';
import { PagingEngine, DEFAULT_PAGING_CONFIG } from '../core/paging/pagingEngine';
import { PagingControls } from '../components/paging/PagingControls';
import { PAGING_PRESETS } from '../components/paging/pagingPresets';
import { AddressInputCard } from '../components/paging/AddressInputCard';
import { BitSplitter } from '../components/paging/BitSplitter';
import { PageTableView } from '../components/paging/PageTableView';
import { FrameGrid } from '../components/paging/FrameGrid';
import { PagingTelemetry } from '../components/paging/PagingTelemetry';
import { SimulationAnnouncement } from '../components/common/SimulationAnnouncement';
import { calculateGeometry } from '../core/paging/addressTranslator';
import type { PagingConfig } from '../core/paging/types';
import { useAnalytics } from '../context/AnalyticsContext';

interface PagingPageProps {
  onBack: () => void;
}

export const PagingPage: React.FC<PagingPageProps> = ({ onBack }) => {
  const { captureSnapshot } = useAnalytics();
  // Create one stable engine instance with its default locality stream
  const [engine] = useState(() => {
    const instance = new PagingEngine(DEFAULT_PAGING_CONFIG);
    instance.setReferenceStream(PAGING_PRESETS[0].stream);
    return instance;
  });

  // React state mirroring engine for UI re-rendering
  const [config, setConfig] = useState<PagingConfig>(() => engine.getConfig());
  const [pageTable, setPageTable] = useState(() => engine.getPageTable());
  const [physicalFrames, setPhysicalFrames] = useState(() => engine.getPhysicalFrames());
  const [stats, setStats] = useState(() => engine.getStats());
  const [history, setHistory] = useState(() => engine.getHistory());
  const [currentStep, setCurrentStep] = useState(() => engine.getCurrentStep());

  // Interactive controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [activePreset, setActivePreset] = useState('locality');
  const [isStreamMode, setIsStreamMode] = useState(false);
  const [streamText, setStreamText] = useState(() => PAGING_PRESETS[0].stream.join(', '));

  const geometry = useMemo(() => calculateGeometry(config), [config]);

  // Sync React state from engine
  const syncWithEngine = useCallback(() => {
    setPageTable(engine.getPageTable());
    setPhysicalFrames(engine.getPhysicalFrames());
    setStats(engine.getStats());
    setHistory(engine.getHistory());
    setCurrentStep(engine.getCurrentStep());
    void captureSnapshot(engine);
  }, [captureSnapshot, engine]);

  useEffect(() => {
    void captureSnapshot(engine);
  }, [engine, captureSnapshot]);

  // Handle single address translation
  const handleTranslateSingle = (inputAddress: string) => {
    engine.translateAddress(inputAddress);
    syncWithEngine();
  };

  // Handle step forward
  const handleStepForward = () => {
    const step = engine.stepForward();
    if (!step) {
      setIsPlaying(false);
    }
    syncWithEngine();
  };

  // Handle step backward (100% reversible history)
  const handleStepBackward = () => {
    engine.stepBackward();
    syncWithEngine();
  };

  // Handle reset
  const handleReset = () => {
    setIsPlaying(false);
    engine.reset();
    syncWithEngine();
  };

  // Handle config changes
  const handleUpdateConfig = (newConfig: PagingConfig) => {
    setIsPlaying(false);
    engine.setConfig(newConfig);
    setConfig(newConfig);
    syncWithEngine();
  };

  // Handle preset selection
  const handleSelectPreset = (presetId: string) => {
    const preset = PAGING_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsPlaying(false);
    setActivePreset(presetId);
    setStreamText(preset.stream.join(', '));
    engine.reset();
    engine.setReferenceStream(preset.stream);
    syncWithEngine();
  };

  // Handle manual stream text updates
  const handleUpdateStream = (newStreamText: string) => {
    setIsPlaying(false);
    setStreamText(newStreamText);
    const parsedArray = newStreamText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    engine.reset();
    engine.setReferenceStream(parsedArray);
    setActivePreset('custom');
    syncWithEngine();
  };

  // Auto-playback loop
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
  }, [engine, isPlaying, playbackSpeed, syncWithEngine]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SimulationAnnouncement
        message={currentStep
          ? `Paging step ${currentStep.stepNumber}: ${currentStep.status} for address ${currentStep.rawInput}.`
          : ''}
      />
      
      {/* Top Breadcrumb & Studio Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview Studio</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-accent-primary)] font-semibold">
            Milestone v0.2.0 Active
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Interactive Hardware Lab
          </span>
        </div>
      </div>

      {/* Main Workbench Card Header */}
      <div className="p-6 rounded-2xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--color-accent-primary)]/15 shadow-lg text-[var(--color-accent-primary)]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
                  Paging Simulator & Address Translation Lab
                </h1>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--color-bg-muted)] text-[var(--color-accent-primary)] border border-[var(--color-border-medium)]">
                  v0.2.0
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Translate logical addresses (p, d) to physical hardware frames (f, d) with real-time page table lookups and fault interrupts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Playback Control Ribbon */}
      <PagingControls
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

      {/* 3-Column Laboratory Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Input Console & Config (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          <AddressInputCard
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onTranslateSingle={handleTranslateSingle}
            onUpdateStream={handleUpdateStream}
            currentStreamText={streamText}
            isStreamMode={isStreamMode}
            onToggleMode={setIsStreamMode}
          />
        </div>

        {/* Center Column: Bit Splitter & Page Table / RAM Frame Grid (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <BitSplitter
            currentStep={currentStep}
            offsetBits={geometry.offsetBits}
            pageBits={geometry.pageBits}
          />

          <div className="grid grid-cols-1 gap-5">
            <PageTableView
              pageTable={pageTable}
              currentStep={currentStep}
            />

            <FrameGrid
              physicalFrames={physicalFrames}
              currentStep={currentStep}
              pageSizeKb={config.pageSizeKb}
            />
          </div>
        </div>

        {/* Right Column: Telemetry, Math Formulation & Event Trace (3 Cols) */}
        <div className="lg:col-span-3 space-y-5">
          <PagingTelemetry
            stats={stats}
            currentStep={currentStep}
            history={history}
            config={config}
          />
        </div>

      </div>

    </div>
  );
};
