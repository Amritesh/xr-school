import { expect, test } from '@playwright/test';

import { PR8_CONTRIBUTIONS } from '../../scripts/lib/pr8-quality-evidence';

const expectedSha = process.env.XR_EXPECTED_SHA;

test.describe('deployed simulation release', () => {
  test.skip(!expectedSha, 'XR_EXPECTED_SHA is required for hosted acceptance');

  test('serves the expected 35-class internal-QA release', async ({ page, request }) => {
    test.setTimeout(660_000);
    const deadline = Date.now() + 600_000;
    let metadata: Record<string, unknown> | undefined;
    while (Date.now() < deadline) {
      const response = await request.get('/api/release', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.ok()) {
        const candidate = await response.json() as Record<string, unknown>;
        if (candidate.commitSha === expectedSha) {
          metadata = candidate;
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 10_000));
    }
    expect(metadata).toEqual({
      commitSha: expectedSha,
      publiclyLaunchable: 35,
      evidenceMaturity: {
        internalQA: 35,
        deviceVerified: 0,
        classroomVerified: 0,
      },
    });

    for (const contribution of PR8_CONTRIBUTIONS) {
      const response = await page.goto(
        `/simulations/${contribution.canonicalSlug}`,
        { waitUntil: 'domcontentloaded' },
      );
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-simulation-id]').first()).toBeAttached();
      await expect(page.getByTestId('simulation-canvas').first()).toBeVisible();
    }
  });
});
