import React from 'react';
import { Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] py-8 px-4 lg:px-8 mt-auto text-xs text-[var(--color-text-muted)]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left Branding & CA2 Specs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-bg-muted)] border border-[var(--color-border-medium)]">
            <Cpu className="w-4 h-4 text-[var(--color-accent-primary)]" />
          </div>
          <div>
            <div className="font-semibold text-[var(--color-text-main)] flex items-center gap-2">
              MemoryFlow
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-bg-muted)] text-[var(--color-text-subtle)] font-mono">
                CA2 Operating Systems Visualizer
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-subtle)]">
              Built with React 19, TypeScript, Vite, Tailwind CSS & Vitest
            </p>
          </div>
        </div>

        {/* Center Syllabus Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)]"></span>
            Paging & Frames
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-secondary)]"></span>
            Segmentation
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-tertiary)]"></span>
            Virtual Memory & Faults
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-warning)]"></span>
            FIFO & LRU Replacement
          </span>
        </div>

        {/* Right Author & Student Credits */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] font-medium text-[var(--color-text-main)]">
              Prince Choudhary
            </div>
            <div className="text-[10px] text-[var(--color-text-subtle)] font-mono">
              Branch: main • Release v0.1.0
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] flex items-center justify-center text-white font-bold text-xs shadow-sm">
            PC
          </div>
        </div>

      </div>
    </footer>
  );
};
