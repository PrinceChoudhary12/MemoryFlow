import { expect, test, type Page } from '@playwright/test';
import { ReplacementEngine } from '../../src/core/replacement/replacementEngine';

async function openLab(page: Page, label: RegExp) {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('button', { name: label }).click();
}

test('paging input updates the page table and physical frame visualization', async ({ page }) => {
  await openLab(page, /^Paging Lab/);
  await page.getByRole('button', { name: 'Trace Stream' }).click();
  await page.getByLabel('Reference Access Sequence (Comma-Separated):').fill('0x1000');
  await page.getByRole('button', { name: 'Load Sequence into Stepper' }).click();
  await page.getByRole('button', { name: 'Step forward' }).click();

  const pageRow = page.getByRole('row').filter({ hasText: 'P#01' });
  await expect(pageRow).toContainText('Frame 0');
  await expect(pageRow).toContainText('Valid');
  await expect(page.getByText('Page 1', { exact: true }).first()).toBeVisible();
});

test('segmentation custom segments update the descriptor table and memory map', async ({ page }) => {
  await openLab(page, /^Segmentation/);
  const ram = page.getByLabel('Physical RAM');
  await ram.selectOption('64');
  await page.getByRole('button', { name: 'Add Custom Segment' }).click();
  await page.getByLabel('Segment name').fill('High Segment');
  await page.getByLabel('Base Address').fill('50000');
  await page.getByLabel('Limit / Size').fill('1000');
  await page.getByRole('button', { name: 'Add to Table' }).click();

  await ram.selectOption('32');
  await expect(page.getByRole('alert')).toContainText('Cannot reduce RAM');
  await expect(ram).toHaveValue('64');

  await page.getByRole('button', { name: 'Add Custom Segment' }).click();
  await page.getByLabel('Segment name').fill('Browser Segment');
  await page.getByLabel('Base Address').fill('26000');
  await page.getByLabel('Limit / Size').fill('1000');
  await page.getByRole('button', { name: 'Add to Table' }).click();

  const segmentRow = page.getByRole('row').filter({ hasText: 'Browser Segment' });
  await expect(segmentRow).toBeVisible();
  await expect(page.getByText('Browser Segment', { exact: true }).last()).toBeVisible();
  const physicalMap = await page.getByRole('img', { name: /Physical memory map/ }).evaluate((map) => ({
    firstBlockBasis: getComputedStyle(map.children[0]).flexBasis,
    overflow: getComputedStyle(map).overflow,
  }));
  expect(Number.parseFloat(physicalMap.firstBlockBasis)).toBeCloseTo(3.125, 2);
  expect(physicalMap.overflow).not.toBe('hidden');

  const address = page.getByLabel('Logical Address <Segment, Offset>:');
  await address.fill('(5, 10)');
  await page.getByRole('button', { name: 'Translate' }).click();
  await expect(page.getByText(/VALID TRANSLATION/).first()).toBeVisible();

  await address.fill('(5, 1000)');
  await page.getByRole('button', { name: 'Translate' }).click();
  await expect(page.getByText(/FAULT_LIMIT_EXCEEDED|Limit Exceeded/).first()).toBeVisible();
});

