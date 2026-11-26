/**
 * MemoryFlow — Segmentation Simulator Domain Types
 * Pure TypeScript Models (Independent of UI)
 */

export interface SegmentationConfig {
  logicalSpaceKb: number; // e.g. 64 KB
  ramSizeKb: number;      // e.g. 64 KB physical RAM
}

export interface Segment {
  id: number;
  name: string;           // e.g. "Code", "Data", "Stack", "Heap"
  base: number;           // Physical starting address in bytes
  limit: number;          // Size / maximum allowed offset in bytes
  isValid: boolean;       // Active in table
  color?: string;         // Visual identifier color
  accessCount: number;    // Hit count
}

export type SegmentationStatus =
  | 'VALID_TRANSLATION'
  | 'FAULT_LIMIT_EXCEEDED'
  | 'FAULT_INVALID_SEGMENT'
  | 'INVALID_INPUT';

export interface SegmentTranslationStep {
  stepNumber: number;
  rawInput: string;
  segmentId: number;
  segmentName: string;
  offset: number;
  base: number | null;
  limit: number | null;
  physicalAddress: number | null;
  physicalAddressHex: string | null;
  status: SegmentationStatus;
  explanation: string;
  timestamp: number;
}

export interface PhysicalMemoryBlock {
  startAddress: number;
  endAddress: number;
  size: number;
  isAllocated: boolean;
  segmentId: number | null;
  segmentName: string | null;
  color?: string;
}

export interface SegmentationStats {
  totalAccesses: number;
  validTranslations: number;
  segmentationFaults: number;
  successRate: number; // percentage (0 - 100)
}

/**
 * Deep Snapshot for 100% reversible history
 */
export interface SegmentationStateSnapshot {
  segments: Segment[];
  stats: SegmentationStats;
  currentStepIndex: number;
  history: SegmentTranslationStep[];
}
