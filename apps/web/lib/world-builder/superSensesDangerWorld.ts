import * as THREE from "three";

import { SUPER_SENSES_DANGER_SCENE_METADATA } from "@xr-school/simulation-content";

export type SuperSensesDangerMission = 0 | 1 | 2 | 3;

export type SuperSensesDangerChoiceState =
  | "idle"
  | "selected"
  | "correct"
  | "incorrect"
  | "wrong"
  | "hint";

export type SuperSensesDangerCelebrationBeat =
  | "recap"
  | "graduation"
  | "geyser"
  | "stars"
  | "signal-icons"
  | "badge";

export interface SuperSensesDangerSnapshot {
  mission: SuperSensesDangerMission | number;
  progress: number;
  selectedChoice?: string | null;
  selectedDistractor?: string | null;
  timeSeconds: number;
  reducedMotion: boolean;
  completed?: boolean;
  frozen?: boolean;
}

export interface SuperSensesDangerFocus {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface SuperSensesDangerWorld {
  root: THREE.Group;
  interactiveTargets: ReadonlyMap<string, THREE.Object3D>;
  interactables: THREE.Object3D[];
  applySnapshot: (snapshot: SuperSensesDangerSnapshot) => void;
  setMission: (mission: SuperSensesDangerMission | number) => void;
  setTimeline: (seconds: number) => void;
  setMissionProgress: (
    mission: SuperSensesDangerMission | number,
    progress01: number,
  ) => void;
  setProgress: (progress01: number) => void;
  setChoice: (id: string, state: SuperSensesDangerChoiceState) => void;
  focusForMission: (
    mission: SuperSensesDangerMission | number,
  ) => SuperSensesDangerFocus;
  focusTarget: (mission: SuperSensesDangerMission | number) => THREE.Vector3;
  celebrate: (beat?: SuperSensesDangerCelebrationBeat) => void;
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

const missionIndex = (value: number): SuperSensesDangerMission =>
  Math.min(3, Math.max(0, Math.round(value))) as SuperSensesDangerMission;

const FOCUS_POSES: readonly SuperSensesDangerFocus[] = [
  {
    position: new THREE.Vector3(0, 1.72, 5.8),
    target: new THREE.Vector3(0, 0.28, -0.5),
  },
  {
    position: new THREE.Vector3(0, 2.15, 7.1),
    target: new THREE.Vector3(0, 0.48, -2.3),
  },
  {
    position: new THREE.Vector3(0, 1.65, 5.1),
    target: new THREE.Vector3(0, 1.45, -0.8),
  },
  {
    position: new THREE.Vector3(0, 1.45, 5.9),
    target: new THREE.Vector3(0, 0.18, -1.5),
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

interface PulseActor {
  object: THREE.Object3D;
  speed: number;
  delay: number;
  strength: number;
  baseScale: THREE.Vector3;
  material?: THREE.Material;
}

function forEachMaterial(
  object: THREE.Object3D,
  callback: (material: THREE.Material) => void,
) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Line)) return;
    const childMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    childMaterials.forEach(callback);
  });
}

/**
 * A lightweight procedural natural-history world. Signal rings, colour-coded
 * web pulses and electric halos are deliberately conspicuous teaching models;
 * the physical animals and habitats remain separate from those overlays.
 */
