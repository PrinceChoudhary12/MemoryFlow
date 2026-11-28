import { describe, it, expect } from 'vitest';
import {
  VirtualMemoryEngine,
  DEFAULT_VM_CONFIG,
} from '../core/virtualMemory/virtualMemoryEngine';
import { calculateEat } from '../core/virtualMemory/eatCalculator';

describe('VirtualMemoryEngine Demand Paging & Interrupt Cycle', () => {
  it('initializes with default 16 virtual pages (all invalid) and 4 physical frames', () => {
    const engine = new VirtualMemoryEngine();
    expect(engine.getConfig()).toEqual(DEFAULT_VM_CONFIG);

    const pt = engine.getPageTable();
    expect(pt).toHaveLength(16);
    expect(pt.every((p) => !p.isValid && !p.isDirty && p.frameNumber === null)).toBe(true);

    const frames = engine.getPhysicalFrames();
    expect(frames).toHaveLength(4);
    expect(frames.every((f) => !f.isOccupied)).toBe(true);

    const disk = engine.getSwapDisk();
    expect(disk).toHaveLength(16);
    expect(disk.every((s) => !s.isLoadedInRam)).toBe(true);

    expect(engine.getStats().totalAccesses).toBe(0);
    expect(engine.getStats().hits).toBe(0);
    expect(engine.getStats().pageFaults).toBe(0);
  });

  it('triggers Page Fault on first access, allocates Frame 0, and updates Page Table', () => {
    const engine = new VirtualMemoryEngine();
    // Access Page 1 (0x1000 = 4096) with READ
    const step = engine.translateAddress('0x1000:R');

    expect(step.status).toBe('FAULT_RESOLVED');
    expect(step.pageNumber).toBe(1);
    expect(step.frameNumber).toBe(0);
    expect(step.physicalAddress).toBe(0);
    expect(step.accessType).toBe('READ');

    // Page Table updated
    const pt = engine.getPageTable();
    expect(pt[1].isValid).toBe(true);
    expect(pt[1].frameNumber).toBe(0);
    expect(pt[1].isDirty).toBe(false);

    // Frame 0 occupied
    const frames = engine.getPhysicalFrames();
    expect(frames[0].isOccupied).toBe(true);
    expect(frames[0].pageNumber).toBe(1);
    expect(frames[0].isDirty).toBe(false);

    // Swap disk indicates page loaded
    expect(engine.getSwapDisk()[1].isLoadedInRam).toBe(true);

    // Stats
    expect(engine.getStats().totalAccesses).toBe(1);
    expect(engine.getStats().pageFaults).toBe(1);
    expect(engine.getStats().hits).toBe(0);
  });

  it('triggers Page Hit on subsequent reference, and marks page dirty on WRITE', () => {
    const engine = new VirtualMemoryEngine();
    // 1. Initial fault load Page 1
    engine.translateAddress('0x1000:R');

    // 2. Access Page 1 again with WRITE (0x1050:W)
    const step2 = engine.translateAddress('0x1050:W');

    expect(step2.status).toBe('HIT');
    expect(step2.pageNumber).toBe(1);
    expect(step2.frameNumber).toBe(0);
    expect(step2.physicalAddress).toBe(0x50);
    expect(step2.accessType).toBe('WRITE');

    // Dirty bit set
    expect(engine.getPageTable()[1].isDirty).toBe(true);
    expect(engine.getPhysicalFrames()[0].isDirty).toBe(true);

    const stats = engine.getStats();
    expect(stats.totalAccesses).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.pageFaults).toBe(1);
    expect(stats.hitRatio).toBe(50.0);
  });

  it('handles page replacement and dirty writeback when RAM is full', () => {
    const engine = new VirtualMemoryEngine();
    // Fill all 4 frames:
    // Frame 0: Page 0 (WRITE -> Dirty)
    engine.translateAddress('0x0000:W');
    // Frame 1: Page 1 (READ -> Clean)
    engine.translateAddress('0x1000:R');
    // Frame 2: Page 2 (READ -> Clean)
    engine.translateAddress('0x2000:R');
    // Frame 3: Page 3 (READ -> Clean)
    engine.translateAddress('0x3000:R');

    expect(engine.getPhysicalFrames().every((f) => f.isOccupied)).toBe(true);
    expect(engine.getPhysicalFrames()[0].isDirty).toBe(true);

    // Now reference Page 4 (0x4000) -> Triggers eviction of oldest frame (Frame 0: Page 0)
    const step5 = engine.translateAddress('0x4000:R');

    expect(step5.status).toBe('FAULT_WITH_EVICTION');
    expect(step5.pageNumber).toBe(4);
    expect(step5.victimPage?.pageNumber).toBe(0);
    expect(step5.victimPage?.wasDirty).toBe(true);

    // Dirty writeback incremented
    expect(engine.getStats().dirtyWritebacks).toBe(1);

    // Latency reflects base service time (8ms) + dirty writeback overhead (4ms) = 12ms
    expect(step5.stepLatencyNs).toBe(12_000_000);

    // Victim Page 0 is now Invalid in page table
    expect(engine.getPageTable()[0].isValid).toBe(false);
    expect(engine.getPageTable()[0].frameNumber).toBeNull();

    // Incoming Page 4 is now Valid in Frame 0
    expect(engine.getPageTable()[4].isValid).toBe(true);
    expect(engine.getPageTable()[4].frameNumber).toBe(0);
  });

  it('fully reverses simulation state on stepBackward including dirty bits, frames, and EAT stats', () => {
    const engine = new VirtualMemoryEngine();
    engine.setReferenceStream(['0x0000:W', '0x1000:R', '0x0050:R']);

    // Advance 3 steps
    engine.stepForward(); // Step 1: Fault, Page 0, Dirty
    engine.stepForward(); // Step 2: Fault, Page 1, Clean
    engine.stepForward(); // Step 3: Hit, Page 0

    expect(engine.getStats().totalAccesses).toBe(3);
    expect(engine.getStats().hits).toBe(1);
    expect(engine.getStats().pageFaults).toBe(2);

    // Step backward once -> Reverts Step 3 (Hit)
    expect(engine.stepBackward()).toBe(true);
    expect(engine.getStats().totalAccesses).toBe(2);
    expect(engine.getStats().hits).toBe(0);
    expect(engine.getStats().pageFaults).toBe(2);

    // Step backward again -> Reverts Step 2 (Page 1 allocation)
    expect(engine.stepBackward()).toBe(true);
    expect(engine.getStats().totalAccesses).toBe(1);
    expect(engine.getPageTable()[1].isValid).toBe(false);
    expect(engine.getPhysicalFrames()[1].isOccupied).toBe(false);

    // Step backward to baseline
    expect(engine.stepBackward()).toBe(true);
    expect(engine.getStats().totalAccesses).toBe(0);
    expect(engine.getPageTable()[0].isValid).toBe(false);
    expect(engine.getPhysicalFrames()[0].isOccupied).toBe(false);
    expect(engine.canStepBackward()).toBe(false);
    expect(engine.stepBackward()).toBe(false);
  });

  it('safely handles address boundary violations', () => {
    const engine = new VirtualMemoryEngine();
    // Virtual space is 64 KB = 65536 B (Max valid address: 65535)
    const step = engine.translateAddress('0x20000'); // 131072 > 65536
    expect(step.status).toBe('INVALID_ADDRESS');
    expect(step.pageNumber).toBe(-1);
    expect(step.physicalAddress).toBeNull();
  });

  it('keeps dirty-writeback EAT inputs aligned with the engine calculation', () => {
    const engine = new VirtualMemoryEngine();
    engine.translateAddress('0x0000:W');
    engine.translateAddress('0x1000:R');
    engine.translateAddress('0x2000:R');
    engine.translateAddress('0x3000:R');
    engine.translateAddress('0x4000:R');

    const stats = engine.getStats();
    const config = engine.getConfig();
    const expected = calculateEat(
      stats.pageFaults / stats.totalAccesses,
      config.memoryAccessTimeNs,
      config.pageFaultServiceTimeNs,
      stats.dirtyWritebacks / stats.pageFaults,
      config.dirtyWritebackOverheadNs
    );
    expect(stats.effectiveAccessTimeNs).toBe(expected.eatNs);
    expect(stats.dirtyWritebacks).toBe(1);
  });
});
