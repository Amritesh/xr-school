import { expect, test, type Page } from '@playwright/test';

const ROUTE = '/simulations/c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape';
const BUDGET = { drawCalls: 120, triangles: 250_000 };

const lab = (page: Page) => page.getByTestId('force-lab');

async function start(page: Page) {
  await page.goto(ROUTE);
  await page.getByRole('button', { name: /browser/i }).first().click();
  await expect(lab(page)).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
}

async function expectInsideBudget(page: Page) {
  await expect(lab(page)).toHaveAttribute('data-render-draw-calls', /^[1-9]\d*$/, { timeout: 15_000 });
  await page.waitForTimeout(1_200);
  expect(Number(await lab(page).getAttribute('data-render-draw-calls'))).toBeLessThanOrEqual(BUDGET.drawCalls);
  expect(Number(await lab(page).getAttribute('data-render-triangles'))).toBeLessThanOrEqual(BUDGET.triangles);
}

test.describe('force and motion lab', () => {
  test.setTimeout(300_000);

  test('pushes the trolley by dragging its handle with the pointer', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await start(page);
    await page.waitForTimeout(1_500);
    // Fixed camera and viewport: the trolley handle, then up the aisle towards the counter.
    await page.mouse.move(430, 474);
    await page.mouse.down();
    await page.mouse.move(560, 330, { steps: 12 });
    await page.mouse.up();
    await expect(page.locator('.simulation-experience__caption')).toContainText('wagon');
  });

  test('can be finished with only a keyboard and reduced motion, inside the budget', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await start(page);
    const press = async (name: string | RegExp, scope = page.getByLabel('Force and motion actions')) => {
      const button = scope.getByRole('button', { name, exact: typeof name === 'string' });
      await button.focus();
      await page.keyboard.press('Enter');
    };
    const choose = async (label: string) => {
      const choice = page.getByTestId('interactive-choice').filter({ hasText: label });
      await choice.focus();
      await page.keyboard.press('Enter');
    };
    const next = async (scene: string) => {
      const button = page.getByRole('button', { name: 'Continue' });
      await expect(button).toBeVisible({ timeout: 30_000 });
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(lab(page)).toHaveAttribute('data-scene', scene);
    };

    await expectInsideBudget(page);
    await press('Push the trolley');
    await press('Pull the wagon');
    await choose('Pull the door');
    await press('Open the door');
    await press('Close the door');
    await next('playground');

    await expectInsideBudget(page);
    await choose('Strong kick');
    await press('Kick gently');
    await press('Kick hard');
    await press('Tap the rolling ball from the side');
    await next('friction');

    await expectInsideBudget(page);
    await press('Release on smooth tiles');
    await expect(page.getByTestId('feedback')).toContainText('guess');
    await choose('Rough carpet');
    await press('Release on smooth tiles');
    await press('Release on rough carpet');
    await expect(page.locator('.simulation-experience__caption')).toContainText('Rough carpet', { timeout: 30_000 });
    await next('wall');

    await expectInsideBudget(page);
    await choose('Back towards me');
    await press('Roll the ball at the wall');
    await expect(page.locator('.simulation-experience__caption')).toContainText('racket', { timeout: 30_000 });
    await press('Hit a ball with the racket');
    await next('quiz');

    await choose('Pull');
    await expect(page.getByTestId('feedback')).toContainText('away from you is a push');
    await choose('Push');
    await choose('Rough carpet');
    await choose('Its direction');
    await expect(page.getByTestId('completion')).toBeVisible({ timeout: 10_000 });
  });
});
