import type { AllocationEngine } from '../allocation/allocationEngine';
import { PagingEngine } from '../paging/pagingEngine';
import { ReplacementEngine } from '../replacement/replacementEngine';
import { SegmentationEngine } from '../segmentation/segmentationEngine';
import { VirtualMemoryEngine } from '../virtualMemory/virtualMemoryEngine';
import type {
  AnalyticsSnapshot,
  AnalyticsSnapshotOptions,
  AllocationAnalyticsSnapshot,
  PagingAnalyticsSnapshot,
  ReplacementAnalyticsSnapshot,
  SegmentationAnalyticsSnapshot,
  VirtualMemoryAnalyticsSnapshot,
} from './types';

let reportSequence = 0;

function createWorkload<TInput>(
  inputs: TInput[],
  processedInputs: TInput[],
  options: AnalyticsSnapshotOptions
) {
  return {
    id: options.workloadId ?? 'current',
    label: options.workloadLabel ?? 'Current configured workload',
    inputs: structuredClone(inputs),
    processedInputs: structuredClone(processedInputs),
    configuredCount: inputs.length,
    processedCount: processedInputs.length,
  };
}

function createMetadata(
  options: AnalyticsSnapshotOptions
): Pick<AnalyticsSnapshot, 'schemaVersion' | 'reportId' | 'createdAt' | 'source'> {
  const createdAt = options.createdAt ?? new Date().toISOString();
  reportSequence += 1;
  return {
    schemaVersion: 1,
    reportId: options.reportId ?? `memoryflow-${createdAt}-${reportSequence}`,
    createdAt,
    source: structuredClone(options.source ?? { type: 'simulation' }),
  };
}

export function adaptPagingEngine(
  engine: PagingEngine,
  options: AnalyticsSnapshotOptions = {}
): PagingAnalyticsSnapshot {
  const history = engine.getHistory();
  const stats = engine.getStats();
  return {
    ...createMetadata(options),
    labId: 'paging',
    labName: 'Paging Simulator',
    configuration: engine.getConfig(),
    workload: createWorkload(
      engine.getReferenceStream(),
      history.map((step) => step.rawInput),
      options
    ),
    metrics: {
      ...stats,
      invalidAddresses: history.filter((step) => step.status === 'INVALID_ADDRESS').length,
    },
    history: structuredClone(history),
  };
}

export function adaptSegmentationEngine(
  engine: SegmentationEngine,
  options: AnalyticsSnapshotOptions = {}
): SegmentationAnalyticsSnapshot {
  const history = engine.getHistory();
  return {
    ...createMetadata(options),
    labId: 'segmentation',
    labName: 'Segmentation Simulator',
    configuration: {
      ...engine.getConfig(),
      segments: engine.getSegments().map((segment) => ({
        id: segment.id,
        name: segment.name,
        base: segment.base,
        limit: segment.limit,
        isValid: segment.isValid,
        color: segment.color,
      })),
    },
    workload: createWorkload(
      engine.getReferenceStream(),
      history.map((step) => step.rawInput),
      options
    ),
    metrics: {
      ...engine.getStats(),
      invalidInputs: history.filter((step) => step.status === 'INVALID_INPUT').length,
      segmentAccessCounts: engine.getSegments().map(({ id, name, accessCount }) => ({
        segmentId: id,
        segmentName: name,
        accessCount,
      })),
    },
    history: structuredClone(history),
  };
}

export function adaptVirtualMemoryEngine(
  engine: VirtualMemoryEngine,
  options: AnalyticsSnapshotOptions = {}
): VirtualMemoryAnalyticsSnapshot {
  const history = engine.getHistory();
  return {
    ...createMetadata(options),
    labId: 'virtual-memory',
    labName: 'Virtual Memory',
    configuration: engine.getConfig(),
    workload: createWorkload(
      engine.getReferenceStream(),
      history.map((step) => step.rawInput),
      options
    ),
    metrics: {
      ...engine.getStats(),
      invalidAddresses: history.filter((step) => step.status === 'INVALID_ADDRESS').length,
    },
    history: structuredClone(history),
  };
}

export function adaptReplacementEngine(
  engine: ReplacementEngine,
  options: AnalyticsSnapshotOptions = {}
): ReplacementAnalyticsSnapshot {
  const history = engine.getHistory();
  return {
    ...createMetadata(options),
    labId: 'replacement',
    labName: 'FIFO / LRU Page Replacement',
    configuration: { frameCount: engine.getFrameCount() },
    workload: createWorkload(
      engine.getReferenceString(),
      history.map((step) => step.pageNumber),
      options
    ),
    metrics: engine.getStats(),
    history: structuredClone(history),
  };
}

export function adaptAllocationEngine(
  engine: AllocationEngine,
  options: AnalyticsSnapshotOptions = {}
): AllocationAnalyticsSnapshot {
  const state = engine.getState();
  const initialPartitions = engine.getInitialPartitions();
  const operations = engine.getOperations();
  const strategyMetrics = {
    FIRST_FIT: state.firstFit.metrics,
    BEST_FIT: state.bestFit.metrics,
    WORST_FIT: state.worstFit.metrics,
  };
  return {
    ...createMetadata(options),
    labId: 'allocation',
    labName: 'Dynamic Memory Allocation',
    configuration: {
      totalMemoryKb: initialPartitions.reduce((total, partition) => total + partition.size, 0),
      minHoleThresholdKb: engine.getMinHoleThresholdKb(),
      initialPartitions: structuredClone(initialPartitions),
    },
    workload: createWorkload(
      operations,
      state.history.map((step) => step.operation),
      options
    ),
    metrics: strategyMetrics,
    history: structuredClone(state.history),
  };
}

export function adaptEngine(
  engine:
    | PagingEngine
    | SegmentationEngine
    | VirtualMemoryEngine
    | ReplacementEngine
    | AllocationEngine,
  options: AnalyticsSnapshotOptions = {}
): AnalyticsSnapshot {
  if (engine instanceof PagingEngine) return adaptPagingEngine(engine, options);
  if (engine instanceof SegmentationEngine) return adaptSegmentationEngine(engine, options);
  if (engine instanceof VirtualMemoryEngine) return adaptVirtualMemoryEngine(engine, options);
  if (engine instanceof ReplacementEngine) return adaptReplacementEngine(engine, options);
  return adaptAllocationEngine(engine, options);
}
