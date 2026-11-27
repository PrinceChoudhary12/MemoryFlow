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
  });
});
