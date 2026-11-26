/**
 * MemoryFlow — Page Replacement Studio Domain Types
 * Pure TypeScript Models (Decoupled from UI)
 */

export type ReplacementAlgorithm = 'FIFO' | 'LRU';

export interface FrameSlot {
  frameIndex: number;
  pageNumber: number | null;
  loadedAt: number;        // Sequence step index when loaded (for FIFO)
  lastAccessedAt: number;  // Sequence step index when last referenced (for LRU)
}

export type ReplacementStepStatus = 'HIT' | 'FAULT';

export interface StepResult {
  stepIndex: number;
  pageNumber: number;
  status: ReplacementStepStatus;
  frames: (number | null)[];  // Snapshot of frame contents [Page#, Page#, ...]
  victimPage: number | null;  // Page evicted during this step, if any
  replacedFrameIndex: number | null;
  explanation: string;
}

export interface AlgorithmSimulationResult {
  algorithm: ReplacementAlgorithm;
  frameCount: number;
  steps: StepResult[];
  totalAccesses: number;
  hits: number;
  faults: number;
  hitRatio: number;   // Percentage (0 - 100)
  faultRatio: number; // Percentage (0 - 100)
}

export interface BeladyFrameResult {
  frameCount: number;
  faults: number;
  hits: number;
  hitRatio: number;
  faultRatio: number;
}

export interface BeladyAnomalyPair {
  lowerFrames: number;
  higherFrames: number;
  lowerFaults: number;
  higherFaults: number;
  faultIncrease: number;
}

export interface BeladyDetectionResult {
  referenceString: number[];
  resultsByFrame: BeladyFrameResult[];
  hasAnomaly: boolean;
  anomalyPairs: BeladyAnomalyPair[];
}

export interface DualAlgorithmStep {
  stepIndex: number;
  pageNumber: number;
  fifo: StepResult;
  lru: StepResult;
}

export interface ReplacementStats {
  totalAccesses: number;
  fifo: {
    hits: number;
    faults: number;
    hitRatio: number;
    faultRatio: number;
  };
  lru: {
    hits: number;
    faults: number;
    hitRatio: number;
    faultRatio: number;
  };
  faultDelta: number; // fifo.faults - lru.faults (positive means LRU won by N faults)
  winner: 'LRU' | 'FIFO' | 'TIE';
}

export interface ReplacementSnapshot {
  stepIndex: number;
  fifoFrames: FrameSlot[];
  lruFrames: FrameSlot[];
  history: DualAlgorithmStep[];
  stats: ReplacementStats;
}

export interface ReplacementPreset {
  id: string;
  label: string;
  description: string;
  referenceString: number[];
  defaultFrameCount: number;
}
