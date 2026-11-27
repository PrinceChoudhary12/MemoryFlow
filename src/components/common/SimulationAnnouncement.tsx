import React from 'react';

interface SimulationAnnouncementProps {
  message: string;
}

export const SimulationAnnouncement: React.FC<SimulationAnnouncementProps> = ({ message }) => (
  <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
    {message}
  </p>
);
