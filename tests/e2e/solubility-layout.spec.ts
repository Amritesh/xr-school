import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`solubility choices stay clear of captions at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/simulations/c5-ch07-a03-soluble-and-insoluble-substances');
    await page.getByLabel('Audio', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Explore in browser', exact: true }).click();
    const dock = page.locator('.simulation-experience__mission-dock');
    const choices = page.getByRole('group', { name: 'Investigation choices' });
    await expect(choices).toBeVisible();
    await expect(dock.getByTestId('interactive-choice')).toHaveCount(2);
    const caption = page.locator('.simulation-experience__caption');
    const captionBox = (await caption.boundingBox())!;
    const headerBox = (await page.locator('.simulation-experience__topbar').boundingBox())!;
    expect(captionBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
    const choiceBox = (await choices.boundingBox())!;
    expect(choiceBox.y).toBeGreaterThanOrEqual(captionBox.y + captionBox.height);
    expect(choiceBox.x).toBeGreaterThanOrEqual(0);
    expect(choiceBox.x + choiceBox.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: testInfo.outputPath('lab.png') });
    await choices.getByRole('button', { name: 'Table salt: soluble', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sugar: soluble', exact: true })).toBeVisible();
    await expect(caption).toHaveCount(1);
    for (let remaining = 0; remaining < 5; remaining += 1) {
      await choices.getByRole('button').first()
        .evaluate((element: HTMLButtonElement) => element.click());
    }
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    for (let trial = 0; trial < 6; trial += 1) {
      await page.getByRole('button', { name: /^Run equal .+ trial$/ })
        .evaluate((element: HTMLButtonElement) => element.click());
    }
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('group', { name: 'What did stirring change for sugar?' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Compare stirring', exact: true })
      .evaluate((element: HTMLButtonElement) => element.click());
    await page.getByRole('button', { name: 'Compare temperature', exact: true })
      .evaluate((element: HTMLButtonElement) => element.click());
    await page.getByRole('button', { name: 'It increased the dissolving rate, not equilibrium capacity', exact: true })
      .evaluate((element: HTMLButtonElement) => element.click());
    await page.getByRole('button', { name: 'Continue', exact: true })
      .evaluate((element: HTMLButtonElement) => element.click());
    await page.getByRole('button', { name: 'Salt particles remain dispersed through the solution', exact: true })
      .evaluate((element: HTMLButtonElement) => element.click());
    await page.getByRole('button', { name: 'Continue', exact: true })
      .evaluate((element: HTMLButtonElement) => element.click());
    await page.getByRole('button', { name: 'An insoluble suspension that can settle', exact: true })
      .evaluate((element: HTMLButtonElement) => element.click());
    await expect(page.getByTestId('completion')).toBeVisible();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(choices.getByRole('button', { name: 'Table salt: soluble', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
