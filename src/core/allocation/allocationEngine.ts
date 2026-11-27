/**
 * MemoryFlow — Dynamic Memory Allocation Engine
 * Synchronized 3-way execution engine (First-Fit, Best-Fit, Worst-Fit)
 * with reversible snapshot history, presets, and operation stream parsing.
 */

import {
  clonePartitions,
  computeAllocationMetrics,
  executeAllocationStep,
  sortPartitionsByAddress,
} from './allocationStrategies';
import type {
  ActiveProcessSummary,
  AllocationOperation,
  AllocationPreset,
  AllocationSnapshot,
  AllocationStrategy,
  MemoryPartition,
  StrategyState,
  TripleStrategyStep,
} from './types';

function buildSilberschatzPartitions(): MemoryPartition[] {
  // Creates classic free holes [100, 500, 200, 300, 600] KB separated by 10 KB OS/reserved barriers
  // Total = 1750 KB (1700 KB user free pool + 50 KB reserved)
  return [
    { id: 'hole-1', startAddress: 0, size: 100, status: 'FREE', processId: null, requestedSize: null },
    { id: 'res-1', startAddress: 100, size: 10, status: 'RESERVED', processId: null, requestedSize: null, label: 'OS Barrier' },
    { id: 'hole-2', startAddress: 110, size: 500, status: 'FREE', processId: null, requestedSize: null },
    { id: 'res-2', startAddress: 610, size: 10, status: 'RESERVED', processId: null, requestedSize: null, label: 'OS Barrier' },
    { id: 'hole-3', startAddress: 620, size: 200, status: 'FREE', processId: null, requestedSize: null },
    { id: 'res-3', startAddress: 820, size: 10, status: 'RESERVED', processId: null, requestedSize: null, label: 'OS Barrier' },
    { id: 'hole-4', startAddress: 830, size: 300, status: 'FREE', processId: null, requestedSize: null },
    { id: 'res-4', startAddress: 1130, size: 10, status: 'RESERVED', processId: null, requestedSize: null, label: 'OS Barrier' },
    { id: 'hole-5', startAddress: 1140, size: 600, status: 'FREE', processId: null, requestedSize: null },
  ];
}

export const ALLOCATION_PRESETS: AllocationPreset[] = [
  {
    id: 'silberschatz',
    label: 'Silberschatz Classic Holes',
    description:
      'Textbook benchmark with free holes [100, 500, 200, 300, 600] KB and requests [212, 417, 112, 426] KB. Best-Fit allocates all 4; First-Fit and Worst-Fit fail on P4.',
    totalMemoryKb: 1740,
    minHoleThresholdKb: 0,
    initialPartitions: buildSilberschatzPartitions(),
    operations: [
      { type: 'ALLOCATE', processId: 'P1', size: 212 },
      { type: 'ALLOCATE', processId: 'P2', size: 417 },
      { type: 'ALLOCATE', processId: 'P3', size: 112 },
      { type: 'ALLOCATE', processId: 'P4', size: 426 },
    ],
  },
  {
    id: 'coalescing',
    label: 'Deallocation & Hole Coalescing',
    description:
      'Demonstrates contiguous splitting followed by freeing middle processes so adjacent holes coalesce into a unified 600 KB block.',
    totalMemoryKb: 1024,
    minHoleThresholdKb: 0,
    initialPartitions: [
      { id: 'res-os', startAddress: 0, size: 64, status: 'RESERVED', processId: null, requestedSize: null, label: 'OS Kernel' },
      { id: 'free-main', startAddress: 64, size: 960, status: 'FREE', processId: null, requestedSize: null },
    ],
    operations: [
      { type: 'ALLOCATE', processId: 'P1', size: 200 },
      { type: 'ALLOCATE', processId: 'P2', size: 300 },
      { type: 'ALLOCATE', processId: 'P3', size: 150 },
      { type: 'DEALLOCATE', processId: 'P1' },
      { type: 'DEALLOCATE', processId: 'P3' },
      { type: 'DEALLOCATE', processId: 'P2' }, // Triggers 3-way coalesce!
      { type: 'ALLOCATE', processId: 'P4', size: 700 },
    ],
  },
  {
    id: 'fragmentation-stress',
    label: 'External Fragmentation Trap',
    description:
      'Allocates and selectively frees alternating blocks to create checkerboard fragmentation where total free memory suffices but no single hole fits.',
    totalMemoryKb: 1024,
    minHoleThresholdKb: 0,
    initialPartitions: [
      { id: 'free-all', startAddress: 0, size: 1024, status: 'FREE', processId: null, requestedSize: null },
    ],
    operations: [
      { type: 'ALLOCATE', processId: 'P1', size: 256 },
      { type: 'ALLOCATE', processId: 'P2', size: 256 },
      { type: 'ALLOCATE', processId: 'P3', size: 256 },
      { type: 'ALLOCATE', processId: 'P4', size: 256 },
      { type: 'DEALLOCATE', processId: 'P1' },
      { type: 'DEALLOCATE', processId: 'P3' }, // Two non-adjacent 256 KB holes = 512 KB total
      { type: 'ALLOCATE', processId: 'P5', size: 400 }, // Fails due to external fragmentation!
    ],
  },
  {
    id: 'internal-vs-external',
    label: 'Internal vs External Trade-off',
    description:
      'Sets a 32 KB minimum hole split threshold so small leftover slivers are absorbed into allocated blocks as internal fragmentation.',
    totalMemoryKb: 1024,
    minHoleThresholdKb: 32,
    initialPartitions: [
      { id: 'free-all', startAddress: 0, size: 1024, status: 'FREE', processId: null, requestedSize: null },
    ],
    operations: [
      { type: 'ALLOCATE', processId: 'P1', size: 250 },
      { type: 'ALLOCATE', processId: 'P2', size: 750 }, // Leaves 24 KB <= 32 KB -> absorbed!
      { type: 'DEALLOCATE', processId: 'P1' },
      { type: 'ALLOCATE', processId: 'P3', size: 225 }, // Leaves 25 KB <= 32 KB -> absorbed!
    ],
  },
];

