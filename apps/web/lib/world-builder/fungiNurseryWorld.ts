import * as THREE from 'three';
import {
  calculateLitterDecomposition,
  calculateYeastDoughResponse,
} from '@xr-school/simulation-runtime';
import type { FungalExperimentOutput } from '@xr-school/simulation-runtime';
import {
  FUNGI_MISSION_IDS,
  type FungiLandmarkId,
  type FungiMissionId,
} from '@/lib/fungi/fungiExperienceDirector';

/**
 * Every landmark of the clearing exists from the first frame and is never
 * removed: missions change what the learner is asked to do, not what the
 * forest nursery is. Only quantities that the biological models actually
 * produce are allowed to change what is rendered.
 */
export const FUNGI_NURSERY_LANDMARK_IDS = [
  'triage-table',
  'mycelium-log',
  'growth-chamber',
  'fungi-at-work-bench',
  'safety-station',
  'nursery-gate',
] as const satisfies readonly FungiLandmarkId[];

export interface FungiNurseryWorldConfig {
  seed?: number;
  reducedMotion?: boolean;
}

export interface FungiNurseryWorldProjection {
  missionId: FungiMissionId;
  growth: FungalExperimentOutput;
  airflow: { directionRadians: number; strength: number };
  spore: {
    released: boolean;
    position: readonly [number, number, number];
    outcome: string;
  };
  yeast: { temperatureC: number; elapsedHours: number; inoculated: boolean };
  litter: {
    temperatureC: number;
    elapsedHours: number;
    initialLitterMassGrams: number;
  };
  safetyScanDepth: number;
  highlightedEvidenceIds: readonly string[];
}

export interface FungiNurseryWorldSnapshot {
  missionId: FungiMissionId;
  colony: {
    radiusMm: number;
    coverage: number;
    visibleBranches: number;
    visibleSporangia: number;
    releasedSpores: number;
    phase: FungalExperimentOutput['phase'];
  };
  yeast: {
    doughVolumeMl: number;
    controlVolumeMl: number;
    doughMeshScale: number;
    controlMeshScale: number;
  };
  decomposition: {
    remainingLitterMassGrams: number;
    releasedNutrientsGrams: number;
    visibleNutrientMarkers: number;
    litterMeshScale: number;
  };
  safety: { revealDepth: number; revealedHyphae: number };
  spore: {
    released: boolean;
    position: [number, number, number];
    outcome: string;
  };
  airflow: { directionRadians: number; strength: number };
  highlightedEvidenceIds: string[];
  reducedMotion: boolean;
  disposed: boolean;
}

export interface FungiNurseryWorldMetrics {
  drawCalls: number;
  visibleTriangles: number;
}

export interface FungiNurseryWorld {
  root: THREE.Group;
  landmarks: Record<FungiLandmarkId, THREE.Object3D>;
  project(projection: Readonly<FungiNurseryWorldProjection>): void;
  update(deltaSeconds: number, elapsedSeconds: number): void;
  setReducedMotion(reduced: boolean): void;
  snapshot(): FungiNurseryWorldSnapshot;
  metrics(): FungiNurseryWorldMetrics;
  dispose(): void;
}

const PALETTE = {
  soil: 0x2b3524,
  moss: 0x3d5730,
  bark: 0x4c3529,
  barkLight: 0x76573c,
  cream: 0xd8c9a6,
  mycelium: 0xe9e2cb,
  spore: 0xa8bd63,
  leaf: 0x55783f,
  cap: 0xa2542f,
  dough: 0xe3cfa4,
  glass: 0xa7bdaf,
  steel: 0x6b7780,
  nutrient: 0xc7a03c,
  warning: 0xc4632f,
} as const;

/** Instance capacities — the ceiling the frame budget is proven against. */
const BRANCH_CAPACITY = 96;
const SPORANGIA_CAPACITY = 32;
const SPORE_CAPACITY = 64;
const HYPHAE_CAPACITY = 72;
const HIDDEN_HYPHAE_CAPACITY = 40;
const NUTRIENT_CAPACITY = 36;
const BUBBLE_CAPACITY = 28;

/** Unrisen dough volume the yeast model starts every vessel from. */
const BASE_DOUGH_VOLUME_ML = 100;
const GRAMS_PER_NUTRIENT_MARKER = 1.6;

