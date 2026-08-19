import { test, expect } from '@playwright/test';
test('the class reaches Mission Complete', async ({ page }) => {
  test.setTimeout(600_000);
  await page.addInitScript(() => {
    // @ts-ignore
    window.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/simulations/c8-ch02-a03-fungi-and-its-development', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Explore in browser' }).click();
  await page.getByTestId('fungi-tool-drawer').waitFor();
  const prompt = async (t: string) => {
    const b = page.locator('.simulation-experience__assessment button', { hasText: t }).first();
    await expect(b).toBeVisible();
    await b.evaluate((e: HTMLElement) => e.click());
  };
  const tool = async (id: string) => {
    const c = page.getByTestId(id);
    await expect(c).toBeVisible();
    await c.evaluate((e: HTMLElement) => { e.scrollIntoView({ block: 'nearest' }); e.click(); });
  };
  await prompt('Mushroom and bread mould');
  await page.getByTestId('fungi-lens-y').fill('0.5');
  for (const x of ['0.19','0.35','0.5','0.65','0.81']) await page.getByTestId('fungi-lens-x').fill(x);
  for (const [d, x] of [['0.2','0.15'],['0.5','0.5'],['0.8','0.85']]) {
    await page.getByTestId('fungi-focus-depth').fill(d);
    await page.getByTestId('fungi-trace-x').fill(x);
  }
  await prompt('Mycelium');
  await page.getByTestId('fungi-fan-strength').fill('0');
  await tool('fungi-spore-release');
  await page.getByTestId('fungi-fan-strength').fill('0.6');
  await tool('fungi-spore-release');
  for (const s of ['spore-lands','hypha-grows','mycelium-spreads','structures-form','spores-release']) await tool(`fungi-stage-${s}`);
  await page.getByTestId('fungi-proving-hours').fill('48');
  await tool('fungi-pipette-yeast');
  for (const [actor, place] of [['yeast','bakery'],['antibiotic-producing-fungus','laboratory'],['saprotrophic-fungus','compost-pit']]) {
    await tool(`fungi-carry-${actor}`);
    await tool(`fungi-place-${place}`);
  }
  await page.getByTestId('fungi-scanner-depth').fill('0.9');
  await tool('fungi-safety-fresh');
  await tool('fungi-safety-mouldy');
  await prompt('Reject');
  await prompt('Cool');
  await tool('fungi-distinguish-spoilage-harmful-decomposition-useful');
  await expect(page.getByTestId('fungi-mission-complete')).toBeVisible({ timeout: 20_000 });
  console.log('COMPLETE:', (await page.getByTestId('fungi-mission-complete').textContent())?.slice(0, 55));
  await page.screenshot({ path: 'tmp/mission-complete.png' });
});
