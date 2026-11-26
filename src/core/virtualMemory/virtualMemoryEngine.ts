/**
 * MemoryFlow — Virtual Memory & Demand Paging Simulation Engine
 * Pure TypeScript State Machine (Decoupled from UI)
 */

import {
  type VirtualMemoryConfig,
  type VMPageTableEntry,
  type VMPhysicalFrame,
  type SwapPage,
  type VirtualMemoryStep,
  type VirtualMemoryStats,
  type VirtualMemorySnapshot,
  type AccessType,
  type InterruptCyclePhase,
} from './types';
import {
  calculateEat,
  formatLatency,
  parseVmAddress,
  toHex,
} from './eatCalculator';

export const DEFAULT_VM_CONFIG: VirtualMemoryConfig = {
  virtualSpaceKb: 64,          // 16 pages @ 4KB
  ramSizeKb: 16,               // 4 physical frames @ 4KB (fills fast to demonstrate replacement & dirty writeback)
  pageSizeKb: 4,               // 4096 bytes per page/frame
  memoryAccessTimeNs: 100,     // 100 ns RAM latency
  pageFaultServiceTimeNs: 8_000_000, // 8 ms page fault service latency
  dirtyWritebackOverheadNs: 4_000_000, // 4 ms dirty page writeback latency
};

export class VirtualMemoryEngine {
  private config: VirtualMemoryConfig;
  private pageTable: VMPageTableEntry[] = [];
  private physicalFrames: VMPhysicalFrame[] = [];
  private swapDisk: SwapPage[] = [];
  private history: VirtualMemoryStep[] = [];
  private snapshots: VirtualMemorySnapshot[] = [];
  private currentStepIndex = -1;
  private referenceStream: string[] = [];
  private stats: VirtualMemoryStats = {
    totalAccesses: 0,
    hits: 0,
    pageFaults: 0,
    dirtyWritebacks: 0,
    hitRatio: 0,
    pageFaultRate: 0,
    effectiveAccessTimeNs: 100,
    eatFormatted: '100 ns',
  };

  constructor(config: VirtualMemoryConfig = DEFAULT_VM_CONFIG) {
    this.config = { ...config };
    this.reset();
  }

  /**
   * Resets simulation state to initial cold state with all pages in backing swap disk
   */
  public reset(): void {
    const totalPages = Math.max(1, Math.floor(this.config.virtualSpaceKb / this.config.pageSizeKb));
    const totalFrames = Math.max(1, Math.floor(this.config.ramSizeKb / this.config.pageSizeKb));

    // Page Table
    this.pageTable = Array.from({ length: totalPages }, (_, i) => ({
      pageNumber: i,
      frameNumber: null,
      isValid: false, // Invalid: initially in swap backing store
      isDirty: false,
      swapBlockId: i,
      accessCount: 0,
      lastAccessTime: 0,
    }));

    // Physical Frames
    this.physicalFrames = Array.from({ length: totalFrames }, (_, i) => ({
      frameIndex: i,
      pageNumber: null,
      isOccupied: false,
      isDirty: false,
      loadedAtStep: 0,
      lastAccessedStep: 0,
    }));

    // Swap Storage Disks
    const segmentLabels = ['Code', 'Code', 'Data', 'Data', 'Heap', 'Heap', 'Stack', 'Stack'];
    this.swapDisk = Array.from({ length: totalPages }, (_, i) => ({
      swapBlockId: i,
      pageNumber: i,
      name: `Block_${i} (${segmentLabels[i % segmentLabels.length] || 'Page'})`,
      isLoadedInRam: false,
      isDirty: false,
      sizeBytes: this.config.pageSizeKb * 1024,
    }));

    this.history = [];
    this.snapshots = [];
    this.currentStepIndex = -1;
    this.stats = {
      totalAccesses: 0,
      hits: 0,
      pageFaults: 0,
      dirtyWritebacks: 0,
      hitRatio: 0,
      pageFaultRate: 0,
      effectiveAccessTimeNs: this.config.memoryAccessTimeNs,
      eatFormatted: formatLatency(this.config.memoryAccessTimeNs),
    };

    // Baseline snapshot
    this.snapshots.push(this.captureSnapshot());
  }

  public setConfig(newConfig: VirtualMemoryConfig): void {
    this.config = { ...newConfig };
    this.reset();
  }

