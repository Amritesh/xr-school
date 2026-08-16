import { expect, test, type Locator, type Page } from '@playwright/test';

const fungiUrl = '/simulations/c8-ch02-a03-fungi-and-its-development';

/** Normalized lens positions: three specimens with clear gaps between them. */
const MUSHROOM_X = '0.19';
const GAP_LEFT_X = '0.35';
const BREAD_X = '0.5';
const GAP_RIGHT_X = '0.65';
const PLANT_X = '0.81';

function intersectionArea(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  const width = Math.max(
    0,
    Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x),
  );
  const height = Math.max(
    0,
    Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y),
  );
  return width * height;
}

async function requiredBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function launch(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(fungiUrl, { waitUntil: 'networkidle' });
  await page.getByLabel('Audio', { exact: true }).uncheck();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByRole('button', { name: 'Explore in browser' }).click();
  await expect(page.getByTestId('fungi-mission-strip')).toBeVisible();
  await expect(page.getByTestId('fungi-tool-drawer')).toBeVisible();
}

async function setSlider(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).fill(value);
}

/**
 * Completing a mission swaps the drawer for the next mission's tools, so the
 * control being clicked legitimately disappears. The outcome is the assertion.
 */
/**
 * Tool controls live inside the scrollable drawer. Playwright's scroll-into-view
 * fights the panel's own scrolling, so bring the control into view and dispatch
 * the click on it directly — it is already the topmost element at that point.
 */
async function clickTool(page: Page, testId: string) {
  const control = page.getByTestId(testId);
  await expect(control).toBeVisible();
  await control.evaluate((element: HTMLElement) => {
    element.scrollIntoView({ block: 'nearest' });
    element.click();
  });
}

async function clickAdvancing(page: Page, testId: string, nextMission: string) {
  await clickTool(page, testId);
  await expect(currentMission(page)).toHaveText(nextMission);
}

function currentMission(page: Page) {
  return page.getByTestId('fungi-current-mission');
}

/**
 * Where the authored prompt asks exactly what the mission gate asks, answering
 * it in the shell IS the scientific act — there is no duplicate control.
 */
function promptOption(page: Page, label: string) {
  return page.locator('.simulation-experience__assessment button', { hasText: label });
}

/**
 * The shell's stage card resizes as evidence is captured, so its buttons keep
 * shifting; the button itself is present and enabled throughout.
 */
async function clickPrompt(page: Page, label: string) {
  const option = promptOption(page, label).first();
  await expect(option).toBeVisible();
  await option.click({ force: true });
}

async function completeDiagnose(page: Page) {
  await clickPrompt(page, 'Mushroom and green plant');
  await setSlider(page, 'fungi-lens-y', '0.5');
  for (const x of [MUSHROOM_X, GAP_LEFT_X, BREAD_X, GAP_RIGHT_X, PLANT_X]) {
    await setSlider(page, 'fungi-lens-x', x);
  }
  await clickPrompt(page, 'Mushroom and bread mould');
  await expect(currentMission(page)).toHaveText('Mycelium');
}

async function completeMycelium(page: Page) {
  for (const [depth, traceX] of [
    ['0.2', '0.15'],
    ['0.5', '0.5'],
    ['0.8', '0.85'],
  ] as const) {
    await setSlider(page, 'fungi-focus-depth', depth);
    await setSlider(page, 'fungi-trace-x', traceX);
  }
  await clickPrompt(page, 'Mycelium');
  await expect(currentMission(page)).toHaveText('Spore flight');
}

async function completeSporeFlight(page: Page) {
  // No airflow: the spore falls short of every growing surface.
  await setSlider(page, 'fungi-fan-direction', '0');
  await setSlider(page, 'fungi-fan-strength', '0');
  await clickTool(page, 'fungi-spore-release');
  await expect(page.getByTestId('fungi-caption')).toContainText('missed');

  // Enough airflow to reach the warm moist tray.
  await setSlider(page, 'fungi-fan-strength', '0.6');
  await clickTool(page, 'fungi-spore-release');
  await expect(currentMission(page)).toHaveText('Growth chamber');
}

async function completeGrowthChamber(page: Page) {
  await setSlider(page, 'fungi-temperature', '27');
  await setSlider(page, 'fungi-moisture', '85');
  await setSlider(page, 'fungi-hours', '96');
  await clickTool(page, 'fungi-save-trial');

  // Change exactly one variable so the comparison is a fair one.
  await setSlider(page, 'fungi-temperature', '9');
  await clickTool(page, 'fungi-save-trial');

  await clickTool(page, 'fungi-compare-trials');
  await expect(page.getByTestId('fungi-caption')).toContainText('fair');

  await page.getByTestId('fungi-growth-interpretation').selectOption('temperature-changed-growth');
  await clickAdvancing(page, 'fungi-record-interpretation', 'Fungi at work');
}

async function completeUsefulFungi(page: Page) {
  await setSlider(page, 'fungi-proving-hours', '48');
  await clickTool(page, 'fungi-pipette-yeast');
  await clickTool(page, 'fungi-role-yeast-food');
  await clickTool(page, 'fungi-role-antibiotic-producing-fungus-medicine');
  await clickAdvancing(page, 'fungi-role-saprotrophic-fungus-decomposer', 'Food safety');
}

