import * as THREE from "three";

export type SuperSensesSightMission = 0 | 1 | 2 | 3;

export type SuperSensesSightChoiceState =
  | "idle"
  | "selected"
  | "correct"
  | "incorrect"
  | "wrong"
  | "hint";

export type SuperSensesSightCelebrationBeat =
  | "recap"
  | "portal"
  | "graduation"
  | "fireworks"
  | "feathers-stars"
  | "confetti"
  | "badge";

export interface SuperSensesSightSnapshot {
  mission: SuperSensesSightMission | number;
  progress: number;
  selectedChoice?: string | null;
  selectedDistractor?: string | null;
  timeSeconds: number;
  reducedMotion: boolean;
  completed?: boolean;
  frozen?: boolean;
}

export interface SuperSensesSightFocus {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface SuperSensesSightWorld {
  root: THREE.Group;
  interactiveTargets: ReadonlyMap<string, THREE.Object3D>;
  interactables: THREE.Object3D[];
  applySnapshot: (snapshot: SuperSensesSightSnapshot) => void;
  setMission: (mission: SuperSensesSightMission | number) => void;
  setTimeline: (seconds: number) => void;
  setMissionProgress: (
    mission: SuperSensesSightMission | number,
    progress01: number,
  ) => void;
  setProgress: (progress01: number) => void;
  setChoice: (id: string, state: SuperSensesSightChoiceState) => void;
  focusForMission: (
    mission: SuperSensesSightMission | number,
  ) => SuperSensesSightFocus;
  focusTarget: (mission: SuperSensesSightMission | number) => THREE.Vector3;
  celebrate: (beat?: SuperSensesSightCelebrationBeat) => void;
  freeze: () => void;
  update: (
    elapsedSeconds: number,
    deltaSeconds: number,
    activeCameraOrReducedMotion?: THREE.Camera | boolean,
    reducedMotion?: boolean,
  ) => void;
  dispose: () => void;
}

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

const missionIndex = (value: number): SuperSensesSightMission =>
  Math.min(3, Math.max(0, Math.round(value))) as SuperSensesSightMission;

const FOCUS_POSES: readonly SuperSensesSightFocus[] = [
  {
    position: new THREE.Vector3(0, 2.15, 6.7),
    target: new THREE.Vector3(0, 1.35, -0.7),
  },
  {
    position: new THREE.Vector3(0, 2.35, 7.25),
    target: new THREE.Vector3(0, 0.58, -1.25),
  },
  {
    position: new THREE.Vector3(0, 1.9, 6.25),
    target: new THREE.Vector3(0, 1.2, -1.15),
  },
  {
    position: new THREE.Vector3(0, 1.9, 6.35),
    target: new THREE.Vector3(0, 1.35, -0.25),
  },
] as const;

interface MaterialAppearance {
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

interface WingPair {
  left: THREE.Object3D;
  right: THREE.Object3D;
  speed: number;
  amplitude: number;
  restingAngle: number;
}

/**
 * A lightweight, procedural four-mission vision world. It deliberately models
 * visible evidence instead of claiming to reproduce an animal's perception:
 * the eagle task resolves progressively finer detail, the night task uses
 * eyeshine as a location clue, and the chameleon task visualises independent
 * eye tracking around a branch.
 */
export function createSuperSensesSightWorld(
  scene: THREE.Scene,
  renderer?: THREE.WebGLRenderer,
): SuperSensesSightWorld {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const interactiveTargets = new Map<string, THREE.Object3D>();
  const interactableSet = new Set<THREE.Object3D>();
  const targetBaseScales = new Map<THREE.Object3D, THREE.Vector3>();
  const materialAppearances = new Map<THREE.Material, MaterialAppearance>();
  const swayingObjects: THREE.Object3D[] = [];
  const pulsingObjects: THREE.Object3D[] = [];
  const rotatingObjects: THREE.Object3D[] = [];
  const driftingClouds: THREE.Object3D[] = [];
  const fireflies: THREE.Object3D[] = [];
  const flyActors: THREE.Group[] = [];
  const wingPairs: WingPair[] = [];
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
  const physical = (parameters: THREE.MeshPhysicalMaterialParameters) => {
    const material = new THREE.MeshPhysicalMaterial(parameters);
    materials.add(material);
    return material;
  };
  const basic = (parameters: THREE.MeshBasicMaterialParameters) => {
    const material = new THREE.MeshBasicMaterial(parameters);
    materials.add(material);
    return material;
  };
  const lineMaterial = (parameters: THREE.LineBasicMaterialParameters) => {
    const material = new THREE.LineBasicMaterial(parameters);
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
  const rememberMaterial = (material: THREE.Material) => {
    if (materialAppearances.has(material)) return;
    const lit = material as THREE.MeshStandardMaterial;
    materialAppearances.set(material, {
      color: "color" in lit ? lit.color.clone() : undefined,
      emissive: "emissive" in lit ? lit.emissive.clone() : undefined,
      emissiveIntensity:
        "emissiveIntensity" in lit ? lit.emissiveIntensity : undefined,
      opacity: material.opacity,
      transparent: material.transparent,
      depthWrite: material.depthWrite,
    });
  };
  const addInteractive = (id: string, object: THREE.Object3D) => {
    object.name = id;
    object.userData.interactionId = id;
    object.userData.choiceId = id;
    object.userData.choiceState = "idle" satisfies SuperSensesSightChoiceState;
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.Points))
        return;
      const childMaterials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      childMaterials.forEach(rememberMaterial);
    });
    interactiveTargets.set(id, object);
    interactableSet.add(object);
    targetBaseScales.set(object, object.scale.clone());
    return object;
  };
  const makeHitVolume = (radius: number, name = "interaction-hit-volume") => {
    const hit = mesh(
      geometry(new THREE.SphereGeometry(radius, 12, 8)),
      basic({
        color: 0xffffff,
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
      }),
      name,
    );
    hit.castShadow = false;
    hit.receiveShadow = false;
    hit.renderOrder = -1;
    return hit;
  };
  const makeHighlight = (radius: number, groundFacing = false) => {
    const highlight = mesh(
      geometry(new THREE.TorusGeometry(radius, 0.035, 8, 36)),
      basic({
        color: 0xffd75a,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
      "interaction-highlight",
    );
    if (groundFacing) highlight.rotation.x = Math.PI / 2;
    highlight.visible = false;
    highlight.castShadow = false;
    highlight.receiveShadow = false;
    return highlight;
  };
  const makeCylinderBetween = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    radius: number,
    material: THREE.Material,
    name: string,
  ) => {
    const direction = to.clone().sub(from);
    const result = mesh(
      geometry(
        new THREE.CylinderGeometry(radius, radius, direction.length(), 10),
      ),
      material,
      name,
    );
    result.position.copy(from).add(to).multiplyScalar(0.5);
    result.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    return result;
  };

  const root = group("super-senses-sight-academy");
  scene.add(root);

  const missionGroups = [
    group("mission-1-eagle-calibration-alpine-summit"),
    group("mission-2-eagle-valley-scan"),
    group("mission-3-night-forest-clue-scan"),
    group("mission-4-chameleon-fly-tracking"),
  ] as const;
  root.add(...missionGroups);

  const previousBackground = scene.background;
  const previousFog = scene.fog;
  const sceneBackgrounds = [
    new THREE.Color(0x87bde0),
    new THREE.Color(0xa6cee1),
    new THREE.Color(0x071226),
    new THREE.Color(0x8ab6a2),
  ] as const;
  const worldFog = new THREE.Fog(sceneBackgrounds[0], 12, 38);
  scene.background = sceneBackgrounds[0];
  scene.fog = worldFog;

  const hemisphere = new THREE.HemisphereLight(0xeaf8ff, 0x33492d, 1.75);
  hemisphere.name = "vision-world-ambient-light";
  const keyLight = new THREE.DirectionalLight(0xfff2cf, 2.65);
  keyLight.name = "vision-world-sun-and-moon";
  keyLight.position.set(-5, 9, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 30;
  scene.add(hemisphere, keyLight);

  const makeTerrain = (
    parent: THREE.Group,
    color: number,
    radius = 8,
    height = 0.28,
  ) => {
    const terrain = mesh(
      geometry(new THREE.CylinderGeometry(radius, radius * 1.04, height, 64)),
      standard({ color, roughness: 0.96, metalness: 0 }),
      "walkable-terrain",
    );
    terrain.position.y = -height / 2;
    parent.add(terrain);
    return terrain;
  };

  const makeRock = (
    parent: THREE.Group,
    position: THREE.Vector3,
    scale: THREE.Vector3,
    color = 0x778087,
    name = "weathered-rock",
  ) => {
    const rock = mesh(
      geometry(new THREE.DodecahedronGeometry(0.58, 1)),
      standard({ color, roughness: 0.98, flatShading: true }),
      name,
    );
    rock.position.copy(position);
    rock.scale.copy(scale);
    rock.rotation.set(0.12, position.x * 0.18, -0.08);
    parent.add(rock);
    return rock;
  };

  const makePine = (
    parent: THREE.Group,
    x: number,
    z: number,
    scale = 1,
    night = false,
  ) => {
    const pine = group(night ? "moonlit-pine" : "valley-pine");
    const trunk = mesh(
      geometry(new THREE.CylinderGeometry(0.1, 0.17, 1.75, 9)),
      standard({ color: night ? 0x362f39 : 0x5a3d26, roughness: 0.95 }),
      "pine-trunk",
    );
    trunk.position.y = 0.86;
    pine.add(trunk);
    const needleMaterial = standard({
      color: night ? 0x102f31 : 0x285d3b,
      roughness: 0.93,
      emissive: night ? 0x07151e : 0x000000,
      emissiveIntensity: night ? 0.25 : 0,
    });
    for (let index = 0; index < 4; index += 1) {
      const needles = mesh(
        geometry(
          new THREE.ConeGeometry(0.72 - index * 0.105, 1.12, 11, 1, false),
        ),
        needleMaterial,
        "pine-needle-tier",
      );
      needles.position.y = 1.05 + index * 0.43;
      pine.add(needles);
    }
    pine.position.set(x, 0, z);
    pine.scale.setScalar(scale);
    parent.add(pine);
    swayingObjects.push(pine);
    pine.userData.swayPhase = x * 0.7 + z * 0.4;
    return pine;
  };

  const makeBush = (
    parent: THREE.Group,
    position: THREE.Vector3,
    color: number,
    name = "leafy-bush",
  ) => {
    const bush = group(name);
    const foliageMaterial = standard({ color, roughness: 0.92 });
    const berryMaterial = standard({
      color: 0xb84338,
      roughness: 0.65,
      emissive: 0x260402,
      emissiveIntensity: 0.18,
    });
    for (const [x, y, z, scale] of [
      [-0.3, 0.27, 0, 0.48],
      [0.08, 0.35, -0.08, 0.56],
      [0.42, 0.25, 0.02, 0.43],
      [0, 0.23, 0.3, 0.42],
    ] as const) {
      const leaves = mesh(
        geometry(new THREE.IcosahedronGeometry(scale, 1)),
        foliageMaterial,
        "bush-leaves",
      );
      leaves.position.set(x, y, z);
      bush.add(leaves);
    }
    for (let index = 0; index < 5; index += 1) {
      const berry = mesh(
        geometry(new THREE.SphereGeometry(0.045, 8, 6)),
        berryMaterial,
        "bush-berry",
      );
      berry.position.set(
        -0.36 + index * 0.18,
        0.35 + (index % 2) * 0.18,
        0.42 - (index % 3) * 0.14,
      );
      bush.add(berry);
    }
    bush.position.copy(position);
    parent.add(bush);
    swayingObjects.push(bush);
    bush.userData.swayPhase = position.x * 0.5;
    return bush;
  };

  const makeGrassClump = (
    parent: THREE.Group,
    position: THREE.Vector3,
    color = 0x4f8c45,
    name = "grass-clump",
  ) => {
    const grass = group(name);
    const bladeMaterial = standard({
      color,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    for (let index = 0; index < 15; index += 1) {
      const blade = mesh(
        geometry(new THREE.ConeGeometry(0.045, 0.55 + (index % 4) * 0.08, 5)),
        bladeMaterial,
        "grass-blade",
      );
      const angle = index * 2.39996;
      const radius = 0.07 + (index % 5) * 0.06;
      blade.position.set(
        Math.cos(angle) * radius,
        0.25 + (index % 4) * 0.035,
        Math.sin(angle) * radius,
      );
      blade.rotation.z = Math.cos(angle) * 0.14;
      grass.add(blade);
    }
    grass.position.copy(position);
    parent.add(grass);
    swayingObjects.push(grass);
    grass.userData.swayPhase = position.x * 0.8 + position.z;
    return grass;
  };

  const makeEagle = (name: string, flying: boolean) => {
    const eagle = group(name);
    const bodyMaterial = standard({ color: 0x4a2e1e, roughness: 0.88 });
    const darkFeatherMaterial = standard({ color: 0x2c201b, roughness: 0.9 });
    const whiteFeatherMaterial = standard({ color: 0xe6e0d1, roughness: 0.82 });
    const beakMaterial = standard({ color: 0xd6a624, roughness: 0.6 });
    const body = mesh(
      geometry(new THREE.SphereGeometry(0.36, 18, 12)),
      bodyMaterial,
      "eagle-body",
    );
    body.scale.set(0.82, 1.3, 0.72);
    body.rotation.x = flying ? Math.PI / 2 : 0;
    eagle.add(body);
    const head = mesh(
      geometry(new THREE.SphereGeometry(0.23, 16, 10)),
      whiteFeatherMaterial,
      "eagle-white-head",
    );
    head.position.set(0, flying ? 0.05 : 0.47, flying ? -0.42 : -0.05);
    eagle.add(head);
    const beak = mesh(
      geometry(new THREE.ConeGeometry(0.09, 0.28, 9)),
      beakMaterial,
      "eagle-hooked-beak",
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, flying ? 0.04 : 0.45, flying ? -0.67 : -0.27);
    eagle.add(beak);
    const eyeMaterial = standard({
      color: 0xe3bc34,
      emissive: 0x5e3e00,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    for (const side of [-1, 1]) {
      const eye = mesh(
        geometry(new THREE.SphereGeometry(0.027, 8, 6)),
        eyeMaterial,
        "eagle-eye",
      );
      eye.position.set(
        side * 0.17,
        flying ? 0.08 : 0.52,
        flying ? -0.55 : -0.18,
      );
      eagle.add(eye);
    }
    const leftWing = group("eagle-left-wing");
    const rightWing = group("eagle-right-wing");
    for (let index = 0; index < 5; index += 1) {
      const leftFeather = mesh(
        geometry(new THREE.CapsuleGeometry(0.09, 0.55 + index * 0.06, 5, 8)),
        index > 2 ? darkFeatherMaterial : bodyMaterial,
        "eagle-flight-feather",
      );
      leftFeather.rotation.z = Math.PI / 2 - 0.15 + index * 0.04;
      leftFeather.position.set(0.32 + index * 0.16, 0, index * 0.025);
      leftWing.add(leftFeather);
      const rightFeather = leftFeather.clone();
      rightFeather.position.x *= -1;
      rightFeather.rotation.z *= -1;
      rightWing.add(rightFeather);
    }
    leftWing.position.set(-0.06, 0.12, 0);
    rightWing.position.set(0.06, 0.12, 0);
    eagle.add(leftWing, rightWing);
    wingPairs.push({
      left: leftWing,
      right: rightWing,
      speed: flying ? 2.2 : 0.8,
      amplitude: flying ? 0.18 : 0.025,
      restingAngle: flying ? 0 : 0.25,
    });
    return eagle;
  };

  // Mission 1: a high-acuity calibration target on an alpine summit.
  const calibrationWorld = missionGroups[0];
  makeTerrain(calibrationWorld, 0x808b81, 7.8, 0.36);
  const summitStoneMaterial = standard({
    color: 0x737c7c,
    roughness: 0.98,
    flatShading: true,
  });
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const radius = 4.5 + (index % 3) * 1.05;
    const rock = mesh(
      geometry(new THREE.DodecahedronGeometry(0.55 + (index % 4) * 0.16, 0)),
      summitStoneMaterial,
      "summit-scree",
    );
    rock.position.set(
      Math.cos(angle) * radius,
      0.05 + (index % 2) * 0.08,
      Math.sin(angle) * radius,
    );
    rock.scale.y = 0.62;
    calibrationWorld.add(rock);
  }
  const snowMaterial = standard({ color: 0xeaf2f4, roughness: 0.9 });
  const mountainMaterial = standard({
    color: 0x7c8993,
    roughness: 0.98,
    flatShading: true,
  });
  for (let index = 0; index < 9; index += 1) {
    const angle = -1.2 + index * 0.3;
    const distance = 10.5 + (index % 3) * 1.5;
    const height = 4.2 + (index % 4) * 0.75;
    const mountain = mesh(
      geometry(new THREE.ConeGeometry(2.2 + (index % 2) * 0.6, height, 7)),
      mountainMaterial,
      "distant-alpine-peak",
    );
    mountain.position.set(
      Math.sin(angle) * distance,
      height / 2 - 0.15,
      -Math.cos(angle) * distance,
    );
    mountain.rotation.y = angle * 0.33;
    calibrationWorld.add(mountain);
    const snowCap = mesh(
      geometry(new THREE.ConeGeometry(0.79, height * 0.27, 7)),
      snowMaterial,
      "snow-cap",
    );
    snowCap.position.copy(mountain.position);
    snowCap.position.y += height * 0.37;
    snowCap.rotation.y = mountain.rotation.y;
    calibrationWorld.add(snowCap);
  }
  const summitEagle = makeEagle("calibration-eagle", false);
  summitEagle.position.set(-2.3, 1.12, -0.35);
  summitEagle.rotation.y = 0.55;
  summitEagle.scale.setScalar(1.22);
  calibrationWorld.add(summitEagle);
  makeRock(
    calibrationWorld,
    new THREE.Vector3(-2.3, 0.48, -0.3),
    new THREE.Vector3(1.45, 0.78, 1.15),
    0x667079,
    "eagle-lookout-rock",
  );

  const calibrationTarget = group("eagle-calibration");
  const calibrationPanel = mesh(
    geometry(new THREE.CircleGeometry(0.9, 48)),
    physical({
      color: 0xe9eef0,
      roughness: 0.48,
      metalness: 0.06,
      clearcoat: 0.22,
      side: THREE.DoubleSide,
    }),
    "high-acuity-calibration-panel",
  );
  calibrationTarget.add(calibrationPanel);
  const reticleMaterial = basic({ color: 0x18283a, side: THREE.DoubleSide });
  const calibrationFineBars: THREE.Object3D[] = [];
  for (let ring = 0; ring < 4; ring += 1) {
    const reticleRing = mesh(
      geometry(new THREE.TorusGeometry(0.18 + ring * 0.17, 0.018, 6, 36)),
      reticleMaterial,
      "acuity-ring",
    );
    reticleRing.position.z = 0.012;
    calibrationTarget.add(reticleRing);
  }
  for (let index = 0; index < 12; index += 1) {
    const fineBar = mesh(
      geometry(
        new THREE.BoxGeometry(
          0.38 - Math.floor(index / 4) * 0.08,
          0.025 - Math.floor(index / 4) * 0.004,
          0.018,
        ),
      ),
      reticleMaterial,
      "progressively-fine-detail-bar",
    );
    fineBar.position.set(
      ((index % 4) - 1.5) * 0.18,
      0.22 - Math.floor(index / 4) * 0.2,
      0.025,
    );
    fineBar.rotation.z = index % 2 === 0 ? 0 : Math.PI / 2;
    calibrationTarget.add(fineBar);
    calibrationFineBars.push(fineBar);
  }
  const calibrationHalo = makeHighlight(1.03);
  calibrationTarget.add(calibrationHalo, makeHitVolume(1.02));
  calibrationTarget.position.set(0.65, 1.72, -3.15);
  calibrationTarget.rotation.y = -0.08;
  calibrationWorld.add(calibrationTarget);
  addInteractive("eagle-calibration", calibrationTarget);
  pulsingObjects.push(calibrationHalo);
  rotatingObjects.push(calibrationHalo);

  const mountainCalibration = group("mountain-calibration");
  const mountainSymbol = mesh(
    geometry(new THREE.ConeGeometry(0.54, 0.88, 3)),
    standard({ color: 0x8997a3, roughness: 0.86 }),
    "mountain-calibration-symbol",
  );
  mountainSymbol.position.y = 0.08;
  mountainCalibration.add(
    mountainSymbol,
    makeHitVolume(0.72),
    makeHighlight(0.66),
  );
  mountainCalibration.position.set(-1.35, 1.68, -3.05);
  calibrationWorld.add(mountainCalibration);
  addInteractive("mountain-calibration", mountainCalibration);

  const cloudCalibration = group("cloud-calibration");
  const cloudSymbolMaterial = standard({
    color: 0xf1f6f8,
    roughness: 0.98,
  });
  for (const [x, y, size] of [
    [-0.27, 0, 0.28],
    [0.05, 0.1, 0.37],
    [0.34, -0.01, 0.26],
  ] as const) {
    const puff = mesh(
      geometry(new THREE.SphereGeometry(size, 12, 8)),
      cloudSymbolMaterial,
      "cloud-calibration-puff",
    );
    puff.position.set(x, y, 0);
    cloudCalibration.add(puff);
  }
  cloudCalibration.add(makeHitVolume(0.72), makeHighlight(0.66));
  cloudCalibration.position.set(2.45, 1.7, -3.06);
  calibrationWorld.add(cloudCalibration);
  addInteractive("cloud-calibration", cloudCalibration);

  for (let index = 0; index < 5; index += 1) {
    const cloud = group("alpine-cloud");
    const cloudMaterial = standard({
      color: 0xf3f7f8,
      transparent: true,
      opacity: 0.76,
      roughness: 1,
    });
    for (let puff = 0; puff < 4; puff += 1) {
      const cloudPuff = mesh(
        geometry(new THREE.SphereGeometry(0.42 + puff * 0.06, 12, 8)),
        cloudMaterial,
        "cloud-puff",
      );
      cloudPuff.position.set((puff - 1.5) * 0.45, Math.sin(puff) * 0.12, 0);
      cloud.add(cloudPuff);
    }
    cloud.position.set(-7 + index * 3.1, 5.3 + (index % 2) * 0.55, -8 - index);
    cloud.userData.baseX = cloud.position.x;
    cloud.userData.span = 14 + index;
    calibrationWorld.add(cloud);
    driftingClouds.push(cloud);
  }

  // Mission 2: scan natural cover in a broad alpine valley, then reveal a mouse.
  const valleyWorld = missionGroups[1];
  makeTerrain(valleyWorld, 0x638451, 8.3, 0.32);
  const stream = mesh(
    geometry(new THREE.PlaneGeometry(1.05, 15, 1, 16)),
    physical({
      color: 0x62a9c7,
      roughness: 0.24,
      metalness: 0.05,
      transparent: true,
      opacity: 0.83,
      clearcoat: 0.65,
      side: THREE.DoubleSide,
    }),
    "valley-stream",
  );
  stream.rotation.x = -Math.PI / 2;
  stream.rotation.z = -0.17;
  stream.position.set(-1.1, 0.012, -1.2);
  valleyWorld.add(stream);
  for (const [x, z, scale] of [
    [-5.5, -4.8, 1.2],
    [-4.2, -2.8, 0.92],
    [4.9, -4.2, 1.18],
    [5.8, -1.8, 0.82],
    [-5.7, 1.2, 0.74],
    [5.6, 1.4, 0.78],
  ] as const) {
    makePine(valleyWorld, x, z, scale);
  }

  const valleyRock = group("valley-rock");
  makeRock(
    valleyRock,
    new THREE.Vector3(0, 0.3, 0),
    new THREE.Vector3(1.25, 0.78, 1.02),
    0x6f7673,
    "lichen-covered-rock",
  );
  const lichenMaterial = standard({ color: 0x9aa66a, roughness: 0.96 });
  for (let index = 0; index < 5; index += 1) {
    const lichen = mesh(
      geometry(new THREE.CircleGeometry(0.08 + (index % 2) * 0.035, 10)),
      lichenMaterial,
      "rock-lichen",
    );
    lichen.rotation.x = -Math.PI / 2;
    lichen.position.set(-0.35 + index * 0.16, 0.77, 0.05 + (index % 2) * 0.13);
    valleyRock.add(lichen);
  }
  valleyRock.add(makeHitVolume(0.9), makeHighlight(0.78, true));
  valleyRock.position.set(-2.55, 0, -1.1);
  valleyWorld.add(valleyRock);
  addInteractive("valley-rock", valleyRock);

  const valleyBush = makeBush(
    valleyWorld,
    new THREE.Vector3(0.05, 0, -2.25),
    0x37733f,
    "valley-bush",
  );
  valleyBush.add(makeHitVolume(0.8), makeHighlight(0.72, true));
  addInteractive("valley-bush", valleyBush);

  const valleyGrass = makeGrassClump(
    valleyWorld,
    new THREE.Vector3(2.25, 0, -1.25),
    0x6b9a42,
    "valley-grass",
  );
  valleyGrass.scale.setScalar(1.2);
  valleyGrass.add(makeHitVolume(0.72), makeHighlight(0.63, true));
  addInteractive("valley-grass", valleyGrass);

  const fieldMouse = group("field-mouse");
  const mouseFur = standard({ color: 0x8e7868, roughness: 0.94 });
  const mouseBelly = standard({ color: 0xc8b5a1, roughness: 0.92 });
  const mouseBody = mesh(
    geometry(new THREE.SphereGeometry(0.2, 16, 10)),
    mouseFur,
    "field-mouse-body",
  );
  mouseBody.scale.set(1.45, 0.8, 0.85);
  mouseBody.position.y = 0.2;
  fieldMouse.add(mouseBody);
  const mouseHead = mesh(
    geometry(new THREE.SphereGeometry(0.14, 14, 9)),
    mouseFur,
    "field-mouse-head",
  );
  mouseHead.position.set(0, 0.26, -0.24);
  fieldMouse.add(mouseHead);
  for (const side of [-1, 1]) {
    const ear = mesh(
      geometry(new THREE.CircleGeometry(0.072, 12)),
      mouseBelly,
      "mouse-ear",
    );
    ear.position.set(side * 0.095, 0.39, -0.2);
    ear.rotation.y = side * 0.24;
    fieldMouse.add(ear);
    const mouseEye = mesh(
      geometry(new THREE.SphereGeometry(0.023, 8, 6)),
      basic({ color: 0x111009 }),
      "mouse-eye",
    );
    mouseEye.position.set(side * 0.102, 0.3, -0.35);
    fieldMouse.add(mouseEye);
  }
  const mouseTailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.2, 0.2),
    new THREE.Vector3(0.18, 0.18, 0.42),
    new THREE.Vector3(0.42, 0.12, 0.46),
    new THREE.Vector3(0.55, 0.08, 0.28),
  ]);
  const mouseTail = mesh(
    geometry(new THREE.TubeGeometry(mouseTailCurve, 18, 0.018, 6, false)),
    standard({ color: 0xb98c80, roughness: 0.8 }),
    "mouse-tail",
  );
  fieldMouse.add(mouseTail, makeHitVolume(0.55), makeHighlight(0.48, true));
  fieldMouse.position.set(2.18, 0, -1.78);
  fieldMouse.rotation.y = -0.38;
  fieldMouse.visible = false;
  valleyWorld.add(fieldMouse);
  addInteractive("field-mouse", fieldMouse);
  pulsingObjects.push(fieldMouse);

  const flyingEagle = makeEagle("valley-scanning-eagle", true);
  flyingEagle.position.set(-0.4, 4.35, -3.65);
  flyingEagle.scale.setScalar(1.15);
  valleyWorld.add(flyingEagle);

  const valleyScanBeam = mesh(
    geometry(new THREE.ConeGeometry(1.28, 4.2, 32, 1, true)),
    basic({
      color: 0xf7df6c,
      transparent: true,
      opacity: 0.075,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    "eagle-scan-cone",
  );
  valleyScanBeam.position.set(-0.4, 2.25, -3.55);
  valleyScanBeam.rotation.z = Math.PI;
  valleyWorld.add(valleyScanBeam);

  // Mission 3: scan ordered landmarks, then use eyeshine to locate a lemur.
  const nightWorld = missionGroups[2];
  makeTerrain(nightWorld, 0x172a24, 8.1, 0.34);
  for (const [x, z, scale] of [
    [-5.4, -3.8, 1.2],
    [-3.8, -5.4, 1.08],
    [4.7, -4.4, 1.28],
    [5.7, -1.5, 0.96],
    [-5.8, 1, 0.88],
    [3.9, 1.9, 0.76],
  ] as const) {
    makePine(nightWorld, x, z, scale, true);
  }
  const nightLeftBush = makeBush(
    nightWorld,
    new THREE.Vector3(-2.35, 0, -1.1),
    0x214a3d,
    "night-left-bush",
  );
  nightLeftBush.scale.setScalar(1.15);
  nightLeftBush.add(makeHitVolume(0.9), makeHighlight(0.77, true));
  addInteractive("night-left-bush", nightLeftBush);

  const nightRightTree = group("night-right-tree");
  const rightTrunk = mesh(
    geometry(new THREE.CylinderGeometry(0.25, 0.38, 3.8, 11)),
    standard({ color: 0x403744, roughness: 0.96 }),
    "night-landmark-trunk",
  );
  rightTrunk.position.y = 1.88;
  nightRightTree.add(rightTrunk);
  const branchMaterial = standard({ color: 0x403744, roughness: 0.96 });
  nightRightTree.add(
    makeCylinderBetween(
      new THREE.Vector3(0, 2.6, 0),
      new THREE.Vector3(-0.9, 3.15, -0.1),
      0.12,
      branchMaterial,
      "night-tree-branch",
    ),
    makeCylinderBetween(
      new THREE.Vector3(0.02, 2.25, 0),
      new THREE.Vector3(0.82, 2.72, -0.18),
      0.1,
      branchMaterial,
      "night-tree-branch",
    ),
  );
  const rightCanopyMaterial = standard({
    color: 0x153d35,
    roughness: 0.94,
    emissive: 0x061317,
    emissiveIntensity: 0.25,
  });
  for (const [x, y, z, scale] of [
    [-0.65, 3.25, 0, 0.85],
    [0, 3.55, -0.1, 0.95],
    [0.7, 3.1, 0, 0.82],
  ] as const) {
    const crown = mesh(
      geometry(new THREE.IcosahedronGeometry(scale, 1)),
      rightCanopyMaterial,
      "night-tree-canopy",
    );
    crown.position.set(x, y, z);
    nightRightTree.add(crown);
  }
  nightRightTree.add(makeHitVolume(1.15), makeHighlight(0.94));
  nightRightTree.position.set(2.45, 0, -1.9);
  nightWorld.add(nightRightTree);
  addInteractive("night-right-tree", nightRightTree);

  const reflectiveEyes = group("night-eyes");
  const eyeshineMaterial = standard({
    color: 0xcff87c,
    emissive: 0x9df53f,
    emissiveIntensity: 2.4,
    roughness: 0.15,
  });
  for (const side of [-1, 1]) {
    const eye = mesh(
      geometry(new THREE.SphereGeometry(0.085, 12, 8)),
      eyeshineMaterial,
      "reflective-eye-clue",
    );
    eye.position.x = side * 0.16;
    reflectiveEyes.add(eye);
  }
  const eyeHalo = makeHighlight(0.38);
  reflectiveEyes.add(eyeHalo, makeHitVolume(0.48));
  reflectiveEyes.position.set(0.4, 1.68, -3.25);
  reflectiveEyes.visible = false;
  nightWorld.add(reflectiveEyes);
  addInteractive("night-eyes", reflectiveEyes);
  pulsingObjects.push(reflectiveEyes);

  const lemur = group("lemur");
  const lemurFur = standard({ color: 0x817568, roughness: 0.94 });
  const lemurFace = standard({ color: 0xc8baa4, roughness: 0.9 });
  const lemurBody = mesh(
    geometry(new THREE.SphereGeometry(0.32, 16, 11)),
    lemurFur,
    "nocturnal-lemur-body",
  );
  lemurBody.scale.set(0.78, 1.35, 0.78);
  lemur.add(lemurBody);
  const lemurHead = mesh(
    geometry(new THREE.SphereGeometry(0.27, 16, 11)),
    lemurFace,
    "nocturnal-lemur-head",
  );
  lemurHead.position.set(0, 0.48, -0.08);
  lemur.add(lemurHead);
  for (const side of [-1, 1]) {
    const ear = mesh(
      geometry(new THREE.CircleGeometry(0.13, 14)),
      lemurFur,
      "lemur-ear",
    );
    ear.position.set(side * 0.24, 0.55, -0.06);
    ear.rotation.y = side * 0.28;
    lemur.add(ear);
    const eyePatch = mesh(
      geometry(new THREE.CircleGeometry(0.092, 16)),
      basic({ color: 0x2b2628 }),
      "lemur-eye-mask",
    );
    eyePatch.position.set(side * 0.105, 0.5, -0.305);
    lemur.add(eyePatch);
    const eye = mesh(
      geometry(new THREE.SphereGeometry(0.046, 10, 7)),
      standard({
        color: 0xd8ee72,
        emissive: 0x6ba52c,
        emissiveIntensity: 1.3,
        roughness: 0.2,
      }),
      "lemur-reflective-eye",
    );
    eye.position.set(side * 0.105, 0.5, -0.32);
    lemur.add(eye);
  }
  const lemurTailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.05, 0.22),
    new THREE.Vector3(0.45, 0.18, 0.38),
    new THREE.Vector3(0.65, 0.58, 0.22),
    new THREE.Vector3(0.38, 0.9, 0.05),
    new THREE.Vector3(0.08, 0.72, 0),
  ]);
  const lemurTail = mesh(
    geometry(new THREE.TubeGeometry(lemurTailCurve, 28, 0.075, 8, false)),
    lemurFur,
    "lemur-curled-tail",
  );
  lemur.add(lemurTail, makeHitVolume(0.72), makeHighlight(0.62));
  lemur.position.set(0.4, 1.26, -3.1);
  lemur.visible = false;
  nightWorld.add(lemur);
  addInteractive("lemur", lemur);
  pulsingObjects.push(lemur);

  const moon = mesh(
    geometry(new THREE.SphereGeometry(0.62, 24, 16)),
    basic({ color: 0xdce8ff }),
    "forest-moon",
  );
  moon.position.set(-4.5, 5.4, -7.5);
  nightWorld.add(moon);
  for (let index = 0; index < 20; index += 1) {
    const firefly = mesh(
      geometry(new THREE.SphereGeometry(0.022, 7, 5)),
      basic({ color: 0xd7ff72 }),
      "forest-firefly",
    );
    firefly.position.set(
      -4.5 + (index % 8) * 1.25,
      0.4 + (index % 5) * 0.48,
      -4.8 + ((index * 3) % 9) * 0.55,
    );
    firefly.userData.baseY = firefly.position.y;
    firefly.userData.phase = index * 0.73;
    nightWorld.add(firefly);
    fireflies.push(firefly);
  }

  // Mission 4: four flies surround a branch while chameleon eyes track them.
  const chameleonWorld = missionGroups[3];
  makeTerrain(chameleonWorld, 0x456b42, 8.1, 0.34);
  for (const [x, z, scale] of [
    [-5.5, -3.8, 1.05],
    [-4.5, 1.7, 0.84],
    [4.8, -4.4, 1.12],
    [5.6, 1.2, 0.9],
  ] as const) {
    makePine(chameleonWorld, x, z, scale);
  }
  for (const [x, z, color] of [
    [-3.2, -1.7, 0x3e7846],
    [3.6, -2.2, 0x4b7e45],
    [-2.8, 1.2, 0x397640],
    [3.2, 1.6, 0x4d8448],
  ] as const) {
    makeBush(chameleonWorld, new THREE.Vector3(x, 0, z), color);
  }
  const branch = makeCylinderBetween(
    new THREE.Vector3(-2.3, 1.05, 0.25),
    new THREE.Vector3(2.25, 1.22, -0.2),
    0.19,
    standard({ color: 0x5c3d25, roughness: 0.96 }),
    "chameleon-perch-branch",
  );
  chameleonWorld.add(branch);
  chameleonWorld.add(
    makeCylinderBetween(
      new THREE.Vector3(-0.7, 1.12, 0.1),
      new THREE.Vector3(-1.55, 2.05, -0.15),
      0.105,
      standard({ color: 0x5c3d25, roughness: 0.96 }),
      "perch-side-branch",
    ),
  );

  const chameleon = group("tracking-chameleon");
  const chameleonSkin = standard({
    color: 0x62a849,
    roughness: 0.78,
    emissive: 0x0e2910,
    emissiveIntensity: 0.15,
  });
  const chameleonAccent = standard({ color: 0xd0b847, roughness: 0.8 });
  const chameleonBody = mesh(
    geometry(new THREE.SphereGeometry(0.43, 20, 13)),
    chameleonSkin,
    "chameleon-body",
  );
  chameleonBody.scale.set(1.55, 0.8, 0.72);
  chameleon.add(chameleonBody);
  const chameleonHead = mesh(
    geometry(new THREE.ConeGeometry(0.35, 0.58, 6)),
    chameleonSkin,
    "chameleon-head",
  );
  chameleonHead.rotation.x = -Math.PI / 2;
  chameleonHead.position.set(0, 0.08, -0.67);
  chameleon.add(chameleonHead);
  const dorsalMaterial = standard({ color: 0xe1c851, roughness: 0.78 });
  for (let index = 0; index < 7; index += 1) {
    const crest = mesh(
      geometry(new THREE.ConeGeometry(0.055, 0.18, 5)),
      dorsalMaterial,
      "chameleon-dorsal-crest",
    );
    crest.position.set(-0.45 + index * 0.15, 0.39, 0.01);
    chameleon.add(crest);
  }
  const chameleonEyes: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const eyeTurret = group("independent-chameleon-eye");
    const turret = mesh(
      geometry(new THREE.SphereGeometry(0.135, 12, 8)),
      chameleonAccent,
      "chameleon-eye-turret",
    );
    const pupil = mesh(
      geometry(new THREE.SphereGeometry(0.044, 9, 6)),
      basic({ color: 0x101510 }),
      "chameleon-pupil",
    );
    pupil.position.z = -0.12;
    eyeTurret.add(turret, pupil);
    eyeTurret.position.set(side * 0.22, 0.22, -0.76);
    chameleon.add(eyeTurret);
    chameleonEyes.push(eyeTurret);
  }
  const chameleonTailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.34),
    new THREE.Vector3(0.55, 0.05, 0.55),
    new THREE.Vector3(0.85, 0.22, 0.25),
    new THREE.Vector3(0.72, 0.34, -0.05),
    new THREE.Vector3(0.48, 0.26, 0.02),
  ]);
  const chameleonTail = mesh(
    geometry(new THREE.TubeGeometry(chameleonTailCurve, 32, 0.09, 9, false)),
    chameleonSkin,
    "chameleon-coiled-tail",
  );
  chameleon.add(chameleonTail);
  chameleon.position.set(0, 1.43, 0);
  chameleon.rotation.y = 0.05;
  chameleonWorld.add(chameleon);

  const makeFly = (id: string, position: THREE.Vector3) => {
    const fly = group(id);
    const flyBodyMaterial = standard({
      color: 0x26332d,
      roughness: 0.48,
      metalness: 0.22,
      emissive: 0x07110c,
      emissiveIntensity: 0.28,
    });
    const flyBody = mesh(
      geometry(new THREE.SphereGeometry(0.11, 12, 8)),
      flyBodyMaterial,
      "fly-body",
    );
    flyBody.scale.set(0.75, 0.75, 1.35);
    fly.add(flyBody);
    const flyEyeMaterial = standard({
      color: 0x9d302b,
      roughness: 0.32,
      emissive: 0x3b0705,
      emissiveIntensity: 0.45,
    });
    for (const side of [-1, 1]) {
      const flyEye = mesh(
        geometry(new THREE.SphereGeometry(0.048, 8, 6)),
        flyEyeMaterial,
        "fly-compound-eye",
      );
      flyEye.position.set(side * 0.075, 0.02, -0.1);
      fly.add(flyEye);
    }
    const wingMaterial = physical({
      color: 0xd9edf1,
      transparent: true,
      opacity: 0.58,
      roughness: 0.22,
      transmission: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const leftWing = mesh(
      geometry(new THREE.CircleGeometry(0.18, 14)),
      wingMaterial,
      "fly-left-wing",
    );
    leftWing.scale.set(0.6, 1.35, 1);
    leftWing.position.set(-0.13, 0.08, 0.02);
    leftWing.rotation.y = -0.5;
    const rightWing = leftWing.clone();
    rightWing.name = "fly-right-wing";
    rightWing.position.x *= -1;
    rightWing.rotation.y *= -1;
    fly.add(leftWing, rightWing);
    fly.position.copy(position);
    fly.userData.basePosition = position.clone();
    fly.userData.phase = flyActors.length * 1.41;
    const highlight = makeHighlight(0.31);
    fly.add(highlight, makeHitVolume(0.36));
    chameleonWorld.add(fly);
    addInteractive(id, fly);
    flyActors.push(fly);
    wingPairs.push({
      left: leftWing,
      right: rightWing,
      speed: 17,
      amplitude: 0.58,
      restingAngle: 0.25,
    });
    return fly;
  };

  makeFly("fly-left", new THREE.Vector3(-2.25, 1.85, -0.45));
  makeFly("fly-rear", new THREE.Vector3(0.55, 2.15, 1.65));
  makeFly("fly-right", new THREE.Vector3(2.25, 1.72, -0.6));
  makeFly("fly-front", new THREE.Vector3(0, 1.48, -2.28));

  const tongueMaterial = standard({
    color: 0xe58e93,
    emissive: 0x401014,
    emissiveIntensity: 0.18,
    roughness: 0.76,
  });
  const tongue = makeCylinderBetween(
    new THREE.Vector3(0, 1.52, -0.58),
    new THREE.Vector3(0, 1.48, -2.28),
    0.035,
    tongueMaterial,
    "chameleon-tongue",
  );
  tongue.visible = false;
  chameleonWorld.add(tongue);

  // The finale lives in mission four so the root retains exactly four missions.
  const celebration = group("sight-academy-celebration");
  chameleonWorld.add(celebration);
  const recapPortal = group("sight-recap-portal");
  const portalOuter = mesh(
    geometry(new THREE.TorusGeometry(1.35, 0.11, 12, 64)),
    standard({
      color: 0x6ce2ff,
      emissive: 0x1974a4,
      emissiveIntensity: 1.2,
      roughness: 0.32,
      metalness: 0.16,
    }),
    "recap-portal-ring",
  );
  recapPortal.add(portalOuter);
  recapPortal.position.set(0, 1.75, -3.75);
  recapPortal.visible = false;
  celebration.add(recapPortal);
  rotatingObjects.push(portalOuter);

  const graduation = group("sight-graduation-emblem");
  const graduationShield = mesh(
    geometry(new THREE.CircleGeometry(0.78, 6)),
    standard({
      color: 0x194f73,
      emissive: 0x09253d,
      emissiveIntensity: 0.5,
      roughness: 0.42,
      metalness: 0.28,
    }),
    "graduation-shield",
  );
  const graduationEye = mesh(
    geometry(new THREE.TorusGeometry(0.31, 0.07, 10, 36)),
    basic({ color: 0xffdc62 }),
    "graduation-eye-symbol",
  );
  graduationEye.scale.y = 0.58;
  graduationEye.position.z = 0.025;
  graduation.add(graduationShield, graduationEye);
  graduation.position.set(0, 2.0, -3.4);
  graduation.visible = false;
  celebration.add(graduation);
  pulsingObjects.push(graduation);

  const fireworks = group("sight-fireworks");
  const fireworkColors = [0x6ce2ff, 0xffd75a, 0xff718d, 0xa787ff];
  for (let burst = 0; burst < 4; burst += 1) {
    const burstGroup = group("firework-burst");
    burstGroup.position.set(-3.3 + burst * 2.2, 3.4 + (burst % 2) * 0.75, -3.7);
    for (let ray = 0; ray < 12; ray += 1) {
      const spark = mesh(
        geometry(new THREE.SphereGeometry(0.047, 7, 5)),
        basic({ color: fireworkColors[burst] }),
        "firework-spark",
      );
      const angle = (ray / 12) * Math.PI * 2;
      spark.position.set(Math.cos(angle) * 0.68, Math.sin(angle) * 0.68, 0);
      spark.userData.basePosition = spark.position.clone();
      spark.userData.phase = ray / 12;
      burstGroup.add(spark);
    }
    fireworks.add(burstGroup);
  }
  fireworks.visible = false;
  celebration.add(fireworks);

  const feathersAndStars = group("sight-feathers-and-stars");
  for (let index = 0; index < 42; index += 1) {
    const isStar = index % 3 === 0;
    const particle = mesh(
      isStar
        ? geometry(new THREE.OctahedronGeometry(0.07, 0))
        : geometry(new THREE.CapsuleGeometry(0.025, 0.13, 3, 5)),
      basic({ color: isStar ? 0xffdf68 : 0xf5f1dc }),
      isStar ? "celebration-star" : "celebration-feather",
    );
    const angle = index * 2.39996;
    const radius = 0.9 + (index % 8) * 0.34;
    particle.position.set(
      Math.cos(angle) * radius,
      1.5 + (index % 9) * 0.35,
      Math.sin(angle) * radius - 0.7,
    );
    particle.userData.phase = (index % 13) / 13;
    particle.userData.startY = particle.position.y;
    feathersAndStars.add(particle);
  }
  feathersAndStars.visible = false;
  celebration.add(feathersAndStars);

  const badge = group("sight-academy-badge");
  const badgeDisc = mesh(
    geometry(new THREE.CylinderGeometry(0.62, 0.62, 0.11, 40)),
    physical({
      color: 0xf1c33c,
      roughness: 0.24,
      metalness: 0.72,
      clearcoat: 0.8,
    }),
    "super-sight-badge",
  );
  badgeDisc.rotation.x = Math.PI / 2;
  const badgePupil = mesh(
    geometry(new THREE.SphereGeometry(0.18, 16, 10)),
    basic({ color: 0x173f68 }),
    "badge-eye-pupil",
  );
  badgePupil.position.z = 0.09;
  badge.add(badgeDisc, badgePupil);
  badge.position.set(0, 2.0, -2.75);
  badge.visible = false;
  celebration.add(badge);
  pulsingObjects.push(badge);

  let activeMission: SuperSensesSightMission = 0;
  let progress = 0;
  let timelineSeconds = 0;
  const missionProgress = [0, 0, 0, 0];
  let isFrozen = false;
  let isCelebrating = false;
  let prefersReducedMotion = false;
  let disposed = false;
  let panoramaTexture: THREE.Texture | undefined;
  new THREE.TextureLoader().load(
    "/simulations/c5-ch01-a02-supersense-of-sights/environment.webp",
    (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      panoramaTexture = texture;
      scene.background = texture;
    },
    undefined,
    () => {
      // The procedural world and colour backdrop remain a complete offline fallback.
    },
  );

  const restoreMaterial = (material: THREE.Material) => {
    const appearance = materialAppearances.get(material);
    if (!appearance) return;
    material.opacity = appearance.opacity;
    material.transparent = appearance.transparent;
    material.depthWrite = appearance.depthWrite;
    const lit = material as THREE.MeshStandardMaterial;
    if (appearance.color && "color" in lit) lit.color.copy(appearance.color);
    if (appearance.emissive && "emissive" in lit)
      lit.emissive.copy(appearance.emissive);
    if (
      appearance.emissiveIntensity !== undefined &&
      "emissiveIntensity" in lit
    ) {
      lit.emissiveIntensity = appearance.emissiveIntensity;
    }
    material.needsUpdate = true;
  };

  const setChoice = (id: string, state: SuperSensesSightChoiceState) => {
    const target = interactiveTargets.get(id);
    if (!target) return;
    const visualState =
      state === "wrong" ? "incorrect" : state === "hint" ? "selected" : state;
    target.userData.choiceState = visualState;
    const baseScale =
      targetBaseScales.get(target) ?? new THREE.Vector3(1, 1, 1);
    const scale =
      visualState === "correct"
        ? 1.16
        : visualState === "incorrect"
          ? 0.92
          : visualState === "selected"
            ? 1.08
            : 1;
    target.scale.copy(baseScale).multiplyScalar(scale);
    target.traverse((child) => {
      if (child.name === "interaction-highlight") {
        child.visible = visualState !== "idle";
        const highlightMesh = child as THREE.Mesh;
        const highlightMaterials = Array.isArray(highlightMesh.material)
          ? highlightMesh.material
          : [highlightMesh.material];
        highlightMaterials.forEach((material) => {
          if (material instanceof THREE.MeshBasicMaterial) {
            material.color.set(
              visualState === "correct"
                ? 0x75f29a
                : visualState === "incorrect"
                  ? 0xff7168
                  : 0xffd75a,
            );
          }
        });
        return;
      }
      if (!(child instanceof THREE.Mesh || child instanceof THREE.Points))
        return;
      const childMaterials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      childMaterials.forEach((material) => {
        restoreMaterial(material);
        if (visualState === "idle" || child.name === "interaction-hit-volume")
          return;
        if (visualState === "incorrect") {
          material.transparent = true;
          material.opacity *= 0.52;
        }
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissive.set(
            visualState === "correct"
              ? 0x1d8f45
              : visualState === "incorrect"
                ? 0x7d1818
                : 0x8c6500,
          );
          material.emissiveIntensity = visualState === "correct" ? 0.85 : 0.58;
        }
        material.needsUpdate = true;
      });
    });
  };

  const setProgress = (progress01: number) => {
    progress = clamp01(progress01);
    missionProgress[activeMission] = progress;
    if (activeMission === 0) {
      calibrationFineBars.forEach((bar, index) => {
        bar.visible = index / calibrationFineBars.length <= progress + 0.2;
      });
      calibrationHalo.visible = progress > 0.05 && progress < 1;
    } else if (activeMission === 1) {
      fieldMouse.visible = progress >= 0.45;
      valleyScanBeam.position.x =
        progress < 0.25
          ? -2.55
          : progress < 0.5
            ? 0.05
            : progress < 0.75
              ? 2.25
              : 2.18;
      valleyScanBeam.position.z =
        progress < 0.25
          ? -1.1
          : progress < 0.5
            ? -2.25
            : progress < 0.75
              ? -1.25
              : -1.78;
    } else if (activeMission === 2) {
      reflectiveEyes.visible = progress >= 0.48;
      lemur.visible = progress >= 0.72;
      reflectiveEyes.traverse((object) => {
        if (object.name === "reflective-eye-clue") {
          object.visible = progress < 0.86;
        }
      });
    } else {
      const activeFly = Math.min(3, Math.floor(progress * 4));
      flyActors.forEach((fly, index) => {
        fly.userData.trackingState =
          index < activeFly
            ? "visited"
            : index === activeFly
              ? "active"
              : "waiting";
      });
      tongue.visible = progress >= 0.96;
    }
  };

  const setMission = (mission: SuperSensesSightMission | number) => {
    activeMission = missionIndex(mission);
    progress = missionProgress[activeMission];
    missionGroups.forEach((missionGroup, index) => {
      missionGroup.visible = index === activeMission;
    });
    scene.background = panoramaTexture ?? sceneBackgrounds[activeMission];
    scene.fog = worldFog;
    worldFog.color.copy(sceneBackgrounds[activeMission]);
    if (activeMission === 2) {
      worldFog.near = 5.5;
      worldFog.far = 21;
      hemisphere.color.set(0x637cad);
      hemisphere.groundColor.set(0x07130e);
      hemisphere.intensity = 0.68;
      keyLight.color.set(0xb9d5ff);
      keyLight.intensity = 1.08;
      keyLight.position.set(-5, 7, -2);
    } else if (activeMission === 3) {
      worldFog.near = 11;
      worldFog.far = 34;
      hemisphere.color.set(0xdafff0);
      hemisphere.groundColor.set(0x2a4c2b);
      hemisphere.intensity = 1.55;
      keyLight.color.set(0xffedbd);
      keyLight.intensity = 2.25;
      keyLight.position.set(-4, 8, 5);
    } else {
      worldFog.near = activeMission === 0 ? 13 : 11;
      worldFog.far = activeMission === 0 ? 42 : 36;
      hemisphere.color.set(0xeaf8ff);
      hemisphere.groundColor.set(activeMission === 0 ? 0x48514c : 0x33492d);
      hemisphere.intensity = 1.75;
      keyLight.color.set(0xfff2cf);
      keyLight.intensity = 2.65;
      keyLight.position.set(-5, 9, 5);
    }
    setProgress(progress);
  };

  const setMissionProgress = (
    mission: SuperSensesSightMission | number,
    progress01: number,
  ) => {
    const index = missionIndex(mission);
    missionProgress[index] = clamp01(progress01);
    if (index === activeMission) setProgress(missionProgress[index]);
  };

  const syncCelebrationToTimeline = () => {
    recapPortal.visible = timelineSeconds >= 280;
    graduation.visible = timelineSeconds >= 290;
    fireworks.visible = timelineSeconds >= 293;
    feathersAndStars.visible = timelineSeconds >= 295;
    badge.visible = timelineSeconds >= 298;
    isCelebrating = timelineSeconds >= 280;
    if (timelineSeconds >= 300) isFrozen = true;
  };

  const setTimeline = (seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    timelineSeconds = Math.min(300, Math.max(0, seconds));
    syncCelebrationToTimeline();
  };

  const celebrate = (beat?: SuperSensesSightCelebrationBeat) => {
    isCelebrating = true;
    isFrozen = false;
    if (!beat) {
      recapPortal.visible = true;
      graduation.visible = true;
      fireworks.visible = true;
      feathersAndStars.visible = true;
      badge.visible = true;
      return;
    }
    if (beat === "recap" || beat === "portal") recapPortal.visible = true;
    if (beat === "graduation") graduation.visible = true;
    if (beat === "fireworks") fireworks.visible = true;
    if (beat === "feathers-stars" || beat === "confetti")
      feathersAndStars.visible = true;
    if (beat === "badge") badge.visible = true;
  };

  const freeze = () => {
    isFrozen = true;
  };

  const focusForMission = (
    mission: SuperSensesSightMission | number,
  ): SuperSensesSightFocus => {
    const pose = FOCUS_POSES[missionIndex(mission)];
    return {
      position: pose.position.clone(),
      target: pose.target.clone(),
    };
  };

  const focusTarget = (mission: SuperSensesSightMission | number) =>
    FOCUS_POSES[missionIndex(mission)].target.clone();

  const applySnapshot = (snapshot: SuperSensesSightSnapshot) => {
    setMission(snapshot.mission);
    prefersReducedMotion = snapshot.reducedMotion;
    interactiveTargets.forEach((_, id) => setChoice(id, "idle"));
    if (snapshot.selectedDistractor) {
      setChoice(snapshot.selectedDistractor, "incorrect");
    }
    if (snapshot.selectedChoice) setChoice(snapshot.selectedChoice, "correct");
    setProgress(snapshot.progress);
    setTimeline(snapshot.timeSeconds);
    if (snapshot.completed) celebrate();
    if (snapshot.frozen) freeze();
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
    const motionScale = shouldReduceMotion ? 0.16 : 1;

    swayingObjects.forEach((object, index) => {
      const phase = Number(object.userData.swayPhase ?? index * 0.63);
      object.rotation.z =
        Math.sin(elapsed * 0.62 + phase) * 0.017 * motionScale;
    });
    pulsingObjects.forEach((object, index) => {
      if (object.userData.choiceState && object.userData.choiceState !== "idle")
        return;
      const baseScale = targetBaseScales.get(object);
      const pulse =
        1 + Math.sin(elapsed * 2.15 + index * 0.71) * 0.045 * motionScale;
      if (baseScale) object.scale.copy(baseScale).multiplyScalar(pulse);
      else object.scale.setScalar(pulse);
    });
    rotatingObjects.forEach((object, index) => {
      object.rotation.z = elapsed * (0.2 + index * 0.035) * motionScale;
    });
    wingPairs.forEach((pair, index) => {
      const flap =
        pair.restingAngle +
        Math.sin(elapsed * pair.speed + index * 0.41) *
          pair.amplitude *
          motionScale;
      pair.left.rotation.z = flap;
      pair.right.rotation.z = -flap;
    });
    driftingClouds.forEach((cloud, index) => {
      const baseX = Number(cloud.userData.baseX ?? 0);
      const span = Number(cloud.userData.span ?? 14);
      cloud.position.x =
        baseX +
        (((elapsed * (0.035 + index * 0.004)) % 1) * span - span * 0.5) *
          motionScale;
    });
    fireflies.forEach((firefly, index) => {
      const phase = Number(firefly.userData.phase ?? index);
      const baseY = Number(firefly.userData.baseY ?? firefly.position.y);
      firefly.position.y =
        baseY + Math.sin(elapsed * 1.7 + phase) * 0.09 * motionScale;
      firefly.visible = Math.sin(elapsed * 2.4 + phase) > -0.45;
    });
    flyActors.forEach((fly, index) => {
      const base = fly.userData.basePosition as THREE.Vector3 | undefined;
      if (!base) return;
      const phase = Number(fly.userData.phase ?? index);
      fly.position.set(
        base.x + Math.sin(elapsed * 1.8 + phase) * 0.08 * motionScale,
        base.y + Math.sin(elapsed * 2.45 + phase * 1.4) * 0.07 * motionScale,
        base.z + Math.cos(elapsed * 1.65 + phase) * 0.06 * motionScale,
      );
    });

    if (activeMission === 3 && flyActors.length === 4) {
      const activeFlyIndex = Math.min(3, Math.floor(progress * 4));
      const trackedFly = flyActors[activeFlyIndex];
      const targetPosition = trackedFly.getWorldPosition(new THREE.Vector3());
      chameleonEyes.forEach((eye, index) => {
        if (index === 0) eye.lookAt(targetPosition);
        else {
          const roaming = targetPosition
            .clone()
            .add(
              new THREE.Vector3(
                Math.sin(elapsed * 0.85) * 1.2,
                Math.cos(elapsed * 0.67) * 0.45,
                0,
              ),
            );
          eye.lookAt(roaming);
        }
      });
    }
    billboards.forEach((object) => {
      if (activeCamera) object.lookAt(activeCamera.position);
    });
    if (isCelebrating && fireworks.visible) {
      fireworks.children.forEach((burst, burstIndex) => {
        const pulse =
          0.82 + Math.abs(Math.sin(elapsed * 2.1 + burstIndex)) * 0.35;
        burst.scale.setScalar(pulse);
        burst.rotation.z = elapsed * 0.12 * (burstIndex % 2 === 0 ? 1 : -1);
      });
    }
    if (isCelebrating && feathersAndStars.visible) {
      feathersAndStars.children.forEach((particle, index) => {
        const phase = Number(particle.userData.phase ?? 0);
        particle.position.y -= delta * (0.42 + phase * 0.5) * motionScale;
        particle.rotation.x += delta * (0.8 + (index % 4) * 0.26) * motionScale;
        particle.rotation.z += delta * (0.7 + (index % 5) * 0.2) * motionScale;
        if (particle.position.y < 0.2) {
          particle.position.y = Number(particle.userData.startY ?? 3.4);
        }
      });
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    scene.remove(root, hemisphere, keyLight);
    if (
      scene.background === panoramaTexture ||
      sceneBackgrounds.some((background) => scene.background === background)
    ) {
      scene.background = previousBackground;
    }
    if (scene.fog === worldFog) scene.fog = previousFog;
    geometries.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    panoramaTexture?.dispose();
    panoramaTexture = undefined;
    geometries.clear();
    materials.clear();
    interactiveTargets.clear();
    interactableSet.clear();
    targetBaseScales.clear();
    materialAppearances.clear();
    swayingObjects.length = 0;
    pulsingObjects.length = 0;
    rotatingObjects.length = 0;
    driftingClouds.length = 0;
    fireflies.length = 0;
    flyActors.length = 0;
    wingPairs.length = 0;
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
    setProgress,
    setChoice,
    focusForMission,
    focusTarget,
    celebrate,
    freeze,
    update,
    dispose,
  };
}