/**
 * Parses a text operation stream such as:
 * "A P1 212, A P2 417, D P1" or "ALLOC P1 212; FREE P1"
 */
export function parseAllocationStream(input: string): {
  valid: boolean;
  operations: AllocationOperation[];
  error?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, operations: [], error: 'Operation stream cannot be empty.' };
  }

  const rawClauses = trimmed
    .split(/[,;\n]+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  if (rawClauses.length === 0) {
    return { valid: false, operations: [], error: 'No operations found.' };
  }

  const operations: AllocationOperation[] = [];

  for (let i = 0; i < rawClauses.length; i++) {
    const tokens = rawClauses[i].split(/\s+/);
    const cmd = tokens[0].toUpperCase();

    if (cmd === 'A' || cmd === 'ALLOC' || cmd === 'ALLOCATE') {
      if (tokens.length !== 3) {
        return {
          valid: false,
          operations: [],
          error: `Clause #${i + 1} ("${rawClauses[i]}"): Expected format "A <PID> <SIZE>".`,
        };
      }
      const pid = tokens[1];
      const size = Number(tokens[2]);
      if (!Number.isInteger(size) || size <= 0) {
        return {
          valid: false,
          operations: [],
          error: `Clause #${i + 1}: Size "${tokens[2]}" must be a positive integer.`,
        };
      }
      operations.push({ type: 'ALLOCATE', processId: pid, size });
    } else if (cmd === 'D' || cmd === 'DEALLOC' || cmd === 'DEALLOCATE' || cmd === 'FREE') {
      if (tokens.length !== 2) {
        return {
          valid: false,
          operations: [],
          error: `Clause #${i + 1} ("${rawClauses[i]}"): Expected format "D <PID>".`,
        };
      }
      operations.push({ type: 'DEALLOCATE', processId: tokens[1] });
    } else {
      return {
        valid: false,
        operations: [],
        error: `Clause #${i + 1}: Unknown command "${tokens[0]}". Use A/ALLOC or D/FREE.`,
      };
    }
  }

  if (operations.length > 40) {
    return {
      valid: false,
      operations: [],
      error: 'Operation stream cannot exceed 40 steps.',
    };
  }

  return { valid: true, operations };
}

function makeStrategyState(
  strategy: 'FIRST_FIT' | 'BEST_FIT' | 'WORST_FIT',
  partitions: MemoryPartition[],
  counters = { successfulAllocations: 0, failedAllocations: 0, deallocations: 0 }
): StrategyState {
  const cloned = sortPartitionsByAddress(partitions);
  return {
    strategy,
    partitions: cloned,
    ...counters,
    metrics: computeAllocationMetrics(cloned, counters),
  };
}

export class AllocationEngine {
  private initialPartitions: MemoryPartition[];
  private minHoleThresholdKb: number;
  private operations: AllocationOperation[];
  private currentStepIndex: number;
  private firstFit: StrategyState;
  private bestFit: StrategyState;
  private worstFit: StrategyState;
  private history: TripleStrategyStep[];
  private snapshots: AllocationSnapshot[];

