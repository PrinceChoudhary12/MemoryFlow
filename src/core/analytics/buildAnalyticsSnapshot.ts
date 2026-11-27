import type { AnalyticsSnapshot, AnalyticsSnapshotOptions } from './types';
import { adaptEngine } from './analyticsAdapters';
import type { AllocationEngine } from '../allocation/allocationEngine';
import type { PagingEngine } from '../paging/pagingEngine';
import type { ReplacementEngine } from '../replacement/replacementEngine';
import type { SegmentationEngine } from '../segmentation/segmentationEngine';
import type { VirtualMemoryEngine } from '../virtualMemory/virtualMemoryEngine';

export type AnalyticsEngine =
  | PagingEngine
  | SegmentationEngine
  | VirtualMemoryEngine
  | ReplacementEngine
  | AllocationEngine;

export function buildAnalyticsSnapshot(
  engine: AnalyticsEngine,
  options: AnalyticsSnapshotOptions = {}
): AnalyticsSnapshot {
  return adaptEngine(engine, options);
}
