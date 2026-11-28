import type {
  Segment,
  SegmentTranslationStep,
  PhysicalMemoryBlock,
} from './types';
import { parseStrictAddressInteger } from '../addressParsing';

export function toHex(value: number, padding = 4): string {
  if (value < 0 || isNaN(value)) return '0x0000';
  return '0x' + value.toString(16).toUpperCase().padStart(padding, '0');
}

/**
 * Parses user input into Segment ID and Offset.
 * Supported formats:
 * - "(0, 450)" or "[0, 450]"
 * - "0, 450" or "0: 450"
 * - "s=0, d=450" or "s=0, d=0x1C2"
 */
export function parseLogicalAddress(input: string): {
  segmentId: number | null;
  offset: number | null;
  error?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { segmentId: null, offset: null, error: 'Address input cannot be empty.' };
  }

  let cleaned = trimmed;
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    cleaned = trimmed.slice(1, -1).trim();
  } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    cleaned = trimmed.slice(1, -1).trim();
  } else if (
    trimmed.startsWith('(') ||
    trimmed.startsWith('[') ||
    trimmed.endsWith(')') ||
    trimmed.endsWith(']')
  ) {
    return { segmentId: null, offset: null, error: 'Mismatched address brackets.' };
  }

  const prefixed = cleaned.match(/^s\s*=\s*([^,\s]+)\s*,\s*d\s*=\s*(\S+)$/i);
  const pair = cleaned.match(/^([^,\s:]+)\s*(,|:|\s)\s*([^,\s:]+)$/);
  const parts = prefixed ? [prefixed[1], prefixed[2]] : pair ? [pair[1], pair[3]] : null;

  if (parts) {
    const segmentId = parseStrictAddressInteger(parts[0]);
    const offset = parseStrictAddressInteger(parts[1]);
    if (segmentId === null) {
      return { segmentId: null, offset: null, error: `Invalid Segment ID: "${parts[0]}".` };
    }
    if (offset === null) {
      return { segmentId: null, offset: null, error: `Invalid Offset: "${parts[1]}".` };
    }
    return { segmentId, offset };
  }

  return {
    segmentId: null,
    offset: null,
    error: `Invalid address format. Expected "(segment, offset)", e.g. "(0, 500)".`,
  };
}

/**
 * Parses a sequence of logical addresses from stream input text.
 * Handles:
 * - Parentheses/bracket format: "(0, 500), (1, 1024), (2, 300)" -> ["(0, 500)", "(1, 1024)", "(2, 300)"]
 * - Semicolon or newline separated: "0, 500; 1, 1024; 2, 300"
 * - Prefix format: "s=0, d=500; s=1, d=1024"
 * - Colon format: "0:500, 1:1024"
 */
