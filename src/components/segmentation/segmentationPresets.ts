export const SEGMENTATION_PRESETS = [
  {
    id: 'typical',
    label: 'Standard Multi-Segment',
    description: 'Sequentially accesses Code, Data, and Stack within valid bounds.',
    stream: ['(0, 500)', '(0, 1024)', '(1, 200)', '(1, 800)', '(2, 300)', '(3, 1000)'],
  },
  {
    id: 'limit_trap',
    label: 'Limit Violation (SegFault)',
    description: 'Triggers Memory Protection Traps by exceeding segment limits.',
    stream: ['(0, 500)', '(0, 4096)', '(1, 3072)', '(2, 2500)', '(3, 5000)'],
  },
  {
    id: 'invalid_seg',
    label: 'Invalid Segment Trap',
    description: 'References non-existent segment IDs to demonstrate OS hardware traps.',
    stream: ['(0, 200)', '(5, 100)', '(1, 300)', '(8, 400)', '(2, 100)'],
  },
  {
    id: 'boundary_test',
    label: 'Exact Edge Boundaries',
    description: 'Accesses offset Limit-1 (valid) and offset Limit (invalid trap).',
    stream: ['(0, 4095)', '(0, 4096)', '(1, 3071)', '(1, 3072)', '(2, 2047)', '(2, 2048)'],
  },
];