export function createSuperSensesDangerWorld(
  scene: THREE.Scene,
  renderer?: THREE.WebGLRenderer,
): SuperSensesDangerWorld {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const interactiveTargets = new Map<string, THREE.Object3D>();
  const interactableSet = new Set<THREE.Object3D>();
  const targetBaseScales = new Map<THREE.Object3D, THREE.Vector3>();
  const materialAppearances = new Map<THREE.Material, MaterialAppearance>();
  const pulseActors: PulseActor[] = [];
  const grassActors: THREE.Object3D[] = [];
  const dustActors: THREE.Object3D[] = [];
  const bubbles: THREE.Object3D[] = [];
  const webPulseActors: THREE.Object3D[] = [];
  const rayActors: THREE.Group[] = [];
  const billboardActors: THREE.Object3D[] = [];

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
    name = "",
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
    object.userData.choiceId = id;
    object.userData.interactionId = id;
    object.userData.choiceState = "idle";
    forEachMaterial(object, rememberMaterial);
    interactiveTargets.set(id, object);
    interactableSet.add(object);
    targetBaseScales.set(object, object.scale.clone());
    return object;
  };
  const hitVolume = (radius: number) => {
    const hit = mesh(
      geometry(new THREE.SphereGeometry(radius, 12, 8)),
      basic({
        color: 0xffffff,
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
      }),
      "interaction-hit-volume",
    );
    hit.castShadow = false;
    hit.receiveShadow = false;
    return hit;
  };
  const glowRing = (
    radius: number,
    color: number,
    opacity: number,
    tube = 0.035,
  ) => {
    const material = basic({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = mesh(
      geometry(new THREE.TorusGeometry(radius, tube, 10, 64)),
      material,
      "signal-model-ring",
    );
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = false;
    ring.receiveShadow = false;
    return ring;
  };
  const cylinderBetween = (
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
  const makeRippleTarget = (
    id: string,
    position: THREE.Vector3,
    color: number,
    radius: number,
    ringCount: number,
    strength: number,
  ) => {
    const target = group(id);
    target.position.copy(position);
    for (let index = 0; index < ringCount; index += 1) {
      const ring = glowRing(
        radius * (0.38 + index * 0.3),
        color,
        0.88 - index * 0.16,
        0.025 + strength * 0.012,
      );
      ring.position.y = 0.035 + index * 0.008;
      target.add(ring);
      pulseActors.push({
        object: ring,
        speed: 0.55 + strength * 0.28,
        delay: index / ringCount,
        strength,
        baseScale: ring.scale.clone(),
        material: ring.material as THREE.Material,
      });
    }
    target.add(hitVolume(Math.max(0.45, radius * 0.8)));
    addInteractive(id, target);
    return target;
  };

  const root = group("super-senses-danger-spy-academy");
  scene.add(root);
  const missionGroups = [
    group("mission-1-vibe-boots-savanna"),
    group("mission-2-elephant-seismic-trail"),
    group("mission-3-spider-web-alarm"),
    group("mission-4-shark-electroreception-ocean"),
  ] as const;
  root.add(...missionGroups);

  const previousBackground = scene.background;
  const previousFog = scene.fog;
  const sceneBackgrounds = [
    new THREE.Color(0xd9b868),
    new THREE.Color(0xa88d5b),
    new THREE.Color(0x07111d),
    new THREE.Color(0x0a6677),
  ] as const;
  const worldFog = new THREE.Fog(sceneBackgrounds[0], 12, 46);
  scene.background = sceneBackgrounds[0];
  scene.fog = worldFog;

  const hemisphere = new THREE.HemisphereLight(0xf4e8c0, 0x2f2b18, 1.65);
  hemisphere.name = "danger-world-ambient-light";
  const keyLight = new THREE.DirectionalLight(0xffe0a3, 2.4);
  keyLight.name = "danger-world-sun-moon-water-light";
  keyLight.position.set(-6, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 42;
  scene.add(hemisphere, keyLight);

  let panoramaTexture: THREE.Texture | undefined;
  try {
    panoramaTexture = new THREE.TextureLoader().load(
      SUPER_SENSES_DANGER_SCENE_METADATA.environmentUrl,
    );
    panoramaTexture.colorSpace = THREE.SRGBColorSpace;
    panoramaTexture.mapping = THREE.EquirectangularReflectionMapping;
    textures.add(panoramaTexture);
  } catch {
    panoramaTexture = undefined;
  }

  const makeTerrain = (
    parent: THREE.Group,
    color: number,
    radius = 9,
    height = 0.2,
  ) => {
    const terrain = mesh(
      geometry(new THREE.CylinderGeometry(radius, radius * 1.02, height, 64)),
      standard({ color, roughness: 0.98, metalness: 0 }),
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
    color = 0x635444,
  ) => {
    const rock = mesh(
      geometry(new THREE.DodecahedronGeometry(0.52, 1)),
      standard({ color, roughness: 0.98, flatShading: true }),
      "weathered-rock",
    );
    rock.position.copy(position);
    rock.scale.copy(scale);
    rock.rotation.set(position.z * 0.08, position.x * 0.21, 0.08);
    parent.add(rock);
    return rock;
  };
  const makeAcacia = (parent: THREE.Group, x: number, z: number, scale = 1) => {
    const tree = group("acacia-tree");
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    const trunkMaterial = standard({ color: 0x563923, roughness: 0.96 });
    const leafMaterial = standard({ color: 0x52672e, roughness: 0.93 });
    const trunk = mesh(
      geometry(new THREE.CylinderGeometry(0.08, 0.16, 2.15, 9)),
      trunkMaterial,
      "acacia-trunk",
    );
    trunk.position.y = 1.05;
    tree.add(trunk);
    [
      [-0.72, 2.1, 0, 1.2, 0.26, 0.74],
      [0.42, 2.18, 0.03, 1.35, 0.3, 0.78],
      [0, 2.35, -0.08, 1.55, 0.34, 0.82],
    ].forEach(([px, py, pz, sx, sy, sz]) => {
      const crown = mesh(
        geometry(new THREE.IcosahedronGeometry(0.72, 1)),
        leafMaterial,
        "flat-acacia-canopy",
      );
      crown.position.set(px, py, pz);
      crown.scale.set(sx, sy, sz);
      tree.add(crown);
    });
    parent.add(tree);
    return tree;
  };
  const makeGrass = (parent: THREE.Group, count: number, radius: number) => {
    const grassMaterial = standard({
      color: 0x9d853c,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });
    const grassGeometry = geometry(new THREE.ConeGeometry(0.035, 0.58, 4, 1));
    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.399963 + 0.4;
      const distance = 1.4 + (((index * 37) % 100) / 100) * radius;
      const blade = mesh(grassGeometry, grassMaterial, "savanna-grass");
      blade.position.set(
        Math.cos(angle) * distance,
        0.28,
        Math.sin(angle) * distance - 1.4,
      );
      blade.scale.set(0.7 + (index % 5) * 0.09, 0.7 + (index % 7) * 0.06, 1);
      blade.rotation.y = angle;
      blade.userData.phase = index * 0.47;
      parent.add(blade);
      grassActors.push(blade);
    }
  };

  // Mission 1: savanna vibration calibration.
  const calibrationWorld = missionGroups[0];
  makeTerrain(calibrationWorld, 0x8b6637, 9.5);
  makeGrass(calibrationWorld, 95, 7.5);
  makeAcacia(calibrationWorld, -5.8, -5.5, 1.1);
  makeAcacia(calibrationWorld, 5.5, -7.2, 0.82);
  makeRock(
    calibrationWorld,
    new THREE.Vector3(-3.2, 0.25, -1.8),
    new THREE.Vector3(1.2, 0.62, 0.8),
  );
  makeRock(
    calibrationWorld,
    new THREE.Vector3(3.6, 0.18, -3.7),
    new THREE.Vector3(0.75, 0.42, 0.62),
  );

  const crackMaterial = lineMaterial({
    color: 0x3f2a1d,
    transparent: true,
    opacity: 0.78,
  });
  for (let index = 0; index < 22; index += 1) {
    const angle = (index / 22) * Math.PI * 2;
    const distance = 0.7 + (index % 6) * 0.54;
    const start = new THREE.Vector3(
      Math.cos(angle) * distance,
      0.014,
      Math.sin(angle) * distance - 0.4,
    );
    const end = start
      .clone()
      .add(
        new THREE.Vector3(
          Math.cos(angle + 0.7) * (0.35 + (index % 4) * 0.1),
          0,
          Math.sin(angle + 0.7) * (0.35 + (index % 4) * 0.1),
        ),
      );
    const crack = new THREE.Line(
      geometry(
        new THREE.BufferGeometry().setFromPoints([
          start,
          start
            .clone()
            .lerp(end, 0.54)
            .add(new THREE.Vector3(0.12, 0, -0.08)),
          end,
        ]),
      ),
      crackMaterial,
    );
    calibrationWorld.add(crack);
  }

  const beetle = group("tiny-ground-beetle");
  beetle.add(
    mesh(
      geometry(new THREE.SphereGeometry(0.1, 14, 10)),
      standard({ color: 0x1a1612, metalness: 0.24, roughness: 0.5 }),
      "beetle-body",
    ),
  );
  beetle.position.set(-2.65, 0.13, -1.25);
  calibrationWorld.add(beetle);
  const vibeBeetle = makeRippleTarget(
    "vibe-beetle",
    beetle.position.clone().setY(0.025),
    0x64d98a,
    0.52,
    2,
    0.35,
  );
  calibrationWorld.add(vibeBeetle);
  const vibeFootsteps = makeRippleTarget(
    "vibe-footsteps",
    new THREE.Vector3(0, 0.025, -2.75),
    0xffd13b,
    1.05,
    3,
    0.72,
  );
  calibrationWorld.add(vibeFootsteps);
  const vibeDisturbance = makeRippleTarget(
    "vibe-disturbance",
    new THREE.Vector3(3.05, 0.025, -3.25),
    0xff5b50,
    1.46,
    4,
    1,
  );
  calibrationWorld.add(vibeDisturbance);

  const boots = group("vibe-boots-model");
  const bootMaterial = standard({
    color: 0x263646,
    metalness: 0.66,
    roughness: 0.32,
    emissive: 0xdba80d,
    emissiveIntensity: 0.38,
  });
  [-0.2, 0.2].forEach((x) => {
    const boot = mesh(
      geometry(new THREE.BoxGeometry(0.25, 0.18, 0.48)),
      bootMaterial,
      "vibe-boot",
    );
    boot.position.set(x, 0.12, 2.18);
    boots.add(boot);
  });
  calibrationWorld.add(boots);

  const professor = group("professor-tremor-robotic-mole");
  professor.position.set(-1.65, 0.42, -0.1);
  const moleMetal = standard({
    color: 0x596776,
    metalness: 0.72,
    roughness: 0.3,
  });
  const moleBody = mesh(
    geometry(new THREE.CapsuleGeometry(0.34, 0.72, 8, 16)),
    moleMetal,
    "robotic-mole-body",
  );
  moleBody.position.y = 0.55;
  professor.add(moleBody);
  const nose = mesh(
    geometry(new THREE.ConeGeometry(0.16, 0.38, 18)),
    standard({ color: 0xa98784, roughness: 0.68 }),
    "mole-snout",
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.67, 0.42);
  professor.add(nose);
  const goggleMaterial = physical({
    color: 0x48d9ff,
    emissive: 0x077aa1,
    emissiveIntensity: 1.1,
    metalness: 0.2,
    roughness: 0.12,
    transmission: 0.18,
  });
  [-0.17, 0.17].forEach((x) => {
    const lens = mesh(
      geometry(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 24)),
      goggleMaterial,
      "oversized-mining-goggle",
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, 0.91, 0.31);
    professor.add(lens);
  });
  calibrationWorld.add(professor);

  // Mission 2: elephant seismic trail.
  const elephantWorld = missionGroups[1];
  makeTerrain(elephantWorld, 0x6e5736, 10.5);
  makeGrass(elephantWorld, 78, 8.6);
  makeAcacia(elephantWorld, -6.5, -7.2, 1.05);
  makeAcacia(elephantWorld, 6.2, -8.5, 0.9);
  const stormCloud = group("distant-storm-cloud");
  for (let index = 0; index < 8; index += 1) {
    const puff = mesh(
      geometry(new THREE.SphereGeometry(0.7 + (index % 3) * 0.13, 16, 10)),
      standard({ color: 0x465363, roughness: 0.9 }),
      "storm-cloud-puff",
    );
    puff.position.set((index - 3.5) * 0.72, 0.2 + (index % 2) * 0.28, 0);
    stormCloud.add(puff);
  }
  stormCloud.position.set(4.5, 5.6, -12);
  elephantWorld.add(stormCloud);

  const makeElephant = (x: number, z: number, scale: number) => {
    const elephant = group("savanna-elephant");
    elephant.position.set(x, 0, z);
    elephant.scale.setScalar(scale);
    const skin = standard({ color: 0x77766f, roughness: 0.98 });
    const body = mesh(
      geometry(new THREE.SphereGeometry(0.95, 28, 18)),
      skin,
      "elephant-body",
    );
    body.position.y = 1.35;
    body.scale.set(1.35, 0.92, 0.82);
    elephant.add(body);
    const head = mesh(
      geometry(new THREE.SphereGeometry(0.56, 24, 16)),
      skin,
      "elephant-head",
    );
    head.position.set(0, 1.45, 0.88);
    elephant.add(head);
    [-0.48, 0.48].forEach((xSide) => {
      const ear = mesh(
        geometry(new THREE.SphereGeometry(0.46, 20, 14)),
        standard({
          color: 0x6f6d68,
          roughness: 0.98,
          side: THREE.DoubleSide,
        }),
        "elephant-ear",
      );
      ear.position.set(xSide, 1.5, 0.72);
      ear.scale.set(0.18, 1.04, 0.8);
      elephant.add(ear);
    });
    [-0.56, 0.56].forEach((xSide) => {
      [-0.34, 0.36].forEach((zSide) => {
        const leg = mesh(
          geometry(new THREE.CylinderGeometry(0.18, 0.23, 1.05, 14)),
          skin,
          "elephant-leg",
        );
        leg.position.set(xSide, 0.55, zSide);
        elephant.add(leg);
      });
    });
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.35, 1.25),
      new THREE.Vector3(0.02, 1.02, 1.42),
      new THREE.Vector3(0.08, 0.58, 1.43),
      new THREE.Vector3(0.18, 0.3, 1.3),
    ]);
    elephant.add(
      mesh(
        geometry(new THREE.TubeGeometry(trunkCurve, 28, 0.12, 10, false)),
        skin,
        "elephant-trunk",
      ),
    );
    const ivory = standard({ color: 0xf4e4bd, roughness: 0.48 });
    [-0.2, 0.2].forEach((xSide) => {
      const tusk = mesh(
        geometry(new THREE.ConeGeometry(0.045, 0.44, 12)),
        ivory,
        "elephant-tusk",
      );
      tusk.rotation.x = Math.PI / 2;
      tusk.position.set(xSide, 1.23, 1.35);
      elephant.add(tusk);
    });
    elephantWorld.add(elephant);
    return elephant;
  };
  const elephants = [
    makeElephant(-1.5, -8.8, 0.9),
    makeElephant(0.2, -9.8, 1.05),
    makeElephant(1.75, -8.5, 0.82),
  ];
  elephants.forEach((elephant) => (elephant.visible = false));

  const seismicLeft = makeRippleTarget(
    "seismic-left",
    new THREE.Vector3(-3.15, 0.025, -2.8),
    0x8fe28b,
    0.7,
    2,
    0.38,
  );
  const seismicCenter = makeRippleTarget(
    "seismic-center",
    new THREE.Vector3(0, 0.025, -3.9),
    0xffd43e,
    1.35,
    4,
    1,
  );
  const seismicRight = makeRippleTarget(
    "seismic-right",
    new THREE.Vector3(3.25, 0.025, -2.65),
    0x9aa8b2,
    0.54,
    2,
    0.24,
  );
  elephantWorld.add(seismicLeft, seismicCenter, seismicRight);
  [
    ["ripple-one", new THREE.Vector3(-0.72, 0.03, -4.65), 0.72],
    ["ripple-two", new THREE.Vector3(0.42, 0.03, -5.75), 0.88],
    ["ripple-three", new THREE.Vector3(-0.2, 0.03, -7.05), 1.04],
  ].forEach(([id, position, radius]) => {
    const checkpoint = makeRippleTarget(
      id as string,
      position as THREE.Vector3,
      0xffdc4e,
      radius as number,
      3,
      0.9,
    );
    checkpoint.visible = false;
    elephantWorld.add(checkpoint);
  });

  // Mission 3: giant moonlit spider web.
  const webWorld = missionGroups[2];
  const nightFloor = makeTerrain(webWorld, 0x10191c, 8.5, 0.16);
  nightFloor.position.y = -0.65;
  const web = group("giant-orb-web");
  web.position.set(0, 1.45, -1.25);
  const silkMaterial = lineMaterial({
    color: 0xd8f4ff,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
  });
  const webRadius = 3.25;
  const radialCount = 18;
  for (let index = 0; index < radialCount; index += 1) {
    const angle = (index / radialCount) * Math.PI * 2;
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(
        Math.cos(angle) * webRadius,
        Math.sin(angle) * webRadius,
        0,
      ),
    ];
    const strand = new THREE.Line(
      geometry(new THREE.BufferGeometry().setFromPoints(points)),
      silkMaterial,
    );
    strand.name = "radial-silk-strand";
    web.add(strand);
  }
  for (let ring = 1; ring <= 9; ring += 1) {
    const radius = (ring / 10) * webRadius;
    const points: THREE.Vector3[] = [];
    for (let index = 0; index <= radialCount * 2; index += 1) {
      const angle = (index / (radialCount * 2)) * Math.PI * 2;
      const wobble = 1 + Math.sin(index * 1.7 + ring) * 0.025;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius * wobble,
          Math.sin(angle) * radius * wobble,
          0.01,
        ),
      );
    }
    const loop = new THREE.LineLoop(
      geometry(new THREE.BufferGeometry().setFromPoints(points)),
      silkMaterial,
    );
    loop.name = "spiral-silk-strand";
    web.add(loop);
  }
  const dewMaterial = physical({
    color: 0xc9f6ff,
    emissive: 0x1a7e9d,
    emissiveIntensity: 0.65,
    roughness: 0.08,
    transmission: 0.7,
    transparent: true,
    opacity: 0.9,
  });
  for (let index = 0; index < 36; index += 1) {
    const angle = index * 2.399963;
    const radius = 0.45 + (((index * 31) % 100) / 100) * 2.65;
    const dew = mesh(
      geometry(new THREE.SphereGeometry(0.035 + (index % 3) * 0.012, 10, 8)),
      dewMaterial,
      "dew-drop",
    );
    dew.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.04);
    web.add(dew);
  }
  webWorld.add(web);

  const webTarget = (
    id: string,
    angle: number,
    radius: number,
    color: number,
  ) => {
    const target = group(id);
    target.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius + 1.45,
      -1.16,
    );
    const pulse = glowRing(0.32, color, 0.94, 0.045);
    pulse.rotation.x = 0;
    target.add(pulse, hitVolume(0.42));
    webWorld.add(target);
    addInteractive(id, target);
    webPulseActors.push(target);
    pulseActors.push({
      object: pulse,
      speed: color === 0xff415a ? 1.7 : 0.72,
      delay: angle,
      strength: color === 0xff415a ? 1 : 0.45,
      baseScale: pulse.scale.clone(),
      material: pulse.material as THREE.Material,
    });
    return target;
  };
  const webLeaf = webTarget("web-leaf", Math.PI * 0.76, 2.35, 0x54c7ff);
  const webInsect = webTarget("web-insect", Math.PI * 1.26, 1.95, 0x54c7ff);
  const webUrgent = webTarget("web-urgent", Math.PI * 0.1, 2.65, 0xff415a);
  const escapePoint = webTarget("escape-point", Math.PI * 1.72, 2.25, 0x52e08d);
  escapePoint.visible = false;
  const leaf = mesh(
    geometry(new THREE.SphereGeometry(0.28, 16, 10)),
    standard({ color: 0x7b9142, roughness: 0.9 }),
    "harmless-leaf",
  );
  leaf.scale.set(1.6, 0.12, 0.8);
  webLeaf.add(leaf);
  const tinyInsect = group("tiny-web-insect");
  const insectBody = mesh(
    geometry(new THREE.SphereGeometry(0.11, 12, 8)),
    standard({ color: 0x292321, roughness: 0.7 }),
    "tiny-insect-body",
  );
  tinyInsect.add(insectBody);
  webInsect.add(tinyInsect);
  const wasp = group("stylised-predator-wasp");
  const waspBody = mesh(
    geometry(new THREE.CapsuleGeometry(0.17, 0.48, 6, 14)),
    standard({ color: 0xe6ad26, roughness: 0.55 }),
    "wasp-body",
  );
  waspBody.rotation.x = Math.PI / 2;
  wasp.add(waspBody);
  [-1, 1].forEach((side) => {
    const stripe = mesh(
      geometry(new THREE.TorusGeometry(0.18, 0.035, 7, 18)),
      standard({ color: 0x211b18, roughness: 0.7 }),
      "wasp-stripe",
    );
    stripe.rotation.x = Math.PI / 2;
    stripe.position.z = side * 0.1;
    wasp.add(stripe);
    const wing = mesh(
      geometry(new THREE.SphereGeometry(0.22, 12, 8)),
      physical({
        color: 0xc8eeef,
        transparent: true,
        opacity: 0.58,
        roughness: 0.16,
        transmission: 0.45,
        side: THREE.DoubleSide,
      }),
      "wasp-wing",
    );
    wing.scale.set(1.7, 0.1, 0.7);
    wing.position.set(side * 0.23, 0.08, 0);
    wasp.add(wing);
  });
  wasp.position.set(2.4, 3.3, -0.72);
  wasp.visible = false;
  webWorld.add(wasp);

  // Mission 4: underwater electroreception investigation.
  const oceanWorld = missionGroups[3];
  const sand = makeTerrain(oceanWorld, 0xc5aa73, 10.5, 0.3);
  sand.position.y = -0.22;
  for (let index = 0; index < 9; index += 1) {
    makeRock(
      oceanWorld,
      new THREE.Vector3(
        -6 + (index % 5) * 2.8,
        0.05 + (index % 2) * 0.05,
        -3.2 - Math.floor(index / 5) * 3.2,
      ),
      new THREE.Vector3(0.62 + (index % 3) * 0.18, 0.35, 0.52),
      0x526b68,
    );
  }
  const waterVolume = mesh(
    geometry(new THREE.CylinderGeometry(10.2, 10.2, 7.2, 64, 1, true)),
    physical({
      color: 0x0d7084,
      transparent: true,
      opacity: 0.12,
      roughness: 0.12,
      transmission: 0.42,
      side: THREE.BackSide,
      depthWrite: false,
    }),
    "clear-shallow-water-volume",
  );
  waterVolume.position.y = 3.2;
  oceanWorld.add(waterVolume);
  for (let index = 0; index < 38; index += 1) {
    const bubble = mesh(
      geometry(new THREE.SphereGeometry(0.025 + (index % 4) * 0.013, 9, 7)),
      physical({
        color: 0xd7fbff,
        transparent: true,
        opacity: 0.55,
        roughness: 0.08,
        transmission: 0.72,
      }),
      "rising-bubble",
    );
    bubble.position.set(
      -5 + ((index * 41) % 100) / 10,
      0.15 + ((index * 17) % 52) / 10,
      -7 + ((index * 29) % 100) / 10,
    );
    bubble.userData.startY = bubble.position.y;
    bubble.userData.phase = index * 0.31;
    oceanWorld.add(bubble);
    bubbles.push(bubble);
  }
  for (let index = 0; index < 7; index += 1) {
    const shaft = mesh(
      geometry(new THREE.CylinderGeometry(0.04, 0.72, 7, 16, 1, true)),
      basic({
        color: 0xa7f2ff,
        transparent: true,
        opacity: 0.065,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      "underwater-sunbeam",
    );
    shaft.position.set(-4.5 + index * 1.5, 3.1, -3.5 - (index % 2) * 2.2);
    shaft.rotation.z = -0.12 + index * 0.025;
    oceanWorld.add(shaft);
  }
  const makeStingray = (
    name: string,
    position: THREE.Vector3,
    scale: number,
  ) => {
    const ray = group(name);
    ray.position.copy(position);
    ray.scale.setScalar(scale);
    const skin = standard({ color: 0x6e746a, roughness: 0.82 });
    const body = mesh(
      geometry(new THREE.SphereGeometry(0.62, 30, 18)),
      skin,
      "stingray-body",
    );
    body.scale.set(1.45, 0.16, 1.05);
    ray.add(body);
    const wingGeometry = geometry(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0.55),
        new THREE.Vector3(1.18, 0, 0),
        new THREE.Vector3(0, 0, -0.58),
        new THREE.Vector3(-1.18, 0, 0),
      ]),
    );
    wingGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    wingGeometry.computeVertexNormals();
    const wings = mesh(wingGeometry, skin, "stingray-wings");
    ray.add(wings);
    const tail = cylinderBetween(
      new THREE.Vector3(0, 0, -0.45),
      new THREE.Vector3(0, 0.02, -2.35),
      0.035,
      skin,
      "stingray-tail",
    );
    ray.add(tail);
    rayActors.push(ray);
    oceanWorld.add(ray);
    return ray;
  };
  const stingrayOneActor = makeStingray(
    "first-buried-stingray",
    new THREE.Vector3(-0.8, -0.08, -2.65),
    0.78,
  );
  const stingrayTwoActor = makeStingray(
    "second-buried-stingray",
    new THREE.Vector3(2.5, -0.09, -4.2),
    0.62,
  );
  stingrayOneActor.visible = false;
  stingrayTwoActor.visible = false;

  const makeElectricTarget = (
    id: string,
    position: THREE.Vector3,
    radius: number,
    pulsing: boolean,
  ) => {
    const target = group(id);
    target.position.copy(position);
    if (pulsing) {
      for (let ring = 0; ring < 3; ring += 1) {
        const halo = glowRing(
          radius * (0.54 + ring * 0.38),
          0x66e5ff,
          0.88 - ring * 0.18,
          0.03,
        );
        halo.rotation.x = Math.PI / 2;
        target.add(halo);
        pulseActors.push({
          object: halo,
          speed: 1.05,
          delay: ring / 3,
          strength: 0.75,
          baseScale: halo.scale.clone(),
          material: halo.material as THREE.Material,
        });
      }
    }
    target.add(hitVolume(Math.max(0.55, radius)));
    oceanWorld.add(target);
    addInteractive(id, target);
    return target;
  };
  makeElectricTarget(
    "scan-empty",
    new THREE.Vector3(-3.2, 0.1, -2.15),
    0.7,
    false,
  );
  const stingrayOne = makeElectricTarget(
    "stingray-one",
    new THREE.Vector3(-0.8, 0.1, -2.65),
    0.85,
    true,
  );
  makeElectricTarget(
    "scan-rock",
    new THREE.Vector3(3.15, 0.22, -2.5),
    0.72,
    false,
  );
  const stingrayTwo = makeElectricTarget(
    "stingray-two",
    new THREE.Vector3(2.5, 0.1, -4.2),
    0.78,
    true,
  );
  stingrayTwo.visible = false;

  const shark = group("reef-shark-observer");
  const sharkSkin = standard({ color: 0x677e84, roughness: 0.66 });
  const sharkBody = mesh(
    geometry(new THREE.CapsuleGeometry(0.34, 1.65, 8, 18)),
    sharkSkin,
    "shark-body",
  );
  sharkBody.rotation.z = Math.PI / 2;
  shark.add(sharkBody);
  const sharkNose = mesh(
    geometry(new THREE.ConeGeometry(0.33, 0.64, 20)),
    sharkSkin,
    "shark-snout",
  );
  sharkNose.rotation.z = -Math.PI / 2;
  sharkNose.position.x = 1.12;
  shark.add(sharkNose);
  const sharkFin = mesh(
    geometry(new THREE.ConeGeometry(0.22, 0.72, 3)),
    sharkSkin,
    "shark-dorsal-fin",
  );
  sharkFin.position.y = 0.42;
  shark.add(sharkFin);
  shark.position.set(-4.7, 2.05, -6.5);
  shark.scale.setScalar(0.8);
  oceanWorld.add(shark);

  // Closing sequence: signal recap, badge, friendly geyser and stars.
  const closing = group("wildlife-spy-closing-sequence");
  closing.position.set(0, 1.75, -2.1);
  closing.visible = false;
  root.add(closing);
  const recapSignals = group("three-signal-recap");
  [
    [-1.5, 0xffd43e],
    [0, 0xff415a],
    [1.5, 0x66e5ff],
  ].forEach(([x, color]) => {
    const symbol = glowRing(0.48, color, 0.96, 0.07);
    symbol.rotation.x = 0;
    symbol.position.x = x;
    recapSignals.add(symbol);
  });
  closing.add(recapSignals);
  const badge = group("wildlife-spy-badge");
  const badgeDisc = mesh(
    geometry(new THREE.CylinderGeometry(0.82, 0.82, 0.13, 48)),
    standard({
      color: 0xe5b83c,
      emissive: 0x6b4100,
      emissiveIntensity: 0.55,
      metalness: 0.74,
      roughness: 0.25,
    }),
    "badge-disc",
  );
  badgeDisc.rotation.x = Math.PI / 2;
  badge.add(badgeDisc);
  badge.position.y = 0.1;
  badge.visible = false;
  closing.add(badge);
  const geyser = group("digital-water-geyser");
  for (let index = 0; index < 16; index += 1) {
    const drop = mesh(
      geometry(new THREE.SphereGeometry(0.055 + (index % 4) * 0.02, 10, 8)),
      basic({
        color: 0x72eaff,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
      }),
      "geyser-drop",
    );
    const angle = index * 2.399963;
    drop.position.set(
      Math.cos(angle) * (0.2 + (index % 4) * 0.12),
      -1.45 + (index % 8) * 0.34,
      Math.sin(angle) * (0.2 + (index % 4) * 0.12),
    );
    drop.userData.startY = drop.position.y;
    geyser.add(drop);
  }
  geyser.visible = false;
  closing.add(geyser);
  const stars = group("golden-spy-stars");
  for (let index = 0; index < 28; index += 1) {
    const star = mesh(
      geometry(new THREE.OctahedronGeometry(0.07 + (index % 3) * 0.025)),
      basic({
        color: 0xffd75b,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      }),
      "spy-star",
    );
    const angle = index * 2.399963;
    const radius = 0.9 + (index % 7) * 0.22;
    star.position.set(
      Math.cos(angle) * radius,
      -0.5 + (index % 8) * 0.28,
      Math.sin(angle) * radius * 0.24,
    );
    star.userData.phase = index * 0.34;
    stars.add(star);
  }
  stars.visible = false;
  closing.add(stars);
  const signalIcons = group("vibration-web-electroreception-icons");
  for (let index = 0; index < 3; index += 1) {
    const icon = glowRing(
      0.26,
      [0xffd43e, 0xff415a, 0x66e5ff][index],
      0.98,
      0.055,
    );
    icon.rotation.x = 0;
    icon.position.set((index - 1) * 0.78, 1.2, 0);
    signalIcons.add(icon);
  }
  signalIcons.visible = false;
  closing.add(signalIcons);
  billboardActors.push(closing);

  let activeMission: SuperSensesDangerMission = 0;
  let progress = 0;
  let timelineSeconds = 0;
  let isFrozen = false;
  let disposed = false;
  let prefersReducedMotion = false;
  const missionProgress = [0, 0, 0, 0];

  const setChoice = (id: string, nextState: SuperSensesDangerChoiceState) => {
    const target = interactiveTargets.get(id);
    if (!target) return;
    const state = nextState === "wrong" ? "incorrect" : nextState;
    target.userData.choiceState = state;
    const appearanceColor =
      state === "correct"
        ? new THREE.Color(0x67e58b)
        : state === "incorrect"
          ? new THREE.Color(0xff6258)
          : state === "hint"
            ? new THREE.Color(0xffdf5a)
            : undefined;
    forEachMaterial(target, (material) => {
      const baseline = materialAppearances.get(material);
      if (!baseline) return;
      const lit = material as THREE.MeshStandardMaterial;
      if (baseline.color && "color" in lit) {
        lit.color.copy(appearanceColor ?? baseline.color);
      }
      if (baseline.emissive && "emissive" in lit) {
        lit.emissive.copy(appearanceColor ?? baseline.emissive);
        lit.emissiveIntensity = appearanceColor
          ? state === "hint"
            ? 1.4
            : 1.05
          : (baseline.emissiveIntensity ?? 0);
      }
      if (appearanceColor && material instanceof THREE.MeshBasicMaterial) {
        material.color.copy(appearanceColor);
        material.opacity = Math.max(0.9, material.opacity);
      } else if (
        material instanceof THREE.MeshBasicMaterial &&
        baseline.color
      ) {
        material.color.copy(baseline.color);
        material.opacity = baseline.opacity;
      }
    });
    const baseScale = targetBaseScales.get(target);
    if (baseScale) {
      target.scale.copy(baseScale).multiplyScalar(state === "idle" ? 1 : 1.1);
    }
  };

  const setProgress = (progress01: number) => {
    progress = clamp01(progress01);
    missionProgress[activeMission] = progress;
    if (activeMission === 0) {
      professor.position.y = 0.42 + Math.min(1, progress * 2) * 0.15;
      boots.visible = progress < 0.94;
    } else if (activeMission === 1) {
      interactiveTargets.get("ripple-one")!.visible = progress >= 0.18;
      interactiveTargets.get("ripple-two")!.visible = progress >= 0.38;
      interactiveTargets.get("ripple-three")!.visible = progress >= 0.58;
      elephants.forEach((elephant) => (elephant.visible = progress >= 0.68));
    } else if (activeMission === 2) {
      webInsect.visible = progress >= 0.28;
      webUrgent.visible = progress >= 0.38;
      wasp.visible = progress >= 0.55;
      escapePoint.visible = progress >= 0.66;
    } else {
      stingrayOneActor.visible = progress >= 0.44;
      stingrayTwo.visible = progress >= 0.48;
      stingrayTwoActor.visible = progress >= 0.82;
      shark.visible = progress >= 0.2;
    }
  };

  const setMission = (mission: SuperSensesDangerMission | number) => {
    activeMission = missionIndex(mission);
    progress = missionProgress[activeMission];
    missionGroups.forEach((missionGroup, index) => {
      missionGroup.visible = index === activeMission;
    });
    scene.background = panoramaTexture ?? sceneBackgrounds[activeMission];
    scene.fog = worldFog;
    worldFog.color.copy(sceneBackgrounds[activeMission]);
    if (activeMission === 2) {
      worldFog.near = 6;
      worldFog.far = 24;
      hemisphere.color.set(0x8aa6ca);
      hemisphere.groundColor.set(0x02070c);
      hemisphere.intensity = 0.72;
      keyLight.color.set(0xc9ddff);
      keyLight.intensity = 1.25;
      keyLight.position.set(-4, 7, 3);
    } else if (activeMission === 3) {
      worldFog.near = 8;
      worldFog.far = 31;
      hemisphere.color.set(0x7de5ef);
      hemisphere.groundColor.set(0x063341);
      hemisphere.intensity = 1.2;
      keyLight.color.set(0xb9f8ff);
      keyLight.intensity = 1.65;
      keyLight.position.set(-3, 9, 1);
    } else {
      worldFog.near = 12;
      worldFog.far = 44;
      hemisphere.color.set(0xf4e8c0);
      hemisphere.groundColor.set(0x2f2b18);
      hemisphere.intensity = 1.65;
      keyLight.color.set(0xffe0a3);
      keyLight.intensity = 2.4;
      keyLight.position.set(-6, 10, 5);
    }
    setProgress(progress);
  };

  const setMissionProgress = (
    mission: SuperSensesDangerMission | number,
    progress01: number,
  ) => {
    const index = missionIndex(mission);
    missionProgress[index] = clamp01(progress01);
    if (index === activeMission) setProgress(missionProgress[index]);
  };

  const setTimeline = (seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    timelineSeconds = Math.min(300, Math.max(0, seconds));
    closing.visible = timelineSeconds >= 280;
    recapSignals.visible = timelineSeconds >= 280;
    badge.visible = timelineSeconds >= 290;
    geyser.visible = timelineSeconds >= 294;
    stars.visible = timelineSeconds >= 296;
    signalIcons.visible = timelineSeconds >= 298;
    if (timelineSeconds >= 300) isFrozen = true;
  };

  const celebrate = (beat?: SuperSensesDangerCelebrationBeat) => {
    isFrozen = false;
    closing.visible = true;
    if (!beat || beat === "recap") recapSignals.visible = true;
    if (!beat || beat === "graduation" || beat === "badge")
      badge.visible = true;
    if (!beat || beat === "geyser") geyser.visible = true;
    if (!beat || beat === "stars") stars.visible = true;
    if (!beat || beat === "signal-icons") signalIcons.visible = true;
  };

  const freeze = () => {
    isFrozen = true;
  };

  const focusForMission = (
    mission: SuperSensesDangerMission | number,
  ): SuperSensesDangerFocus => {
    const pose = FOCUS_POSES[missionIndex(mission)];
    return {
      position: pose.position.clone(),
      target: pose.target.clone(),
    };
  };

  const focusTarget = (mission: SuperSensesDangerMission | number) =>
    FOCUS_POSES[missionIndex(mission)].target.clone();

  const applySnapshot = (snapshot: SuperSensesDangerSnapshot) => {
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

    grassActors.forEach((blade, index) => {
      const phase = Number(blade.userData.phase ?? index * 0.47);
      blade.rotation.z = Math.sin(elapsed * 0.8 + phase) * 0.055 * motionScale;
    });
    pulseActors.forEach((actor) => {
      const phase = (((elapsed * actor.speed + actor.delay) % 1) + 1) % 1;
      const scale = 0.76 + phase * (0.5 + actor.strength * 0.28);
      actor.object.scale.copy(actor.baseScale).multiplyScalar(scale);
      if (actor.material) {
        actor.material.opacity = (1 - phase) * 0.66 + 0.2;
      }
    });
    dustActors.forEach((dust, index) => {
      dust.position.x += delta * (0.04 + (index % 4) * 0.012) * motionScale;
    });
    webPulseActors.forEach((target, index) => {
      const urgency = target === webUrgent ? 2.5 : 0.9;
      target.rotation.z =
        Math.sin(elapsed * urgency * 4 + index) *
        (target === webUrgent ? 0.045 : 0.012) *
        motionScale;
    });
    if (wasp.visible) {
      wasp.position.x = 2.4 + Math.sin(elapsed * 2.6) * 0.18 * motionScale;
      wasp.position.y = 3.3 + Math.sin(elapsed * 3.1) * 0.12 * motionScale;
      wasp.rotation.y = Math.sin(elapsed * 1.8) * 0.28;
    }
    bubbles.forEach((bubble, index) => {
      const startY = Number(bubble.userData.startY ?? 0);
      const phase = Number(bubble.userData.phase ?? index);
      bubble.position.y =
        startY +
        ((elapsed * (0.12 + (index % 4) * 0.03) + phase) % 4.8) * motionScale;
      bubble.position.x +=
        Math.sin(elapsed * 0.7 + phase) * delta * 0.016 * motionScale;
    });
    rayActors.forEach((ray, index) => {
      ray.rotation.z = Math.sin(elapsed * 1.5 + index) * 0.035 * motionScale;
      ray.rotation.x = Math.sin(elapsed * 1.15 + index) * 0.025 * motionScale;
    });
    if (shark.visible) {
      shark.position.x = -4.7 + ((elapsed * 0.16) % 9.4);
      shark.position.y = 2.05 + Math.sin(elapsed * 0.55) * 0.18 * motionScale;
      shark.rotation.y = Math.sin(elapsed * 0.28) * 0.12;
    }
    if (closing.visible) {
      recapSignals.rotation.z = elapsed * 0.18 * motionScale;
      badge.rotation.z = Math.sin(elapsed * 1.4) * 0.08 * motionScale;
      badge.scale.setScalar(1 + Math.sin(elapsed * 2.2) * 0.06 * motionScale);
      if (geyser.visible) {
        geyser.children.forEach((drop, index) => {
          const startY = Number(drop.userData.startY ?? -1.4);
          drop.position.y =
            startY +
            ((elapsed * (0.8 + (index % 4) * 0.1)) % 3.7) * motionScale;
        });
      }
      if (stars.visible) {
        stars.children.forEach((star, index) => {
          const phase = Number(star.userData.phase ?? index);
          star.rotation.x += delta * (0.7 + (index % 4) * 0.2) * motionScale;
          star.rotation.z += delta * (0.55 + (index % 5) * 0.16) * motionScale;
          star.position.y +=
            Math.sin(elapsed * 1.2 + phase) * delta * 0.12 * motionScale;
        });
      }
      signalIcons.rotation.y = elapsed * 0.32 * motionScale;
    }
    billboardActors.forEach((object) => {
      if (activeCamera) object.lookAt(activeCamera.position);
    });
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
    textures.forEach((item) => item.dispose());
    geometries.clear();
    materials.clear();
    textures.clear();
    interactiveTargets.clear();
    interactableSet.clear();
    targetBaseScales.clear();
    materialAppearances.clear();
    pulseActors.length = 0;
    grassActors.length = 0;
    dustActors.length = 0;
    bubbles.length = 0;
    webPulseActors.length = 0;
    rayActors.length = 0;
    billboardActors.length = 0;
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
