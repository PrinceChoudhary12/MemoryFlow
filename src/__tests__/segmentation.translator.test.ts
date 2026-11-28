import { describe, it, expect } from 'vitest';
import {
  parseLogicalAddress,
  parseAddressStream,
  translateSegmentAddress,
  buildMemoryMap,
  toHex,
} from '../core/segmentation/segmentationTranslator';
import type { Segment } from '../core/segmentation/types';

describe('Segmentation Translator & Memory Map Functions', () => {
  const sampleSegments: Segment[] = [
    { id: 0, name: 'Code', base: 2000, limit: 1000, isValid: true, accessCount: 0 },
    { id: 1, name: 'Data', base: 5000, limit: 1500, isValid: true, accessCount: 0 },
    { id: 2, name: 'Stack', base: 8000, limit: 800, isValid: true, accessCount: 0 },
  ];
  const ramSizeBytes = 16384; // 16 KB

  it('parses logical address input formats cleanly', () => {
    expect(parseLogicalAddress('(0, 450)')).toEqual({ segmentId: 0, offset: 450 });
    expect(parseLogicalAddress('[1, 200]')).toEqual({ segmentId: 1, offset: 200 });
    expect(parseLogicalAddress('2, 100')).toEqual({ segmentId: 2, offset: 100 });
    expect(parseLogicalAddress('s=0, d=500')).toEqual({ segmentId: 0, offset: 500 });
    expect(parseLogicalAddress('s=1, d=0x100')).toEqual({ segmentId: 1, offset: 256 });
    expect(parseLogicalAddress('invalid').error).toBeDefined();
    expect(parseLogicalAddress('').error).toBeDefined();
  });

  it('rejects partial, malformed, negative, decimal, and unsafe logical address values', () => {
    for (const address of [
      '(12.5, 1)',
      '(12abc, 1)',
      '(-1, 1)',
      '(0, 12.5)',
      '(0, 12abc)',
      '(0, -1)',
      '(0xGG, 1)',
      '(0, 0xGG)',
      '(9007199254740992, 1)',
      '(0, 9007199254740992)',
      '(Infinity, 1)',
      '(NaN, 1)',
      '(0,)',
    ]) {
      expect(parseLogicalAddress(address).segmentId, address).toBeNull();
      expect(parseLogicalAddress(address).offset, address).toBeNull();
      expect(parseLogicalAddress(address).error, address).toBeDefined();
    }
  });

  it('translates valid logical address correctly: Physical = Base + Offset', () => {
    // Segment 0: Base 2000, Limit 1000. Offset 450 -> Physical 2450
    const res = translateSegmentAddress(0, 450, sampleSegments, ramSizeBytes, 1, '(0, 450)');
    expect(res.status).toBe('VALID_TRANSLATION');
    expect(res.physicalAddress).toBe(2450);
    expect(res.physicalAddressHex).toBe('0x0992');
    expect(res.base).toBe(2000);
    expect(res.limit).toBe(1000);
  });

  it('rejects invalid direct numeric offsets and accepts both valid boundaries', () => {
    for (const offset of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      const result = translateSegmentAddress(
        0,
        offset,
        sampleSegments,
        ramSizeBytes,
        1,
        String(offset)
      );
      expect(result.status, String(offset)).toBe('INVALID_INPUT');
      expect(result.physicalAddress, String(offset)).toBeNull();
    }

    const atStart = translateSegmentAddress(0, 0, sampleSegments, ramSizeBytes, 1, '(0, 0)');
    expect(atStart.status).toBe('VALID_TRANSLATION');
    expect(atStart.physicalAddress).toBe(2000);

    const lastValidOffset = translateSegmentAddress(0, 999, sampleSegments, ramSizeBytes, 1, '(0, 999)');
    expect(lastValidOffset.status).toBe('VALID_TRANSLATION');
    expect(lastValidOffset.physicalAddress).toBe(2999);

    const firstInvalidOffset = translateSegmentAddress(0, 1000, sampleSegments, ramSizeBytes, 1, '(0, 1000)');
    expect(firstInvalidOffset.status).toBe('FAULT_LIMIT_EXCEEDED');
    expect(firstInvalidOffset.physicalAddress).toBeNull();
  });

  it('rejects invalid direct segment, RAM-size, and step-number arguments', () => {
    expect(translateSegmentAddress(-1, 0, sampleSegments, ramSizeBytes, 1, 'input').status)
      .toBe('INVALID_INPUT');
    expect(translateSegmentAddress(0, 0, sampleSegments, 0, 1, 'input').status)
      .toBe('INVALID_INPUT');
    expect(translateSegmentAddress(0, 0, sampleSegments, ramSizeBytes, 0, 'input').status)
      .toBe('INVALID_INPUT');
  });

  it('detects Segmentation Fault when Offset >= Limit (Memory Protection Trap)', () => {
    // Segment 0: Base 2000, Limit 1000. Offset 1000 (Boundary: offset must be < limit)
    const trap1 = translateSegmentAddress(0, 1000, sampleSegments, ramSizeBytes, 2, '(0, 1000)');
    expect(trap1.status).toBe('FAULT_LIMIT_EXCEEDED');
    expect(trap1.physicalAddress).toBeNull();
    expect(trap1.explanation).toContain('Limit Exceeded');

    // Offset 1500 (Exceeds limit 1000)
    const trap2 = translateSegmentAddress(0, 1500, sampleSegments, ramSizeBytes, 3, '(0, 1500)');
    expect(trap2.status).toBe('FAULT_LIMIT_EXCEEDED');
  });

  it('detects Segmentation Fault for non-existent or invalid segment number', () => {
    const invalidSeg = translateSegmentAddress(9, 100, sampleSegments, ramSizeBytes, 4, '(9, 100)');
    expect(invalidSeg.status).toBe('FAULT_INVALID_SEGMENT');
    expect(invalidSeg.physicalAddress).toBeNull();
    expect(invalidSeg.explanation).toContain('does not exist');
  });

  it('correctly maps physical memory into allocated blocks and free holes', () => {
    const memMap = buildMemoryMap(sampleSegments, 10000);
    // Hole: 0 - 1999 (size 2000)
    expect(memMap[0].isAllocated).toBe(false);
    expect(memMap[0].size).toBe(2000);

    // Segment 0: 2000 - 2999 (size 1000)
    expect(memMap[1].isAllocated).toBe(true);
    expect(memMap[1].segmentName).toBe('Code');
    expect(memMap[1].size).toBe(1000);

    // Hole: 3000 - 4999 (size 2000)
    expect(memMap[2].isAllocated).toBe(false);
    expect(memMap[2].size).toBe(2000);

    // Segment 1: 5000 - 6499 (size 1500)
    expect(memMap[3].isAllocated).toBe(true);
    expect(memMap[3].segmentName).toBe('Data');

    // Hole: 6500 - 7999 (size 1500)
    expect(memMap[4].isAllocated).toBe(false);

    // Segment 2: 8000 - 8799 (size 800)
    expect(memMap[5].isAllocated).toBe(true);
    expect(memMap[5].segmentName).toBe('Stack');

    // Free space at end: 8800 - 9999 (size 1200)
    expect(memMap[6].isAllocated).toBe(false);
    expect(memMap[6].size).toBe(1200);
  });

  it('formats hex addresses consistently', () => {
    expect(toHex(2000, 4)).toBe('0x07D0');
    expect(toHex(0, 4)).toBe('0x0000');
  });

  it('rejects maps that would extend beyond RAM or overlap active segments', () => {
    expect(() => buildMemoryMap([
      { id: 0, name: 'Outside', base: 9000, limit: 2000, isValid: true, accessCount: 0 },
    ], 10000)).toThrow(/invalid or overlapping/);
    expect(() => buildMemoryMap([
      { id: 0, name: 'First', base: 100, limit: 200, isValid: true, accessCount: 0 },
      { id: 1, name: 'Overlap', base: 250, limit: 100, isValid: true, accessCount: 0 },
    ], 1000)).toThrow(/invalid or overlapping/);
  });

  it('parses reference streams containing pairs with internal commas cleanly', () => {
    const stream = '(0, 500), (0, 1024), (1, 200)';
    expect(parseAddressStream(stream)).toEqual(['(0, 500)', '(0, 1024)', '(1, 200)']);

    const bracketStream = '[0, 500]; [1, 200]';
    expect(parseAddressStream(bracketStream)).toEqual(['[0, 500]', '[1, 200]']);

    const newlineStream = '0, 500\n1, 200\n2, 300';
    expect(parseAddressStream(newlineStream)).toEqual(['0, 500', '1, 200', '2, 300']);

    const emptyStream = '   ';
    expect(parseAddressStream(emptyStream)).toEqual([]);
  });
});
