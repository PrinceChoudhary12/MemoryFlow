import {
  AllocationEngine,
  ALLOCATION_PRESETS,
} from '../allocation/allocationEngine';
import type {
  AllocationStepResult,
  MemoryPartition,
  TripleStrategyStep,
} from '../allocation/types';
import type { PartitionIdGenerator } from '../allocation/allocationStrategies';
import { DEFAULT_PAGING_CONFIG, PagingEngine } from '../paging/pagingEngine';
import {
  REPLACEMENT_PRESETS,
  ReplacementEngine,
} from '../replacement/replacementEngine';
import {
  DEFAULT_SEGMENTS,
  DEFAULT_SEGMENTATION_CONFIG,
  SegmentationEngine,
} from '../segmentation/segmentationEngine';
import { DEFAULT_VM_CONFIG, VirtualMemoryEngine } from '../virtualMemory/virtualMemoryEngine';
import type {
  AllocationAnalyticsSnapshot,
  AnalyticsSnapshot,
} from './types';
import {
  adaptAllocationEngine,
  adaptPagingEngine,
  adaptReplacementEngine,
  adaptSegmentationEngine,
  adaptVirtualMemoryEngine,
} from './analyticsAdapters';

const BENCHMARK_ID = 'memoryflow-v0.7-baseline';
const BENCHMARK_NAME = 'MemoryFlow v0.7 deterministic baseline';
const BENCHMARK_BASELINE_CREATED_AT = '2026-11-27T00:00:00.000Z';
const BENCHMARK_SOURCE = { type: 'benchmark' as const, benchmarkId: BENCHMARK_ID, benchmarkName: BENCHMARK_NAME };

const PAGING_WORKLOAD = ['0', '4096', '0', '8192', '4096', '12288'];
const SEGMENTATION_WORKLOAD = ['(0, 0)', '(0, 10)', '(1, 0)', '(1, 4096)', '(8, 0)'];
const VIRTUAL_MEMORY_WORKLOAD = [
  '0x0000:R',
  '0x1000:W',
  '0x0000:R',
  '0x2000:R',
  '0x3000:W',
  '0x4000:R',
  '0x1000:R',
];

function runToCompletion(engine: { canStepForward(): boolean; stepForward(): unknown }): void {
  while (engine.canStepForward()) {
    if (engine.stepForward() === null) {
      throw new Error('Benchmark engine ended before its configured workload was processed.');
    }
  }
}

function benchmarkOptions(labId: string) {
  return {
    reportId: `${BENCHMARK_ID}-${labId}`,
    createdAt: BENCHMARK_BASELINE_CREATED_AT,
    source: BENCHMARK_SOURCE,
  };
}

function createBenchmarkPartitionIdGenerator(): PartitionIdGenerator {
  let sequence = 0;
  return (prefix = 'part') => {
    sequence += 1;
    return `${BENCHMARK_ID}-${prefix}-${sequence}`;
  };
}

function normalizeAllocationSnapshot(
  snapshot: AllocationAnalyticsSnapshot,
  initialPartitions: MemoryPartition[],
  benchmarkInitialPartitions: MemoryPartition[]
): AllocationAnalyticsSnapshot {
  const initialIdMap = new Map(
    benchmarkInitialPartitions.map((partition, index) => [
      partition.id,
      initialPartitions[index].id,
    ] as const)
  );
  const generatedIdMap = new Map<string, string>();
  let generatedIdCount = 0;

  const normalizePartitionId = (id: string): string => {
    const initialId = initialIdMap.get(id);
    if (initialId) return initialId;

    let normalizedId = generatedIdMap.get(id);
    if (!normalizedId) {
      generatedIdCount += 1;
      normalizedId = `${BENCHMARK_ID}-partition-${generatedIdCount}`;
      generatedIdMap.set(id, normalizedId);
    }
    return normalizedId;
  };

  const normalizeStepResult = (result: AllocationStepResult): AllocationStepResult => ({
    ...result,
    selectedHoleId: result.selectedHoleId
      ? normalizePartitionId(result.selectedHoleId)
      : null,
    partitions: result.partitions.map((partition) => ({
      ...partition,
      id: normalizePartitionId(partition.id),
    })),
  });

  const history: TripleStrategyStep[] = snapshot.history.map((step) => ({
    ...step,
    firstFit: normalizeStepResult(step.firstFit),
    bestFit: normalizeStepResult(step.bestFit),
    worstFit: normalizeStepResult(step.worstFit),
  }));

  return {
    ...snapshot,
    configuration: {
      ...snapshot.configuration,
      initialPartitions: snapshot.configuration.initialPartitions.map((partition) => {
        const id = initialIdMap.get(partition.id);
        if (!id) {
          throw new Error(`Unknown benchmark allocation partition "${partition.id}".`);
        }
        return { ...partition, id };
      }),
    },
    history,
  };
}

export function runBenchmarkSuite(): AnalyticsSnapshot[] {
  const pagingEngine = new PagingEngine(DEFAULT_PAGING_CONFIG);
  pagingEngine.setReferenceStream(PAGING_WORKLOAD);
  runToCompletion(pagingEngine);

  const segmentationEngine = new SegmentationEngine(
    DEFAULT_SEGMENTATION_CONFIG,
    DEFAULT_SEGMENTS
  );
  segmentationEngine.setReferenceStream(SEGMENTATION_WORKLOAD);
  runToCompletion(segmentationEngine);

  const virtualMemoryEngine = new VirtualMemoryEngine(DEFAULT_VM_CONFIG);
  virtualMemoryEngine.setReferenceStream(VIRTUAL_MEMORY_WORKLOAD);
  runToCompletion(virtualMemoryEngine);

  const replacementPreset = REPLACEMENT_PRESETS[0];
  const replacementEngine = new ReplacementEngine(
    replacementPreset.referenceString,
    replacementPreset.defaultFrameCount
  );
  runToCompletion(replacementEngine);

  const allocationPreset = ALLOCATION_PRESETS[0];
  const benchmarkInitialPartitions = allocationPreset.initialPartitions.map(
    (partition, index) => ({
      ...partition,
      id: `${BENCHMARK_ID}-initial-${index + 1}`,
    })
  );
  const allocationEngine = new AllocationEngine({
    ...allocationPreset,
    initialPartitions: benchmarkInitialPartitions,
  }, createBenchmarkPartitionIdGenerator());
  runToCompletion(allocationEngine);

  const allocationSnapshot = normalizeAllocationSnapshot(
    adaptAllocationEngine(allocationEngine, {
      ...benchmarkOptions('allocation'),
      workloadId: allocationPreset.id,
      workloadLabel: allocationPreset.label,
    }),
    allocationPreset.initialPartitions,
    benchmarkInitialPartitions
  );

  return [
    adaptPagingEngine(pagingEngine, {
      ...benchmarkOptions('paging'),
      workloadId: 'paging-v1',
      workloadLabel: 'Deterministic paging references',
    }),
    adaptSegmentationEngine(segmentationEngine, {
      ...benchmarkOptions('segmentation'),
      workloadId: 'segmentation-v1',
      workloadLabel: 'Deterministic segment address sequence',
    }),
    adaptVirtualMemoryEngine(virtualMemoryEngine, {
      ...benchmarkOptions('virtual-memory'),
      workloadId: 'virtual-memory-v1',
      workloadLabel: 'Deterministic read/write references',
    }),
    adaptReplacementEngine(replacementEngine, {
      ...benchmarkOptions('replacement'),
      workloadId: replacementPreset.id,
      workloadLabel: replacementPreset.label,
    }),
    allocationSnapshot,
  ];
}
