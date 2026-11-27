/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalyticsPage } from '../pages/AnalyticsPage';

describe('printable analytics charts', () => {
  it('renders vector bars with visible outlines and textual chart values', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalyticsPage, { reports: {}, captureError: null })
    );

    expect(markup).toContain('analytics-print-chart-bars');
    expect(markup).toContain('stroke="#111827"');
    expect(markup).toContain('Paging access outcomes bar chart. Hits:');
    expect(markup).toContain('Invalid addresses');
  });

  it('keeps the unused print-page area white', () => {
    const printStyles = readFileSync(new URL('../pages/AnalyticsPage.css', import.meta.url), 'utf8');
    expect(printStyles).toMatch(/html,\s*body\s*\{\s*background:\s*#ffffff\s*!important;\s*\}/);
    expect(printStyles).toContain('filter: grayscale(1)');
  });
});
