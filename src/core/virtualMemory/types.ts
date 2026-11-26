/**
 * MemoryFlow — Virtual Memory & Demand Paging Domain Types
 * Pure TypeScript Models (Completely Decoupled from React/UI)
 */

export type AccessType = 'READ' | 'WRITE';

export interface VirtualMemoryConfig {
  virtualSpaceKb: number;       // e.g. 64 KB -> 16 pages @ 4KB
  ramSizeKb: number;            // e.g. 16 KB -> 4 physical frames @ 4KB
  pageSizeKb: number;           // e.g. 4 KB page / frame size
  memoryAccessTimeNs: number;   // Normal RAM access latency in ns (e.g. 100 ns)
  pageFaultServiceTimeNs: number; // Page fault latency in ns (e.g. 8,000,000 ns = 8 ms)
  dirtyWritebackOverheadNs: number; // Extra latency to write dirty page to disk (e.g. 4,000,000 ns = 4 ms)
}

export interface VMPageTableEntry {
  pageNumber: number;
  frameNumber: number | null;
  isValid: boolean;             // Valid = 1 (in RAM), Invalid = 0 (on Swap Disk)
  isDirty: boolean;             // Dirty = 1 (modified, requires writeback before eviction)
  swapBlockId: number;          // Fixed secondary storage disk sector / swap slot
  accessCount: number;
  lastAccessTime: number;
}

export interface SwapPage {
  swapBlockId: number;
  pageNumber: number;
  name: string;
  isLoadedInRam: boolean;
  isDirty: boolean;
  sizeBytes: number;
}

export interface VMPhysicalFrame {
  frameIndex: number;
  pageNumber: number | null;
  isOccupied: boolean;
  isDirty: boolean;
  loadedAtStep: number;
  lastAccessedStep: number;
}

export type VMStepStatus =
  | 'HIT'
  | 'FAULT_RESOLVED'
  | 'FAULT_WITH_EVICTION'
  | 'INVALID_ADDRESS';

export type InterruptCyclePhaseName =
  | 'CPU_REFERENCE'
  | 'TLB_MMU_LOOKUP'
  | 'OS_TRAP_INTERRUPT'
  | 'DISK_READ_SWAP'
  | 'FRAME_ALLOCATION'
  | 'DIRTY_WRITEBACK'
  | 'TABLE_UPDATE'
  | 'INSTRUCTION_RESTART';

export interface InterruptCyclePhase {
  phase: number; // 1 to 6
  name: InterruptCyclePhaseName;
  title: string;
  description: string;
  status: 'COMPLETED' | 'ACTIVE' | 'SKIPPED';
}

export interface VirtualMemoryStep {
  stepNumber: number;
  rawInput: string;
  virtualAddress: number;
  virtualAddressHex: string;
  pageNumber: number;
  offset: number;
  offsetHex: string;
  accessType: AccessType;
  status: VMStepStatus;
  frameNumber: number | null;
  physicalAddress: number | null;
  physicalAddressHex: string | null;
  victimPage: {
    pageNumber: number;
    frameNumber: number;
    wasDirty: boolean;
  } | null;
  phases: InterruptCyclePhase[];
  explanation: string;
  stepLatencyNs: number;
  timestamp: number;
}

export interface VirtualMemoryStats {
  totalAccesses: number;
  hits: number;
  pageFaults: number;
  dirtyWritebacks: number;
  hitRatio: number;              // percentage 0 - 100
  pageFaultRate: number;         // percentage 0 - 100
  effectiveAccessTimeNs: number; // EAT in nanoseconds
  eatFormatted: string;          // formatted string (e.g. "1.25 ms" or "240 ns")
}

/**
 * Deep immutable state snapshot for 100% reversible history
 */
export interface VirtualMemorySnapshot {
  pageTable: VMPageTableEntry[];
  physicalFrames: VMPhysicalFrame[];
  swapDisk: SwapPage[];
  stats: VirtualMemoryStats;
  currentStepIndex: number;
  history: VirtualMemoryStep[];
}
