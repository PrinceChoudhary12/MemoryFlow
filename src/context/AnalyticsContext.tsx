import React, { useCallback, useState } from 'react';
import type { AnalyticsEngine } from '../core/analytics/buildAnalyticsSnapshot';
import type { AnalyticsSnapshotOptions } from '../core/analytics/types';
import { AnalyticsContext, type AnalyticsReports } from './AnalyticsContext';

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<AnalyticsReports>({});
  const [captureError, setCaptureError] = useState<string | null>(null);
  const captureSnapshot = useCallback(async (
    engine: AnalyticsEngine,
    options?: AnalyticsSnapshotOptions
  ) => {
    try {
      const { buildAnalyticsSnapshot } = await import('../core/analytics/buildAnalyticsSnapshot');
      const snapshot = buildAnalyticsSnapshot(engine, options);
      setReports((current) => ({ ...current, [snapshot.labId]: snapshot }));
      setCaptureError(null);
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : 'Unable to capture simulation analytics.'
      );
    }
  }, []);

  return (
    <AnalyticsContext.Provider value={{ reports, captureError, captureSnapshot }}>
      {children}
    </AnalyticsContext.Provider>
  );
};
