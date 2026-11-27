import { expect, test } from '@playwright/test';

const viewports = [320, 390, 768, 1024, 1440];

const views = [
  {
    navigation: 'Studio Overview',
    heading: /Dynamic Memory Management\s+Visualizer & Laboratory/,
  },
  {
    navigation: 'Paging Lab',
    heading: /Paging Simulator & Address Translation Lab/,
  },
  {
    navigation: 'Segmentation',
    heading: /Segmentation Simulator & Memory Protection Lab/,
  },
  {
    navigation: 'Virtual Memory',
    heading: /Virtual Memory & Demand Paging Lab/,
  },
  {
    navigation: 'Page Replacement',
    heading: /FIFO & LRU Page Replacement Studio/,
  },
  {
    navigation: 'Dynamic Allocation',
    heading: /Dynamic Memory Allocation Studio/,
  },
  {
    navigation: 'Analytics',
    heading: /Analytics & Benchmarks/,
  },
];

for (const width of viewports) {
  test(`all application views fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    const navigationName =
      width >= 1024 ? 'Main Navigation' : 'Mobile Navigation';
    const main = page.getByRole('main');

    for (const view of views) {
      if (view.navigation !== 'Studio Overview') {
        const navigation = page.getByRole('navigation', {
          name: navigationName,
        });
        const button = navigation.getByRole('button', {
          name: new RegExp(`^${view.navigation}`),
        });
        await button.click();
        await expect(button).toHaveAttribute('aria-current', 'page');
      }

      await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(
        main.getByRole('heading', { level: 1 })
      ).toHaveText(view.heading);

      if (view.navigation === 'Segmentation') {
        const tableRegion = main.getByRole('region', {
          name: 'Scrollable segment descriptor table',
        });
        await expect(tableRegion).toHaveAttribute('tabindex', '0');
        const bounds = await tableRegion.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      }

      if (view.navigation === 'Page Replacement') {
        await expect(main.getByRole('region', { name: 'Page reference stream' })).toHaveAttribute('tabindex', '0');
        await expect(main.getByRole('region', { name: 'FIFO execution matrix' })).toHaveAttribute('tabindex', '0');
        await expect(main.getByRole('region', { name: 'LRU execution matrix' })).toHaveAttribute('tabindex', '0');
      }

      if (view.navigation === 'Dynamic Allocation') {
        await expect(main.getByRole('region', { name: 'Allocation operation queue' })).toHaveAttribute('tabindex', '0');
      }

      if (view.navigation === 'Analytics') {
        await expect(main.locator('.analytics-page .recharts-wrapper').first()).toBeVisible();
      }

      const layout = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const overflowingElements = Array.from(document.body.querySelectorAll('*'))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return (
              rect.width > 0 &&
              (rect.left < -1 || rect.right > viewport + 1) &&
              style.position !== 'absolute' &&
              !element.closest('[class*="overflow-auto"], [class*="overflow-x-auto"], [class*="overflow-x-scroll"]')
            );
          })
          .slice(0, 8)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName,
              className: typeof element.className === 'string' ? element.className : '',
              text: element.textContent?.trim().slice(0, 40),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
            };
          });
        return {
          viewport,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          overflowingElements,
        };
      });
      expect(
        Math.max(layout.document, layout.body),
        `${view.navigation} overflows at ${width}px: ${JSON.stringify(layout.overflowingElements)}`
      ).toBeLessThanOrEqual(layout.viewport + 1);

      const clippedControls = await main
        .locator('button:visible, input:visible, select:visible, textarea:visible, a:visible')
        .evaluateAll((elements) =>
          elements.flatMap((element) => {
            const rect = element.getBoundingClientRect();
            return (
              (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) &&
              !element.closest('[class*="overflow-auto"], [class*="overflow-x-auto"], [class*="overflow-x-scroll"]')
            )
              ? [{
                  name: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName,
                  left: Math.round(rect.left),
                  right: Math.round(rect.right),
                }]
              : [];
          })
        );
      expect(
        clippedControls,
        `${view.navigation} has controls outside the viewport at ${width}px`
      ).toEqual([]);
    }
  });
}
