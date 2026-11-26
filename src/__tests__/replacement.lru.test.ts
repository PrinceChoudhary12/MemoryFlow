import { describe, it, expect } from 'vitest';
import { runLru, executeLruStep } from '../core/replacement/lruAlgorithm';
import { createInitialFrames } from '../core/replacement/fifoAlgorithm';

describe('LRU Page Replacement Algorithm', () => {
  it('correctly simulates the classic Silberschatz textbook sequence with 3 frames', () => {
    // Silberschatz textbook sequence: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1
    const referenceString = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
    const frameCount = 3;

    const result = runLru(referenceString, frameCount);

    expect(result.algorithm).toBe('LRU');
    expect(result.totalAccesses).toBe(20);
    expect(result.faults).toBe(12); // Silberschatz benchmark: LRU yields 12 faults
    expect(result.hits).toBe(8);     // 8 hits
    expect(result.hitRatio).toBe(40);
    expect(result.faultRatio).toBe(60);
    expect(result.steps).toHaveLength(20);

    // Verify step 4: page 2 arrives -> evict page 7 (last accessed at step 0)
    expect(result.steps[3].status).toBe('FAULT');
    expect(result.steps[3].victimPage).toBe(7);
    expect(result.steps[3].frames).toEqual([2, 0, 1]);

    // Step 5: page 0 arrives -> HIT, timestamp updated to 4
    expect(result.steps[4].status).toBe('HIT');
    expect(result.steps[4].victimPage).toBeNull();
    expect(result.steps[4].frames).toEqual([2, 0, 1]);

    // Step 6: page 3 arrives. Active pages and last access:
    // Frame 0: Page 2 (last accessed at 3)
    // Frame 1: Page 0 (last accessed at 4)
    // Frame 2: Page 1 (last accessed at 2) <- Least Recently Used!
    // Evicts Page 1 from Frame 2!
    expect(result.steps[5].status).toBe('FAULT');
    expect(result.steps[5].victimPage).toBe(1);
    expect(result.steps[5].replacedFrameIndex).toBe(2);
    expect(result.steps[5].frames).toEqual([2, 0, 3]);
  });

  it('updates lastAccessedAt on hit so that frequently accessed pages are NOT evicted', () => {
    // Frame size 2
    // Step 0: Page 1 -> [1, -]
    // Step 1: Page 2 -> [1, 2]
    // Step 2: Page 1 -> HIT! lastAccessedAt becomes 2. (Page 2 was accessed at 1)
    // Step 3: Page 3 -> Fault. Evicts Page 2 (accessed at 1), keeping Page 1!
    let frames = createInitialFrames(2);

    const s0 = executeLruStep(frames, 1, 0);
    frames = s0.nextFrames;

    const s1 = executeLruStep(frames, 2, 1);
    frames = s1.nextFrames;

    const s2 = executeLruStep(frames, 1, 2);
    frames = s2.nextFrames;
    expect(s2.stepResult.status).toBe('HIT');

    const s3 = executeLruStep(frames, 3, 3);
    expect(s3.stepResult.status).toBe('FAULT');
    expect(s3.stepResult.victimPage).toBe(2); // Page 2 evicted, Page 1 retained
    expect(s3.stepResult.frames).toEqual([1, 3]);
  });

  it('handles empty reference string gracefully', () => {
    const result = runLru([], 3);
    expect(result.totalAccesses).toBe(0);
    expect(result.hits).toBe(0);
    expect(result.faults).toBe(0);
    expect(result.hitRatio).toBe(0);
    expect(result.faultRatio).toBe(0);
    expect(result.steps).toHaveLength(0);
  });

  it('throws error when frame count is invalid', () => {
    expect(() => runLru([1, 2, 3], 0)).toThrow('Frame count must be greater than zero.');
  });
});
