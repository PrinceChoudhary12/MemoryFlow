import { createContext, useContext } from 'react';
import type {
  AnalyticsLabId,
  AnalyticsSnapshot,
  AnalyticsSnapshotOptions,
} from '../core/analytics/types';
import type { AnalyticsEngine } from '../core/analytics/buildAnalyticsSnapshot';

export type AnalyticsReports = Partial<Record<AnalyticsLabId, AnalyticsSnapshot>>;

export interface AnalyticsContextValue {
  reports: AnalyticsReports;
  captureError: string | null;
  captureSnapshot: (engine: AnalyticsEngine, options?: AnalyticsSnapshotOptions) => Promise<void>;
}

export const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
