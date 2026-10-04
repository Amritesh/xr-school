import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`Money Town full lesson and visible scene at ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/simulations/c1-math-ch01-introduction-to-money');
    await page
      .getByRole('button', { name: 'Open Money Town', exact: true })
      .click();
    await page.getByRole('button', { name: 'Voice on', exact: true }).click();
    const next = page.getByRole('button', { name: 'Next stage' });
    const choices = page.getByRole('group', { name: 'Money choices' });
    const choose = async (name: string) =>
      choices.getByRole('button', { name, exact: true }).click();
    await expect(next).toBeDisabled();
    await choose('Enter');
    await next.click();
    const scene = (await page
      .getByRole('region', { name: 'Money Town scene' })
      .boundingBox())!;
    const panel = (await page
      .getByRole('complementary', { name: 'Money activity' })
      .boundingBox())!;
    const header = (await page.locator('header').boundingBox())!;
    expect(scene.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(scene.height).toBeGreaterThanOrEqual(180);
    expect(
      scene.y + scene.height <= panel.y + 1 ||
        scene.x + scene.width <= panel.x + 1,
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('learning-coins.png') });
    for (const value of [1, 2, 5, 10]) {
      await expect(choices.getByRole('button')).toHaveCount(1);
      await choose(`Inspect Rs ${value} Coin`);
    }
    await next.click();
    for (const value of [10, 20, 50, 100, 200, 500])
      await choose(`Inspect Rs ${value} Note`);
    await next.click();
    await choose('Coin side');
    await choose('Note side');
    await next.click();
    await expect(choices.getByRole('button')).toHaveCount(4);
    await expect(
      page.getByRole('img', { name: 'Money Town world' }),
    ).toHaveAttribute('data-scene-choice-count', '4');
    await choose('Rs 20 Note');
    await expect(next).toBeDisabled();
    await expect(
      page.getByText('Find the Rs 1 Coin.', { exact: true }),
    ).toBeVisible();
    for (const name of [
      'Rs 1 Coin',
      'Rs 10 Coin',
      'Rs 20 Note',
      'Rs 100 Note',
      'Rs 500 Note',
    ])
      await choose(name);
    await next.click();
    await choose('Apple · Rs 10');
    await choose('Rs 5 Coin');
    await expect(
      page.getByText('0 / 3 items paid for', { exact: true }),
    ).toBeVisible();
    await choose('Rs 10 Note');
    await choose('Balloon · Rs 5');
    await choose('Rs 5 Coin');
    await choose('Candy · Rs 2');
    await choose('Rs 2 Coin');
    await next.click();
    await expect(
      page.getByRole('figure', { name: 'Money to identify' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Finish Memory Check' }),
    ).toHaveCount(0);
    await expect(next).toBeDisabled();
    await choose('Rs 1 Coin');
    await expect(next).toBeDisabled();
    await expect(
      page
        .getByRole('figure', { name: 'Money to identify' })
        .getByRole('img', { name: 'Rs 5 Coin' }),
    ).toBeVisible();
    for (const name of [
      'Rs 5 Coin',
      'Rs 100 Note',
      'Rs 5 Coin',
      'Rs 20 Note',
      'Rs 10 Coin',
      'Rs 500 Note',
      'Money',
      'Coin',
    ])
      await choose(name);
    await expect(next).toBeDisabled();
    await choose('Finish Memory Check');
    await next.click();
    await expect(
      page.getByRole('heading', { name: 'Money Explorer Celebration' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Restart Money Town' }).click();
    await expect(
      choices.getByRole('button', { name: 'Enter', exact: true }),
    ).toBeVisible();
    await expect(next).toBeDisabled();
    expect(errors).toEqual([]);
  });
}
