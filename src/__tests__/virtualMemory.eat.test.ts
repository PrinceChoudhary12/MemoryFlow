import { describe, it, expect } from 'vitest';
import {
  calculateEat,
  formatLatency,
  parseVmAddress,
  toHex,
} from '../core/virtualMemory/eatCalculator';

describe('Virtual Memory EAT & Address Parsing', () => {
  it('formats latency across ns, µs, and ms with readable units', () => {
    expect(formatLatency(100)).toBe('100 ns');
    expect(formatLatency(999)).toBe('999 ns');
    expect(formatLatency(1500)).toBe('1.50 µs');
    expect(formatLatency(25000)).toBe('25.0 µs');
    expect(formatLatency(8000000)).toBe('8.00 ms');
    expect(formatLatency(12500000)).toBe('12.5 ms');
  });

  it('calculates Effective Access Time (EAT) according to standard OS formula', () => {
    // 0% Page Fault Rate (Pure Hits): EAT should equal RAM access time (100 ns)
    const pureHits = calculateEat(0, 100, 8_000_000);
    expect(pureHits.eatNs).toBe(100);
    expect(pureHits.normalComponentNs).toBe(100);
    expect(pureHits.faultComponentNs).toBe(0);

    // 10% Page Fault Rate: 90% * 100 ns + 10% * 8,000,000 ns = 90 ns + 800,000 ns = 800,090 ns
    const tenPercent = calculateEat(0.1, 100, 8_000_000);
    expect(tenPercent.eatNs).toBe(800090);
    expect(tenPercent.normalComponentNs).toBe(90);
    expect(tenPercent.faultComponentNs).toBe(800000);

    // 100% Page Fault Rate with dirty page writeback
    const pureFaultsDirty = calculateEat(1.0, 100, 8_000_000, 1.0, 4_000_000);
    expect(pureFaultsDirty.eatNs).toBe(12_000_000);
  });

  it('parses virtual addresses and access types (Read/Write) in multiple formats', () => {
    expect(parseVmAddress('0x1000:W')).toEqual({ address: 4096, accessType: 'WRITE' });
    expect(parseVmAddress('0x1000:R')).toEqual({ address: 4096, accessType: 'READ' });
    expect(parseVmAddress('WRITE 0x2050')).toEqual({ address: 8272, accessType: 'WRITE' });
    expect(parseVmAddress('READ 0x2050')).toEqual({ address: 8272, accessType: 'READ' });
    expect(parseVmAddress('0x1000 (W)')).toEqual({ address: 4096, accessType: 'WRITE' });
    expect(parseVmAddress('0x1000, WRITE')).toEqual({ address: 4096, accessType: 'WRITE' });
    expect(parseVmAddress('0x1000')).toEqual({ address: 4096, accessType: 'READ' });
    expect(parseVmAddress('4096')).toEqual({ address: 4096, accessType: 'READ' });

    expect(parseVmAddress('').error).toBeDefined();
    expect(parseVmAddress('invalid').error).toBeDefined();
  });

  it('formats hex addresses consistently with zero-padding', () => {
    expect(toHex(4096, 4)).toBe('0x1000');
    expect(toHex(0, 4)).toBe('0x0000');
  });
});