test('virtual memory page fault updates page table, frames, swap, and EAT explanation', async ({ page }) => {
  await openLab(page, /^Virtual Memory/);
  const address = page.getByLabel('Logical Address & Access Type:');

  await page.getByRole('button', { name: 'WRITE', exact: true }).click();
  await address.fill('0x0000');
  await page.getByRole('button', { name: 'Access' }).click();
  await address.fill('0x1000');
  await page.getByRole('button', { name: 'Access' }).click();

  await page.getByRole('button', { name: 'READ' }).click();
  for (const reference of ['0x2000', '0x3000', '0x4000']) {
    await address.fill(reference);
    await page.getByRole('button', { name: 'Access' }).click();
  }

  await expect(page.getByText('Writeback Page #0')).toBeVisible();
  await address.fill('0x5000');
  await page.getByRole('button', { name: 'Access' }).click();
  await expect(page.getByText('Writeback Page #1')).toBeVisible();
  await page.getByRole('button', { name: 'Access' }).click();

  const pageFourRow = page.getByRole('row').filter({ hasText: 'Page #4' });
  await expect(pageFourRow).toContainText('1 (RAM)');
  await expect(pageFourRow).toContainText('Frame #0');
  const pageZeroRow = page.getByRole('row').filter({ hasText: 'Page #0' });
  await expect(pageZeroRow).toContainText('0 (Disk)');
  const pageOneRow = page.getByRole('row', { name: /^Page #1 / });
  await expect(pageOneRow).toContainText('0 (Disk)');
  await expect(page.getByText('Page #4', { exact: true }).nth(1)).toBeVisible();
  await expect(page.getByText('Page #4', { exact: true }).nth(2)).toBeVisible();
  const eatExplanation = page.getByTestId('eat-explanation');
  await expect(eatExplanation).toHaveAttribute('data-p', String(6 / 7));
  await expect(eatExplanation).toHaveAttribute('data-q', String(2 / 6));
  await expect(eatExplanation).toHaveAttribute('data-eat-ns', '8000014');
  await expect(eatExplanation).toContainText('Rounded probabilities: p ≈ 0.857, q ≈ 0.333');
  await expect(eatExplanation).toContainText('p = 6/7 faults; q = 2/6 dirty writebacks');
  await expect(eatExplanation).toContainText('8,000,014 ns');
});

test('custom allocation layout is shared by First-Fit, Best-Fit, and Worst-Fit', async ({ page }) => {
  await openLab(page, /^Dynamic Allocation/);
  await page.getByRole('button', { name: 'Clear layout' }).click();
  await expect(page.getByRole('alert')).toContainText('At least one initial partition');

  await page.getByLabel('Total Memory (KB)').fill('300');
  await page.getByRole('button', { name: 'Add initial partition' }).click();
  await page.getByRole('button', { name: 'Add initial partition' }).click();
  await page.getByLabel('Total Memory (KB)').fill('100');
  await expect(page.getByRole('alert')).toContainText('cannot exceed total memory');
  await page.getByLabel('Total Memory (KB)').fill('300');
  await page.getByLabel('Partition 1 size (KB)').fill('');
  await expect(page.getByRole('alert')).toContainText('positive safe integer');
  await page.getByLabel('Partition 1 size (KB)').fill('100');
  await page.getByLabel('Partition 2 size (KB)').fill('50');
  await page.getByLabel('Operation Stream:').fill('A P1 120');
  await page.getByRole('button', { name: 'Apply Configuration' }).click();

  for (const strategy of ['First-Fit', 'Best-Fit', 'Worst-Fit']) {
    const map = page.getByRole('group', { name: `${strategy} memory map` });
    const initialWidths = await map.locator(':scope > div').evaluateAll((blocks) =>
      blocks.map((block) => getComputedStyle(block).flexBasis)
    );
    expect(Number.parseFloat(initialWidths[0])).toBeCloseTo(100 / 3, 2);
    expect(Number.parseFloat(initialWidths[1])).toBeCloseTo(100 / 6, 2);
    expect(Number.parseFloat(initialWidths[2])).toBeCloseTo(50, 2);

    const details = map.locator('xpath=following-sibling::details[1]');
    await details.locator('summary').click();
    await expect(details).toContainText('Free: 100 KB free @ 0–99 KB');
    await expect(details).toContainText('Free: 50 KB free @ 100–149 KB');
    await expect(details).toContainText('Unassigned remainder: 150 KB free @ 150–299 KB');
  }

  await page.getByRole('button', { name: 'Step forward' }).click();
  for (const strategy of ['First-Fit', 'Best-Fit', 'Worst-Fit']) {
    const map = page.getByRole('group', { name: `${strategy} memory map` });
    await expect(map).toContainText('P1');
    const details = map.locator('xpath=following-sibling::details[1]');
    await expect(details).toContainText('P1: 120 KB allocated @ 150–269 KB');
  }
});

test('FIFO and LRU matrices reflect the same stepped reference stream', async ({ page }) => {
  await openLab(page, /^Page Replacement/);
  const referenceString = [1, 2, 3, 1, 4, 1, 2];
  const expectedEngine = new ReplacementEngine(referenceString, 3);
  while (expectedEngine.canStepForward()) expectedEngine.stepForward();
  const expectedStats = expectedEngine.getStats();

  expect(expectedStats.fifo).toMatchObject({
    hits: 1,
    faults: 6,
    hitRatio: 14.29,
    faultRatio: 85.71,
  });
  expect(expectedStats.lru).toMatchObject({
    hits: 2,
    faults: 5,
    hitRatio: 28.57,
    faultRatio: 71.43,
  });

  await page.getByLabel('Page Reference String:').fill(referenceString.join(', '));
  await page.getByRole('button', { name: 'Apply Sequence' }).click();

  const fifo = page.getByRole('region', { name: 'FIFO execution matrix' });
  const lru = page.getByRole('region', { name: 'LRU execution matrix' });
  for (let step = 0; step < referenceString.length; step++) {
    await page.getByRole('button', { name: 'Step forward' }).click();
  }

  await expect(fifo.getByRole('row').filter({ hasText: '#4' })).toContainText('HIT');
  await expect(lru.getByRole('row').filter({ hasText: '#4' })).toContainText('HIT');
  await expect(fifo.getByRole('row').filter({ hasText: '#6' })).toContainText('FAULT');
  await expect(lru.getByRole('row').filter({ hasText: '#6' })).toContainText('HIT');

  const fifoCard = page.getByText('FIFO Performance', { exact: true }).locator('xpath=../..');
  const lruCard = page.getByText('LRU Performance', { exact: true }).locator('xpath=../..');
  const fifoCells = fifoCard.locator('.grid.grid-cols-2 > div');
  const lruCells = lruCard.locator('.grid.grid-cols-2 > div');
  for (const [cells, expected] of [
    [fifoCells, expectedStats.fifo],
    [lruCells, expectedStats.lru],
  ] as const) {
    await expect(cells.nth(0).locator('span').nth(1)).toHaveText(String(expected.hits));
    await expect(cells.nth(0).locator('span').nth(2)).toHaveText(`${expected.hitRatio}%`);
    await expect(cells.nth(1).locator('span').nth(1)).toHaveText(String(expected.faults));
    await expect(cells.nth(1).locator('span').nth(2)).toHaveText(`${expected.faultRatio}%`);
  }
});
