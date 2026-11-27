import React, { useState, useEffect, useCallback } from 'react';
import { HardDrive, ArrowLeft } from 'lucide-react';
import { VirtualMemoryEngine, DEFAULT_VM_CONFIG } from '../core/virtualMemory/virtualMemoryEngine';
import { VirtualMemoryControls, VM_PRESETS } from '../components/virtualMemory/VirtualMemoryControls';
import { VirtualMemoryInputCard } from '../components/virtualMemory/VirtualMemoryInputCard';
import { VirtualMemoryViews } from '../components/virtualMemory/VirtualMemoryViews';
import { DiskPlatterView } from '../components/virtualMemory/DiskPlatterView';
import { InterruptCycleStepper } from '../components/virtualMemory/InterruptCycleStepper';
import { EatMetricsCard } from '../components/virtualMemory/EatMetricsCard';
import { VirtualMemoryTelemetry } from '../components/virtualMemory/VirtualMemoryTelemetry';
import { SimulationAnnouncement } from '../components/common/SimulationAnnouncement';
import type { VirtualMemoryConfig, AccessType } from '../core/virtualMemory/types';
import { useAnalytics } from '../context/AnalyticsContext';

interface VirtualMemoryPageProps {
  onBack: () => void;
}

export const VirtualMemoryPage: React.FC<VirtualMemoryPageProps> = ({ onBack }) => {
  const { captureSnapshot } = useAnalytics();
  const [engine] = useState(() => {
    const eng = new VirtualMemoryEngine(DEFAULT_VM_CONFIG);
    eng.setReferenceStream(VM_PRESETS[0].stream);
    return eng;
  });

  // React state reflecting engine state
  const [config, setConfig] = useState<VirtualMemoryConfig>(() => engine.getConfig());
  const [pageTable, setPageTable] = useState(() => engine.getPageTable());
  const [physicalFrames, setPhysicalFrames] = useState(() => engine.getPhysicalFrames());
  const [swapDisk, setSwapDisk] = useState(() => engine.getSwapDisk());
  const [stats, setStats] = useState(() => engine.getStats());
  const [history, setHistory] = useState(() => engine.getHistory());
  const [currentStep, setCurrentStep] = useState(() => engine.getCurrentStep());

  // Interactive controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [activePreset, setActivePreset] = useState('locality');
  const [isStreamMode, setIsStreamMode] = useState(false);
  const [streamText, setStreamText] = useState(() => VM_PRESETS[0].stream.join(', '));

  const syncWithEngine = useCallback(() => {
    setPageTable(engine.getPageTable());
    setPhysicalFrames(engine.getPhysicalFrames());
    setSwapDisk(engine.getSwapDisk());
    setStats(engine.getStats());
    setHistory(engine.getHistory());
    setCurrentStep(engine.getCurrentStep());
    void captureSnapshot(engine);
  }, [engine, captureSnapshot]);

  useEffect(() => {
    void captureSnapshot(engine);
  }, [engine, captureSnapshot]);

  const handleTranslateSingle = (inputAddress: string, accessType: AccessType) => {
    engine.translateAddress(inputAddress, accessType);
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

  const handleUpdateConfig = (newConfig: VirtualMemoryConfig) => {
    setIsPlaying(false);
    engine.setConfig(newConfig);
    setConfig(newConfig);
    syncWithEngine();
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = VM_PRESETS.find((p) => p.id === presetId);
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
    const parsedArray = newStreamText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    engine.reset();
    engine.setReferenceStream(parsedArray);
    setActivePreset('custom');
    syncWithEngine();
  };

  const handleUpdateLatency = (ramNs: number, faultMs: number) => {
    const newConfig: VirtualMemoryConfig = {
      ...config,
      memoryAccessTimeNs: ramNs,
      pageFaultServiceTimeNs: faultMs * 1_000_000,
    };
    engine.setConfig(newConfig);
    setConfig(newConfig);
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
      <SimulationAnnouncement
        message={currentStep
          ? `Virtual memory step ${currentStep.stepNumber}: ${currentStep.status} for ${currentStep.accessType.toLowerCase()} of ${currentStep.rawInput}.`
          : ''}
      />
      
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
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-accent-tertiary)] font-semibold">
            Milestone v0.4.0 Active
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Demand Paging & Backing Store Lab
          </span>
        </div>
      </div>

      {/* Main Studio Card Header */}
      <div className="p-6 rounded-2xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--color-accent-tertiary)]/15 shadow-lg text-[var(--color-accent-tertiary)]">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
                  Virtual Memory & Demand Paging Lab
                </h1>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--color-bg-muted)] text-[var(--color-accent-tertiary)] border border-[var(--color-border-medium)]">
                  v0.4.0
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Demand paging execution cycle, secondary swap storage backing store, Valid/Invalid and Dirty bit mechanics, and Effective Access Time (EAT) latency modeling.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Ribbon */}
      <VirtualMemoryControls
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
        
        {/* Left Column: Input Console & Interrupt Stepper (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          <VirtualMemoryInputCard
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onTranslateSingle={handleTranslateSingle}
            onUpdateStream={handleUpdateStream}
            currentStreamText={streamText}
            isStreamMode={isStreamMode}
            onToggleMode={setIsStreamMode}
          />

          <InterruptCycleStepper currentStep={currentStep} />
        </div>

        {/* Center Column: Page Table, RAM Frames & Swap Disk (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <VirtualMemoryViews
            pageTable={pageTable}
            physicalFrames={physicalFrames}
            currentStep={currentStep}
            pageSizeKb={config.pageSizeKb}
          />

          <DiskPlatterView
            swapDisk={swapDisk}
            currentStep={currentStep}
          />
        </div>

        {/* Right Column: Telemetry & EAT Calculator (3 Cols) */}
        <div className="lg:col-span-3 space-y-5">
          <VirtualMemoryTelemetry
            stats={stats}
            currentStep={currentStep}
            history={history}
          />

          <EatMetricsCard
            stats={stats}
            config={config}
            onUpdateLatency={handleUpdateLatency}
          />
        </div>

      </div>

    </div>
  );
};
