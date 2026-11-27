import type { AnalyticsSnapshot } from './types';

const CSV_COLUMNS = [
  'exported_at',
  'report_id',
  'report_created_at',
  'source_type',
  'benchmark_id',
  'benchmark_name',
  'lab_id',
  'lab_name',
  'workload_id',
  'workload_label',
  'configuration_json',
  'metrics_json',
  'configured_input_index',
  'configured_input_json',
  'processed_input_index',
  'processed_input_json',
  'history_index',
  'history_json',
] as const;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function jsonCell(value: unknown): string {
  return JSON.stringify(value);
}

export function serializeAnalyticsJson(
  snapshots: readonly AnalyticsSnapshot[],
  exportedAt = new Date().toISOString()
): string {
  return JSON.stringify(
    {
      application: 'MemoryFlow',
      schemaVersion: 1,
      exportedAt,
      reportCount: snapshots.length,
      reports: snapshots,
    },
    null,
    2
  );
}

export function serializeAnalyticsCsv(
  snapshots: readonly AnalyticsSnapshot[],
  exportedAt = new Date().toISOString()
): string {
  const rows: unknown[][] = [Array.from(CSV_COLUMNS)];

  for (const snapshot of snapshots) {
    const benchmarkSource =
      snapshot.source.type === 'benchmark' ? snapshot.source : undefined;
    const rowCount = Math.max(
      snapshot.workload.inputs.length,
      snapshot.workload.processedInputs.length,
      snapshot.history.length,
      1
    );

    for (let index = 0; index < rowCount; index += 1) {
      rows.push([
        exportedAt,
        snapshot.reportId,
        snapshot.createdAt,
        snapshot.source.type,
        benchmarkSource?.benchmarkId ?? '',
        benchmarkSource?.benchmarkName ?? '',
        snapshot.labId,
        snapshot.labName,
        snapshot.workload.id,
        snapshot.workload.label,
        jsonCell(snapshot.configuration),
        jsonCell(snapshot.metrics),
        index < snapshot.workload.inputs.length ? index + 1 : '',
        index < snapshot.workload.inputs.length
          ? jsonCell(snapshot.workload.inputs[index])
          : '',
        index < snapshot.workload.processedInputs.length ? index + 1 : '',
        index < snapshot.workload.processedInputs.length
          ? jsonCell(snapshot.workload.processedInputs[index])
          : '',
        index < snapshot.history.length ? index + 1 : '',
        index < snapshot.history.length ? jsonCell(snapshot.history[index]) : '',
      ]);
    }
  }

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function createAnalyticsBlob(
  snapshots: readonly AnalyticsSnapshot[],
  format: 'json' | 'csv',
  exportedAt?: string
): Blob {
  const content =
    format === 'json'
      ? serializeAnalyticsJson(snapshots, exportedAt)
      : serializeAnalyticsCsv(snapshots, exportedAt);
  const mimeType = format === 'json' ? 'application/json' : 'text/csv';
  return new Blob([content], { type: `${mimeType};charset=utf-8` });
}

export function downloadAnalyticsFile(
  snapshots: readonly AnalyticsSnapshot[],
  format: 'json' | 'csv'
): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('File downloads are not available in this environment.');
  }

  const blob = createAnalyticsBlob(snapshots, format);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `memoryflow-analytics.${format}`;
  anchor.style.display = 'none';

  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