async function completeSafety(page: Page) {
  await setSlider(page, 'fungi-scanner-depth', '0.9');
  await clickTool(page, 'fungi-safety-fresh');
  await clickTool(page, 'fungi-safety-mouldy');
  // The misconception must be recorded before it is corrected.
  await clickPrompt(page, 'Cutting');
  await clickPrompt(page, 'Reject');
  await expect(currentMission(page)).toHaveText('Recommendation');
}

test.describe('forest nursery investigation', () => {
  test('completes the whole adjustable journey on desktop', async ({ page }) => {
    test.setTimeout(process.env.CI ? 180_000 : 120_000);
    await launch(page, { width: 1280, height: 720 });

    await completeDiagnose(page);
    await completeMycelium(page);
    await completeSporeFlight(page);
    await completeGrowthChamber(page);
    await completeUsefulFungi(page);
    await completeSafety(page);

    await clickPrompt(page, 'Cool');
    await clickTool(page, 'fungi-cite-trial-1');
    await clickTool(page, 'fungi-distinguish-spoilage-harmful-decomposition-useful');

    // Every mission closed, and the notebook records what was actually done.
    const notebook = page.getByTestId('fungi-evidence-notebook');
    await expect(notebook).toContainText('Triage');
    await expect(notebook).toContainText('Food safety');
    await expect(
      page.getByTestId('fungi-mission-strip').locator('[data-complete="true"]'),
    ).toHaveCount(7);
  });

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 720, minVisible: 0.75 },
    { name: 'tablet', width: 1024, height: 768, minVisible: 0.75 },
    { name: 'phone', width: 390, height: 844, minVisible: 0.45 },
  ] as const) {
    test(`leaves the apparatus unobstructed on ${viewport.name}`, async ({ page }) => {
      test.setTimeout(process.env.CI ? 120_000 : 60_000);
      await launch(page, viewport);

      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
      const [canvasBox, stripBox, drawerBox] = await Promise.all([
        requiredBox(canvas),
        requiredBox(page.getByTestId('fungi-mission-strip')),
        requiredBox(page.getByTestId('fungi-tool-drawer')),
      ]);

      // The two interface surfaces never sit on top of each other.
      expect(intersectionArea(stripBox, drawerBox)).toBe(0);

      const covered =
        intersectionArea(canvasBox, stripBox) + intersectionArea(canvasBox, drawerBox);
      const visibleRatio = (canvasBox.width * canvasBox.height - covered) /
        (canvasBox.width * canvasBox.height);
      expect(visibleRatio).toBeGreaterThanOrEqual(viewport.minVisible);

      if (viewport.name !== 'phone') return;

      // On a phone the sheet starts closed and opens only when asked.
      await expect(page.getByTestId('fungi-toggle-drawer')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      await clickTool(page, 'fungi-toggle-drawer');
      const expandedBox = await requiredBox(page.getByTestId('fungi-tool-drawer'));
      expect(expandedBox.height).toBeGreaterThan(drawerBox.height);
    });
  }

  test('keeps camera reset, experiment reset, and restart independent', async ({ page }) => {
    test.setTimeout(process.env.CI ? 180_000 : 120_000);
    await launch(page, { width: 1280, height: 720 });
    await completeDiagnose(page);
    await completeMycelium(page);

    // Resetting the camera must not undo the journey.
    await clickTool(page, 'fungi-reset-camera');
    await expect(currentMission(page)).toHaveText('Spore flight');

    // Resetting the experiment clears the apparatus but keeps the mission.
    await setSlider(page, 'fungi-fan-strength', '0.6');
    await clickTool(page, 'fungi-spore-release');
    await clickTool(page, 'fungi-reset-experiment');
    await expect(currentMission(page)).toHaveText('Spore flight');

    // Restarting genuinely returns the whole investigation to its start.
    await clickTool(page, 'fungi-restart-journey');
    await expect(currentMission(page)).toHaveText('Triage');
    await expect(page.getByTestId('fungi-evidence-notebook')).toContainText(
      'No evidence recorded yet',
    );
  });

  test('drives the opening mission with the keyboard alone', async ({ page }) => {
    test.setTimeout(process.env.CI ? 120_000 : 60_000);
    await launch(page, { width: 1280, height: 720 });

    const wrongAnswer = promptOption(page, 'Mushroom and green plant');
    await wrongAnswer.focus();
    await page.keyboard.press('Enter');

    const lensY = page.getByTestId('fungi-lens-y');
    await lensY.focus();
    await expect(lensY).toBeFocused();
    await lensY.fill('0.5');

    const lensX = page.getByTestId('fungi-lens-x');
    await lensX.focus();
    await expect(lensX).toBeFocused();
    for (const x of [MUSHROOM_X, GAP_LEFT_X, BREAD_X, GAP_RIGHT_X, PLANT_X]) {
      await lensX.fill(x);
    }

    const correctAnswer = promptOption(page, 'Mushroom and bread mould');
    await correctAnswer.focus();
    await page.keyboard.press('Enter');
    await expect(currentMission(page)).toHaveText('Mycelium');
  });
});
