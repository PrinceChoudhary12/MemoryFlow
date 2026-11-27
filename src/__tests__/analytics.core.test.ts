import { describe, expect, it } from 'vitest';
import { AllocationEngine, ALLOCATION_PRESETS } from '../core/allocation/allocationEngine';
import {
  adaptAllocationEngine,
  adaptPagingEngine,
  adaptReplacementEngine,
  adaptSegmentationEngine,
  adaptVirtualMemoryEngine,
  compareSnapshotCompatibility,
  prepareChartGroups,
  runBenchmarkSuite,
} from '../core/analytics';
import { PagingEngine } from '../core/paging/pagingEngine';
import { ReplacementEngine } from '../core/replacement/replacementEngine';
import { SegmentationEngine } from '../core/segmentation/segmentationEngine';
import { VirtualMemoryEngine } from '../core/virtualMemory/virtualMemoryEngine';

describe('analytics engine adapters', () => {
  it('adapts paging statistics, configured workload, and processed history', () => {
    const engine = new PagingEngine();
    engine.setReferenceStream(['0', '0', 'invalid']);
    engine.stepForward();
    engine.stepForward();
    engine.stepForward();

    const report = adaptPagingEngine(engine);
    expect(report.metrics).toMatchObject({
      totalAccesses: 2,
      hits: 1,
      faults: 1,
      invalidAddresses: 1,
    });
    expect(report.workload).toMatchObject({
      inputs: ['0', '0', 'invalid'],
      processedInputs: ['0', '0', 'invalid'],
      configuredCount: 3,
      processedCount: 3,
    });
    expect(report.history).toHaveLength(3);
  });

  it('adapts segmentation input errors without counting them as segmentation faults', () => {
    const engine = new SegmentationEngine();
    engine.setReferenceStream(['(0, 0)', 'not an address', '(0, 4096)']);
    while (engine.canStepForward()) engine.stepForward();

    const report = adaptSegmentationEngine(engine);
    expect(report.metrics.invalidInputs).toBe(1);
    expect(report.metrics.segmentationFaults).toBe(1);
    expect(report.metrics.validTranslations).toBe(1);
    expect(report.configuration.segments).toHaveLength(4);
    expect(prepareChartGroups(report)[0].series.map((item) => item.value)).toEqual([1, 1, 1]);
  });

  it('captures virtual-memory writeback data and deeply copies nested history', () => {
    const engine = new VirtualMemoryEngine();
    engine.setReferenceStream(['0x0000:W', '0x1000:W', '0x2000:W', '0x3000:W', '0x4000:R']);
    while (engine.canStepForward()) engine.stepForward();

    const report = adaptVirtualMemoryEngine(engine);
    expect(report.metrics.dirtyWritebacks).toBeGreaterThan(0);
    expect(prepareChartGroups(report)[0].series[2].value).toBe(report.metrics.dirtyWritebacks);
    report.history[0].phases[0].title = 'mutated report only';
    expect(engine.getHistory()[0].phases[0].title).not.toBe('mutated report only');
  });

  it('reports invalid virtual-memory addresses separately from memory accesses', () => {
    const engine = new VirtualMemoryEngine();
    engine.setReferenceStream(['not-an-address', '0x1000:R']);
    while (engine.canStepForward()) engine.stepForward();

    const report = adaptVirtualMemoryEngine(engine);
    expect(report.metrics).toMatchObject({
      totalAccesses: 1,
      invalidAddresses: 1,
      pageFaults: 1,
    });
    expect(prepareChartGroups(report)[0].series.map((item) => item.value)).toEqual([
      0,
      1,
      0,
      1,
    ]);
  });

  it('captures replacement comparison metrics and full reference history', () => {
    const engine = new ReplacementEngine([1, 2, 1, 3], 2);
    while (engine.canStepForward()) engine.stepForward();

    const report = adaptReplacementEngine(engine);
    expect(report.metrics.totalAccesses).toBe(4);
    expect(report.metrics.fifo.faults).toBe(3);
    expect(report.metrics.lru.faults).toBe(3);
    expect(report.history).toHaveLength(4);
    expect(prepareChartGroups(report).map((chart) => chart.id)).toEqual([
      'replacement-faults',
      'replacement-hits',
    ]);
  });

  it('adapts allocation strategy metrics and exact initial partition workload', () => {
    const engine = new AllocationEngine(ALLOCATION_PRESETS[0]);
    while (engine.canStepForward()) engine.stepForward();

    const report = adaptAllocationEngine(engine);
    expect(report.metrics.BEST_FIT.successfulAllocations).toBe(4);
    expect(report.metrics.FIRST_FIT.failedAllocations).toBe(1);
    expect(report.configuration.initialPartitions).toEqual(engine.getInitialPartitions());
    expect(report.workload.inputs).toEqual(engine.getOperations());
    expect(prepareChartGroups(report).map((chart) => chart.id)).toEqual([
      'utilization',
      'fragmentation',
    ]);
  });

  it('keeps empty simulations as valid, explicitly empty reports', () => {
    const engine = new PagingEngine();
    engine.setReferenceStream([]);
    const report = adaptPagingEngine(engine, { reportId: 'empty-report' });

    expect(report.reportId).toBe('empty-report');
    expect(report.workload.configuredCount).toBe(0);
    expect(report.workload.processedCount).toBe(0);
    expect(report.history).toEqual([]);
    expect(report.metrics.totalAccesses).toBe(0);
  });

  it('records manually processed addresses separately from the configured stream', () => {
    const engine = new PagingEngine();
    engine.setReferenceStream(['0']);
    engine.translateAddress('4096');

    const report = adaptPagingEngine(engine);
    expect(report.workload.inputs).toEqual(['0']);
    expect(report.workload.processedInputs).toEqual(['4096']);
    expect(report.workload.configuredCount).toBe(1);
    expect(report.workload.processedCount).toBe(1);
  });

  it('prepares paging chart values from actual engine statistics and invalid steps', () => {
    const engine = new PagingEngine();
    engine.setReferenceStream(['0', '0', 'not-an-address']);
    while (engine.canStepForward()) engine.stepForward();

    expect(prepareChartGroups(adaptPagingEngine(engine))[0].series.map((item) => item.value)).toEqual([
      1, 1, 1,
    ]);
  });
});

