import * as THREE from 'three';

/**
 * A pantry shelf holding the four foods of the storage challenge. Everything
 * the learner sees here is driven by the growth model: mould specks appear in
 * proportion to real surface coverage, and a wrap is drawn only where the
 * learner actually chose one. Nothing here decides anything — it reports.
 */
export interface StorageChallengeWorldConfig {
  seed?: number;
  reducedMotion?: boolean;
}

export interface StorageFoodProjection {
  foodId: string;
  surfaceCoverage: number;
  sealed: boolean;
  spoiled: boolean;
}

export interface StorageChallengeProjection {
  day: number;
  temperatureC: number;
  humidityPercent: number;
  foods: readonly StorageFoodProjection[];
}

export interface StorageChallengeSnapshot {
  day: number;
  foods: Array<{
    foodId: string;
    surfaceCoverage: number;
    visibleSpecks: number;
    sealed: boolean;
    spoiled: boolean;
  }>;
  disposed: boolean;
}

export interface StorageChallengeWorld {
  root: THREE.Group;
  foodAnchors: Record<string, THREE.Object3D>;
  project(projection: Readonly<StorageChallengeProjection>): void;
  update(deltaSeconds: number, elapsedSeconds: number): void;
  snapshot(): StorageChallengeSnapshot;
  metrics(): { drawCalls: number; visibleTriangles: number };
  dispose(): void;
}

export const STORAGE_FOOD_IDS = ['bread', 'fruit', 'rice', 'chapati'] as const;
export type StorageFoodId = (typeof STORAGE_FOOD_IDS)[number];

/** Mould specks drawn at full coverage. */
const SPECK_CAPACITY = 60;

const PALETTE = {
  wood: 0x7b5433,
  woodDark: 0x4e3520,
  wall: 0x5b4c3c,
  crust: 0xc08a4a,
  crumb: 0xe8d3a9,
  mango: 0xe0913a,
  mangoBlush: 0xc2472f,
  sack: 0xd8cba6,
  rice: 0xf3ecd8,
  chapati: 0xdcc191,
  mould: 0x50682f,
  mouldDark: 0x3f5130,
  wrap: 0xbcd7e8,
} as const;

const FOOD_SLOTS: Record<StorageFoodId, { x: number; label: string }> = {
  bread: { x: -1.65, label: 'Loaf of bread' },
  fruit: { x: -0.55, label: 'Ripe mango' },
  rice: { x: 0.55, label: 'Dry rice' },
  chapati: { x: 1.65, label: 'Stack of chapatis' },
};

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

function requireUnit(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`storage world ${label} must be a finite number`);
  }
  if (value < 0 || value > 1) {
    throw new Error(`storage world ${label} must be between 0 and 1`);
  }
  return value;
}

