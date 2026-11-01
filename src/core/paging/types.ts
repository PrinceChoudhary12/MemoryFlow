/**
 * MemoryFlow — Paging Simulator Domain Types
 * Pure TypeScript Models (Independent of UI)
 */

export interface PagingConfig {
  virtualSpaceKb: number;     // e.g. 64 (KB) -> 16 virtual pages with 4KB pages
  ramSizeKb: number;          // e.g. 32 (KB) -> 8 physical frames with 4KB frames
  pageSizeKb: number;         // e.g. 4 (KB)
}

export interface PageTableEntry {
  pageNumber: number;
  frameNumber: number | null; // null if not in RAM (unmapped / page fault)
  isValid: boolean;           // true if present in physical RAM
  isDirty: boolean;           // modified bit
  accessCount: number;        // usage counter
}

export interface PhysicalFrame {
  frameIndex: number;
  isOccupied: boolean;
  pageNumber: number | null;
  allocatedAtStep?: number;
}

export type TranslationStatus = 
  | 'HIT' 
  | 'FAULT_RESOLVED' 
  | 'FAULT_MEMORY_FULL' 
  | 'INVALID_ADDRESS';

export interface TranslationStep {
  stepNumber: number;
  rawInput: string;
  virtualAddress: number;
  virtualAddressHex: string;
  pageNumber: number;
  offset: number;
  offsetHex: string;
  status: TranslationStatus;
  frameNumber: number | null;
  physicalAddress: number | null;
  physicalAddressHex: string | null;
  explanation: string;
  timestamp: number;
}

export interface SimulationStats {
  totalAccesses: number;
  hits: number;
  faults: number;
  hitRatio: number; // percentage (0 - 100)
}

/**
 * Full Snapshot representation for 100% reversible history
 */
export interface PagingStateSnapshot {
  pageTable: PageTableEntry[];
  physicalFrames: PhysicalFrame[];
  stats: SimulationStats;
  currentStepIndex: number;
  history: TranslationStep[];
}

export interface AddressSplitResult {
  virtualAddress: number;
  pageNumber: number;
  offset: number;
  offsetBits: number;
  pageBits: number;
  virtualAddressHex: string;
  offsetHex: string;
  pageNumberHex: string;
  isValid: boolean;
  errorMessage?: string;
}
