import { expect, test, type Locator } from '@playwright/test';

const fungiUrl = '/simulations/c8-ch02-a03-fungi-and-its-development';

function intersectionArea(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
  return width * height;
}

async function requiredBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'phone', width: 390, height: 844 },
] as const) {
  test(`keeps the fungi lab usable without dock overlap on ${viewport.name}`, async ({ page }) => {
    test.setTimeout(process.env.CI ? 120_000 : 60_000);
    await page.setViewportSize(viewport);
    await page.goto(fungiUrl, { waitUntil: 'networkidle' });
    await page.getByLabel('Audio', { exact: true }).uncheck();
    await page.getByLabel('Reduced motion', { exact: true }).check();
    await page.getByRole('button', { name: 'Explore in browser' }).click();

    const rail = page.getByTestId('fungi-learning-controls');
    const dock = page.locator('.simulation-experience__mission-dock');
    const canvas = page.locator('canvas');
    await expect(rail).toBeVisible();
    await expect(dock).toBeVisible();
    await expect(canvas).toBeVisible();

    const [railBox, dockBox, canvasBox] = await Promise.all([
      requiredBox(rail),
      requiredBox(dock),
      requiredBox(canvas),
    ]);
    expect(intersectionArea(railBox, dockBox)).toBe(0);

    const coveredCanvasArea = intersectionArea(canvasBox, railBox) + intersectionArea(canvasBox, dockBox);
    const visibleCanvasRatio = (canvasBox.width * canvasBox.height - coveredCanvasArea)
      / (canvasBox.width * canvasBox.height);
    expect(visibleCanvasRatio).toBeGreaterThan(0.25);

    if (viewport.name === 'desktop') return;

    const finalPrecheckOption = rail.locator(
      'button[aria-label$="Bread mould and green plant"]',
    );
    await finalPrecheckOption.scrollIntoViewIfNeeded();
    const [optionBox, scrolledRailBox] = await Promise.all([
      requiredBox(finalPrecheckOption),
      requiredBox(rail),
    ]);
    expect(optionBox.y).toBeGreaterThanOrEqual(scrolledRailBox.y);
    expect(optionBox.y + optionBox.height).toBeLessThanOrEqual(scrolledRailBox.y + scrolledRailBox.height + 1);
    expect(await rail.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await finalPrecheckOption.click();
    await expect(rail.locator('[role="status"]')).toContainText('Look for the observed spore and thread evidence');
  });
}
