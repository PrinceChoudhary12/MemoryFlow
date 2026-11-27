import type { AnalyticsSnapshot, SnapshotComparison } from './types';

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function compareSnapshotCompatibility(
  left: AnalyticsSnapshot,
  right: AnalyticsSnapshot
): SnapshotComparison {
  if (left.labId !== right.labId) {
    return {
      compatible: false,
      reason: 'Different laboratories use different metrics and cannot be compared directly.',
    };
  }
  if (stableSerialize(left.configuration) !== stableSerialize(right.configuration)) {
    return {
      compatible: false,
      reason: 'Simulation configurations differ.',
    };
  }
  if (stableSerialize(left.workload.inputs) !== stableSerialize(right.workload.inputs)) {
    return {
      compatible: false,
      reason: 'Workloads differ.',
    };
  }
  if (
    stableSerialize(left.workload.processedInputs) !==
    stableSerialize(right.workload.processedInputs)
  ) {
    return {
      compatible: false,
      reason: 'Processed workload entries differ.',
    };
  }
  if (left.workload.processedCount !== right.workload.processedCount) {
    return {
      compatible: false,
      reason: 'Different numbers of workload entries have been processed.',
    };
  }
  return {
    compatible: true,
    reason: 'Laboratory, configuration, and workload match.',
  };
}
