import React from 'react';
import { RefreshCw } from 'lucide-react';
import { LabPlaceholder } from '../components/common/LabPlaceholder';

export const ReplacementPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <LabPlaceholder
      title="Page Replacement Algorithms"
      version="v0.5.0"
      targetRelease="Milestone v0.5.0"
      icon={RefreshCw}
      color="var(--color-accent-warning)"
      summary="When RAM is full and a page fault occurs, the OS must choose a victim page to evict. Compare First-In First-Out (FIFO) with Least Recently Used (LRU)."
      technicalEquations={[
        { label: 'Hit Ratio Formula', formula: 'Hit Ratio (%) = (Hits / Total Accesses) * 100' },
        { label: 'Fault Ratio Formula', formula: 'Fault Ratio (%) = (Faults / Total Accesses) * 100' },
        { label: 'FIFO Replacement Rule', formula: 'Evict page with oldest load timestamp: min(load_time)' },
        { label: 'LRU Replacement Rule', formula: 'Evict page with oldest last access timestamp: min(last_access_time)' }
      ]}
      plannedFeatures={[
        {
          title: 'Custom Reference String Input',
          description: 'Input any page access sequence (e.g., 7, 0, 1, 2, 0, 3, 0, 4, 2, 3) or pick textbook presets.'
        },
        {
          title: 'Side-by-Side Algorithm Execution',
          description: 'Simultaneously run FIFO and LRU on the identical reference sequence and compare results frame-by-frame.'
        },
        {
          title: 'Belady’s Anomaly Demonstration',
          description: 'Toggle frame counts (e.g., 3 frames vs 4 frames) to witness FIFO page faults unexpectedly increasing.'
        },
        {
          title: 'Hit/Fault Ribbon & Step Controller',
          description: 'Interactive play, pause, and step buttons with visual emerald Hit badges and crimson Fault markers.'
        }
      ]}
      onBack={onBack}
    />
  );
};
