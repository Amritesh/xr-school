import * as THREE from 'three';
import { createResourceRegistry } from '@xr-school/simulation-runtime';
import type {
  AssetManifest,
  EnvironmentDefinition,
  LightDefinition,
} from '@xr-school/simulation-schema';
import {
  loadManifestAsset,
  type AssetLoadDiagnostic,
} from '../assets/loadManifestAsset.js';

export interface EnvironmentPmrem {
  compileEquirectangularShader(): void;
  fromEquirectangular(texture: THREE.Texture): {
    texture: THREE.Texture;
    dispose(): void;
  };
  dispose(): void;
}

export interface CreateEnvironmentConfig {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  definition: EnvironmentDefinition;
  assets: AssetManifest;
  onDiagnostic?(diagnostic: AssetLoadDiagnostic): void;
  textureLoader?: THREE.TextureLoader;
  createPmrem?(renderer: THREE.WebGLRenderer): EnvironmentPmrem;
}

export interface SimulationEnvironment {
  lights: THREE.Light[];
  dispose(): Promise<void>;
}

function hasTarget(
  light: THREE.Light,
): light is THREE.DirectionalLight | THREE.SpotLight {
  return light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight;
}

function createLight(definition: LightDefinition): THREE.Light {
  let light: THREE.Light;
  switch (definition.kind) {
    case 'ambient':
      light = new THREE.AmbientLight(definition.color, definition.intensity);
      break;
    case 'hemisphere':
      light = new THREE.HemisphereLight(definition.color, '#17212b', definition.intensity);
      break;
    case 'point':
      light = new THREE.PointLight(
        definition.color,
        definition.intensity,
        definition.range ?? 0,
        definition.decay ?? 2,
      );
      break;
    case 'spot':
      light = new THREE.SpotLight(
        definition.color,
        definition.intensity,
        definition.range ?? 0,
        Math.PI / 5,
        0.35,
        definition.decay ?? 2,
      );
      break;
    case 'directional':
      light = new THREE.DirectionalLight(definition.color, definition.intensity);
      break;
  }
  if (definition.position) light.position.set(...definition.position);
  light.castShadow = definition.castsShadow ?? false;
  if (hasTarget(light) && definition.target) light.target.position.set(...definition.target);
  return light;
}

function toneMapping(name: EnvironmentDefinition['toneMapping']) {
  if (name === 'AgX') return THREE.AgXToneMapping;
  if (name === 'ACESFilmic') return THREE.ACESFilmicToneMapping;
  return THREE.NeutralToneMapping;
}

export async function createEnvironment(
  config: CreateEnvironmentConfig,
): Promise<SimulationEnvironment> {
  const resources = createResourceRegistry();
  const { definition, renderer, scene } = config;
  if (definition.background.kind === 'gradient') {
    const message = 'Unsupported background kind gradient; use a color or manifest texture';
    config.onDiagnostic?.({
      severity: 'error',
      assetId: definition.background.value,
      message,
    });
    throw new Error(`${definition.id}: ${message}`);
  }
  const lights = [
    definition.keyLight,
    definition.fillLight,
    ...definition.accentLights,
  ].filter((light): light is LightDefinition => light !== undefined)
    .map(createLight);

  for (const light of lights) {
    scene.add(light);
    if (hasTarget(light)) scene.add(light.target);
  }
  scene.background = definition.background.kind === 'color'
    ? new THREE.Color(definition.background.value)
    : null;
  scene.fog = definition.fog
    ? new THREE.Fog(definition.fog.color, definition.fog.near, definition.fog.far)
    : null;
  renderer.toneMapping = toneMapping(definition.toneMapping);
  renderer.toneMappingExposure = definition.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = lights.some(light => light.castShadow);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  resources.register(`environment:${definition.id}:scene`, () => {
    scene.environment = null;
    scene.background = null;
    scene.fog = null;
    for (const light of lights) {
      scene.remove(light);
      if (hasTarget(light)) scene.remove(light.target);
      light.dispose();
    }
  });

  try {
    if (definition.background.kind === 'texture') {
      const background = await loadManifestAsset({
        manifest: config.assets,
        assetId: definition.background.value,
        resources,
        resourceId: `environment:${definition.id}:background-asset`,
        load: asset => (config.textureLoader ?? new THREE.TextureLoader())
          .loadAsync(asset.url),
        onDiagnostic: config.onDiagnostic,
      });
      background.colorSpace = THREE.SRGBColorSpace;
      scene.background = background;
    }
    if (definition.environmentMap) {
      const source = await loadManifestAsset({
        manifest: config.assets,
        assetId: definition.environmentMap,
        resources,
        resourceId: `environment:${definition.id}:environment-asset`,
        load: asset => (config.textureLoader ?? new THREE.TextureLoader())
          .loadAsync(asset.url),
        onDiagnostic: config.onDiagnostic,
      });
      source.mapping = THREE.EquirectangularReflectionMapping;
      source.colorSpace = THREE.SRGBColorSpace;
      const pmrem = config.createPmrem?.(renderer) ?? new THREE.PMREMGenerator(renderer);
      resources.register(`environment:${definition.id}:pmrem`, () => pmrem.dispose());
      pmrem.compileEquirectangularShader();
      const renderTarget = pmrem.fromEquirectangular(source);
      resources.register(`environment:${definition.id}:target`, () => renderTarget.dispose());
      scene.environment = renderTarget.texture;
    }
  } catch (error) {
    try {
      await resources.disposeAll();
    } catch (disposalError) {
      throw new AggregateError(
        [error, disposalError],
        `Environment ${definition.id} initialization and rollback both failed`,
      );
    }
    throw error;
  }

  return {
    lights,
    dispose: () => resources.disposeAll(),
  };
}
