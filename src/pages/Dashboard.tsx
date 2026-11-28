import React from 'react';
import { 
  Cpu, 
  Layers, 
  Split, 
  HardDrive, 
  RefreshCw, 
  Maximize2, 
  ArrowRight, 
  BarChart3,
  Sparkles, 
  CheckCircle2, 
  Activity,
  Server
} from 'lucide-react';
import type { NavModule } from '../components/layout/Header';

interface DashboardProps {
  onNavigate: (module: NavModule) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const modules = [
    {
      id: 'paging' as NavModule,
      title: 'Paging Simulator',
      version: 'v0.2.0',
      description: 'Fixed-size memory partitioning. Translate logical addresses (p, d) to physical hardware frames (f, d) with an interactive Page Table inspector.',
      icon: Layers,
      color: 'var(--color-accent-primary)',
      topics: ['Logical to Physical Mapping', 'Page Table Entries', 'Frame Allocation Matrix', 'Internal Fragmentation'],
      status: 'Live Simulator'
    },
    {
      id: 'segmentation' as NavModule,
      title: 'Segmentation Simulator',
      version: 'v0.3.0',
      description: 'Variable-size logical memory chunks (Code, Data, Stack, Heap). Visualizes Base and Limit registers with live memory protection trap triggers.',
      icon: Split,
      color: 'var(--color-accent-secondary)',
      topics: ['Segment Table (Base/Limit)', 'Address Translation', 'Memory Protection Violation', 'External Fragmentation'],
      status: 'Live Simulator'
    },
    {
      id: 'virtual-memory' as NavModule,
      title: 'Virtual Memory & Page Faults',
      version: 'v0.4.0',
      description: 'Secondary storage (Swap Space) paging mechanism. Trace CPU memory references, track Dirty Bits, and observe page fault interrupt cycles.',
      icon: HardDrive,
      color: 'var(--color-accent-tertiary)',
      topics: ['Demand Paging', 'Page Fault Interrupt Handler', 'Valid/Invalid Bit', 'Secondary Storage Swap'],
      status: 'Live Simulator'
    },
    {
      id: 'replacement' as NavModule,
      title: 'FIFO & LRU Page Replacement',
      version: 'v0.5.0',
      description: 'Algorithmic benchmark between First-In First-Out (FIFO) and Least Recently Used (LRU) with step-by-step visual frame ribbons and hit-rate comparison.',
      icon: RefreshCw,
      color: 'var(--color-accent-warning)',
      topics: ['FIFO Queue Replacement', 'LRU Timestamp/Stack', 'Hit & Fault Ratios', 'Belady’s Anomaly Analysis'],
      status: 'Live Simulator'
    },
    {
      id: 'allocation' as NavModule,
      title: 'Dynamic Memory Allocation',
      version: 'v0.6.0',
      description: 'Continuous memory fit strategies: First Fit, Best Fit, and Worst Fit. Real-time visual comparison of memory hole allocation and coalescing.',
      icon: Maximize2,
      color: 'var(--color-accent-danger)',
      topics: ['First-Fit Algorithm', 'Best-Fit Algorithm', 'Worst-Fit Algorithm', 'Hole Coalescing'],
      status: 'Live Simulator'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Studio Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 sm:p-8 border border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface-elevated)] to-[var(--color-bg-muted)] shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-[var(--color-accent-primary)] opacity-10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-[var(--color-accent-secondary)] opacity-10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-bg-base)] text-[var(--color-accent-primary)] border border-[var(--color-border-medium)] mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Operating Systems Visual Laboratory</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-main)] mb-3">
            Dynamic Memory Management <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[var(--color-accent-primary)] via-[var(--color-accent-secondary)] to-[var(--color-accent-tertiary)] bg-clip-text text-transparent">
              Visualizer & Laboratory
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--color-text-muted)] leading-relaxed mb-6">
            An interactive simulator designed to demystify complex OS memory concepts. Step through address translations, visualize page table Lookups, analyze page faults, and benchmark FIFO vs. LRU replacement algorithms.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('paging')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-accent-primary)] hover:opacity-95 text-[var(--color-accent-contrast)] font-medium text-xs sm:text-sm shadow-lg shadow-[var(--color-accent-glow)] transition transform active:scale-95"
            >
              <span>Explore Paging Lab</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border-medium)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] font-medium text-xs sm:text-sm transition"
            >
              <BarChart3 className="w-4 h-4 text-[var(--color-accent-primary)]" />
              <span>Open Analytics</span>
            </button>
            <a
              href="#topology"
              className="px-4 py-2.5 rounded-xl border border-[var(--color-border-medium)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] text-xs sm:text-sm font-medium transition"
            >
              Inspect Memory Topology
            </a>
          </div>
        </div>
      </div>

      {/* Hardware Architecture Topology Bar */}
      <div id="topology" className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-subtle)] mb-1">
            <span>Primary RAM</span>
            <Server className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--color-text-main)]">
            64 <span className="text-xs text-[var(--color-text-muted)] font-normal">KB / 16 Frames</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">Simulated Physical RAM</p>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-subtle)] mb-1">
            <span>Virtual Address</span>
            <Cpu className="w-3.5 h-3.5 text-[var(--color-accent-secondary)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--color-text-main)]">
            16 <span className="text-xs text-[var(--color-text-muted)] font-normal">Bit Space</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">Logical address format</p>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-subtle)] mb-1">
            <span>Frame/Page Size</span>
            <Layers className="w-3.5 h-3.5 text-[var(--color-accent-tertiary)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--color-text-main)]">
            4 <span className="text-xs text-[var(--color-text-muted)] font-normal">KB Chunks</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">Configurable granular size</p>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-subtle)] mb-1">
            <span>Replacement</span>
            <Activity className="w-3.5 h-3.5 text-[var(--color-accent-warning)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--color-text-main)]">
            FIFO <span className="text-xs text-[var(--color-text-muted)] font-normal">& LRU</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">Dual comparison engine</p>
        </div>
      </div>

      {/* Modules Roadmap Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-main)]">
              Simulation Modules & Laboratory
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Structured progressive modules mapped to curriculum requirements
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--color-text-subtle)] bg-[var(--color-bg-surface-elevated)] px-2.5 py-1 rounded-md border border-[var(--color-border-subtle)]">
            v0.6.0 Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="group relative flex flex-col justify-between p-5 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:border-[var(--color-border-accent)] transition-all duration-200 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                      style={{ backgroundColor: `color-mix(in srgb, ${mod.color} 15%, transparent)` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: mod.color }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {mod.status === 'Live Simulator' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Live Lab
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                        {mod.version}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-[var(--color-text-main)] group-hover:text-[var(--color-accent-primary)] transition">
                    {mod.title}
                  </h3>

                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-2 mb-4">
                    {mod.description}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    {mod.topics.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-[var(--color-text-subtle)]">
                        <CheckCircle2 className="w-3 h-3 text-[var(--color-accent-tertiary)] flex-shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onNavigate(mod.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--color-bg-surface-elevated)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-main)] text-xs font-medium border border-[var(--color-border-subtle)] transition"
                >
                  <span>Enter {mod.title.split(' ')[0]} Lab</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Memory Hierarchy Graphic Ribbon */}
      <div className="p-6 rounded-2xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider mb-2">
          Memory Hierarchy Architecture Flow
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-6">
          Understanding speed, cost, and capacity trade-offs that drive Virtual Memory and Paging algorithms.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
            <div className="text-[10px] uppercase font-mono text-[var(--color-accent-primary)]">Layer 1</div>
            <div className="font-bold text-sm text-[var(--color-text-main)]">CPU Registers</div>
            <div className="text-[11px] text-[var(--color-text-muted)] mt-1">~1 ns • Bytes</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
            <div className="text-[10px] uppercase font-mono text-[var(--color-accent-secondary)]">Layer 2</div>
            <div className="font-bold text-sm text-[var(--color-text-main)]">L1/L2/L3 Caches</div>
            <div className="text-[11px] text-[var(--color-text-muted)] mt-1">2-10 ns • Megabytes</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-bg-surface-elevated)] border-2 border-[var(--color-accent-primary)]">
            <div className="text-[10px] uppercase font-mono text-[var(--color-accent-primary)] font-bold">Focus: Layer 3</div>
            <div className="font-bold text-sm text-[var(--color-text-main)]">Physical RAM</div>
            <div className="text-[11px] text-[var(--color-text-muted)] mt-1">50-100 ns • Gigabytes</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
            <div className="text-[10px] uppercase font-mono text-[var(--color-accent-warning)]">Focus: Layer 4</div>
            <div className="font-bold text-sm text-[var(--color-text-main)]">Swap / Disk Space</div>
            <div className="text-[11px] text-[var(--color-text-muted)] mt-1">1-10 ms • Terabytes</div>
          </div>
        </div>
      </div>

    </div>
  );
};
