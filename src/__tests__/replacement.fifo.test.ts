import { describe, it, expect } from 'vitest';
import { runFifo, executeFifoStep, createInitialFrames } from '../core/replacement/fifoAlgorithm';

describe('FIFO Page Replacement Algorithm', () => {
  it('correctly simulates the classic Silberschatz textbook sequence with 3 frames', () => {
    // Silberschatz textbook sequence: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1
    const referenceString = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
    const frameCount = 3;

    const result = runFifo(referenceString, frameCount);

    expect(result.algorithm).toBe('FIFO');
    expect(result.totalAccesses).toBe(20);
    expect(result.faults).toBe(15);
    expect(result.hits).toBe(5);
    expect(result.hitRatio).toBe(25);
    expect(result.faultRatio).toBe(75);
    expect(result.steps).toHaveLength(20);

    // Verify first 3 steps are cold start faults
    expect(result.steps[0].status).toBe('FAULT');
    expect(result.steps[0].frames).toEqual([7, null, null]);

    expect(result.steps[1].status).toBe('FAULT');
    expect(result.steps[1].frames).toEqual([7, 0, null]);

    expect(result.steps[2].status).toBe('FAULT');
    expect(result.steps[2].frames).toEqual([7, 0, 1]);

    // Step 4: page 2 arrives -> evict page 7 (oldest loaded at 0)
    expect(result.steps[3].status).toBe('FAULT');
    expect(result.steps[3].victimPage).toBe(7);
    expect(result.steps[3].frames).toEqual([2, 0, 1]);

    // Step 5: page 0 arrives -> HIT in frame 1
    expect(result.steps[4].status).toBe('HIT');
    expect(result.steps[4].victimPage).toBeNull();
    expect(result.steps[4].frames).toEqual([2, 0, 1]);
  });

  it('handles empty reference string gracefully', () => {
    const result = runFifo([], 3);
    expect(result.totalAccesses).toBe(0);
    expect(result.hits).toBe(0);
    expect(result.faults).toBe(0);
    expect(result.hitRatio).toBe(0);
    expect(result.faultRatio).toBe(0);
    expect(result.steps).toHaveLength(0);
  });

  it('throws error when frame count is less than or equal to 0', () => {
    expect(() => runFifo([1, 2, 3], 0)).toThrow('Frame count must be greater than zero.');
    expect(() => runFifo([1, 2, 3], -1)).toThrow('Frame count must be greater than zero.');
  });

  it('registers hits on repeated accesses to the same page', () => {
    const sequence = [1, 1, 1, 1];
    const result = runFifo(sequence, 3);

    expect(result.totalAccesses).toBe(4);
    expect(result.faults).toBe(1); // Only the first is cold fault
    expect(result.hits).toBe(3);
    expect(result.hitRatio).toBe(75);
  });

  it('strictly evicts the oldest loaded page even if other pages are accessed repeatedly', () => {
    // Page 1 loaded at 0, Page 2 loaded at 1.
    // Page 1 is re-accessed at step 2 (HIT).
    // In FIFO, page 1 is STILL the oldest loaded page, so when page 3 arrives at step 3, page 1 MUST be evicted!
    let frames = createInitialFrames(2);

    const s0 = executeFifoStep(frames, 1, 0);
    frames = s0.nextFrames;
    expect(s0.stepResult.status).toBe('FAULT');

    const s1 = executeFifoStep(frames, 2, 1);
    frames = s1.nextFrames;
    expect(s1.stepResult.status).toBe('FAULT');

    const s2 = executeFifoStep(frames, 1, 2);
    frames = s2.nextFrames;
    expect(s2.stepResult.status).toBe('HIT');

    const s3 = executeFifoStep(frames, 3, 3);
    expect(s3.stepResult.status).toBe('FAULT');
    expect(s3.stepResult.victimPage).toBe(1); // Page 1 evicted because FIFO ignores hits on eviction priority!
    expect(s3.stepResult.frames).toEqual([3, 2]);
  });
});
