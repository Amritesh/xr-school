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
  glass.renderOrder = 3;
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
    color: '#0ea5e9', transparent: true, opacity: 0.76, roughness: 0.12,
    metalness: 0, emissive: '#075985', emissiveIntensity: 0.38, depthWrite: false,
  });
  const water = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.625, 0.595, 0.98, 48)), waterMaterial);
  water.position.y = -0.17;
  water.renderOrder = 1;
  beaker.add(water);
  const surfaceMaterial = standard({
    color: '#7ddfff', transparent: true, opacity: 0.92, roughness: 0.06,
    metalness: 0.04, emissive: '#0ea5e9', emissiveIntensity: 0.34, depthWrite: false,
  });
  const surface = new THREE.Mesh(
    geometry(new THREE.CircleGeometry(0.625, 48)),
    surfaceMaterial,
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.32;
  surface.renderOrder = 2;
  beaker.add(surface);
  const meniscus = new THREE.Mesh(
    geometry(new THREE.TorusGeometry(0.615, 0.018, 10, 48)),
    standard({ color: '#bff4ff', emissive: '#22d3ee', emissiveIntensity: 0.72, roughness: 0.12 }),
  );
  meniscus.name = 'water-meniscus';
  meniscus.rotation.x = Math.PI / 2;
  meniscus.position.y = 0.325;
  beaker.add(meniscus);

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

  const waterLabel = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(1.25, 0.34)),
    basic({ map: makeLabelTexture('WATER · 200 mL', '#22d3ee', textures), transparent: true, depthTest: false }),
  );
  waterLabel.name = 'water-volume-label';
  waterLabel.position.set(BEAKER_CENTER.x, 1.9, 0.28);
  root.add(waterLabel);

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

  const jarPositions: Record<SubstanceId, THREE.Vector3> = {
    salt: new THREE.Vector3(-2.25, 0.84, -0.74),
    sugar: new THREE.Vector3(-1.55, 0.84, -0.74),
    sand: new THREE.Vector3(-2.25, 0.84, 0),
    chalk: new THREE.Vector3(-1.55, 0.84, 0),
    oil: new THREE.Vector3(-2.25, 0.84, 0.74),
  };
  const ingredientJars = {} as Record<SubstanceId, THREE.Group>;
  const selectionRings = {} as Record<SubstanceId, THREE.Mesh>;

  function makeIngredientJar(id: SubstanceId) {
    const item = SOLUBILITY_SUBSTANCES[id];
    const jar = new THREE.Group();
    jar.name = `substance-button-${id}`;
    jar.position.copy(jarPositions[id]);
    const isOil = id === 'oil';
    const vessel = new THREE.Mesh(
      geometry(new THREE.CylinderGeometry(isOil ? 0.2 : 0.27, isOil ? 0.25 : 0.29, isOil ? 0.72 : 0.58, 28, 1, true)),
      glassMaterial(),
    );
    vessel.position.y = isOil ? 0.05 : 0;
    vessel.renderOrder = 3;
    const fill = new THREE.Mesh(
      geometry(new THREE.CylinderGeometry(isOil ? 0.18 : 0.245, isOil ? 0.22 : 0.255, isOil ? 0.48 : 0.34, 24)),
      standard({
        color: item.color, roughness: isOil ? 0.3 : 0.82,
        transparent: isOil, opacity: isOil ? 0.86 : 1,
        emissive: item.color, emissiveIntensity: isOil ? 0.13 : 0.03,
      }),
    );
    fill.name = 'ingredient-fill';
    fill.position.y = isOil ? -0.02 : -0.09;
    const lid = new THREE.Mesh(
      geometry(new THREE.CylinderGeometry(isOil ? 0.13 : 0.28, isOil ? 0.13 : 0.28, 0.08, 24)),
      standard({ color: isOil ? '#166534' : '#d8e3ea', roughness: 0.36, metalness: isOil ? 0.05 : 0.55 }),
    );
    lid.position.y = isOil ? 0.45 : 0.34;
    const label = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(0.48, 0.2)),
      basic({ map: makeLabelTexture(item.label.replace('Table ', ''), item.color, textures), transparent: true, depthTest: false }),
    );
    label.position.set(0, 0.02, isOil ? 0.205 : 0.285);
    const ring = new THREE.Mesh(
      geometry(new THREE.TorusGeometry(isOil ? 0.29 : 0.34, 0.025, 8, 32)),
      standard({ color: '#facc15', emissive: '#f59e0b', emissiveIntensity: 0.75, transparent: true, opacity: 0 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.32;
    jar.add(vessel, fill, lid, label, ring);
    root.add(jar);
    interactives.push(jar);
    ingredientJars[id] = jar;
    selectionRings[id] = ring;
    return jar;
  }

  const substances = (Object.keys(SOLUBILITY_SUBSTANCES) as SubstanceId[]).map(makeIngredientJar);
  const predictions = [
    ['dissolves', 'Solution'], ['settles', 'Sediment'], ['clouds', 'Suspension'], ['separates', 'Layer'],
  ].map(([id, label], index) =>
    makeButton(`prediction-button-${id}`, label, new THREE.Vector3(-1.82 + index * 0.84, 0.91, 1.22), '#188eb2', 0.76));

  const scoop = new THREE.Group();
  scoop.name = 'action-button-run';
  const scoopMetal = standard({ color: '#dcecf4', roughness: 0.24, metalness: 0.72 });
  const scoopBowl = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.18, 0.12, 0.1, 24)), scoopMetal);
  const scoopHandle = new THREE.Mesh(geometry(new THREE.BoxGeometry(0.08, 0.07, 0.72)), scoopMetal);
  scoopHandle.position.z = 0.4;
  const scoopFillMaterial = standard({ color: SOLUBILITY_SUBSTANCES.salt.color, roughness: 0.82 });
  const scoopFill = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.145, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), scoopFillMaterial);
  scoopFill.name = 'measured-ingredient-scoop';
  scoopFill.position.y = 0.05;
  scoop.add(scoopBowl, scoopHandle, scoopFill);
  scoop.position.set(0.52, 0.69, 0.92);
  root.add(scoop);
  interactives.push(scoop);
  const scoopLabel = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(0.72, 0.22)),
    basic({ map: makeLabelTexture('5 g SCOOP', '#4ade80', textures), transparent: true, depthTest: false }),
  );
  scoopLabel.position.set(0.52, 0.94, 0.9);
  root.add(scoopLabel);

  const pourMaterial = standard({ color: SOLUBILITY_SUBSTANCES.salt.color, roughness: 0.72 });
  const pourParticles = new THREE.InstancedMesh(
    geometry(new THREE.IcosahedronGeometry(0.024, 0)), pourMaterial, 28,
  );
  pourParticles.count = 0;
  pourParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(pourParticles);
  const runButton = scoop;
  const stirButton = makeButton('action-button-stir', 'Stir / stop', new THREE.Vector3(1.55, 0.66, 1.02), '#8b5cf6', 0.86);
  const lensButton = makeButton('action-button-lens', 'Molecular lens', new THREE.Vector3(1.27, 0.91, 1.22), '#db7c28', 1.02);
  const resetButton = makeButton('action-button-reset', 'Reset', new THREE.Vector3(2.18, 0.91, 1.22), '#596779', 0.68);

  let selectedSubstance: SubstanceId = 'salt';
  let lastElapsed = 0;
  let pourStartedAt = Number.NEGATIVE_INFINITY;
  const scoopRest = new THREE.Vector3(0.52, 0.69, 0.92);

  function setSelectedSubstance(id: SubstanceId) {
    selectedSubstance = id;
    for (const key of Object.keys(selectionRings) as SubstanceId[]) {
      (selectionRings[key].material as THREE.MeshStandardMaterial).opacity = key === id ? 0.95 : 0;
    }
    scoopFillMaterial.color.set(SOLUBILITY_SUBSTANCES[id].color);
    pourMaterial.color.set(SOLUBILITY_SUBSTANCES[id].color);
  }

  function pourScoop(id: SubstanceId) {
    setSelectedSubstance(id);
    pourStartedAt = lastElapsed;
  }

  setSelectedSubstance('salt');

  function update(snapshot: MixtureSnapshot, elapsed: number, showMolecularLens: boolean) {
    lastElapsed = elapsed;
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

    const pourAge = elapsed - pourStartedAt;
    if (pourAge >= 0 && pourAge < 1.55) {
      const progress = Math.min(1, pourAge / 1.1);
      const start = jarPositions[selectedSubstance].clone().add(new THREE.Vector3(0, 0.65, 0.18));
      const control = new THREE.Vector3(-0.9, 2.15, 0.55);
      const end = BEAKER_CENTER.clone().add(new THREE.Vector3(0.05, 0.78, 0.25));
      const inverse = 1 - progress;
      scoop.position.set(
        inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x,
        inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y,
        inverse * inverse * start.z + 2 * inverse * progress * control.z + progress * progress * end.z,
      );
      scoop.rotation.z = -Math.min(1, Math.max(0, (progress - 0.62) / 0.38)) * 1.2;
      const streamActive = progress > 0.68;
      pourParticles.count = streamActive ? 28 : 0;
      if (streamActive) {
        for (let index = 0; index < pourParticles.count; index += 1) {
          const fall = (seeded(index, 20) + elapsed * 2.3) % 1;
          dummy.position.set(
            BEAKER_CENTER.x + 0.04 + (seeded(index, 21) - 0.5) * 0.12,
            1.82 - fall * 0.72,
            BEAKER_CENTER.z + 0.08 + (seeded(index, 22) - 0.5) * 0.12,
          );
          dummy.scale.setScalar(0.72 + seeded(index, 23) * 0.65);
          dummy.rotation.set(0, seeded(index, 24) * Math.PI, 0);
          dummy.updateMatrix();
          pourParticles.setMatrixAt(index, dummy.matrix);
        }
        pourParticles.instanceMatrix.needsUpdate = true;
      }
    } else {
      scoop.position.copy(scoopRest);
      scoop.rotation.set(0, 0, 0);
      pourParticles.count = 0;
    }
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
    root, beaker, instrumentPanel, ingredientJars, substances, predictions, runButton, stirButton, lensButton, resetButton,
    interactives, update, pourScoop, setSelectedSubstance, setQualityProfile,
    setMolecularLens(value: boolean) { molecularLens = value; }, dispose,
  };
}

export type SolubilityScene = ReturnType<typeof createSolubilityScene>;
