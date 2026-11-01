import { describe, it, expect } from 'vitest';
import { PagingEngine, DEFAULT_PAGING_CONFIG } from '../core/paging/pagingEngine';

describe('PagingEngine State Machine & Reversible History', () => {
  it('initializes with default 16 virtual pages and 8 physical frames', () => {
    const engine = new PagingEngine();
    expect(engine.getConfig()).toEqual(DEFAULT_PAGING_CONFIG);
    expect(engine.getPageTable()).toHaveLength(16);
    expect(engine.getPhysicalFrames()).toHaveLength(8);

    // Initial page table entries must be invalid
    engine.getPageTable().forEach((entry) => {
      expect(entry.isValid).toBe(false);
      expect(entry.frameNumber).toBeNull();
    });

    // Initial frames must be unoccupied
    engine.getPhysicalFrames().forEach((frame) => {
      expect(frame.isOccupied).toBe(false);
      expect(frame.pageNumber).toBeNull();
    });
  });

  it('triggers Page Fault on first access and allocates Frame 0', () => {
    const engine = new PagingEngine();
    // Address 0x1000 = 4096 -> Page 1, Offset 0
    const step = engine.translateAddress('0x1000');

    expect(step.status).toBe('FAULT_RESOLVED');
    expect(step.pageNumber).toBe(1);
    expect(step.frameNumber).toBe(0);
    expect(step.physicalAddress).toBe(0); // Frame 0 * 4096 + 0 = 0

    // Check Page Table updated
    const pt = engine.getPageTable();
    expect(pt[1].isValid).toBe(true);
    expect(pt[1].frameNumber).toBe(0);

    // Check Frame 0 occupied
    const frames = engine.getPhysicalFrames();
    expect(frames[0].isOccupied).toBe(true);
    expect(frames[0].pageNumber).toBe(1);

    // Check stats: 1 fault, 0 hits
    expect(engine.getStats().totalAccesses).toBe(1);
    expect(engine.getStats().faults).toBe(1);
    expect(engine.getStats().hits).toBe(0);
    expect(engine.getStats().hitRatio).toBe(0);
  });

  it('triggers Page Hit on subsequent access to resident page', () => {
    const engine = new PagingEngine();
    // Step 1: Page 1 (Fault)
    engine.translateAddress('0x1000');
    // Step 2: Page 1 at offset 200 (Hit)
    const step2 = engine.translateAddress('0x10C8'); // 4096 + 200 = 4296 (0x10C8)

    expect(step2.status).toBe('HIT');
    expect(step2.pageNumber).toBe(1);
    expect(step2.frameNumber).toBe(0);
    expect(step2.physicalAddress).toBe(200);

    const stats = engine.getStats();
    expect(stats.totalAccesses).toBe(2);
    expect(stats.faults).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.hitRatio).toBe(50.0);
  });

  it('handles physical memory saturation with FAULT_MEMORY_FULL without crashing', () => {
    const engine = new PagingEngine({
      virtualSpaceKb: 64, // 16 pages
      ramSizeKb: 16,      // 4 frames (fills quickly)
      pageSizeKb: 4,
    });

    // Access 4 unique pages (Pages 0, 1, 2, 3) to fill all 4 frames
    engine.translateAddress('0x0000'); // Page 0 -> Frame 0
    engine.translateAddress('0x1000'); // Page 1 -> Frame 1
    engine.translateAddress('0x2000'); // Page 2 -> Frame 2
    engine.translateAddress('0x3000'); // Page 3 -> Frame 3

    expect(engine.getPhysicalFrames().every((f) => f.isOccupied)).toBe(true);

    // Now reference a 5th unique page (Page 4):
    const step5 = engine.translateAddress('0x4000');
    expect(step5.status).toBe('FAULT_MEMORY_FULL');
    expect(step5.frameNumber).toBeNull();
    expect(step5.physicalAddress).toBeNull();
    expect(step5.explanation).toContain('MEMORY FULL');

    // Stats still track access and fault
    expect(engine.getStats().totalAccesses).toBe(5);
    expect(engine.getStats().faults).toBe(5);
  });

  it('fully reverses simulation state on stepBackward including tables, frames, and stats', () => {
    const engine = new PagingEngine();
    engine.setReferenceStream(['0x1000', '0x2000', '0x1000']);

    // Advance 3 steps
    engine.stepForward(); // Page 1 (Fault, Frame 0)
    engine.stepForward(); // Page 2 (Fault, Frame 1)
    engine.stepForward(); // Page 1 (Hit)

    expect(engine.getStats().totalAccesses).toBe(3);
    expect(engine.getStats().hits).toBe(1);
    expect(engine.getStats().faults).toBe(2);
    expect(engine.getCurrentStepIndex()).toBe(2);

    // Step backward once -> Reverts step 3 (Hit)
    const reverted1 = engine.stepBackward();
    expect(reverted1).toBe(true);
    expect(engine.getStats().totalAccesses).toBe(2);
    expect(engine.getStats().hits).toBe(0);
    expect(engine.getStats().faults).toBe(2);

    // Step backward again -> Reverts step 2 (Page 2 allocation)
    const reverted2 = engine.stepBackward();
    expect(reverted2).toBe(true);
    expect(engine.getStats().totalAccesses).toBe(1);
    expect(engine.getPhysicalFrames()[1].isOccupied).toBe(false);
    expect(engine.getPageTable()[2].isValid).toBe(false);

    // Step backward to initial empty state
    engine.stepBackward();
    expect(engine.getStats().totalAccesses).toBe(0);
    expect(engine.getPhysicalFrames().every((f) => !f.isOccupied)).toBe(true);
    expect(engine.getPageTable().every((e) => !e.isValid)).toBe(true);
    expect(engine.canStepBackward()).toBe(false);
    expect(engine.stepBackward()).toBe(false);
  });

  it('correctly reverts and restores chronological event log through unresolved FAULT_MEMORY_FULL events', () => {
    const engine = new PagingEngine({
      virtualSpaceKb: 64, // 16 pages
      ramSizeKb: 8,       // 2 frames (fills after 2 unique pages)
      pageSizeKb: 4,
    });

    // Step 1: Page 0 (Fault, Frame 0)
    engine.translateAddress('0x0000');
    // Step 2: Page 1 (Fault, Frame 1) -> RAM now full
    engine.translateAddress('0x1000');
    // Step 3: Page 2 (Unresolved FAULT_MEMORY_FULL)
    const step3 = engine.translateAddress('0x2000');
    expect(step3.status).toBe('FAULT_MEMORY_FULL');

    // Step 4: Page 0 (Hit)
    const step4 = engine.translateAddress('0x0000');
    expect(step4.status).toBe('HIT');

    expect(engine.getHistory()).toHaveLength(4);
    expect(engine.getHistory()[2].status).toBe('FAULT_MEMORY_FULL');
    expect(engine.getStats().totalAccesses).toBe(4);
    expect(engine.getStats().faults).toBe(3); // Steps 1, 2, 3
    expect(engine.getStats().hits).toBe(1);   // Step 4

    // Step back once: Reverts Step 4 (Hit)
    expect(engine.stepBackward()).toBe(true);
    expect(engine.getHistory()).toHaveLength(3);
    // Active current step is now precisely the unresolved FAULT_MEMORY_FULL event!
    expect(engine.getCurrentStep()?.status).toBe('FAULT_MEMORY_FULL');
    expect(engine.getCurrentStep()?.pageNumber).toBe(2);
    expect(engine.getStats().totalAccesses).toBe(3);
    expect(engine.getStats().hits).toBe(0);
    expect(engine.getStats().faults).toBe(3);

    // Step back again: Reverts Step 3 (FAULT_MEMORY_FULL)
    expect(engine.stepBackward()).toBe(true);
    expect(engine.getHistory()).toHaveLength(2);
    expect(engine.getCurrentStep()?.status).toBe('FAULT_RESOLVED');
    expect(engine.getCurrentStep()?.pageNumber).toBe(1);
    expect(engine.getStats().totalAccesses).toBe(2);
    expect(engine.getStats().faults).toBe(2);
  });
});
