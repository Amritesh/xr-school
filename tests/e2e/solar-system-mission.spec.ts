import { expect, test } from '@playwright/test';

const solarSystemUrl = process.env.SOLAR_SYSTEM_URL
  ?? 'http://127.0.0.1:3000/simulations/c8-10-science-solar-system';

test('launches the solar mission with textures and accessible learning actions', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(solarSystemUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Explore in browser' }).click();

  await expect(page.getByRole('region', { name: 'Solar system mission actions' })).toBeVisible();
  await expect(page.getByText('Select the Sun', { exact: true }).last()).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  const textureResponse = await page.request.get(
    new URL('/solar-system/textures/earth.webp', solarSystemUrl).toString(),
  );
  expect(textureResponse.ok()).toBe(true);
  expect(textureResponse.headers()['content-type']).toContain('image/webp');
  expect(pageErrors).toEqual([]);
});

test('completes the inquiry and opens the free observatory', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(solarSystemUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Explore in browser' }).click();

  const continueMission = async () => {
    await page.getByRole('button', { name: 'Continue' }).click();
  };

  await page.getByRole('button', { name: 'Select the Sun' }).click();
  await continueMission();
  await page.getByRole('button', { name: 'Power the gravity lens' }).click();
  await continueMission();

  await page.getByRole('button', { name: 'Mercury will finish first' }).click();
  await expect(async () => {
    await page.getByRole('button', { name: 'Mercury won' }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 700 });
  }).toPass({ timeout: 15_000, intervals: [1_000] });
  await continueMission();

  await page.getByRole('button', { name: 'Venus is hottest' }).click();
  await page.getByRole('button', { name: 'Probe Mercury' }).click();
  await page.getByRole('button', { name: 'Probe Venus' }).click();
  await continueMission();

  for (const action of ['Inspect Jupiter', 'Inspect Saturn', 'Inspect Uranus', 'Inspect Neptune']) {
    await page.getByRole('button', { name: action }).click();
  }
  await continueMission();

  await page.getByRole('button', { name: 'Pull the true-scale lever' }).click();
  await page.waitForTimeout(3_500);
  await page.getByRole('button', { name: 'Find Earth' }).click();
  await continueMission();

  await page.getByRole('button', { name: 'Tail points away from the Sun' }).click();
  await page.getByRole('button', { name: 'Ride the comet' }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 30_000 });
  await continueMission();

  await page.getByRole('button', { name: 'Its year is longer' }).click();
  await page.getByRole('button', { name: 'Collect your mission badge' }).click();
  await expect(page.getByText('Solar System Explorer', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open observatory' }).click();

  await expect(page.getByRole('region', { name: 'Solar system observatory' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Compare worlds' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gravity vectors' })).toBeVisible();
});