describe('analytics benchmarks and comparisons', () => {
  it('reproduces benchmark metric outputs using fresh simulation engines', () => {
    const first = runBenchmarkSuite();
    const second = runBenchmarkSuite();

    expect(first.map((report) => report.labId)).toEqual([
      'paging',
      'segmentation',
      'virtual-memory',
      'replacement',
      'allocation',
    ]);
    expect(first.map((report) => report.metrics)).toEqual(second.map((report) => report.metrics));
    expect(first.every((report) => report.source.type === 'benchmark')).toBe(true);
    expect(first.every((report) => report.workload.processedCount === report.workload.configuredCount)).toBe(true);
  });

  it('keeps complete allocation benchmark histories deterministic without mutating active engines', () => {
    const activeEngine = new AllocationEngine(ALLOCATION_PRESETS[0]);
    activeEngine.stepForward();
    const activeState = activeEngine.getState();

    const first = runBenchmarkSuite().find((report) => report.labId === 'allocation');
    const second = runBenchmarkSuite().find((report) => report.labId === 'allocation');
    if (!first || !second || first.labId !== 'allocation' || second.labId !== 'allocation') {
      throw new Error('Expected benchmark suite to include allocation reports.');
    }

    expect(first).toEqual(second);
    expect(first.configuration.initialPartitions.map((partition) => ({
      ...partition,
      id: '',
    }))).toEqual(ALLOCATION_PRESETS[0].initialPartitions.map((partition) => ({
      ...partition,
      id: '',
    })));
    expect(first.workload.inputs).toEqual(ALLOCATION_PRESETS[0].operations);
    expect(activeEngine.getState()).toEqual(activeState);
  });

  it('does not consume IDs from the normal allocation sequence', () => {
    const createNormalIdProbe = () => {
      const engine = new AllocationEngine({
        ...ALLOCATION_PRESETS[0],
        initialPartitions: [{
          id: 'id-probe-hole',
          startAddress: 0,
          size: 100,
          status: 'FREE',
          processId: null,
          requestedSize: null,
        }],
        operations: [{ type: 'ALLOCATE', processId: 'ID-PROBE', size: 100 }],
      });
      const result = engine.stepForward();
      if (!result) {
        throw new Error('Expected the ID probe allocation to execute.');
      }

      const findId = (partitions: typeof result.firstFit.partitions): string => {
        const id = partitions.find((partition) => partition.processId === 'ID-PROBE')?.id;
        if (!id) {
          throw new Error('Expected the probe process to have an allocated partition.');
        }
        return id;
      };

      return [
        findId(result.firstFit.partitions),
        findId(result.bestFit.partitions),
        findId(result.worstFit.partitions),
      ];
    };

    const beforeBenchmark = createNormalIdProbe();
    const expectedAfterBenchmark = beforeBenchmark.map((id) => {
      const match = /^alloc-(\d+)$/.exec(id);
      if (!match) {
        throw new Error(`Unexpected normal allocation ID "${id}".`);
      }
      return `alloc-${Number(match[1]) + beforeBenchmark.length}`;
    });

    runBenchmarkSuite();

    expect(createNormalIdProbe()).toEqual(expectedAfterBenchmark);
  });

  it('only considers same-lab reports with identical configuration and input compatible', () => {
    const baseline = runBenchmarkSuite().find((report) => report.labId === 'replacement');
    const otherLab = runBenchmarkSuite().find((report) => report.labId === 'paging');
    if (!baseline || !otherLab || baseline.labId !== 'replacement') {
      throw new Error('Expected benchmark suite to include replacement and paging reports.');
    }

    expect(compareSnapshotCompatibility(baseline, otherLab).compatible).toBe(false);
    expect(compareSnapshotCompatibility(baseline, { ...baseline, workload: {
      ...baseline.workload,
      inputs: [...baseline.workload.inputs, 99],
    } }).compatible).toBe(false);
    expect(compareSnapshotCompatibility(baseline, {
      ...baseline,
      source: { type: 'simulation' },
    }).compatible).toBe(true);
    expect(compareSnapshotCompatibility(baseline, {
      ...baseline,
      configuration: { frameCount: baseline.configuration.frameCount + 1 },
    }).compatible).toBe(false);
    expect(compareSnapshotCompatibility(baseline, {
      ...baseline,
      workload: { ...baseline.workload, processedCount: baseline.workload.processedCount - 1 },
    }).compatible).toBe(false);
  });
});
