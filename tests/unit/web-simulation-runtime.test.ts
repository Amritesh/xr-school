import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('web simulation runtime host', () => {
  it('owns the renderer loop, adaptive presentation, and resource disposal', () => {
    const source = readFileSync(resolve(
      process.cwd(),
      'apps/web/lib/world-builder/webSimulationRuntime.ts',
    ), 'utf8');

    expect(source).toContain('createWorldRuntime');
    expect(source).toContain('createPresentationPipeline');
    expect(source).toContain('detectDeviceProfile');
    expect(source).toContain('renderer.setAnimationLoop');
    expect(source).toContain('resourceRegistry.disposeAll');
    expect(source).toContain("renderer.xr.addEventListener('sessionstart'");
    expect(source).toContain("renderer.xr.addEventListener('sessionend'");
  });
});
