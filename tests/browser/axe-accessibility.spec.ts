import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const labs = [
  'Paging Lab',
  'Segmentation',
  'Virtual Memory',
  'Page Replacement',
  'Dynamic Allocation',
  'Analytics',
];

test('audit all six application views for WCAG A/AA violations', async ({ page }) => {
  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: 'Main Navigation' });
  const allViolations: Array<{
    lab: string;
    id: string;
    impact: string | undefined;
    target: string[][];
    summary: string | undefined;
  }> = [];

  for (const lab of labs) {
    await navigation.getByRole('button', { name: new RegExp(`^${lab}`) }).click();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        allViolations.push({
          lab,
          id: violation.id,
          impact: violation.impact,
          target: node.target,
          summary: node.failureSummary,
        });
      }
    }
  }

  console.log('ALL ACCESSIBILITY VIOLATIONS:', JSON.stringify(allViolations, null, 2));
  expect(allViolations, 'Accessibility violations across all six labs').toEqual([]);
});
