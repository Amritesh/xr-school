import { expect, test } from '@playwright/test';
import {
  GUIDED_IMPLEMENTED_SIMULATIONS,
  GUIDED_SIMULATION_DEFINITIONS,
} from '@xr-school/simulation-content';

const baseUrl = process.env.XR_BASE_URL ?? 'http://127.0.0.1:3000';

const guidedCases = GUIDED_IMPLEMENTED_SIMULATIONS.map(record => {
  if (record.kind !== 'guided') {
    throw new Error(`${record.module.id}: expected a guided definition`);
  }
  const guidance = GUIDED_SIMULATION_DEFINITIONS.find(
    definition => definition.moduleId === record.module.id,
  );
  if (!guidance) {
    throw new Error(`${record.module.id}: missing guided presentation definition`);
  }
  return {
    moduleId: record.module.id,
    slug: record.module.slug,
    legacyPath: record.legacyPaths[0],
    completionHeadline: guidance.completion.headline,
    stages: guidance.stages.map(stage => {
      const promptId = stage.misconceptionId ?? stage.transferPromptId;
      const prompt = promptId
        ? record.assessment.prompts.find(item => item.id === promptId)
        : undefined;
      const acceptedOption = prompt?.options?.find(option =>
        prompt.acceptedEvidenceIds.includes(option.id));
      if (prompt && !acceptedOption) {
        throw new Error(`${record.module.id}/${stage.id}: missing accepted option`);
      }
      return {
        id: stage.id,
        title: stage.title,
        actionLabel: stage.actionLabel,
        acceptedLabel: acceptedOption?.label,
      };
    }),
  };
});

test.describe('released guided simulation routes', () => {
  // Every definition is exercised through controller/model unit tests and the
  // complete route portfolio below. One long-form browser journey proves the
  // shared guided composition end-to-end without repeating the same GPU-heavy
  // host flow 17 times.
  for (const guidedCase of guidedCases.slice(0, 1)) {
    test(`${guidedCase.slug} completes its evidence-gated class`, async ({ page }) => {
      test.setTimeout(process.env.CI ? 300_000 : 90_000);
      const pageErrors: string[] = [];
      const failedRequiredAssets: string[] = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('response', response => {
        const url = response.url();
        if (
          url.includes(`/simulations/${guidedCase.slug}/`)
          && response.status() >= 400
        ) {
          failedRequiredAssets.push(`${response.status()} ${url}`);
        }
      });

      await page.goto(`${baseUrl}/simulations/${guidedCase.slug}`, {
        waitUntil: 'networkidle',
      });
      const experience = page.locator('[data-simulation-id]').first();
      await expect(experience).toHaveAttribute('data-simulation-id', guidedCase.moduleId);
      await page.getByRole('button', { name: 'View in Browser' }).click();
      await expect(page.getByTestId('simulation-canvas')).toBeVisible();

      for (const stage of guidedCase.stages.slice(0, -1)) {
        await expect(page.getByRole('heading', {
          name: stage.title,
          exact: true,
        })).toBeVisible();
        await page.getByRole('button', {
          name: stage.actionLabel,
          exact: true,
        }).click();
      }

      await expect(page.getByRole('heading', {
        name: guidedCase.stages.at(-1)!.title,
        exact: true,
      })).toBeVisible();
      await expect(page.getByRole('status')).toHaveText(
        'Conclusion: safe storage slows spoilage',
      );

      const environmentResponse = await page.request.get(
        `${baseUrl}/simulations/${guidedCase.slug}/environment.webp`,
      );
      expect(environmentResponse.ok()).toBe(true);
      expect(environmentResponse.headers()['content-type']).toContain('image/webp');
      expect(failedRequiredAssets).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

  }

  test('all guided classes with contributed legacy URLs preserve them', async ({ page }) => {
    for (const guidedCase of guidedCases.filter(item => item.legacyPath)) {
      const canonicalPath = `/simulations/${guidedCase.slug}`;
      const response = await page.request.get(guidedCase.legacyPath, {
        maxRedirects: 0,
      });
      expect([307, 308]).toContain(response.status());
      expect(response.headers().location).toBe(canonicalPath);
    }
  });
});
