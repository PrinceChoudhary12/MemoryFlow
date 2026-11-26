/**
 * MemoryFlow — Belady's Anomaly Detector
 * Pure TypeScript implementation decoupled from React/UI.
 *
 * Belady's Anomaly:
 * For certain page reference patterns, increasing the number of physical
 * frames results in an INCREASE in the total number of page faults
 * under FIFO page replacement.
 */

import { runFifo } from './fifoAlgorithm';
import type {
  BeladyAnomalyPair,
  BeladyDetectionResult,
  BeladyFrameResult,
} from './types';

export function detectBeladyAnomaly(
  referenceString: number[],
  minFrames = 2,
  maxFrames = 6
): BeladyDetectionResult {
  if (minFrames < 1 || maxFrames < minFrames) {
    throw new Error(
      `Invalid frame bounds: minFrames (${minFrames}) must be >= 1 and <= maxFrames (${maxFrames}).`
    );
  }

  const resultsByFrame: BeladyFrameResult[] = [];

  for (let f = minFrames; f <= maxFrames; f++) {
    const sim = runFifo(referenceString, f);
    resultsByFrame.push({
      frameCount: f,
      faults: sim.faults,
      hits: sim.hits,
      hitRatio: sim.hitRatio,
      faultRatio: sim.faultRatio,
    });
  }

  const anomalyPairs: BeladyAnomalyPair[] = [];

  // Compare each pair of (f1, f2) where f1 < f2
  for (let i = 0; i < resultsByFrame.length; i++) {
    for (let j = i + 1; j < resultsByFrame.length; j++) {
      const lower = resultsByFrame[i];
      const higher = resultsByFrame[j];

      // Belady anomaly condition: higher frame count has strictly MORE page faults
      if (higher.faults > lower.faults) {
        anomalyPairs.push({
          lowerFrames: lower.frameCount,
          higherFrames: higher.frameCount,
          lowerFaults: lower.faults,
          higherFaults: higher.faults,
          faultIncrease: higher.faults - lower.faults,
        });
      }
    }
  }

  return {
    referenceString: [...referenceString],
    resultsByFrame,
    hasAnomaly: anomalyPairs.length > 0,
    anomalyPairs,
  };
}
