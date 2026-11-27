import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileJson, FileSpreadsheet, Printer } from 'lucide-react';
import {
  compareSnapshotCompatibility,
  downloadAnalyticsFile,
  prepareChartGroups,
  runBenchmarkSuite,
  type AnalyticsSnapshot,
  type AnalyticsLabId,
} from '../core/analytics';
import type { AnalyticsReports } from '../context/AnalyticsContext';
import { AnalyticsBarChart } from '../components/analytics/AnalyticsBarChart';
import './AnalyticsPage.css';

interface AnalyticsPageProps {
  reports: AnalyticsReports;
  captureError: string | null;
}

const LAB_LABELS: Record<AnalyticsLabId, string> = {
  paging: 'Paging',
  segmentation: 'Segmentation',
  'virtual-memory': 'Virtual Memory',
  replacement: 'FIFO / LRU Replacement',
  allocation: 'Dynamic Allocation',
};

function sourceLabel(snapshot: AnalyticsSnapshot): string {
  return snapshot.source.type === 'benchmark'
    ? `Benchmark — ${snapshot.source.benchmarkName}`
    : 'Current simulation';
}

function reportTitle(snapshot: AnalyticsSnapshot): string {
  return `${snapshot.labName} — ${sourceLabel(snapshot)}`;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function printHistorySummary(
  snapshot: AnalyticsSnapshot,
  index: number
): { input: string; result: string } {
  switch (snapshot.labId) {
    case 'paging': {
      const step = snapshot.history[index];
      return {
        input: step.rawInput,
        result: `${step.status}${step.physicalAddressHex ? ` — physical ${step.physicalAddressHex}` : ''}`,
      };
    }
    case 'segmentation': {
      const step = snapshot.history[index];
      return {
        input: step.rawInput,
        result: `${step.status}${step.physicalAddressHex ? ` — physical ${step.physicalAddressHex}` : ''}`,
      };
    }
    case 'virtual-memory': {
      const step = snapshot.history[index];
      return {
        input: step.rawInput,
        result: `${step.status}${step.physicalAddressHex ? ` — physical ${step.physicalAddressHex}` : ''}${
          step.victimPage ? ` — evicted page ${step.victimPage.pageNumber}` : ''
        }`,
      };
    }
    case 'replacement': {
      const step = snapshot.history[index];
      return {
        input: `Page ${step.pageNumber}`,
        result: `FIFO ${step.fifo.status}${step.fifo.victimPage === null ? '' : ` (evicted ${step.fifo.victimPage})`}; LRU ${step.lru.status}${step.lru.victimPage === null ? '' : ` (evicted ${step.lru.victimPage})`}`,
      };
    }
    case 'allocation': {
      const step = snapshot.history[index];
      const operation = step.operation;
      const outcomes = [step.firstFit, step.bestFit, step.worstFit].map((result) =>
        result.success
          ? `${result.strategy}: success`
          : `${result.strategy}: ${result.failureReason ?? 'failed'}`
      );
      return {
        input: operation.type === 'ALLOCATE'
          ? `Allocate ${operation.processId} (${operation.size ?? 0} KB)`
          : `Deallocate ${operation.processId}`,
        result: outcomes.join('; '),
      };
    }
  }
}

function ReportSummary({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">Configured inputs</div>
        <div className="font-mono text-sm text-[var(--color-text-main)]">
          {snapshot.workload.configuredCount}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">Processed events</div>
        <div className="font-mono text-sm text-[var(--color-text-main)]">
          {snapshot.workload.processedCount}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">Workload</div>
        <div className="text-sm text-[var(--color-text-main)]">{snapshot.workload.label}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">
          {snapshot.source.type === 'benchmark' ? 'Baseline' : 'Captured'}
        </div>
        <div className="text-sm text-[var(--color-text-main)]">{formatCreatedAt(snapshot.createdAt)}</div>
      </div>
    </div>
  );
}

function SnapshotCharts({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const charts = prepareChartGroups(snapshot);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {charts.map((chart) => <AnalyticsBarChart key={chart.id} chart={chart} />)}
    </div>
  );
}

function PrintableCharts({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  return (
    <div className="grid gap-3">
      {prepareChartGroups(snapshot).map((chart) => {
        const maximum = Math.max(1, ...chart.series.map((item) => item.value));
        const valuesLabel = chart.series
          .map((item) => `${item.label}: ${item.value} ${chart.unit}`)
          .join('; ');
        return (
          <section
            key={chart.id}
            className="analytics-print-chart rounded-lg border border-gray-300 p-3"
            role="img"
            aria-label={`${chart.title} bar chart. ${valuesLabel}`}
          >
            <h3 className="mb-2 font-semibold">{chart.title} ({chart.unit})</h3>
            <div className="space-y-2">
              {chart.series.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between gap-3 text-xs">
                    <span>{item.label}</span>
                    <span>{item.value} {chart.unit}</span>
                  </div>
                  <svg
                    className="analytics-print-chart-bars"
                    viewBox="0 0 100 8"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="0.5"
                      y="0.5"
                      width="99"
                      height="7"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="1"
                    />
                    {item.value > 0 && (
                      <rect
                        x="0.5"
                        y="0.5"
                        width={(99 * item.value) / maximum}
                        height="7"
                        fill={item.color}
                        stroke="#111827"
                        strokeWidth="1"
                      />
                    )}
                  </svg>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PrintReport({ snapshots }: { snapshots: AnalyticsSnapshot[] }) {
  return (
    <div
      className="analytics-print-report hidden p-6"
      role="region"
      aria-label="Printable analytics report"
    >
      <header className="mb-6 border-b border-gray-300 pb-4">
        <h1 className="text-2xl font-bold">MemoryFlow Analytics Report</h1>
        <p>{snapshots.length} simulation report(s)</p>
      </header>
      <div className="space-y-5">
        {snapshots.map((snapshot) => (
          <section key={snapshot.reportId} className="rounded-lg p-4">
            <h2 className="mb-2 text-lg font-bold">{reportTitle(snapshot)}</h2>
            <p className="mb-3 text-sm">
              Report {snapshot.reportId} ·
              {' '}{snapshot.source.type === 'benchmark' ? 'Baseline' : 'Captured'} {formatCreatedAt(snapshot.createdAt)} ·
              {' '}              {snapshot.workload.processedCount} events processed from a workload with {snapshot.workload.configuredCount} configured entries
            </p>
            <div className="analytics-print-charts mb-3">
              <PrintableCharts snapshot={snapshot} />
            </div>
            <table className="analytics-print-table">
              <caption>Normalized metrics</caption>
              <thead>
                <tr>
                  <th scope="col">Chart</th>
                  <th scope="col">Metric</th>
                  <th scope="col">Value</th>
                  <th scope="col">Unit</th>
                </tr>
              </thead>
              <tbody>
                {prepareChartGroups(snapshot).flatMap((chart) =>
                  chart.series.map((item) => (
                    <tr key={`${chart.id}-${item.label}`}>
                      <th scope="row">{chart.title}</th>
                      <td>{item.label}</td>
                      <td>{item.value}</td>
                      <td>{chart.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <h3 className="mb-1 font-semibold">Configuration</h3>
            <pre className="overflow-wrap-anywhere whitespace-pre-wrap text-xs">
              {JSON.stringify(snapshot.configuration, null, 2)}
            </pre>
            <h3 className="mb-1 mt-3 font-semibold">Workload</h3>
            <pre className="overflow-wrap-anywhere whitespace-pre-wrap text-xs">
              {JSON.stringify(snapshot.workload.inputs, null, 2)}
            </pre>
            <h3 className="mb-1 mt-3 font-semibold">
              Simulation history ({snapshot.history.length} events)
            </h3>
            <table className="analytics-print-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Input</th>
                  <th scope="col">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.history.map((_event, index) => {
                  const summary = printHistorySummary(snapshot, index);
                  return (
                  <tr key={index}>
                    <th scope="row">{index + 1}</th>
                    <td>{summary.input}</td>
                    <td>{summary.result}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ reports, captureError }) => {
  const benchmarkResult = useMemo(() => {
    try {
      return { snapshots: runBenchmarkSuite(), error: null };
    } catch (error) {
      return {
        snapshots: [] as AnalyticsSnapshot[],
        error: error instanceof Error ? error.message : 'Unable to run the analytics benchmark suite.',
      };
    }
  }, []);
  const { snapshots: benchmarks, error: benchmarkError } = benchmarkResult;
  const currentReports = Object.values(reports).filter(
    (snapshot): snapshot is AnalyticsSnapshot => snapshot !== undefined
  );
  const allReports = [...currentReports, ...benchmarks];
  const [primaryId, setPrimaryId] = useState('');
  const [comparisonId, setComparisonId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const primary =
    allReports.find((snapshot) => snapshot.reportId === primaryId) ??
    currentReports[0] ??
    benchmarks[0];
  if (!primary) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Analytics & Benchmarks</h1>
        {benchmarkError ? (
          <p role="alert" className="rounded-lg border border-[var(--color-accent-danger)]/40 bg-[var(--color-accent-danger)]/10 p-3 text-sm text-[var(--color-text-main)]">
            Benchmark generation failed: {benchmarkError}
          </p>
        ) : (
          <p role="status" className="text-sm text-[var(--color-text-muted)]">
            Preparing deterministic benchmark results…
          </p>
        )}
      </div>
    );
  }
  const comparison = allReports.find((snapshot) => snapshot.reportId === comparisonId);
  const compatibility = comparison && primary
    ? compareSnapshotCompatibility(primary, comparison)
    : undefined;
  const canCompare = compatibility?.compatible === true;

  const handleDownload = (format: 'json' | 'csv') => {
    try {
      downloadAnalyticsFile(allReports, format);
      setStatusMessage(`${format.toUpperCase()} export started for ${allReports.length} reports.`);
    } catch (error) {
      setStatusMessage(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown download error.'}`
      );
    }
  };

  const handlePrint = () => {
    try {
      window.print();
      setStatusMessage('Print dialog opened. Choose Print or Save as PDF in your browser.');
    } catch (error) {
      setStatusMessage(
        `Print failed: ${error instanceof Error ? error.message : 'Unknown print error.'}`
      );
    }
  };

  return (
    <div className="analytics-page space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Analytics & Benchmarks</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Explore real simulation results and deterministic engine benchmarks.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDownload('json')}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--color-text-main)] hover:border-[var(--color-accent-primary)]"
          >
            <FileJson className="h-4 w-4" /> Export JSON
          </button>
          <button
            type="button"
            onClick={() => handleDownload('csv')}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--color-text-main)] hover:border-[var(--color-accent-primary)]"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--color-text-main)] hover:border-[var(--color-accent-primary)]"
          >
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
        </div>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-xs text-[var(--color-text-muted)]">
        {statusMessage}
      </p>
      {captureError && (
        <p role="alert" className="rounded-lg border border-[var(--color-accent-danger)]/40 bg-[var(--color-accent-danger)]/10 p-3 text-sm text-[var(--color-text-main)]">
          Could not capture the latest simulation: {captureError}
        </p>
      )}
      {benchmarkError && (
        <p role="alert" className="rounded-lg border border-[var(--color-accent-danger)]/40 bg-[var(--color-accent-danger)]/10 p-3 text-sm text-[var(--color-text-main)]">
          Benchmark generation failed: {benchmarkError}
        </p>
      )}

      <section className="glass-panel space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-[var(--color-text-muted)]">
            Report to inspect
            <select
              value={primary.reportId}
              onChange={(event) => setPrimaryId(event.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] p-2 text-sm text-[var(--color-text-main)]"
            >
              {allReports.map((snapshot) => (
                <option key={snapshot.reportId} value={snapshot.reportId}>
                  {reportTitle(snapshot)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-[var(--color-text-muted)]">
            Compare with (optional)
            <select
              value={comparisonId}
              onChange={(event) => setComparisonId(event.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] p-2 text-sm text-[var(--color-text-main)]"
            >
              <option value="">No comparison</option>
              {allReports
                .filter((snapshot) => snapshot.reportId !== primary.reportId)
                .map((snapshot) => (
                  <option key={snapshot.reportId} value={snapshot.reportId}>
                    {reportTitle(snapshot)}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-elevated)] p-3">
          <p className="text-sm font-semibold text-[var(--color-text-main)]">
            {primary.source.type === 'benchmark' ? 'Reproducible benchmark' : 'Current user simulation'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Benchmark outcomes are generated from the simulation engines using fixed inputs. They are kept distinct from user-run reports.
          </p>
        </div>
        {comparison && compatibility && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              canCompare
                ? 'border-emerald-500/30 bg-emerald-500/10 text-[var(--color-text-main)]'
                : 'border-[var(--color-accent-warning)]/40 bg-[var(--color-accent-warning)]/10 text-[var(--color-text-main)]'
            }`}
            role="status"
          >
            {canCompare
              ? `Compatible comparison: ${compatibility.reason}`
              : `Comparison unavailable: ${compatibility.reason}`}
          </div>
        )}
      </section>

      {allReports.length === 0 ? (
        <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 text-sm text-[var(--color-text-muted)]">
          No simulation reports are available yet. Run a lab to capture your own data.
        </section>
      ) : (
        <>
          <div className={`grid gap-5 ${canCompare ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
            <section className="glass-panel space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-main)]">{reportTitle(primary)}</h2>
                <p className="text-xs text-[var(--color-text-subtle)]">{primary.workload.id} · Report {primary.reportId}</p>
              </div>
              <ReportSummary snapshot={primary} />
              <SnapshotCharts snapshot={primary} />
            </section>
            {canCompare && comparison && (
              <section className="glass-panel space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-main)]">{reportTitle(comparison)}</h2>
                  <p className="text-xs text-[var(--color-text-subtle)]">{comparison.workload.id} · Report {comparison.reportId}</p>
                </div>
                <ReportSummary snapshot={comparison} />
                <SnapshotCharts snapshot={comparison} />
              </section>
            )}
          </div>
          <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)]">
              <Download className="h-4 w-4 text-[var(--color-accent-primary)]" />
              Available reports ({allReports.length})
            </div>
            {currentReports.length === 0 && (
              <p role="status" className="mb-3 text-sm text-[var(--color-text-muted)]">
                No current simulation reports are captured yet. Run a lab to add your own results; deterministic benchmarks are available above.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allReports.map((snapshot) => (
                <div key={snapshot.reportId} className="rounded-lg bg-[var(--color-bg-surface-elevated)] p-3">
                  <p className="text-xs font-semibold text-[var(--color-text-main)]">
                    {LAB_LABELS[snapshot.labId]} · {snapshot.source.type === 'benchmark' ? 'Benchmark' : 'Simulation'}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {snapshot.workload.processedCount} processed / {snapshot.workload.configuredCount} configured
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <PrintReport snapshots={allReports} />
    </div>
  );
};
