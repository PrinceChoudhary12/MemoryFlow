import React from 'react';
import { Split } from 'lucide-react';
import { LabPlaceholder } from '../components/common/LabPlaceholder';

export const SegmentationPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <LabPlaceholder
      title="Segmentation Simulator"
      version="v0.3.0"
      targetRelease="Milestone v0.3.0"
      icon={Split}
      color="var(--color-accent-secondary)"
      summary="Segmentation reflects the programmer's logical view of memory by allocating variable-sized blocks for Code, Data, Stack, and Heap with hardware Base & Limit protection."
      technicalEquations={[
        { label: 'Address Tuple', formula: 'Logical Address = <Segment Number (s), Offset (d)>' },
        { label: 'Boundary Validation Check', formula: 'Valid If: 0 <= Offset < Limit [Otherwise: TRAP (Memory Violation)]' },
        { label: 'Physical Base Addition', formula: 'Physical Address = Base Address + Offset' }
      ]}
      plannedFeatures={[
        {
          title: 'Segment Descriptor Table',
          description: 'Inspect Base and Limit registers for code, data, stack, and heap segments.'
        },
        {
          title: 'Memory Protection Violation Trap',
          description: 'Demonstrate hardware memory access violations with alert triggers when an offset exceeds the segment limit.'
        },
        {
          title: 'Dynamic Non-Contiguous Allocation',
          description: 'Visualize how segments are scattered across physical RAM without requiring contiguous placement.'
        },
        {
          title: 'External Fragmentation Analyzer',
          description: 'Observe how variable-sized segments leave unusable small gaps between allocated memory partitions.'
        }
      ]}
      onBack={onBack}
    />
  );
};
