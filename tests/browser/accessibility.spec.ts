import { expect, test } from '@playwright/test';

const labs = [
  { navigation: 'Paging Lab', heading: /Paging Simulator/ },
  { navigation: 'Segmentation', heading: /Segmentation Simulator/ },
  { navigation: 'Virtual Memory', heading: /Virtual Memory & Demand Paging Lab/ },
  { navigation: 'Page Replacement', heading: /FIFO & LRU Page Replacement Studio/ },
  { navigation: 'Dynamic Allocation', heading: /Dynamic Memory Allocation Studio/ },
  { navigation: 'Analytics', heading: /Analytics & Benchmarks/ },
];

test('visible form fields have programmatic labels in every view', async ({ page }) => {
  await page.goto('/');
  const main = page.getByRole('main');

  for (const lab of labs) {
    const navigation = page.getByRole('navigation', { name: 'Main Navigation' });
    await navigation.getByRole('button', { name: new RegExp(`^${lab.navigation}`) }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(lab.heading);

    const unlabeledFields = await main
      .locator('input:visible, textarea:visible, select:visible')
      .evaluateAll((fields) =>
        fields
          .filter((field) => {
            const input = field as HTMLInputElement;
            return !(
              input.labels?.length ||
              input.getAttribute('aria-label') ||
              input.getAttribute('aria-labelledby')
            );
          })
          .map((field) => ({
            tag: field.tagName,
            type: field.getAttribute('type'),
            placeholder: field.getAttribute('placeholder'),
          }))
      );
    expect(unlabeledFields, `${lab.navigation} has unlabeled form fields`).toEqual([]);
  }
});

test('address validation is associated with its field and announced', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('button', { name: /^Paging Lab/ }).click();

  const address = page.getByLabel('Virtual Address Input:');
  await address.fill('');
  await page.getByRole('button', { name: 'Translate' }).click();

  await expect(page.getByRole('alert')).toHaveText('Please enter a virtual address.');
  await expect(address).toHaveAttribute('aria-invalid', 'true');
  await expect(address).toHaveAttribute('aria-describedby', 'paging-address-error');
});

test('validation feedback is associated with segmentation, replacement, and allocation fields', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Main Navigation' });

  await navigation.getByRole('button', { name: /^Segmentation/ }).click();
  await page.getByRole('button', { name: 'Add Custom Segment' }).click();
  const segmentBase = page.getByLabel('Base Address');
  await segmentBase.fill('');
  await page.getByRole('button', { name: 'Add to Table' }).click();
  await expect(page.getByRole('alert')).toContainText('safe integers');
  await expect(segmentBase).toHaveAttribute('aria-invalid', 'true');
  await expect(segmentBase).toHaveAttribute('aria-describedby', 'segment-add-error');

  await navigation.getByRole('button', { name: /^Page Replacement/ }).click();
  const references = page.getByLabel('Page Reference String:');
  await references.fill('invalid');
  await expect(references).toHaveAttribute('aria-invalid', 'true');
  await expect(references).toHaveAttribute('aria-describedby', 'replacement-validation-error');

  await navigation.getByRole('button', { name: /^Dynamic Allocation/ }).click();
  const operations = page.getByLabel('Operation Stream:');
  await operations.fill('invalid');
  await expect(operations).toHaveAttribute('aria-invalid', 'true');
  await expect(operations).toHaveAttribute('aria-describedby', 'allocation-stream-error');
});

test('simulation stepping announces state changes across all five labs', async ({ page }) => {
  await page.goto('/');
  const cases = [
    { navigation: 'Paging Lab', message: 'Paging step 1:' },
    { navigation: 'Segmentation', message: 'Segmentation step 1:' },
    { navigation: 'Virtual Memory', message: 'Virtual memory step 1:' },
    { navigation: 'Page Replacement', message: 'Replacement step 1 of' },
    { navigation: 'Dynamic Allocation', message: 'Allocation operation 1 of' },
  ];
  const navigation = page.getByRole('navigation', { name: 'Main Navigation' });
  const announcement = page.locator('.sr-only[role="status"]');

  for (const lab of cases) {
    await navigation.getByRole('button', { name: new RegExp(`^${lab.navigation}`) }).click();
    await page.getByRole('button', { name: 'Step forward' }).click();
    await expect(announcement).toContainText(lab.message);
  }
});

