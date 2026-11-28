export const PAGING_PRESETS = [
  {
    id: 'locality',
    label: 'High Locality (Hits)',
    description: 'Loops across pages 1 and 2 to demonstrate repeated Page Hits.',
    stream: ['0x1000', '0x1040', '0x2000', '0x1080', '0x2040', '0x10C0', '0x2080'],
  },
  {
    id: 'sequential',
    label: 'Sequential Sweeps (Faults)',
    description: 'Sequentially accesses distinct pages to demonstrate demand paging and frame allocation.',
    stream: ['0x0000', '0x1000', '0x2000', '0x3000', '0x4000', '0x5000', '0x6000', '0x7000'],
  },
  {
    id: 'saturation',
    label: 'Memory Saturation (Full)',
    description: 'References 9 distinct pages into 8 frames to trigger and demonstrate the FAULT_MEMORY_FULL event.',
    stream: ['0x0000', '0x1000', '0x2000', '0x3000', '0x4000', '0x5000', '0x6000', '0x7000', '0x8000'],
  },
  {
    id: 'boundaries',
    label: 'Page Edge Boundaries',
    description: 'Tests address translations right at 4095 and 4096 byte thresholds.',
    stream: ['4095', '4096', '8191', '8192', '12287', '12288'],
  },
];
