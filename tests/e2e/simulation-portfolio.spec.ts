import { expect, test, type Page } from '@playwright/test';

import {
  IMPLEMENTED_SIMULATIONS,
  resolveSimulationPath,
  routeForSimulation,
} from '../../packages/simulation-content/src/implemented/registry';

const released = IMPLEMENTED_SIMULATIONS.filter(
  definition => definition.module.publicationStatus === 'released',
);

async function launchBrowserExperience(page: Page): Promise<void> {
  const standardLaunch = page.getByTestId('simulation-launch');
  if (await standardLaunch.count()) {
    await standardLaunch.first().click();
    return;
  }
  const legacyLaunch = page.getByRole('button', {
    name: /explore in browser|view in browser|open adventure/i,
  });
  await expect(legacyLaunch.first()).toBeVisible();
  await legacyLaunch.first().click();
}

test.describe('released simulation portfolio', () => {
  test('has exactly 35 honest released records', () => {
    expect(released).toHaveLength(35);
    expect(released.every(
      definition => definition.module.evidenceMaturity === 'internalQA',
    )).toBe(true);
  });

  test('serves all 35 canonical routes with their release identity', async ({ request }) => {
    test.setTimeout(120_000);
    for (const definition of released) {
      const response = await request.get(routeForSimulation(definition));
      expect(response.status(), definition.module.slug).toBe(200);
      const html = await response.text();
      expect(html, definition.module.slug).toContain(
        `data-simulation-id="${definition.module.id}"`,
      );
      expect(html, definition.module.slug).toContain('data-publication-status="released"');
      expect(html, definition.module.slug).toContain('data-evidence-maturity="internalQA"');
    }
  });

  test('launches representative existing, guided, and investigation classes', async ({ page }) => {
    test.setTimeout(120_000);
    const representativeSlugs = [
      'c6-ch01-a01-sources-of-food',
      'c5-ch04-a01-food-spoilage',
      'c5-ch07-a01-a-concept-about-what-floats-what-sinks',
    ];
    for (const slug of representativeSlugs) {
      const definition = released.find(item => item.module.slug === slug)!;
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const routeFailures: string[] = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('response', response => {
        const url = response.url();
        if (
          url.includes(`/simulations/${definition.module.slug}/`)
          && response.status() >= 400
        ) {
          routeFailures.push(`${response.status()} ${url}`);
        }
      });

      const response = await page.goto(routeForSimulation(definition), {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-simulation-id]').first()).toHaveAttribute(
        'data-simulation-id',
        definition.module.id,
      );
      const audioPreference = page.getByLabel('Audio', { exact: true });
      if (await audioPreference.count()) await audioPreference.uncheck();
      const reducedMotion = page.getByLabel('Reduced motion', { exact: true });
      if (await reducedMotion.count()) await reducedMotion.check();
      await launchBrowserExperience(page);
      await expect(page.getByTestId('simulation-canvas').first()).toBeVisible();

      const stageTitle = page.getByTestId('stage-title');
      if (await stageTitle.count()) {
        await expect(stageTitle).toBeVisible();
        await expect(page.getByTestId('stage-cue')).not.toHaveText('');
        const primaryAction = page.getByTestId('primary-action');
        if (await primaryAction.count()) await expect(primaryAction).toBeVisible();
        else await expect(page.getByRole('button').first()).toBeVisible();
        const narrationReplay = page.getByTestId('narration-replay');
        if (await narrationReplay.count()) await expect(narrationReplay).toBeVisible();
        const restart = page.getByTestId('restart');
        if (await restart.count()) await expect(restart).toBeVisible();
      } else {
        // Pre-foundation classes retain their established HUD while sharing
        // canonical identity, route, canvas, release, and asset contracts.
        await expect(page.getByRole('heading').first()).toBeVisible();
      }

      expect(routeFailures).toEqual([]);
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    }
  });

  test('every declared legacy path redirects to its canonical class', async ({ page }) => {
    test.setTimeout(120_000);
    const legacyCases = released.flatMap(definition => {
      const inputs = [...new Set([
        ...definition.legacyPaths,
        ...(definition.module.legacyAliases ?? []).map(
          alias => `/simulations/${alias}`,
        ),
      ])];
      return inputs.map(path => ({ definition, path }));
    });
    expect(legacyCases.length).toBeGreaterThanOrEqual(23);

    for (const legacyCase of legacyCases) {
      const resolution = resolveSimulationPath(legacyCase.path);
      expect(resolution?.redirect).toBe(true);
      expect(resolution?.canonicalPath).toBe(
        routeForSimulation(legacyCase.definition),
      );
      const response = await page.request.get(legacyCase.path, {
        maxRedirects: 0,
      });
      expect([307, 308]).toContain(response.status());
      expect(response.headers().location).toBe(
        routeForSimulation(legacyCase.definition),
      );
    }
  });
});
