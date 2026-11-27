import React from 'react';
import { Calculator, Gauge, Clock, Zap, AlertTriangle } from 'lucide-react';
import type { VirtualMemoryStats, VirtualMemoryConfig } from '../../core/virtualMemory/types';
import { formatLatency } from '../../core/virtualMemory/eatCalculator';

interface EatMetricsCardProps {
  stats: VirtualMemoryStats;
  config: VirtualMemoryConfig;
  onUpdateLatency: (ramNs: number, faultMs: number) => void;
}

export const EatMetricsCard: React.FC<EatMetricsCardProps> = ({
  stats,
  config,
  onUpdateLatency,
}) => {
  const p = stats.pageFaultRate / 100; // 0.0 to 1.0
  const ramTimeNs = config.memoryAccessTimeNs;
  const faultTimeNs = config.pageFaultServiceTimeNs;
  const faultTimeMs = Math.round(faultTimeNs / 1_000_000);

  // Slowdown factor
  const slowdownRatio = (stats.effectiveAccessTimeNs / Math.max(1, ramTimeNs)).toFixed(1);

  return (
    <div className="glass-panel p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col h-full space-y-4">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[var(--color-accent-primary)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">
            Effective Access Time (EAT)
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-accent-primary)] font-bold">
          EAT: {stats.eatFormatted}
        </span>
      </div>

      {/* Main EAT Metric Display */}
      <div className="p-3.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[var(--color-text-subtle)] font-mono flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[var(--color-accent-warning)]" />
            Performance Degradation
          </span>
          <span className="text-xs font-bold font-mono text-[var(--color-accent-warning)]">
            {slowdownRatio}x Slowdown
          </span>
        </div>

        <div className="text-2xl font-extrabold font-mono text-[var(--color-text-main)] tracking-tight">
          {stats.effectiveAccessTimeNs.toLocaleString()} <span className="text-xs font-normal text-[var(--color-text-muted)]">ns</span>
        </div>
        
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
          At a <strong>{stats.pageFaultRate}%</strong> page fault rate, memory access drops from {formatLatency(ramTimeNs)} to {stats.eatFormatted}.
        </p>
      </div>

      {/* Mathematical Formulation Breakdown */}
      <div className="space-y-2 text-xs font-mono">
        <div className="text-[10px] uppercase font-bold text-[var(--color-text-subtle)]">
          Mathematical Formulation
        </div>
        <div className="p-2.5 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-1">
          <div className="text-[11px] font-semibold text-[var(--color-accent-primary)]">
            EAT = (1 - p) * RAM_Time + p * Fault_Time
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            = (1 - {p.toFixed(3)}) * {ramTimeNs} ns + {p.toFixed(3)} * {faultTimeMs} ms
          </div>
          <div className="text-[10px] text-emerald-400 font-bold">
            = {stats.effectiveAccessTimeNs.toLocaleString()} ns ({stats.eatFormatted})
          </div>
        </div>
      </div>

      {/* Configurable Latency Sliders */}
      <div className="p-3 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-3">
        <div className="text-[10px] uppercase font-bold text-[var(--color-text-subtle)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[var(--color-accent-primary)]" />
            Latency Hardware Parameters
          </span>
        </div>

        {/* RAM Access Time Slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
            <label htmlFor="vm-ram-access-time" className="text-[var(--color-text-muted)] flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              RAM Access Time:
            </label>
            <span className="font-bold text-[var(--color-text-main)]">{ramTimeNs} ns</span>
          </div>
          <input
            id="vm-ram-access-time"
            type="range"
            min={50}
            max={300}
            step={10}
            value={ramTimeNs}
            onChange={(e) => onUpdateLatency(Number(e.target.value), faultTimeMs)}
            className="w-full accent-[var(--color-accent-primary)] cursor-pointer h-1.5 rounded-lg bg-[var(--color-bg-base)]"
          />
        </div>

        {/* Disk Service Time Slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
            <label htmlFor="vm-fault-service-time" className="text-[var(--color-text-muted)] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Page Fault Service Time:
            </label>
            <span className="font-bold text-[var(--color-text-main)]">{faultTimeMs} ms</span>
          </div>
          <input
            id="vm-fault-service-time"
            type="range"
            min={1}
            max={20}
            step={1}
            value={faultTimeMs}
            onChange={(e) => onUpdateLatency(ramTimeNs, Number(e.target.value))}
            className="w-full accent-[var(--color-accent-warning)] cursor-pointer h-1.5 rounded-lg bg-[var(--color-bg-base)]"
          />
        </div>
      </div>

      <div className="text-[10px] text-[var(--color-text-subtle)] font-mono flex items-center justify-between pt-1">
        <span>Dirty Page Overhead: +4 ms</span>
        <span>Pure Client Math</span>
      </div>
    </div>
  );
};
