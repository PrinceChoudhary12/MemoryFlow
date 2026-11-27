import { describe, expect, it, vi } from 'vitest';
import {
  adaptPagingEngine,
  createAnalyticsBlob,
  downloadAnalyticsFile,
  runBenchmarkSuite,
  serializeAnalyticsCsv,
  serializeAnalyticsJson,
} from '../core/analytics';
import { PagingEngine } from '../core/paging/pagingEngine';

function parseCsvRow(row: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += character;
    }
  }
  cells.push(cell);
  return cells;
}

describe('analytics exporters', () => {
  it('exports complete JSON metadata, workload, metrics, and history', () => {
    const engine = new PagingEngine();
    engine.setReferenceStream(['0', '0']);
    engine.stepForward();
    engine.stepForward();
    const snapshot = adaptPagingEngine(engine, {
      reportId: 'report-1',
      createdAt: '2026-11-27T00:00:00.000Z',
      workloadId: 'test-workload',
      workloadLabel: 'Test workload',
    });

    const parsed = JSON.parse(
      serializeAnalyticsJson([snapshot], '2026-11-27T01:00:00.000Z')
    ) as {
      application: string;
      schemaVersion: number;
      exportedAt: string;
      reportCount: number;
      reports: typeof snapshot[];
    };

    expect(parsed).toMatchObject({
      application: 'MemoryFlow',
      schemaVersion: 1,
      exportedAt: '2026-11-27T01:00:00.000Z',
      reportCount: 1,
    });
    expect(parsed.reports[0]).toMatchObject({
      reportId: 'report-1',
      createdAt: '2026-11-27T00:00:00.000Z',
      workload: { id: 'test-workload', label: 'Test workload', inputs: ['0', '0'] },
      metrics: { hits: 1, faults: 1 },
    });
    expect(parsed.reports[0].history).toHaveLength(2);
  });

  it('serializes repeated allocation benchmark runs identically', () => {
    const first = runBenchmarkSuite().find((report) => report.labId === 'allocation');
    const second = runBenchmarkSuite().find((report) => report.labId === 'allocation');
    if (!first || !second || first.labId !== 'allocation' || second.labId !== 'allocation') {
      throw new Error('Expected benchmark suite to include allocation reports.');
    }

    const exportedAt = '2026-11-27T01:00:00.000Z';
    expect(serializeAnalyticsJson([first], exportedAt)).toBe(
      serializeAnalyticsJson([second], exportedAt)
    );
    expect(serializeAnalyticsCsv([first], exportedAt)).toBe(
      serializeAnalyticsCsv([second], exportedAt)
    );
  });

  it('quotes CSV commas, quotes, and embedded newlines while retaining metadata', () => {
    const engine = new PagingEngine();
    engine.setReferenceStream(['comma, value', 'quote " value', 'line one\nline two']);
    const snapshot = adaptPagingEngine(engine, {
      reportId: 'csv-test',
      createdAt: '2026-11-27T00:00:00.000Z',
      source: {
        type: 'benchmark',
        benchmarkId: 'benchmark-1',
        benchmarkName: 'Benchmark, "one"',
      },
    });

    const csv = serializeAnalyticsCsv([snapshot], '2026-11-27T01:00:00.000Z');
    const rows = csv.split('\r\n');
    const headers = parseCsvRow(rows[0]);
    const dataRows = rows.slice(1).map(parseCsvRow);
    const firstDataRow = dataRows[0];
    const workloadInputIndex = headers.indexOf('configured_input_json');

    expect(headers).toContain('exported_at');
    expect(firstDataRow[headers.indexOf('exported_at')]).toBe('2026-11-27T01:00:00.000Z');
    expect(firstDataRow[headers.indexOf('benchmark_name')]).toBe('Benchmark, "one"');
    expect(JSON.parse(dataRows[0][workloadInputIndex])).toBe('comma, value');
    expect(JSON.parse(dataRows[1][workloadInputIndex])).toBe('quote " value');
    expect(JSON.parse(dataRows[2][workloadInputIndex])).toBe('line one\nline two');
    expect(rows).toHaveLength(4);
  });

  it('handles empty reports and empty simulation data', () => {
    expect(JSON.parse(serializeAnalyticsJson([]))).toMatchObject({ reportCount: 0, reports: [] });
    expect(serializeAnalyticsCsv([]).split('\r\n')).toHaveLength(1);

    const engine = new PagingEngine();
    engine.setReferenceStream([]);
    const csv = serializeAnalyticsCsv([adaptPagingEngine(engine)]);
    const rows = csv.split('\r\n');
    expect(rows).toHaveLength(2);
    expect(parseCsvRow(rows[1])).toContain('paging');
  });

  it('creates correctly typed export blobs and explicitly rejects unavailable downloads', async () => {
    const snapshot = adaptPagingEngine(new PagingEngine(), { reportId: 'blob-test' });
    const jsonBlob = createAnalyticsBlob([snapshot], 'json', '2026-11-27T02:00:00.000Z');
    const csvBlob = createAnalyticsBlob([snapshot], 'csv', '2026-11-27T02:00:00.000Z');

    expect(jsonBlob.type).toBe('application/json;charset=utf-8');
    expect(csvBlob.type).toBe('text/csv;charset=utf-8');
    expect(JSON.parse(await jsonBlob.text()).reports[0].reportId).toBe('blob-test');
    expect(() => downloadAnalyticsFile([snapshot], 'json')).toThrow(
      'File downloads are not available in this environment.'
    );
  });

  it('defers object URL revocation after triggering a browser download', () => {
    vi.useFakeTimers();
    const anchor = {
      href: '',
      download: '',
      style: { display: '' },
      click: vi.fn(),
      remove: vi.fn(),
    };
    const body = { appendChild: vi.fn() };
    const documentMock = {
      body,
      createElement: vi.fn(() => anchor),
    };
    const urlMock = {
      createObjectURL: vi.fn(() => 'blob:memoryflow-export'),
      revokeObjectURL: vi.fn(),
    };
    vi.stubGlobal('document', documentMock);
    vi.stubGlobal('URL', urlMock);

    try {
      const snapshot = adaptPagingEngine(new PagingEngine(), { reportId: 'download-test' });
      downloadAnalyticsFile([snapshot], 'json');

      expect(anchor.download).toBe('memoryflow-analytics.json');
      expect(anchor.click).toHaveBeenCalledOnce();
      expect(anchor.remove).toHaveBeenCalledOnce();
      expect(urlMock.revokeObjectURL).not.toHaveBeenCalled();

      vi.advanceTimersByTime(999);
      expect(urlMock.revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(urlMock.revokeObjectURL).toHaveBeenCalledWith('blob:memoryflow-export');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
