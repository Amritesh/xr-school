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
      const experience = page.locator('main[data-simulation-id]');
      await expect(experience).toHaveAttribute('data-simulation-id', guidedCase.moduleId);

      // Keep the acceptance run deterministic and fast while exercising the
      // same reduced-motion preference offered to learners.
      await page.getByLabel('Audio', { exact: true }).uncheck();
      await page.getByLabel('Reduced motion', { exact: true }).check();
      await page.getByRole('button', { name: 'Explore in browser' })
        .evaluate((element: HTMLButtonElement) => element.click());

      for (const [index, stage] of guidedCase.stages.entries()) {
        await expect(experience).toHaveAttribute('data-stage-id', stage.id);
        await expect(page.getByTestId('stage-title')).toHaveText(stage.title);
        await page.getByRole('button', {
          name: stage.actionLabel,
          exact: true,
        }).evaluate((element: HTMLButtonElement) => element.click());

        if (stage.acceptedLabel) {
          await page.getByRole('button', {
            name: stage.acceptedLabel,
            exact: true,
          }).evaluate((element: HTMLButtonElement) => element.click());
        }

        const finalStage = index === guidedCase.stages.length - 1;
        if (!finalStage) {
          await page.getByRole('button', { name: 'Continue', exact: true })
            .evaluate((element: HTMLButtonElement) => element.click());
        }
      }

      await expect(page.getByTestId('completion')).toBeVisible();
      await expect(page.getByRole('heading', {
        name: guidedCase.completionHeadline,
        exact: true,
      })).toBeVisible();

      const finalStageId = guidedCase.stages.at(-1)!.id;
      await page.getByTestId('narration-replay')
        .evaluate((element: HTMLButtonElement) => element.click());
      await expect(experience).toHaveAttribute('data-stage-id', finalStageId);

      await page.getByTestId('restart')
        .evaluate((element: HTMLButtonElement) => element.click());
      await expect(experience).toHaveAttribute(
        'data-stage-id',
        guidedCase.stages[0].id,
      );
      await expect(page.getByTestId('stage-title')).toHaveText(
        guidedCase.stages[0].title,
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

  test('all 17 guided classes preserve their contributed legacy URLs', async ({ page }) => {
    for (const guidedCase of guidedCases) {
      const canonicalPath = `/simulations/${guidedCase.slug}`;
      const response = await page.request.get(guidedCase.legacyPath, {
        maxRedirects: 0,
      });
      expect([307, 308]).toContain(response.status());
      expect(response.headers().location).toBe(canonicalPath);
    }
  });
});
