/**
 * MemoryFlow — Dual Replacement Engine & Presets
 * Synchronized FIFO & LRU execution with reversible snapshots and Belady detection.
 */

import { createInitialFrames, executeFifoStep, runFifo } from './fifoAlgorithm';
import { executeLruStep, runLru } from './lruAlgorithm';
import { detectBeladyAnomaly } from './beladyDetector';
import type {
  AlgorithmSimulationResult,
  BeladyDetectionResult,
  DualAlgorithmStep,
  FrameSlot,
  ReplacementPreset,
  ReplacementSnapshot,
  ReplacementStats,
} from './types';

export const REPLACEMENT_PRESETS: ReplacementPreset[] = [
  {
    id: 'silberschatz',
    label: 'Silberschatz Classic (3 Frames)',
    description: 'Textbook benchmark sequence from Operating System Concepts. FIFO yields 15 faults; LRU yields 12 faults.',
    referenceString: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1],
    defaultFrameCount: 3,
  },
  {
    id: 'belady',
    label: "Belady's Anomaly Sequence (3 vs 4 Frames)",
    description: "Famous sequence where increasing frames from 3 to 4 increases FIFO faults from 9 to 10.",
    referenceString: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
    defaultFrameCount: 3,
  },
  {
    id: 'cyclic',
    label: 'Cyclic Working Set Loop (3 Frames)',
    description: 'Periodic loop through pages 1, 2, 3. Demonstrates steady state behavior when working set matches capacity.',
    referenceString: [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3],
    defaultFrameCount: 3,
  },
  {
    id: 'sequential',
    label: 'Sequential High-Pressure Thrashing (4 Frames)',
    description: 'Monotonically ascending pages without re-access. Guaranteed 100% page fault rate for both algorithms.',
    referenceString: [1, 2, 3, 4, 5, 6, 7, 8],
    defaultFrameCount: 4,
  },
  {
    id: 'high-locality',
    label: 'High Temporal Locality (3 Frames)',
    description: 'Frequent immediate re-accesses of hot working pages (1 and 2), showcasing LRU caching advantage.',
    referenceString: [1, 2, 1, 2, 3, 1, 2, 4, 1, 2],
    defaultFrameCount: 3,
  },
];

export function parseReferenceString(input: string): {
  valid: boolean;
  pages: number[];
  error?: string;
} {
  const cleaned = input.trim();
  if (!cleaned) {
    return { valid: false, pages: [], error: 'Reference string cannot be empty.' };
  }

  // Support commas, spaces, tabs, brackets, or semicolons as delimiters
  const tokens = cleaned
    .replace(/[\][(){};]/g, ' ')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return { valid: false, pages: [], error: 'No page numbers found.' };
  }

  const pages: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!/^\d+$/.test(token)) {
      return {
        valid: false,
        pages: [],
        error: `Invalid page token "${token}" at position ${i + 1}. Only non-negative integers are allowed.`,
      };
    }
    const pageNum = parseInt(token, 10);
    if (pageNum > 99) {
      return {
        valid: false,
        pages: [],
        error: `Page number ${pageNum} exceeds recommended display range (0-99).`,
      };
    }
    pages.push(pageNum);
  }

  if (pages.length > 50) {
    return {
      valid: false,
      pages: [],
      error: 'Reference string length exceeds maximum allowable limit of 50 pages for interactive visualization.',
    };
  }

  return { valid: true, pages };
}

export function computeReplacementStats(
  history: DualAlgorithmStep[]
): ReplacementStats {
  const total = history.length;
  let fifoHits = 0;
  let fifoFaults = 0;
  let lruHits = 0;
  let lruFaults = 0;

  for (const step of history) {
    if (step.fifo.status === 'HIT') fifoHits++;
    else fifoFaults++;

    if (step.lru.status === 'HIT') lruHits++;
    else lruFaults++;
  }

  const fifoHitRatio = total > 0 ? (fifoHits / total) * 100 : 0;
  const fifoFaultRatio = total > 0 ? (fifoFaults / total) * 100 : 0;
  const lruHitRatio = total > 0 ? (lruHits / total) * 100 : 0;
  const lruFaultRatio = total > 0 ? (lruFaults / total) * 100 : 0;

  const faultDelta = fifoFaults - lruFaults;
  let winner: 'LRU' | 'FIFO' | 'TIE' = 'TIE';
  if (faultDelta > 0) winner = 'LRU';
  else if (faultDelta < 0) winner = 'FIFO';

  return {
    totalAccesses: total,
    fifo: {
      hits: fifoHits,
      faults: fifoFaults,
      hitRatio: Math.round(fifoHitRatio * 100) / 100,
      faultRatio: Math.round(fifoFaultRatio * 100) / 100,
    },
    lru: {
      hits: lruHits,
      faults: lruFaults,
      hitRatio: Math.round(lruHitRatio * 100) / 100,
      faultRatio: Math.round(lruFaultRatio * 100) / 100,
    },
    faultDelta,
    winner,
  };
}