  constructor(preset: AllocationPreset = ALLOCATION_PRESETS[0]) {
    this.initialPartitions = sortPartitionsByAddress(preset.initialPartitions);
    this.minHoleThresholdKb = preset.minHoleThresholdKb;
    this.operations = preset.operations.map((op) => ({ ...op }));
    this.currentStepIndex = -1;
    this.firstFit = makeStrategyState('FIRST_FIT', this.initialPartitions);
    this.bestFit = makeStrategyState('BEST_FIT', this.initialPartitions);
    this.worstFit = makeStrategyState('WORST_FIT', this.initialPartitions);
    this.history = [];
    this.snapshots = [this.captureSnapshot()];
  }

  private captureSnapshot(): AllocationSnapshot {
    return {
      stepIndex: this.currentStepIndex,
      firstFit: makeStrategyState('FIRST_FIT', this.firstFit.partitions, {
        successfulAllocations: this.firstFit.successfulAllocations,
        failedAllocations: this.firstFit.failedAllocations,
        deallocations: this.firstFit.deallocations,
      }),
      bestFit: makeStrategyState('BEST_FIT', this.bestFit.partitions, {
        successfulAllocations: this.bestFit.successfulAllocations,
        failedAllocations: this.bestFit.failedAllocations,
        deallocations: this.bestFit.deallocations,
      }),
      worstFit: makeStrategyState('WORST_FIT', this.worstFit.partitions, {
        successfulAllocations: this.worstFit.successfulAllocations,
        failedAllocations: this.worstFit.failedAllocations,
        deallocations: this.worstFit.deallocations,
      }),
      history: [...this.history],
    };
  }

  public getOperations(): AllocationOperation[] {
    return this.operations.map((op) => ({ ...op }));
  }

