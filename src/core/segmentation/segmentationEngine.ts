import type {
  SegmentationConfig,
  Segment,
  SegmentTranslationStep,
  SegmentationStats,
  SegmentationStateSnapshot,
  PhysicalMemoryBlock,
} from './types';
import {
  parseLogicalAddress,
  translateSegmentAddress,
  buildMemoryMap,
} from './segmentationTranslator';

export const DEFAULT_SEGMENTATION_CONFIG: SegmentationConfig = {
  logicalSpaceKb: 64, // 64 KB logical space
  ramSizeKb: 32,      // 32 KB physical RAM (32768 bytes)
};

export const DEFAULT_SEGMENTS: Segment[] = [
  {
    id: 0,
    name: 'Code (Text)',
    base: 2048,
    limit: 4096,
    isValid: true,
    color: '#06b6d4',
    accessCount: 0,
  },
  {
    id: 1,
    name: 'Data (Global)',
    base: 8192,
    limit: 3072,
    isValid: true,
    color: '#8b5cf6',
    accessCount: 0,
  },
  {
    id: 2,
    name: 'Stack',
    base: 14336,
    limit: 2048,
    isValid: true,
    color: '#10b981',
    accessCount: 0,
  },
  {
    id: 3,
    name: 'Heap',
    base: 20480,
    limit: 4096,
    isValid: true,
    color: '#f59e0b',
    accessCount: 0,
  },
];

export class SegmentationEngine {
  private config: SegmentationConfig;
  private segments: Segment[] = [];
  private history: SegmentTranslationStep[] = [];
  private snapshots: SegmentationStateSnapshot[] = [];
  private currentStepIndex = -1;
  private referenceStream: string[] = [];
  private stats: SegmentationStats = {
    totalAccesses: 0,
    validTranslations: 0,
    segmentationFaults: 0,
    successRate: 0,
  };

  constructor(
    config: SegmentationConfig = DEFAULT_SEGMENTATION_CONFIG,
    initialSegments: Segment[] = DEFAULT_SEGMENTS
  ) {
    this.config = { ...config };
    this.segments = initialSegments.map((s) => ({ ...s }));
    this.reset();
  }

  public reset(): void {
    // Reset access counters on segments
    this.segments = this.segments.map((s) => ({
      ...s,
      accessCount: 0,
    }));

    this.history = [];
    this.snapshots = [];
    this.currentStepIndex = -1;
    this.stats = {
      totalAccesses: 0,
      validTranslations: 0,
      segmentationFaults: 0,
      successRate: 0,
    };

    // Save baseline snapshot
    this.snapshots.push(this.captureSnapshot());
  }

  public setConfig(newConfig: SegmentationConfig): { success: boolean; error?: string } {
    if (
      !Number.isSafeInteger(newConfig.logicalSpaceKb) ||
      newConfig.logicalSpaceKb <= 0 ||
      !Number.isSafeInteger(newConfig.ramSizeKb) ||
      newConfig.ramSizeKb <= 0 ||
      !Number.isSafeInteger(newConfig.logicalSpaceKb * 1024) ||
      !Number.isSafeInteger(newConfig.ramSizeKb * 1024)
    ) {
      return { success: false, error: 'Memory sizes must be positive safe integers.' };
    }

    const newRamSizeBytes = newConfig.ramSizeKb * 1024;
    const activeSegments = this.segments
      .filter((segment) => segment.isValid)
      .sort((a, b) => a.base - b.base);
    let previousEnd = 0;
    for (const segment of activeSegments) {
      const endExclusive = segment.base + segment.limit;
      if (
        !Number.isSafeInteger(segment.base) ||
        !Number.isSafeInteger(segment.limit) ||
        !Number.isSafeInteger(endExclusive) ||
        segment.base < 0 ||
        segment.limit <= 0 ||
        segment.base < previousEnd
      ) {
        return {
          success: false,
          error: `Cannot apply RAM configuration: segment "${segment.name}" has an invalid or overlapping range.`,
        };
      }
      if (endExclusive > newRamSizeBytes) {
        return {
          success: false,
          error: `Cannot reduce RAM: segment "${segment.name}" would extend beyond the new ${newConfig.ramSizeKb} KB limit.`,
        };
      }
      previousEnd = endExclusive;
    }

    this.config = { ...newConfig };
    this.reset();
    return { success: true };
  }

  public getConfig(): SegmentationConfig {
    return { ...this.config };
  }

  public getSegments(): Segment[] {
    return this.segments.map((s) => ({ ...s }));
  }

  public validateSegmentPlacement(
    candidate: { base: number; limit: number },
    excludeId?: number
  ): { isValid: boolean; error?: string } {
    const ramSizeBytes = this.config.ramSizeKb * 1024;
    if (
      !Number.isSafeInteger(candidate.base) ||
      !Number.isSafeInteger(candidate.limit) ||
      !Number.isSafeInteger(candidate.base + candidate.limit)
    ) {
      return { isValid: false, error: 'Base and limit must be safe integer byte values.' };
    }
    if (candidate.base < 0) {
      return { isValid: false, error: 'Base address cannot be negative.' };
    }
    if (candidate.limit <= 0) {
      return { isValid: false, error: 'Limit (size) must be greater than 0.' };
    }
    if (candidate.base + candidate.limit > ramSizeBytes) {
      return {
        isValid: false,
        error: `Segment range [${candidate.base}, ${candidate.base + candidate.limit - 1}] exceeds physical RAM capacity (${ramSizeBytes} bytes / ${this.config.ramSizeKb} KB).`,
      };
    }

    // Check collision with other valid segments
    for (const seg of this.segments) {
      if (!seg.isValid) continue;
      if (excludeId !== undefined && seg.id === excludeId) continue;
      const segStart = seg.base;
      const segEnd = seg.base + seg.limit;
      const newStart = candidate.base;
      const newEnd = candidate.base + candidate.limit;

      // Overlap condition: max(start1, start2) < min(end1, end2)
      if (Math.max(segStart, newStart) < Math.min(segEnd, newEnd)) {
        return {
          isValid: false,
          error: `Memory Collision: Overlaps with Segment #${seg.id} "${seg.name}" [${segStart}, ${segEnd - 1}].`,
        };
      }
    }

    return { isValid: true };
  }

