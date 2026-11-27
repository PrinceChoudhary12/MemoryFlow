/**
 * MemoryFlow — Dynamic Memory Allocation Strategies & Pure Partition Operations
 * Pure TypeScript implementation decoupled from React/UI.
 */

import type {
  AllocationMetrics,
  AllocationOperation,
  AllocationStepResult,
  AllocationStrategy,
  MemoryPartition,
} from './types';

const PROCESS_COLORS = [
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
];

export type PartitionIdGenerator = (prefix?: string) => string;

let partitionSeq = 0;
function nextPartitionId(prefix = 'part'): string {
  partitionSeq += 1;
  return `${prefix}-${partitionSeq}`;
}

export function getProcessColor(processId: string): string {
  let hash = 0;
  for (let i = 0; i < processId.length; i++) {
    hash = (hash * 31 + processId.charCodeAt(i)) >>> 0;
  }
  return PROCESS_COLORS[hash % PROCESS_COLORS.length];
}

export function clonePartitions(partitions: MemoryPartition[]): MemoryPartition[] {
  return partitions.map((p) => ({ ...p }));
}

/**
 * Normalizes and validates partition ordering without mutating input.
 */
export function sortPartitionsByAddress(
  partitions: MemoryPartition[]
): MemoryPartition[] {
  return clonePartitions(partitions).sort((a, b) => a.startAddress - b.startAddress);
}

/**
 * Selects the FIRST free hole (lowest startAddress) with size >= requestSize.
 */
export function selectHoleFirstFit(
  partitions: MemoryPartition[],
  requestSize: number
): MemoryPartition | null {
  const ordered = sortPartitionsByAddress(partitions);
  for (const part of ordered) {
    if (part.status === 'FREE' && part.size >= requestSize) {
      return part;
    }
  }
  return null;
}

/**
 * Selects the SMALLEST free hole with size >= requestSize.
 * Deterministic tie-breaking: lowest startAddress wins.
 */
export function selectHoleBestFit(
  partitions: MemoryPartition[],
  requestSize: number
): MemoryPartition | null {
  const ordered = sortPartitionsByAddress(partitions);
  let best: MemoryPartition | null = null;

  for (const part of ordered) {
    if (part.status === 'FREE' && part.size >= requestSize) {
      if (
        best === null ||
        part.size < best.size ||
        (part.size === best.size && part.startAddress < best.startAddress)
      ) {
        best = part;
      }
    }
  }

  return best;
}

/**
 * Selects the LARGEST free hole with size >= requestSize.
 * Deterministic tie-breaking: lowest startAddress wins.
 */
export function selectHoleWorstFit(
  partitions: MemoryPartition[],
  requestSize: number
): MemoryPartition | null {
  const ordered = sortPartitionsByAddress(partitions);
  let worst: MemoryPartition | null = null;

  for (const part of ordered) {
    if (part.status === 'FREE' && part.size >= requestSize) {
      if (
        worst === null ||
        part.size > worst.size ||
        (part.size === worst.size && part.startAddress < worst.startAddress)
      ) {
        worst = part;
      }
    }
  }

  return worst;
}

export function selectHoleByStrategy(
  partitions: MemoryPartition[],
  requestSize: number,
  strategy: AllocationStrategy
): MemoryPartition | null {
  switch (strategy) {
    case 'FIRST_FIT':
      return selectHoleFirstFit(partitions, requestSize);
    case 'BEST_FIT':
      return selectHoleBestFit(partitions, requestSize);
    case 'WORST_FIT':
      return selectHoleWorstFit(partitions, requestSize);
  }
}

/**
 * Coalesces contiguous FREE partitions into unified larger free holes.
 * RESERVED and ALLOCATED blocks act as barriers and are never merged.
 */
