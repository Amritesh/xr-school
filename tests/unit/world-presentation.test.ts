import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createMaterialFactory,
  textureColorSpaceForChannel,
  validateMaterialForProfile,
} from '../../apps/web/lib/world-builder/materialFactory';

describe('world presentation adapters', () => {
  const presentationSource = readFileSync(
    resolve(
      process.cwd(),
      'packages/simulation-web/src/presentation/createPresentationPipeline.ts',
    ),
    'utf8',
  );

  it('keeps world-builder presentation and device helpers as package forwarders', () => {
    const presentationShim = readFileSync(
      resolve(process.cwd(), 'apps/web/lib/world-builder/presentationPipeline.ts'),
      'utf8',
    );
    const deviceShim = readFileSync(
      resolve(process.cwd(), 'apps/web/lib/world-builder/deviceProfile.ts'),
      'utf8',
    );

    expect(presentationShim).toContain("from '@xr-school/simulation-web'");
    expect(deviceShim).toContain("from '@xr-school/simulation-web'");
    expect(presentationShim).not.toContain('three/addons/postprocessing');
    expect(deviceShim).not.toContain('packages/simulation-runtime/src');
  });

  it('uses sRGB only for color-bearing texture channels', () => {
    expect(textureColorSpaceForChannel('baseColor')).toBe('srgb');
    expect(textureColorSpaceForChannel('emissive')).toBe('srgb');
    expect(textureColorSpaceForChannel('normal')).toBe('none');
    expect(textureColorSpaceForChannel('roughness')).toBe('none');
    expect(textureColorSpaceForChannel('ambientOcclusion')).toBe('none');
  });

  it('rejects transmission-heavy materials on Quest baseline', () => {
    expect(validateMaterialForProfile(
      {
        id: 'glass',
        model: 'physical',
        baseColor: '#ffffff',
        roughness: 0.05,
        metalness: 0,
        transmission: 1,
      },
      'questBaseline',
    )).toContain('glass: transmission is not allowed by questBaseline');
  });

  it('keeps full-screen post-processing out of immersive XR', () => {
    expect(presentationSource).toContain('renderer.xr.isPresenting');
    expect(presentationSource).toContain('renderer.render(scene, camera)');
    expect(presentationSource).toContain('composer.render()');
  });

  it('keeps the canvas CSS size aligned with the logical viewport', () => {
    expect(presentationSource).toContain('renderer.setSize(width, height);');
    expect(presentationSource).not.toContain('renderer.setSize(width, height, false)');
  });

  it('caps composer and antialiasing resolution to the active quality profile', () => {
    expect(presentationSource).toContain(
      'const cappedPixelRatio = Math.min(pixelRatio, PROFILES[profileId].maxPixelRatio)',
    );
    expect(presentationSource).toContain(
      'new SMAAPass(width * cappedPixelRatio, height * cappedPixelRatio)',
    );
    expect(presentationSource).toContain('composer.setPixelRatio(cappedPixelRatio)');
  });

  it('does not pass absent texture maps to Three.js material constructors', async () => {
    const warn = vi.spyOn(console, 'warn');
    const factory = createMaterialFactory({
      assets: { id: 'assets-test', assets: [] },
      materials: [],
      qualityProfileId: 'browserBalanced',
      maxAnisotropy: 8,
    });

    await factory.create({
      id: 'plain',
      model: 'standard',
      baseColor: '#77d8d4',
      roughness: 0.4,
      metalness: 0,
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    factory.dispose();
  });
});