export function createStorageChallengeWorld(
  config: StorageChallengeWorldConfig = {},
): StorageChallengeWorld {
  const seed = config.seed ?? 20260820;
  if (!Number.isSafeInteger(seed)) throw new Error('seed must be a safe integer');
  const random = seededRandom(seed);
  let reducedMotion = config.reducedMotion ?? false;
  let disposed = false;

  const root = new THREE.Group();
  root.name = 'storage-challenge-pantry';

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const own = <T extends THREE.BufferGeometry | THREE.Material>(resource: T): T => {
    if (resource instanceof THREE.BufferGeometry) geometries.add(resource);
    else materials.add(resource);
    return resource;
  };

  const geometry = {
    box: own(new THREE.BoxGeometry(1, 1, 1)),
    sphere: own(new THREE.SphereGeometry(1, 18, 12)),
    lowSphere: own(new THREE.SphereGeometry(1, 7, 5)),
    cylinder: own(new THREE.CylinderGeometry(1, 1, 1, 18)),
    disc: own(new THREE.CircleGeometry(1, 22)),
  };

  const material = {
    wood: own(new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 })),
    woodDark: own(new THREE.MeshStandardMaterial({ color: PALETTE.woodDark, roughness: 0.95 })),
    wall: own(new THREE.MeshStandardMaterial({ color: PALETTE.wall, roughness: 1 })),
    crust: own(new THREE.MeshStandardMaterial({ color: PALETTE.crust, roughness: 0.8 })),
    crumb: own(new THREE.MeshStandardMaterial({ color: PALETTE.crumb, roughness: 0.9 })),
    mango: own(new THREE.MeshStandardMaterial({ color: PALETTE.mango, roughness: 0.45 })),
    mangoBlush: own(new THREE.MeshStandardMaterial({ color: PALETTE.mangoBlush, roughness: 0.5 })),
    sack: own(new THREE.MeshStandardMaterial({ color: PALETTE.sack, roughness: 0.95 })),
    rice: own(new THREE.MeshStandardMaterial({ color: PALETTE.rice, roughness: 0.7 })),
    chapati: own(new THREE.MeshStandardMaterial({ color: PALETTE.chapati, roughness: 0.85 })),
    mould: own(
      new THREE.MeshStandardMaterial({
        color: PALETTE.mould,
        roughness: 0.95,
        emissive: PALETTE.mouldDark,
        emissiveIntensity: 0.4,
      }),
    ),
    wrap: own(
      new THREE.MeshPhysicalMaterial({
        color: PALETTE.wrap,
        transparent: true,
        opacity: 0.24,
        roughness: 0.12,
        transmission: 0.6,
        depthWrite: false,
      }),
    ),
  };

  const mesh = (
    parent: THREE.Object3D,
    meshGeometry: THREE.BufferGeometry,
    meshMaterial: THREE.Material,
    name: string,
  ) => {
    const created = new THREE.Mesh(meshGeometry, meshMaterial);
    created.name = name;
    created.castShadow = true;
    created.receiveShadow = true;
    parent.add(created);
    return created;
  };

  // ── Pantry: back wall and a single warm shelf ──
  const wall = mesh(root, geometry.box, material.wall, 'pantry-wall');
  wall.scale.set(9, 5.5, 0.2);
  wall.position.set(0, 1.6, -1.15);
  wall.castShadow = false;

  const shelf = mesh(root, geometry.box, material.wood, 'pantry-shelf');
  shelf.scale.set(5.2, 0.16, 1.5);
  shelf.position.set(0, 0.5, 0);

  for (const x of [-2.4, 2.4]) {
    const bracket = mesh(root, geometry.box, material.woodDark, 'shelf-bracket');
    bracket.scale.set(0.16, 1, 0.16);
    bracket.position.set(x, 0, 0.4);
  }

  const scratchMatrix = new THREE.Matrix4();
  const scratchPosition = new THREE.Vector3();
  const scratchQuaternion = new THREE.Quaternion();
  const scratchScale = new THREE.Vector3();

  interface FoodParts {
    anchor: THREE.Group;
    specks: THREE.InstancedMesh;
    wrap: THREE.Mesh;
    radius: number;
  }

  /**
   * Mould specks are laid out once over the food's surface and revealed by
   * raising the instance count, so growth costs nothing per frame.
   */
  const addSpecks = (
    anchor: THREE.Group,
    radius: number,
    height: number,
    foodId: string,
  ) => {
    const specks = new THREE.InstancedMesh(
      geometry.lowSphere,
      material.mould,
      SPECK_CAPACITY,
    );
    specks.name = `mould-${foodId}`;
    specks.castShadow = false;
    for (let index = 0; index < SPECK_CAPACITY; index += 1) {
      const angle = index * 2.39996;
      const spread = Math.sqrt(index / SPECK_CAPACITY);
      scratchPosition.set(
        Math.cos(angle) * spread * radius,
        height + (random() - 0.5) * 0.05,
        Math.sin(angle) * spread * radius * 0.7,
      );
      scratchScale.setScalar(0.042 + random() * 0.03);
      scratchQuaternion.identity();
      scratchMatrix.compose(scratchPosition, scratchQuaternion, scratchScale);
      specks.setMatrixAt(index, scratchMatrix);
    }
    specks.instanceMatrix.needsUpdate = true;
    specks.count = 0;
    anchor.add(specks);
    return specks;
  };

  const addWrap = (anchor: THREE.Group, size: [number, number, number], y: number) => {
    const wrapMesh = mesh(anchor, geometry.box, material.wrap, 'wrap');
    wrapMesh.scale.set(...size);
    wrapMesh.position.set(0, y, 0);
    wrapMesh.castShadow = false;
    wrapMesh.visible = false;
    return wrapMesh;
  };

  const foods: Record<string, FoodParts> = {};
  const foodAnchors: Record<string, THREE.Object3D> = {};

  for (const foodId of STORAGE_FOOD_IDS) {
    const anchor = new THREE.Group();
    anchor.name = `food-${foodId}`;
    anchor.position.set(FOOD_SLOTS[foodId].x, 0.58, 0);
    root.add(anchor);
    foodAnchors[foodId] = anchor;

    if (foodId === 'bread') {
      const loaf = mesh(anchor, geometry.sphere, material.crust, 'loaf');
      loaf.scale.set(0.42, 0.24, 0.26);
      loaf.position.y = 0.2;
      const cut = mesh(anchor, geometry.box, material.crumb, 'loaf-cut');
      cut.scale.set(0.06, 0.34, 0.44);
      cut.position.set(0.4, 0.2, 0);
      foods[foodId] = {
        anchor,
        specks: addSpecks(anchor, 0.34, 0.42, foodId),
        wrap: addWrap(anchor, [1.05, 0.62, 0.7], 0.24),
        radius: 0.42,
      };
    } else if (foodId === 'fruit') {
      const mango = mesh(anchor, geometry.sphere, material.mango, 'mango');
      mango.scale.set(0.3, 0.22, 0.22);
      mango.position.y = 0.2;
      const blush = mesh(anchor, geometry.sphere, material.mangoBlush, 'mango-blush');
      blush.scale.set(0.17, 0.14, 0.14);
      blush.position.set(-0.12, 0.25, 0.05);
      foods[foodId] = {
        anchor,
        specks: addSpecks(anchor, 0.24, 0.38, foodId),
        wrap: addWrap(anchor, [0.78, 0.6, 0.62], 0.23),
        radius: 0.3,
      };
    } else if (foodId === 'rice') {
      const sack = mesh(anchor, geometry.cylinder, material.sack, 'rice-sack');
      sack.scale.set(0.26, 0.3, 0.26);
      sack.position.y = 0.15;
      const heap = mesh(anchor, geometry.sphere, material.rice, 'rice-heap');
      heap.scale.set(0.25, 0.09, 0.25);
      heap.position.y = 0.32;
      foods[foodId] = {
        anchor,
        specks: addSpecks(anchor, 0.2, 0.4, foodId),
        wrap: addWrap(anchor, [0.68, 0.72, 0.68], 0.26),
        radius: 0.28,
      };
    } else {
      for (let layer = 0; layer < 4; layer += 1) {
        const disc = mesh(anchor, geometry.cylinder, material.chapati, 'chapati');
        disc.scale.set(0.3, 0.022, 0.3);
        disc.position.set((random() - 0.5) * 0.02, 0.05 + layer * 0.045, (random() - 0.5) * 0.02);
      }
      foods[foodId] = {
        anchor,
        specks: addSpecks(anchor, 0.26, 0.26, foodId),
        wrap: addWrap(anchor, [0.74, 0.4, 0.74], 0.16),
        radius: 0.32,
      };
    }
  }

  const state: StorageChallengeSnapshot = {
    day: 0,
    foods: STORAGE_FOOD_IDS.map((foodId) => ({
      foodId,
      surfaceCoverage: 0,
      visibleSpecks: 0,
      sealed: false,
      spoiled: false,
    })),
    disposed: false,
  };

  function project(projection: Readonly<StorageChallengeProjection>): void {
    if (disposed) throw new Error('storage challenge world has been disposed');
    if (!projection || typeof projection !== 'object') {
      throw new Error('storage world projection must be an object');
    }
    if (!Number.isInteger(projection.day) || projection.day < 0) {
      throw new Error('storage world day must be a whole number');
    }
    if (!Array.isArray(projection.foods) || projection.foods.length === 0) {
      throw new Error('storage world projection needs foods');
    }
    for (const food of projection.foods) {
      if (foods[food.foodId] === undefined) {
        throw new Error(`storage world does not hold ${String(food.foodId)}`);
      }
      requireUnit(food.surfaceCoverage, 'surface coverage');
      if (typeof food.sealed !== 'boolean') {
        throw new Error('storage world sealed must be a boolean');
      }
    }

    state.day = projection.day;
    state.foods = projection.foods.map((food) => {
      const parts = foods[food.foodId]!;
      const visibleSpecks = Math.round(food.surfaceCoverage * SPECK_CAPACITY);
      parts.specks.count = visibleSpecks;
      parts.wrap.visible = food.sealed;
      return {
        foodId: food.foodId,
        surfaceCoverage: food.surfaceCoverage,
        visibleSpecks,
        sealed: food.sealed,
        spoiled: food.spoiled === true,
      };
    });
  }

  function update(_deltaSeconds: number, elapsedSeconds: number): void {
    if (disposed || reducedMotion) return;
    if (!Number.isFinite(elapsedSeconds)) return;
    // A slow breath on the wraps so a sealed item reads as sealed, not as a
    // rendering artefact. Nothing here changes any measured quantity.
    for (const foodId of STORAGE_FOOD_IDS) {
      const parts = foods[foodId]!;
      if (!parts.wrap.visible) continue;
      parts.wrap.rotation.y = Math.sin(elapsedSeconds * 0.4) * 0.03;
    }
  }

  function snapshot(): StorageChallengeSnapshot {
    return structuredClone(state);
  }

  function metrics() {
    let drawCalls = 0;
    let visibleTriangles = 0;
    root.traverse((object) => {
      const candidate = object as THREE.Mesh & { isMesh?: boolean };
      if (!candidate.isMesh || !candidate.visible) return;
      const instances = (object as { isInstancedMesh?: boolean }).isInstancedMesh
        ? (object as THREE.InstancedMesh).count
        : 1;
      if (instances <= 0) return;
      drawCalls += 1;
      const geometryRef = candidate.geometry;
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
    for (const owned of geometries) owned.dispose();
    for (const owned of materials) owned.dispose();
    geometries.clear();
    materials.clear();
    root.clear();
  }

  return {
    root,
    foodAnchors,
    project,
    update,
    snapshot,
    metrics,
    dispose,
  };
}