const LANDMARK_ORIGIN: Record<FungiLandmarkId, [number, number, number]> = {
  'triage-table': [0, 0, 0],
  'mycelium-log': [-4.4, 0, -0.6],
  'growth-chamber': [4.1, 0, -0.2],
  'fungi-at-work-bench': [7, 0, -1],
  'safety-station': [2.3, 0, -8.1],
  'nursery-gate': [0, 0, -12],
};

const MISSION_IDS = new Set<string>(FUNGI_MISSION_IDS);
const GROWTH_PHASES = new Set<string>([
  'dormant',
  'germinating',
  'extending',
  'colonising',
  'sporulating',
]);
const GROWTH_FIELDS = [
  'germinationDelayHours',
  'hyphalExtensionRate',
  'branchingDensity',
  'colonyRadiusMm',
  'surfaceCoverage',
  'sporulationReadiness',
  'sporeReleaseIntensity',
] as const;

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function requireFinite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`fungi nursery ${label} must be a finite number`);
  }
  return value;
}

function requireFiniteTriple(
  value: unknown,
  label: string,
): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`fungi nursery ${label} must contain three finite numbers`);
  }
  const triple = value.map((entry, index) =>
    requireFinite(entry, `${label}[${index}]`),
  );
  return [triple[0]!, triple[1]!, triple[2]!];
}

function validateProjection(
  projection: Readonly<FungiNurseryWorldProjection>,
): void {
  if (!projection || typeof projection !== 'object') {
    throw new Error('fungi nursery projection must be an object');
  }
  if (!MISSION_IDS.has(projection.missionId)) {
    throw new Error(`fungi nursery mission is unknown: ${String(projection.missionId)}`);
  }

  const growth = projection.growth;
  if (!growth || typeof growth !== 'object') {
    throw new Error('fungi nursery growth must be an experiment output');
  }
  for (const field of GROWTH_FIELDS) {
    const value = growth[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(
        `fungi nursery growth ${field} must be a non-negative finite number`,
      );
    }
  }
  if (!GROWTH_PHASES.has(growth.phase)) {
    throw new Error(`fungi nursery growth phase is unknown: ${String(growth.phase)}`);
  }

  requireFinite(projection.airflow?.directionRadians, 'airflow direction');
  requireFinite(projection.airflow?.strength, 'airflow strength');

  if (typeof projection.spore?.released !== 'boolean') {
    throw new Error('fungi nursery spore released must be a boolean');
  }
  requireFiniteTriple(projection.spore?.position, 'spore position');
  if (typeof projection.spore?.outcome !== 'string') {
    throw new Error('fungi nursery spore outcome must be a string');
  }

  requireFinite(projection.yeast?.temperatureC, 'yeast temperature');
  requireFinite(projection.yeast?.elapsedHours, 'yeast elapsed hours');
  if (typeof projection.yeast?.inoculated !== 'boolean') {
    throw new Error('fungi nursery yeast inoculated must be a boolean');
  }

  requireFinite(projection.litter?.temperatureC, 'litter temperature');
  requireFinite(projection.litter?.elapsedHours, 'litter elapsed hours');
  const litterMass = requireFinite(
    projection.litter?.initialLitterMassGrams,
    'litter mass',
  );
  if (litterMass <= 0) {
    throw new Error('fungi nursery litter mass must be greater than zero');
  }

  const depth = requireFinite(
    projection.safetyScanDepth,
    'safety scan depth',
  );
  if (depth < 0 || depth > 1) {
    throw new Error('fungi nursery safety scan depth must be between 0 and 1');
  }

  if (
    !Array.isArray(projection.highlightedEvidenceIds) ||
    projection.highlightedEvidenceIds.some((id) => typeof id !== 'string')
  ) {
    throw new Error('fungi nursery highlighted evidence IDs must be strings');
  }
}

