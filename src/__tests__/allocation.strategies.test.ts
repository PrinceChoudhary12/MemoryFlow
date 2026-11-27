import { describe, it, expect } from 'vitest';
import {
  selectHoleFirstFit,
  selectHoleBestFit,
  selectHoleWorstFit,
  coalesceFreeHoles,
  computeAllocationMetrics,
  executeAllocationStep,
} from '../core/allocation/allocationStrategies';
import { ALLOCATION_PRESETS } from '../core/allocation/allocationEngine';
import type { MemoryPartition } from '../core/allocation/types';

describe('Dynamic Memory Allocation Strategies & Math', () => {
  const sampleHoles: MemoryPartition[] = [
    { id: 'h1', startAddress: 0, size: 100, status: 'FREE', processId: null, requestedSize: null },
    { id: 'r1', startAddress: 100, size: 10, status: 'RESERVED', processId: null, requestedSize: null },
    { id: 'h2', startAddress: 110, size: 500, status: 'FREE', processId: null, requestedSize: null },
    { id: 'r2', startAddress: 610, size: 10, status: 'RESERVED', processId: null, requestedSize: null },
    { id: 'h3', startAddress: 620, size: 200, status: 'FREE', processId: null, requestedSize: null },
    { id: 'r3', startAddress: 820, size: 10, status: 'RESERVED', processId: null, requestedSize: null },
    { id: 'h4', startAddress: 830, size: 300, status: 'FREE', processId: null, requestedSize: null },
    { id: 'r4', startAddress: 1130, size: 10, status: 'RESERVED', processId: null, requestedSize: null },
    { id: 'h5', startAddress: 1140, size: 600, status: 'FREE', processId: null, requestedSize: null },
  ];

  it('selectHoleFirstFit picks the first free hole >= requestSize', () => {
    expect(selectHoleFirstFit(sampleHoles, 212)?.id).toBe('h2'); // 500 KB
    expect(selectHoleFirstFit(sampleHoles, 50)?.id).toBe('h1');  // 100 KB
    expect(selectHoleFirstFit(sampleHoles, 650)).toBeNull();
  });

  it('selectHoleBestFit picks the smallest sufficient hole with lowest-address tie-breaking', () => {
    expect(selectHoleBestFit(sampleHoles, 212)?.id).toBe('h4'); // 300 KB

    const tiedHoles: MemoryPartition[] = [
      { id: 'a', startAddress: 200, size: 150, status: 'FREE', processId: null, requestedSize: null },
      { id: 'b', startAddress: 0, size: 150, status: 'FREE', processId: null, requestedSize: null },
    ];
    expect(selectHoleBestFit(tiedHoles, 100)?.id).toBe('b'); // lowest startAddress 0
  });

  it('selectHoleWorstFit picks the largest sufficient hole with lowest-address tie-breaking', () => {
    expect(selectHoleWorstFit(sampleHoles, 212)?.id).toBe('h5'); // 600 KB

    const tiedHoles: MemoryPartition[] = [
      { id: 'a', startAddress: 500, size: 400, status: 'FREE', processId: null, requestedSize: null },
      { id: 'b', startAddress: 100, size: 400, status: 'FREE', processId: null, requestedSize: null },
    ];
    expect(selectHoleWorstFit(tiedHoles, 100)?.id).toBe('b'); // lowest startAddress 100
  });

  it('verifies the classic Silberschatz benchmark across First-Fit, Best-Fit, and Worst-Fit', () => {
    const preset = ALLOCATION_PRESETS.find((p) => p.id === 'silberschatz')!;
    const runStrategy = (strategy: 'FIRST_FIT' | 'BEST_FIT' | 'WORST_FIT') => {
      let parts = preset.initialPartitions.map((p) => ({ ...p }));
      let counters = { successfulAllocations: 0, failedAllocations: 0, deallocations: 0 };
      const results = [];

      for (let i = 0; i < preset.operations.length; i++) {
        const res = executeAllocationStep(parts, preset.operations[i], strategy, i, counters, 0);
        parts = res.nextPartitions;
        counters = res.nextCounters;
        results.push(res.stepResult);
      }
      return { counters, results };
    };

    const ff = runStrategy('FIRST_FIT');
    const bf = runStrategy('BEST_FIT');
    const wf = runStrategy('WORST_FIT');

    // First-Fit: 3 successful, P4 (426 KB) fails due to EXTERNAL_FRAGMENTATION
    expect(ff.counters.successfulAllocations).toBe(3);
    expect(ff.counters.failedAllocations).toBe(1);
    expect(ff.results[3].failureReason).toBe('EXTERNAL_FRAGMENTATION');

    // Best-Fit: all 4 successful!
    expect(bf.counters.successfulAllocations).toBe(4);
    expect(bf.counters.failedAllocations).toBe(0);

    // Worst-Fit: 3 successful, P4 (426 KB) fails due to EXTERNAL_FRAGMENTATION
    expect(wf.counters.successfulAllocations).toBe(3);
    expect(wf.counters.failedAllocations).toBe(1);
    expect(wf.results[3].failureReason).toBe('EXTERNAL_FRAGMENTATION');
  });

  it('splits free partitions cleanly on allocation and tracks internal fragmentation when threshold > 0', () => {
    const singleHole: MemoryPartition[] = [
      { id: 'h0', startAddress: 0, size: 250, status: 'FREE', processId: null, requestedSize: null },
    ];

    // Exact split (threshold = 0): 100 allocated + 150 free
    const exact = executeAllocationStep(
      singleHole,
      { type: 'ALLOCATE', processId: 'P1', size: 100 },
      'FIRST_FIT',
      0,
      { successfulAllocations: 0, failedAllocations: 0, deallocations: 0 },
      0
    );
    expect(exact.stepResult.splitOccurred).toBe(true);
    expect(exact.nextPartitions).toHaveLength(2);
    expect(exact.nextPartitions[0]).toMatchObject({ status: 'ALLOCATED', size: 100, requestedSize: 100 });
    expect(exact.nextPartitions[1]).toMatchObject({ status: 'FREE', startAddress: 100, size: 150 });
    expect(exact.stepResult.metrics.internalFragmentationKb).toBe(0);

    // Threshold absorption (threshold = 30): allocating 230 in 250 leaves 20 <= 30 -> no split!
    const absorbed = executeAllocationStep(
      singleHole,
      { type: 'ALLOCATE', processId: 'P1', size: 230 },
      'FIRST_FIT',
      0,
      { successfulAllocations: 0, failedAllocations: 0, deallocations: 0 },
      30
    );
    expect(absorbed.stepResult.splitOccurred).toBe(false);
    expect(absorbed.nextPartitions).toHaveLength(1);
    expect(absorbed.nextPartitions[0]).toMatchObject({ status: 'ALLOCATED', size: 250, requestedSize: 230 });
    expect(absorbed.stepResult.metrics.internalFragmentationKb).toBe(20);
  });

  it('coalesces adjacent free holes on deallocation while never merging RESERVED partitions', () => {
    const partitions: MemoryPartition[] = [
      { id: 'res', startAddress: 0, size: 64, status: 'RESERVED', processId: null, requestedSize: null },
      { id: 'f1', startAddress: 64, size: 100, status: 'FREE', processId: null, requestedSize: null },
      { id: 'p2', startAddress: 164, size: 200, status: 'ALLOCATED', processId: 'P2', requestedSize: 200 },
      { id: 'f2', startAddress: 364, size: 150, status: 'FREE', processId: null, requestedSize: null },
    ];

    const dealloc = executeAllocationStep(
      partitions,
      { type: 'DEALLOCATE', processId: 'P2' },
      'FIRST_FIT',
      0,
      { successfulAllocations: 1, failedAllocations: 0, deallocations: 0 }
    );

    expect(dealloc.stepResult.success).toBe(true);
    expect(dealloc.stepResult.coalescedCount).toBe(2); // Merged f1 + P2 + f2
    expect(dealloc.nextPartitions).toHaveLength(2);
    expect(dealloc.nextPartitions[0].status).toBe('RESERVED');
    expect(dealloc.nextPartitions[1]).toMatchObject({
      status: 'FREE',
      startAddress: 64,
      size: 450,
    });

    // Direct coalesce check with RESERVED barrier between two FREE holes
    const barriered: MemoryPartition[] = [
      { id: 'a', startAddress: 0, size: 100, status: 'FREE', processId: null, requestedSize: null },
      { id: 'r', startAddress: 100, size: 10, status: 'RESERVED', processId: null, requestedSize: null },
      { id: 'b', startAddress: 110, size: 100, status: 'FREE', processId: null, requestedSize: null },
    ];
    const noMerge = coalesceFreeHoles(barriered);
    expect(noMerge.coalescedCount).toBe(0);
    expect(noMerge.partitions).toHaveLength(3);
  });

  it('calculates external fragmentation and utilization accurately', () => {
    const parts: MemoryPartition[] = [
      { id: 'r', startAddress: 0, size: 100, status: 'RESERVED', processId: null, requestedSize: null },
      { id: 'f1', startAddress: 100, size: 100, status: 'FREE', processId: null, requestedSize: null },
      { id: 'a1', startAddress: 200, size: 300, status: 'ALLOCATED', processId: 'P1', requestedSize: 280 },
      { id: 'f2', startAddress: 500, size: 200, status: 'FREE', processId: null, requestedSize: null },
    ];

    const metrics = computeAllocationMetrics(parts, {
      successfulAllocations: 1,
      failedAllocations: 0,
      deallocations: 0,
    });

    expect(metrics.totalMemoryKb).toBe(700);
    expect(metrics.reservedKb).toBe(100);
    expect(metrics.userPoolKb).toBe(600);
    expect(metrics.allocatedKb).toBe(300);
    expect(metrics.totalFreeKb).toBe(300);
    expect(metrics.largestHoleKb).toBe(200);
    expect(metrics.internalFragmentationKb).toBe(20);
    expect(metrics.externalFragmentationKb).toBe(100); // 300 - 200
    expect(metrics.externalFragmentationPercent).toBe(33.33);
    expect(metrics.utilizationPercent).toBe(50); // 300 / 600
  });

  it('distinguishes INVALID_SIZE, DUPLICATE_PROCESS, PROCESS_NOT_FOUND, and NO_SUFFICIENT_HOLE', () => {
    const base: MemoryPartition[] = [
      { id: 'a1', startAddress: 0, size: 200, status: 'ALLOCATED', processId: 'P1', requestedSize: 200 },
      { id: 'f1', startAddress: 200, size: 100, status: 'FREE', processId: null, requestedSize: null },
    ];
    const counters = { successfulAllocations: 1, failedAllocations: 0, deallocations: 0 };

    const invalid = executeAllocationStep(base, { type: 'ALLOCATE', processId: 'P2', size: -5 }, 'FIRST_FIT', 0, counters);
    expect(invalid.stepResult.failureReason).toBe('INVALID_SIZE');

    const dup = executeAllocationStep(base, { type: 'ALLOCATE', processId: 'P1', size: 50 }, 'FIRST_FIT', 0, counters);
    expect(dup.stepResult.failureReason).toBe('DUPLICATE_PROCESS');

    const noMem = executeAllocationStep(base, { type: 'ALLOCATE', processId: 'P2', size: 150 }, 'FIRST_FIT', 0, counters);
    expect(noMem.stepResult.failureReason).toBe('NO_SUFFICIENT_HOLE');

    const missing = executeAllocationStep(base, { type: 'DEALLOCATE', processId: 'P99' }, 'FIRST_FIT', 0, counters);
    expect(missing.stepResult.failureReason).toBe('PROCESS_NOT_FOUND');
  });
});
