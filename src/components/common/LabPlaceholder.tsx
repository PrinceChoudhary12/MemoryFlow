import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Clock, Terminal, Cpu } from 'lucide-react';

interface LabPlaceholderProps {
  title: string;
  version: string;
  targetRelease: string;
  icon: LucideIcon;
  color: string;
  summary: string;
  plannedFeatures: { title: string; description: string }[];
  technicalEquations?: { label: string; formula: string }[];
  onBack: () => void;
}

export const LabPlaceholder: React.FC<LabPlaceholderProps> = ({
  title,
  version,
  targetRelease,
  icon: Icon,
  color,
  summary,
  plannedFeatures,
  technicalEquations,
  onBack,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview Studio</span>
        </button>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-subtle)]">
          Roadmap Stage: {version}
        </span>
      </div>

      {/* Header Studio Card */}
      <div className="p-6 sm:p-8 rounded-2xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
            >
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{title}</h1>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--color-bg-muted)] text-[var(--color-accent-primary)] border border-[var(--color-border-medium)]">
                  {version}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{summary}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-medium)] text-xs text-[var(--color-text-muted)]">
            <Clock className="w-3.5 h-3.5 text-[var(--color-accent-warning)]" />
            <span>Target Milestone: <strong className="text-[var(--color-text-main)]">{targetRelease}</strong></span>
          </div>
        </div>
      </div>

      {/* Technical Blueprint Equations (if any) */}
      {technicalEquations && technicalEquations.length > 0 && (
        <div className="p-5 rounded-xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-subtle)] mb-3 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
            Mathematical & OS Formulation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {technicalEquations.map((eq, i) => (
              <div key={i} className="p-3 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
                <div className="text-[11px] text-[var(--color-text-muted)] mb-1">{eq.label}</div>
                <div className="font-mono text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-bg-base)] p-2 rounded border border-[var(--color-border-subtle)]">
                  {eq.formula}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planned Feature Architecture */}
      <div className="p-6 rounded-2xl glass-panel border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[var(--color-accent-primary)]" />
          Planned Simulation Engine Features
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plannedFeatures.map((feat, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2 font-semibold text-xs text-[var(--color-text-main)] mb-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>
                {feat.title}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