test('mode, speed, and preset controls expose selected state', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Main Navigation' });

  await navigation.getByRole('button', { name: /^Paging Lab/ }).click();
  await expect(page.getByRole('button', { name: 'Single Address' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '1x', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /High Locality/ })).toHaveAttribute('aria-pressed', 'true');

  await navigation.getByRole('button', { name: /^Segmentation/ }).click();
  await expect(page.getByRole('button', { name: 'Single', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Standard Multi-Segment/ })).toHaveAttribute('aria-pressed', 'true');

  await navigation.getByRole('button', { name: /^Virtual Memory/ }).click();
  await expect(page.getByRole('button', { name: 'Single', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'READ' })).toHaveAttribute('aria-pressed', 'true');

  await navigation.getByRole('button', { name: /^Page Replacement/ }).click();
  await expect(page.getByRole('group', { name: 'Allocated physical frames' }).locator('[aria-pressed="true"]')).toHaveCount(1);

  await navigation.getByRole('button', { name: /^Dynamic Allocation/ }).click();
  await expect(page.getByRole('group', { name: 'Minimum leftover hole threshold' }).locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('main [aria-pressed="true"]')).not.toHaveCount(0);
});

test('keyboard focus is visible and the theme popover restores focus on Escape', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const firstHeaderButton = page.locator('header').getByRole('button').first();
  await expect(firstHeaderButton).toBeFocused();
  const focusOutline = await firstHeaderButton.evaluate((button) => {
    const style = getComputedStyle(button);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(focusOutline.style).not.toBe('none');
  expect(parseFloat(focusOutline.width)).toBeGreaterThan(0);

  const themeButton = page.getByRole('button', { name: 'Switch visual theme' });
  await themeButton.focus();
  await page.keyboard.press('Enter');
  await expect(themeButton).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(themeButton).toHaveAttribute('aria-expanded', 'false');
  await expect(themeButton).toBeFocused();
});

test('theme text and action colors meet WCAG AA contrast', async ({ page }) => {
  await page.goto('/');
  const themeButton = page.getByRole('button', { name: 'Switch visual theme' });

  for (const theme of ['Midnight', 'Light Paper', 'Graphite', 'Aurora']) {
    await themeButton.click();
    await page.getByRole('button', { name: new RegExp(`^${theme}`) }).click();
    const ratios = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const read = (name: string) => style.getPropertyValue(name).trim();
      const colors = {
        base: read('--color-bg-base'),
        surface: read('--color-bg-surface'),
        main: read('--color-text-main'),
        muted: read('--color-text-muted'),
        subtle: read('--color-text-subtle'),
        accent: read('--color-accent-primary'),
        accentContrast: read('--color-accent-contrast'),
        success: read('--color-status-success'),
        warning: read('--color-status-warning'),
        danger: read('--color-status-danger'),
        info: read('--color-status-info'),
        statusAccent: read('--color-status-accent'),
      };
      const luminance = (hex: string) => {
        const channels = hex.match(/[0-9a-f]{2}/gi)?.map((channel) => parseInt(channel, 16) / 255);
        if (!channels || channels.length !== 3) throw new Error(`Invalid theme color: ${hex}`);
        const linear = channels.map((channel) =>
          channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        );
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
      };
      const contrast = (foreground: string, background: string) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      const mappings = [
        ['text-emerald-400', '--color-status-success'],
        ['text-amber-400', '--color-status-warning'],
        ['text-rose-400', '--color-status-danger'],
        ['text-blue-400', '--color-status-info'],
        ['text-purple-400', '--color-status-accent'],
      ] as const;
      const statusUtilities = mappings.map(([className, token]) => {
        const element = document.createElement('span');
        element.className = className;
        document.body.append(element);
        const actual = getComputedStyle(element).color;
        element.style.color = `var(${token})`;
        const expected = getComputedStyle(element).color;
        element.remove();
        return { className, actual, expected };
      });
      return {
        mainOnBase: contrast(colors.main, colors.base),
        mutedOnSurface: contrast(colors.muted, colors.surface),
        subtleOnSurface: contrast(colors.subtle, colors.surface),
        accentOnSurface: contrast(colors.accent, colors.surface),
        accentContrast: contrast(colors.accentContrast, colors.accent),
        statusOnSurface: [
          contrast(colors.success, colors.surface),
          contrast(colors.warning, colors.surface),
          contrast(colors.danger, colors.surface),
          contrast(colors.info, colors.surface),
          contrast(colors.statusAccent, colors.surface),
        ],
        statusUtilities,
      };
    });

    expect(ratios.mainOnBase, `${theme}: main text`).toBeGreaterThanOrEqual(4.5);
    expect(ratios.mutedOnSurface, `${theme}: muted text`).toBeGreaterThanOrEqual(4.5);
    expect(ratios.subtleOnSurface, `${theme}: subtle text`).toBeGreaterThanOrEqual(4.5);
    expect(ratios.accentOnSurface, `${theme}: accent text`).toBeGreaterThanOrEqual(4.5);
    expect(ratios.accentContrast, `${theme}: accent button text`).toBeGreaterThanOrEqual(4.5);
    for (const [index, ratio] of ratios.statusOnSurface.entries()) {
      expect(ratio, `${theme}: status color ${index + 1}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const mapping of ratios.statusUtilities) {
      expect(mapping.actual, `${theme}: ${mapping.className}`).toBe(mapping.expected);
    }
  }
});

test('print media exposes all analytics reports and grayscale outlined bars', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('button', { name: /^Analytics/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Analytics & Benchmarks/);
  await page.emulateMedia({ media: 'print' });

  const report = page.getByRole('region', { name: 'Printable analytics report' });
  await expect(report).toBeVisible();
  await expect(report.locator('h2')).toHaveCount(5);
  for (const lab of ['Paging', 'Segmentation', 'Virtual Memory', 'FIFO / LRU Page Replacement', 'Dynamic Memory Allocation']) {
    await expect(report.locator('h2', { hasText: lab }).first()).toBeVisible();
  }
  const barMarks = report.locator('svg.analytics-print-chart-bars rect[stroke="#111827"]');
  const trackOutlines = report.locator('svg.analytics-print-chart-bars rect[stroke="#9ca3af"]');
  await expect(trackOutlines).toHaveCount(23);
  await expect(barMarks).toHaveCount(16);
  await expect(report.locator('.analytics-print-table caption')).toHaveCount(5);
  await expect(report.locator('h3', { hasText: 'Configuration' })).toHaveCount(5);
  await expect(report.locator('h3', { hasText: 'Workload' })).toHaveCount(5);
  const historyHeadings = await report.locator('h3').filter({ hasText: 'Simulation history' }).allTextContents();
  const historyEvents = historyHeadings.reduce((total, heading) => {
    const count = heading.match(/\((\d+) events?\)/)?.[1];
    return total + Number(count ?? 0);
  }, 0);
  expect(historyEvents).toBe(42);
  const chartStyle = await report.locator('svg.analytics-print-chart-bars').first().evaluate((chart) => {
    const style = getComputedStyle(chart);
    return { filter: style.filter, width: style.width };
  });
  expect(chartStyle.filter).toBe('grayscale(1)');
  expect(chartStyle.width).not.toBe('0px');
});
