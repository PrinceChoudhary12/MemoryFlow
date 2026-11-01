import type { PagingConfig, AddressSplitResult } from './types';

export interface PagingGeometry {
  pageSizeBytes: number;
  virtualSpaceBytes: number;
  ramSizeBytes: number;
  totalVirtualPages: number;
  totalPhysicalFrames: number;
  offsetBits: number;
  pageBits: number;
  maxVirtualAddress: number;
}

/**
 * Derives bit-widths, page counts, frame counts, and bounds from configuration
 */
export function calculateGeometry(config: PagingConfig): PagingGeometry {
  const pageSizeBytes = config.pageSizeKb * 1024;
  const virtualSpaceBytes = config.virtualSpaceKb * 1024;
  const ramSizeBytes = config.ramSizeKb * 1024;

  const totalVirtualPages = Math.floor(virtualSpaceBytes / pageSizeBytes);
  const totalPhysicalFrames = Math.floor(ramSizeBytes / pageSizeBytes);

  const offsetBits = Math.round(Math.log2(pageSizeBytes));
  const pageBits = Math.round(Math.log2(totalVirtualPages));
  const maxVirtualAddress = virtualSpaceBytes - 1;

  return {
    pageSizeBytes,
    virtualSpaceBytes,
    ramSizeBytes,
    totalVirtualPages,
    totalPhysicalFrames,
    offsetBits,
    pageBits,
    maxVirtualAddress,
  };
}

/**
 * Format helper for hexadecimal strings with leading zeros
 */
export function toHex(value: number, padding = 4): string {
  if (value < 0 || isNaN(value)) return '0x0000';
  return '0x' + value.toString(16).toUpperCase().padStart(padding, '0');
}

/**
 * Format helper for binary strings with leading zeros
 */
export function toBinary(value: number, bits = 16): string {
  if (value < 0 || isNaN(value)) return '0'.repeat(bits);
  return (value >>> 0).toString(2).padStart(bits, '0');
}

/**
 * Parses user input (decimal or hex string like "0x1A2B" or "4096")
 */
export function parseAddress(input: string): { address: number | null; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { address: null, error: 'Address cannot be empty.' };
  }

  let address: number;
  if (trimmed.toLowerCase().startsWith('0x')) {
    address = parseInt(trimmed, 16);
  } else {
    // Check if user entered hex without 0x prefix if it contains a-f
    if (/^[0-9a-fA-F]+$/.test(trimmed) && /[a-fA-F]/.test(trimmed)) {
      address = parseInt(trimmed, 16);
    } else {
      address = parseInt(trimmed, 10);
    }
  }

  if (isNaN(address)) {
    return { address: null, error: `Invalid number format: "${trimmed}".` };
  }

  if (address < 0) {
    return { address: null, error: 'Address must be a positive integer.' };
  }

  return { address };
}

/**
 * Breaks a virtual address into its Page Number (p) and Offset (d)
 */
export function splitAddress(virtualAddress: number, config: PagingConfig): AddressSplitResult {
  const geometry = calculateGeometry(config);

  if (virtualAddress < 0 || virtualAddress > geometry.maxVirtualAddress) {
    return {
      virtualAddress,
      pageNumber: 0,
      offset: 0,
      offsetBits: geometry.offsetBits,
      pageBits: geometry.pageBits,
      virtualAddressHex: toHex(virtualAddress, 4),
      offsetHex: '0x0000',
      pageNumberHex: '0x0',
      isValid: false,
      errorMessage: `Address ${virtualAddress} (0x${virtualAddress.toString(16).toUpperCase()}) exceeds virtual address space (0 - ${geometry.maxVirtualAddress}).`,
    };
  }

  const pageNumber = Math.floor(virtualAddress / geometry.pageSizeBytes);
  const offset = virtualAddress % geometry.pageSizeBytes;

  return {
    virtualAddress,
    pageNumber,
    offset,
    offsetBits: geometry.offsetBits,
    pageBits: geometry.pageBits,
    virtualAddressHex: toHex(virtualAddress, 4),
    offsetHex: toHex(offset, 3),
    pageNumberHex: toHex(pageNumber, 2),
    isValid: true,
  };
}

/**
 * Computes Physical Address = (Frame Number * Page Size) + Offset
 */
export function calculatePhysicalAddress(
  frameNumber: number,
  offset: number,
  pageSizeKb: number
): { address: number; addressHex: string } {
  const pageSizeBytes = pageSizeKb * 1024;
  const address = frameNumber * pageSizeBytes + offset;
  return {
    address,
    addressHex: toHex(address, 4),
  };
}
