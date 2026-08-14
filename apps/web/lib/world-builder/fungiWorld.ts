import * as THREE from 'three';
import type {
  FungalObjectId,
  FungalQuizAnswer,
  FungalSafetyOutcome,
  FungalUsefulRoleMatch,
  FungiDevelopmentState,
} from '@xr-school/simulation-runtime';

export const FUNGI_STAGE_IDS = [
  'fungal-forensics',
  'under-the-cap',
  'spore-flight',
  'five-day-time-lens',
  'fungi-at-work',
  'food-safety-scan',
  'forest-circle',
] as const;

export type FungiStageId = typeof FUNGI_STAGE_IDS[number];

/** Stable interaction IDs consumed by the fungi lesson adapter. */
export const FUNGI_TARGET_IDS = [
  'mushroom',
  'bread-mould',
  'green-plant',
  'hypha-tip-alpha',
  'hypha-tip-beta',
  'hypha-tip-gamma',
  'hypha-network-label',
  'spore-guide',
  'spore-landing',
  'day-1',
  'day-2',
  'day-3',
  'day-4',
  'day-5',
  'yeast',
  'dough',
  'dough-before',
  'dough-after',
  'role-bakery',
  'role-medicine',
  'role-compost',
  'fresh-item',
  'mouldy-item',
  'safety-warning',
  'mould-hidden-hyphae',
  'quiz-mushroom-1',
  'quiz-mushroom-2',
  'quiz-mushroom-3',
  'quiz-mushroom-4',
  'completion-badge',
  'sandbox-temperature',
  'sandbox-moisture',
] as const;

export type FungiTargetId = typeof FUNGI_TARGET_IDS[number];

/** The four assessment prompts represented by the final quiz mushrooms. */
export const FUNGI_QUIZ_TARGET_BY_QUESTION = {
  'development-order-observation': 'quiz-mushroom-1',
  'baking-fungus-observation': 'quiz-mushroom-2',
  'mould-safety-misconception': 'quiz-mushroom-3',
  'forest-transfer': 'quiz-mushroom-4',
} as const satisfies Record<string, FungiTargetId>;

export interface FungiWorldConfig {
  seed?: number;
  profile?: 'questBaseline' | 'browserBalanced' | 'browserEnhanced';
  reducedMotion?: boolean;
}

export type FungiWorldStateProjection = Partial<Pick<
  FungiDevelopmentState,
  | 'selectedFungi'
  | 'touchedHyphae'
  | 'sporeGuidance'
  | 'sporeLandings'
  | 'visitedDays'
  | 'usefulRoleMatches'
  | 'safetyDecisions'
  | 'safetyMisconceptionResolved'
  | 'quizAnswers'
  | 'completed'
>> & {
  currentDay?: number;
  doughRise?: number;
  doughRisen?: boolean;
  sandboxEnabled?: boolean;
  sandboxTemperatureC?: number;
  sandboxMoisturePercent?: number;
};

export interface FungiWorldMetrics {
  drawCalls: number;
  visibleTriangles: number;
}

export interface FungiWorldSnapshot {
  stage: FungiStageId;
  currentDay: number;
  growth: {
    phase: 'landed-spore' | 'hyphae-visible' | 'mycelium-spreading' | 'spore-structures' | 'spores-released';
    visibleStructures: number;
    coverage: number;
  };
  touchedHyphae: string[];
  completed: boolean;
  sandboxEnabled: boolean;
  paused: boolean;
  reducedMotion: boolean;
  disposed: boolean;
  ambientPhase: number;
  sporeOffset: number;
  layoutSignature: string;
}

export interface FungiWorld {
  root: THREE.Group;
  targets: Record<FungiTargetId, THREE.Object3D>;
  setStage(stageId: FungiStageId): void;
  setState(state: Readonly<FungiWorldStateProjection>): void;
  update(deltaSeconds: number, elapsedSeconds: number): void;
  pause(): void;
  resume(): void;
  setReducedMotion(reduced: boolean): void;
  snapshot(): FungiWorldSnapshot;
  metrics(): FungiWorldMetrics;
  dispose(): void;
}

const PALETTE = {
  moss: 0x30472e,
  deepMoss: 0x17291f,
  bark: 0x4c3529,
  barkLight: 0x73523a,
  amber: 0xc68b3c,
  cream: 0xd8c9a6,
  mycelium: 0xe8e1c9,
  spore: 0xa8bd63,
  leaf: 0x52743f,
  warning: 0xc56a3a,
  slate: 0x526062,
} as const;