export function coalesceFreeHoles(partitions: MemoryPartition[]): {
  partitions: MemoryPartition[];
  coalescedCount: number;
} {
  const ordered = sortPartitionsByAddress(partitions);
  const result: MemoryPartition[] = [];
  let coalescedCount = 0;

  for (const current of ordered) {
    const prev = result[result.length - 1];
    if (
      prev &&
      prev.status === 'FREE' &&
      current.status === 'FREE' &&
      prev.startAddress + prev.size === current.startAddress
    ) {
      prev.size += current.size;
      coalescedCount += 1;
    } else {
      result.push({ ...current });
    }
  }

  return { partitions: result, coalescedCount };
}

/**
 * Computes deterministic memory utilization and fragmentation metrics.
 *
 * Explicit Definitions:
 * - userPoolKb = totalMemoryKb - reservedKb
 * - utilizationPercent = (allocatedKb / userPoolKb) * 100
 * - internalFragmentationKb = sum(b.size - b.requestedSize) across ALLOCATED blocks
 * - externalFragmentationKb = totalFreeKb - largestHoleKb (0 if <= 1 free hole)
 * - externalFragmentationPercent = totalFreeKb > 0 ? (externalFragmentationKb / totalFreeKb) * 100 : 0
 */
export function computeAllocationMetrics(
  partitions: MemoryPartition[],
  counters: {
    successfulAllocations: number;
    failedAllocations: number;
    deallocations: number;
  }
): AllocationMetrics {
  let totalMemoryKb = 0;
  let reservedKb = 0;
  let allocatedKb = 0;
  let requestedKb = 0;
  let totalFreeKb = 0;
  let largestHoleKb = 0;
  let freeHoleCount = 0;
  let allocatedBlockCount = 0;
  let internalFragmentationKb = 0;

  for (const part of partitions) {
    totalMemoryKb += part.size;

    if (part.status === 'RESERVED') {
      reservedKb += part.size;
    } else if (part.status === 'ALLOCATED') {
      allocatedKb += part.size;
      allocatedBlockCount += 1;
      const req = part.requestedSize ?? part.size;
      requestedKb += req;
      internalFragmentationKb += Math.max(0, part.size - req);
    } else if (part.status === 'FREE') {
      totalFreeKb += part.size;
      freeHoleCount += 1;
      if (part.size > largestHoleKb) {
        largestHoleKb = part.size;
      }
    }
  }

  const userPoolKb = Math.max(0, totalMemoryKb - reservedKb);
  const externalFragmentationKb =
    freeHoleCount > 0 ? Math.max(0, totalFreeKb - largestHoleKb) : 0;
  const externalFragmentationPercent =
    totalFreeKb > 0
      ? Math.round((externalFragmentationKb / totalFreeKb) * 10000) / 100
      : 0;
  const utilizationPercent =
    userPoolKb > 0
      ? Math.round((allocatedKb / userPoolKb) * 10000) / 100
      : 0;
  const totalUtilizationPercent =
    totalMemoryKb > 0
      ? Math.round(((allocatedKb + reservedKb) / totalMemoryKb) * 10000) / 100
      : 0;

  return {
    totalMemoryKb,
    reservedKb,
    userPoolKb,
    allocatedKb,
    requestedKb,
    totalFreeKb,
    largestHoleKb,
    freeHoleCount,
    allocatedBlockCount,
    internalFragmentationKb,
    externalFragmentationKb,
    externalFragmentationPercent,
    utilizationPercent,
    totalUtilizationPercent,
    successfulAllocations: counters.successfulAllocations,
    failedAllocations: counters.failedAllocations,
    deallocations: counters.deallocations,
  };
}

/**
 * Executes a single allocation or deallocation step on a partition list.
 */
