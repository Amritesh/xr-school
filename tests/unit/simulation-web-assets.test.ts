import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createResourceRegistry } from '@xr-school/simulation-runtime';
import type {
  AssetDefinition,
  AssetManifest,
  EnvironmentDefinition,
} from '@xr-school/simulation-schema';
import { loadManifestAsset } from '../../packages/simulation-web/src/assets/loadManifestAsset';
import { createEnvironment } from '../../packages/simulation-web/src/environment/createEnvironment';

function asset(
  id: string,
  fallbackAssetId?: string,
): AssetDefinition {
  return {
    id,
    url: `/assets/${id}.webp`,
    kind: 'texture',
    source: 'test fixture',
    license: 'CC0-1.0',
    author: 'XR School tests',
    width: 16,
    height: 16,
    channels: ['baseColor'],
    compression: 'webp',
    ...(fallbackAssetId ? { fallbackAssetId } : {}),
  };
}

describe('loadManifestAsset', () => {
  it('uses only a declared fallback and registers its successful disposable', async () => {
    const manifest: AssetManifest = {
      id: 'test-assets',
      assets: [asset('primary', 'fallback'), asset('fallback')],
    };
    const resources = createResourceRegistry();
    const dispose = vi.fn();
    const diagnostics: string[] = [];

    const loaded = await loadManifestAsset({
      manifest,
      assetId: 'primary',
      resources,
      async load(definition) {
        if (definition.id === 'primary') throw new Error('decode failed');
        return { definition, dispose };
      },
      onDiagnostic: diagnostic => diagnostics.push(diagnostic.message),
    });

    expect(loaded.definition.id).toBe('fallback');
    expect(resources.leaks()).toEqual(['asset:test-assets:primary']);
    expect(diagnostics).toEqual([
      'primary failed; using declared fallback fallback',
    ]);
    await resources.disposeAll();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('disposes a loaded value when resource registration rejects it', async () => {
    const manifest: AssetManifest = {
      id: 'duplicate-assets',
      assets: [asset('texture')],
    };
    const resources = createResourceRegistry();
    const firstDispose = vi.fn();
    const secondDispose = vi.fn();
    const values = [
      { dispose: firstDispose },
      { dispose: secondDispose },
    ];
    const config = {
      manifest,
      assetId: 'texture',
      resources,
      load: vi.fn(async () => values.shift()!),
    };

    await loadManifestAsset(config);
    await expect(loadManifestAsset(config)).rejects.toThrow(/duplicate resource/i);

    expect(secondDispose).toHaveBeenCalledOnce();
    await resources.disposeAll();
    expect(firstDispose).toHaveBeenCalledOnce();
  });
});

describe('createEnvironment', () => {
  it('keeps the app environment path as a public-package compatibility facade', () => {
    const source = readFileSync(resolve(
      process.cwd(),
      'apps/web/lib/world-builder/environmentFactory.ts',
    ), 'utf8');

    expect(source).toContain("from '@xr-school/simulation-web'");
    expect(source).toContain('AssetLoadDiagnostic as AssetDiagnostic');
    expect(source).not.toContain('packages/simulation-schema/src');
    expect(source).not.toContain('new THREE.PMREMGenerator');
  });

  it('fails closed with a diagnostic for unsupported background kinds', async () => {
    const scene = new THREE.Scene();
    const renderer = {
      shadowMap: { enabled: false, type: 0 },
      toneMapping: THREE.NoToneMapping,
      toneMappingExposure: 1,
      outputColorSpace: THREE.LinearSRGBColorSpace,
    } as unknown as THREE.WebGLRenderer;
    const onDiagnostic = vi.fn();

    await expect(createEnvironment({
      renderer,
      scene,
      definition: {
        id: 'unsupported-background',
        background: { kind: 'gradient', value: '#000000,#ffffff' },
        keyLight: {
          id: 'key',
          kind: 'ambient',
          color: '#ffffff',
          intensity: 1,
        },
        accentLights: [],
        shadowCasters: [],
        exposure: 1,
        toneMapping: 'ACESFilmic',
      },
      assets: { id: 'empty-assets', assets: [] },
      onDiagnostic,
    })).rejects.toThrow(/unsupported background kind gradient/i);

    expect(onDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'error',
      message: expect.stringMatching(/unsupported background kind gradient/i),
    }));
    expect(scene.children).toHaveLength(0);
    expect(scene.background).toBeNull();
    expect(renderer.toneMapping).toBe(THREE.NoToneMapping);
  });

  it('loads texture backgrounds only through their manifest asset', async () => {
    const scene = new THREE.Scene();
    const renderer = {
      shadowMap: { enabled: false, type: 0 },
      toneMapping: THREE.NoToneMapping,
      toneMappingExposure: 1,
      outputColorSpace: THREE.LinearSRGBColorSpace,
    } as unknown as THREE.WebGLRenderer;
    const background = new THREE.Texture();
    const dispose = vi.spyOn(background, 'dispose');
    const textureLoader = {
      loadAsync: vi.fn(async () => background),
    };

    const environment = await createEnvironment({
      renderer,
      scene,
      definition: {
        id: 'texture-background',
        background: { kind: 'texture', value: 'classroom-background' },
        keyLight: {
          id: 'key',
          kind: 'ambient',
          color: '#ffffff',
          intensity: 1,
        },
        accentLights: [],
        shadowCasters: [],
        exposure: 1,
        toneMapping: 'ACESFilmic',
      },
      assets: {
        id: 'background-assets',
        assets: [asset('classroom-background')],
      },
      textureLoader: textureLoader as unknown as THREE.TextureLoader,
    });

    expect(textureLoader.loadAsync).toHaveBeenCalledWith(
      '/assets/classroom-background.webp',
    );
    expect(scene.background).toBe(background);
    await environment.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(scene.background).toBeNull();
  });

  it('loads a declared environment fallback and releases every owned resource', async () => {
    const scene = new THREE.Scene();
    const renderer = {
      shadowMap: { enabled: false, type: 0 },
      toneMapping: THREE.NoToneMapping,
      toneMappingExposure: 1,
      outputColorSpace: THREE.LinearSRGBColorSpace,
    } as unknown as THREE.WebGLRenderer;
    const definition: EnvironmentDefinition = {
      id: 'test-environment',
      background: { kind: 'color', value: '#102030' },
      environmentMap: 'environment-primary',
      keyLight: {
        id: 'key',
        kind: 'directional',
        color: '#ffffff',
        intensity: 1,
      },
      accentLights: [],
      shadowCasters: [],
      exposure: 1.1,
      toneMapping: 'ACESFilmic',
    };
    const assets: AssetManifest = {
      id: 'environment-assets',
      assets: [
        { ...asset('environment-primary', 'environment-fallback'), kind: 'environment' },
        { ...asset('environment-fallback'), kind: 'environment' },
      ],
    };
    const sourceTexture = new THREE.Texture();
    const sourceDispose = vi.spyOn(sourceTexture, 'dispose');
    const environmentTexture = new THREE.Texture();
    const renderTarget = { texture: environmentTexture, dispose: vi.fn() };
    const pmrem = {
      compileEquirectangularShader: vi.fn(),
      fromEquirectangular: vi.fn(() => renderTarget),
      dispose: vi.fn(),
    };
    const textureLoader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes('primary')) throw new Error('primary missing');
        return sourceTexture;
      }),
    };

    const environment = await createEnvironment({
      renderer,
      scene,
      definition,
      assets,
      textureLoader: textureLoader as unknown as THREE.TextureLoader,
      createPmrem: () => pmrem,
    });

    expect(scene.environment).toBe(environmentTexture);
    expect(textureLoader.loadAsync.mock.calls.map(([url]) => url)).toEqual([
      '/assets/environment-primary.webp',
      '/assets/environment-fallback.webp',
    ]);
    await environment.dispose();
    expect(scene.environment).toBeNull();
    expect(sourceDispose).toHaveBeenCalledOnce();
    expect(renderTarget.dispose).toHaveBeenCalledOnce();
    expect(pmrem.dispose).toHaveBeenCalledOnce();
  });

  it('rolls back the PMREM generator and source texture when conversion fails', async () => {
    const scene = new THREE.Scene();
    const renderer = {
      shadowMap: { enabled: false, type: 0 },
      toneMapping: THREE.NoToneMapping,
      toneMappingExposure: 1,
      outputColorSpace: THREE.LinearSRGBColorSpace,
    } as unknown as THREE.WebGLRenderer;
    const definition: EnvironmentDefinition = {
      id: 'failing-environment',
      background: { kind: 'color', value: '#102030' },
      environmentMap: 'environment-source',
      keyLight: {
        id: 'key',
        kind: 'directional',
        color: '#ffffff',
        intensity: 1,
      },
      accentLights: [],
      shadowCasters: [],
      exposure: 1,
      toneMapping: 'ACESFilmic',
    };
    const assets: AssetManifest = {
      id: 'failing-environment-assets',
      assets: [{ ...asset('environment-source'), kind: 'environment' }],
    };
    const sourceTexture = new THREE.Texture();
    const sourceDispose = vi.spyOn(sourceTexture, 'dispose');
    const pmrem = {
      compileEquirectangularShader: vi.fn(),
      fromEquirectangular: vi.fn(() => {
        throw new Error('PMREM conversion failed');
      }),
      dispose: vi.fn(),
    };

    await expect(createEnvironment({
      renderer,
      scene,
      definition,
      assets,
      textureLoader: {
        loadAsync: vi.fn(async () => sourceTexture),
      } as unknown as THREE.TextureLoader,
      createPmrem: () => pmrem,
    })).rejects.toThrow('PMREM conversion failed');

    expect(sourceDispose).toHaveBeenCalledOnce();
    expect(pmrem.dispose).toHaveBeenCalledOnce();
    expect(scene.environment).toBeNull();
    expect(scene.background).toBeNull();
    expect(scene.children).toHaveLength(0);
  });
});
