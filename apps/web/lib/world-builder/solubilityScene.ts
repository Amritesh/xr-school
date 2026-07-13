import * as THREE from 'three';
import type { QualityProfileId } from '../../../../packages/simulation-schema/src/index';
import {
  SOLUBILITY_SUBSTANCES,
  type MixtureSnapshot,
  type SubstanceId,
} from './solubilityModel';

export interface SolubilitySceneConfig {
  scene: THREE.Scene;
  profileId: QualityProfileId;
}

const PARTICLE_COUNT = 180;
const MOLECULE_COUNT = 120;
const BEAKER_CENTER = new THREE.Vector3(-0.55, 1.08, -0.15);
const dummy = new THREE.Object3D();

function seeded(index: number, salt = 0) {
  const x = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function makeLabelTexture(text: string, accent: string, owned: THREE.Texture[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 180;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#071521';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = accent;
    context.lineWidth = 8;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    context.fillStyle = '#f8fafc';
    context.font = '700 45px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  owned.push(texture);
  return texture;
}

export function createSolubilityScene(config: SolubilitySceneConfig) {
  const root = new THREE.Group();
  root.name = 'solubility-physics-world';
  config.scene.add(root);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const interactives: THREE.Object3D[] = [];
  let profileId = config.profileId;
  let molecularLens = false;

  const geometry = <T extends THREE.BufferGeometry>(value: T) => { geometries.push(value); return value; };
  const standard = (parameters: THREE.MeshStandardMaterialParameters) => {
    const value = new THREE.MeshStandardMaterial(parameters); materials.push(value); return value;
  };
  const basic = (parameters: THREE.MeshBasicMaterialParameters) => {
    const value = new THREE.MeshBasicMaterial(parameters); materials.push(value); return value;
  };

  function glassMaterial() {
    if (profileId === 'questBaseline') {
      return standard({ color: '#b9e8f5', transparent: true, opacity: 0.19, roughness: 0.12, metalness: 0 });
    }
    const value = new THREE.MeshPhysicalMaterial({
      color: '#d8f4ff', transmission: 0.9, transparent: true, opacity: 0.42,
      roughness: 0.08, thickness: 0.025, ior: 1.47, clearcoat: 0.35,
      clearcoatRoughness: 0.12, side: THREE.DoubleSide,
    });
    materials.push(value);
    return value;
  }

  const bench = new THREE.Mesh(
    geometry(new THREE.BoxGeometry(5.7, 0.22, 2.8)),
    standard({ color: '#20384a', roughness: 0.58, metalness: 0.12 }),
  );
  bench.position.set(0, 0.37, 0);
  bench.receiveShadow = true;
  root.add(bench);

  const benchEdge = new THREE.Mesh(
    geometry(new THREE.BoxGeometry(5.76, 0.08, 2.86)),
    standard({ color: '#5d7b8e', roughness: 0.35, metalness: 0.48 }),
  );
  benchEdge.position.set(0, 0.28, 0);
  root.add(benchEdge);

  const beaker = new THREE.Group();
  beaker.name = 'graduated-beaker';
  beaker.position.copy(BEAKER_CENTER);
  const glass = new THREE.Mesh(
    geometry(new THREE.CylinderGeometry(0.72, 0.64, 1.42, profileId === 'questBaseline' ? 32 : 64, 1, true)),
    glassMaterial(),
  );
  glass.castShadow = false;
  const base = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.64, 0.64, 0.035, 48)), glass.material);
  base.position.y = -0.69;
  const rim = new THREE.Mesh(
    geometry(new THREE.TorusGeometry(0.72, 0.025, 10, 48)),
    standard({ color: '#c9f2ff', roughness: 0.18, metalness: 0.05 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.71;
  beaker.add(glass, base, rim);

  const waterMaterial = standard({
    color: '#36bde6', transparent: true, opacity: 0.5, roughness: 0.16,
    metalness: 0, emissive: '#073c50', emissiveIntensity: 0.16,
  });
  const water = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.625, 0.595, 0.98, 48)), waterMaterial);
  water.position.y = -0.17;
  beaker.add(water);
  const surface = new THREE.Mesh(
    geometry(new THREE.CircleGeometry(0.625, 48)),
    standard({ color: '#79dcf4', transparent: true, opacity: 0.66, roughness: 0.08, metalness: 0.05 }),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.32;
  beaker.add(surface);

  for (let index = 0; index < 5; index += 1) {
    const mark = new THREE.Mesh(
      geometry(new THREE.BoxGeometry(index % 2 === 0 ? 0.18 : 0.1, 0.012, 0.014)),
      basic({ color: '#d9f7ff' }),
    );
    mark.position.set(0.57, -0.45 + index * 0.22, 0.28);
    mark.rotation.y = -0.15;
    beaker.add(mark);
  }
  root.add(beaker);

  const sedimentMaterial = standard({ color: '#f2e2c2', roughness: 0.9, transparent: true, opacity: 0 });
  const sediment = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.58, 0.58, 0.12, 40)), sedimentMaterial);
  sediment.position.set(BEAKER_CENTER.x, 0.42, BEAKER_CENTER.z);
  root.add(sediment);

  const oilMaterial = standard({ color: '#f4c542', roughness: 0.36, transparent: true, opacity: 0 });
  const oilLayer = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.61, 0.61, 0.1, 40)), oilMaterial);
  oilLayer.position.set(BEAKER_CENTER.x, 1.44, BEAKER_CENTER.z);
  root.add(oilLayer);

  const particleMaterial = standard({ color: '#ffffff', roughness: 0.68, transparent: true, opacity: 0.92 });
  const particles = new THREE.InstancedMesh(
    geometry(new THREE.IcosahedronGeometry(0.035, 1)), particleMaterial, PARTICLE_COUNT,
  );
  particles.name = 'mesoscopic-evidence-particles';
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particles.frustumCulled = false;
  root.add(particles);

  const moleculeMaterial = standard({ color: '#7dd3fc', roughness: 0.3, emissive: '#075985', emissiveIntensity: 0.5, transparent: true, opacity: 0 });
  const molecules = new THREE.InstancedMesh(
    geometry(new THREE.SphereGeometry(0.027, 10, 8)), moleculeMaterial, MOLECULE_COUNT,
  );
  molecules.name = 'representational-molecular-lens';
  molecules.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  molecules.frustumCulled = false;
  root.add(molecules);

  const rod = new THREE.Group();
  rod.name = 'stirring-rod';
  const rodGlass = new THREE.Mesh(
    geometry(new THREE.CylinderGeometry(0.027, 0.027, 1.55, 16)), glassMaterial(),
  );
  rodGlass.position.y = 0.1;
  rod.add(rodGlass);
  rod.position.set(BEAKER_CENTER.x + 0.22, 1.3, BEAKER_CENTER.z);
  rod.rotation.z = -0.17;
  root.add(rod);

  const instrumentPanel = new THREE.Group();
  instrumentPanel.name = 'live-instrument-panel';
  const panel = new THREE.Mesh(
    geometry(new THREE.BoxGeometry(1.55, 1.42, 0.08)),
    standard({ color: '#0c1c2a', roughness: 0.45, metalness: 0.28 }),
  );
  instrumentPanel.add(panel);
  instrumentPanel.position.set(1.35, 1.24, -0.6);
  instrumentPanel.rotation.y = -0.16;
  root.add(instrumentPanel);

  function makeButton(name: string, label: string, position: THREE.Vector3, accent: string, width = 0.62) {
    const button = new THREE.Mesh(
      geometry(new THREE.BoxGeometry(width, 0.18, 0.07)),
      standard({ color: accent, emissive: accent, emissiveIntensity: 0.16, roughness: 0.4, metalness: 0.12 }),
    );
    button.name = name;
    button.position.copy(position);
    const face = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(width * 0.92, 0.15)),
      basic({ map: makeLabelTexture(label, accent, textures), transparent: true, depthTest: false }),
    );
    face.position.z = 0.041;
    button.add(face);
    root.add(button);
    interactives.push(button);
    return button;
  }

  const substances = (Object.keys(SOLUBILITY_SUBSTANCES) as SubstanceId[]).map((id, index) =>
    makeButton(`substance-button-${id}`, SOLUBILITY_SUBSTANCES[id].label.replace('Table ', ''), new THREE.Vector3(-2.1 + index * 0.76, 0.65, 1.02), '#d7a93d', 0.68));
  const predictions = [
    ['dissolves', 'Solution'], ['settles', 'Sediment'], ['clouds', 'Suspension'], ['separates', 'Layer'],
  ].map(([id, label], index) =>
    makeButton(`prediction-button-${id}`, label, new THREE.Vector3(-1.82 + index * 0.84, 0.91, 1.22), '#188eb2', 0.76));
  const runButton = makeButton('action-button-run', 'Add 5 g', new THREE.Vector3(0.65, 0.66, 1.02), '#2c9a64', 0.78);
  const stirButton = makeButton('action-button-stir', 'Stir / stop', new THREE.Vector3(1.55, 0.66, 1.02), '#8b5cf6', 0.86);
  const lensButton = makeButton('action-button-lens', 'Molecular lens', new THREE.Vector3(1.27, 0.91, 1.22), '#db7c28', 1.02);
  const resetButton = makeButton('action-button-reset', 'Reset', new THREE.Vector3(2.18, 0.91, 1.22), '#596779', 0.68);

  function update(snapshot: MixtureSnapshot, elapsed: number, showMolecularLens: boolean) {
    molecularLens = showMolecularLens;
    const item = SOLUBILITY_SUBSTANCES[snapshot.substanceId];
    particleMaterial.color.set(item.color);
    sedimentMaterial.color.set(item.color);
    const added = Math.max(snapshot.addedMassG, 0.0001);
    const suspendedFraction = snapshot.suspendedMassG / added;
    const settledFraction = snapshot.settledMassG / added;
    const separatedFraction = snapshot.separatedMassG / added;
    const macroVisible = Math.min(PARTICLE_COUNT, Math.round((snapshot.suspendedMassG + snapshot.settledMassG) * 4.5));
    particles.count = macroVisible;

    const suspendedCount = Math.min(macroVisible, Math.round(macroVisible * suspendedFraction));
    const settledCount = Math.min(macroVisible - suspendedCount, Math.round(macroVisible * settledFraction));
    for (let index = 0; index < macroVisible; index += 1) {
      const angle = seeded(index, 1) * Math.PI * 2 + elapsed * (snapshot.stirring ? 1.8 : 0.15);
      const radius = Math.sqrt(seeded(index, 2)) * 0.52;
      let y: number;
      if (index < suspendedCount) {
        y = 0.63 + seeded(index, 3) * 0.83;
      } else if (index < suspendedCount + settledCount) {
        y = 0.45 + seeded(index, 4) * 0.075;
      } else {
        y = 1.39 + seeded(index, 5) * 0.06;
      }
      dummy.position.set(BEAKER_CENTER.x + Math.cos(angle) * radius, y, BEAKER_CENTER.z + Math.sin(angle) * radius);
      const grainScale = item.id === 'chalk' ? 0.55 : item.id === 'sand' ? 1.15 : 0.9;
      dummy.scale.setScalar(grainScale * (0.72 + seeded(index, 6) * 0.5));
      dummy.rotation.set(seeded(index, 7) * Math.PI, angle, seeded(index, 8) * Math.PI);
      dummy.updateMatrix();
      particles.setMatrixAt(index, dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;

    const moleculeVisible = molecularLens ? Math.min(MOLECULE_COUNT, Math.round(snapshot.dissolvedMassG * 2.5)) : 0;
    molecules.count = moleculeVisible;
    moleculeMaterial.opacity = molecularLens ? 0.94 : 0;
    moleculeMaterial.color.set(snapshot.substanceId === 'salt' ? '#60a5fa' : '#fde68a');
    for (let index = 0; index < moleculeVisible; index += 1) {
      const angle = seeded(index, 11) * Math.PI * 2 + elapsed * (0.25 + seeded(index, 12) * 0.35);
      const radius = Math.sqrt(seeded(index, 13)) * 0.53;
      dummy.position.set(BEAKER_CENTER.x + Math.cos(angle) * radius, 0.57 + seeded(index, 14) * 0.82, BEAKER_CENTER.z + Math.sin(angle) * radius);
      dummy.scale.setScalar(snapshot.substanceId === 'salt' && index % 2 === 0 ? 0.75 : 1.1);
      dummy.rotation.set(0, angle, 0);
      dummy.updateMatrix();
      molecules.setMatrixAt(index, dummy.matrix);
      molecules.setColorAt(index, new THREE.Color(snapshot.substanceId === 'salt' && index % 2 === 0 ? '#60a5fa' : item.color));
    }
    molecules.instanceMatrix.needsUpdate = true;
    if (molecules.instanceColor) molecules.instanceColor.needsUpdate = true;

    sedimentMaterial.opacity = snapshot.settledMassG > 0.02 ? Math.min(0.95, 0.25 + settledFraction) : 0;
    sediment.scale.y = Math.max(0.08, Math.min(2.3, snapshot.settledMassG / 18));
    oilMaterial.opacity = item.id === 'oil' && separatedFraction > 0.02 ? 0.76 : 0;
    oilLayer.scale.y = Math.max(0.08, Math.min(2.6, snapshot.separatedMassG / 14));
    waterMaterial.color.set('#36bde6').lerp(new THREE.Color(item.color), snapshot.dissolvedMassG > 0 ? 0.16 : snapshot.turbidityPercent / 260);
    waterMaterial.opacity = 0.48 + snapshot.turbidityPercent / 260;
    surface.scale.setScalar(1 + Math.sin(elapsed * 7) * (snapshot.stirring ? 0.025 : 0.003));
    surface.rotation.z = elapsed * (snapshot.stirring ? 0.35 : 0.02);
    rod.rotation.y = snapshot.stirring ? elapsed * 3.4 : 0;
    rod.position.x = BEAKER_CENTER.x + 0.19 + (snapshot.stirring ? Math.sin(elapsed * 3.4) * 0.13 : 0);
  }

  function setQualityProfile(nextProfileId: QualityProfileId) {
    profileId = nextProfileId;
    // Geometry remains stable during an XR session; expensive transmission was selected at construction.
    particleMaterial.roughness = profileId === 'questBaseline' ? 0.82 : 0.62;
  }

  function dispose() {
    config.scene.remove(root);
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
    for (const value of textures) value.dispose();
  }

  return {
    root, beaker, instrumentPanel, substances, predictions, runButton, stirButton, lensButton, resetButton,
    interactives, update, setQualityProfile, setMolecularLens(value: boolean) { molecularLens = value; }, dispose,
  };
}

export type SolubilityScene = ReturnType<typeof createSolubilityScene>;