export function executeAllocationStep(
  currentPartitions: MemoryPartition[],
  operation: AllocationOperation,
  strategy: AllocationStrategy,
  stepIndex: number,
  counters: {
    successfulAllocations: number;
    failedAllocations: number;
    deallocations: number;
  },
  minHoleThresholdKb = 0,
  partitionIdGenerator?: PartitionIdGenerator
): {
  nextPartitions: MemoryPartition[];
  nextCounters: {
    successfulAllocations: number;
    failedAllocations: number;
    deallocations: number;
  };
  stepResult: AllocationStepResult;
} {
  const ordered = sortPartitionsByAddress(currentPartitions);
  const nextCounters = { ...counters };
  const generatePartitionId = partitionIdGenerator ?? nextPartitionId;

  if (operation.type === 'ALLOCATE') {
    const requestSize = operation.size ?? 0;
    const pid = operation.processId.trim();

    // 1. Validate size
    if (!Number.isFinite(requestSize) || requestSize <= 0 || !Number.isInteger(requestSize)) {
      nextCounters.failedAllocations += 1;
      const metrics = computeAllocationMetrics(ordered, nextCounters);
      return {
        nextPartitions: ordered,
        nextCounters,
        stepResult: {
          stepIndex,
          strategy,
          operation,
          success: false,
          failureReason: 'INVALID_SIZE',
          selectedHoleId: null,
          allocatedStartAddress: null,
          splitOccurred: false,
          coalescedCount: 0,
          partitions: ordered,
          metrics,
          explanation: `Failed to allocate ${pid}: requested size (${requestSize} KB) must be a positive integer.`,
        },
      };
    }

    // 2. Check duplicate active process ID
    const existingProcess = ordered.find(
      (p) => p.status === 'ALLOCATED' && p.processId === pid
    );
    if (existingProcess) {
      nextCounters.failedAllocations += 1;
      const metrics = computeAllocationMetrics(ordered, nextCounters);
      return {
        nextPartitions: ordered,
        nextCounters,
        stepResult: {
          stepIndex,
          strategy,
          operation,
          success: false,
          failureReason: 'DUPLICATE_PROCESS',
          selectedHoleId: null,
          allocatedStartAddress: null,
          splitOccurred: false,
          coalescedCount: 0,
          partitions: ordered,
          metrics,
          explanation: `Failed to allocate ${pid} (${requestSize} KB): process ${pid} is already active in memory.`,
        },
      };
    }

    // 3. Find matching hole by strategy
    const chosenHole = selectHoleByStrategy(ordered, requestSize, strategy);
    if (!chosenHole) {
      nextCounters.failedAllocations += 1;
      const metrics = computeAllocationMetrics(ordered, nextCounters);
      const failureReason =
        metrics.totalFreeKb >= requestSize
          ? 'EXTERNAL_FRAGMENTATION'
          : 'NO_SUFFICIENT_HOLE';

      const explanation =
        failureReason === 'EXTERNAL_FRAGMENTATION'
          ? `Allocation failed for ${pid} (${requestSize} KB) under ${strategy}: ${metrics.totalFreeKb} KB total free exists across ${metrics.freeHoleCount} holes, but largest contiguous hole is only ${metrics.largestHoleKb} KB (External Fragmentation).`
          : `Allocation failed for ${pid} (${requestSize} KB) under ${strategy}: total free memory (${metrics.totalFreeKb} KB) is less than requested size.`;

      return {
        nextPartitions: ordered,
        nextCounters,
        stepResult: {
          stepIndex,
          strategy,
          operation,
          success: false,
          failureReason,
          selectedHoleId: null,
          allocatedStartAddress: null,
          splitOccurred: false,
          coalescedCount: 0,
          partitions: ordered,
          metrics,
          explanation,
        },
      };
    }

    // 4. Allocate & split if remainder > minHoleThresholdKb
    const remainder = chosenHole.size - requestSize;
    const shouldSplit = remainder > minHoleThresholdKb;
    const nextPartitions: MemoryPartition[] = [];

    for (const part of ordered) {
      if (part.id !== chosenHole.id) {
        nextPartitions.push({ ...part });
        continue;
      }

      if (shouldSplit) {
        nextPartitions.push({
          id: generatePartitionId('alloc'),
          startAddress: part.startAddress,
          size: requestSize,
          status: 'ALLOCATED',
          processId: pid,
          requestedSize: requestSize,
          color: getProcessColor(pid),
        });
        nextPartitions.push({
          id: generatePartitionId('hole'),
          startAddress: part.startAddress + requestSize,
          size: remainder,
          status: 'FREE',
          processId: null,
          requestedSize: null,
        });
      } else {
        // Assign whole hole (absorbs remainder as internal fragmentation)
        nextPartitions.push({
          id: generatePartitionId('alloc'),
          startAddress: part.startAddress,
          size: part.size,
          status: 'ALLOCATED',
          processId: pid,
          requestedSize: requestSize,
          color: getProcessColor(pid),
        });
      }
    }

    nextCounters.successfulAllocations += 1;
    const metrics = computeAllocationMetrics(nextPartitions, nextCounters);
    const splitNote = shouldSplit
      ? `Split ${chosenHole.size} KB hole into ${requestSize} KB (${pid}) + ${remainder} KB free hole.`
      : remainder === 0
      ? `Exact fit into ${chosenHole.size} KB hole (0 KB leftover).`
      : `Assigned entire ${chosenHole.size} KB hole (${remainder} KB internal fragmentation <= ${minHoleThresholdKb} KB threshold).`;

    return {
      nextPartitions,
      nextCounters,
      stepResult: {
        stepIndex,
        strategy,
        operation,
        success: true,
        selectedHoleId: chosenHole.id,
        allocatedStartAddress: chosenHole.startAddress,
        splitOccurred: shouldSplit,
        coalescedCount: 0,
        partitions: nextPartitions,
        metrics,
        explanation: `Allocated ${pid} (${requestSize} KB) at ${chosenHole.startAddress} KB using ${strategy}. ${splitNote}`,
      },
    };
  }

  // DEALLOCATE operation
  const pid = operation.processId.trim();
  const targetIndex = ordered.findIndex(
    (p) => p.status === 'ALLOCATED' && p.processId === pid
  );

  if (targetIndex === -1) {
    const metrics = computeAllocationMetrics(ordered, nextCounters);
    return {
      nextPartitions: ordered,
      nextCounters,
      stepResult: {
        stepIndex,
        strategy,
        operation,
        success: false,
        failureReason: 'PROCESS_NOT_FOUND',
        selectedHoleId: null,
        allocatedStartAddress: null,
        splitOccurred: false,
        coalescedCount: 0,
        partitions: ordered,
        metrics,
        explanation: `Failed to deallocate ${pid}: no active process named ${pid} found in memory.`,
      },
    };
  }

  const freedSize = ordered[targetIndex].size;
  const freedStart = ordered[targetIndex].startAddress;

  const freedPartitions = ordered.map((part, idx) =>
    idx === targetIndex
      ? {
          ...part,
          id: generatePartitionId('hole'),
          status: 'FREE' as const,
          processId: null,
          requestedSize: null,
          color: undefined,
        }
      : { ...part }
  );

  const { partitions: coalescedPartitions, coalescedCount } =
    coalesceFreeHoles(freedPartitions);

  nextCounters.deallocations += 1;
  const metrics = computeAllocationMetrics(coalescedPartitions, nextCounters);
  const coalesceNote =
    coalescedCount > 0
      ? `Coalesced ${coalescedCount} adjacent hole merge${coalescedCount > 1 ? 's' : ''}.`
      : 'No adjacent free holes to coalesce.';

  return {
    nextPartitions: coalescedPartitions,
    nextCounters,
    stepResult: {
      stepIndex,
      strategy,
      operation,
      success: true,
      selectedHoleId: null,
      allocatedStartAddress: freedStart,
      splitOccurred: false,
      coalescedCount,
      partitions: coalescedPartitions,
      metrics,
      explanation: `Deallocated ${pid} (${freedSize} KB at ${freedStart} KB). ${coalesceNote}`,
    },
  };
}
