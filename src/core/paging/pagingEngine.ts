import {
  type PagingConfig,
  type PageTableEntry,
  type PhysicalFrame,
  type TranslationStep,
  type SimulationStats,
  type PagingStateSnapshot,
} from './types';
import {
  calculateGeometry,
  parseAddress,
  splitAddress,
  calculatePhysicalAddress,
  toHex,
} from './addressTranslator';

export const DEFAULT_PAGING_CONFIG: PagingConfig = {
  virtualSpaceKb: 64, // 16-bit space = 64 KB -> 16 pages @ 4KB
  ramSizeKb: 32,      // 32 KB physical RAM -> 8 frames @ 4KB
  pageSizeKb: 4,      // 4 KB page/frame size
};

export class PagingEngine {
  private config: PagingConfig;
  private pageTable: PageTableEntry[] = [];
  private physicalFrames: PhysicalFrame[] = [];
  private history: TranslationStep[] = [];
  private snapshots: PagingStateSnapshot[] = [];
  private currentStepIndex = -1;
  private referenceStream: string[] = [];
  private stats: SimulationStats = {
    totalAccesses: 0,
    hits: 0,
    faults: 0,
    hitRatio: 0,
  };

  constructor(config: PagingConfig = DEFAULT_PAGING_CONFIG) {
    this.config = { ...config };
    this.reset();
  }

  /**
   * Resets simulation to initial empty memory state
   */
  public reset(): void {
    const geometry = calculateGeometry(this.config);

    this.pageTable = Array.from({ length: geometry.totalVirtualPages }, (_, i) => ({
      pageNumber: i,
      frameNumber: null,
      isValid: false,
      isDirty: false,
      accessCount: 0,
    }));

    this.physicalFrames = Array.from({ length: geometry.totalPhysicalFrames }, (_, i) => ({
      frameIndex: i,
      isOccupied: false,
      pageNumber: null,
    }));

    this.history = [];
    this.snapshots = [];
    this.currentStepIndex = -1;
    this.stats = {
      totalAccesses: 0,
      hits: 0,
      faults: 0,
      hitRatio: 0,
    };

    // Save initial baseline snapshot (stepIndex: -1)
    this.snapshots.push(this.captureSnapshot());
  }

  /**
   * Updates configuration and resets state
   */
  public setConfig(newConfig: PagingConfig): void {
    this.config = { ...newConfig };
    this.reset();
  }

  public getConfig(): PagingConfig {
    return { ...this.config };
  }

  public getPageTable(): PageTableEntry[] {
    return this.pageTable.map((e) => ({ ...e }));
  }

  public getPhysicalFrames(): PhysicalFrame[] {
    return this.physicalFrames.map((f) => ({ ...f }));
  }

  public getStats(): SimulationStats {
    return { ...this.stats };
  }

  public getHistory(): TranslationStep[] {
    return this.history.map((h) => ({ ...h }));
  }

