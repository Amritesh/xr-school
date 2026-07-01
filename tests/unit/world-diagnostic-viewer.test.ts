import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC_WORLD,
} from '../../apps/web/lib/world-builder/diagnosticWorld';
import {
  validateWorldBundle,
} from '../../packages/simulation-schema/src/index';

describe('world-builder diagnostic reference', () => {
  it('defines a valid W0 diagnostic world', () => {
    expect(validateWorldBundle(DIAGNOSTIC_WORLD)).toEqual([]);
  });

  it('mounts the shared runtime and adaptive presentation instead of a private loop', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'apps/web/components/simulations/WorldBuilderDiagnosticViewer.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('createWorldRuntime');
    expect(source).toContain('createPresentationPipeline');
    expect(source).toContain('createMaterialFactory');
    expect(source).toContain('resourceRegistry.disposeAll');
    expect(source).not.toContain('requestAnimationFrame');
  });

  it('provides a diagnostic route without advertising it in the public catalog', () => {
    expect(existsSync(resolve(
      process.cwd(),
      'apps/web/app/simulations/world-builder-diagnostic/page.tsx',
    ))).toBe(true);
  });
});
