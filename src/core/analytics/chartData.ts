import type {
  AnalyticsChartGroup,
  AnalyticsSnapshot,
  AllocationAnalyticsSnapshot,
} from './types';

const COLORS = {
  primary: 'var(--color-accent-primary)',
  secondary: 'var(--color-accent-secondary)',
  tertiary: 'var(--color-accent-tertiary)',
  warning: 'var(--color-accent-warning)',
  danger: 'var(--color-accent-danger)',
};

function group(
  id: string,
  title: string,
  unit: string,
  values: { label: string; value: number; color: string }[]
): AnalyticsChartGroup {
  return { id, title, unit, series: values };
}

function allocationChartGroups(
  snapshot: AllocationAnalyticsSnapshot
): AnalyticsChartGroup[] {
  const strategies = [
    { key: 'FIRST_FIT', label: 'First-Fit', color: COLORS.primary },
    { key: 'BEST_FIT', label: 'Best-Fit', color: COLORS.secondary },
    { key: 'WORST_FIT', label: 'Worst-Fit', color: COLORS.tertiary },
  ] as const;
  return [
    group('utilization', 'User-pool utilization', '%', strategies.map(({ key, label, color }) => ({
      label,
      value: snapshot.metrics[key].utilizationPercent,
      color,
    }))),
    group('fragmentation', 'Internal and external fragmentation', 'KB', strategies.flatMap(({ key, label, color }) => [
      { label: `${label} internal`, value: snapshot.metrics[key].internalFragmentationKb, color },
      { label: `${label} external`, value: snapshot.metrics[key].externalFragmentationKb, color },
    ])),
  ];
}

export function prepareChartGroups(snapshot: AnalyticsSnapshot): AnalyticsChartGroup[] {
  switch (snapshot.labId) {
    case 'paging':
      return [
        group('access-outcomes', 'Paging access outcomes', 'accesses', [
          { label: 'Hits', value: snapshot.metrics.hits, color: COLORS.tertiary },
          { label: 'Page faults', value: snapshot.metrics.faults, color: COLORS.warning },
          { label: 'Invalid addresses', value: snapshot.metrics.invalidAddresses, color: COLORS.danger },
        ]),
      ];
    case 'segmentation':
      return [
        group('translation-outcomes', 'Segmentation translation outcomes', 'references', [
          { label: 'Valid translations', value: snapshot.metrics.validTranslations, color: COLORS.tertiary },
          { label: 'Segmentation faults', value: snapshot.metrics.segmentationFaults, color: COLORS.warning },
          { label: 'Invalid inputs', value: snapshot.metrics.invalidInputs, color: COLORS.danger },
        ]),
      ];
    case 'virtual-memory':
      return [
        group('virtual-memory-outcomes', 'Virtual-memory events', 'events', [
          { label: 'Hits', value: snapshot.metrics.hits, color: COLORS.tertiary },
          { label: 'Page faults', value: snapshot.metrics.pageFaults, color: COLORS.warning },
          { label: 'Dirty writebacks', value: snapshot.metrics.dirtyWritebacks, color: COLORS.danger },
          { label: 'Invalid addresses', value: snapshot.metrics.invalidAddresses, color: COLORS.danger },
        ]),
      ];
    case 'replacement':
      return [
        group('replacement-faults', 'Page faults by algorithm', 'faults', [
          { label: 'FIFO', value: snapshot.metrics.fifo.faults, color: COLORS.primary },
          { label: 'LRU', value: snapshot.metrics.lru.faults, color: COLORS.secondary },
        ]),
        group('replacement-hits', 'Page hits by algorithm', 'hits', [
          { label: 'FIFO', value: snapshot.metrics.fifo.hits, color: COLORS.primary },
          { label: 'LRU', value: snapshot.metrics.lru.hits, color: COLORS.secondary },
        ]),
      ];
    case 'allocation':
      return allocationChartGroups(snapshot);
  }
}
