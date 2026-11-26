import { describe, it, expect } from 'vitest';
import {
  ReplacementEngine,
  parseReferenceString,
  REPLACEMENT_PRESETS,
} from '../core/replacement/replacementEngine';

describe('Replacement Engine & Parsing Suite', () => {
  describe('parseReferenceString', () => {
    it('parses comma-separated string correctly', () => {
      const res = parseReferenceString('7, 0, 1, 2, 0, 3');
      expect(res.valid).toBe(true);
      expect(res.pages).toEqual([7, 0, 1, 2, 0, 3]);
    });

    it('parses space-separated string correctly', () => {
      const res = parseReferenceString('1 2 3 4 5');
      expect(res.valid).toBe(true);
      expect(res.pages).toEqual([1, 2, 3, 4, 5]);
    });

    it('parses bracketed array string correctly', () => {
      const res = parseReferenceString('[1, 2, 3, 4]');
      expect(res.valid).toBe(true);
      expect(res.pages).toEqual([1, 2, 3, 4]);
    });

    it('rejects empty input', () => {
      const res = parseReferenceString('   ');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('cannot be empty');
    });

    it('rejects non-numeric tokens', () => {
      const res = parseReferenceString('1, 2, abc, 4');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid page token "abc"');
    });

    it('rejects negative numbers', () => {
      const res = parseReferenceString('1, -2, 3');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid page token');
    });

    it('rejects numbers exceeding 99', () => {
      const res = parseReferenceString('1, 105, 3');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds recommended display range');
    });

    it('rejects strings exceeding 50 pages', () => {
      const longList = Array.from({ length: 55 }, (_, i) => i % 10).join(' ');
      const res = parseReferenceString(longList);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds maximum allowable limit of 50');
    });
  });

  describe('ReplacementEngine Execution & Snapshots', () => {
    it('initializes with default Silberschatz preset', () => {
      const engine = new ReplacementEngine();
      expect(engine.getFrameCount()).toBe(3);
      expect(engine.getCurrentStepIndex()).toBe(-1);
      expect(engine.canStepForward()).toBe(true);
      expect(engine.canStepBackward()).toBe(false);
      expect(engine.getHistory()).toHaveLength(0);
      expect(engine.getFifoFrames()).toHaveLength(3);
      expect(engine.getLruFrames()).toHaveLength(3);
    });

    it('steps forward synchronizing both FIFO and LRU', () => {
      const engine = new ReplacementEngine([7, 0, 1], 3);
      const step0 = engine.stepForward();

      expect(step0).not.toBeNull();
      expect(step0?.pageNumber).toBe(7);
      expect(step0?.fifo.status).toBe('FAULT');
      expect(step0?.lru.status).toBe('FAULT');
      expect(engine.getCurrentStepIndex()).toBe(0);
      expect(engine.canStepBackward()).toBe(true);

      engine.stepForward(); // 0
      engine.stepForward(); // 1

      expect(engine.getCurrentStepIndex()).toBe(2);
      expect(engine.canStepForward()).toBe(false); // Finished sequence
    });

    it('reversibly steps backward restoring exact previous frame state', () => {
      const engine = new ReplacementEngine([7, 0, 1, 2], 3);

      // Step forward 4 times
      engine.stepForward(); // 7
      engine.stepForward(); // 0
      engine.stepForward(); // 1
      engine.stepForward(); // 2 -> evicts 7

      expect(engine.getCurrentStepIndex()).toBe(3);
      expect(engine.getFifoFrames().map((f) => f.pageNumber)).toEqual([2, 0, 1]);

      // Step backward 1 step
      const rewound = engine.stepBackward();
      expect(rewound).toBe(true);
      expect(engine.getCurrentStepIndex()).toBe(2);
      expect(engine.getFifoFrames().map((f) => f.pageNumber)).toEqual([7, 0, 1]);
      expect(engine.getHistory()).toHaveLength(3);

      // Step backward all the way to start
      engine.stepBackward();
      engine.stepBackward();
      engine.stepBackward();

      expect(engine.getCurrentStepIndex()).toBe(-1);
      expect(engine.canStepBackward()).toBe(false);
      expect(engine.getHistory()).toHaveLength(0);
    });

    it('stepTo jumps forward and backward accurately', () => {
      const engine = new ReplacementEngine([7, 0, 1, 2, 0, 3], 3);

      engine.stepTo(4);
      expect(engine.getCurrentStepIndex()).toBe(4);
      expect(engine.getHistory()).toHaveLength(5);

      engine.stepTo(1);
      expect(engine.getCurrentStepIndex()).toBe(1);
      expect(engine.getHistory()).toHaveLength(2);

      engine.stepTo(-1);
      expect(engine.getCurrentStepIndex()).toBe(-1);
      expect(engine.getHistory()).toHaveLength(0);
    });

    it('resets state properly when reset() is called', () => {
      const engine = new ReplacementEngine([1, 2, 3], 2);
      engine.stepForward();
      engine.stepForward();
      expect(engine.getCurrentStepIndex()).toBe(1);

      engine.reset();
      expect(engine.getCurrentStepIndex()).toBe(-1);
      expect(engine.getHistory()).toHaveLength(0);
      expect(engine.getFifoFrames().every((f) => f.pageNumber === null)).toBe(true);
    });

    it('loads presets correctly and resets simulation', () => {
      const engine = new ReplacementEngine();
      const loaded = engine.loadPreset('belady');

      expect(loaded).toBe(true);
      expect(engine.getReferenceString()).toEqual([1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]);
      expect(engine.getFrameCount()).toBe(3);
      expect(engine.getCurrentStepIndex()).toBe(-1);
    });

    it('computes comparison stats correctly, declaring winner', () => {
      // Silberschatz: FIFO 15 faults, LRU 12 faults -> LRU wins by 3 faults
      const engine = new ReplacementEngine(
        REPLACEMENT_PRESETS[0].referenceString,
        REPLACEMENT_PRESETS[0].defaultFrameCount
      );

      while (engine.canStepForward()) {
        engine.stepForward();
      }

      const stats = engine.getStats();
      expect(stats.totalAccesses).toBe(20);
      expect(stats.fifo.faults).toBe(15);
      expect(stats.lru.faults).toBe(12);
      expect(stats.faultDelta).toBe(3);
      expect(stats.winner).toBe('LRU');
    });
  });
});
