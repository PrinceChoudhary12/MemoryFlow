/**
 * MemoryFlow — LRU (Least Recently Used) Page Replacement Algorithm
 * Pure TypeScript implementation decoupled from React/UI.
 *
 * Replacement Strategy:
 * When a page fault occurs and all frames are full, evict the page
 * that has not been referenced for the longest period of time
 * (earliest lastAccessedAt timestamp).
 */

import type {
  AlgorithmSimulationResult,
  FrameSlot,
  StepResult,
} from './types';
import { createInitialFrames } from './fifoAlgorithm';

export function executeLruStep(
  currentFrames: FrameSlot[],
  pageNumber: number,
  stepIndex: number
): { nextFrames: FrameSlot[]; stepResult: StepResult } {
  // Deep clone current frames to ensure immutability
  const nextFrames: FrameSlot[] = currentFrames.map((f) => ({ ...f }));

  // 1. Check for Page HIT
  const hitIndex = nextFrames.findIndex((f) => f.pageNumber === pageNumber);
  if (hitIndex !== -1) {
    const prevAccess = nextFrames[hitIndex].lastAccessedAt;
    // In LRU, updating the lastAccessedAt timestamp on HIT is the core mechanism
    nextFrames[hitIndex].lastAccessedAt = stepIndex;

    const stepResult: StepResult = {
      stepIndex,
      pageNumber,
      status: 'HIT',
      frames: nextFrames.map((f) => f.pageNumber),
      victimPage: null,
      replacedFrameIndex: null,
      explanation: `Page ${pageNumber} is already in Frame ${hitIndex} (HIT). Updated last access timestamp from step ${prevAccess} to ${stepIndex}.`,
    };

    return { nextFrames, stepResult };
  }

  // 2. Page FAULT: Check for an empty frame slot
  const emptyIndex = nextFrames.findIndex((f) => f.pageNumber === null);
  if (emptyIndex !== -1) {
    nextFrames[emptyIndex] = {
      frameIndex: emptyIndex,
      pageNumber,
      loadedAt: stepIndex,
      lastAccessedAt: stepIndex,
    };

    const stepResult: StepResult = {
      stepIndex,
      pageNumber,
      status: 'FAULT',
      frames: nextFrames.map((f) => f.pageNumber),
      victimPage: null,
      replacedFrameIndex: emptyIndex,
      explanation: `Page ${pageNumber} caused a FAULT (Cold start). Allocated into empty Frame ${emptyIndex}.`,
    };

    return { nextFrames, stepResult };
  }

  // 3. Page FAULT with Frame Saturation: Evict the least recently used page (min lastAccessedAt)
  let lruIndex = 0;
  for (let i = 1; i < nextFrames.length; i++) {
    if (nextFrames[i].lastAccessedAt < nextFrames[lruIndex].lastAccessedAt) {
      lruIndex = i;
    }
  }

  const victimPage = nextFrames[lruIndex].pageNumber;
  const victimLastAccess = nextFrames[lruIndex].lastAccessedAt;

  nextFrames[lruIndex] = {
    frameIndex: lruIndex,
    pageNumber,
    loadedAt: stepIndex,
    lastAccessedAt: stepIndex,
  };

  const stepResult: StepResult = {
    stepIndex,
    pageNumber,
    status: 'FAULT',
    frames: nextFrames.map((f) => f.pageNumber),
    victimPage,
    replacedFrameIndex: lruIndex,
    explanation: `Page ${pageNumber} caused a FAULT. Evicted Page ${victimPage} from Frame ${lruIndex} (Least recently used at step ${victimLastAccess}).`,
  };

  return { nextFrames, stepResult };
}

export function runLru(
  referenceString: number[],
  frameCount: number
): AlgorithmSimulationResult {
  if (frameCount <= 0) {
    throw new Error('Frame count must be greater than zero.');
  }

  let frames = createInitialFrames(frameCount);
  const steps: StepResult[] = [];
  let hits = 0;
  let faults = 0;

  for (let i = 0; i < referenceString.length; i++) {
    const page = referenceString[i];
    const { nextFrames, stepResult } = executeLruStep(frames, page, i);
    frames = nextFrames;
    steps.push(stepResult);

    if (stepResult.status === 'HIT') {
      hits++;
    } else {
      faults++;
    }
  }

  const totalAccesses = referenceString.length;
  const hitRatio = totalAccesses > 0 ? (hits / totalAccesses) * 100 : 0;
  const faultRatio = totalAccesses > 0 ? (faults / totalAccesses) * 100 : 0;

  return {
    algorithm: 'LRU',
    frameCount,
    steps,
    totalAccesses,
    hits,
    faults,
    hitRatio: Math.round(hitRatio * 100) / 100,
    faultRatio: Math.round(faultRatio * 100) / 100,
  };
}
