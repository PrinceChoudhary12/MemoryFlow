import type {
  AllocationMetrics,
  AllocationOperation,
  AllocationStrategy,
  MemoryPartition,
  TripleStrategyStep,
} from '../allocation/types';
import type { PagingConfig, SimulationStats, TranslationStep } from '../paging/types';
import type {
  ReplacementStats,
  DualAlgorithmStep,
} from '../replacement/types';
import type {
  Segment,
  SegmentTranslationStep,
  SegmentationConfig,
  SegmentationStats,
} from '../segmentation/types';
import type {
  VirtualMemoryConfig,
  VirtualMemoryStats,
  VirtualMemoryStep,
} from '../virtualMemory/types';

export type AnalyticsLabId =
  | 'paging'
  | 'segmentation'
  | 'virtual-memory'
  | 'replacement'
  | 'allocation';

export type AnalyticsSource =
  | { type: 'simulation' }
  | { type: 'benchmark'; benchmarkId: string; benchmarkName: string };

export interface AnalyticsWorkload<TInput> {
  id: string;
  label: string;
  inputs: TInput[];
  processedInputs: TInput[];
  configuredCount: number;
  processedCount: number;
}

export interface AnalyticsSnapshotBase<
  TLab extends AnalyticsLabId,
  TConfiguration,
  TInput,
  TMetrics,
  THistory,
> {
  schemaVersion: 1;
  reportId: string;
  createdAt: string;
  source: AnalyticsSource;
  labId: TLab;
  labName: string;
  configuration: TConfiguration;
  workload: AnalyticsWorkload<TInput>;
  metrics: TMetrics;
  history: THistory[];
}

export interface PagingAnalyticsMetrics extends SimulationStats {
  invalidAddresses: number;
}

export interface SegmentationAnalyticsMetrics extends SegmentationStats {
  invalidInputs: number;
  segmentAccessCounts: { segmentId: number; segmentName: string; accessCount: number }[];
}

export interface VirtualMemoryAnalyticsMetrics extends VirtualMemoryStats {
  invalidAddresses: number;
}

export interface AllocationAnalyticsConfiguration {
  totalMemoryKb: number;
  minHoleThresholdKb: number;
  initialPartitions: MemoryPartition[];
}

export type AllocationStrategyMetrics = Record<AllocationStrategy, AllocationMetrics>;

export type PagingAnalyticsSnapshot = AnalyticsSnapshotBase<
  'paging',
  PagingConfig,
  string,
  PagingAnalyticsMetrics,
  TranslationStep
>;

export type SegmentationAnalyticsSnapshot = AnalyticsSnapshotBase<
  'segmentation',
  SegmentationConfig & { segments: Omit<Segment, 'accessCount'>[] },
  string,
  SegmentationAnalyticsMetrics,
  SegmentTranslationStep
>;

export type VirtualMemoryAnalyticsSnapshot = AnalyticsSnapshotBase<
  'virtual-memory',
  VirtualMemoryConfig,
  string,
  VirtualMemoryAnalyticsMetrics,
  VirtualMemoryStep
>;

export type ReplacementAnalyticsSnapshot = AnalyticsSnapshotBase<
  'replacement',
  { frameCount: number },
  number,
  ReplacementStats,
  DualAlgorithmStep
>;

export type AllocationAnalyticsSnapshot = AnalyticsSnapshotBase<
  'allocation',
  AllocationAnalyticsConfiguration,
  AllocationOperation,
  AllocationStrategyMetrics,
  TripleStrategyStep
>;

export type AnalyticsSnapshot =
  | PagingAnalyticsSnapshot
  | SegmentationAnalyticsSnapshot
  | VirtualMemoryAnalyticsSnapshot
  | ReplacementAnalyticsSnapshot
  | AllocationAnalyticsSnapshot;

export interface AnalyticsSnapshotOptions {
  source?: AnalyticsSource;
  reportId?: string;
  createdAt?: string;
  workloadId?: string;
  workloadLabel?: string;
}

export interface AnalyticsChartSeries {
  label: string;
  value: number;
  color: string;
}

export interface AnalyticsChartGroup {
  id: string;
  title: string;
  unit: string;
  series: AnalyticsChartSeries[];
}

export interface SnapshotComparison {
  compatible: boolean;
  reason: string;
}
