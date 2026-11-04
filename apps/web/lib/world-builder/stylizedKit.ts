import * as THREE from 'three';

/**
 * Shared look for stylised kits: flat vertex-coloured models, one soft key
 * light, a gradient sky and distance fog. One metre is one unit; doors are
 * about 2 m and eaves about 2.6 m, so kits stay in scale with each other.
 */
export type StylizedMood = 'monsoon' | 'drought' | 'restored';

const MOODS: Record<
  StylizedMood,
  { top: number; horizon: number; key: number; keyIntensity: number; fill: number; ground: number; fillIntensity: number }
> = {
  monsoon: { top: 0x5d7f93, horizon: 0xc3d3d6, key: 0xf2f4ee, keyIntensity: 1.5, fill: 0xdce9ee, ground: 0x6d6a55, fillIntensity: 1.7 },
  drought: { top: 0x7fb4d6, horizon: 0xf0d7a6, key: 0xffe2b0, keyIntensity: 2.6, fill: 0xfff0d2, ground: 0x8f6f45, fillIntensity: 1.3 },
  restored: { top: 0x63aee0, horizon: 0xd6ecec, key: 0xfff4d8, keyIntensity: 2.4, fill: 0xe9f6ff, ground: 0x6f8a4e, fillIntensity: 1.5 },
};

export function createStylizedLighting(scene: THREE.Scene, parent: THREE.Object3D) {
  const group = new THREE.Group();
  group.name = 'stylized-lighting';
  parent.add(group);

  const fill = new THREE.HemisphereLight();
  const key = new THREE.DirectionalLight();
  key.position.set(-7, 14, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.camera.far = 40;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  group.add(fill, key);

  const domeGeometry = new THREE.SphereGeometry(90, 16, 10);
  const domeColours = new Float32Array(domeGeometry.attributes.position!.count * 3);
  domeGeometry.setAttribute('color', new THREE.BufferAttribute(domeColours, 3));
  const domeMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(domeGeometry, domeMaterial);
  dome.name = 'sky-dome';
  dome.renderOrder = -10;
  group.add(dome);

  const fog = new THREE.Fog(0xffffff, 26, 95);
  scene.fog = fog;
  let current: StylizedMood = 'monsoon';

  function setMood(mood: StylizedMood) {
    current = mood;
    const settings = MOODS[mood];
    const top = new THREE.Color(settings.top);
    const horizon = new THREE.Color(settings.horizon);
    const positions = domeGeometry.attributes.position!;
    const colour = new THREE.Color();
    for (let index = 0; index < positions.count; index += 1) {
      const height = Math.max(0, positions.getY(index) / 90);
      colour.copy(horizon).lerp(top, Math.pow(height, 0.55));
      domeColours.set([colour.r, colour.g, colour.b], index * 3);
    }
    domeGeometry.attributes.color!.needsUpdate = true;
    fog.color.copy(horizon);
    key.color.setHex(settings.key);
    key.intensity = settings.keyIntensity;
    fill.color.setHex(settings.fill);
    fill.groundColor.setHex(settings.ground);
    fill.intensity = settings.fillIntensity;
  }
  setMood('monsoon');

  return {
    group,
    setMood,
    mood: () => current,
    dispose() {
      domeGeometry.dispose();
      domeMaterial.dispose();
      key.dispose();
      fill.dispose();
      scene.fog = null;
      parent.remove(group);
    },
  };
}
