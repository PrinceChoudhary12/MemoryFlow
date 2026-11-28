import { parseStrictAddressInteger } from '../addressParsing';

/**
 * MemoryFlow — Effective Access Time (EAT) & Latency Formatter
 * Pure TypeScript Mathematical Operations
 */

/**
 * Formats a latency duration from nanoseconds to a human-readable string:
 * - < 1,000 ns -> "XYZ ns"
 * - < 1,000,000 ns -> "XYZ.XX µs"
 * - >= 1,000,000 ns -> "XYZ.XX ms"
 */
export function formatLatency(nanoseconds: number): string {
  if (isNaN(nanoseconds) || nanoseconds < 0) return '0 ns';

  if (nanoseconds < 1000) {
    return `${Math.round(nanoseconds)} ns`;
  } else if (nanoseconds < 1_000_000) {
    const us = nanoseconds / 1000;
    return `${us >= 10 ? us.toFixed(1) : us.toFixed(2)} µs`;
  } else {
    const ms = nanoseconds / 1_000_000;
    return `${ms >= 10 ? ms.toFixed(1) : ms.toFixed(2)} ms`;
  }
}

/**
 * Calculates Effective Access Time (EAT) according to the OS standard formulation:
 *
 * EAT = (1 - p) * RAM_Access_Time + p * (Page_Fault_Service_Time + q * Dirty_Writeback_Overhead)
 *
 * Where:
 * - p = Page Fault Rate (0.0 to 1.0)
 * - q = Dirty Page Replacement Fraction (0.0 to 1.0)
 */
export function calculateEat(
  pageFaultRate: number, // 0.0 to 1.0
  ramAccessTimeNs: number,
  pageFaultServiceTimeNs: number,
  dirtyWritebackFraction = 0,
  dirtyWritebackOverheadNs = 0
): {
  eatNs: number;
  eatFormatted: string;
  normalComponentNs: number;
  faultComponentNs: number;
} {
  const p = Math.max(0, Math.min(1, pageFaultRate));
  const q = Math.max(0, Math.min(1, dirtyWritebackFraction));

  const normalComponentNs = (1 - p) * ramAccessTimeNs;
  const faultServiceWithWriteback =
    pageFaultServiceTimeNs + q * dirtyWritebackOverheadNs;
  const faultComponentNs = p * faultServiceWithWriteback;

  const eatNs = normalComponentNs + faultComponentNs;

  return {
    eatNs: Math.round(eatNs),
    eatFormatted: formatLatency(eatNs),
    normalComponentNs: Math.round(normalComponentNs),
    faultComponentNs: Math.round(faultComponentNs),
  };
}

/**
 * Parses user input specifying a virtual address and optional access type:
 * Supported formats:
 * - "0x1000:W" or "0x1000:R"
 * - "WRITE 0x1000" or "READ 0x1000"
 * - "0x1000 (W)" or "0x1000 (R)"
 * - "0x1000, WRITE" or "0x1000, READ"
 * - "0x1000" (defaults to READ)
 * - "4096" (decimal defaults to READ)
 */
export function parseVmAddress(input: string): {
  address: number | null;
  accessType: 'READ' | 'WRITE';
  error?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { address: null, accessType: 'READ', error: 'Address input cannot be empty.' };
  }

  let accessType: 'READ' | 'WRITE' = 'READ';
  let addressPart = trimmed;

  // Check prefix: "WRITE 0x1000" or "READ 0x1000"
  if (/^write\s+/i.test(trimmed)) {
    accessType = 'WRITE';
    addressPart = trimmed.replace(/^write\s+/i, '');
  } else if (/^read\s+/i.test(trimmed)) {
    accessType = 'READ';
    addressPart = trimmed.replace(/^read\s+/i, '');
  }
  // Check suffix: ":W", ":R", ", W", ", R", " (W)", " (WRITE)"
  else if (/[:,\s]\s*w(rite)?\b/i.test(trimmed) || /\(w(rite)?\)/i.test(trimmed)) {
    accessType = 'WRITE';
    addressPart = trimmed
      .replace(/[:,\s]\s*w(rite)?\b/i, '')
      .replace(/\(w(rite)?\)/i, '')
      .trim();
  } else if (/[:,\s]\s*r(ead)?\b/i.test(trimmed) || /\(r(ead)?\)/i.test(trimmed)) {
    accessType = 'READ';
    addressPart = trimmed
      .replace(/[:,\s]\s*r(ead)?\b/i, '')
      .replace(/\(r(ead)?\)/i, '')
      .trim();
  }

  // Parse address value (Hex or Decimal)
  const cleanedAddress = addressPart.trim();
  const parsed = parseStrictAddressInteger(cleanedAddress, true);

  if (parsed === null) {
    return {
      address: null,
      accessType,
      error: `Invalid address: "${cleanedAddress}". Enter a valid hex or decimal address.`,
    };
  }

  return { address: parsed, accessType };
}

export function toHex(value: number, padding = 4): string {
  if (value < 0 || isNaN(value)) return '0x0000';
  return '0x' + value.toString(16).toUpperCase().padStart(padding, '0');
}
