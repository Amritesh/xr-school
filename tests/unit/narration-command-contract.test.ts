import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const packageManifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
) as { scripts: Record<string, string> };

describe('narration command contract', () => {
  it('validates shipped manifests without invoking an authoring provider', () => {
    expect(packageManifest.scripts['narration:validate']).toBe(
      'npm run build:packages && npm run narration:validate:manifests',
    );
    expect(packageManifest.scripts['narration:validate:manifests']).toBe(
      'node --import tsx scripts/validate-narration-manifests.ts',
    );

    const result = spawnSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'narration:validate'],
      { cwd: repositoryRoot, encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('Narration validation failed');
    expect(result.stdout).toMatch(/Validated \d+ narration manifests/u);

    for (const command of ['quality', 'verify']) {
      const script = packageManifest.scripts[command];
      expect(script.indexOf('npm run build:packages')).toBeGreaterThanOrEqual(0);
      expect(script.indexOf('npm run build:packages')).toBeLessThan(
        script.indexOf('npm run narration:validate:manifests'),
      );
    }
  });

  it('keeps networked narration generation behind an explicit author-only command', () => {
    expect(packageManifest.scripts['narration:author']).toBe(
      'node scripts/author-narration-assets.mjs',
    );
    for (const automaticCommand of ['build', 'quality', 'verify', 'test']) {
      expect(packageManifest.scripts[automaticCommand]).not.toContain(
        'narration:author',
      );
    }

    const result = spawnSync(
      process.execPath,
      [resolve(repositoryRoot, 'scripts/author-narration-assets.mjs')],
      { cwd: repositoryRoot, encoding: 'utf8' },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(
      /--manifest .* --provider edge-tts/u,
    );
  });
});