  public getConfig(): VirtualMemoryConfig {
    return { ...this.config };
  }

  public getPageTable(): VMPageTableEntry[] {
    return this.pageTable.map((p) => ({ ...p }));
  }

  public getPhysicalFrames(): VMPhysicalFrame[] {
    return this.physicalFrames.map((f) => ({ ...f }));
  }

  public getSwapDisk(): SwapPage[] {
    return this.swapDisk.map((s) => ({ ...s }));
  }

  public getStats(): VirtualMemoryStats {
    return { ...this.stats };
  }

  public getHistory(): VirtualMemoryStep[] {
    return this.history.map((h) => ({ ...h }));
  }

  public getCurrentStep(): VirtualMemoryStep | null {
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

  private captureSnapshot(): VirtualMemorySnapshot {
    return {
      pageTable: this.pageTable.map((p) => ({ ...p })),
      physicalFrames: this.physicalFrames.map((f) => ({ ...f })),
      swapDisk: this.swapDisk.map((s) => ({ ...s })),
      stats: { ...this.stats },
      currentStepIndex: this.currentStepIndex,
      history: this.history.map((h) => ({ ...h })),
    };
  }

  public restoreSnapshot(snapshot: VirtualMemorySnapshot): void {
    this.pageTable = snapshot.pageTable.map((p) => ({ ...p }));
    this.physicalFrames = snapshot.physicalFrames.map((f) => ({ ...f }));
    this.swapDisk = snapshot.swapDisk.map((s) => ({ ...s }));
    this.stats = { ...snapshot.stats };
    this.currentStepIndex = snapshot.currentStepIndex;
    this.history = snapshot.history.map((h) => ({ ...h }));
  }

  /**
   * Processes a logical memory reference (Read or Write)
   */
  public translateAddress(rawInput: string, forcedAccessType?: AccessType): VirtualMemoryStep {
    const stepNumber = this.history.length + 1;
    const { address, accessType: parsedType, error } = parseVmAddress(rawInput);
    const accessType: AccessType = forcedAccessType || parsedType;

    const pageSizeBytes = this.config.pageSizeKb * 1024;
    const virtualSizeBytes = this.config.virtualSpaceKb * 1024;

    // Handle input or bounds error
    if (error || address === null || address < 0 || address >= virtualSizeBytes) {
      const step: VirtualMemoryStep = {
        stepNumber,
        rawInput,
        virtualAddress: address ?? -1,
        virtualAddressHex: address !== null ? toHex(address, 4) : 'INVALID',
        pageNumber: -1,
        offset: -1,
        offsetHex: 'INVALID',
        accessType,
        status: 'INVALID_ADDRESS',
        frameNumber: null,
        physicalAddress: null,
        physicalAddressHex: null,
        victimPage: null,
        phases: [
          {
            phase: 1,
            name: 'CPU_REFERENCE',
            title: '1. CPU Address Generation',
            description: `CPU issued invalid memory reference "${rawInput}".`,
            status: 'ACTIVE',
          },
          {
            phase: 2,
            name: 'TLB_MMU_LOOKUP',
            title: '2. Boundary Violation',
            description: error || `Address out of bounds (Max: ${virtualSizeBytes - 1} B / 0x${(virtualSizeBytes - 1).toString(16).toUpperCase()}).`,
            status: 'ACTIVE',
          },
        ],
        explanation: error || `Invalid address reference out of bounds (${address} >= ${virtualSizeBytes}).`,
        stepLatencyNs: 0,
        timestamp: Date.now(),
      };
      this.recordStep(step);
      return step;
    }

    const pageNumber = Math.floor(address / pageSizeBytes);
    const offset = address % pageSizeBytes;
    const ptEntry = this.pageTable[pageNumber];

    // =========================================================================
    // CASE 1: PAGE HIT (Page already resident in physical RAM)
    // =========================================================================
    if (ptEntry.isValid && ptEntry.frameNumber !== null) {
      const frameIndex = ptEntry.frameNumber;
      const targetFrame = this.physicalFrames[frameIndex];

      ptEntry.accessCount += 1;
      ptEntry.lastAccessTime = Date.now();
      targetFrame.lastAccessedStep = stepNumber;

      // If WRITE access, set dirty bit
      if (accessType === 'WRITE') {
        ptEntry.isDirty = true;
        targetFrame.isDirty = true;
      }

      const physicalAddress = frameIndex * pageSizeBytes + offset;

      this.stats.totalAccesses += 1;
      this.stats.hits += 1;
      this.recalculateStats();

      const phases: InterruptCyclePhase[] = [
        {
          phase: 1,
          name: 'CPU_REFERENCE',
          title: '1. CPU Address Reference',
          description: `CPU generated ${accessType} reference for Virtual Address ${toHex(address, 4)} (Page ${pageNumber}, Offset ${toHex(offset, 3)}).`,
          status: 'COMPLETED',
        },
        {
          phase: 2,
          name: 'TLB_MMU_LOOKUP',
          title: '2. MMU Page Table Lookup',
          description: `Page ${pageNumber} Valid Bit = 1. Resident in Physical Frame ${frameIndex}.`,
          status: 'COMPLETED',
        },
        {
          phase: 3,
          name: 'INSTRUCTION_RESTART',
          title: '3. Direct Physical Access',
          description: `Physical Address computed: Frame ${frameIndex} (${toHex(frameIndex * pageSizeBytes, 4)}) + Offset ${offset} = ${toHex(physicalAddress, 4)}.`,
          status: 'COMPLETED',
        },
      ];

      const explanation = `PAGE HIT: Virtual Page ${pageNumber} is resident in Physical Frame ${frameIndex}. ${
        accessType === 'WRITE' ? 'Dirty bit set to 1 (Page Modified).' : 'Clean read access.'
      } Resolved in ${formatLatency(this.config.memoryAccessTimeNs)}.`;

      const step: VirtualMemoryStep = {
        stepNumber,
        rawInput,
        virtualAddress: address,
        virtualAddressHex: toHex(address, 4),
        pageNumber,
        offset,
        offsetHex: toHex(offset, 3),
        accessType,
        status: 'HIT',
        frameNumber: frameIndex,
        physicalAddress,
        physicalAddressHex: toHex(physicalAddress, 4),
        victimPage: null,
        phases,
        explanation,
        stepLatencyNs: this.config.memoryAccessTimeNs,
        timestamp: Date.now(),
      };

      this.recordStep(step);
      return step;
    }

    // =========================================================================
    // CASE 2: PAGE FAULT (Page is NOT in RAM; residing in secondary Swap Disk)
    // =========================================================================
    this.stats.totalAccesses += 1;
    this.stats.pageFaults += 1;

    // Check for a free physical frame
    const freeFrame = this.physicalFrames.find((f) => !f.isOccupied);

    // -------------------------------------------------------------------------
    // SUBCASE 2A: Free Frame Available (No Eviction Needed)
    // -------------------------------------------------------------------------
    if (freeFrame) {
      const frameIndex = freeFrame.frameIndex;

      // Allocate frame and bring in page from swap
      freeFrame.isOccupied = true;
      freeFrame.pageNumber = pageNumber;
      freeFrame.isDirty = accessType === 'WRITE';
      freeFrame.loadedAtStep = stepNumber;
      freeFrame.lastAccessedStep = stepNumber;

      // Update Page Table
      ptEntry.isValid = true;
      ptEntry.frameNumber = frameIndex;
      ptEntry.isDirty = accessType === 'WRITE';
      ptEntry.accessCount += 1;
      ptEntry.lastAccessTime = Date.now();

      // Update Swap Disk reflection
      this.swapDisk[pageNumber].isLoadedInRam = true;

      const physicalAddress = frameIndex * pageSizeBytes + offset;
      const stepLatencyNs = this.config.pageFaultServiceTimeNs;
      this.recalculateStats();

      const phases: InterruptCyclePhase[] = [
        {
          phase: 1,
          name: 'CPU_REFERENCE',
          title: '1. CPU Address Reference',
          description: `CPU issued ${accessType} reference to Virtual Address ${toHex(address, 4)} (Page ${pageNumber}).`,
          status: 'COMPLETED',
        },
        {
          phase: 2,
          name: 'OS_TRAP_INTERRUPT',
          title: '2. Page Fault Trap Triggered',
          description: `Page ${pageNumber} Valid Bit = 0. CPU hardware interrupt traps to OS page fault handler.`,
          status: 'COMPLETED',
        },
        {
          phase: 3,
          name: 'DISK_READ_SWAP',
          title: '3. Backing Store Lookup',
          description: `OS locates Page ${pageNumber} in Swap Disk Block #${ptEntry.swapBlockId}.`,
          status: 'COMPLETED',
        },
        {
          phase: 4,
          name: 'FRAME_ALLOCATION',
          title: '4. Frame Allocation',
          description: `Free Physical Frame ${frameIndex} allocated. Page swapped from disk into RAM.`,
          status: 'COMPLETED',
        },
        {
          phase: 5,
          name: 'TABLE_UPDATE',
          title: '5. Page Table Updated',
          description: `Page Table updated: Valid Bit = 1, Frame = ${frameIndex}, Dirty = ${accessType === 'WRITE' ? 1 : 0}.`,
          status: 'COMPLETED',
        },
        {
          phase: 6,
          name: 'INSTRUCTION_RESTART',
          title: '6. Instruction Restarted',
          description: `CPU restarts instruction. Physical Address ${toHex(physicalAddress, 4)} accessed.`,
          status: 'COMPLETED',
        },
      ];

      const explanation = `PAGE FAULT: Page ${pageNumber} was absent from RAM. Swapped from Disk Block #${ptEntry.swapBlockId} into free Frame ${frameIndex}. Table updated and instruction restarted (${formatLatency(stepLatencyNs)}).`;

      const step: VirtualMemoryStep = {
        stepNumber,
        rawInput,
        virtualAddress: address,
        virtualAddressHex: toHex(address, 4),
        pageNumber,
        offset,
        offsetHex: toHex(offset, 3),
        accessType,
        status: 'FAULT_RESOLVED',
        frameNumber: frameIndex,
        physicalAddress,
        physicalAddressHex: toHex(physicalAddress, 4),
        victimPage: null,
        phases,
        explanation,
        stepLatencyNs,
        timestamp: Date.now(),
      };

      this.recordStep(step);
      return step;
    }

    // -------------------------------------------------------------------------
    // SUBCASE 2B: RAM Full -> Eviction & Dirty Page Writeback
    // -------------------------------------------------------------------------
    // Select victim page (FIFO: earliest loadedAtStep)
    const victimFrame = this.physicalFrames.reduce((oldest, f) =>
      f.loadedAtStep < oldest.loadedAtStep ? f : oldest
    );
    const victimPageNumber = victimFrame.pageNumber!;
    const victimPt = this.pageTable[victimPageNumber];
    const wasDirty = victimPt.isDirty || victimFrame.isDirty;

    let stepLatencyNs = this.config.pageFaultServiceTimeNs;
    if (wasDirty) {
      this.stats.dirtyWritebacks += 1;
      stepLatencyNs += this.config.dirtyWritebackOverheadNs;
      this.swapDisk[victimPageNumber].isDirty = true;
    }

    // Invalidate victim page in Page Table & Swap Disk
    victimPt.isValid = false;
    victimPt.frameNumber = null;
    victimPt.isDirty = false;
    this.swapDisk[victimPageNumber].isLoadedInRam = false;

    // Allocate victim frame to the new incoming page
    const frameIndex = victimFrame.frameIndex;
    victimFrame.pageNumber = pageNumber;
    victimFrame.isOccupied = true;
    victimFrame.isDirty = accessType === 'WRITE';
    victimFrame.loadedAtStep = stepNumber;
    victimFrame.lastAccessedStep = stepNumber;

    // Update incoming page in Page Table & Swap Disk
    ptEntry.isValid = true;
    ptEntry.frameNumber = frameIndex;
    ptEntry.isDirty = accessType === 'WRITE';
    ptEntry.accessCount += 1;
    ptEntry.lastAccessTime = Date.now();
    this.swapDisk[pageNumber].isLoadedInRam = true;

    const physicalAddress = frameIndex * pageSizeBytes + offset;
    this.recalculateStats();

    const phases: InterruptCyclePhase[] = [
      {
        phase: 1,
        name: 'CPU_REFERENCE',
        title: '1. CPU Address Reference',
        description: `CPU issued ${accessType} reference to Virtual Address ${toHex(address, 4)} (Page ${pageNumber}).`,
        status: 'COMPLETED',
      },
      {
        phase: 2,
        name: 'OS_TRAP_INTERRUPT',
        title: '2. Page Fault (Memory Full)',
        description: `Page ${pageNumber} Valid Bit = 0. All ${this.physicalFrames.length} frames occupied. Victim selection initiated.`,
        status: 'COMPLETED',
      },
      {
        phase: 3,
        name: 'DIRTY_WRITEBACK',
        title: wasDirty ? '3. Dirty Page Writeback to Disk' : '3. Clean Page Eviction',
        description: wasDirty
          ? `Victim Page ${victimPageNumber} was Dirty! Written back to Swap Disk Block #${victimPt.swapBlockId} (+${formatLatency(this.config.dirtyWritebackOverheadNs)}).`
          : `Victim Page ${victimPageNumber} was clean (unmodified). Evicted from Frame ${frameIndex} without disk writeback.`,
        status: 'COMPLETED',
      },
      {
        phase: 4,
        name: 'DISK_READ_SWAP',
        title: '4. Swap In Target Page',
        description: `Incoming Page ${pageNumber} loaded from Swap Disk Block #${ptEntry.swapBlockId} into Frame ${frameIndex}.`,
        status: 'COMPLETED',
      },
      {
        phase: 5,
        name: 'TABLE_UPDATE',
        title: '5. Dual Page Table Update',
        description: `Victim Page ${victimPageNumber} set Invalid (0). Incoming Page ${pageNumber} set Valid (1) in Frame ${frameIndex}.`,
        status: 'COMPLETED',
      },
      {
        phase: 6,
        name: 'INSTRUCTION_RESTART',
        title: '6. Instruction Restarted',
        description: `CPU instruction restarted. Resolved to Physical Address ${toHex(physicalAddress, 4)}.`,
        status: 'COMPLETED',
      },
    ];

    const explanation = `PAGE FAULT WITH REPLACEMENT: RAM was saturated. Evicted victim Page ${victimPageNumber} from Frame ${frameIndex} (${
      wasDirty ? 'DIRTY: Written back to disk' : 'CLEAN: Discarded'
    }). Loaded Page ${pageNumber} from Swap Disk and restarted instruction (${formatLatency(stepLatencyNs)}).`;

    const step: VirtualMemoryStep = {
      stepNumber,
      rawInput,
      virtualAddress: address,
      virtualAddressHex: toHex(address, 4),
      pageNumber,
      offset,
      offsetHex: toHex(offset, 3),
      accessType,
      status: 'FAULT_WITH_EVICTION',
      frameNumber: frameIndex,
      physicalAddress,
      physicalAddressHex: toHex(physicalAddress, 4),
      victimPage: {
        pageNumber: victimPageNumber,
        frameNumber: frameIndex,
        wasDirty,
      },
      phases,
      explanation,
      stepLatencyNs,
      timestamp: Date.now(),
    };

    this.recordStep(step);
    return step;
  }

  private recordStep(step: VirtualMemoryStep): void {
    this.history.push(step);
    this.currentStepIndex = this.history.length - 1;
    this.snapshots.push(this.captureSnapshot());
  }

  public stepForward(): VirtualMemoryStep | null {
    const nextIndex = this.history.length;
    if (nextIndex < this.referenceStream.length) {
      return this.translateAddress(this.referenceStream[nextIndex]);
    }
    return null;
  }

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

  private recalculateStats(): void {
    if (this.stats.totalAccesses === 0) {
      this.stats.hitRatio = 0;
      this.stats.pageFaultRate = 0;
      this.stats.effectiveAccessTimeNs = this.config.memoryAccessTimeNs;
      this.stats.eatFormatted = formatLatency(this.config.memoryAccessTimeNs);
      return;
    }

    this.stats.hitRatio = Number(
      ((this.stats.hits / this.stats.totalAccesses) * 100).toFixed(1)
    );
    this.stats.pageFaultRate = Number(
      ((this.stats.pageFaults / this.stats.totalAccesses) * 100).toFixed(1)
    );

    const faultProbability = this.stats.pageFaults / this.stats.totalAccesses;
    const dirtyFraction =
      this.stats.pageFaults > 0
        ? this.stats.dirtyWritebacks / this.stats.pageFaults
        : 0;

    const { eatNs, eatFormatted } = calculateEat(
      faultProbability,
      this.config.memoryAccessTimeNs,
      this.config.pageFaultServiceTimeNs,
      dirtyFraction,
      this.config.dirtyWritebackOverheadNs
    );

    this.stats.effectiveAccessTimeNs = eatNs;
    this.stats.eatFormatted = eatFormatted;
  }
}
