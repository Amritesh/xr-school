import * as THREE from "three";

export type SuperSensesSmellMission = 0 | 1 | 2 | 3;

export type SuperSensesSmellChoiceState =
  | "idle"
  | "selected"
  | "correct"
  | "incorrect"
  | "wrong"
  | "hint";

export interface SuperSensesSmellSnapshot {
  mission: SuperSensesSmellMission | number;
  progress: number;
  selectedScent?: string | null;
  selectedDistractor?: string | null;
  timeSeconds: number;
  reducedMotion: boolean;
  completed?: boolean;
  frozen?: boolean;
}

export interface SuperSensesSmellFocus {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface SuperSensesSmellWorld {
  root: THREE.Group;
  interactiveTargets: ReadonlyMap<string, THREE.Object3D>;
  interactables: THREE.Object3D[];
  applySnapshot: (snapshot: SuperSensesSmellSnapshot) => void;
  setMission: (mission: SuperSensesSmellMission | number) => void;
  setTimeline: (seconds: number) => void;
  setMissionProgress: (
    mission: SuperSensesSmellMission | number,
    progress01: number,
  ) => void;
  setChoice: (id: string, state: SuperSensesSmellChoiceState) => void;
  setProgress: (progress01: number) => void;
  focusForMission: (
    mission: SuperSensesSmellMission | number,
  ) => SuperSensesSmellFocus;
  focusTarget: (mission: SuperSensesSmellMission | number) => THREE.Vector3;
  celebrate: (beat?: "portal" | "confetti" | "badge") => void;
  freeze: () => void;
  update: (
    elapsedSeconds: number,
    deltaSeconds: number,
    activeCameraOrReducedMotion?: THREE.Camera | boolean,
    reducedMotion?: boolean,
  ) => void;
  dispose: () => void;
}

const DEFAULT_ENVIRONMENT_URL =
  "/simulations/c5-ch01-a01-supersense-of-smell/environment.webp";

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

const missionIndex = (value: number): SuperSensesSmellMission =>
  Math.min(3, Math.max(0, Math.round(value))) as SuperSensesSmellMission;

const FOCUS_POSES: readonly SuperSensesSmellFocus[] = [
  {
    position: new THREE.Vector3(0, 1.62, 5.7),
    target: new THREE.Vector3(0, 1.05, -0.15),
  },
  {
    position: new THREE.Vector3(0, 0.7, 4.5),
    target: new THREE.Vector3(0, 0.48, -0.3),
  },
  {
    position: new THREE.Vector3(0, 1.58, 5.65),
    target: new THREE.Vector3(0, 1.05, -0.35),
  },
  {
    position: new THREE.Vector3(0, 1.68, 5.3),
    target: new THREE.Vector3(0, 1.78, -0.45),
  },
] as const;

/**
 * Builds the four-part Super Senses smell adventure entirely from lightweight
 * Three.js geometry. Scents are deliberately encoded by shape as well as colour:
 * food uses rings, flowers use petals, grass uses droplets, animal tracks use
 * diamonds/zigzags, and pheromones use stars. This keeps clues understandable
 * without relying on colour alone.
 */
export function createSuperSensesSmellWorld(
  scene: THREE.Scene,
  renderer?: THREE.WebGLRenderer,
  environmentUrl = DEFAULT_ENVIRONMENT_URL,
): SuperSensesSmellWorld {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const interactiveTargets = new Map<string, THREE.Object3D>();
  const interactableSet = new Set<THREE.Object3D>();
  const animatedTrails: THREE.Group[] = [];
  const swayingObjects: THREE.Object3D[] = [];
  const pulsingObjects: THREE.Object3D[] = [];
  const billboards: THREE.Object3D[] = [];

  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value);
    return value;
  };
  const standard = (parameters: THREE.MeshStandardMaterialParameters) => {
    const material = new THREE.MeshStandardMaterial(parameters);
    materials.add(material);
    return material;
  };
  const basic = (parameters: THREE.MeshBasicMaterialParameters) => {
    const material = new THREE.MeshBasicMaterial(parameters);
    materials.add(material);
    return material;
  };
  const mesh = (
    shape: THREE.BufferGeometry,
    material: THREE.Material,
    name: string,
  ) => {
    const result = new THREE.Mesh(shape, material);
    result.name = name;
    result.castShadow = true;
    result.receiveShadow = true;
    return result;
  };
  const group = (name: string) => {
    const result = new THREE.Group();
    result.name = name;
    return result;
  };
  const addInteractive = (id: string, object: THREE.Object3D) => {
    object.name = id;
    object.userData.interactionId = id;
    object.userData.choiceId = id;
    object.userData.choiceState = "idle" satisfies SuperSensesSmellChoiceState;
    interactiveTargets.set(id, object);
    interactableSet.add(object);
    return object;
  };
  const addInteractiveAlias = (id: string, object: THREE.Object3D) => {
    interactiveTargets.set(id, object);
    interactableSet.add(object);
  };

  const root = group("super-senses-smell-academy");
  scene.add(root);

  const missionGroups = [
    group("mission-1-smell-o-vision-park"),
    group("mission-2-ant-army-highway"),
    group("mission-3-rescue-dog-forest"),
    group("mission-4-silkmoth-night-forest"),
  ] as const;
  root.add(...missionGroups);

  const previousBackground = scene.background;
  const previousEnvironment = scene.environment;
  const previousFog = scene.fog;
  const fallbackBackground = new THREE.Color(0x8fc8e8);
  scene.background = fallbackBackground;
  const worldFog = new THREE.Fog(0xb6d9d1, 9, 31);
  scene.fog = worldFog;

  let disposed = false;
  let environmentTexture: THREE.Texture | null = null;
  try {
    const candidate = new THREE.TextureLoader().load(
      environmentUrl,
      (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        loaded.mapping = THREE.EquirectangularReflectionMapping;
        loaded.colorSpace = THREE.SRGBColorSpace;
        scene.background = loaded;
        scene.environment = loaded;
      },
      undefined,
      () => {
        if (!disposed && scene.background === candidate) {
          scene.background = fallbackBackground;
        }
      },
    );
    candidate.mapping = THREE.EquirectangularReflectionMapping;
    candidate.colorSpace = THREE.SRGBColorSpace;
    environmentTexture = candidate;
    textures.add(candidate);
  } catch {
    environmentTexture = null;
    scene.background = fallbackBackground;
  }

  const hemisphere = new THREE.HemisphereLight(0xe6f7ff, 0x3d522c, 1.75);
  hemisphere.name = "soft-outdoor-light";
  const sunlight = new THREE.DirectionalLight(0xfff3d2, 2.8);
  sunlight.name = "sun-and-moon-key-light";
  sunlight.position.set(-4, 8, 5);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  sunlight.shadow.camera.near = 0.5;
  sunlight.shadow.camera.far = 24;
  scene.add(hemisphere, sunlight);

  const makeGround = (parent: THREE.Group, color: number, radius = 8.2) => {
    const ground = mesh(
      geometry(new THREE.CircleGeometry(radius, 64)),
      standard({ color, roughness: 0.96, metalness: 0 }),
      "walkable-ground",
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    parent.add(ground);
    return ground;
  };

  const makeTree = (
    parent: THREE.Group,
    x: number,
    z: number,
    scale = 1,
    night = false,
  ) => {
    const tree = group(night ? "moonlit-tree" : "park-tree");
    const trunk = mesh(
      geometry(new THREE.CylinderGeometry(0.18, 0.28, 2.2, 10)),
      standard({ color: night ? 0x423a55 : 0x74512d, roughness: 0.92 }),
      "tree-trunk",
    );
    trunk.position.y = 1.08;
    tree.add(trunk);
    const crownMaterial = standard({
      color: night ? 0x183f4a : 0x3d843e,
      roughness: 0.88,
      emissive: night ? 0x081a2d : 0x071807,
      emissiveIntensity: night ? 0.25 : 0.05,
    });
    for (const [offsetX, offsetY, offsetZ, crownScale] of [
      [0, 2.35, 0, 0.92],
      [-0.48, 2.05, 0.05, 0.62],
      [0.46, 2.04, -0.05, 0.68],
      [0.08, 2.12, -0.48, 0.56],
    ] as const) {
      const crown = mesh(
        geometry(new THREE.IcosahedronGeometry(crownScale, 1)),
        crownMaterial,
        "leaf-canopy",
      );
      crown.position.set(offsetX, offsetY, offsetZ);
      tree.add(crown);
    }
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    parent.add(tree);
    swayingObjects.push(tree);
    return tree;
  };

  const makeTrail = (
    parent: THREE.Group,
    name: string,
    color: number,
    points: readonly THREE.Vector3[],
    markerShape: "ring" | "petal" | "drop" | "diamond" | "star" | "smoke",
    markerCount = 12,
  ) => {
    const trail = group(name);
    trail.userData.baseY = 0;
    const curve = new THREE.CatmullRomCurve3([...points]);
    const tube = mesh(
      geometry(new THREE.TubeGeometry(curve, 40, 0.025, 6, false)),
      basic({
        color,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      `${name}-flowing-ribbon`,
    );
    trail.add(tube);
    for (let index = 0; index < markerCount; index += 1) {
      const t = (index + 0.35) / markerCount;
      let markerGeometry: THREE.BufferGeometry;
      if (markerShape === "ring") {
        markerGeometry = geometry(new THREE.TorusGeometry(0.1, 0.024, 6, 16));
      } else if (markerShape === "petal") {
        markerGeometry = geometry(new THREE.SphereGeometry(0.075, 8, 6));
      } else if (markerShape === "drop") {
        markerGeometry = geometry(new THREE.ConeGeometry(0.075, 0.18, 7));
      } else if (markerShape === "diamond") {
        markerGeometry = geometry(new THREE.OctahedronGeometry(0.1, 0));
      } else if (markerShape === "star") {
        markerGeometry = geometry(new THREE.TetrahedronGeometry(0.105, 0));
      } else {
        markerGeometry = geometry(new THREE.DodecahedronGeometry(0.09, 0));
      }
      const marker = mesh(
        markerGeometry,
        basic({
          color,
          transparent: true,
          opacity: 0.84,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
        `${name}-${markerShape}-marker`,
      );
      marker.position.copy(curve.getPoint(t));
      if (markerShape === "petal") marker.scale.set(1.5, 0.52, 0.82);
      marker.userData.phase = index / markerCount;
      trail.add(marker);
    }
    parent.add(trail);
    animatedTrails.push(trail);
    return trail;
  };

  const makeParticleCloud = (
    parent: THREE.Group,
    name: string,
    color: number,
    count: number,
    spread: THREE.Vector3,
    position: THREE.Vector3,
    seedOffset = 0,
  ) => {
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      // Deterministic quasi-random placement avoids Math.random and allocations
      // while keeping the authored world visually stable between visits.
      const seed = index + 1 + seedOffset;
      values[index * 3] = Math.sin(seed * 12.9898) * 0.5 * spread.x;
      values[index * 3 + 1] = (0.5 + Math.sin(seed * 5.398) * 0.5) * spread.y;
      values[index * 3 + 2] = Math.cos(seed * 9.173) * 0.5 * spread.z;
    }
    const cloudGeometry = geometry(new THREE.BufferGeometry());
    cloudGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(values, 3),
    );
    const cloudMaterial = new THREE.PointsMaterial({
      color,
      size: 0.075,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    materials.add(cloudMaterial);
    const cloud = new THREE.Points(cloudGeometry, cloudMaterial);
    cloud.name = name;
    cloud.position.copy(position);
    cloud.userData.baseY = position.y;
    parent.add(cloud);
    pulsingObjects.push(cloud);
    return cloud;
  };

  // Mission 1: a recognisable park and four shape-coded smells.
  const park = missionGroups[0];
  makeGround(park, 0x4c873d);
  for (const [x, z, size] of [
    [-5.1, -2.5, 1.05],
    [4.9, -3.1, 1.08],
    [-5.7, 2.3, 0.86],
    [5.4, 2.7, 0.92],
  ] as const) {
    makeTree(park, x, z, size);
  }
  const parkPath = mesh(
    geometry(new THREE.PlaneGeometry(3.2, 17)),
    standard({ color: 0xb8a887, roughness: 1 }),
    "park-walking-path",
  );
  parkPath.rotation.x = -Math.PI / 2;
  parkPath.rotation.z = 0.12;
  parkPath.position.y = 0.005;
  park.add(parkPath);

  const bench = group("wooden-park-bench");
  const wood = standard({ color: 0x8a572f, roughness: 0.72 });
  for (let index = 0; index < 4; index += 1) {
    const slat = mesh(
      geometry(new THREE.BoxGeometry(1.65, 0.12, 0.18)),
      wood,
      "bench-wooden-slat",
    );
    slat.position.set(0, 0.65 + index * 0.14, -0.25);
    slat.rotation.x = index < 2 ? 0 : -0.18;
    bench.add(slat);
  }
  for (const x of [-0.65, 0.65]) {
    const leg = mesh(
      geometry(new THREE.BoxGeometry(0.12, 0.62, 0.12)),
      standard({ color: 0x3e4445, metalness: 0.45, roughness: 0.5 }),
      "bench-leg",
    );
    leg.position.set(x, 0.31, -0.18);
    bench.add(leg);
  }
  bench.position.set(-2.7, 0, -0.6);
  bench.rotation.y = 0.28;
  park.add(bench);

  const flowerGarden = group("colourful-flower-garden");
  const flowerColors = [0xff4f9a, 0xffdd55, 0xfaf7ff, 0x8357d8];
  for (let index = 0; index < 18; index += 1) {
    const flower = group("park-flower");
    const stem = mesh(
      geometry(new THREE.CylinderGeometry(0.014, 0.018, 0.34, 6)),
      standard({ color: 0x2f8c42, roughness: 0.9 }),
      "flower-stem",
    );
    stem.position.y = 0.17;
    flower.add(stem);
    const bloom = mesh(
      geometry(new THREE.SphereGeometry(0.085, 8, 6)),
      standard({
        color: flowerColors[index % flowerColors.length],
        roughness: 0.74,
      }),
      "flower-bloom",
    );
    bloom.scale.set(1.35, 0.58, 1.35);
    bloom.position.y = 0.39;
    flower.add(bloom);
    flower.position.set(
      -4.1 + (index % 6) * 0.28,
      0,
      -1.5 + Math.floor(index / 6) * 0.34,
    );
    flowerGarden.add(flower);
  }
  park.add(flowerGarden);

  const snackCart = group("park-snack-cart");
  const cartBody = mesh(
    geometry(new THREE.BoxGeometry(1.45, 0.88, 0.8)),
    standard({ color: 0xf4b438, roughness: 0.52, metalness: 0.08 }),
    "snack-cart-body",
  );
  cartBody.position.y = 0.72;
  snackCart.add(cartBody);
  const canopy = mesh(
    geometry(new THREE.ConeGeometry(1.05, 0.55, 4)),
    standard({ color: 0xe84245, roughness: 0.56 }),
    "snack-cart-canopy",
  );
  canopy.rotation.y = Math.PI / 4;
  canopy.position.y = 1.72;
  snackCart.add(canopy);
  for (const x of [-0.52, 0.52]) {
    const wheel = mesh(
      geometry(new THREE.TorusGeometry(0.28, 0.08, 8, 18)),
      standard({ color: 0x252629, roughness: 0.76 }),
      "snack-cart-wheel",
    );
    wheel.position.set(x, 0.3, 0.43);
    wheel.rotation.y = Math.PI / 2;
    snackCart.add(wheel);
  }
  const pizza = mesh(
    geometry(new THREE.CylinderGeometry(0.35, 0.35, 0.055, 24)),
    standard({ color: 0xf3c454, roughness: 0.7 }),
    "covered-pizza",
  );
  pizza.position.set(0.2, 1.2, 0);
  snackCart.add(pizza);
  snackCart.position.set(3.25, 0, -0.9);
  snackCart.rotation.y = -0.23;
  park.add(snackCart);

  const trashBin = mesh(
    geometry(new THREE.CylinderGeometry(0.36, 0.3, 0.92, 14)),
    standard({ color: 0x506269, roughness: 0.68, metalness: 0.2 }),
    "park-trash-bin",
  );
  trashBin.position.set(4.7, 0.46, 0.15);
  park.add(trashBin);

  const robotDog = group("detective-snout-robot-dog");
  const robotMetal = standard({
    color: 0xb7d4df,
    metalness: 0.7,
    roughness: 0.23,
    emissive: 0x092634,
    emissiveIntensity: 0.24,
  });
  const robotBlue = standard({
    color: 0x29c9ed,
    emissive: 0x137d9d,
    emissiveIntensity: 0.82,
    roughness: 0.35,
  });
  const dogBody = mesh(
    geometry(new THREE.CapsuleGeometry(0.35, 0.65, 5, 10)),
    robotMetal,
    "detective-snout-body",
  );
  dogBody.rotation.z = Math.PI / 2;
  dogBody.position.y = 1.02;
  robotDog.add(dogBody);
  const dogHead = mesh(
    geometry(new THREE.BoxGeometry(0.55, 0.5, 0.58, 2, 2, 2)),
    robotMetal,
    "detective-snout-head",
  );
  dogHead.position.set(0.54, 1.2, 0);
  robotDog.add(dogHead);
  const snout = mesh(
    geometry(new THREE.CylinderGeometry(0.13, 0.18, 0.34, 10)),
    standard({ color: 0x23272e, metalness: 0.55, roughness: 0.36 }),
    "detective-snout-nose",
  );
  snout.rotation.z = Math.PI / 2;
  snout.position.set(0.94, 1.12, 0);
  robotDog.add(snout);
  for (const z of [-0.19, 0.19]) {
    const ear = mesh(
      geometry(new THREE.ConeGeometry(0.13, 0.46, 5)),
      robotBlue,
      "glowing-robot-ear",
    );
    ear.position.set(0.52, 1.68, z);
    robotDog.add(ear);
    pulsingObjects.push(ear);
  }
  for (const x of [-0.25, 0.34]) {
    for (const z of [-0.24, 0.24]) {
      const leg = mesh(
        geometry(new THREE.CylinderGeometry(0.07, 0.075, 0.58, 8)),
        robotMetal,
        "robot-dog-leg",
      );
      leg.position.set(x, 0.52, z);
      robotDog.add(leg);
    }
  }
  const hologram = mesh(
    geometry(new THREE.CylinderGeometry(0.72, 0.86, 0.12, 32)),
    basic({
      color: 0x35def7,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    }),
    "detective-snout-holographic-platform",
  );
  hologram.position.y = 0.08;
  robotDog.add(hologram);
  robotDog.position.set(0.4, 0.08, -1.1);
  park.add(robotDog);
  pulsingObjects.push(hologram);

  const flowerScent = addInteractive(
    "flower-scent",
    makeTrail(
      park,
      "flower-scent",
      0xff4da6,
      [
        new THREE.Vector3(-3.7, 0.45, -1.1),
        new THREE.Vector3(-2.8, 0.9, -0.6),
        new THREE.Vector3(-1.9, 1.28, 0.15),
        new THREE.Vector3(-0.8, 1.12, 0.55),
      ],
      "petal",
    ),
  );
  flowerScent.userData.scentKind = "flower";
  const foodScent = addInteractive(
    "food-scent",
    makeTrail(
      park,
      "food-scent",
      0xffa321,
      [
        new THREE.Vector3(3.15, 1.2, -0.9),
        new THREE.Vector3(2.45, 1.55, -0.4),
        new THREE.Vector3(1.58, 1.3, 0.15),
        new THREE.Vector3(0.55, 1.65, 0.65),
      ],
      "ring",
      14,
    ),
  );
  foodScent.userData.scentKind = "food";
  const grassScent = addInteractive(
    "grass-scent",
    makeTrail(
      park,
      "grass-scent",
      0x2ee6df,
      [
        new THREE.Vector3(-1.7, 0.12, 1.9),
        new THREE.Vector3(-0.7, 0.25, 1.4),
        new THREE.Vector3(0.3, 0.18, 1.8),
        new THREE.Vector3(1.25, 0.32, 1.25),
      ],
      "drop",
    ),
  );
  grassScent.userData.scentKind = "wet-grass";
  const trashScent = addInteractive(
    "trash-scent",
    makeTrail(
      park,
      "trash-scent",
      0xb45137,
      [
        new THREE.Vector3(4.7, 0.8, 0.15),
        new THREE.Vector3(4.4, 1.35, 0.25),
        new THREE.Vector3(4.85, 1.78, -0.1),
        new THREE.Vector3(4.5, 2.18, 0.18),
      ],
      "smoke",
      9,
    ),
  );
  trashScent.userData.scentKind = "trash";
  addInteractiveAlias("gold-food", foodScent);
  addInteractiveAlias("pink-flower", flowerScent);
  addInteractiveAlias("cyan-grass", grassScent);
  makeParticleCloud(
    park,
    "smell-o-vision-particles",
    0xf9d65c,
    72,
    new THREE.Vector3(8, 3.5, 7),
    new THREE.Vector3(0, 0.25, 0),
  );

  // Mission 2: ant-sized ground, towering grass, marching ants and lollipop.
  const antWorld = missionGroups[1];
  makeGround(antWorld, 0x4d3b28, 7.5);
  for (let index = 0; index < 32; index += 1) {
    const blade = mesh(
      geometry(
        new THREE.ConeGeometry(
          0.1 + (index % 3) * 0.025,
          3.1 + (index % 5) * 0.4,
          6,
        ),
      ),
      standard({
        color: index % 2 === 0 ? 0x398241 : 0x5a9a45,
        roughness: 0.92,
      }),
      "towering-grass-blade",
    );
    const side = index % 2 === 0 ? -1 : 1;
    blade.position.set(
      side * (1.55 + (index % 7) * 0.58),
      blade.geometry.boundingBox?.max.y ?? 1.8,
      -4.5 + Math.floor(index / 7) * 1.85,
    );
    blade.position.y = (3.1 + (index % 5) * 0.4) / 2;
    blade.rotation.z = side * (0.08 + (index % 3) * 0.025);
    antWorld.add(blade);
    swayingObjects.push(blade);
  }
  const antNest = mesh(
    geometry(
      new THREE.SphereGeometry(0.82, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    ),
    standard({ color: 0x7e5733, roughness: 1 }),
    "ant-nest-mound",
  );
  antNest.position.set(-2.8, -0.02, 2.4);
  antWorld.add(antNest);
  const nestOpening = mesh(
    geometry(new THREE.CircleGeometry(0.24, 20)),
    basic({ color: 0x160f0a }),
    "ant-nest-opening",
  );
  nestOpening.rotation.x = -Math.PI / 2;
  nestOpening.position.set(-2.8, 0.41, 2.05);
  antWorld.add(nestOpening);

  const ants: THREE.Group[] = [];
  for (let index = 0; index < 10; index += 1) {
    const ant = group(index === 0 ? "scout-ant" : "marching-ant");
    const antMaterial = standard({ color: 0x21150f, roughness: 0.76 });
    for (const [z, radius] of [
      [-0.16, 0.11],
      [0, 0.09],
      [0.17, 0.13],
    ] as const) {
      const segment = mesh(
        geometry(new THREE.SphereGeometry(radius, 8, 6)),
        antMaterial,
        "ant-body-segment",
      );
      segment.position.z = z;
      ant.add(segment);
    }
    for (const side of [-1, 1]) {
      for (let legIndex = 0; legIndex < 3; legIndex += 1) {
        const leg = mesh(
          geometry(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 4)),
          antMaterial,
          "ant-leg",
        );
        leg.rotation.z = Math.PI / 2.9;
        leg.rotation.y = side * (0.18 + legIndex * 0.17);
        leg.position.set(side * 0.13, -0.04, (legIndex - 1) * 0.11);
        ant.add(leg);
      }
    }
    ant.position.set(-2.4 + index * 0.5, 0.15, 1.82 - index * 0.33);
    ant.rotation.y = -0.62;
    ant.scale.setScalar(index === 0 ? 1.18 : 1);
    antWorld.add(ant);
    ants.push(ant);
  }
  const lollipop = group("giant-dropped-lollipop");
  const lollipopStick = mesh(
    geometry(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 12)),
    standard({ color: 0xf7f2df, roughness: 0.58 }),
    "lollipop-stick",
  );
  lollipopStick.rotation.z = Math.PI / 2.8;
  lollipopStick.position.set(0.95, 0.68, 0);
  lollipop.add(lollipopStick);
  const candy = mesh(
    geometry(new THREE.TorusGeometry(0.78, 0.28, 12, 42)),
    standard({
      color: 0xf34d6d,
      roughness: 0.28,
      emissive: 0x771423,
      emissiveIntensity: 0.32,
    }),
    "giant-lollipop-candy",
  );
  candy.position.set(-0.05, 1.45, 0);
  candy.rotation.y = Math.PI / 2;
  lollipop.add(candy);
  lollipop.position.set(2.9, 0, -2.2);
  antWorld.add(lollipop);

  const antTrail = addInteractive(
    "ant-pheromone-trail",
    makeTrail(
      antWorld,
      "ant-pheromone-trail",
      0x55ff72,
      [
        new THREE.Vector3(-2.55, 0.12, 2.1),
        new THREE.Vector3(-1.4, 0.13, 1.25),
        new THREE.Vector3(-0.15, 0.14, 0.48),
        new THREE.Vector3(1.3, 0.15, -0.72),
        new THREE.Vector3(2.75, 0.18, -1.8),
      ],
      "diamond",
      18,
    ),
  );
  antTrail.userData.scentKind = "pheromone";
  const antWeakTrail = addInteractive(
    "ant-weak-trail",
    makeTrail(
      antWorld,
      "ant-weak-trail",
      0xa4bc65,
      [
        new THREE.Vector3(-0.05, 0.13, 0.5),
        new THREE.Vector3(-0.3, 0.14, -0.7),
        new THREE.Vector3(-1.7, 0.15, -1.5),
      ],
      "smoke",
      7,
    ),
  );
  antWeakTrail.userData.scentKind = "weak-pheromone-distractor";
  addInteractive("lollipop", lollipop);
  addInteractiveAlias("fresh-trail", antTrail);
  addInteractiveAlias("strong-trail", antTrail);
  addInteractiveAlias("faint-trail", antWeakTrail);
  addInteractiveAlias("red-detour", antWeakTrail);
  addInteractiveAlias("ant-nest", antNest);

  const dryLeaf = mesh(
    geometry(new THREE.CircleGeometry(0.3, 8)),
    standard({ color: 0x9a5a2b, roughness: 0.98, side: THREE.DoubleSide }),
    "dry-leaf",
  );
  dryLeaf.scale.set(1.6, 0.72, 1);
  dryLeaf.rotation.set(-Math.PI / 2, 0.18, 0.42);
  dryLeaf.position.set(-0.65, 0.04, 1.35);
  antWorld.add(dryLeaf);
  addInteractive("dry-leaf", dryLeaf);
  const greyPebble = mesh(
    geometry(new THREE.DodecahedronGeometry(0.27, 0)),
    standard({ color: 0x737777, roughness: 0.94 }),
    "grey-pebble",
  );
  greyPebble.scale.set(1.4, 0.62, 1.05);
  greyPebble.position.set(0.72, 0.14, 1.05);
  antWorld.add(greyPebble);
  addInteractive("grey-pebble", greyPebble);
  const buriedStick = mesh(
    geometry(new THREE.CylinderGeometry(0.045, 0.06, 1.05, 7)),
    standard({ color: 0x735039, roughness: 0.96 }),
    "buried-stick",
  );
  buriedStick.rotation.z = Math.PI / 2.5;
  buriedStick.position.set(1.85, 0.14, -2.8);
  antWorld.add(buriedStick);
  addInteractive("buried-stick", buriedStick);

  // Mission 3: mixed scent evidence in a forest rescue scene.
  const rescueWorld = missionGroups[2];
  makeGround(rescueWorld, 0x45563b, 8.5);
  for (const [x, z, size] of [
    [-5.3, -2.8, 1.2],
    [5.2, -3.4, 1.15],
    [-4.8, 2.6, 1.08],
    [4.9, 2.4, 1.12],
    [-2.8, -4.3, 0.92],
    [2.5, -4.5, 1.02],
  ] as const) {
    makeTree(rescueWorld, x, z, size);
  }
  const tent = group("forest-camping-tent");
  const tentBody = mesh(
    geometry(new THREE.ConeGeometry(1.35, 1.75, 4)),
    standard({ color: 0xe9813a, roughness: 0.82 }),
    "orange-camping-tent",
  );
  tentBody.rotation.y = Math.PI / 4;
  tentBody.position.y = 0.87;
  tent.add(tentBody);
  const tentDoor = mesh(
    geometry(new THREE.CircleGeometry(0.48, 3)),
    basic({ color: 0x30383c }),
    "tent-door",
  );
  tentDoor.position.set(0, 0.55, 0.96);
  tent.add(tentDoor);
  tent.position.set(-3.25, 0, -1.95);
  tent.rotation.y = 0.42;
  rescueWorld.add(tent);

  const fallenLog = mesh(
    geometry(new THREE.CylinderGeometry(0.34, 0.45, 3.2, 14)),
    standard({ color: 0x644125, roughness: 0.96 }),
    "fallen-log-hiding-place",
  );
  fallenLog.rotation.z = Math.PI / 2;
  fallenLog.rotation.y = -0.25;
  fallenLog.position.set(1.85, 0.38, -1.55);
  rescueWorld.add(fallenLog);

  const squirrel = group("forest-squirrel");
  const squirrelMaterial = standard({ color: 0xa2522c, roughness: 0.82 });
  const squirrelBody = mesh(
    geometry(new THREE.SphereGeometry(0.28, 12, 9)),
    squirrelMaterial,
    "squirrel-body",
  );
  squirrelBody.scale.set(0.82, 1.25, 0.8);
  squirrelBody.position.y = 0.48;
  squirrel.add(squirrelBody);
  const squirrelHead = mesh(
    geometry(new THREE.SphereGeometry(0.2, 12, 9)),
    squirrelMaterial,
    "squirrel-head",
  );
  squirrelHead.position.set(0.06, 0.78, 0);
  squirrel.add(squirrelHead);
  const squirrelTail = mesh(
    geometry(new THREE.TorusGeometry(0.42, 0.13, 9, 22, Math.PI * 1.55)),
    squirrelMaterial,
    "squirrel-bushy-tail",
  );
  squirrelTail.position.set(-0.2, 0.72, -0.06);
  squirrelTail.rotation.y = Math.PI / 2;
  squirrel.add(squirrelTail);
  squirrel.position.set(-2.7, 0, 0.1);
  rescueWorld.add(squirrel);

  const pizzaBox = mesh(
    geometry(new THREE.BoxGeometry(0.9, 0.1, 0.9)),
    standard({ color: 0xd6a96a, roughness: 0.82 }),
    "empty-pizza-box",
  );
  pizzaBox.position.set(-1.8, 0.1, 1.4);
  pizzaBox.rotation.y = -0.3;
  rescueWorld.add(pizzaBox);

  const teddy = group("lost-camper-teddy-bear");
  const teddyMaterial = standard({ color: 0xb97745, roughness: 0.94 });
  const teddyBody = mesh(
    geometry(new THREE.SphereGeometry(0.3, 14, 10)),
    teddyMaterial,
    "teddy-body",
  );
  teddyBody.scale.set(0.84, 1.16, 0.7);
  teddyBody.position.y = 0.4;
  teddy.add(teddyBody);
  const teddyHead = mesh(
    geometry(new THREE.SphereGeometry(0.24, 14, 10)),
    teddyMaterial,
    "teddy-head",
  );
  teddyHead.position.y = 0.78;
  teddy.add(teddyHead);
  for (const x of [-0.17, 0.17]) {
    const ear = mesh(
      geometry(new THREE.SphereGeometry(0.09, 10, 7)),
      teddyMaterial,
      "teddy-ear",
    );
    ear.position.set(x, 0.95, 0);
    teddy.add(ear);
  }
  teddy.position.set(2.55, 0.12, -1.9);
  rescueWorld.add(teddy);
  addInteractive("teddy-bear", teddy);
  pulsingObjects.push(teddy);

  const squirrelTrail = addInteractive(
    "squirrel-scent",
    makeTrail(
      rescueWorld,
      "squirrel-scent",
      0xff4d57,
      [
        new THREE.Vector3(-3.7, 0.28, 1.2),
        new THREE.Vector3(-2.7, 0.48, 0.15),
        new THREE.Vector3(-3.3, 0.68, -1),
        new THREE.Vector3(-2.45, 0.48, -2.1),
      ],
      "diamond",
    ),
  );
  squirrelTrail.userData.scentKind = "squirrel";
  const pizzaTrail = addInteractive(
    "pizza-scent",
    makeTrail(
      rescueWorld,
      "pizza-scent",
      0xffcf35,
      [
        new THREE.Vector3(-1.8, 0.4, 1.4),
        new THREE.Vector3(-0.9, 0.9, 0.8),
        new THREE.Vector3(0.15, 1.2, 1.2),
        new THREE.Vector3(0.9, 1.05, 0.45),
      ],
      "ring",
    ),
  );
  pizzaTrail.userData.scentKind = "pizza";
  const targetTrail = addInteractive(
    "target-scent",
    makeTrail(
      rescueWorld,
      "target-scent",
      0x42a8ff,
      [
        new THREE.Vector3(-0.65, 0.25, 1.75),
        new THREE.Vector3(0.1, 0.48, 0.7),
        new THREE.Vector3(0.85, 0.35, -0.15),
        new THREE.Vector3(1.55, 0.45, -1.05),
        new THREE.Vector3(2.42, 0.65, -1.75),
      ],
      "drop",
      16,
    ),
  );
  targetTrail.userData.scentKind = "camper-associated-target";
  addInteractive("squirrel", squirrel);
  addInteractive("pizza-box", pizzaBox);
  addInteractiveAlias("blue-target", targetTrail);
  addInteractiveAlias("blue-checkpoint", targetTrail);
  addInteractiveAlias("red-squirrel", squirrelTrail);
  addInteractiveAlias("yellow-pizza", pizzaTrail);
  addInteractiveAlias("squirrel-tree", squirrel);

  const campRadio = group("camp-radio");
  const radioBody = mesh(
    geometry(new THREE.BoxGeometry(0.48, 0.32, 0.22)),
    standard({ color: 0x40526a, roughness: 0.58, metalness: 0.2 }),
    "camp-radio-body",
  );
  campRadio.add(radioBody);
  const radioDial = mesh(
    geometry(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 10)),
    standard({ color: 0xf1c04b, roughness: 0.48 }),
    "camp-radio-dial",
  );
  radioDial.rotation.x = Math.PI / 2;
  radioDial.position.set(0.13, 0.03, 0.12);
  campRadio.add(radioDial);
  campRadio.position.set(-2.6, 0.26, -0.92);
  rescueWorld.add(campRadio);
  addInteractive("camp-radio", campRadio);
  const backpack = group("unrelated-backpack");
  const backpackBody = mesh(
    geometry(new THREE.BoxGeometry(0.52, 0.68, 0.3, 2, 2, 1)),
    standard({ color: 0x3d6d55, roughness: 0.88 }),
    "backpack-body",
  );
  backpackBody.position.y = 0.36;
  backpack.add(backpackBody);
  const backpackFlap = mesh(
    geometry(new THREE.BoxGeometry(0.46, 0.2, 0.34)),
    standard({ color: 0x315842, roughness: 0.9 }),
    "backpack-flap",
  );
  backpackFlap.position.set(0, 0.62, 0.02);
  backpack.add(backpackFlap);
  backpack.position.set(-3.8, 0, -0.55);
  rescueWorld.add(backpack);
  addInteractive("backpack", backpack);

  // Mission 4: moonlit moth pheromone search and recap icons.
  const mothWorld = missionGroups[3];
  makeGround(mothWorld, 0x142c31, 8.5);
  for (const [x, z, size] of [
    [-5, -2.5, 1.15],
    [5.1, -2.7, 1.2],
    [-4.9, 2.6, 0.95],
    [4.7, 2.8, 1.04],
    [0.1, -5, 1.15],
  ] as const) {
    makeTree(mothWorld, x, z, size, true);
  }
  const moon = mesh(
    geometry(new THREE.SphereGeometry(1.1, 24, 16)),
    basic({ color: 0xe9efff }),
    "giant-night-moon",
  );
  moon.position.set(-4.2, 5.3, -6.5);
  mothWorld.add(moon);
  const moonHalo = mesh(
    geometry(new THREE.RingGeometry(1.2, 1.75, 32)),
    basic({
      color: 0xa9c6ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    "moon-halo",
  );
  moonHalo.position.copy(moon.position);
  mothWorld.add(moonHalo);
  billboards.push(moonHalo);

  const branch = mesh(
    geometry(new THREE.CylinderGeometry(0.12, 0.18, 3.2, 10)),
    standard({ color: 0x51402f, roughness: 0.96 }),
    "silkmoth-resting-branch",
  );
  branch.rotation.z = Math.PI / 2.35;
  branch.position.set(0.4, 2, -0.75);
  mothWorld.add(branch);

  const moth = group("male-silkmoth-super-sniffer");
  const mothBody = mesh(
    geometry(new THREE.CapsuleGeometry(0.12, 0.44, 5, 8)),
    standard({ color: 0xb99d78, roughness: 0.86 }),
    "silkmoth-body",
  );
  mothBody.rotation.x = Math.PI / 2;
  moth.add(mothBody);
  const wingMaterial = standard({
    color: 0xd8c7aa,
    roughness: 0.72,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  const mothWings: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const wing = mesh(
      geometry(new THREE.CircleGeometry(0.42, 16)),
      wingMaterial,
      "silkmoth-wing",
    );
    wing.scale.set(1.25, 0.65, 1);
    wing.position.x = side * 0.34;
    wing.rotation.y = side * 0.42;
    moth.add(wing);
    mothWings.push(wing);
    const antennaStem = mesh(
      geometry(new THREE.TorusGeometry(0.22, 0.025, 6, 18, Math.PI * 0.82)),
      standard({
        color: 0xc867ff,
        emissive: 0x7d1faa,
        emissiveIntensity: 1.15,
        roughness: 0.45,
      }),
      "sensitive-silkmoth-antenna",
    );
    antennaStem.scale.x = side;
    antennaStem.position.set(side * 0.06, 0.24, 0.12);
    moth.add(antennaStem);
    pulsingObjects.push(antennaStem);
  }
  moth.position.set(0.3, 2.45, -0.7);
  moth.scale.setScalar(1.7);
  mothWorld.add(moth);
  addInteractive("silkmoth", moth);

  const mothTrail = addInteractive(
    "moth-pheromone-trail",
    makeTrail(
      mothWorld,
      "moth-pheromone-trail",
      0xc54dff,
      [
        new THREE.Vector3(4.9, 1.25, -3.6),
        new THREE.Vector3(3.4, 1.9, -2.6),
        new THREE.Vector3(2.1, 2.55, -2),
        new THREE.Vector3(1.25, 2.2, -1.2),
        new THREE.Vector3(0.45, 2.5, -0.72),
      ],
      "star",
      22,
    ),
  );
  mothTrail.userData.scentKind = "silkmoth-pheromone";
  makeParticleCloud(
    mothWorld,
    "night-pheromone-sparkles",
    0xc966ff,
    96,
    new THREE.Vector3(9, 4.5, 7),
    new THREE.Vector3(0, 0.35, -0.3),
    71,
  );

  const recapIcons = group("super-sniffer-knowledge-recap");
  const recapData = [
    ["ant-recap", 0x55ff72, -1.55, "diamond"],
    ["dog-recap", 0x42a8ff, 0, "drop"],
    ["moth-recap", 0xc54dff, 1.55, "star"],
  ] as const;
  for (const [id, color, x, shape] of recapData) {
    const icon = group(id);
    const ring = mesh(
      geometry(new THREE.TorusGeometry(0.5, 0.065, 8, 28)),
      basic({ color, transparent: true, opacity: 0.92 }),
      `${id}-outer-ring`,
    );
    icon.add(ring);
    const coreGeometry =
      shape === "diamond"
        ? geometry(new THREE.OctahedronGeometry(0.28, 0))
        : shape === "drop"
          ? geometry(new THREE.ConeGeometry(0.24, 0.55, 9))
          : geometry(new THREE.TetrahedronGeometry(0.32, 0));
    const core = mesh(
      coreGeometry,
      standard({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        roughness: 0.38,
      }),
      `${id}-${shape}-symbol`,
    );
    icon.add(core);
    icon.position.set(x, 1.25, 1.15);
    recapIcons.add(icon);
    addInteractive(id, icon);
    pulsingObjects.push(icon);
  }
  mothWorld.add(recapIcons);
  const antRecap = interactiveTargets.get("ant-recap");
  const dogRecap = interactiveTargets.get("dog-recap");
  const mothRecap = interactiveTargets.get("moth-recap");
  if (antRecap) {
    addInteractiveAlias("ant-pheromone", antRecap);
    addInteractiveAlias("ant-vision", antRecap);
    addInteractiveAlias("ant-sound", antRecap);
  }
  if (dogRecap) {
    addInteractiveAlias("dog-tracking", dogRecap);
    addInteractiveAlias("dog-colour", dogRecap);
    addInteractiveAlias("dog-magnet", dogRecap);
  }
  if (mothRecap) {
    addInteractiveAlias("moth-antennae", mothRecap);
    addInteractiveAlias("moth-taste", mothRecap);
    addInteractiveAlias("moth-light", mothRecap);
  }

  const confetti = group("super-sniffer-celebration-confetti");
  const confettiColors = [0x55ff72, 0x42a8ff, 0xc54dff, 0xffd34b, 0xff6b78];
  for (let index = 0; index < 48; index += 1) {
    const piece = mesh(
      geometry(new THREE.BoxGeometry(0.055, 0.16, 0.025)),
      basic({ color: confettiColors[index % confettiColors.length] }),
      "graduation-confetti-piece",
    );
    const angle = index * 2.39996;
    const radius = 0.75 + (index % 8) * 0.25;
    piece.position.set(
      Math.cos(angle) * radius,
      1.6 + (index % 9) * 0.28,
      Math.sin(angle) * radius - 0.4,
    );
    piece.userData.phase = (index % 13) / 13;
    confetti.add(piece);
  }
  confetti.visible = false;
  mothWorld.add(confetti);

  let activeMission: SuperSensesSmellMission = 0;
  let progress = 0;
  let timelineSeconds = 0;
  const missionProgress = [0, 0, 0, 0];
  let isCelebrating = false;
  let isFrozen = false;
  let prefersReducedMotion = false;

  const setObjectChoiceId = (object: THREE.Object3D, id?: string) => {
    if (id) object.userData.choiceId = id;
    else delete object.userData.choiceId;
  };

  const configureActiveChoices = () => {
    interactiveTargets.forEach((object) => setObjectChoiceId(object));
    if (activeMission === 0) {
      setObjectChoiceId(foodScent, "gold-food");
      setObjectChoiceId(flowerScent, "pink-flower");
      setObjectChoiceId(grassScent, "cyan-grass");
      return;
    }
    if (activeMission === 1) {
      if (progress < 1 / 3) {
        setObjectChoiceId(antTrail, "fresh-trail");
        setObjectChoiceId(dryLeaf, "dry-leaf");
        setObjectChoiceId(greyPebble, "grey-pebble");
      } else if (progress < 2 / 3) {
        setObjectChoiceId(antTrail, "strong-trail");
        setObjectChoiceId(antWeakTrail, "faint-trail");
        setObjectChoiceId(buriedStick, "red-detour");
      } else {
        setObjectChoiceId(lollipop, "lollipop");
        setObjectChoiceId(antNest, "ant-nest");
        setObjectChoiceId(buriedStick, "buried-stick");
      }
      return;
    }
    if (activeMission === 2) {
      if (progress < 1 / 3) {
        setObjectChoiceId(targetTrail, "blue-target");
        setObjectChoiceId(squirrelTrail, "red-squirrel");
        setObjectChoiceId(pizzaTrail, "yellow-pizza");
      } else if (progress < 2 / 3) {
        setObjectChoiceId(targetTrail, "blue-checkpoint");
        setObjectChoiceId(squirrel, "squirrel-tree");
        setObjectChoiceId(pizzaBox, "pizza-box");
      } else {
        setObjectChoiceId(teddy, "teddy-bear");
        setObjectChoiceId(campRadio, "camp-radio");
        setObjectChoiceId(backpack, "backpack");
      }
      return;
    }
    if (progress < 1 / 3 && antRecap) {
      setObjectChoiceId(antRecap, "ant-pheromone");
    } else if (progress < 2 / 3 && dogRecap) {
      setObjectChoiceId(dogRecap, "dog-tracking");
    } else if (mothRecap) {
      setObjectChoiceId(mothRecap, "moth-antennae");
    }
  };

  const setMission = (mission: SuperSensesSmellMission | number) => {
    activeMission = missionIndex(mission);
    progress = missionProgress[activeMission];
    missionGroups.forEach((missionGroup, index) => {
      missionGroup.visible = index === activeMission;
    });
    const night = activeMission === 3;
    hemisphere.color.set(night ? 0x8294c4 : 0xe6f7ff);
    hemisphere.groundColor.set(night ? 0x07131d : 0x3d522c);
    hemisphere.intensity = night ? 0.82 : 1.75;
    sunlight.color.set(night ? 0xaac8ff : 0xfff3d2);
    sunlight.intensity = night ? 1.25 : 2.8;
    scene.fog = worldFog;
    worldFog.color.set(night ? 0x0b1930 : 0xb6d9d1);
    worldFog.near = night ? 7 : 9;
    worldFog.far = night ? 24 : 31;
    configureActiveChoices();
  };

  const setChoice = (id: string, state: SuperSensesSmellChoiceState) => {
    const target = interactiveTargets.get(id);
    if (!target) return;
    const visualState =
      state === "wrong" ? "incorrect" : state === "hint" ? "selected" : state;
    target.userData.choiceState = visualState;
    const targetScale =
      visualState === "correct"
        ? 1.18
        : visualState === "incorrect"
          ? 0.9
          : visualState === "selected"
            ? 1.08
            : 1;
    target.scale.setScalar(targetScale);
    target.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.Points))
        return;
      const childMaterials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      childMaterials.forEach((material) => {
        material.transparent = material.transparent || visualState !== "idle";
        if ("opacity" in material) {
          material.opacity =
            visualState === "incorrect"
              ? 0.36
              : visualState === "selected"
                ? 0.9
                : 1;
        }
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity =
            visualState === "correct"
              ? 1.15
              : visualState === "selected"
                ? 0.72
                : visualState === "incorrect"
                  ? 0.08
                  : 0.35;
        }
      });
    });
  };

  const setProgress = (progress01: number) => {
    progress = clamp01(progress01);
    missionProgress[activeMission] = progress;
    const active = missionGroups[activeMission];
    const revealThreshold = Math.max(4, Math.ceil(progress * ants.length));
    active.traverse((object) => {
      if (object.name.endsWith("marker")) {
        const phase = Number(object.userData.phase ?? 0);
        object.visible = phase <= progress + 0.08;
      }
    });
    if (activeMission === 0) {
      foodScent.scale.setScalar(1 + progress * 0.13);
    } else if (activeMission === 1) {
      ants.forEach((ant, index) => {
        ant.visible = index < revealThreshold;
      });
      antTrail.scale.setScalar(1 + progress * 0.08);
    } else if (activeMission === 2) {
      targetTrail.visible = true;
      targetTrail.scale.setScalar(0.78 + progress * 0.34);
      teddy.visible = progress > 0.66;
    } else {
      mothTrail.scale.setScalar(0.75 + progress * 0.32);
      recapIcons.visible = true;
    }
    configureActiveChoices();
  };

  const setTimeline = (seconds: number) => {
    timelineSeconds = Number.isFinite(seconds)
      ? Math.min(300, Math.max(0, seconds))
      : timelineSeconds;
  };

  const setMissionProgress = (
    mission: SuperSensesSmellMission | number,
    progress01: number,
  ) => {
    const index = missionIndex(mission);
    missionProgress[index] = clamp01(progress01);
    if (index === activeMission) setProgress(missionProgress[index]);
  };

  const focusForMission = (
    mission: SuperSensesSmellMission | number,
  ): SuperSensesSmellFocus => {
    const pose = FOCUS_POSES[missionIndex(mission)];
    return {
      position: pose.position.clone(),
      target: pose.target.clone(),
    };
  };

  const focusTarget = (mission: SuperSensesSmellMission | number) =>
    FOCUS_POSES[missionIndex(mission)].target.clone();

  const celebrate = (beat?: "portal" | "confetti" | "badge") => {
    isCelebrating = true;
    isFrozen = false;
    recapIcons.visible = true;
    mothTrail.visible = true;
    if (!beat || beat === "confetti" || beat === "badge")
      confetti.visible = true;
  };

  const freeze = () => {
    isFrozen = true;
  };

  const applySnapshot = (snapshot: SuperSensesSmellSnapshot) => {
    setMission(snapshot.mission);
    setTimeline(snapshot.timeSeconds);
    prefersReducedMotion = snapshot.reducedMotion;
    isFrozen = Boolean(snapshot.frozen);
    interactiveTargets.forEach((_, id) => setChoice(id, "idle"));
    if (snapshot.selectedDistractor) {
      setChoice(snapshot.selectedDistractor, "incorrect");
    }
    if (snapshot.selectedScent) {
      setChoice(snapshot.selectedScent, "correct");
    }
    setProgress(snapshot.progress);
    if (snapshot.completed) celebrate();
  };

  const update = (
    elapsedSeconds: number,
    deltaSeconds: number,
    activeCameraOrReducedMotion?: THREE.Camera | boolean,
    reducedMotion = prefersReducedMotion,
  ) => {
    if (disposed || isFrozen) return;
    const elapsed = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0;
    const delta = Number.isFinite(deltaSeconds)
      ? Math.min(0.1, Math.max(0, deltaSeconds))
      : 0;
    const activeCamera =
      typeof activeCameraOrReducedMotion === "boolean"
        ? undefined
        : activeCameraOrReducedMotion;
    const shouldReduceMotion =
      typeof activeCameraOrReducedMotion === "boolean"
        ? activeCameraOrReducedMotion
        : reducedMotion;
    prefersReducedMotion = shouldReduceMotion;
    timelineSeconds = elapsed;
    const motionScale = shouldReduceMotion ? 0.18 : 1;

    animatedTrails.forEach((trail, trailIndex) => {
      trail.children.forEach((child, childIndex) => {
        if (childIndex === 0) return;
        const phase = Number(child.userData.phase ?? childIndex * 0.07);
        child.position.y +=
          Math.sin(elapsed * 2.2 + phase * Math.PI * 2 + trailIndex) *
          delta *
          0.018 *
          motionScale;
        child.rotation.y =
          elapsed * (0.5 + (childIndex % 4) * 0.08) * motionScale;
      });
      trail.rotation.y =
        Math.sin(elapsed * 0.32 + trailIndex) * 0.012 * motionScale;
    });
    swayingObjects.forEach((object, index) => {
      object.rotation.z =
        Math.sin(elapsed * 0.62 + index * 0.73) * 0.016 * motionScale;
    });
    pulsingObjects.forEach((object, index) => {
      const pulse =
        1 + Math.sin(elapsed * 2.1 + index * 0.83) * 0.04 * motionScale;
      const choiceState = object.userData.choiceState as
        | SuperSensesSmellChoiceState
        | undefined;
      if (!choiceState || choiceState === "idle") object.scale.setScalar(pulse);
    });
    ants.forEach((ant, index) => {
      ant.position.y =
        0.15 +
        Math.abs(Math.sin(elapsed * 4.2 + index * 0.7)) * 0.018 * motionScale;
    });
    squirrelTail.rotation.z = Math.sin(elapsed * 2.6) * 0.18 * motionScale;
    mothWings.forEach((wing, index) => {
      wing.rotation.y =
        (index === 0 ? -1 : 1) *
        (0.38 + Math.sin(elapsed * 4.8) * 0.2 * motionScale);
    });
    billboards.forEach((object) => {
      if (activeCamera) object.lookAt(activeCamera.position);
      else object.rotation.y = -root.rotation.y;
    });
    if (isCelebrating && confetti.visible) {
      confetti.children.forEach((piece, index) => {
        const phase = Number(piece.userData.phase ?? 0);
        piece.position.y -= delta * (0.42 + phase * 0.56) * motionScale;
        piece.rotation.x += delta * (1.1 + (index % 4) * 0.3) * motionScale;
        piece.rotation.z += delta * (0.9 + (index % 5) * 0.24) * motionScale;
        if (piece.position.y < 0.1) piece.position.y = 3.45 + phase;
      });
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    scene.remove(root, hemisphere, sunlight);
    if (
      scene.background === environmentTexture ||
      scene.background === fallbackBackground
    ) {
      scene.background = previousBackground;
    }
    if (scene.environment === environmentTexture)
      scene.environment = previousEnvironment;
    if (scene.fog === worldFog) scene.fog = previousFog;
    geometries.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    textures.forEach((item) => item.dispose());
    geometries.clear();
    materials.clear();
    textures.clear();
    interactiveTargets.clear();
    interactableSet.clear();
    animatedTrails.length = 0;
    swayingObjects.length = 0;
    pulsingObjects.length = 0;
    billboards.length = 0;
    renderer?.setAnimationLoop(null);
  };

  setMission(0);
  setProgress(0);

  return {
    root,
    interactiveTargets,
    interactables: [...interactableSet],
    applySnapshot,
    setMission,
    setTimeline,
    setMissionProgress,
    setChoice,
    setProgress,
    focusForMission,
    focusTarget,
    celebrate,
    freeze,
    update,
    dispose,
  };
}