export function createFungiNurseryWorld(
  config: FungiNurseryWorldConfig = {},
): FungiNurseryWorld {
  const seed = config.seed ?? 90210;
  if (!Number.isSafeInteger(seed)) throw new Error('seed must be a safe integer');
  const random = seededRandom(seed);

  const root = new THREE.Group();
  root.name = 'fungi-forest-nursery';

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  let disposed = false;
  let reducedMotion = config.reducedMotion ?? false;

  const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T) => {
    geometries.add(geometry);
    return geometry;
  };
  const ownMaterial = <T extends THREE.Material>(material: T) => {
    materials.add(material);
    return material;
  };

  const material = {
    soil: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.soil, roughness: 1 })),
    moss: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.moss, roughness: 0.95 })),
    bark: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.bark, roughness: 1 })),
    barkLight: ownMaterial(
      new THREE.MeshStandardMaterial({ color: PALETTE.barkLight, roughness: 0.9 }),
    ),
    cream: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.9 })),
    mycelium: ownMaterial(
      new THREE.MeshStandardMaterial({
        color: PALETTE.mycelium,
        roughness: 0.75,
        emissive: 0x2a281f,
      }),
    ),
    spore: ownMaterial(
      new THREE.MeshStandardMaterial({
        color: PALETTE.spore,
        roughness: 0.6,
        emissive: 0x273315,
        emissiveIntensity: 0.6,
      }),
    ),
    leaf: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.leaf, roughness: 0.88 })),
    cap: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.cap, roughness: 0.8 })),
    dough: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.dough, roughness: 0.85 })),
    steel: ownMaterial(
      new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.45, metalness: 0.6 }),
    ),
    nutrient: ownMaterial(
      new THREE.MeshStandardMaterial({
        color: PALETTE.nutrient,
        roughness: 0.5,
        emissive: 0x3a2c07,
        emissiveIntensity: 0.7,
      }),
    ),
    warning: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.warning, roughness: 0.8 })),
    glass: ownMaterial(
      new THREE.MeshPhysicalMaterial({
        color: PALETTE.glass,
        transparent: true,
        opacity: 0.2,
        roughness: 0.35,
        depthWrite: false,
      }),
    ),
  };

  const geometry = {
    box: ownGeometry(new THREE.BoxGeometry(1, 1, 1)),
    cylinder: ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 14)),
    sphere: ownGeometry(new THREE.SphereGeometry(1, 14, 10)),
    lowSphere: ownGeometry(new THREE.SphereGeometry(1, 8, 6)),
    cap: ownGeometry(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
    cone: ownGeometry(new THREE.ConeGeometry(1, 1, 12)),
    filament: ownGeometry(new THREE.CylinderGeometry(0.012, 0.02, 1, 5)),
    disc: ownGeometry(new THREE.CircleGeometry(1, 24)),
  };

  const addMesh = (
    parent: THREE.Object3D,
    meshGeometry: THREE.BufferGeometry,
    meshMaterial: THREE.Material,
    name: string,
  ) => {
    const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const scratchMatrix = new THREE.Matrix4();
  const scratchPosition = new THREE.Vector3();
  const scratchQuaternion = new THREE.Quaternion();
  const scratchScale = new THREE.Vector3();
  const scratchEuler = new THREE.Euler();

  /**
   * Instances are laid out once, inside the owning landmark's footprint, so a
   * projection only ever raises or lowers `count`. Nothing is created, moved
   * or destroyed while the learner is working.
   */
  const addInstanced = (
    parent: THREE.Object3D,
    instanceGeometry: THREE.BufferGeometry,
    instanceMaterial: THREE.Material,
    capacity: number,
    name: string,
    place: (index: number, position: THREE.Vector3, euler: THREE.Euler, scale: THREE.Vector3) => void,
  ) => {
    const mesh = new THREE.InstancedMesh(instanceGeometry, instanceMaterial, capacity);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    for (let index = 0; index < capacity; index += 1) {
      scratchPosition.set(0, 0, 0);
      scratchEuler.set(0, 0, 0);
      scratchScale.set(1, 1, 1);
      place(index, scratchPosition, scratchEuler, scratchScale);
      scratchQuaternion.setFromEuler(scratchEuler);
      scratchMatrix.compose(scratchPosition, scratchQuaternion, scratchScale);
      mesh.setMatrixAt(index, scratchMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = 0;
    parent.add(mesh);
    return mesh;
  };

  const landmarks = {} as Record<FungiLandmarkId, THREE.Group>;
  for (const id of FUNGI_NURSERY_LANDMARK_IDS) {
    const group = new THREE.Group();
    group.name = `landmark-${id}`;
    group.position.set(...LANDMARK_ORIGIN[id]);
    root.add(group);
    landmarks[id] = group;
  }

  // ── Ground: the clearing itself, not a landmark ──
  const ground = addMesh(root, geometry.box, material.soil, 'clearing-floor');
  ground.scale.set(26, 0.2, 26);
  ground.position.set(1, -0.1, -6);
  ground.castShadow = false;

  // ── Triage table: three specimens the learner classifies ──
  {
    const parent = landmarks['triage-table'];
    const top = addMesh(parent, geometry.box, material.barkLight, 'triage-top');
    top.scale.set(5.2, 0.12, 1.4);
    top.position.set(0, 0.9, 0);
    for (const x of [-2.3, 2.3]) {
      for (const z of [-0.5, 0.5]) {
        const leg = addMesh(parent, geometry.box, material.bark, 'triage-leg');
        leg.scale.set(0.14, 0.9, 0.14);
        leg.position.set(x, 0.45, z);
      }
    }

    const mushroomStem = addMesh(parent, geometry.cylinder, material.cream, 'specimen-mushroom-stem');
    mushroomStem.scale.set(0.12, 0.5, 0.12);
    mushroomStem.position.set(-2, 1.21, 0);
    const mushroomCap = addMesh(parent, geometry.cap, material.cap, 'specimen-mushroom-cap');
    mushroomCap.scale.set(0.42, 0.3, 0.42);
    mushroomCap.position.set(-2, 1.44, 0);

    const breadSlice = addMesh(parent, geometry.box, material.cream, 'specimen-bread');
    breadSlice.scale.set(0.62, 0.14, 0.62);
    breadSlice.position.set(0, 1.03, 0);
    const mouldPatch = addMesh(parent, geometry.disc, material.mycelium, 'specimen-bread-mould');
    mouldPatch.rotation.x = -Math.PI / 2;
    mouldPatch.scale.setScalar(0.22);
    mouldPatch.position.set(0, 1.11, 0);

    const pot = addMesh(parent, geometry.cylinder, material.bark, 'specimen-plant-pot');
    pot.scale.set(0.26, 0.26, 0.26);
    pot.position.set(2, 1.09, 0);
    const stalk = addMesh(parent, geometry.cylinder, material.leaf, 'specimen-plant-stalk');
    stalk.scale.set(0.035, 0.5, 0.035);
    stalk.position.set(2, 1.45, 0);
    for (let index = 0; index < 3; index += 1) {
      const leafMesh = addMesh(parent, geometry.cap, material.leaf, 'specimen-plant-leaf');
      leafMesh.scale.set(0.2, 0.04, 0.1);
      leafMesh.position.set(2 + Math.cos(index * 2.1) * 0.16, 1.55 + index * 0.08, Math.sin(index * 2.1) * 0.16);
      leafMesh.rotation.z = 0.5;
    }
  }

  // ── Mycelium log: the connected feeding network ──
  const logHyphae = (() => {
    const parent = landmarks['mycelium-log'];
    const log = addMesh(parent, geometry.cylinder, material.bark, 'mycelium-log-body');
    log.scale.set(0.42, 2.4, 0.42);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 0.42, 0);

    const scope = addMesh(parent, geometry.cylinder, material.steel, 'log-microscope');
    scope.scale.set(0.06, 0.62, 0.06);
    scope.position.set(0.9, 1.05, 0.5);
    const scopeBase = addMesh(parent, geometry.box, material.steel, 'log-microscope-base');
    scopeBase.scale.set(0.34, 0.06, 0.28);
    scopeBase.position.set(0.9, 0.75, 0.5);

    return addInstanced(
      parent,
      geometry.filament,
      material.mycelium,
      HYPHAE_CAPACITY,
      'log-hyphae',
      (index, position, euler, scale) => {
        const t = index / HYPHAE_CAPACITY;
        const along = (t - 0.5) * 2.1;
        const angle = random() * Math.PI * 2;
        const reach = 0.24 + random() * 0.42;
        position.set(along, 0.46 + Math.sin(angle) * 0.22, Math.cos(angle) * 0.3);
        euler.set(random() * 0.9 - 0.45, angle, Math.PI / 2 + random() * 0.7 - 0.35);
        scale.set(1, reach, 1);
      },
    );
  })();

  // ── Growth chamber: the controlled trial ──
  const chamber = (() => {
    const parent = landmarks['growth-chamber'];
    const bench = addMesh(parent, geometry.box, material.barkLight, 'chamber-bench');
    bench.scale.set(2.4, 0.12, 1.6);
    bench.position.set(0, 0.86, 0);
    for (const x of [-1, 1]) {
      const leg = addMesh(parent, geometry.box, material.bark, 'chamber-leg');
      leg.scale.set(0.14, 0.86, 0.14);
      leg.position.set(x, 0.43, 0);
    }
    const glass = addMesh(parent, geometry.box, material.glass, 'chamber-glass');
    glass.scale.set(1.9, 1.2, 1.2);
    glass.position.set(0, 1.52, 0);
    glass.castShadow = false;

    const dish = addMesh(parent, geometry.cylinder, material.cream, 'chamber-dish');
    dish.scale.set(0.62, 0.05, 0.62);
    dish.position.set(0, 0.95, 0);

    const colonyDisc = addMesh(parent, geometry.disc, material.mycelium, 'chamber-colony');
    colonyDisc.rotation.x = -Math.PI / 2;
    colonyDisc.position.set(0, 0.985, 0);
    colonyDisc.scale.setScalar(0.001);

    const branches = addInstanced(
      parent,
      geometry.filament,
      material.mycelium,
      BRANCH_CAPACITY,
      'chamber-branches',
      (index, position, euler, scale) => {
        const angle = index * 2.39996;
        const radius = 0.06 + Math.sqrt(index / BRANCH_CAPACITY) * 0.52;
        position.set(Math.cos(angle) * radius, 0.99, Math.sin(angle) * radius);
        euler.set(Math.PI / 2 - 0.25, angle, 0);
        scale.set(1, 0.1 + random() * 0.12, 1);
      },
    );

    const sporangia = addInstanced(
      parent,
      geometry.lowSphere,
      material.spore,
      SPORANGIA_CAPACITY,
      'chamber-sporangia',
      (index, position, euler, scale) => {
        const angle = index * 2.39996;
        const radius = 0.1 + Math.sqrt(index / SPORANGIA_CAPACITY) * 0.5;
        position.set(Math.cos(angle) * radius, 1.06 + random() * 0.05, Math.sin(angle) * radius);
        scale.setScalar(0.028);
      },
    );

    return { colonyDisc, branches, sporangia };
  })();

  // ── Spores in flight, released above the log and tray ──
  const sporeField = addInstanced(
    root,
    geometry.lowSphere,
    material.spore,
    SPORE_CAPACITY,
    'spore-field',
    (index, position, _euler, scale) => {
      const angle = index * 2.39996;
      const radius = 0.3 + Math.sqrt(index / SPORE_CAPACITY) * 1.5;
      position.set(-2.4 + Math.cos(angle) * radius, 1.6 + random() * 1.1, -0.4 + Math.sin(angle) * radius);
      scale.setScalar(0.022);
    },
  );

  const sporeMarker = addMesh(root, geometry.lowSphere, material.spore, 'landed-spore');
  sporeMarker.scale.setScalar(0.05);
  sporeMarker.visible = false;

  // ── Fungi at work: yeast vs control, medicine, decomposition ──
  const bench = (() => {
    const parent = landmarks['fungi-at-work-bench'];
    const top = addMesh(parent, geometry.box, material.barkLight, 'work-bench-top');
    top.scale.set(2.6, 0.12, 2.4);
    top.position.set(0, 0.9, -0.4);
    for (const x of [-1.1, 1.1]) {
      for (const z of [-1.3, 0.5]) {
        const leg = addMesh(parent, geometry.box, material.bark, 'work-bench-leg');
        leg.scale.set(0.13, 0.9, 0.13);
        leg.position.set(x, 0.45, z);
      }
    }

    const yeastJar = addMesh(parent, geometry.cylinder, material.glass, 'yeast-jar');
    yeastJar.scale.set(0.3, 0.44, 0.3);
    yeastJar.position.set(-0.75, 1.18, 0.1);
    yeastJar.castShadow = false;
    const controlJar = addMesh(parent, geometry.cylinder, material.glass, 'control-jar');
    controlJar.scale.set(0.3, 0.44, 0.3);
    controlJar.position.set(0.05, 1.18, 0.1);
    controlJar.castShadow = false;

    const yeastDough = addMesh(parent, geometry.sphere, material.dough, 'yeast-dough');
    yeastDough.position.set(-0.75, 1.06, 0.1);
    yeastDough.scale.setScalar(0.24);
    const controlDough = addMesh(parent, geometry.sphere, material.dough, 'control-dough');
    controlDough.position.set(0.05, 1.06, 0.1);
    controlDough.scale.setScalar(0.24);

    const bubbles = addInstanced(
      parent,
      geometry.lowSphere,
      material.cream,
      BUBBLE_CAPACITY,
      'yeast-bubbles',
      (index, position, _euler, scale) => {
        const angle = index * 2.39996;
        const radius = random() * 0.2;
        position.set(-0.75 + Math.cos(angle) * radius, 1.06 + (index / BUBBLE_CAPACITY) * 0.4, 0.1 + Math.sin(angle) * radius);
        scale.setScalar(0.018);
      },
    );

    const medicineDish = addMesh(parent, geometry.cylinder, material.cream, 'medicine-dish');
    medicineDish.scale.set(0.28, 0.05, 0.28);
    medicineDish.position.set(0.85, 0.99, 0.1);
    const inhibitionRing = addMesh(parent, geometry.disc, material.mycelium, 'inhibition-zone');
    inhibitionRing.rotation.x = -Math.PI / 2;
    inhibitionRing.scale.setScalar(0.16);
    inhibitionRing.position.set(0.85, 1.025, 0.1);

    const litter = addMesh(parent, geometry.cap, material.leaf, 'litter-pile');
    litter.position.set(0, 0.96, -1.3);
    litter.scale.set(0.6, 0.34, 0.6);

    const nutrients = addInstanced(
      parent,
      geometry.lowSphere,
      material.nutrient,
      NUTRIENT_CAPACITY,
      'released-nutrients',
      (index, position, _euler, scale) => {
        const angle = index * 2.39996;
        const radius = 0.12 + Math.sqrt(index / NUTRIENT_CAPACITY) * 0.55;
        position.set(Math.cos(angle) * radius, 0.99 + random() * 0.1, -1.3 + Math.sin(angle) * radius);
        scale.setScalar(0.026);
      },
    );

    return { yeastDough, controlDough, bubbles, litter, nutrients };
  })();

  // ── Safety station: hidden hyphae beneath a visible patch ──
  const safety = (() => {
    const parent = landmarks['safety-station'];
    const top = addMesh(parent, geometry.box, material.barkLight, 'safety-top');
    top.scale.set(2.6, 0.12, 1.4);
    top.position.set(0, 0.9, 0);
    for (const x of [-1.1, 1.1]) {
      const leg = addMesh(parent, geometry.box, material.bark, 'safety-leg');
      leg.scale.set(0.14, 0.9, 0.14);
      leg.position.set(x, 0.45, 0);
    }

    const freshItem = addMesh(parent, geometry.box, material.cream, 'fresh-item');
    freshItem.scale.set(0.6, 0.22, 0.5);
    freshItem.position.set(-0.7, 1.07, 0);

    const mouldyItem = addMesh(parent, geometry.box, material.cream, 'mouldy-item');
    mouldyItem.scale.set(0.6, 0.22, 0.5);
    mouldyItem.position.set(0.7, 1.07, 0);
    const visiblePatch = addMesh(parent, geometry.disc, material.warning, 'visible-mould-patch');
    visiblePatch.rotation.x = -Math.PI / 2;
    visiblePatch.scale.setScalar(0.12);
    visiblePatch.position.set(0.7, 1.185, 0);

    const scanner = addMesh(parent, geometry.box, material.steel, 'safety-scanner');
    scanner.scale.set(0.36, 0.1, 0.24);
    scanner.position.set(0, 1.5, 0.4);

    const hiddenHyphae = addInstanced(
      parent,
      geometry.filament,
      material.mycelium,
      HIDDEN_HYPHAE_CAPACITY,
      'hidden-hyphae',
      (index, position, euler, scale) => {
        const angle = index * 2.39996;
        const radius = 0.04 + Math.sqrt(index / HIDDEN_HYPHAE_CAPACITY) * 0.26;
        position.set(0.7 + Math.cos(angle) * radius, 1.06, Math.sin(angle) * radius);
        euler.set(Math.PI / 2 - 0.2, angle, 0);
        scale.set(1, 0.1 + random() * 0.14, 1);
      },
    );

    return { hiddenHyphae };
  })();

  // ── Nursery gate: where the recommendation is made ──
  {
    const parent = landmarks['nursery-gate'];
    for (const x of [-1.5, 1.5]) {
      const post = addMesh(parent, geometry.cylinder, material.bark, 'gate-post');
      post.scale.set(0.16, 2.2, 0.16);
      post.position.set(x, 1.1, 0);
    }
    const lintel = addMesh(parent, geometry.box, material.bark, 'gate-lintel');
    lintel.scale.set(3.4, 0.2, 0.24);
    lintel.position.set(0, 2.25, 0);

    const board = addMesh(parent, geometry.box, material.cream, 'evidence-board');
    board.scale.set(1.9, 1.1, 0.06);
    board.position.set(0, 1.3, -0.2);
  }

  const state: FungiNurseryWorldSnapshot = {
    missionId: 'diagnose',
    colony: {
      radiusMm: 0,
      coverage: 0,
      visibleBranches: 0,
      visibleSporangia: 0,
      releasedSpores: 0,
      phase: 'dormant',
    },
    yeast: {
      doughVolumeMl: BASE_DOUGH_VOLUME_ML,
      controlVolumeMl: BASE_DOUGH_VOLUME_ML,
      doughMeshScale: 1,
      controlMeshScale: 1,
    },
    decomposition: {
      remainingLitterMassGrams: 0,
      releasedNutrientsGrams: 0,
      visibleNutrientMarkers: 0,
      litterMeshScale: 1,
    },
    safety: { revealDepth: 0, revealedHyphae: 0 },
    spore: { released: false, position: [0, 0, 0], outcome: 'pending' },
    airflow: { directionRadians: 0, strength: 0 },
    highlightedEvidenceIds: [],
    reducedMotion,
    disposed: false,
  };

  const DOUGH_BASE_SCALE = 0.24;
  const LITTER_BASE_SCALE = new THREE.Vector3(0.6, 0.34, 0.6);

  function project(projection: Readonly<FungiNurseryWorldProjection>): void {
    if (disposed) {
      throw new Error('fungi nursery world has been disposed');
    }
    validateProjection(projection);

    const { growth } = projection;

    // Colony — every rendered structure is a quantity the model produced.
    const visibleBranches = Math.round(
      Math.min(1, growth.surfaceCoverage) * BRANCH_CAPACITY,
    );
    const visibleSporangia = Math.round(
      Math.min(1, growth.sporulationReadiness) * SPORANGIA_CAPACITY,
    );
    const releasedSpores = Math.round(
      Math.min(1, growth.sporeReleaseIntensity) * SPORE_CAPACITY,
    );
    chamber.branches.count = visibleBranches;
    chamber.sporangia.count = visibleSporangia;
    sporeField.count = releasedSpores;
    chamber.colonyDisc.scale.setScalar(
      Math.max(0.001, (growth.colonyRadiusMm / 1000) * 12),
    );
    logHyphae.count = Math.round(Math.min(1, growth.branchingDensity) * HYPHAE_CAPACITY);

    // Yeast dough beside its no-yeast control.
    const doughResponse = calculateYeastDoughResponse({
      temperatureC: projection.yeast.temperatureC,
      elapsedHours: projection.yeast.elapsedHours,
      yeastPresent: projection.yeast.inoculated,
    });
    const controlResponse = calculateYeastDoughResponse({
      temperatureC: projection.yeast.temperatureC,
      elapsedHours: projection.yeast.elapsedHours,
      yeastPresent: false,
    });
    const doughMeshScale = Math.cbrt(doughResponse.doughVolumeMl / BASE_DOUGH_VOLUME_ML);
    const controlMeshScale = Math.cbrt(controlResponse.doughVolumeMl / BASE_DOUGH_VOLUME_ML);
    bench.yeastDough.scale.setScalar(DOUGH_BASE_SCALE * doughMeshScale);
    bench.controlDough.scale.setScalar(DOUGH_BASE_SCALE * controlMeshScale);
    bench.bubbles.count = Math.round(
      Math.min(1, Math.max(0, doughResponse.doughExpansion)) * BUBBLE_CAPACITY,
    );

    // Decomposition: litter shrinks as nutrients appear.
    const decomposition = calculateLitterDecomposition({
      temperatureC: projection.litter.temperatureC,
      elapsedHours: projection.litter.elapsedHours,
      initialLitterMassGrams: projection.litter.initialLitterMassGrams,
    });
    const litterMeshScale = Math.cbrt(
      decomposition.remainingLitterMassGrams / projection.litter.initialLitterMassGrams,
    );
    bench.litter.scale.copy(LITTER_BASE_SCALE).multiplyScalar(litterMeshScale);
    const visibleNutrientMarkers = Math.min(
      NUTRIENT_CAPACITY,
      Math.round(decomposition.releasedNutrientsGrams / GRAMS_PER_NUTRIENT_MARKER),
    );
    bench.nutrients.count = visibleNutrientMarkers;

    // Safety: hyphae are revealed only as deep as the scanner reached.
    const revealedHyphae = Math.round(
      projection.safetyScanDepth * HIDDEN_HYPHAE_CAPACITY,
    );
    safety.hiddenHyphae.count = revealedHyphae;

    // Spore flight.
    sporeMarker.visible = projection.spore.released;
    sporeMarker.position.set(
      projection.spore.position[0],
      projection.spore.position[1],
      projection.spore.position[2],
    );

    state.missionId = projection.missionId;
    state.colony = {
      radiusMm: growth.colonyRadiusMm,
      coverage: growth.surfaceCoverage,
      visibleBranches,
      visibleSporangia,
      releasedSpores,
      phase: growth.phase,
    };
    state.yeast = {
      doughVolumeMl: doughResponse.doughVolumeMl,
      controlVolumeMl: controlResponse.doughVolumeMl,
      doughMeshScale,
      controlMeshScale,
    };
    state.decomposition = {
      remainingLitterMassGrams: decomposition.remainingLitterMassGrams,
      releasedNutrientsGrams: decomposition.releasedNutrientsGrams,
      visibleNutrientMarkers,
      litterMeshScale,
    };
    state.safety = {
      revealDepth: projection.safetyScanDepth,
      revealedHyphae,
    };
    state.spore = {
      released: projection.spore.released,
      position: [
        projection.spore.position[0],
        projection.spore.position[1],
        projection.spore.position[2],
      ],
      outcome: projection.spore.outcome,
    };
    state.airflow = {
      directionRadians: projection.airflow.directionRadians,
      strength: projection.airflow.strength,
    };
    state.highlightedEvidenceIds = [...projection.highlightedEvidenceIds];
  }

  function update(deltaSeconds: number, elapsedSeconds: number): void {
    if (disposed || reducedMotion) return;
    if (!Number.isFinite(deltaSeconds) || !Number.isFinite(elapsedSeconds)) return;
    // Drift the released spore cloud on the authored airflow. Rotating the
    // instanced field costs no allocation and creates no new objects.
    sporeField.rotation.y = state.airflow.directionRadians + elapsedSeconds * 0.05 * state.airflow.strength;
    sporeField.position.y = Math.sin(elapsedSeconds * 0.6) * 0.03;
  }

  function setReducedMotion(reduced: boolean): void {
    reducedMotion = reduced;
    state.reducedMotion = reduced;
    if (reduced) {
      sporeField.rotation.y = state.airflow.directionRadians;
      sporeField.position.y = 0;
    }
  }

  function snapshot(): FungiNurseryWorldSnapshot {
    return structuredClone(state);
  }

  function metrics(): FungiNurseryWorldMetrics {
    let drawCalls = 0;
    let visibleTriangles = 0;
    root.traverse((object) => {
      const mesh = object as THREE.Mesh & { isMesh?: boolean; count?: number };
      if (!mesh.isMesh || !mesh.visible) return;
      const instanced = object as THREE.InstancedMesh;
      const instances = (object as { isInstancedMesh?: boolean }).isInstancedMesh
        ? instanced.count
        : 1;
      if (instances <= 0) return;
      drawCalls += 1;
      const geometryRef = mesh.geometry;
      const triangles = geometryRef.index
        ? geometryRef.index.count / 3
        : (geometryRef.getAttribute('position')?.count ?? 0) / 3;
      visibleTriangles += triangles * instances;
    });
    return { drawCalls, visibleTriangles };
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    state.disposed = true;
    root.traverse((object) => {
      const instanced = object as THREE.InstancedMesh;
      if ((object as { isInstancedMesh?: boolean }).isInstancedMesh) {
        instanced.instanceMatrix.array = new Float32Array(0);
      }
    });
    for (const owned of geometries) owned.dispose();
    for (const owned of materials) owned.dispose();
    geometries.clear();
    materials.clear();
    root.clear();
  }

  return {
    root,
    landmarks,
    project,
    update,
    setReducedMotion,
    snapshot,
    metrics,
    dispose,
  };
}
