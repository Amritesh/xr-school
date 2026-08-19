import { test, expect } from '@playwright/test';
test('scene 5 workplaces', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => { /* @ts-ignore */ window.speechSynthesis = { speak(){}, cancel(){}, getVoices: () => [] }; });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/simulations/c8-ch02-a03-fungi-and-its-development', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Explore in browser' }).click();
  await page.getByTestId('fungi-tool-drawer').waitFor();
  const mission = async () => (await page.getByTestId('fungi-current-mission').textContent())?.trim();
  const prompt = (t: string) => page.locator('.simulation-experience__assessment button', { hasText: t }).first();
  const tool = async (id: string) => {
    const c = page.getByTestId(id);
    await expect(c).toBeVisible();
    await c.evaluate((e: HTMLElement) => { e.scrollIntoView({ block: 'nearest' }); e.click(); });
  };
  await prompt('Mushroom and bread mould').click({ force: true });
  await page.getByTestId('fungi-lens-y').fill('0.5');
  for (const x of ['0.19','0.35','0.5','0.65','0.81']) await page.getByTestId('fungi-lens-x').fill(x);
  for (const [d, x] of [['0.2','0.15'],['0.5','0.5'],['0.8','0.85']]) {
    await page.getByTestId('fungi-focus-depth').fill(d);
    await page.getByTestId('fungi-trace-x').fill(x);
  }
  await prompt('Mycelium').click({ force: true });
  await page.getByTestId('fungi-fan-strength').fill('0');
  await tool('fungi-spore-release');
  await page.getByTestId('fungi-fan-strength').fill('0.6');
  await tool('fungi-spore-release');
  for (const s of ['spore-lands','hypha-grows','mycelium-spreads','structures-form','spores-release']) await tool(`fungi-stage-${s}`);
  await page.waitForTimeout(900);
  await page.getByTestId('fungi-proving-hours').fill('48');
  await tool('fungi-pipette-yeast');
  await page.waitForTimeout(800);

  // The camera centres the arrow target in the band left clear by the UI.
  for (const actor of ['yeast','antibiotic-producing-fungus','saprotrophic-fungus']) {
    await tool(`fungi-carry-${actor}`);
    await page.waitForTimeout(1400);
    await page.mouse.click(484, 308);
    await page.waitForTimeout(800);
    console.log(actor, '->', await mission());
  }
  await page.screenshot({ path: 'tmp/f-s5.png' });
});
