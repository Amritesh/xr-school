import * as THREE from 'three';
import type {
  AssetManifest,
  EnvironmentDefinition,
  LightDefinition,
} from '../../../../packages/simulation-schema/src/world';
import type { AssetDiagnostic } from './materialFactory';

interface EnvironmentFactoryConfig {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  definition: EnvironmentDefinition;
  assets: AssetManifest;
  onDiagnostic?: (diagnostic: AssetDiagnostic) => void;
  textureLoader?: THREE.TextureLoader;
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
      light = new THREE.HemisphereLight(
        definition.color,
        '#17212b',
        definition.intensity,
      );
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
  if (hasTarget(light) && definition.target) {
    light.target.position.set(...definition.target);
  }
  return light;
}

function toneMapping(name: EnvironmentDefinition['toneMapping']) {
  if (name === 'AgX') return THREE.AgXToneMapping;
  if (name === 'ACESFilmic') return THREE.ACESFilmicToneMapping;
  return THREE.NeutralToneMapping;
}

export async function createEnvironment(config: EnvironmentFactoryConfig) {
  const { definition, renderer, scene } = config;
  const owned: { dispose(): void }[] = [];
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
    : new THREE.Color('#071014');
  scene.fog = definition.fog
    ? new THREE.Fog(definition.fog.color, definition.fog.near, definition.fog.far)
    : null;
  renderer.toneMapping = toneMapping(definition.toneMapping);
  renderer.toneMappingExposure = definition.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = lights.some(light => light.castShadow);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  if (definition.environmentMap) {
    const asset = config.assets.assets.find(
      candidate => candidate.id === definition.environmentMap,
    );
    if (!asset) throw new Error(`Missing environment asset ${definition.environmentMap}`);
    try {
      const source = await (config.textureLoader ?? new THREE.TextureLoader())
        .loadAsync(asset.url);
      source.mapping = THREE.EquirectangularReflectionMapping;
      source.colorSpace = THREE.SRGBColorSpace;
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const renderTarget = pmrem.fromEquirectangular(source);
      scene.environment = renderTarget.texture;
      owned.push(source, renderTarget, pmrem);
    } catch (error) {
      config.onDiagnostic?.({
        severity: 'warning',
        assetId: definition.environmentMap,
        message: 'Environment map failed; retaining the approved fallback light rig',
      });
    }
  }

  return {
    lights,
    dispose() {
      scene.environment = null;
      scene.fog = null;
      for (const light of lights) {
        scene.remove(light);
        if (hasTarget(light)) scene.remove(light.target);
        light.dispose();
      }
      for (const resource of owned.reverse()) resource.dispose();
    },
  };
}
