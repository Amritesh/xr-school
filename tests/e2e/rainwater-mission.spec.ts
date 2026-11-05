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
  test.setTimeout(120_000);

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

  async function pressPieces(page: Page, pairs: [string, string][]) {
    for (const [piece, socket] of pairs) {
      await page.getByRole('button', { name: `Pick up ${piece}`, exact: true }).click();
      await page.getByRole('button', { name: `Place on ${socket}`, exact: true }).click();
    }
  }
  async function toStage(page: Page, stage: 'school' | 'recharge' | 'storm') {
    await toRooftop(page);
    const root = mission(page);
    const next = () => page.getByRole('button', { name: 'Continue' }).click();
    await pressPieces(page, [1, 2, 3, 4].map(n => [`gutter ${n}`, `roof edge ${n}`]));
    await next();
    await page.getByRole('button', { name: 'Open the first-flush valve' }).click();
    await pressPieces(page, [
      ['stones', 'top of filter'],
      ['sand', 'middle of filter'],
      ['charcoal', 'bottom of filter'],
    ]);
    await next();
    await expect(root).toHaveAttribute('data-stage', 'school');
    if (stage === 'school') return;
    await pressPieces(page, [
      ['school gutter', 'school roof edge'],
      ['school pipe', 'pipe run'],
      ['tank cover', 'big tank'],
    ]);
    await next();
    await expect(root).toHaveAttribute('data-stage', 'recharge');
    if (stage === 'recharge') return;
    await pressPieces(page, [
      ['large stones', 'bottom of pit'],
      ['small stones', 'middle of pit'],
      ['sand', 'top of pit'],
    ]);
    await next();
    await expect(root).toHaveAttribute('data-stage', 'storm');
  }

  test('school reaches 5,000 L when its parts are in the right places', async ({ page }) => {
    await start(page);
    await toStage(page, 'school');
    const root = mission(page);
    await pressPieces(page, [
      ['school pipe', 'school roof edge'],
      ['school gutter', 'pipe run'],
      ['tank cover', 'big tank'],
    ]);
    await expect(root).toHaveAttribute('data-saved-litres', '2500');
    await expect(page.locator('aside p')).toContainText('wrong place');
    await page.getByRole('button', { name: 'Remove from school roof edge' }).click();
    await page.getByRole('button', { name: 'Remove from pipe run' }).click();
    await pressPieces(page, [
      ['school gutter', 'school roof edge'],
      ['school pipe', 'pipe run'],
    ]);
    await expect(root).toHaveAttribute('data-saved-litres', '5000');
    await expectInsideBudget(page);
  });

  test('recharge explains a wrong order and reaches 6,500 L', async ({ page }) => {
    await start(page);
    await toStage(page, 'recharge');
    const root = mission(page);
    await pressPieces(page, [
      ['sand', 'bottom of pit'],
      ['small stones', 'middle of pit'],
      ['large stones', 'top of pit'],
    ]);
    await expect(root).toHaveAttribute('data-saved-litres', '5000');
    await expect(page.locator('aside p')).toContainText('large stones at the bottom');
    await page.getByRole('button', { name: 'Remove from bottom of pit' }).click();
    await page.getByRole('button', { name: 'Remove from top of pit' }).click();
    await pressPieces(page, [
      ['large stones', 'bottom of pit'],
      ['sand', 'top of pit'],
    ]);
    await expect(root).toHaveAttribute('data-saved-litres', '6500');
    await expectInsideBudget(page);
  });

  test.describe('storm', () => {
    test('routes by keyboard and pauses without losing time when hidden', async ({ page }) => {
      await start(page);
      await toStage(page, 'storm');
      const root = mission(page);
      await expect(page.getByRole('button', { name: /Start the storm/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
      await page.getByRole('button', { name: /Start the storm/ }).click();
      await expect(root).toHaveAttribute('data-storm-active', 'houseTank');
      await page.keyboard.press('2');
      await expect(root).toHaveAttribute('data-storm-active', 'schoolTank');
      await page.getByRole('button', { name: /Village pond/ }).click();
      await expect(root).toHaveAttribute('data-storm-active', 'pond');
      await expectInsideBudget(page);

      const setHidden = (hidden: boolean) =>
        page.evaluate(value => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
          document.dispatchEvent(new Event('visibilitychange'));
        }, hidden);
      await setHidden(true);
      await expect(root).toHaveAttribute('data-storm-paused', 'true');
      const held = await root.getAttribute('data-storm-elapsed');
      await page.waitForTimeout(1_200);
      await expect(root).toHaveAttribute('data-storm-elapsed', held!);
      await setHidden(false);
      await expect(root).toHaveAttribute('data-storm-paused', 'false');
      await expect
        .poll(async () => Number(await root.getAttribute('data-storm-elapsed')))
        .toBeGreaterThan(Number(held));
      const after = Number(await root.getAttribute('data-storm-elapsed'));
      expect(after).toBeLessThan(Number(held) + 10);
    });

    test('finishes with the real routed litres and offers a replay', async ({ page }) => {
      test.setTimeout(400_000);
      await start(page);
      await toStage(page, 'storm');
      await page.getByRole('button', { name: /Start the storm/ }).click();
      const again = page.getByRole('button', { name: 'Play the storm again' });
      await expect(again).toBeVisible({ timeout: 300_000 });
      const saved = Number(await mission(page).getAttribute('data-saved-litres'));
      expect(saved).toBeGreaterThan(6500);
      expect(saved).toBeLessThanOrEqual(7300);
      await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
      await expect(page.locator('aside p')).not.toContainText('every drop');
    });
  });

  test.describe('story stages', () => {
    test('counts the lost rain up to 10,000 L while saved stays at 0', async ({ page }) => {
      await start(page);
      await page.getByRole('button', { name: 'Follow the raindrop' }).click();
      await expect(mission(page)).toHaveAttribute('data-lost-litres', '10000', { timeout: 30_000 });
      await expect(mission(page)).toHaveAttribute('data-saved-litres', '0');
      await expect(page.getByText('LOST TO THE DRAIN')).toBeVisible();
    });
  });

  test('can be finished with only a keyboard and reduced motion', async ({ page }) => {
    test.setTimeout(560_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTE);
    const press = async (name: string | RegExp) => {
      const button = page.getByRole('button', { name, exact: typeof name === 'string' });
      await button.focus();
      await page.keyboard.press('Enter');
    };
    const root = mission(page);
    const caption = async () => {
      await expect(page.locator('aside p')).not.toBeEmpty();
    };
    const put = async (pairs: [string, string][]) => {
      for (const [piece, socket] of pairs) {
        await press(`Pick up ${piece}`);
        await press(`Place on ${socket}`);
      }
    };
    await press(/Start Mission in Browser/);
    await expect(root).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
    await caption();
    await press('Follow the raindrop');
    await expect(root).toHaveAttribute('data-lost-litres', '10000');
    await press('Continue');
    await caption();
    await press('Collect and store it');
    await press('Continue');
    await caption();
    await put([1, 2, 3, 4].map(n => [`gutter ${n}`, `roof edge ${n}`] as [string, string]));
    await press('Continue');
    await caption();
    await press('Open the first-flush valve');
    await put([
      ['stones', 'top of filter'],
      ['sand', 'middle of filter'],
      ['charcoal', 'bottom of filter'],
    ]);
    await press('Continue');
    await caption();
    await put([
      ['school gutter', 'school roof edge'],
      ['school pipe', 'pipe run'],
      ['tank cover', 'big tank'],
    ]);
    await press('Continue');
    await caption();
    await put([
      ['large stones', 'bottom of pit'],
      ['small stones', 'middle of pit'],
      ['sand', 'top of pit'],
    ]);
    await press('Continue');
    await caption();
    await press('Start at a slower pace');
    const again = page.getByRole('button', { name: 'Play the storm again' });
    const keys = ['1', '2', '3', '4'];
    let turn = 0;
    while (!(await again.isVisible())) {
      if ((await root.getAttribute('data-storm-blocked')) === 'true') await page.keyboard.press('b');
      await page.keyboard.press(keys[Math.floor(turn / 8) % 4]!);
      turn += 1;
      await page.waitForTimeout(1_000);
    }
    expect(Number(await root.getAttribute('data-saved-litres'))).toBeGreaterThan(6500);
    await press('Continue');
    await caption();
    await expect(root).toHaveAttribute('data-stage', 'summer');
    await press('Drink it');
    await expect(page.getByRole('status')).toContainText('treatment and testing');
    const targets = [/Water the garden/, /Water the animals/, /Use for cleaning/];
    const next = page.getByRole('button', { name: 'Continue' });
    for (let i = 0; i < 40 && !(await next.isEnabled()); i += 1) await press(targets[i % 3]!);
    await press('Continue');
    await caption();
    await expect(root).toHaveAttribute('data-stage', 'finale');
    await expect(page.getByRole('button', { name: 'Replay the storm' })).toBeVisible();
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
