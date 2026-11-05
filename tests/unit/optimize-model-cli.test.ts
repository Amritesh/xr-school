import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('optimize-model script', () => {
  it('refuses a model with no licence record', () => {
    const result = spawnSync(
      process.execPath,
      [
        'scripts/optimize-model.mjs',
        'source.glb',
        'house',
        '--group',
        'rainwater',
        '--source',
        'https://example.test',
        '--author',
        'Someone',
        '--modifications',
        'None',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing: license');
  });
});
