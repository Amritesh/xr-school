import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('world-builder documentation', () => {
  it('documents the fixed lifecycle, adaptive profiles, hidden science, and mastery rules', () => {
    const architecture = read('docs/architecture/world-builder.md');
    const designSystem = read(
      'docs/simulation-design/simulation-design-system.md',
    );

    expect(architecture).toContain('1 / 60');
    expect(architecture).toContain(
      'initialize → fixedUpdate → renderUpdate → dispose',
    );
    expect(designSystem).toContain('Quest Baseline');
    expect(designSystem).toContain('Hidden Scientific Models');
    expect(designSystem).toContain(
      'Misconception and Transfer Evidence',
    );
  });

  it('records automated W0 evidence without claiming unsigned Quest acceptance', () => {
    const release = read('docs/releases/w0-world-builder-foundation.md');

    expect(release).toContain('Automated acceptance');
    expect(release).toContain('Direct Quest acceptance');
    expect(release).toContain('UNSIGNED');
    expect(release).not.toContain('schoolValidated');
  });

  it('documents the shared immersive experience and unobstructed-view rules', () => {
    const architecture = read('docs/architecture/world-builder.md');
    const designSystem = read(
      'docs/simulation-design/simulation-design-system.md',
    );

    expect(architecture).toContain('normalized action');
    expect(architecture).toContain('headless lesson session');
    expect(architecture).toContain('off-axis cue bay');
    expect(designSystem).toContain('Unblocked Discovery View');
    expect(designSystem).toContain('direct manipulation');
    expect(designSystem).toContain('representational scale');
  });
});
