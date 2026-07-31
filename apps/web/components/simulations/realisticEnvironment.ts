import * as THREE from "three";

export function applyRealisticEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  textureUrl: string,
  options: { blur?: number; intensity?: number; exposure?: number } = {},
) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.exposure ?? 1.05;
  const texture = new THREE.TextureLoader().load(textureUrl);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.environment = texture;
  scene.backgroundBlurriness = options.blur ?? 0;
  scene.environmentIntensity = options.intensity ?? 0.38;
  return { dispose() { texture.dispose(); } };
}
