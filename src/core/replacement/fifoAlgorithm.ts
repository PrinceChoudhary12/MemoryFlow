/**
 * MemoryFlow — FIFO (First-In, First-Out) Page Replacement Algorithm
 * Pure TypeScript implementation decoupled from React/UI.
 *
 * Replacement Strategy:
 * When a page fault occurs and all frames are full, evict the page
 * that has been in physical memory the longest (earliest loadedAt timestamp).
 */

import type {
  AlgorithmSimulationResult,
  FrameSlot,
  StepResult,
} from './types';

export function createInitialFrames(frameCount: number): FrameSlot[] {
  return Array.from({ length: frameCount }, (_, i) => ({
    frameIndex: i,
    pageNumber: null,
    loadedAt: -1,
    lastAccessedAt: -1,
  }));
}

export function executeFifoStep(
  currentFrames: FrameSlot[],
  pageNumber: number,
  stepIndex: number
): { nextFrames: FrameSlot[]; stepResult: StepResult } {
  // Deep clone current frames to ensure immutability
  const nextFrames: FrameSlot[] = currentFrames.map((f) => ({ ...f }));

  // 1. Check for Page HIT
  const hitIndex = nextFrames.findIndex((f) => f.pageNumber === pageNumber);
  if (hitIndex !== -1) {
    // In FIFO, page hit does not alter loadedAt, but records lastAccessedAt
    nextFrames[hitIndex].lastAccessedAt = stepIndex;

    const stepResult: StepResult = {
      stepIndex,
      pageNumber,
      status: 'HIT',
      frames: nextFrames.map((f) => f.pageNumber),
      victimPage: null,
      replacedFrameIndex: null,
      explanation: `Page ${pageNumber} is already in Frame ${hitIndex} (HIT). No frame replacement needed.`,
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

  // 3. Page FAULT with Frame Saturation: Evict the oldest loaded page (min loadedAt)
  let oldestIndex = 0;
  for (let i = 1; i < nextFrames.length; i++) {
    if (nextFrames[i].loadedAt < nextFrames[oldestIndex].loadedAt) {
      oldestIndex = i;
    }
  }

  const victimPage = nextFrames[oldestIndex].pageNumber;
  const victimLoadedAt = nextFrames[oldestIndex].loadedAt;

  nextFrames[oldestIndex] = {
    frameIndex: oldestIndex,
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
    replacedFrameIndex: oldestIndex,
    explanation: `Page ${pageNumber} caused a FAULT. Evicted Page ${victimPage} from Frame ${oldestIndex} (Oldest loaded at step ${victimLoadedAt}).`,
  };

  return { nextFrames, stepResult };
}

export function runFifo(
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
    const { nextFrames, stepResult } = executeFifoStep(frames, page, i);
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
    algorithm: 'FIFO',
    frameCount,
    steps,
    totalAccesses,
    hits,
    faults,
    hitRatio: Math.round(hitRatio * 100) / 100,
    faultRatio: Math.round(faultRatio * 100) / 100,
  };
}
