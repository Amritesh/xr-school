import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  textureColorSpaceForChannel,
  validateMaterialForProfile,
} from '../../apps/web/lib/world-builder/materialFactory';

describe('world presentation adapters', () => {
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
    const source = readFileSync(
      resolve(process.cwd(), 'apps/web/lib/world-builder/presentationPipeline.ts'),
      'utf8',
    );

    expect(source).toContain('renderer.xr.isPresenting');
    expect(source).toContain('renderer.render(scene, camera)');
    expect(source).toContain('composer.render()');
  });
});
