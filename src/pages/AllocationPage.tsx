import React from 'react';
import { Maximize2 } from 'lucide-react';
import { LabPlaceholder } from '../components/common/LabPlaceholder';

export const AllocationPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <LabPlaceholder
      title="Dynamic Memory Allocation"
      version="v0.6.0"
      targetRelease="Milestone v0.6.0"
      icon={Maximize2}
      color="var(--color-accent-danger)"
      summary="Contiguous memory allocation techniques for fitting variable-sized processes into free memory partitions (holes). Compare First-Fit, Best-Fit, and Worst-Fit."
      technicalEquations={[
        { label: 'First-Fit Rule', formula: 'Allocate the FIRST hole that is big enough (fastest search)' },
        { label: 'Best-Fit Rule', formula: 'Allocate the SMALLEST hole that is big enough (leaves smallest leftover)' },
        { label: 'Worst-Fit Rule', formula: 'Allocate the LARGEST hole (produces largest leftover hole)' },
        { label: '50% Rule (Knuth)', formula: 'If N allocated blocks, on average 0.5N blocks lost to fragmentation' }
      ]}
      plannedFeatures={[
        {
          title: 'Memory Block Manager',
          description: 'Define custom memory partitions and submit process requests of variable sizes.'
        },
        {
          title: 'Live Three-Way Strategy Comparison',
          description: 'Visualize First Fit vs Best Fit vs Worst Fit side-by-side on identical memory states.'
        },
        {
          title: 'Dynamic Deallocation & Coalescing',
          description: 'Free allocated processes and watch adjacent free holes automatically merge into unified larger partitions.'
        },
        {
          title: 'Fragmentation Telemetry',
          description: 'Real-time calculation of total free space vs usable contiguous memory to quantify external fragmentation.'
        }
      ]}
      onBack={onBack}
    />
  );
};
