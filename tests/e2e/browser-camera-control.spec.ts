import { expect, test, type Page } from '@playwright/test';

/**
 * Browser learners must be able to look around.
 *
 * Locomotion only moves the camera inside an immersive session, so before the
 * shared host gained orbit controls these simulations were fixed to whatever
 * pose the scene adapter authored. This asserts the rendered image actually
 * changes when the canvas is dragged, which is the part a learner cares about
 * and the part a unit test cannot cover.
 */

/**
 * Simulations on the shared host whose scenes draw something to look at.
 *
 * Only the interactive viewer qualifies today. The 18 guided simulations run
 * on the same host and get the same controls, but their declarative scenes
 * currently render an empty environment -- a flat background and a ground
 * band, no geometry -- so a turned camera produces an identical image and
 * there is nothing here to assert. That is a scene-content gap, tracked
 * separately from camera control; add them here once they draw their subject.
 */
const HOSTED_SIMULATIONS = [
  {
    name: 'interactive',
    path: '/simulations/c6-ch04-a01-sorting-materials-according-to-their-shape',
  },
] as const;

async function launch(page: Page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  const audio = page.getByLabel('Audio', { exact: true });
  if (await audio.count()) await audio.uncheck();
  await page.getByRole('button', { name: 'Explore in browser' }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  return canvas;
}

for (const simulation of HOSTED_SIMULATIONS) {
  test(`lets a browser learner turn the ${simulation.name} camera`, async ({ page }) => {
    test.setTimeout(process.env.CI ? 300_000 : 120_000);
    await page.goto(simulation.path, { waitUntil: 'networkidle' });
    const canvas = await launch(page);

    // The scene keeps drawing after the first frame, so settle before
    // comparing: a difference has to come from the drag, not from start-up.
    await expect
      .poll(async () => (await canvas.screenshot()).byteLength, { timeout: 60_000 })
      .toBeGreaterThan(0);
    await page.waitForTimeout(2_000);
    const before = await canvas.screenshot();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const midY = box!.y + box!.height / 2;
    await page.mouse.move(box!.x + box!.width * 0.35, midY);
    await page.mouse.down();
    // Well past the input router's 6px tap threshold, so this is a look and
    // never a click on scene furniture.
    await page.mouse.move(box!.x + box!.width * 0.7, midY, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(2_000);

    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });
}

// Tap-versus-drag is not asserted here. A short tap legitimately changes the
// image -- it commits a pick, which is the whole point of the input router's
// 6px threshold -- so pixels cannot tell an accidental orbit apart from a
// working interaction. That threshold is the router's own contract and is
// unchanged; orbit's per-event behaviour is covered in
// tests/unit/orbit-camera-controls.test.ts.
