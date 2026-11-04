import { expect, test, type Page } from '@playwright/test';

const ROUTE = '/simulations/c5-ch06-a01-the-storage-of-rainwater';
const BUDGET = { drawCalls: 120, triangles: 250_000 };

// Fixed camera and 1280x800 viewport.
const VALVE_ON_SCREEN = { x: 788, y: 352 };
const STONES_ON_SCREEN = { x: 370, y: 530 };
const TOP_SOCKET_ON_SCREEN = { x: 860, y: 335 };

const mission = (page: Page) => page.getByTestId('rainwater-mission');

async function start(page: Page) {
  await page.goto(ROUTE);
  await page.getByRole('button', { name: /Start Mission in Browser/ }).click();
  await expect(mission(page)).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
}

async function toRooftop(page: Page) {
  await page.getByRole('button', { name: 'Follow the raindrop' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Collect and store it' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(mission(page)).toHaveAttribute('data-stage', 'rooftop');
}

async function placeGutter(page: Page, number: number) {
  await page.getByRole('button', { name: `Pick up gutter ${number}` }).click();
  await page.getByRole('button', { name: `Place on roof edge ${number}` }).click();
}

async function expectInsideBudget(page: Page) {
  const root = mission(page);
  await expect(root).toHaveAttribute('data-render-draw-calls', /^[1-9]\d*$/, { timeout: 15_000 });
  await page.waitForTimeout(1_200);
  const drawCalls = Number(await root.getAttribute('data-render-draw-calls'));
  const triangles = Number(await root.getAttribute('data-render-triangles'));
  expect(drawCalls).toBeLessThanOrEqual(BUDGET.drawCalls);
  expect(triangles).toBeLessThanOrEqual(BUDGET.triangles);
}

test.describe('rainwater mission', () => {
  test('rooftop earns water only when every gutter is placed', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await start(page);
    await toRooftop(page);
    const root = mission(page);

    await placeGutter(page, 1);
    await placeGutter(page, 2);
    await placeGutter(page, 3);
    await expect(root).toHaveAttribute('data-saved-litres', '0');
    await expect(root).toHaveAttribute('data-spilling', '1');
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await placeGutter(page, 4);
    await expect(root).toHaveAttribute('data-saved-litres', '1250');
    await expect(root).toHaveAttribute('data-spilling', '0');
    await expect(page.getByText('1,250 / 10,000 L')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await expectInsideBudget(page);
    expect(errors).toEqual([]);
  });

  test('carries a gutter from the table to the roof with the pointer', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await start(page);
    await toRooftop(page);
    const root = mission(page);
    await expect(root).toHaveAttribute('data-spilling', '4');
    // Fixed camera and viewport: the nearest gutter on the table, then roof edge 1.
    await page.mouse.move(230, 556);
    await page.mouse.down();
    await page.mouse.up();
    await expect(page.getByRole('button', { name: 'Place on roof edge 1' })).toBeEnabled();
    await page.mouse.move(352, 293, { steps: 8 });
    await page.waitForTimeout(400);
    await page.mouse.down();
    await page.mouse.up();
    await expect(root).toHaveAttribute('data-spilling', '3');
    await expect(page.getByRole('button', { name: /Remove from roof edge 1/ })).toBeVisible();
  });

  test.describe('filter stage', () => {
    async function toFilter(page: Page) {
      await toRooftop(page);
      for (const number of [1, 2, 3, 4]) await placeGutter(page, number);
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(mission(page)).toHaveAttribute('data-stage', 'filter');
    }
    const placeLayer = async (page: Page, layer: string, socket: string) => {
      await page.getByRole('button', { name: `Pick up ${layer}` }).click();
      await page.getByRole('button', { name: `Place on ${socket} of filter` }).click();
    };

    test('stays dirty until the valve is open and the layers are right', async ({ page }) => {
      await start(page);
      await toFilter(page);
      const root = mission(page);
      await placeLayer(page, 'sand', 'top');
      await placeLayer(page, 'stones', 'middle');
      await placeLayer(page, 'charcoal', 'bottom');
      await expect(root).toHaveAttribute('data-water-clear', 'false');
      await expect(root).toHaveAttribute('data-saved-litres', '1250');
      await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

      await page.getByRole('button', { name: 'Open the first-flush valve' }).click();
      await page.getByRole('button', { name: 'Remove from top of filter' }).click();
      await page.getByRole('button', { name: 'Remove from middle of filter' }).click();
      await placeLayer(page, 'stones', 'top');
      await placeLayer(page, 'sand', 'middle');
      await expect(root).toHaveAttribute('data-water-clear', 'true');
      await expect(root).toHaveAttribute('data-saved-litres', '2500');
      await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
      await expectInsideBudget(page);
    });

    test('opens the valve and places a layer with the pointer', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await start(page);
      await toFilter(page);
      await page.waitForTimeout(1_400);
      const root = mission(page);
      await page.mouse.click(VALVE_ON_SCREEN.x, VALVE_ON_SCREEN.y);
      await expect(root).toHaveAttribute('data-first-flush', 'true');
      await page.mouse.click(STONES_ON_SCREEN.x, STONES_ON_SCREEN.y);
      await expect(page.getByRole('button', { name: 'Place on top of filter' })).toBeEnabled();
      await page.mouse.move(TOP_SOCKET_ON_SCREEN.x, TOP_SOCKET_ON_SCREEN.y, { steps: 8 });
      await page.waitForTimeout(400);
      await page.mouse.click(TOP_SOCKET_ON_SCREEN.x, TOP_SOCKET_ON_SCREEN.y);
      await expect(page.getByRole('button', { name: 'Remove from top of filter' })).toBeVisible();
    });
  });

  test('no button completes the rooftop without placing the pieces', async ({ page }) => {
    await start(page);
    await toRooftop(page);
    const labels = await page.getByRole('button').allInnerTexts();
    for (const label of labels) {
      expect(label).not.toMatch(/install|complete|finish|skip/i);
    }
    await page.getByRole('button', { name: 'Continue' }).click({ force: true, timeout: 2_000 }).catch(() => undefined);
    await expect(mission(page)).toHaveAttribute('data-stage', 'rooftop');
  });

  test('stays playable when the models cannot load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/models/rainwater/*.glb', route => route.abort());
    await start(page);
    await toRooftop(page);
    for (const number of [1, 2, 3, 4]) await placeGutter(page, number);
    await expect(mission(page)).toHaveAttribute('data-saved-litres', '1250');
    expect(errors).toEqual([]);
  });

  test('explains a wrong drought choice', async ({ page }) => {
    await start(page);
    await page.getByRole('button', { name: 'Follow the raindrop' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Let it enter the drains' }).click();
    await expect(page.getByRole('status')).toContainText('drain');
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
