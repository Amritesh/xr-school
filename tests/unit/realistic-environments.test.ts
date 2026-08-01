import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { GUIDED_IMPLEMENTED_SIMULATIONS } from '@xr-school/simulation-content';

describe('Canonical guided environments', () => {
  it('assigns one topic-specific local environment to every guided class', () => {
    expect(GUIDED_IMPLEMENTED_SIMULATIONS).toHaveLength(17);
    for (const record of GUIDED_IMPLEMENTED_SIMULATIONS) {
      const environments = record.assets.assets.filter(asset => asset.kind === 'environment');
      expect(environments, record.module.slug).toHaveLength(1);
      const environment = environments[0];
      expect(environment.url).toBe(`/simulations/${record.module.slug}/environment.webp`);
      expect(existsSync(resolve(process.cwd(), 'apps/web/public', environment.url.slice(1)))).toBe(true);
    }
  });

  it('loads and disposes the shared environment texture', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'apps/web/lib/simulations/guided/createDeclarativeGuidedSceneWorld.ts'),
      'utf8',
    );
    expect(source).toContain('metadata.environmentUrl');
    expect(source).toContain('context.scene.background = texture');
    expect(source).toContain('environmentTexture?.dispose()');
    expect(source).toContain('disposeObject(root)');
  });
});
