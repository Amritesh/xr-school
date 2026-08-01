import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('web simulation runtime host', () => {
  it('keeps the app path as a compatibility forwarder to the library host', () => {
    const appSource = readFileSync(resolve(
      process.cwd(),
      'apps/web/lib/world-builder/webSimulationRuntime.ts',
    ), 'utf8');
    const librarySource = readFileSync(resolve(
      process.cwd(),
      'packages/simulation-web/src/compat/createWebSimulationRuntime.ts',
    ), 'utf8');

    expect(appSource).toContain("from '@xr-school/simulation-web'");
    expect(appSource).not.toContain('new THREE.WebGLRenderer');
    expect(librarySource).toContain('createWorldRuntime');
    expect(librarySource).toContain('createPresentationPipeline');
    expect(librarySource).toContain('detectDeviceProfile');
    expect(librarySource).toContain('renderer.setAnimationLoop');
    expect(librarySource).toContain('resourceRegistry.disposeAll');
    expect(librarySource).toContain("renderer.xr.addEventListener('sessionstart'");
    expect(librarySource).toContain("renderer.xr.addEventListener('sessionend'");
  });

  it('keeps Rapier out of non-rigid-body client bundles', () => {
    const clientFiles = [
      'apps/web/lib/runtimePhysics.ts',
      'apps/web/lib/world-builder/deviceProfile.ts',
      'apps/web/lib/world-builder/webSimulationRuntime.ts',
      'apps/web/components/simulations/PollinationViewer.tsx',
      'apps/web/components/simulations/CircuitViewer.tsx',
      'apps/web/components/simulations/StatesOfMatterViewer.tsx',
    ];
    for (const file of clientFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source, file).not.toContain('simulation-runtime/src/index');
    }
  });
});