  public getMinHoleThresholdKb(): number {
    return this.minHoleThresholdKb;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  public getState(): AllocationSnapshot {
    return this.captureSnapshot();
  }

  public canStepForward(): boolean {
    return this.currentStepIndex + 1 < this.operations.length;
  }

  public canStepBackward(): boolean {
    return this.currentStepIndex >= 0;
  }

  private applyOperation(op: AllocationOperation, stepIdx: number): TripleStrategyStep {
    const ffRes = executeAllocationStep(
      this.firstFit.partitions,
      op,
      'FIRST_FIT',
      stepIdx,
      {
        successfulAllocations: this.firstFit.successfulAllocations,
        failedAllocations: this.firstFit.failedAllocations,
        deallocations: this.firstFit.deallocations,
      },
      this.minHoleThresholdKb
    );

    const bfRes = executeAllocationStep(
      this.bestFit.partitions,
      op,
      'BEST_FIT',
      stepIdx,
      {
        successfulAllocations: this.bestFit.successfulAllocations,
        failedAllocations: this.bestFit.failedAllocations,
        deallocations: this.bestFit.deallocations,
      },
      this.minHoleThresholdKb
    );

    const wfRes = executeAllocationStep(
      this.worstFit.partitions,
      op,
      'WORST_FIT',
      stepIdx,
      {
        successfulAllocations: this.worstFit.successfulAllocations,
        failedAllocations: this.worstFit.failedAllocations,
        deallocations: this.worstFit.deallocations,
      },
      this.minHoleThresholdKb
    );

    this.firstFit = makeStrategyState('FIRST_FIT', ffRes.nextPartitions, ffRes.nextCounters);
    this.bestFit = makeStrategyState('BEST_FIT', bfRes.nextPartitions, bfRes.nextCounters);
    this.worstFit = makeStrategyState('WORST_FIT', wfRes.nextPartitions, wfRes.nextCounters);

    return {
      stepIndex: stepIdx,
      operation: { ...op },
      firstFit: ffRes.stepResult,
      bestFit: bfRes.stepResult,
      worstFit: wfRes.stepResult,
    };
  }

  public stepForward(): TripleStrategyStep | null {
    if (!this.canStepForward()) return null;

    const nextIdx = this.currentStepIndex + 1;
    const op = this.operations[nextIdx];
    const tripleStep = this.applyOperation(op, nextIdx);

    this.currentStepIndex = nextIdx;
    this.history.push(tripleStep);
    this.snapshots.push(this.captureSnapshot());

    return tripleStep;
  }

  /**
   * Appends and immediately executes an ad-hoc operation from the interactive UI.
   * Truncates any future unexecuted operations beyond currentStepIndex if needed.
   */
  public submitOperation(op: AllocationOperation): TripleStrategyStep {
    if (this.currentStepIndex + 1 < this.operations.length) {
      this.operations = this.operations.slice(0, this.currentStepIndex + 1);
    }
    this.operations.push({ ...op });
    const step = this.stepForward();
    if (!step) {
      throw new Error('Failed to execute submitted operation.');
    }
    return step;
  }

  public stepBackward(): boolean {
    if (!this.canStepBackward()) return false;

    this.snapshots.pop();
    const prev = this.snapshots[this.snapshots.length - 1];
    if (!prev) {
      this.reset();
      return true;
    }

    this.currentStepIndex = prev.stepIndex;
    this.firstFit = makeStrategyState('FIRST_FIT', prev.firstFit.partitions, {
      successfulAllocations: prev.firstFit.successfulAllocations,
      failedAllocations: prev.firstFit.failedAllocations,
      deallocations: prev.firstFit.deallocations,
    });
    this.bestFit = makeStrategyState('BEST_FIT', prev.bestFit.partitions, {
      successfulAllocations: prev.bestFit.successfulAllocations,
      failedAllocations: prev.bestFit.failedAllocations,
      deallocations: prev.bestFit.deallocations,
    });
    this.worstFit = makeStrategyState('WORST_FIT', prev.worstFit.partitions, {
      successfulAllocations: prev.worstFit.successfulAllocations,
      failedAllocations: prev.worstFit.failedAllocations,
      deallocations: prev.worstFit.deallocations,
    });
    this.history = [...prev.history];

    return true;
  }

  public stepTo(targetIndex: number): void {
    if (targetIndex < -1 || targetIndex >= this.operations.length) return;
    if (targetIndex === this.currentStepIndex) return;

    if (targetIndex < this.currentStepIndex) {
      while (this.currentStepIndex > targetIndex && this.canStepBackward()) {
        this.stepBackward();
      }
    } else {
      while (this.currentStepIndex < targetIndex && this.canStepForward()) {
        this.stepForward();
      }
    }
  }

  public reset(): void {
    this.currentStepIndex = -1;
    this.firstFit = makeStrategyState('FIRST_FIT', this.initialPartitions);
    this.bestFit = makeStrategyState('BEST_FIT', this.initialPartitions);
    this.worstFit = makeStrategyState('WORST_FIT', this.initialPartitions);
    this.history = [];
    this.snapshots = [this.captureSnapshot()];
  }

  public loadPreset(presetId: string): boolean {
    const preset = ALLOCATION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;

    this.initialPartitions = sortPartitionsByAddress(preset.initialPartitions);
    this.minHoleThresholdKb = preset.minHoleThresholdKb;
    this.operations = preset.operations.map((op) => ({ ...op }));
    this.reset();
    return true;
  }

  public configureCustom(options: {
    totalMemoryKb?: number;
    minHoleThresholdKb?: number;
    initialPartitions?: MemoryPartition[];
    operations?: AllocationOperation[];
  }): void {
    if (options.initialPartitions) {
      this.initialPartitions = sortPartitionsByAddress(options.initialPartitions);
    } else if (options.totalMemoryKb && options.totalMemoryKb > 0) {
      this.initialPartitions = [
        {
          id: 'free-custom',
          startAddress: 0,
          size: options.totalMemoryKb,
          status: 'FREE',
          processId: null,
          requestedSize: null,
        },
      ];
    }

    if (options.minHoleThresholdKb !== undefined && options.minHoleThresholdKb >= 0) {
      this.minHoleThresholdKb = options.minHoleThresholdKb;
    }

    if (options.operations) {
      this.operations = options.operations.map((op) => ({ ...op }));
    }

    this.reset();
  }

  public getActiveProcessSummary(): ActiveProcessSummary[] {
    const map = new Map<string, Set<AllocationStrategy>>();
    const strategies: StrategyState[] = [this.firstFit, this.bestFit, this.worstFit];

    for (const st of strategies) {
      for (const p of st.partitions) {
        if (p.status === 'ALLOCATED' && p.processId) {
          let set = map.get(p.processId);
          if (!set) {
            set = new Set<AllocationStrategy>();
            map.set(p.processId, set);
          }
          set.add(st.strategy);
        }
      }
    }

    return Array.from(map.entries())
      .map(([processId, set]) => ({
        processId,
        allocatedIn: Array.from(set),
      }))
      .sort((a, b) =>
        a.processId.localeCompare(b.processId, undefined, { numeric: true })
      );
  }

  public getActiveProcessIds(): string[] {
    return this.getActiveProcessSummary().map((item) => item.processId);
  }

  public getInitialPartitions(): MemoryPartition[] {
    return clonePartitions(this.initialPartitions);
  }
}