  public updateSegment(id: number, updates: Partial<Omit<Segment, 'id'>>): { success: boolean; error?: string } {
    const idx = this.segments.findIndex((s) => s.id === id);
    if (idx !== -1) {
      const current = this.segments[idx];
      const candidate = {
        base: updates.base !== undefined ? updates.base : current.base,
        limit: updates.limit !== undefined ? updates.limit : current.limit,
      };
      const validation = this.validateSegmentPlacement(candidate, id);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }
      this.segments[idx] = { ...current, ...updates };
      if (this.history.length === 0) {
        this.snapshots[0] = this.captureSnapshot();
      }
      return { success: true };
    }
    return { success: false, error: `Segment #${id} not found.` };
  }

  public addSegment(newSeg: Omit<Segment, 'accessCount'>): { success: boolean; error?: string } {
    const validation = this.validateSegmentPlacement(newSeg);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
    this.segments.push({
      ...newSeg,
      accessCount: 0,
    });
    if (this.history.length === 0) {
      this.snapshots[0] = this.captureSnapshot();
    }
    return { success: true };
  }

  public removeSegment(id: number): boolean {
    const idx = this.segments.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.segments.splice(idx, 1);
      if (this.history.length === 0) {
        this.snapshots[0] = this.captureSnapshot();
      }
      return true;
    }
    return false;
  }

  public getFreeHoles(): { startAddress: number; endAddress: number; size: number }[] {
    return this.getMemoryMap()
      .filter((b) => !b.isAllocated)
      .map((b) => ({
        startAddress: b.startAddress,
        endAddress: b.endAddress,
        size: b.size,
      }));
  }

  public getMemoryMap(): PhysicalMemoryBlock[] {
    const ramSizeBytes = this.config.ramSizeKb * 1024;
    return buildMemoryMap(this.segments, ramSizeBytes);
  }

  public getStats(): SegmentationStats {
    return { ...this.stats };
  }

  public getHistory(): SegmentTranslationStep[] {
    return this.history.map((h) => ({ ...h }));
  }

  public getCurrentStep(): SegmentTranslationStep | null {
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

  private captureSnapshot(): SegmentationStateSnapshot {
    return {
      segments: this.segments.map((s) => ({ ...s })),
      stats: { ...this.stats },
      currentStepIndex: this.currentStepIndex,
      history: this.history.map((h) => ({ ...h })),
    };
  }

  public restoreSnapshot(snapshot: SegmentationStateSnapshot): void {
    this.segments = snapshot.segments.map((s) => ({ ...s }));
    this.stats = { ...snapshot.stats };
    this.currentStepIndex = snapshot.currentStepIndex;
    this.history = snapshot.history.map((h) => ({ ...h }));
  }

  /**
   * Translates a logical address string, e.g. "(0, 450)"
   */
  public translateAddress(rawInput: string): SegmentTranslationStep {
    const stepNumber = this.history.length + 1;
    const { segmentId, offset, error } = parseLogicalAddress(rawInput);

    if (error || segmentId === null || offset === null) {
      const step: SegmentTranslationStep = {
        stepNumber,
        rawInput,
        segmentId: -1,
        segmentName: 'Invalid',
        offset: -1,
        base: null,
        limit: null,
        physicalAddress: null,
        physicalAddressHex: null,
        status: 'INVALID_INPUT',
        explanation: error || 'Invalid logical address format. Expected "(segment, offset)".',
        timestamp: Date.now(),
      };
      this.recordStep(step);
      return step;
    }

    const ramSizeBytes = this.config.ramSizeKb * 1024;
    const step = translateSegmentAddress(
      segmentId,
      offset,
      this.segments,
      ramSizeBytes,
      stepNumber,
      rawInput
    );

    // Update stats
    this.stats.totalAccesses += 1;
    if (step.status === 'VALID_TRANSLATION') {
      this.stats.validTranslations += 1;
      const targetSeg = this.segments.find((s) => s.id === segmentId);
      if (targetSeg) {
        targetSeg.accessCount += 1;
      }
    } else {
      this.stats.segmentationFaults += 1;
    }
    this.recalculateSuccessRate();

    this.recordStep(step);
    return step;
  }

  private recordStep(step: SegmentTranslationStep): void {
    this.history.push(step);
    this.currentStepIndex = this.history.length - 1;
    this.snapshots.push(this.captureSnapshot());
  }

  public stepForward(): SegmentTranslationStep | null {
    const nextStreamIndex = this.history.length;
    if (nextStreamIndex < this.referenceStream.length) {
      return this.translateAddress(this.referenceStream[nextStreamIndex]);
    }
    return null;
  }

  /**
   * 100% Reversible deep snapshot history
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

  private recalculateSuccessRate(): void {
    if (this.stats.totalAccesses === 0) {
      this.stats.successRate = 0;
    } else {
      this.stats.successRate = Number(
        ((this.stats.validTranslations / this.stats.totalAccesses) * 100).toFixed(1)
      );
    }
  }
}