export class ReplacementEngine {
  private referenceString: number[];
  private frameCount: number;
  private currentStepIndex: number; // -1 = start, 0..N-1
  private fifoFrames: FrameSlot[];
  private lruFrames: FrameSlot[];
  private history: DualAlgorithmStep[];
  private snapshots: ReplacementSnapshot[];

  constructor(
    initialString: number[] = REPLACEMENT_PRESETS[0].referenceString,
    initialFrameCount: number = REPLACEMENT_PRESETS[0].defaultFrameCount
  ) {
    this.referenceString = [...initialString];
    this.frameCount = initialFrameCount;
    this.currentStepIndex = -1;
    this.fifoFrames = createInitialFrames(this.frameCount);
    this.lruFrames = createInitialFrames(this.frameCount);
    this.history = [];
    this.snapshots = [this.createSnapshot()];
  }

  private createSnapshot(): ReplacementSnapshot {
    return {
      stepIndex: this.currentStepIndex,
      fifoFrames: this.fifoFrames.map((f) => ({ ...f })),
      lruFrames: this.lruFrames.map((f) => ({ ...f })),
      history: [...this.history],
      stats: computeReplacementStats(this.history),
    };
  }

  public getReferenceString(): number[] {
    return [...this.referenceString];
  }

  public getFrameCount(): number {
    return this.frameCount;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  public getFifoFrames(): FrameSlot[] {
    return this.fifoFrames.map((f) => ({ ...f }));
  }

  public getLruFrames(): FrameSlot[] {
    return this.lruFrames.map((f) => ({ ...f }));
  }

  public getHistory(): DualAlgorithmStep[] {
    return [...this.history];
  }

  public getStats(): ReplacementStats {
    return computeReplacementStats(this.history);
  }

  public canStepForward(): boolean {
    return this.currentStepIndex + 1 < this.referenceString.length;
  }

  public canStepBackward(): boolean {
    return this.currentStepIndex >= 0;
  }

  public stepForward(): DualAlgorithmStep | null {
    if (!this.canStepForward()) {
      return null;
    }

    const nextStepIndex = this.currentStepIndex + 1;
    const pageNumber = this.referenceString[nextStepIndex];

    const fifoResult = executeFifoStep(this.fifoFrames, pageNumber, nextStepIndex);
    const lruResult = executeLruStep(this.lruFrames, pageNumber, nextStepIndex);

    this.fifoFrames = fifoResult.nextFrames;
    this.lruFrames = lruResult.nextFrames;
    this.currentStepIndex = nextStepIndex;

    const dualStep: DualAlgorithmStep = {
      stepIndex: nextStepIndex,
      pageNumber,
      fifo: fifoResult.stepResult,
      lru: lruResult.stepResult,
    };

    this.history.push(dualStep);
    this.snapshots.push(this.createSnapshot());

    return dualStep;
  }

  public stepBackward(): boolean {
    if (!this.canStepBackward()) {
      return false;
    }

    // Pop the current snapshot
    this.snapshots.pop();
    const previousSnapshot = this.snapshots[this.snapshots.length - 1];

    if (!previousSnapshot) {
      this.reset();
      return true;
    }

    this.currentStepIndex = previousSnapshot.stepIndex;
    this.fifoFrames = previousSnapshot.fifoFrames.map((f) => ({ ...f }));
    this.lruFrames = previousSnapshot.lruFrames.map((f) => ({ ...f }));
    this.history = [...previousSnapshot.history];

    return true;
  }

  public stepTo(targetStep: number): void {
    if (targetStep < -1 || targetStep >= this.referenceString.length) {
      return;
    }

    if (targetStep === this.currentStepIndex) {
      return;
    }

    if (targetStep < this.currentStepIndex) {
      // Rewind
      while (this.currentStepIndex > targetStep && this.canStepBackward()) {
        this.stepBackward();
      }
    } else {
      // Fast-forward
      while (this.currentStepIndex < targetStep && this.canStepForward()) {
        this.stepForward();
      }
    }
  }

  public reset(): void {
    this.currentStepIndex = -1;
    this.fifoFrames = createInitialFrames(this.frameCount);
    this.lruFrames = createInitialFrames(this.frameCount);
    this.history = [];
    this.snapshots = [this.createSnapshot()];
  }

  public setFrameCount(count: number): void {
    if (count < 1 || count > 10) {
      throw new Error('Frame count must be between 1 and 10.');
    }
    this.frameCount = count;
    this.reset();
  }

  public setReferenceString(pages: number[]): void {
    this.referenceString = [...pages];
    this.reset();
  }

  public loadPreset(presetId: string): boolean {
    const preset = REPLACEMENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;
    this.frameCount = preset.defaultFrameCount;
    this.referenceString = [...preset.referenceString];
    this.reset();
    return true;
  }

  public getBeladyAnalysis(minFrames = 2, maxFrames = 6): BeladyDetectionResult {
    return detectBeladyAnomaly(this.referenceString, minFrames, maxFrames);
  }

  public runFullSimulation(): {
    fifo: AlgorithmSimulationResult;
    lru: AlgorithmSimulationResult;
  } {
    const fifo = runFifo(this.referenceString, this.frameCount);
    const lru = runLru(this.referenceString, this.frameCount);
    return { fifo, lru };
  }
}
