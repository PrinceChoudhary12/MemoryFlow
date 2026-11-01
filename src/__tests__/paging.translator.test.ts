import { describe, it, expect } from 'vitest';
import {
  calculateGeometry,
  splitAddress,
  calculatePhysicalAddress,
  parseAddress,
  toHex,
  toBinary,
} from '../core/paging/addressTranslator';
import type { PagingConfig } from '../core/paging/types';

describe('Paging Translator & Math Functions', () => {
  const config: PagingConfig = {
    virtualSpaceKb: 64, // 16 pages
    ramSizeKb: 32,      // 8 frames
    pageSizeKb: 4,      // 4096 bytes
  };

  it('calculates correct geometry for independent virtual and physical spaces', () => {
    const geo = calculateGeometry(config);
    expect(geo.pageSizeBytes).toBe(4096);
    expect(geo.totalVirtualPages).toBe(16);
    expect(geo.totalPhysicalFrames).toBe(8);
    expect(geo.offsetBits).toBe(12);
    expect(geo.pageBits).toBe(4);
    expect(geo.maxVirtualAddress).toBe(65535);
  });

  it('correctly splits virtual addresses into page and offset', () => {
    // Address 18500: 18500 / 4096 = 4.5166 -> Page 4, Offset 2116
    const res = splitAddress(18500, config);
    expect(res.isValid).toBe(true);
    expect(res.pageNumber).toBe(4);
    expect(res.offset).toBe(2116);
    expect(res.virtualAddressHex).toBe('0x4844');
    expect(res.offsetHex).toBe('0x844');
  });

  it('handles exact page boundaries accurately', () => {
    // Exact end of Page 0
    const edge0 = splitAddress(4095, config);
    expect(edge0.pageNumber).toBe(0);
    expect(edge0.offset).toBe(4095);

    // Exact start of Page 1
    const edge1 = splitAddress(4096, config);
    expect(edge1.pageNumber).toBe(1);
    expect(edge1.offset).toBe(0);

    // Final valid byte of 64 KB space
    const lastByte = splitAddress(65535, config);
    expect(lastByte.isValid).toBe(true);
    expect(lastByte.pageNumber).toBe(15);
    expect(lastByte.offset).toBe(4095);
  });

  it('rejects addresses exceeding the virtual address space', () => {
    const outOfBounds = splitAddress(65536, config);
    expect(outOfBounds.isValid).toBe(false);
    expect(outOfBounds.errorMessage).toContain('exceeds virtual address space');

    const negative = splitAddress(-10, config);
    expect(negative.isValid).toBe(false);
  });

  it('computes exact physical address from frame and offset', () => {
    // Frame 5, Offset 1000 with 4KB pages: (5 * 4096) + 1000 = 20480 + 1000 = 21480
    const phys = calculatePhysicalAddress(5, 1000, 4);
    expect(phys.address).toBe(21480);
    expect(phys.addressHex).toBe('0x53E8');
  });

  it('parses decimal and hexadecimal user inputs robustly', () => {
    expect(parseAddress('4096').address).toBe(4096);
    expect(parseAddress('0x1000').address).toBe(4096);
    expect(parseAddress('1000').address).toBe(1000);
    expect(parseAddress('0x4844').address).toBe(18500);

    expect(parseAddress('invalid').error).toBeDefined();
    expect(parseAddress('-500').error).toBeDefined();
    expect(parseAddress('').error).toBeDefined();
  });

  it('formats hex and binary strings with proper padding', () => {
    expect(toHex(15, 2)).toBe('0x0F');
    expect(toHex(4096, 4)).toBe('0x1000');
    expect(toBinary(5, 4)).toBe('0101');
  });
});