  public getCurrentStep(): TranslationStep | null {
    if (this.currentStepIndex >= 0 && this.currentStepIndex < this.history.length) {
      return { ...this.history[this.currentStepIndex] };
    }
    return null;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  public setReferenceStream(stream: string[]): void {
    this.referenceStream = [...stream];
  }

  public getReferenceStream(): string[] {
    return [...this.referenceStream];
  }

  /**
   * Captures a deep copy snapshot of current state
   */
  private captureSnapshot(): PagingStateSnapshot {
    return {
      pageTable: this.pageTable.map((e) => ({ ...e })),
      physicalFrames: this.physicalFrames.map((f) => ({ ...f })),
      stats: { ...this.stats },
      currentStepIndex: this.currentStepIndex,
      history: this.history.map((h) => ({ ...h })),
    };
  }

  /**
   * Restores simulation state completely from a snapshot
   */
  public restoreSnapshot(snapshot: PagingStateSnapshot): void {
    this.pageTable = snapshot.pageTable.map((e) => ({ ...e }));
    this.physicalFrames = snapshot.physicalFrames.map((f) => ({ ...f }));
    this.stats = { ...snapshot.stats };
    this.currentStepIndex = snapshot.currentStepIndex;
    this.history = snapshot.history.map((h) => ({ ...h }));
  }

  /**
   * Processes a virtual address input (Single Address or Trace Step)
   */
  public translateAddress(rawInput: string): TranslationStep {
    const stepNumber = this.history.length + 1;
    const { address, error } = parseAddress(rawInput);

    if (error || address === null) {
      const step: TranslationStep = {
        stepNumber,
        rawInput,
        virtualAddress: -1,
        virtualAddressHex: 'INVALID',
        pageNumber: -1,
        offset: -1,
        offsetHex: 'INVALID',
        status: 'INVALID_ADDRESS',
        frameNumber: null,
        physicalAddress: null,
        physicalAddressHex: null,
        explanation: error || 'Invalid address input.',
        timestamp: Date.now(),
      };
      this.recordStep(step);
      return step;
    }

    const split = splitAddress(address, this.config);
    if (!split.isValid) {
      const step: TranslationStep = {
        stepNumber,
        rawInput,
        virtualAddress: address,
        virtualAddressHex: toHex(address, 4),
        pageNumber: -1,
        offset: -1,
        offsetHex: 'INVALID',
        status: 'INVALID_ADDRESS',
        frameNumber: null,
        physicalAddress: null,
        physicalAddressHex: null,
        explanation: split.errorMessage || 'Virtual address out of bounds.',
        timestamp: Date.now(),
      };
      this.recordStep(step);
      return step;
    }

    const { pageNumber, offset } = split;
    const ptEntry = this.pageTable[pageNumber];

    // Case 1: Page Hit
    if (ptEntry.isValid && ptEntry.frameNumber !== null) {
      ptEntry.accessCount += 1;
      const phys = calculatePhysicalAddress(ptEntry.frameNumber, offset, this.config.pageSizeKb);
      
      this.stats.totalAccesses += 1;
      this.stats.hits += 1;
      this.recalculateHitRatio();

      const step: TranslationStep = {
        stepNumber,
        rawInput,
        virtualAddress: address,
        virtualAddressHex: toHex(address, 4),
        pageNumber,
        offset,
        offsetHex: toHex(offset, 3),
        status: 'HIT',
        frameNumber: ptEntry.frameNumber,
        physicalAddress: phys.address,
        physicalAddressHex: phys.addressHex,
        explanation: `PAGE HIT: Virtual Page ${pageNumber} is already resident in Physical Frame ${ptEntry.frameNumber}. Translated to Physical Address ${phys.addressHex}.`,
        timestamp: Date.now(),
      };
      this.recordStep(step);
      return step;
    }

    // Case 2: Page Fault - Find next free frame
    const freeFrame = this.physicalFrames.find((f) => !f.isOccupied);

    // Case 2a: Page Fault with Free Frame Available
    if (freeFrame) {
      freeFrame.isOccupied = true;
      freeFrame.pageNumber = pageNumber;
      freeFrame.allocatedAtStep = stepNumber;

      ptEntry.isValid = true;
      ptEntry.frameNumber = freeFrame.frameIndex;
      ptEntry.accessCount += 1;

      const phys = calculatePhysicalAddress(freeFrame.frameIndex, offset, this.config.pageSizeKb);

      this.stats.totalAccesses += 1;
      this.stats.faults += 1;
      this.recalculateHitRatio();

      const step: TranslationStep = {
        stepNumber,
        rawInput,
        virtualAddress: address,
        virtualAddressHex: toHex(address, 4),
        pageNumber,
        offset,
        offsetHex: toHex(offset, 3),
        status: 'FAULT_RESOLVED',
        frameNumber: freeFrame.frameIndex,
        physicalAddress: phys.address,
        physicalAddressHex: phys.addressHex,
        explanation: `PAGE FAULT: Page ${pageNumber} was not in RAM. Allocated free Frame ${freeFrame.frameIndex}. Translated to Physical Address ${phys.addressHex}.`,
        timestamp: Date.now(),
      };
      this.recordStep(step);
      return step;
    }

    // Case 2b: Page Fault with Memory Full (Replacement Needed)
    this.stats.totalAccesses += 1;
    this.stats.faults += 1;
    this.recalculateHitRatio();

    const step: TranslationStep = {
      stepNumber,
      rawInput,
      virtualAddress: address,
      virtualAddressHex: toHex(address, 4),
      pageNumber,
      offset,
      offsetHex: toHex(offset, 3),
      status: 'FAULT_MEMORY_FULL',
      frameNumber: null,
      physicalAddress: null,
      physicalAddressHex: null,
      explanation: `PAGE FAULT (MEMORY FULL): Page ${pageNumber} was not in RAM, and all ${this.physicalFrames.length} physical frames are currently allocated. Page replacement (FIFO/LRU eviction) is required (unlocked in milestone v0.5.0).`,
      timestamp: Date.now(),
    };
    this.recordStep(step);
    return step;
  }

  private recordStep(step: TranslationStep): void {
    this.history.push(step);
    this.currentStepIndex = this.history.length - 1;
    this.snapshots.push(this.captureSnapshot());
  }

  /**
   * Advances one step in the loaded reference stream
   */
  public stepForward(): TranslationStep | null {
    const nextStreamIndex = this.history.length;
    if (nextStreamIndex < this.referenceStream.length) {
      return this.translateAddress(this.referenceStream[nextStreamIndex]);
    }
    return null;
  }

  /**
   * Reverts simulation back one step using deep snapshot history
   */
  public stepBackward(): boolean {
    if (this.currentStepIndex < 0 || this.history.length === 0) {
      return false;
    }

    const targetSnapshotIndex = this.currentStepIndex;
    if (targetSnapshotIndex >= 0 && targetSnapshotIndex < this.snapshots.length) {
      this.restoreSnapshot(this.snapshots[targetSnapshotIndex]);
      this.snapshots = this.snapshots.slice(0, targetSnapshotIndex + 1);
      return true;
    }
    return false;
  }

  public canStepForward(): boolean {
    return this.history.length < this.referenceStream.length;
  }

  public canStepBackward(): boolean {
    return this.currentStepIndex >= 0 && this.history.length > 0;
  }

  private recalculateHitRatio(): void {
    if (this.stats.totalAccesses === 0) {
      this.stats.hitRatio = 0;
    } else {
      this.stats.hitRatio = Number(
        ((this.stats.hits / this.stats.totalAccesses) * 100).toFixed(1)
      );
    }
  }
}