const GROWTH = [
  { phase: 'landed-spore', visibleStructures: 1, coverage: 0.04 },
  { phase: 'hyphae-visible', visibleStructures: 5, coverage: 0.18 },
  { phase: 'mycelium-spreading', visibleStructures: 13, coverage: 0.46 },
  { phase: 'spore-structures', visibleStructures: 21, coverage: 0.7 },
  { phase: 'spores-released', visibleStructures: 37, coverage: 0.92 },
] as const;

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function requireFiniteRange(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  if (value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}`);
}

function effectivelyVisible(object: THREE.Object3D) {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (!cursor.visible) return false;
    cursor = cursor.parent;
  }
  return true;
}

function trianglesForGeometry(geometry: THREE.BufferGeometry) {
  if (geometry.index) return geometry.index.count / 3;
  return (geometry.getAttribute('position')?.count ?? 0) / 3;
}

export function createFungiWorld(config: FungiWorldConfig = {}): FungiWorld {
  const seed = config.seed ?? 41723;
  if (!Number.isSafeInteger(seed)) throw new Error('seed must be a safe integer');
  if (config.reducedMotion !== undefined && typeof config.reducedMotion !== 'boolean') {
    throw new Error('reduced motion must be boolean');
  }
  if (config.profile && !['questBaseline', 'browserBalanced', 'browserEnhanced'].includes(config.profile)) {
    throw new Error(`Unknown fungi quality profile ${String(config.profile)}`);
  }

  const random = seededRandom(seed);
  const root = new THREE.Group();
  root.name = 'fungi-living-mycelium-world';
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const targets = {} as Record<FungiTargetId, THREE.Object3D>;
  const layers = {} as Record<FungiStageId, THREE.Group>;
  const layoutParts: string[] = [];
  let disposed = false;

  const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T) => {
    geometries.add(geometry);
    return geometry;
  };
  const ownMaterial = <T extends THREE.Material>(material: T) => {
    materials.add(material);
    return material;
  };
  const disposeOwned = () => {
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  };

  try {
    const material = {
      ground: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.deepMoss, roughness: 1 })),
      moss: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.moss, roughness: 0.95 })),
      bark: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.bark, roughness: 1 })),
      barkLight: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.barkLight, roughness: 0.9 })),
      amber: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.amber, roughness: 0.72 })),
      cream: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.9 })),
      mycelium: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.mycelium, roughness: 0.78, emissive: 0x28261d })),
      spore: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.spore, roughness: 0.65, emissive: 0x273315, emissiveIntensity: 0.5 })),
      leaf: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.leaf, roughness: 0.88 })),
      warning: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.warning, roughness: 0.78 })),
      slate: ownMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.slate, roughness: 0.78 })),
      glass: ownMaterial(new THREE.MeshPhysicalMaterial({ color: 0xa7bdaf, transparent: true, opacity: 0.22, roughness: 0.4, depthWrite: false })),
      hit: ownMaterial(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.005, depthWrite: false, color: 0xffffff })),
    };

    const geometry = {
      unitSphere: ownGeometry(new THREE.SphereGeometry(1, 12, 8)),
      smoothSphere: ownGeometry(new THREE.SphereGeometry(1, 18, 12)),
      cylinder: ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 12)),
      cone: ownGeometry(new THREE.ConeGeometry(1, 1, 12)),
      box: ownGeometry(new THREE.BoxGeometry(1, 1, 1)),
      plane: ownGeometry(new THREE.PlaneGeometry(1, 1)),
      torus: ownGeometry(new THREE.TorusGeometry(1, 0.18, 8, 20)),
      cap: ownGeometry(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
      gill: ownGeometry(new THREE.BoxGeometry(0.7, 0.018, 0.04)),
      star: ownGeometry(new THREE.TorusKnotGeometry(0.18, 0.045, 32, 6, 2, 3)),
      warningTriangle: ownGeometry(new THREE.ConeGeometry(1, 1, 3)),
    };

    const addMesh = (
      parent: THREE.Object3D,
      meshGeometry: THREE.BufferGeometry,
      meshMaterial: THREE.Material,
      name?: string,
      shadows: { castShadow?: boolean; receiveShadow?: boolean } = {},
    ) => {
      const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
      if (name) mesh.name = name;
      mesh.castShadow = shadows.castShadow ?? true;
      mesh.receiveShadow = shadows.receiveShadow ?? true;
      parent.add(mesh);
      return mesh;
    };

    const addTarget = (
      id: FungiTargetId,
      layer: THREE.Group,
      position: readonly [number, number, number],
      radius = 0.34,
    ) => {
      const group = new THREE.Group();
      group.name = `target-${id}`;
      group.position.set(...position);
      group.userData.targetId = id;
      const hit = addMesh(group, geometry.unitSphere, material.hit, `${id}-hit-volume`, {
        castShadow: false,
        receiveShadow: false,
      });
      hit.scale.setScalar(radius);
      hit.userData.interactionSurface = true;
      layer.add(group);
      targets[id] = group;
      return group;
    };

    const makeMushroom = (parent: THREE.Object3D, scale = 1, capMaterial = material.amber) => {
      const specimen = new THREE.Group();
      const stem = addMesh(specimen, geometry.cylinder, material.cream);
      stem.scale.set(0.11, 0.48, 0.11);
      stem.position.y = 0.23;
      const cap = addMesh(specimen, geometry.cap, capMaterial);
      cap.scale.set(0.43, 0.22, 0.43);
      cap.position.y = 0.47;
      for (let index = 0; index < 8; index += 1) {
        const gill = addMesh(specimen, geometry.gill, material.cream);
        gill.position.y = 0.46;
        gill.rotation.y = index / 8 * Math.PI;
      }
      specimen.scale.setScalar(scale);
      parent.add(specimen);
      return specimen;
    };

    // Persistent cool, moist forest envelope. Fog is represented by layered
    // translucent mist volumes because this module owns a Group, not a renderer Scene.
    root.add(new THREE.HemisphereLight(0xb8c7c1, 0x172018, 1.25));
    const key = new THREE.DirectionalLight(0xffdda4, 2.1);
    key.position.set(-4, 7, 3);
    key.castShadow = true;
    root.add(key);
    const fill = new THREE.DirectionalLight(0x9fb9bf, 0.65);
    fill.position.set(5, 3, -4);
    root.add(fill);

    const ground = addMesh(root, ownGeometry(new THREE.CylinderGeometry(7.8, 8.3, 0.3, 36)), material.ground, 'deep-moss-forest-floor');
    ground.position.y = -0.2;
    const mossPatch = addMesh(root, ownGeometry(new THREE.CircleGeometry(6.8, 36)), material.moss, 'moss-carpet');
    mossPatch.rotation.x = -Math.PI / 2;
    mossPatch.position.y = -0.04;

    const trunkGeometry = ownGeometry(new THREE.CylinderGeometry(0.16, 0.25, 3.6, 8));
    const canopyGeometry = ownGeometry(new THREE.ConeGeometry(0.8, 2.2, 9));
    const trunks = new THREE.InstancedMesh(trunkGeometry, material.bark, 18);
    const canopies = new THREE.InstancedMesh(canopyGeometry, material.leaf, 18);
    trunks.name = 'deterministic-tree-trunks';
    canopies.name = 'deterministic-forest-foliage';
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 18; index += 1) {
      const angle = index / 18 * Math.PI * 2 + (random() - 0.5) * 0.18;
      const radius = 5.5 + random() * 1.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 0.82 + random() * 0.36;
      dummy.position.set(x, 1.72 * height, z);
      dummy.scale.set(0.9 + random() * 0.25, height, 0.9 + random() * 0.25);
      dummy.rotation.y = random() * Math.PI;
      dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);
      dummy.position.set(x, 3.55 * height, z);
      dummy.scale.setScalar(0.78 + random() * 0.28);
      dummy.updateMatrix();
      canopies.setMatrixAt(index, dummy.matrix);
      layoutParts.push(`${x.toFixed(3)},${z.toFixed(3)},${height.toFixed(3)}`);
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    root.add(trunks, canopies);

    const fallenLog = addMesh(root, ownGeometry(new THREE.CylinderGeometry(0.36, 0.42, 3.1, 14)), material.bark, 'fallen-log');
    fallenLog.rotation.z = Math.PI / 2;
    fallenLog.rotation.y = -0.22;
    fallenLog.position.set(-2.7, 0.32, 2.1);
    const rock = addMesh(root, geometry.smoothSphere, material.slate, 'forest-rock');
    rock.scale.set(0.8, 0.42, 0.65);
    rock.position.set(3.15, 0.32, 2.45);
    for (let index = 0; index < 3; index += 1) {
      const mist = addMesh(root, geometry.plane, material.glass, `cool-mist-layer-${index + 1}`, {
        castShadow: false,
        receiveShadow: false,
      });
      mist.scale.set(9 - index, 1.2 + index * 0.25, 1);
      mist.position.set(0, 0.5 + index * 0.5, -3.8 + index * 3.7);
      mist.userData.fogDensity = 0.022;
    }

    for (const stage of FUNGI_STAGE_IDS) {
      const layer = new THREE.Group();
      layer.name = `fungi-stage-${stage}`;
      root.add(layer);
      layers[stage] = layer;
    }

    // 1. Fungal forensics: three readable specimens.
    const forensic = layers['fungal-forensics'];
    const jitter = () => (random() - 0.5) * 0.24;
    const mushroomTarget = addTarget('mushroom', forensic, [-1.9 + jitter(), 0.04, 0.2 + jitter()], 0.58);
    makeMushroom(mushroomTarget, 1.45);
    const breadTarget = addTarget('bread-mould', forensic, [0 + jitter(), 0.12, 0.25 + jitter()], 0.68);
    const bread = addMesh(breadTarget, geometry.box, material.cream, 'bread-slice');
    bread.scale.set(0.78, 0.55, 0.2);
    const mould = addMesh(breadTarget, geometry.smoothSphere, material.moss, 'bread-mould-colony');
    mould.scale.set(0.42, 0.16, 0.24);
    mould.position.set(0.15, 0.35, 0.17);
    const plantTarget = addTarget('green-plant', forensic, [1.9 + jitter(), 0.04, 0.15 + jitter()], 0.64);
    const plantStem = addMesh(plantTarget, geometry.cylinder, material.leaf, 'green-plant-stem');
    plantStem.scale.set(0.045, 0.75, 0.045);
    plantStem.position.y = 0.38;
    for (let index = 0; index < 5; index += 1) {
      const leaf = addMesh(plantTarget, geometry.smoothSphere, material.leaf, `green-leaf-${index + 1}`);
      leaf.scale.set(0.32, 0.09, 0.17);
      leaf.position.set(index % 2 ? 0.2 : -0.2, 0.18 + index * 0.14, 0);
      leaf.rotation.z = index % 2 ? 0.5 : -0.5;
    }

    // 2. Under-cap cutaway with deterministic branching TubeGeometry.
    const underCap = layers['under-the-cap'];
    const networkBase = addMesh(underCap, geometry.cylinder, material.cream, 'under-cap-cutaway');
    networkBase.scale.set(2.5, 0.09, 2.5);
    networkBase.position.y = 1.05;
    const endpoints: Array<readonly [number, number, number]> = [
      [-1.6, 0.3, -0.85], [1.5, 0.25, -0.65], [0.65, 0.28, 1.35],
    ];
    for (let branch = 0; branch < 9; branch += 1) {
      const angle = branch / 9 * Math.PI * 2 + random() * 0.2;
      const extent = 0.65 + (branch % 3) * 0.48;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.12, 0),
        new THREE.Vector3(Math.cos(angle) * extent * 0.45, 0.16 + random() * 0.08, Math.sin(angle) * extent * 0.45),
        new THREE.Vector3(Math.cos(angle + 0.1) * extent, 0.2 + random() * 0.08, Math.sin(angle + 0.1) * extent),
      ]);
      addMesh(underCap, ownGeometry(new THREE.TubeGeometry(curve, 10, 0.025, 5, false)), material.mycelium, `hypha-branch-${branch + 1}`);
    }
    const tipIds = ['hypha-tip-alpha', 'hypha-tip-beta', 'hypha-tip-gamma'] as const;
    tipIds.forEach((id, index) => {
      const target = addTarget(id, underCap, endpoints[index], 0.32);
      const tip = addMesh(target, geometry.smoothSphere, material.mycelium, `${id}-visible-tip`);
      tip.scale.setScalar(0.12);
      const collar = addMesh(target, geometry.star, material.spore, `${id}-shape-cue`);
      collar.visible = false;
      collar.userData.touchedCue = true;
    });
    const networkLabel = addTarget('hypha-network-label', underCap, [0, 1.65, -0.2], 0.44);
    const labelPlate = addMesh(networkLabel, geometry.box, material.slate, 'complete-network-label-anchor');
    labelPlate.scale.set(0.9, 0.24, 0.04);

    // 3. Spore flight. Positions are updated in-place with one reusable dummy.
    const sporeLayer = layers['spore-flight'];
    const sourceMushroom = new THREE.Group();
    sourceMushroom.position.set(-1.7, 0, 0);
    makeMushroom(sourceMushroom, 1.6);
    sporeLayer.add(sourceMushroom);
    const sporeGeometry = ownGeometry(new THREE.SphereGeometry(0.045, 7, 5));
    const spores = new THREE.InstancedMesh(sporeGeometry, material.spore, config.profile === 'browserEnhanced' ? 72 : 48);
    spores.name = 'gill-spore-current';
    sporeLayer.add(spores);
    const sporeBases = new Float32Array(spores.count * 3);
    for (let index = 0; index < spores.count; index += 1) {
      sporeBases[index * 3] = -1.35 + (index % 12) * 0.25 + random() * 0.05;
      sporeBases[index * 3 + 1] = 0.35 + Math.floor(index / 12) * 0.18 + random() * 0.08;
      sporeBases[index * 3 + 2] = -0.25 + (random() - 0.5) * 0.75;
    }
    const sporeDummy = new THREE.Object3D();
    const placeSpores = (time: number) => {
      for (let index = 0; index < spores.count; index += 1) {
        const phase = index * 0.73;
        sporeDummy.position.set(
          sporeBases[index * 3] + Math.sin(time * 0.7 + phase) * 0.12,
          sporeBases[index * 3 + 1] + Math.sin(time * 1.1 + phase) * 0.045,
          sporeBases[index * 3 + 2] + Math.cos(time * 0.55 + phase) * 0.08,
        );
        sporeDummy.scale.setScalar(0.72 + index % 4 * 0.09);
        sporeDummy.updateMatrix();
        spores.setMatrixAt(index, sporeDummy.matrix);
      }
      spores.instanceMatrix.needsUpdate = true;
    };
    placeSpores(0);
    const guide = addTarget('spore-guide', sporeLayer, [0, 1.05, 0], 0.55);
    const currentArrow = addMesh(guide, geometry.cone, material.spore, 'gentle-current-guide');
    currentArrow.scale.set(0.14, 0.5, 0.14);
    currentArrow.rotation.z = -Math.PI / 2;
    const landing = addTarget('spore-landing', sporeLayer, [2.05, 0.04, 0], 0.72);
    const landingRing = addMesh(landing, geometry.torus, material.spore, 'spore-landing-indicator');
    landingRing.scale.setScalar(0.55);
    landingRing.rotation.x = Math.PI / 2;

    // 4. Five-day time lens with geometry, coverage, and structure count changes.
    const timeLens = layers['five-day-time-lens'];
    const dayDisplays: THREE.Group[] = [];
    const dayTargetMaterial = [material.cream, material.mycelium, material.moss, material.bark, material.spore];
    for (let day = 1; day <= 5; day += 1) {
      const dayTarget = addTarget(`day-${day}` as FungiTargetId, timeLens, [-2.4 + (day - 1) * 1.2, 0.25, 1.65], 0.44);
      const dial = addMesh(dayTarget, geometry.cylinder, dayTargetMaterial[day - 1], `day-${day}-control`);
      dial.scale.set(0.32, 0.12, 0.32);
      const display = new THREE.Group();
      display.name = `bread-growth-day-${day}`;
      display.visible = day === 1;
      timeLens.add(display);
      const growth = GROWTH[day - 1];
      display.userData.phase = growth.phase;
      display.userData.coverage = growth.coverage;
      for (let index = 0; index < growth.visibleStructures; index += 1) {
        const kind = index === 0
          ? 'landed-spore'
          : index < 5
            ? 'hypha'
            : index < 13
              ? 'mycelium'
              : index < 21
                ? 'sporangium'
                : 'released-spore';
        const isHypha = kind === 'hypha';
        const isSporangium = kind === 'sporangium';
        const isReleasedSpore = kind === 'released-spore';
        const structure = addMesh(
          display,
          isHypha || isSporangium ? geometry.cylinder : geometry.smoothSphere,
          isReleasedSpore ? material.spore : index === 0 ? material.moss : material.mycelium,
          `day-${day}-${kind}-${index + 1}`,
        );
        structure.userData.growthStructure = kind;
        const angle = index * 2.399963;
        const radius = day === 1 ? 0 : 0.18 + (index % Math.max(2, day * 2)) * 0.13;
        structure.position.set(Math.cos(angle) * radius, 0.25 + (isSporangium ? 0.17 : (index % 3) * 0.025), Math.sin(angle) * radius);
        if (isHypha) {
          structure.scale.set(0.022, 0.25, 0.022);
          structure.rotation.z = Math.PI / 2;
          structure.rotation.y = angle;
        } else if (isSporangium) structure.scale.set(0.035, 0.34, 0.035);
        else structure.scale.setScalar(isReleasedSpore ? 0.035 : 0.07 + day * 0.014);
      }
      const breadBase = addMesh(display, geometry.box, material.cream, `day-${day}-bread-surface`);
      breadBase.scale.set(2.25, 0.16, 1.35);
      breadBase.position.y = 0.02;
      dayDisplays.push(display);
    }

    // 5. Useful fungi portals and a visible yeast/dough transformation.
    const useful = layers['fungi-at-work'];
    const portalIds = ['role-bakery', 'role-medicine', 'role-compost'] as const;
    const portalRoles = {
      'role-bakery': 'food',
      'role-medicine': 'medicine',
      'role-compost': 'decomposer',
    } as const;
    const portalX = [-2.2, 0, 2.2];
    portalIds.forEach((id, index) => {
      const portal = addTarget(id, useful, [portalX[index], 0.2, 0.25], 0.72);
      const left = addMesh(portal, geometry.box, index === 0 ? material.amber : index === 1 ? material.slate : material.moss);
      left.scale.set(0.12, 1.4, 0.12);
      left.position.set(-0.65, 0.65, 0);
      const right = addMesh(portal, geometry.box, left.material as THREE.Material);
      right.scale.copy(left.scale);
      right.position.set(0.65, 0.65, 0);
      const top = addMesh(portal, geometry.box, left.material as THREE.Material);
      top.scale.set(0.77, 0.12, 0.12);
      top.position.y = 1.3;
      portal.userData.role = portalRoles[id];
    });
    const yeast = addTarget('yeast', useful, [-1.15, 0.25, 1.8], 0.45);
    for (let index = 0; index < 7; index += 1) {
      const cell = addMesh(yeast, geometry.smoothSphere, material.amber, `yeast-cell-${index + 1}`);
      cell.scale.set(0.08, 0.1, 0.08);
      cell.position.set((index % 3) * 0.14 - 0.14, Math.floor(index / 3) * 0.13, 0);
    }
    const dough = addTarget('dough', useful, [1.15, 0.52, 1.8], 1.15);
    dough.userData.action = 'observe-dough-rise';
    const doughBefore = addTarget('dough-before', dough, [-0.62, -0.24, 0], 0.48);
    const beforeBody = addMesh(doughBefore, geometry.smoothSphere, material.cream, 'unrisen-dough-body');
    beforeBody.scale.set(0.46, 0.28, 0.46);
    const doughAfter = addTarget('dough-after', dough, [0.62, -0.24, 0], 0.7);
    const afterBody = addMesh(doughAfter, geometry.smoothSphere, material.cream, 'risen-dough-body');
    afterBody.scale.set(0.56, 0.34, 0.56);
    const bubbles = new THREE.Group();
    bubbles.name = 'risen-dough-bubbles';
    doughAfter.add(bubbles);
    for (let index = 0; index < 5; index += 1) {
      const bubble = addMesh(bubbles, geometry.torus, material.amber, `dough-bubble-${index + 1}`);
      bubble.scale.setScalar(0.055 + index * 0.008);
      bubble.position.set(-0.24 + index * 0.12, 0.18 + (index % 2) * 0.08, 0.48);
    }

    // 6. Safety scan with redundant symbol/shape cues.
    const safety = layers['food-safety-scan'];
    const basket = addMesh(safety, geometry.box, material.barkLight, 'market-basket');
    basket.scale.set(3.4, 0.18, 1.7);
    basket.position.y = 0.08;
    const fresh = addTarget('fresh-item', safety, [-1.15, 0.42, 0], 0.6);
    const freshFood = addMesh(fresh, geometry.smoothSphere, material.cream, 'fresh-food-checkmark-anchor');
    freshFood.scale.set(0.55, 0.34, 0.45);
    const checkShort = addMesh(fresh, geometry.box, material.leaf, 'safe-check-short-stroke');
    checkShort.scale.set(0.07, 0.23, 0.04);
    checkShort.position.set(-0.17, 0.43, 0.47);
    checkShort.rotation.z = -0.65;
    const checkLong = addMesh(fresh, geometry.box, material.leaf, 'safe-check-long-stroke');
    checkLong.scale.set(0.07, 0.36, 0.04);
    checkLong.position.set(0.08, 0.54, 0.47);
    checkLong.rotation.z = 0.7;
    const safePlaque = addMesh(fresh, geometry.box, material.slate, 'safe-label-plaque');
    safePlaque.scale.set(0.72, 0.17, 0.035);
    safePlaque.position.set(0, 1.0, 0);
    safePlaque.userData.text = 'Fresh: check before using';
    fresh.userData.symbol = 'check';
    const mouldy = addTarget('mouldy-item', safety, [0.5, 0.42, 0], 0.6);
    const mouldyFood = addMesh(mouldy, geometry.box, material.cream, 'mouldy-food');
    mouldyFood.scale.set(0.62, 0.38, 0.34);
    for (let index = 0; index < 4; index += 1) {
      const patch = addMesh(mouldy, geometry.smoothSphere, material.moss, `mould-patch-${index + 1}`);
      patch.scale.setScalar(0.13 + index * 0.018);
      patch.position.set(-0.3 + index * 0.18, 0.25 + (index % 2) * 0.1, 0.32);
    }
    const warning = addTarget('safety-warning', safety, [2.0, 0.62, 0], 0.62);
    const warningTriangle = addMesh(warning, geometry.warningTriangle, material.warning, 'unsafe-warning-triangle');
    warningTriangle.scale.set(0.58, 0.88, 0.16);
    const exclamationStem = addMesh(warning, geometry.box, material.cream, 'unsafe-exclamation-stem');
    exclamationStem.scale.set(0.055, 0.25, 0.035);
    exclamationStem.position.set(0, 0.1, 0.18);
    const exclamationDot = addMesh(warning, geometry.smoothSphere, material.cream, 'unsafe-exclamation-dot');
    exclamationDot.scale.setScalar(0.075);
    exclamationDot.position.set(0, -0.27, 0.18);
    const unsafePlaque = addMesh(warning, geometry.box, material.slate, 'unsafe-label-plaque');
    unsafePlaque.scale.set(0.92, 0.17, 0.035);
    unsafePlaque.position.set(0, 0.95, 0);
    unsafePlaque.userData.text = 'Mouldy: do not touch or eat';
    warning.userData.symbol = 'warning-triangle';
    const hiddenHypha = addTarget('mould-hidden-hyphae', safety, [0.5, 0.08, -0.5], 0.48);
    for (let index = 0; index < 5; index += 1) {
      const thread = addMesh(hiddenHypha, geometry.cylinder, material.mycelium, `hidden-hypha-${index + 1}`);
      thread.scale.set(0.018, 0.44, 0.018);
      thread.rotation.z = -0.8 + index * 0.4;
    }
    hiddenHypha.userData.cue = 'mould extends below the visible patch';

    // 7. Quiz circle, earned badge, and growth-condition sandbox.
    const finale = layers['forest-circle'];
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2;
      const quiz = addTarget(
        `quiz-mushroom-${index + 1}` as FungiTargetId,
        finale,
        [Math.cos(angle) * 1.85, 0.03, Math.sin(angle) * 1.85],
        0.55,
      );
      makeMushroom(quiz, 1.05, index % 2 ? material.amber : material.barkLight);
      quiz.userData.questionIndex = index;
    }
    const badge = addTarget('completion-badge', finale, [0, 1.45, 0], 0.6);
    const badgeRing = addMesh(badge, geometry.torus, material.amber, 'living-mycelium-badge');
    badgeRing.scale.setScalar(0.46);
    const badgeSpore = addMesh(badge, geometry.smoothSphere, material.spore);
    badgeSpore.scale.setScalar(0.18);
    badge.visible = false;
    const thermometer = addTarget('sandbox-temperature', finale, [-0.65, 0.55, 0], 0.4);
    const thermometerBody = addMesh(thermometer, geometry.cylinder, material.warning, 'warmth-instrument');
    thermometerBody.scale.set(0.065, 0.62, 0.065);
    thermometer.visible = false;
    const moisture = addTarget('sandbox-moisture', finale, [0.65, 0.55, 0], 0.4);
    const droplet = addMesh(moisture, geometry.cone, material.glass, 'moisture-instrument');
    droplet.scale.set(0.22, 0.48, 0.22);
    moisture.visible = false;

    let stage: FungiStageId = 'fungal-forensics';
    let currentDay = 1;
    let paused = false;
    let reducedMotion = Boolean(config.reducedMotion);
    let motionTime = 0;
    let sporeOffset = 0;
    let selectedFungi: FungalObjectId[] = [];
    let touchedHyphae: string[] = [];
    let sporeGuidance: string[] = [];
    let sporeLandings: string[] = [];
    let visitedDays: number[] = [];
    let usefulRoleMatches: FungalUsefulRoleMatch[] = [];
    let safetyDecisions: FungalSafetyOutcome[] = [];
    let safetyMisconceptionResolved = false;
    let quizAnswers: FungalQuizAnswer[] = [];
    let completed = false;
    let sandboxEnabled = false;
    let doughRise = 0;
    let sandboxTemperatureC = 22;
    let sandboxMoisturePercent = 65;

    const applyStage = () => {
      for (const candidate of FUNGI_STAGE_IDS) layers[candidate].visible = candidate === stage;
      badge.visible = stage === 'forest-circle' && completed;
      thermometer.visible = stage === 'forest-circle' && completed && sandboxEnabled;
      moisture.visible = stage === 'forest-circle' && completed && sandboxEnabled;
    };

    const applyState = () => {
      (['mushroom', 'bread-mould', 'green-plant'] as const).forEach(id => {
        const selected = selectedFungi.includes(id);
        targets[id].scale.setScalar(selected ? 1.08 : 1);
        targets[id].userData.selected = selected;
      });
      tipIds.forEach(id => {
        const touched = touchedHyphae.includes(id);
        targets[id].scale.setScalar(touched ? 1.42 : 1);
        targets[id].userData.shapeCue = touched ? 'star-collar' : 'round-tip';
        const collar = targets[id].children.find(child => child.userData.touchedCue);
        if (collar) collar.visible = touched;
      });
      networkLabel.userData.complete = tipIds.every(id => touchedHyphae.includes(id));
      networkLabel.scale.setScalar(networkLabel.userData.complete ? 1.12 : 1);
      const guided = sporeGuidance.length > 0;
      const landed = sporeLandings.length > 0;
      guide.userData.guided = guided;
      guide.scale.set(guided ? 1.18 : 1, guided ? 1.18 : 1, 1);
      landing.userData.landed = landed;
      landingRing.scale.setScalar(landed ? 0.68 : 0.55);
      dayDisplays.forEach((display, index) => { display.visible = index + 1 === currentDay; });
      for (let day = 1; day <= 5; day += 1) {
        const dayTarget = targets[`day-${day}` as FungiTargetId];
        dayTarget.scale.setScalar(day === currentDay ? 1.18 : 1);
        dayTarget.userData.visited = visitedDays.includes(day);
      }
      dough.userData.rise = doughRise;
      doughAfter.scale.set(1, 1 + doughRise * 0.9, 1);
      doughAfter.position.y = -0.24 + doughRise * 0.12;
      bubbles.visible = doughRise > 0;
      portalIds.forEach(id => {
        const role = portalRoles[id];
        const matched = usefulRoleMatches.some(match => match.role === role);
        targets[id].userData.matched = matched;
        targets[id].scale.setScalar(matched ? 1.08 : 1);
      });
      const safe = safetyMisconceptionResolved || safetyDecisions.includes('observe-without-touching-or-eating');
      warning.userData.resolved = safe;
      warning.scale.setScalar(safe ? 0.86 : 1.08);
      for (const quizTargetId of Object.values(FUNGI_QUIZ_TARGET_BY_QUESTION)) {
        targets[quizTargetId].userData.correct = undefined;
        targets[quizTargetId].scale.setScalar(1);
      }
      for (const answer of quizAnswers) {
        const quizTargetId = FUNGI_QUIZ_TARGET_BY_QUESTION[answer.questionId as keyof typeof FUNGI_QUIZ_TARGET_BY_QUESTION];
        const quizTarget = targets[quizTargetId];
        quizTarget.userData.correct = answer.correct;
        quizTarget.scale.setScalar(answer.correct ? 1.12 : 0.9);
      }
      badge.userData.earned = completed;
      thermometer.userData.temperatureC = sandboxTemperatureC;
      moisture.userData.moisturePercent = sandboxMoisturePercent;
      thermometer.scale.set(1, 0.72 + sandboxTemperatureC / 75, 1);
      moisture.scale.setScalar(0.72 + sandboxMoisturePercent / 250);
      applyStage();
    };

    const validateState = (next: Readonly<FungiWorldStateProjection>) => {
      if (!next || typeof next !== 'object') throw new Error('fungi visual state must be an object');
      if (next.currentDay !== undefined) {
        requireFiniteRange(next.currentDay, 'day', 1, 5);
        if (!Number.isInteger(next.currentDay)) throw new Error('day must be an integer from 1 to 5');
      }
      if (next.visitedDays !== undefined) {
        for (const day of next.visitedDays) {
          requireFiniteRange(day, 'visited day', 1, 5);
          if (!Number.isInteger(day)) throw new Error('visited day must be an integer from 1 to 5');
        }
      }
      if (next.doughRise !== undefined) requireFiniteRange(next.doughRise, 'dough rise', 0, 1);
      if (next.doughRisen !== undefined && typeof next.doughRisen !== 'boolean') {
        throw new Error('dough risen must be boolean');
      }
      if (next.sandboxTemperatureC !== undefined) requireFiniteRange(next.sandboxTemperatureC, 'sandbox temperature', 0, 45);
      if (next.sandboxMoisturePercent !== undefined) requireFiniteRange(next.sandboxMoisturePercent, 'sandbox moisture', 0, 100);
      if (next.selectedFungi?.some(id => !['mushroom', 'bread-mould', 'green-plant'].includes(id))) {
        throw new Error('selected fungi contains an unknown object');
      }
      if (next.touchedHyphae?.some(id => !tipIds.includes(id as typeof tipIds[number]))) {
        throw new Error('touched hyphae contains an unknown authored tip');
      }
      const nonEmpty = (values: readonly string[] | undefined, label: string) => {
        if (values?.some(value => typeof value !== 'string' || value.trim().length === 0)) throw new Error(`${label} IDs must not be empty`);
      };
      nonEmpty(next.sporeGuidance, 'spore guidance');
      nonEmpty(next.sporeLandings, 'spore landing');
      if (next.usefulRoleMatches?.some(match =>
        !['mushroom', 'bread-mould'].includes(match.objectId)
        || !['decomposer', 'food', 'medicine'].includes(match.role))) {
        throw new Error('useful role match is invalid');
      }
      if (next.safetyDecisions?.some(choice => ![
        'observe-without-touching-or-eating', 'touch-or-eat-unknown-fungus',
      ].includes(choice))) throw new Error('safety decision is invalid');
      if (next.quizAnswers?.some(answer =>
        !answer.questionId?.trim()
        || !Object.hasOwn(FUNGI_QUIZ_TARGET_BY_QUESTION, answer.questionId))) {
        throw new Error('quiz question ID is invalid');
      }
      if (next.quizAnswers?.some(answer =>
        !answer.answer?.trim()
        || typeof answer.correct !== 'boolean' || typeof answer.independentTransfer !== 'boolean')) {
        throw new Error('quiz answer is invalid');
      }
      for (const [label, value] of [
        ['completed', next.completed],
        ['sandbox enabled', next.sandboxEnabled],
        ['safety resolved', next.safetyMisconceptionResolved],
      ] as const) {
        if (value !== undefined && typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
      }
    };

    applyState();

    const orderedTargets = Object.fromEntries(
      FUNGI_TARGET_IDS.map(id => [id, targets[id]]),
    ) as Record<FungiTargetId, THREE.Object3D>;

    const world: FungiWorld = {
      root,
      targets: orderedTargets,
      setStage(nextStage) {
        if (!FUNGI_STAGE_IDS.includes(nextStage)) throw new Error(`Unsupported fungi stage ${String(nextStage)}`);
        stage = nextStage;
        applyStage();
      },
      setState(next) {
        validateState(next);
        if (next.currentDay !== undefined) currentDay = next.currentDay;
        if (next.selectedFungi !== undefined) selectedFungi = [...next.selectedFungi];
        if (next.touchedHyphae !== undefined) touchedHyphae = [...next.touchedHyphae];
        if (next.sporeGuidance !== undefined) sporeGuidance = [...next.sporeGuidance];
        if (next.sporeLandings !== undefined) sporeLandings = [...next.sporeLandings];
        if (next.visitedDays !== undefined) visitedDays = [...next.visitedDays];
        if (next.usefulRoleMatches !== undefined) usefulRoleMatches = next.usefulRoleMatches.map(match => ({ ...match }));
        if (next.safetyDecisions !== undefined) safetyDecisions = [...next.safetyDecisions];
        if (next.safetyMisconceptionResolved !== undefined) safetyMisconceptionResolved = next.safetyMisconceptionResolved;
        if (next.quizAnswers !== undefined) quizAnswers = next.quizAnswers.map(answer => ({ ...answer }));
        if (next.completed !== undefined) completed = next.completed;
        if (next.sandboxEnabled !== undefined) sandboxEnabled = next.sandboxEnabled;
        if (next.doughRise !== undefined) doughRise = next.doughRise;
        if (next.doughRisen !== undefined) doughRise = next.doughRisen ? 1 : 0;
        if (next.sandboxTemperatureC !== undefined) sandboxTemperatureC = next.sandboxTemperatureC;
        if (next.sandboxMoisturePercent !== undefined) sandboxMoisturePercent = next.sandboxMoisturePercent;
        applyState();
      },
      update(deltaSeconds, elapsedSeconds) {
        requireFiniteRange(deltaSeconds, 'delta seconds', 0, Number.MAX_VALUE);
        requireFiniteRange(elapsedSeconds, 'elapsed seconds', 0, Number.MAX_VALUE);
        if (paused || reducedMotion || disposed) return;
        motionTime += deltaSeconds;
        sporeOffset = Math.sin(motionTime * 0.7) * 0.12;
        placeSpores(motionTime);
        const landingBase = sporeLandings.length > 0 ? 0.68 : 0.55;
        landingRing.scale.setScalar(landingBase + Math.sin(motionTime * 1.8) * 0.035);
      },
      pause() { paused = true; },
      resume() { paused = false; },
      setReducedMotion(reduced) {
        if (typeof reduced !== 'boolean') throw new Error('reduced motion must be boolean');
        reducedMotion = reduced;
      },
      snapshot() {
        const currentGrowthDisplay = dayDisplays[currentDay - 1];
        let visibleStructures = 0;
        currentGrowthDisplay.traverse(object => {
          if (object instanceof THREE.Mesh && object.userData.growthStructure
            && effectivelyVisible(object)) visibleStructures += 1;
        });
        return {
          stage,
          currentDay,
          growth: {
            phase: currentGrowthDisplay.userData.phase,
            visibleStructures,
            coverage: currentGrowthDisplay.userData.coverage,
          },
          touchedHyphae: [...touchedHyphae],
          completed,
          sandboxEnabled,
          paused,
          reducedMotion,
          disposed,
          ambientPhase: sporeOffset,
          sporeOffset,
          layoutSignature: `${seed}:${layoutParts.join('|')}`,
        };
      },
      metrics() {
        let drawCalls = 0;
        let visibleTriangles = 0;
        root.traverse(object => {
          if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) || !effectivelyVisible(object)) return;
          const materialCount = Array.isArray(object.material) ? object.material.length : 1;
          drawCalls += materialCount;
          const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
          visibleTriangles += Math.ceil(trianglesForGeometry(object.geometry) * instances);
        });
        return { drawCalls, visibleTriangles };
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        root.clear();
        disposeOwned();
      },
    };

    return world;
  } catch (error) {
    root.removeFromParent();
    root.clear();
    disposeOwned();
    throw error;
  }
}
