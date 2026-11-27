import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsChartGroup } from '../../core/analytics/types';

interface AnalyticsBarChartProps {
  chart: AnalyticsChartGroup;
}

export const AnalyticsBarChart: React.FC<AnalyticsBarChartProps> = ({ chart }) => (
  <section className="analytics-print-chart rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-[var(--color-text-main)]">{chart.title}</h3>
      <p className="text-[11px] text-[var(--color-text-subtle)]">Measured in {chart.unit}</p>
    </div>
    <div className="h-64 min-w-0" role="img" aria-label={`${chart.title} bar chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.series} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
          <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            interval={0}
            tickFormatter={(value: string) =>
              value
                .replace('Invalid addresses', 'Invalid')
                .replace('Valid translations', 'Successes')
                .replace('Segmentation faults', 'Seg faults')
                .replace('Dirty writebacks', 'Writebacks')
                .replace('First-Fit', 'FF')
                .replace('Best-Fit', 'BF')
                .replace('Worst-Fit', 'WF')
            }
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--color-border-medium)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-bg-muted)' }}
            contentStyle={{
              backgroundColor: 'var(--color-bg-surface-elevated)',
              border: '1px solid var(--color-border-medium)',
              borderRadius: 8,
              color: 'var(--color-text-main)',
            }}
            formatter={(value) => [`${value} ${chart.unit}`, 'Value']}
          />
          <Bar dataKey="value" radius={[5, 5, 0, 0]}>
            {chart.series.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <ul className="sr-only" aria-label={`${chart.title} values`}>
      {chart.series.map((entry) => (
        <li key={entry.label}>{entry.label}: {entry.value} {chart.unit}</li>
      ))}
    </ul>
  </section>
);
