import { describe, it, expect } from 'vitest';
import {
  SegmentationEngine,
  DEFAULT_SEGMENTATION_CONFIG,
  DEFAULT_SEGMENTS,
} from '../core/segmentation/segmentationEngine';

describe('SegmentationEngine State Machine & Reversible History', () => {
  it('initializes with default 4 standard segments (Code, Data, Stack, Heap)', () => {
    const engine = new SegmentationEngine();
    expect(engine.getConfig()).toEqual(DEFAULT_SEGMENTATION_CONFIG);
    expect(DEFAULT_SEGMENTS).toHaveLength(4);
    const segments = engine.getSegments();
    expect(segments).toHaveLength(4);
    expect(segments[0].name).toContain('Code');
    expect(segments[1].name).toContain('Data');
    expect(segments[2].name).toContain('Stack');
    expect(segments[3].name).toContain('Heap');

    expect(engine.getStats().totalAccesses).toBe(0);
    expect(engine.getStats().validTranslations).toBe(0);
    expect(engine.getStats().segmentationFaults).toBe(0);
  });

  it('translates valid address and increments segment hit count', () => {
    const engine = new SegmentationEngine();
    // Segment 0: Base 2048, Limit 4096. Access (0, 500) -> 2048 + 500 = 2548
    const step = engine.translateAddress('(0, 500)');
    expect(step.status).toBe('VALID_TRANSLATION');
    expect(step.physicalAddress).toBe(2548);
    expect(step.physicalAddressHex).toBe('0x09F4');

    const stats = engine.getStats();
    expect(stats.totalAccesses).toBe(1);
    expect(stats.validTranslations).toBe(1);
    expect(stats.segmentationFaults).toBe(0);
    expect(stats.successRate).toBe(100.0);

    // Segment 0 access count incremented
    expect(engine.getSegments()[0].accessCount).toBe(1);
  });

  it('triggers Segmentation Fault and increments fault counter when offset >= limit', () => {
    const engine = new SegmentationEngine();
    // Segment 2: Stack, Limit 2048. Access (2, 2500) -> Trap!
    const step = engine.translateAddress('(2, 2500)');
    expect(step.status).toBe('FAULT_LIMIT_EXCEEDED');
    expect(step.physicalAddress).toBeNull();

    const stats = engine.getStats();
    expect(stats.totalAccesses).toBe(1);
    expect(stats.validTranslations).toBe(0);
    expect(stats.segmentationFaults).toBe(1);
    expect(stats.successRate).toBe(0.0);
  });

  it('validates segment placement and prevents collision or RAM overflow', () => {
    const engine = new SegmentationEngine();
    // Default RAM is 32 KB = 32768 bytes
    // Code is at [2048, 6143]

    // Collision with Code segment:
    const collision = engine.addSegment({
      id: 4,
      name: 'Colliding Segment',
      base: 3000,
      limit: 1000,
      isValid: true,
    });
    expect(collision.success).toBe(false);
    expect(collision.error).toContain('Memory Collision');

    // Overflow physical RAM:
    const overflow = engine.addSegment({
      id: 5,
      name: 'Overflowing Segment',
      base: 30000,
      limit: 5000, // 30000 + 5000 = 35000 > 32768
      isValid: true,
    });
    expect(overflow.success).toBe(false);
    expect(overflow.error).toContain('exceeds physical RAM');

    // Valid placement in free hole:
    const valid = engine.addSegment({
      id: 6,
      name: 'Valid Segment',
      base: 26000,
      limit: 2000,
      isValid: true,
    });
    expect(valid.success).toBe(true);

    // Update segment safely
    const updateResult = engine.updateSegment(6, { name: 'Updated Lib' });
    expect(updateResult.success).toBe(true);
    expect(engine.getSegments().find((s) => s.id === 6)?.name).toBe('Updated Lib');
  });

  it('calculates free memory holes correctly', () => {
    const engine = new SegmentationEngine();
    const holes = engine.getFreeHoles();
    expect(holes.length).toBeGreaterThan(0);
    // Hole 0: 0 to 2047
    expect(holes[0].startAddress).toBe(0);
    expect(holes[0].endAddress).toBe(2047);
    expect(holes[0].size).toBe(2048);
  });

  it('fully reverses simulation state on stepBackward including memory map, segments, and stats', () => {
    const engine = new SegmentationEngine();
    engine.setReferenceStream(['(0, 500)', '(2, 3000)', '(1, 100)']);

    // Advance 3 steps: 1 Valid, 1 SegFault (Limit), 1 Valid
    engine.stepForward(); // Step 1: Valid
    engine.stepForward(); // Step 2: SegFault
    engine.stepForward(); // Step 3: Valid

    expect(engine.getStats().totalAccesses).toBe(3);
    expect(engine.getStats().validTranslations).toBe(2);
    expect(engine.getStats().segmentationFaults).toBe(1);
    expect(engine.getCurrentStepIndex()).toBe(2);

    // Step backward once -> Reverts Step 3
    expect(engine.stepBackward()).toBe(true);
    expect(engine.getStats().totalAccesses).toBe(2);
    expect(engine.getStats().validTranslations).toBe(1);
    expect(engine.getStats().segmentationFaults).toBe(1);
    expect(engine.getCurrentStep()?.status).toBe('FAULT_LIMIT_EXCEEDED');

    // Step backward again -> Reverts Step 2 (SegFault)
    expect(engine.stepBackward()).toBe(true);
    expect(engine.getStats().totalAccesses).toBe(1);
    expect(engine.getStats().validTranslations).toBe(1);
    expect(engine.getStats().segmentationFaults).toBe(0);
    expect(engine.getCurrentStep()?.status).toBe('VALID_TRANSLATION');

    // Step backward to baseline
    expect(engine.stepBackward()).toBe(true);
    expect(engine.getStats().totalAccesses).toBe(0);
    expect(engine.getStats().validTranslations).toBe(0);
    expect(engine.getStats().segmentationFaults).toBe(0);
    expect(engine.canStepBackward()).toBe(false);
    expect(engine.stepBackward()).toBe(false);
  });
});
