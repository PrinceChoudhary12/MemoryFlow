export const VM_PRESETS = [
  {
    id: 'locality',
    label: 'Temporal Locality (Hits)',
    description: 'Cold page faults followed by repeated hits on cached pages.',
    stream: ['0x0000:R', '0x1000:R', '0x0050:R', '0x1020:R', '0x00A0:R', '0x1040:R'],
  },
  {
    id: 'dirty_writeback',
    label: 'Dirty Page Writeback',
    description: 'Modifies pages (WRITE); evicting dirty pages writes them back to disk.',
    stream: ['0x0000:W', '0x1000:W', '0x2000:R', '0x3000:R', '0x4000:R', '0x5000:R'],
  },
  {
    id: 'thrashing',
    label: 'Memory Thrashing (Full RAM)',
    description: 'Cycles through 6 unique pages in 4 frames, causing continuous page faults.',
    stream: ['0x0000', '0x1000', '0x2000', '0x3000', '0x4000', '0x5000', '0x0000', '0x1000'],
  },
  {
    id: 'eat_impact',
    label: 'EAT Latency Benchmark',
    description: 'Demonstrates dramatic memory access slowdown from 100 ns into milliseconds.',
    stream: ['0x1000:R', '0x2000:W', '0x1040:R', '0x3000:W', '0x4000:R', '0x5000:W'],
  },
];
