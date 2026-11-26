import type {
  Segment,
  SegmentTranslationStep,
  PhysicalMemoryBlock,
} from './types';

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

  // Strip parentheses and brackets
  const cleaned = trimmed.replace(/^[(\[]|[)\]]$/g, '').trim();

  // Handle s=X, d=Y format
  if (cleaned.includes('s=') || cleaned.includes('d=')) {
    const sMatch = cleaned.match(/s\s*=\s*([0-9a-fA-FxX]+)/i);
    const dMatch = cleaned.match(/d\s*=\s*([0-9a-fA-FxX]+)/i);
    if (sMatch && dMatch) {
      const s = parseInt(sMatch[1], sMatch[1].startsWith('0x') ? 16 : 10);
      const d = parseInt(dMatch[1], dMatch[1].startsWith('0x') ? 16 : 10);
      if (!isNaN(s) && !isNaN(d)) {
        return { segmentId: s, offset: d };
      }
    }
  }

  // Handle delimiter: comma, colon, or whitespace
  const parts = cleaned.split(/[,:]|\s+/).filter(Boolean);
  if (parts.length === 2) {
    const sPart = parts[0].trim();
    const dPart = parts[1].trim();

    const segmentId = sPart.startsWith('0x') ? parseInt(sPart, 16) : parseInt(sPart, 10);
    const offset = dPart.startsWith('0x') ? parseInt(dPart, 16) : parseInt(dPart, 10);

    if (isNaN(segmentId)) {
      return { segmentId: null, offset: null, error: `Invalid Segment ID: "${sPart}".` };
    }
    if (isNaN(offset)) {
      return { segmentId: null, offset: null, error: `Invalid Offset: "${dPart}".` };
    }
    if (segmentId < 0 || offset < 0) {
      return { segmentId: null, offset: null, error: 'Segment ID and Offset must be non-negative.' };
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
  const bracketMatches = trimmed.match(/[(\[][^)\n\r\]]+[)\]]/g);
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
  // Sort valid segments by base address
  const activeSegments = segments
    .filter((s) => s.isValid)
    .sort((a, b) => a.base - b.base);

  const blocks: PhysicalMemoryBlock[] = [];
  let currentPtr = 0;

  for (const seg of activeSegments) {
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
