/**
 * MemoryFlow — Dynamic Memory Allocation Domain Types
 * Pure TypeScript Models (Decoupled from React/UI)
 */

export type AllocationStrategy = 'FIRST_FIT' | 'BEST_FIT' | 'WORST_FIT';

export type PartitionStatus = 'FREE' | 'ALLOCATED' | 'RESERVED';

export interface MemoryPartition {
  id: string;
  startAddress: number; // In KB
  size: number;         // In KB
  status: PartitionStatus;
  processId: string | null;
  requestedSize: number | null; // Exact size requested by process (null when FREE/RESERVED)
  label?: string;
  color?: string;
}

export type AllocationOperationType = 'ALLOCATE' | 'DEALLOCATE';

export interface AllocationOperation {
  type: AllocationOperationType;
  processId: string;
  size?: number; // Required for ALLOCATE
}

export type AllocationFailureReason =
  | 'INVALID_SIZE'
  | 'DUPLICATE_PROCESS'
  | 'PROCESS_NOT_FOUND'
  | 'NO_SUFFICIENT_HOLE'
  | 'EXTERNAL_FRAGMENTATION';

export interface AllocationMetrics {
  totalMemoryKb: number;
  reservedKb: number;
  userPoolKb: number;             // totalMemoryKb - reservedKb (denominator for user-space utilization)
  allocatedKb: number;            // Sum of ALLOCATED partition sizes
  requestedKb: number;            // Sum of ALLOCATED requested sizes
  totalFreeKb: number;            // Sum of FREE hole sizes
  largestHoleKb: number;          // Max FREE hole size
  freeHoleCount: number;
  allocatedBlockCount: number;
  internalFragmentationKb: number; // Sum of (b.size - b.requestedSize) for ALLOCATED blocks
  externalFragmentationKb: number; // totalFreeKb - largestHoleKb
  externalFragmentationPercent: number; // (externalFragmentationKb / totalFreeKb) * 100 (0 if totalFreeKb === 0)
  utilizationPercent: number;      // (allocatedKb / userPoolKb) * 100
  totalUtilizationPercent: number; // ((allocatedKb + reservedKb) / totalMemoryKb) * 100
  successfulAllocations: number;
  failedAllocations: number;
  deallocations: number;
}

export interface AllocationStepResult {
  stepIndex: number;
  strategy: AllocationStrategy;
  operation: AllocationOperation;
  success: boolean;
  failureReason?: AllocationFailureReason;
  selectedHoleId: string | null;
  allocatedStartAddress: number | null;
  splitOccurred: boolean;
  coalescedCount: number; // Number of holes merged during deallocation (0 if none)
  partitions: MemoryPartition[];
  metrics: AllocationMetrics;
  explanation: string;
}

export interface TripleStrategyStep {
  stepIndex: number;
  operation: AllocationOperation;
  firstFit: AllocationStepResult;
  bestFit: AllocationStepResult;
  worstFit: AllocationStepResult;
}

export interface StrategyState {
  strategy: AllocationStrategy;
  partitions: MemoryPartition[];
  successfulAllocations: number;
  failedAllocations: number;
  deallocations: number;
  metrics: AllocationMetrics;
}

export interface AllocationSnapshot {
  stepIndex: number;
  firstFit: StrategyState;
  bestFit: StrategyState;
  worstFit: StrategyState;
  history: TripleStrategyStep[];
}

export interface AllocationPreset {
  id: string;
  label: string;
  description: string;
  totalMemoryKb: number;
  minHoleThresholdKb: number;
  initialPartitions: MemoryPartition[];
  operations: AllocationOperation[];
}

export interface ActiveProcessSummary {
  processId: string;
  allocatedIn: AllocationStrategy[];
}
