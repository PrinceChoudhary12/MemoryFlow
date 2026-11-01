import React from 'react';
import { Layers } from 'lucide-react';
import { LabPlaceholder } from '../components/common/LabPlaceholder';

export const PagingPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <LabPlaceholder
      title="Paging Simulator"
      version="v0.2.0"
      targetRelease="Next Milestone"
      icon={Layers}
      color="var(--color-accent-primary)"
      summary="Paging divides logical memory into fixed-size blocks (Pages) and physical RAM into matching slots (Frames), eliminating external fragmentation."
      technicalEquations={[
        { label: 'Page Number Calculation', formula: 'Page (p) = floor(Logical Address / Page Size)' },
        { label: 'Offset Calculation', formula: 'Offset (d) = Logical Address mod Page Size' },
        { label: 'Physical Address Translation', formula: 'Physical Address = (Frame Number * Frame Size) + Offset' },
        { label: 'Internal Fragmentation', formula: 'Wasted Bytes = Page Size - (Process Size mod Page Size)' }
      ]}
      plannedFeatures={[
        {
          title: 'Interactive Memory Inputs',
          description: 'Configure total RAM size, page/frame size (1 KB to 16 KB), and create custom processes with distinct memory demands.'
        },
        {
          title: 'Dynamic Page Table Matrix',
          description: 'Live table showing valid/invalid bits, frame indices, and dirty bits for every allocated page.'
        },
        {
          title: 'Animated Address Translation Flow',
          description: 'Enter any logical address and watch the visual pulse flow through CPU registers, page table indexing, and final RAM frame highlight.'
        },
        {
          title: 'Color-Coded RAM Frame Grid',
          description: 'Tactile physical memory grid showing real-time occupancy, free frame lists, and process ownership.'
        }
      ]}
      onBack={onBack}
    />
  );
};