export function parseAddressStream(streamText: string): string[] {
  const trimmed = streamText.trim();
  if (!trimmed) return [];

  // 1. Match bracketed/parenthesized tokens: (s, d) or [s, d]
  const bracketMatches = trimmed.match(/\([^)\n\r]+\)|\x5B[^\x5D\n\r]+\x5D/g);
  if (bracketMatches && bracketMatches.length > 0) {
    return bracketMatches.map((m) => m.trim());
  }

  // 2. Semicolon or newline separated
  if (trimmed.includes(';') || trimmed.includes('\n')) {
    return trimmed
      .split(/[;\n\r]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // 3. Colon separated pairs like "0:500, 1:1024"
  if (trimmed.includes(':')) {
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // 4. Prefix format like "s=0, d=500, s=1, d=1024"
  const sdMatches = trimmed.match(/s\s*=\s*[0-9a-fA-FxX]+\s*,\s*d\s*=\s*[0-9a-fA-FxX]+/gi);
  if (sdMatches && sdMatches.length > 0) {
    return sdMatches.map((m) => m.trim());
  }

  // 5. Fallback: if user enters raw comma-separated pairs like "0, 500, 1, 1024"
  const numParts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  if (numParts.length >= 2 && numParts.length % 2 === 0) {
    const pairs: string[] = [];
    for (let i = 0; i < numParts.length; i += 2) {
      pairs.push(`(${numParts[i]}, ${numParts[i + 1]})`);
    }
    return pairs;
  }

  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Validates logical address against segment descriptor table and calculates physical address
 */
export function translateSegmentAddress(
  segmentId: number,
  offset: number,
  segments: Segment[],
  ramSizeBytes: number,
  stepNumber: number,
  rawInput: string
): SegmentTranslationStep {
  const timestamp = Date.now();
  const invalidNumericArguments: string[] = [];
  if (!Number.isSafeInteger(segmentId) || segmentId < 0) invalidNumericArguments.push('segment ID');
  if (!Number.isSafeInteger(offset) || offset < 0) invalidNumericArguments.push('offset');
  if (!Number.isSafeInteger(ramSizeBytes) || ramSizeBytes <= 0) invalidNumericArguments.push('RAM size');
  if (!Number.isSafeInteger(stepNumber) || stepNumber <= 0) invalidNumericArguments.push('step number');

  if (invalidNumericArguments.length > 0) {
    return {
      stepNumber,
      rawInput,
      segmentId,
      segmentName: 'Invalid',
      offset,
      base: null,
      limit: null,
      physicalAddress: null,
      physicalAddressHex: null,
      status: 'INVALID_INPUT',
      explanation: `Invalid numeric ${invalidNumericArguments.join(', ')}. Address values and RAM size must be safe integers within their valid ranges.`,
      timestamp,
    };
  }

  const segment = segments.find((s) => s.id === segmentId && s.isValid);

  // Check 1: Segment exists in Segment Table
  if (!segment) {
    return {
      stepNumber,
      rawInput,
      segmentId,
      segmentName: 'Unknown',
      offset,
      base: null,
      limit: null,
      physicalAddress: null,
      physicalAddressHex: null,
      status: 'FAULT_INVALID_SEGMENT',
      explanation: `SEGMENTATION FAULT (Invalid Segment): Segment ${segmentId} does not exist in the active Segment Table. CPU hardware interrupt triggered.`,
      timestamp,
    };
  }

  const segmentEnd = segment.base + segment.limit;
  if (
    !Number.isSafeInteger(segment.base) ||
    !Number.isSafeInteger(segment.limit) ||
    segment.base < 0 ||
    segment.limit <= 0 ||
    !Number.isSafeInteger(segmentEnd) ||
    segmentEnd > ramSizeBytes
  ) {
    return {
      stepNumber,
      rawInput,
      segmentId,
      segmentName: segment.name,
      offset,
      base: segment.base,
      limit: segment.limit,
      physicalAddress: null,
      physicalAddressHex: null,
      status: 'INVALID_INPUT',
      explanation: `Segment "${segment.name}" has an invalid or out-of-RAM range.`,
      timestamp,
    };
  }

  // Check 2: Boundary validation (Memory Protection: 0 <= Offset < Limit)
  if (offset >= segment.limit) {
    return {
      stepNumber,
      rawInput,
      segmentId,
      segmentName: segment.name,
      offset,
      base: segment.base,
      limit: segment.limit,
      physicalAddress: null,
      physicalAddressHex: null,
      status: 'FAULT_LIMIT_EXCEEDED',
      explanation: `SEGMENTATION FAULT (Limit Exceeded): Offset ${offset} (0x${offset.toString(16).toUpperCase()}) is >= Segment Limit ${segment.limit} (0x${segment.limit.toString(16).toUpperCase()}) for "${segment.name}". Memory protection trap triggered!`,
      timestamp,
    };
  }

  // Check 3: Physical address computation
  const physicalAddress = segment.base + offset;

  if (physicalAddress >= ramSizeBytes) {
    return {
      stepNumber,
      rawInput,
      segmentId,
      segmentName: segment.name,
      offset,
      base: segment.base,
      limit: segment.limit,
      physicalAddress,
      physicalAddressHex: toHex(physicalAddress, 4),
      status: 'FAULT_LIMIT_EXCEEDED',
      explanation: `SEGMENTATION FAULT: Computed physical address ${physicalAddress} exceeds hardware RAM boundary (${ramSizeBytes} bytes).`,
      timestamp,
    };
  }

  return {
    stepNumber,
    rawInput,
    segmentId,
    segmentName: segment.name,
    offset,
    base: segment.base,
    limit: segment.limit,
    physicalAddress,
    physicalAddressHex: toHex(physicalAddress, 4),
    status: 'VALID_TRANSLATION',
    explanation: `VALID TRANSLATION: Segment ${segmentId} ("${segment.name}") base ${segment.base} (${toHex(segment.base, 4)}) + offset ${offset} = Physical Address ${physicalAddress} (${toHex(physicalAddress, 4)}).`,
    timestamp,
  };
}

/**
 * Builds chronological physical memory allocation map with segments and free holes
 */
export function buildMemoryMap(
  segments: Segment[],
  ramSizeBytes: number
): PhysicalMemoryBlock[] {
  if (!Number.isSafeInteger(ramSizeBytes) || ramSizeBytes <= 0) {
    throw new RangeError('RAM size must be a positive safe integer.');
  }

  // Sort valid segments by base address
  const activeSegments = segments
    .filter((s) => s.isValid)
    .sort((a, b) => a.base - b.base);

  const blocks: PhysicalMemoryBlock[] = [];
  let currentPtr = 0;

  for (const seg of activeSegments) {
    const endExclusive = seg.base + seg.limit;
    if (
      !Number.isSafeInteger(seg.base) ||
      !Number.isSafeInteger(seg.limit) ||
      seg.base < 0 ||
      seg.limit <= 0 ||
      !Number.isSafeInteger(endExclusive) ||
      endExclusive > ramSizeBytes ||
      seg.base < currentPtr
    ) {
      throw new RangeError(`Segment "${seg.name}" has an invalid or overlapping RAM range.`);
    }

    if (seg.base > currentPtr) {
      // Free hole before this segment
      blocks.push({
        startAddress: currentPtr,
        endAddress: seg.base - 1,
        size: seg.base - currentPtr,
        isAllocated: false,
        segmentId: null,
        segmentName: null,
      });
    }

    // Segment block
    const segEnd = seg.base + seg.limit - 1;
    blocks.push({
      startAddress: seg.base,
      endAddress: segEnd,
      size: seg.limit,
      isAllocated: true,
      segmentId: seg.id,
      segmentName: seg.name,
      color: seg.color,
    });

    currentPtr = segEnd + 1;
  }

  // Remaining free space at the end of RAM
  if (currentPtr < ramSizeBytes) {
    blocks.push({
      startAddress: currentPtr,
      endAddress: ramSizeBytes - 1,
      size: ramSizeBytes - currentPtr,
      isAllocated: false,
      segmentId: null,
      segmentName: null,
    });
  }

  return blocks;
}
