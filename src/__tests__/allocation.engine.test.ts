import { describe, it, expect } from 'vitest';
import {
  AllocationEngine,
  ALLOCATION_PRESETS,
  parseAllocationStream,
} from '../core/allocation/allocationEngine';

describe('AllocationEngine & Operation Stream Parser', () => {
  describe('parseAllocationStream', () => {
    it('parses valid allocate and deallocate clauses', () => {
      const res = parseAllocationStream('A P1 212, A P2 417, D P1, FREE P2');
      expect(res.valid).toBe(true);
      expect(res.operations).toEqual([
        { type: 'ALLOCATE', processId: 'P1', size: 212 },
        { type: 'ALLOCATE', processId: 'P2', size: 417 },
        { type: 'DEALLOCATE', processId: 'P1' },
        { type: 'DEALLOCATE', processId: 'P2' },
      ]);
    });

    it('rejects empty, invalid command, and invalid size clauses', () => {
      expect(parseAllocationStream('   ').valid).toBe(false);
      expect(parseAllocationStream('X P1 100').valid).toBe(false);
      expect(parseAllocationStream('A P1 0').valid).toBe(false);
      expect(parseAllocationStream('A P1 abc').valid).toBe(false);
      expect(parseAllocationStream('A P1 9007199254740992').valid).toBe(false);
      expect(parseAllocationStream('D P1 100').valid).toBe(false);
    });
  });

  describe('AllocationEngine Synchronized Execution & Reversible History', () => {
    it('initializes with Silberschatz preset and steps all 3 strategies synchronously', () => {
      const engine = new AllocationEngine(ALLOCATION_PRESETS[0]);
      expect(engine.getCurrentStepIndex()).toBe(-1);
      expect(engine.canStepForward()).toBe(true);
      expect(engine.canStepBackward()).toBe(false);

      // Step through all 4 Silberschatz requests
      while (engine.canStepForward()) {
        engine.stepForward();
      }

      const state = engine.getState();
      expect(state.stepIndex).toBe(3);
      expect(state.firstFit.successfulAllocations).toBe(3);
      expect(state.firstFit.metrics.utilizationPercent).toBe(43.59);
      expect(state.bestFit.successfulAllocations).toBe(4);
      expect(state.bestFit.metrics.utilizationPercent).toBe(68.65);
      expect(state.worstFit.successfulAllocations).toBe(3);
      expect(state.worstFit.metrics.utilizationPercent).toBe(43.59);

      // P4 only succeeded in Best-Fit; must not be reported as allocated in First-Fit or Worst-Fit
      const summary = engine.getActiveProcessSummary();
      expect(summary).toEqual([
        { processId: 'P1', allocatedIn: ['FIRST_FIT', 'BEST_FIT', 'WORST_FIT'] },
        { processId: 'P2', allocatedIn: ['FIRST_FIT', 'BEST_FIT', 'WORST_FIT'] },
        { processId: 'P3', allocatedIn: ['FIRST_FIT', 'BEST_FIT', 'WORST_FIT'] },
        { processId: 'P4', allocatedIn: ['BEST_FIT'] },
      ]);
    });

    it('verifies Deallocation & Hole Coalescing, External Fragmentation Trap, and Internal vs External presets', () => {
      // 1. Coalescing preset
      const coalescingEngine = new AllocationEngine(ALLOCATION_PRESETS[1]);
      coalescingEngine.stepTo(6);
      const coalState = coalescingEngine.getState();
      expect(coalState.history[5].firstFit.coalescedCount).toBe(2); // 3-way merge on D P2
      expect(coalState.firstFit.successfulAllocations).toBe(4); // P4 (700K) succeeds after coalesce
      expect(coalState.bestFit.successfulAllocations).toBe(4);
      expect(coalState.worstFit.successfulAllocations).toBe(4);

      // 2. External Fragmentation Trap preset
      const fragEngine = new AllocationEngine(ALLOCATION_PRESETS[2]);
      fragEngine.stepTo(6);
      const fragState = fragEngine.getState();
      expect(fragState.history[6].firstFit.success).toBe(false);
      expect(fragState.history[6].firstFit.failureReason).toBe('EXTERNAL_FRAGMENTATION');
      expect(fragState.firstFit.metrics.externalFragmentationKb).toBe(256);
      // Failed-everywhere P5 must NOT appear in active processes
      expect(fragEngine.getActiveProcessIds()).not.toContain('P5');

      // 3. Internal vs External Trade-off preset (32 KB threshold)
      const intEngine = new AllocationEngine(ALLOCATION_PRESETS[3]);
      intEngine.stepTo(3);
      const intState = intEngine.getState();
      expect(intState.firstFit.metrics.internalFragmentationKb).toBe(49); // 24 KB + 25 KB
    });

    it('reversibly restores partitions, holes, and metrics on stepBackward and reset', () => {
      const engine = new AllocationEngine(ALLOCATION_PRESETS[1]); // Coalescing preset
      const baseline = engine.getState();

      engine.stepForward(); // Allocate P1 (200)
      engine.stepForward(); // Allocate P2 (300)
      const step1State = engine.getState();
      expect(step1State.firstFit.metrics.allocatedKb).toBe(500);

      engine.stepForward(); // Allocate P3 (150)
      expect(engine.getState().firstFit.metrics.allocatedKb).toBe(650);

      // Step back 1 step
      expect(engine.stepBackward()).toBe(true);
      expect(engine.getState().stepIndex).toBe(1);
      expect(engine.getState().firstFit.metrics.allocatedKb).toBe(500);

      // Reset to baseline
      engine.reset();
      expect(engine.getState().stepIndex).toBe(-1);
      expect(engine.getState().firstFit.metrics.allocatedKb).toBe(0);
      expect(engine.getState().firstFit.partitions).toEqual(baseline.firstFit.partitions);
    });

    it('supports stepTo forward and backward jumps and ad-hoc submitOperation', () => {
      const engine = new AllocationEngine(ALLOCATION_PRESETS[2]);
      engine.stepTo(5);
      expect(engine.getCurrentStepIndex()).toBe(5);
      expect(engine.getState().history).toHaveLength(6);

      engine.stepTo(2);
      expect(engine.getCurrentStepIndex()).toBe(2);
      expect(engine.getState().history).toHaveLength(3);

      const adHoc = engine.submitOperation({ type: 'ALLOCATE', processId: 'PX', size: 64 });
      expect(adHoc.firstFit.success).toBe(true);
      expect(engine.getActiveProcessIds()).toContain('PX');
    });

    it('applies one validated custom initial layout and operation stream to all strategies', () => {
      const engine = new AllocationEngine(ALLOCATION_PRESETS[0]);
      const result = engine.configureCustom({
        totalMemoryKb: 300,
        initialPartitions: [
          {
            id: 'free-100',
            startAddress: 0,
            size: 100,
            status: 'FREE',
            processId: null,
            requestedSize: null,
          },
          {
            id: 'reserved-50',
            startAddress: 100,
            size: 50,
            status: 'RESERVED',
            processId: null,
            requestedSize: null,
            label: 'OS',
          },
        ],
        operations: [{ type: 'ALLOCATE', processId: 'P1', size: 80 }],
      });

      expect(result.success).toBe(true);
      const initial = engine.getInitialPartitions();
      expect(initial.map(({ startAddress, size, status }) => ({ startAddress, size, status }))).toEqual([
        { startAddress: 0, size: 100, status: 'FREE' },
        { startAddress: 100, size: 50, status: 'RESERVED' },
        { startAddress: 150, size: 150, status: 'FREE' },
      ]);
      expect(initial[2]).toMatchObject({
        id: 'custom-free-remainder',
        label: 'Unassigned remainder',
        size: 150,
      });
      const initialState = engine.getState();
      expect(initialState.firstFit.partitions).toEqual(initial);
      expect(initialState.bestFit.partitions).toEqual(initial);
      expect(initialState.worstFit.partitions).toEqual(initial);
      expect(engine.getOperations()).toEqual([{ type: 'ALLOCATE', processId: 'P1', size: 80 }]);
      const step = engine.stepForward();
      expect(step?.firstFit.success).toBe(true);
      expect(step?.bestFit.success).toBe(true);
      expect(step?.worstFit.success).toBe(true);
      expect(step?.operation).toEqual({ type: 'ALLOCATE', processId: 'P1', size: 80 });
    });

    it('preserves free partition sizes and allocates from a separate remainder in every strategy', () => {
      const engine = new AllocationEngine(ALLOCATION_PRESETS[0]);
      const result = engine.configureCustom({
        totalMemoryKb: 300,
        initialPartitions: [
          {
            id: 'free-100',
            startAddress: 0,
            size: 100,
            status: 'FREE',
            processId: null,
            requestedSize: null,
          },
          {
            id: 'free-50',
            startAddress: 100,
            size: 50,
            status: 'FREE',
            processId: null,
            requestedSize: null,
          },
        ],
        operations: [{ type: 'ALLOCATE', processId: 'P1', size: 120 }],
      });

      expect(result.success).toBe(true);
      const initial = engine.getInitialPartitions();
      expect(initial.map(({ id, startAddress, size, status, label }) => ({
        id,
        startAddress,
        size,
        status,
        label,
      }))).toEqual([
        { id: 'free-100', startAddress: 0, size: 100, status: 'FREE', label: undefined },
        { id: 'free-50', startAddress: 100, size: 50, status: 'FREE', label: undefined },
        {
          id: 'custom-free-remainder',
          startAddress: 150,
          size: 150,
          status: 'FREE',
          label: 'Unassigned remainder',
        },
      ]);

      const initialState = engine.getState();
      expect(initialState.firstFit.partitions).toEqual(initial);
      expect(initialState.bestFit.partitions).toEqual(initial);
      expect(initialState.worstFit.partitions).toEqual(initial);
      expect(engine.getOperations()).toEqual([{ type: 'ALLOCATE', processId: 'P1', size: 120 }]);

      const step = engine.stepForward();
      expect(step?.firstFit.allocatedStartAddress).toBe(150);
      expect(step?.bestFit.allocatedStartAddress).toBe(150);
      expect(step?.worstFit.allocatedStartAddress).toBe(150);
      for (const strategy of ['firstFit', 'bestFit', 'worstFit'] as const) {
        const allocated = engine.getState()[strategy].partitions.find(
          (partition) => partition.processId === 'P1'
        );
        expect(allocated).toMatchObject({ startAddress: 150, size: 120, requestedSize: 120 });
      }
    });

    it('assigns a stable unique ID to the remainder when a user partition uses its base ID', () => {
      const options = {
        totalMemoryKb: 100,
        initialPartitions: [
          {
            id: 'custom-free-remainder',
            startAddress: 0,
            size: 50,
            status: 'FREE' as const,
            processId: null,
            requestedSize: null,
          },
        ],
      };
      const first = new AllocationEngine(ALLOCATION_PRESETS[0]);
      const second = new AllocationEngine(ALLOCATION_PRESETS[0]);
      expect(first.configureCustom(options).success).toBe(true);
      expect(second.configureCustom(options).success).toBe(true);

      expect(first.getInitialPartitions().map(({ id, size, label }) => ({ id, size, label }))).toEqual([
        { id: 'custom-free-remainder', size: 50, label: undefined },
        { id: 'custom-free-remainder-1', size: 50, label: 'Unassigned remainder' },
      ]);
      expect(second.getInitialPartitions()).toEqual(first.getInitialPartitions());
    });

    it('rejects empty and oversized custom layouts without changing engine state', () => {
      const engine = new AllocationEngine(ALLOCATION_PRESETS[0]);
      const initialBefore = engine.getInitialPartitions();
      const operationsBefore = engine.getOperations();
      const empty = engine.configureCustom({
        totalMemoryKb: 100,
        initialPartitions: [],
        operations: [],
      });
      expect(empty.success).toBe(false);
      expect(empty.error).toContain('At least one initial partition');

      const oversized = engine.configureCustom({
        totalMemoryKb: 100,
        initialPartitions: [
          {
            id: 'too-large',
            startAddress: 0,
            size: 101,
            status: 'FREE',
            processId: null,
            requestedSize: null,
          },
        ],
      });
      expect(oversized.success).toBe(false);
      expect(oversized.error).toContain('cannot exceed');
      expect(engine.getInitialPartitions()).toEqual(initialBefore);
      expect(engine.getOperations()).toEqual(operationsBefore);
    });
  });
});
