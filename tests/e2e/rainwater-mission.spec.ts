import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const ROUTE = '/simulations/c5-ch06-a01-the-storage-of-rainwater';

async function readStats(page: Page) {
  const root = page.getByTestId('rainwater-mission');
  await expect(root).toHaveAttribute('data-render-draw-calls', /^[1-9]\d*$/, {
    timeout: 15_000,
  });
  // Stats publish once per second; wait for a frame from the current stage.
  await page.waitForTimeout(1_200);
  return {
    drawCalls: Number(await root.getAttribute('data-render-draw-calls')),
    triangles: Number(await root.getAttribute('data-render-triangles')),
  };
}

test.describe('rainwater mission', () => {
  test('records baseline render stats for every stage', async ({ page }) => {
    test.skip(!process.env.RAINWATER_BASELINE_OUT, 'baseline capture only');
    test.setTimeout(240_000);
    await page.goto(ROUTE);
    await page.getByRole('button', { name: /Start Mission in Browser/ }).click();
    const rows: string[] = [];
    for (let stage = 1; stage <= 13; stage += 1) {
      const stats = await readStats(page);
      rows.push(`| ${stage} | ${stats.drawCalls} | ${stats.triangles} |`);
      // The primary action button completes a stage, then continues.
      const panel = page.getByRole('button', { name: /Replay Droppy/ });
      await expect(panel).toBeVisible();
      if (stage === 13) break;
      await page.keyboard.press('Escape');
      const buttons = page.locator('button');
      const count = await buttons.count();
      for (let index = 0; index < count; index += 1) {
        const label = (await buttons.nth(index).innerText()).trim();
        if (/Previous|Next|Replay|VR/.test(label)) continue;
        await buttons.nth(index).click();
        break;
      }
      await page.getByRole('button', { name: /^Next/ }).click();
    }
    writeFileSync(process.env.RAINWATER_BASELINE_OUT!, `${rows.join('\n')}\n`);
  });
});
