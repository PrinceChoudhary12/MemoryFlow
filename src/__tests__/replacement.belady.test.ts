import { describe, it, expect } from 'vitest';
import { runFifo } from '../core/replacement/fifoAlgorithm';
import { detectBeladyAnomaly } from '../core/replacement/beladyDetector';

describe("Belady's Anomaly Detection & FIFO Verification", () => {
  // Classic Belady's Anomaly reference string
  const beladySequence = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

  it('mathematically verifies Belady Anomaly: 3 frames yields 9 faults, 4 frames yields 10 faults', () => {
    const result3 = runFifo(beladySequence, 3);
    const result4 = runFifo(beladySequence, 4);

    expect(result3.faults).toBe(9);
    expect(result4.faults).toBe(10);
    // Increasing frames from 3 to 4 increased faults by 1!
    expect(result4.faults).toBeGreaterThan(result3.faults);
  });

  it('detectBeladyAnomaly correctly identifies the anomaly and returns the anomaly pair', () => {
    const detection = detectBeladyAnomaly(beladySequence, 2, 6);

    expect(detection.hasAnomaly).toBe(true);
    expect(detection.anomalyPairs.length).toBeGreaterThan(0);

    const pair3to4 = detection.anomalyPairs.find(
      (p) => p.lowerFrames === 3 && p.higherFrames === 4
    );

    expect(pair3to4).toBeDefined();
    expect(pair3to4?.lowerFaults).toBe(9);
    expect(pair3to4?.higherFaults).toBe(10);
    expect(pair3to4?.faultIncrease).toBe(1);
  });

  it('reports hasAnomaly as false for strictly monotonic/normal sequences', () => {
    // Pure sequential stream without loop
    const sequential = [1, 2, 3, 4, 5, 6, 7, 8];
    const detection = detectBeladyAnomaly(sequential, 2, 5);

    // In a purely sequential stream, every access is cold fault regardless of frames (8 faults across all frame counts)
    // No frame count will have strictly MORE faults than a lower frame count
    expect(detection.hasAnomaly).toBe(false);
    expect(detection.anomalyPairs).toHaveLength(0);
  });

  it('validates frame count boundaries', () => {
    expect(() => detectBeladyAnomaly(beladySequence, 0, 5)).toThrow('Invalid frame bounds');
    expect(() => detectBeladyAnomaly(beladySequence, 5, 3)).toThrow('Invalid frame bounds');
  });
});
