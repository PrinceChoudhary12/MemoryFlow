import { expect, test } from '@playwright/test';

test('records local startup and Analytics readiness timings', async ({ page }) => {
  await page.goto('/');
  const navigationTiming = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      responseStartMs: navigation.responseStart,
      domContentLoadedMs: navigation.domContentLoadedEventEnd,
      loadCompleteMs: navigation.loadEventEnd,
    };
  });

  const analyticsStart = await page.evaluate(() => performance.now());
  await page.getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('button', { name: /^Analytics/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Analytics & Benchmarks/);
  await expect(page.getByText('Available reports (5)')).toBeVisible();
  await expect(page.locator('.analytics-page .recharts-wrapper').first()).toBeVisible();
  const analyticsReadyMs = await page.evaluate((start) => performance.now() - start, analyticsStart);

  const measurements = { ...navigationTiming, analyticsReadyMs };
  console.log(`PERFORMANCE_BASELINE ${JSON.stringify(measurements)}`);
  await test.info().attach('performance-baseline.json', {
    body: JSON.stringify(measurements, null, 2),
    contentType: 'application/json',
  });

  for (const value of Object.values(measurements)) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
  }
});
