import * as THREE from "three";

export type YarnTwistLevel = "none" | "low" | "correct" | "high";
export type YarnQualityCheck = "thickness" | "strength" | "twist" | "winding";

export interface YarnMakerWorldSnapshot {
  stage: number;
  fibreYarnChecks: readonly string[];
  cardingStep: number;
  cardingSpeed: number;
  combingProgress: number;
  drawingSpeed: number;
  drawingProgress: number;
  twistLevel?: YarnTwistLevel;
  twistChecks: readonly string[];
  spinningStep: number;
  spinningDrawingSpeed: number;
  spinningTwist: number;
  yarnTension: number;
  windingStep: number;
  windingProgress: number;
  windingSpeed: number;
  guidePosition: number;
  qualityChecks: readonly YarnQualityCheck[];
  productChecks: readonly string[];
  sequenceCount: number;
  challengeStep: number;
  challengeScore: number;
  challengeChecks: readonly string[];
  completed: boolean;
  feedback: string;
  actionLabel: string;
  title: string;
  cue: string;
}

export interface YarnMakerWorld {
  root: THREE.Group;
  interactables: THREE.Object3D[];
  setSnapshot: (snapshot: YarnMakerWorldSnapshot) => void;
  update: (elapsed: number, activeCamera: THREE.Camera) => void;
  dispose: () => void;
}

interface CanvasCard {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  plane: THREE.Mesh;
}

interface GaugeModel {
  root: THREE.Group;
  needle: THREE.Mesh;
  face: THREE.Mesh;
  faceMaterial: THREE.MeshStandardMaterial;
}

interface BobbinModel {
  root: THREE.Group;
  core: THREE.Mesh;
  yarnLayers: THREE.Mesh[];
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const controlPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value > 0 && value <= 1) return value * 100;
  return clamp(value, 0, 100);
};

// The drawing activity expresses the second-roller speed as a multiplier:
// 1 is the balanced setting, values below it under-draw, and values above it
// can snap the roving. Accept percentages too so the world stays reusable.
const drawingSpeedPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value >= 0 && value <= 2) return value * 55;
  return clamp(value, 0, 100);
};

const progressPercent = (value: number, stepCount: number) => {
  if (!Number.isFinite(value)) return 0;
  return clamp(value <= stepCount ? (value / stepCount) * 100 : value, 0, 100);
};

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/u);
  let line = "";
  let lineIndex = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, y + lineIndex * lineHeight);
      line = word;
      lineIndex += 1;
      if (lineIndex >= maxLines) return;
    } else {
      line = candidate;
    }
  }
  if (line && lineIndex < maxLines) {
    context.fillText(line, x, y + lineIndex * lineHeight);
  }
}

function paintMissionCard(card: CanvasCard, snapshot: YarnMakerWorldSnapshot) {
  const context = card.canvas.getContext("2d");
  if (!context) return;
  const gradient = context.createLinearGradient(
    0,
    0,
    card.canvas.width,
    card.canvas.height,
  );
  gradient.addColorStop(0, "rgba(24, 22, 49, .98)");
  gradient.addColorStop(0.56, "rgba(68, 32, 76, .98)");
  gradient.addColorStop(1, "rgba(18, 68, 73, .98)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, card.canvas.width, card.canvas.height);
  context.strokeStyle = snapshot.completed ? "#86efac" : "#f7c85e";
  context.lineWidth = 8;
  context.strokeRect(7, 7, card.canvas.width - 14, card.canvas.height - 14);
  context.fillStyle = snapshot.completed ? "#86efac" : "#ffd775";
  context.font = "800 30px sans-serif";
  context.fillText(`YARN MAKER MISSION  •  ${snapshot.stage + 1}/10`, 42, 54);
  context.fillStyle = "#ffffff";
  context.font = "800 43px sans-serif";
  wrapText(context, snapshot.title, 42, 112, 940, 47, 2);
  context.fillStyle = "#e8f8f2";
  context.font = "28px sans-serif";
  wrapText(context, snapshot.cue, 42, 217, 940, 34, 3);
  if (snapshot.feedback) {
    context.fillStyle = "#ffedaa";
    context.font = "700 24px sans-serif";
    wrapText(context, snapshot.feedback, 42, 328, 940, 30, 2);
  }
  card.texture.needsUpdate = true;
}

function paintActionCard(card: CanvasCard, label: string, complete: boolean) {
  const context = card.canvas.getContext("2d");
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, card.canvas.width, 0);
  gradient.addColorStop(0, complete ? "#26965a" : "#7d3db0");
  gradient.addColorStop(1, complete ? "#85e99d" : "#e6a345");
  context.fillStyle = gradient;
  context.fillRect(0, 0, card.canvas.width, card.canvas.height);
  context.strokeStyle = "#fff6d2";
  context.lineWidth = 8;
  context.strokeRect(5, 5, card.canvas.width - 10, card.canvas.height - 10);
  context.fillStyle = "#161621";
  context.font = "800 40px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  wrapText(
    context,
    label,
    card.canvas.width / 2,
    card.canvas.height / 2 - 8,
    card.canvas.width - 48,
    44,
    2,
  );
  context.textAlign = "start";
  context.textBaseline = "alphabetic";
  card.texture.needsUpdate = true;
}

export function createYarnMakerWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): YarnMakerWorld {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

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
    name?: string,
  ) => {
    const result = new THREE.Mesh(shape, material);
    if (name) result.name = name;
    result.castShadow = true;
    result.receiveShadow = true;
    return result;
  };

  const makeCard = (
    width: number,
    height: number,
    canvasWidth = 1024,
    canvasHeight = 390,
    alwaysOnTop = false,
  ): CanvasCard => {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const plane = mesh(
      geometry(new THREE.PlaneGeometry(width, height)),
      basic({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: !alwaysOnTop,
      }),
    );
    plane.renderOrder = alwaysOnTop ? 120 : 30;
    return { canvas, texture, plane };
  };

  const textLabel = (
    text: string,
    width = 1.5,
    color = "#fff3c4",
    background = "rgba(29, 24, 51, .94)",
  ) => {
    const card = makeCard(width, 0.34, 720, 150);
    const context = card.canvas.getContext("2d");
    if (context) {
      context.fillStyle = background;
      context.fillRect(0, 0, card.canvas.width, card.canvas.height);
      context.strokeStyle = "#d7a94e";
      context.lineWidth = 5;
      context.strokeRect(4, 4, card.canvas.width - 8, card.canvas.height - 8);
      context.fillStyle = color;
      context.font = "800 42px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, card.canvas.width / 2, card.canvas.height / 2);
      card.texture.needsUpdate = true;
    }
    return card;
  };

  const addLabel = (
    parent: THREE.Object3D,
    text: string,
    position: THREE.Vector3,
    width = 1.5,
    color?: string,
  ) => {
    const label = textLabel(text, width, color);
    label.plane.position.copy(position);
    parent.add(label.plane);
    return label;
  };

  const root = new THREE.Group();
  root.name = "The Yarn Maker Mission wool factory";
  scene.add(root);

  const previousBackground = scene.background;
  const previousEnvironment = scene.environment;
  const previousFog = scene.fog;
  const environmentTexture = new THREE.TextureLoader().load(
    "/simulations/c7-ch03-a03-spinning-and-rolling-of-wool/environment.webp",
  );
  environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
  environmentTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(environmentTexture);
  scene.background = environmentTexture;
  scene.environment = environmentTexture;
  const factoryFog = new THREE.FogExp2(0x777184, 0.007);
  scene.fog = factoryFog;

  const hemisphere = new THREE.HemisphereLight(0xe9f6ff, 0x493b38, 2.2);
  const keyLight = new THREE.DirectionalLight(0xffddab, 3.8);
  keyLight.position.set(-4.8, 8.4, 5.4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 32;
  const fillLight = new THREE.PointLight(0x9ae9ff, 14, 12, 1.8);
  fillLight.position.set(3.8, 3.6, 2.5);
  scene.add(hemisphere, keyLight, fillLight);

  const floorMaterial = standard({
    color: 0x3f3f49,
    roughness: 0.82,
    metalness: 0.18,
  });
  const floor = mesh(
    geometry(new THREE.CircleGeometry(8.6, 96)),
    floorMaterial,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.05;
  root.add(floor);
  const workZone = mesh(
    geometry(new THREE.RingGeometry(3.25, 4.15, 72)),
    standard({ color: 0x806640, roughness: 0.7, metalness: 0.18 }),
  );
  workZone.rotation.x = -Math.PI / 2;
  workZone.position.y = -0.035;
  root.add(workZone);
  for (let index = 0; index < 12; index += 1) {
    const marker = mesh(
      geometry(new THREE.BoxGeometry(0.08, 0.018, 0.5)),
      basic({ color: index % 2 ? 0xf3b33f : 0x2f3038 }),
    );
    const angle = (index / 12) * Math.PI * 2;
    marker.position.set(Math.cos(angle) * 4.45, -0.025, Math.sin(angle) * 4.45);
    marker.rotation.y = -angle;
    root.add(marker);
  }

  const steel = standard({ color: 0x6b7480, metalness: 0.72, roughness: 0.3 });
  const darkSteel = standard({
    color: 0x30343b,
    metalness: 0.74,
    roughness: 0.3,
  });
  const brushedSteel = standard({
    color: 0xaeb9c5,
    metalness: 0.82,
    roughness: 0.22,
  });
  const rubber = standard({ color: 0x27252b, roughness: 0.92 });
  const safetyGreen = standard({
    color: 0x42cb6b,
    emissive: 0x155f2c,
    emissiveIntensity: 0.45,
    roughness: 0.42,
  });
  const warningRed = standard({
    color: 0xeb5b53,
    emissive: 0x74180f,
    emissiveIntensity: 0.52,
    roughness: 0.42,
  });
  const blueWool = standard({ color: 0x3284da, roughness: 1 });
  const redWool = standard({ color: 0xd84f5d, roughness: 1 });
  const greenWool = standard({ color: 0x4aad68, roughness: 1 });
  const creamWool = standard({ color: 0xe9ddc6, roughness: 1 });

  const machineBase = (width = 4.6, depth = 2.6) => {
    const group = new THREE.Group();
    const plinth = mesh(
      geometry(new THREE.BoxGeometry(width, 0.18, depth)),
      darkSteel,
    );
    plinth.position.y = 0.06;
    group.add(plinth);
    const inset = mesh(
      geometry(new THREE.BoxGeometry(width - 0.18, 0.04, depth - 0.18)),
      standard({ color: 0x555866, metalness: 0.38, roughness: 0.46 }),
    );
    inset.position.y = 0.17;
    group.add(inset);
    return group;
  };

  const machineFrame = (width: number, height: number, depth: number) => {
    const group = new THREE.Group();
    const beamGeometryVertical = geometry(
      new THREE.BoxGeometry(0.1, height, 0.1),
    );
    const beamGeometryHorizontal = geometry(
      new THREE.BoxGeometry(width, 0.1, 0.1),
    );
    for (const x of [-width / 2, width / 2]) {
      for (const z of [-depth / 2, depth / 2]) {
        const post = mesh(beamGeometryVertical, steel);
        post.position.set(x, height / 2, z);
        group.add(post);
      }
    }
    for (const y of [0.05, height - 0.05]) {
      for (const z of [-depth / 2, depth / 2]) {
        const beam = mesh(beamGeometryHorizontal, steel);
        beam.position.set(0, y, z);
        group.add(beam);
      }
    }
    return group;
  };

  const createFibreBundle = (
    color: number,
    width = 1.45,
    strandCount = 16,
    aligned = false,
  ) => {
    const group = new THREE.Group();
    const fibreMaterial = standard({ color, roughness: 0.98 });
    for (let index = 0; index < strandCount; index += 1) {
      const phase = index * 1.73;
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= 12; step += 1) {
        const x = -width / 2 + (step / 12) * width;
        const wave = aligned ? 0.018 : 0.1;
        points.push(
          new THREE.Vector3(
            x,
            (index - strandCount / 2) * 0.016 +
              Math.sin(step * 0.9 + phase) * wave,
            Math.cos(step * 0.7 + phase) * wave * 0.65,
          ),
        );
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const fibre = mesh(
        geometry(new THREE.TubeGeometry(curve, 28, 0.009, 5, false)),
        fibreMaterial,
        aligned ? "aligned-wool-fibre" : "loose-wool-fibre",
      );
      group.add(fibre);
    }
    return group;
  };

  const createHelicalBundle = (
    color: number,
    length = 1.65,
    turns = 5,
    radius = 0.055,
    strandCount = 4,
    tubeRadius = 0.018,
  ) => {
    const group = new THREE.Group();
    group.name = "twisted-fibre-bundle";
    const strandMaterial = standard({ color, roughness: 0.9 });
    for (let strand = 0; strand < strandCount; strand += 1) {
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= 72; step += 1) {
        const ratio = step / 72;
        const angle =
          ratio * turns * Math.PI * 2 + (strand / strandCount) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            (ratio - 0.5) * length,
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
          ),
        );
      }
      const curve = new THREE.CatmullRomCurve3(points);
      group.add(
        mesh(
          geometry(new THREE.TubeGeometry(curve, 80, tubeRadius, 6, false)),
          strandMaterial,
          "twisted-yarn-strand",
        ),
      );
    }
    return group;
  };

  const createRoller = (
    radius: number,
    length: number,
    material: THREE.Material,
    name: string,
  ) => {
    const group = new THREE.Group();
    group.name = name;
    const rollerGeometry = geometry(
      new THREE.CylinderGeometry(radius, radius, length, 32),
    );
    rollerGeometry.rotateX(Math.PI / 2);
    const drum = mesh(rollerGeometry, material, `${name}-drum`);
    group.add(drum);
    const axleGeometry = geometry(
      new THREE.CylinderGeometry(0.055, 0.055, length + 0.24, 16),
    );
    axleGeometry.rotateX(Math.PI / 2);
    group.add(mesh(axleGeometry, darkSteel));
    return group;
  };

  const createCardingRoller = (
    radius: number,
    length: number,
    color: number,
    name: string,
  ) => {
    const roller = createRoller(
      radius,
      length,
      standard({ color, metalness: 0.55, roughness: 0.38 }),
      name,
    );
    const pinMaterial = standard({
      color: 0xdbe4eb,
      metalness: 0.9,
      roughness: 0.18,
    });
    const pinGeometry = geometry(new THREE.BoxGeometry(0.018, 0.11, 0.018));
    const pinCount = 7 * 18;
    const pins = new THREE.InstancedMesh(pinGeometry, pinMaterial, pinCount);
    pins.name = "carding-wire-pins";
    pins.castShadow = true;
    pins.receiveShadow = true;
    const pinTransform = new THREE.Object3D();
    let pinIndex = 0;
    for (let row = 0; row < 7; row += 1) {
      for (let spoke = 0; spoke < 18; spoke += 1) {
        const angle = (spoke / 18) * Math.PI * 2 + (row % 2) * 0.12;
        pinTransform.position.set(
          Math.sin(angle) * (radius + 0.05),
          Math.cos(angle) * (radius + 0.05),
          -length / 2 + 0.12 + (row / 6) * (length - 0.24),
        );
        pinTransform.rotation.set(0, 0, -angle);
        pinTransform.updateMatrix();
        pins.setMatrixAt(pinIndex, pinTransform.matrix);
        pinIndex += 1;
      }
    }
    pins.instanceMatrix.needsUpdate = true;
    roller.add(pins);
    return roller;
  };

  const createGauge = (label: string, accent: number): GaugeModel => {
    const rootGroup = new THREE.Group();
    const faceMaterial = standard({
      color: 0x26313a,
      emissive: 0x11171b,
      emissiveIntensity: 0.35,
      metalness: 0.28,
      roughness: 0.48,
    });
    const face = mesh(
      geometry(new THREE.CylinderGeometry(0.38, 0.38, 0.09, 40)),
      faceMaterial,
    );
    face.rotation.x = Math.PI / 2;
    rootGroup.add(face);
    const bezel = mesh(
      geometry(new THREE.TorusGeometry(0.38, 0.045, 10, 40)),
      standard({ color: 0xa7b2bd, metalness: 0.86, roughness: 0.2 }),
    );
    rootGroup.add(bezel);
    const greenArc = mesh(
      geometry(new THREE.TorusGeometry(0.3, 0.035, 8, 22, Math.PI * 0.65)),
      standard({ color: accent, emissive: accent, emissiveIntensity: 0.4 }),
    );
    greenArc.rotation.z = -Math.PI * 0.82;
    greenArc.position.z = 0.055;
    rootGroup.add(greenArc);
    const needle = mesh(
      geometry(new THREE.BoxGeometry(0.035, 0.27, 0.025)),
      standard({ color: 0xffeb9c, emissive: 0x8a6b13, emissiveIntensity: 0.6 }),
    );
    needle.position.set(0, 0.12, 0.09);
    needle.geometry.translate(0, 0.11, 0);
    needle.rotation.z = Math.PI * 0.7;
    rootGroup.add(needle);
    const hub = mesh(
      geometry(new THREE.SphereGeometry(0.06, 16, 10)),
      brushedSteel,
    );
    hub.position.z = 0.1;
    rootGroup.add(hub);
    addLabel(rootGroup, label, new THREE.Vector3(0, -0.58, 0), 1.05, "#e8f7ff");
    return { root: rootGroup, needle, face, faceMaterial };
  };

  const createBobbin = (color: number, layerCount = 18): BobbinModel => {
    const group = new THREE.Group();
    group.name = "yarn-bobbin";
    const coreGeometry = geometry(
      new THREE.CylinderGeometry(0.25, 0.25, 1.6, 32),
    );
    coreGeometry.rotateZ(Math.PI / 2);
    const core = mesh(coreGeometry, brushedSteel, "bobbin-core");
    group.add(core);
    const flangeGeometry = geometry(
      new THREE.CylinderGeometry(0.58, 0.58, 0.1, 36),
    );
    flangeGeometry.rotateZ(Math.PI / 2);
    for (const side of [-1, 1]) {
      const flange = mesh(flangeGeometry, steel, "bobbin-flange");
      flange.position.x = side * 0.78;
      group.add(flange);
    }
    const yarnMaterial = standard({ color, roughness: 0.94 });
    const yarnLayers: THREE.Mesh[] = [];
    for (let index = 0; index < layerCount; index += 1) {
      const layer = mesh(
        geometry(
          new THREE.TorusGeometry(0.34 + (index % 3) * 0.018, 0.035, 8, 30),
        ),
        yarnMaterial,
        "wound-yarn-layer",
      );
      layer.rotation.y = Math.PI / 2;
      layer.position.x = -0.64 + (index / Math.max(1, layerCount - 1)) * 1.28;
      group.add(layer);
      yarnLayers.push(layer);
    }
    return { root: group, core, yarnLayers };
  };

  const interactables: THREE.Object3D[] = [];
  const interactive = <T extends THREE.Object3D>(item: T, name: string): T => {
    item.name = name;
    item.userData.interactive = true;
    item.userData.interaction = name;
    interactables.push(item);
    return item;
  };

  // Stage 1: compare a fragile fibre with finished yarn.
  const comparison = new THREE.Group();
  comparison.name = "fibre-versus-yarn-stage";
  comparison.add(machineBase(5.6, 2.7));
  const loosePod = new THREE.Group();
  loosePod.position.set(-1.55, 1.2, 0);
  const looseFibre = createFibreBundle(0x65a9ef, 1.45, 18, false);
  looseFibre.rotation.z = Math.PI / 2;
  loosePod.add(looseFibre);
  const looseRing = mesh(
    geometry(new THREE.TorusGeometry(0.72, 0.055, 10, 48)),
    standard({ color: 0x64c5ef, emissive: 0x194b68, emissiveIntensity: 0.5 }),
  );
  loosePod.add(looseRing);
  interactive(loosePod, "yarn-maker-loose-fibre-sample");
  comparison.add(loosePod);
  addLabel(
    comparison,
    "SINGLE FIBRES",
    new THREE.Vector3(-1.55, 2.35, 0),
    1.75,
  );

  const yarnPod = new THREE.Group();
  yarnPod.position.set(1.55, 1.2, 0);
  const strongYarn = createHelicalBundle(0xd95c70, 1.55, 6, 0.075, 5, 0.021);
  strongYarn.rotation.z = Math.PI / 2;
  yarnPod.add(strongYarn);
  const yarnRing = mesh(
    geometry(new THREE.TorusGeometry(0.72, 0.055, 10, 48)),
    standard({ color: 0xe89a72, emissive: 0x69351c, emissiveIntensity: 0.5 }),
  );
  yarnPod.add(yarnRing);
  interactive(yarnPod, "yarn-maker-finished-yarn-sample");
  comparison.add(yarnPod);
  addLabel(comparison, "TWISTED YARN", new THREE.Vector3(1.55, 2.35, 0), 1.75);

  const magnifier = interactive(
    mesh(
      geometry(new THREE.TorusGeometry(1.22, 0.045, 10, 64)),
      basic({ color: 0xf7d068, transparent: true, opacity: 0.84 }),
    ),
    "yarn-maker-magnified-twist",
  );
  magnifier.position.set(0, 1.24, -0.55);
  comparison.add(magnifier);
  root.add(comparison);

  // Stage 2: protected carding rollers open the dyed wool.
  const carding = new THREE.Group();
  carding.name = "carding-stage";
  carding.add(machineBase(6.1, 3.1));
  const cardingFrame = machineFrame(3.2, 2.15, 1.65);
  cardingFrame.position.set(0.3, 0.18, 0);
  carding.add(cardingFrame);
  const feedBelt = interactive(
    mesh(
      geometry(new THREE.BoxGeometry(1.65, 0.14, 1.15)),
      standard({ color: 0x323238, roughness: 0.84 }),
      "carding-feed-conveyor",
    ),
    "yarn-maker-carding-feed",
  );
  feedBelt.position.set(-2.05, 0.58, 0);
  carding.add(feedBelt);
  const feedBundle = createFibreBundle(0x3988d6, 1.15, 24, false);
  feedBundle.position.set(-2.05, 0.78, 0);
  carding.add(feedBundle);
  const cardingRollerA = createCardingRoller(
    0.58,
    1.35,
    0x61758e,
    "carding-main-roller",
  );
  cardingRollerA.position.set(-0.2, 1.12, 0);
  carding.add(cardingRollerA);
  const cardingRollerB = createCardingRoller(
    0.42,
    1.35,
    0x8d657d,
    "carding-worker-roller",
  );
  cardingRollerB.position.set(0.78, 1.45, 0);
  carding.add(cardingRollerB);
  const cardingRollerC = createCardingRoller(
    0.32,
    1.35,
    0x4d8291,
    "carding-doffer-roller",
  );
  cardingRollerC.position.set(1.38, 0.88, 0);
  carding.add(cardingRollerC);
  const cardingRollers = [cardingRollerA, cardingRollerB, cardingRollerC];

  const coverMaterial = standard({
    color: 0xa4e8f4,
    transparent: true,
    opacity: 0.2,
    roughness: 0.1,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const safetyCover = interactive(
    mesh(
      geometry(new THREE.BoxGeometry(3.35, 1.72, 1.78)),
      coverMaterial,
      "carding-transparent-safety-cover",
    ),
    "yarn-maker-carding-cover",
  );
  safetyCover.position.set(0.35, 1.26, 0);
  carding.add(safetyCover);
  const startButton = interactive(
    mesh(
      geometry(new THREE.CylinderGeometry(0.18, 0.18, 0.13, 28)),
      safetyGreen,
    ),
    "yarn-maker-carding-start",
  );
  startButton.rotation.x = Math.PI / 2;
  startButton.position.set(2.42, 1.0, 0.89);
  carding.add(startButton);
  const cardingGauge = createGauge("ROLLER SPEED", 0x55dc79);
  cardingGauge.root.position.set(2.45, 1.85, 0.15);
  interactive(cardingGauge.root, "yarn-maker-carding-speed");
  carding.add(cardingGauge.root);
  const cardedWeb = createFibreBundle(0x4b9be5, 1.4, 30, true);
  cardedWeb.scale.set(1, 2.8, 2.2);
  cardedWeb.position.set(2.0, 0.72, 0);
  cardedWeb.rotation.z = 0.04;
  carding.add(cardedWeb);
  const wasteTray = mesh(
    geometry(new THREE.BoxGeometry(1.65, 0.16, 1.4)),
    standard({ color: 0x515762, metalness: 0.54, roughness: 0.42 }),
    "carding-waste-tray",
  );
  wasteTray.position.set(0.25, 0.27, 0);
  carding.add(wasteTray);
  const cardingWaste: THREE.Mesh[] = [];
  for (let index = 0; index < 18; index += 1) {
    const mote = mesh(
      geometry(new THREE.IcosahedronGeometry(0.025 + (index % 3) * 0.006, 0)),
      standard({ color: index % 2 ? 0x806c54 : 0xb6a37f, roughness: 1 }),
      "carding-separated-particle",
    );
    mote.position.set(
      -0.5 + (index % 6) * 0.2,
      0.38,
      -0.45 + Math.floor(index / 6) * 0.42,
    );
    wasteTray.add(mote);
    cardingWaste.push(mote);
  }
  addLabel(
    carding,
    "CARDING • OPEN & SEPARATE",
    new THREE.Vector3(0, 2.75, 0),
    2.9,
  );
  root.add(carding);

  // Stage 3: combing pins align the fibres and reject short pieces.
  const combing = new THREE.Group();
  combing.name = "combing-stage";
  combing.add(machineBase(5.9, 3.0));
  const combBed = mesh(
    geometry(new THREE.BoxGeometry(4.5, 0.22, 1.45)),
    steel,
    "combing-bed",
  );
  combBed.position.y = 0.55;
  combing.add(combBed);
  const combWeb = createFibreBundle(0xd95764, 3.5, 34, false);
  combWeb.position.set(0, 0.82, 0);
  combWeb.scale.y = 1.7;
  combing.add(combWeb);
  const combPins = new THREE.Group();
  combPins.name = "combing-pin-carriage";
  const combPinGeometry = geometry(new THREE.ConeGeometry(0.025, 0.58, 8));
  for (let row = 0; row < 4; row += 1) {
    for (let index = 0; index < 15; index += 1) {
      const pin = mesh(combPinGeometry, brushedSteel, "combing-pin");
      pin.position.set(-0.82 + index * 0.115, 1.0, -0.45 + row * 0.3);
      combPins.add(pin);
    }
  }
  combPins.position.x = -1.35;
  combing.add(combPins);
  const combHandle = interactive(
    mesh(
      geometry(new THREE.CylinderGeometry(0.075, 0.075, 1.25, 16)),
      standard({ color: 0xe7a43f, roughness: 0.55 }),
    ),
    "yarn-maker-combing-handle",
  );
  combHandle.rotation.z = Math.PI / 2;
  combHandle.position.set(-1.35, 1.72, 0.82);
  combing.add(combHandle);
  const combDirection: THREE.Mesh[] = [];
  for (let index = 0; index < 5; index += 1) {
    const arrow = mesh(
      geometry(new THREE.ConeGeometry(0.09, 0.25, 12)),
      basic({ color: 0x6de5e1, transparent: true, opacity: 0.8 }),
      "combing-direction-arrow",
    );
    arrow.rotation.z = -Math.PI / 2;
    arrow.position.set(-1.3 + index * 0.65, 1.8, 0);
    combing.add(arrow);
    combDirection.push(arrow);
  }
  const combedSliver = createFibreBundle(0xdc6170, 3.2, 28, true);
  combedSliver.position.set(0, 0.84, -0.03);
  combedSliver.scale.set(1, 1.4, 1.4);
  combing.add(combedSliver);
  const shortFibreTray = mesh(
    geometry(new THREE.BoxGeometry(2.2, 0.14, 0.7)),
    darkSteel,
    "short-fibre-tray",
  );
  shortFibreTray.position.set(0, 0.27, -0.98);
  combing.add(shortFibreTray);
  const shortFibres: THREE.Mesh[] = [];
  for (let index = 0; index < 14; index += 1) {
    const shortFibre = mesh(
      geometry(new THREE.BoxGeometry(0.16 + (index % 4) * 0.03, 0.018, 0.018)),
      redWool,
      "rejected-short-fibre",
    );
    shortFibre.position.set(
      -0.85 + (index % 7) * 0.28,
      0.38,
      -1.08 + Math.floor(index / 7) * 0.2,
    );
    shortFibre.rotation.y = index * 0.72;
    combing.add(shortFibre);
    shortFibres.push(shortFibre);
  }
  addLabel(
    combing,
    "COMBING • ALIGN LONG FIBRES",
    new THREE.Vector3(0, 2.58, 0),
    3.05,
  );
  addLabel(combing, "SLIVER", new THREE.Vector3(2.2, 1.15, 0), 1.1, "#ffc6d0");
  root.add(combing);

  // Stage 4: two roller pairs draw thick sliver into roving.
  const drawing = new THREE.Group();
  drawing.name = "drawing-and-roving-stage";
  drawing.add(machineBase(6.1, 2.9));
  const drawingFrame = machineFrame(4.3, 2.0, 1.45);
  drawingFrame.position.y = 0.2;
  drawing.add(drawingFrame);
  const drawingRollers: THREE.Group[] = [];
  for (const x of [-1.45, 1.15]) {
    for (const y of [0.84, 1.42]) {
      const roller = createRoller(0.28, 1.28, rubber, "drawing-roller");
      roller.position.set(x, y, 0);
      drawing.add(roller);
      drawingRollers.push(roller);
    }
  }
  const thickSliver = createFibreBundle(0x54ad73, 1.65, 34, true);
  thickSliver.position.set(-2.25, 1.12, 0);
  thickSliver.scale.set(1, 2.5, 2.1);
  drawing.add(thickSliver);
  const drawnRoving = createFibreBundle(0x54ad73, 2.35, 20, true);
  drawnRoving.position.set(0.02, 1.12, 0);
  drawing.add(drawnRoving);
  const rovingOutput = createFibreBundle(0x54ad73, 1.3, 14, true);
  rovingOutput.position.set(2.25, 1.12, 0);
  rovingOutput.scale.set(1, 0.68, 0.68);
  drawing.add(rovingOutput);
  const brokenRovingLeft = createFibreBundle(0x54ad73, 0.78, 12, true);
  brokenRovingLeft.position.set(0.25, 1.12, 0);
  const brokenRovingRight = createFibreBundle(0x54ad73, 0.78, 12, true);
  brokenRovingRight.position.set(1.26, 1.12, 0);
  drawing.add(brokenRovingLeft, brokenRovingRight);
  const drawingGauge = createGauge("DRAWING SPEED", 0x63df87);
  drawingGauge.root.position.set(2.42, 1.83, 0.15);
  interactive(drawingGauge.root, "yarn-maker-drawing-speed");
  drawing.add(drawingGauge.root);
  interactive(drawingRollers[2], "yarn-maker-drawing-rollers");
  const thicknessMeter = new THREE.Group();
  thicknessMeter.position.set(0, 2.42, 0);
  const thicknessTrack = mesh(
    geometry(new THREE.BoxGeometry(2.15, 0.12, 0.08)),
    standard({ color: 0x4d5560, metalness: 0.55, roughness: 0.42 }),
  );
  thicknessMeter.add(thicknessTrack);
  const thicknessZone = mesh(
    geometry(new THREE.BoxGeometry(0.66, 0.17, 0.11)),
    standard({ color: 0x5bd37a, emissive: 0x185b2b, emissiveIntensity: 0.52 }),
  );
  thicknessMeter.add(thicknessZone);
  const thicknessPointer = mesh(
    geometry(new THREE.ConeGeometry(0.1, 0.25, 12)),
    standard({ color: 0xffdb6b, emissive: 0x78560e, emissiveIntensity: 0.52 }),
  );
  thicknessPointer.position.y = 0.28;
  thicknessPointer.rotation.z = Math.PI;
  thicknessMeter.add(thicknessPointer);
  drawing.add(thicknessMeter);
  addLabel(drawing, "THICK SLIVER", new THREE.Vector3(-2.15, 1.72, 0), 1.45);
  addLabel(drawing, "THIN ROVING", new THREE.Vector3(2.05, 0.58, 0), 1.45);
  root.add(drawing);

  // Stage 5: discover how twist changes strength and flexibility.
  const twistExperiment = new THREE.Group();
  twistExperiment.name = "twist-experiment-stage";
  twistExperiment.add(machineBase(6.3, 3.0));
  const twistPods: THREE.Group[] = [];
  const twistCores: THREE.Object3D[] = [];
  const twistSpecs: Array<{
    id: YarnTwistLevel;
    label: string;
    x: number;
    color: number;
  }> = [
    { id: "none", label: "NO TWIST", x: -2.0, color: 0x56a9e8 },
    { id: "high", label: "TOO MUCH", x: 0, color: 0xe85b63 },
    { id: "correct", label: "CORRECT TWIST", x: 2.0, color: 0x53c779 },
  ];
  twistSpecs.forEach((spec) => {
    const pod = new THREE.Group();
    pod.position.x = spec.x;
    const stand = mesh(
      geometry(new THREE.CylinderGeometry(0.72, 0.84, 0.18, 36)),
      darkSteel,
    );
    stand.position.y = 0.22;
    pod.add(stand);
    const halo = mesh(
      geometry(new THREE.TorusGeometry(0.76, 0.055, 10, 44)),
      standard({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 0.22,
      }),
      `${spec.id}-twist-halo`,
    );
    halo.position.y = 1.25;
    pod.add(halo);
    let sample: THREE.Object3D;
    if (spec.id === "none") {
      sample = createFibreBundle(spec.color, 1.55, 18, true);
    } else {
      sample = createHelicalBundle(
        spec.color,
        1.6,
        spec.id === "high" ? 13 : 6,
        spec.id === "high" ? 0.12 : 0.065,
        5,
        0.018,
      );
    }
    sample.rotation.z = Math.PI / 2;
    sample.position.y = 1.25;
    pod.add(sample);
    twistCores.push(sample);
    const pullTop = mesh(
      geometry(new THREE.BoxGeometry(0.42, 0.12, 0.22)),
      brushedSteel,
    );
    pullTop.position.y = 2.12;
    const pullBottom = mesh(
      geometry(new THREE.BoxGeometry(0.42, 0.12, 0.22)),
      brushedSteel,
    );
    pullBottom.position.y = 0.4;
    pod.add(pullTop, pullBottom);
    addLabel(pod, spec.label, new THREE.Vector3(0, 2.55, 0), 1.65);
    interactive(pod, `yarn-maker-twist-${spec.id}`);
    twistExperiment.add(pod);
    twistPods.push(pod);
  });
  root.add(twistExperiment);

  // Stage 6: operate a spinning machine with drawing, twist, and tension controls.
  const spinning = new THREE.Group();
  spinning.name = "spinning-machine-stage";
  spinning.add(machineBase(6.6, 3.4));
  const spinFrame = machineFrame(4.0, 2.45, 1.8);
  spinFrame.position.set(-0.55, 0.2, 0);
  spinning.add(spinFrame);
  const spinningRollers: THREE.Group[] = [];
  for (const x of [-1.6, -0.92]) {
    for (const y of [1.0, 1.46]) {
      const roller = createRoller(
        0.21,
        1.42,
        rubber,
        "spinning-drawing-roller",
      );
      roller.position.set(x, y, 0);
      spinning.add(roller);
      spinningRollers.push(roller);
    }
  }
  const spinFeed = createFibreBundle(0x5da4e9, 1.25, 18, true);
  spinFeed.position.set(-2.34, 1.22, 0);
  spinFeed.scale.set(1, 1.15, 1.15);
  spinning.add(spinFeed);
  interactive(spinFeed, "yarn-maker-spinning-feed");
  const spinDraft = createFibreBundle(0x5da4e9, 1.18, 14, true);
  spinDraft.position.set(-0.25, 1.22, 0);
  spinDraft.scale.set(1, 0.58, 0.58);
  spinning.add(spinDraft);
  const spunYarn = createHelicalBundle(0x4f9be3, 1.82, 6, 0.045, 4, 0.014);
  spunYarn.position.set(0.95, 1.22, 0);
  spinning.add(spunYarn);
  const spinBreakLeft = createHelicalBundle(0x4f9be3, 0.62, 3, 0.045, 4, 0.014);
  spinBreakLeft.position.set(0.35, 1.22, 0);
  const spinBreakRight = createHelicalBundle(
    0x4f9be3,
    0.62,
    3,
    0.045,
    4,
    0.014,
  );
  spinBreakRight.position.set(1.34, 1.22, 0);
  spinning.add(spinBreakLeft, spinBreakRight);
  const looseLoops = new THREE.Group();
  for (let index = 0; index < 4; index += 1) {
    const loop = mesh(
      geometry(
        new THREE.TorusGeometry(
          0.18 + index * 0.025,
          0.018,
          8,
          24,
          Math.PI * 1.5,
        ),
      ),
      blueWool,
      "low-tension-yarn-loop",
    );
    loop.position.set(0.25 + index * 0.42, 1.05 - (index % 2) * 0.14, 0);
    loop.rotation.y = Math.PI / 2;
    looseLoops.add(loop);
  }
  spinning.add(looseLoops);
  const flyer = new THREE.Group();
  flyer.name = "spinning-flyer";
  flyer.position.set(1.7, 1.2, 0);
  const flyerRing = mesh(
    geometry(new THREE.TorusGeometry(0.52, 0.055, 10, 40)),
    brushedSteel,
  );
  flyerRing.rotation.y = Math.PI / 2;
  flyer.add(flyerRing);
  for (const side of [-1, 1]) {
    const arm = mesh(geometry(new THREE.BoxGeometry(0.05, 0.72, 0.05)), steel);
    arm.position.y = side * 0.33;
    flyer.add(arm);
  }
  spinning.add(flyer);
  const spinBobbin = createBobbin(0x4f9be3, 12);
  spinBobbin.root.scale.setScalar(0.72);
  spinBobbin.root.position.set(1.9, 0.65, 0);
  spinning.add(spinBobbin.root);

  const spinDrawingGauge = createGauge("DRAW", 0x60d883);
  spinDrawingGauge.root.position.set(-2.45, 2.25, 0.2);
  interactive(spinDrawingGauge.root, "yarn-maker-spinning-drawing-control");
  spinning.add(spinDrawingGauge.root);
  const spinTwistGauge = createGauge("TWIST", 0x60d883);
  spinTwistGauge.root.position.set(2.55, 2.25, 0.2);
  interactive(spinTwistGauge.root, "yarn-maker-spinning-twist-control");
  spinning.add(spinTwistGauge.root);
  const spinTensionGauge = createGauge("TENSION", 0x60d883);
  spinTensionGauge.root.position.set(2.55, 1.0, 0.25);
  interactive(spinTensionGauge.root, "yarn-maker-spinning-tension-control");
  spinning.add(spinTensionGauge.root);
  addLabel(
    spinning,
    "TRANSPARENT SPINNING MACHINE",
    new THREE.Vector3(0, 3.0, 0),
    3.2,
  );
  root.add(spinning);

  // Stage 7: guide the yarn evenly across a winding bobbin.
  const winding = new THREE.Group();
  winding.name = "rolling-and-winding-stage";
  winding.add(machineBase(6.0, 3.2));
  const windingFrame = machineFrame(4.0, 2.2, 1.8);
  windingFrame.position.y = 0.18;
  winding.add(windingFrame);
  const windingBobbin = createBobbin(0xdb5868, 24);
  windingBobbin.root.position.set(0.2, 1.15, 0);
  interactive(windingBobbin.root, "yarn-maker-winding-bobbin");
  winding.add(windingBobbin.root);
  const windingRail = mesh(
    geometry(new THREE.BoxGeometry(3.1, 0.08, 0.08)),
    brushedSteel,
    "winding-guide-rail",
  );
  windingRail.position.set(0.2, 2.03, 0.78);
  winding.add(windingRail);
  const yarnGuide = new THREE.Group();
  yarnGuide.name = "winding-yarn-guide";
  const guideStem = mesh(
    geometry(new THREE.BoxGeometry(0.07, 0.62, 0.07)),
    steel,
  );
  guideStem.position.y = -0.28;
  yarnGuide.add(guideStem);
  const guideEye = mesh(
    geometry(new THREE.TorusGeometry(0.15, 0.035, 10, 28)),
    standard({ color: 0xf2c356, metalness: 0.45, roughness: 0.35 }),
  );
  yarnGuide.add(guideEye);
  yarnGuide.position.set(0.2, 2.03, 0.78);
  interactive(yarnGuide, "yarn-maker-winding-guide");
  winding.add(yarnGuide);
  const incomingYarnPoints = [
    new THREE.Vector3(-2.7, 1.85, 0.78),
    new THREE.Vector3(-1.4, 1.82, 0.78),
    new THREE.Vector3(0.2, 2.0, 0.78),
    new THREE.Vector3(0.2, 1.48, 0.2),
  ];
  const incomingYarn = mesh(
    geometry(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(incomingYarnPoints),
        44,
        0.022,
        7,
        false,
      ),
    ),
    redWool,
    "winding-incoming-yarn",
  );
  winding.add(incomingYarn);
  const windingGauge = createGauge("WIND SPEED", 0x5bd57b);
  windingGauge.root.position.set(2.38, 2.12, 0.15);
  interactive(windingGauge.root, "yarn-maker-winding-speed");
  winding.add(windingGauge.root);
  const centreBulge = new THREE.Group();
  centreBulge.name = "uneven-winding-bulge";
  for (let index = 0; index < 8; index += 1) {
    const layer = mesh(
      geometry(new THREE.TorusGeometry(0.45 + index * 0.017, 0.045, 8, 32)),
      redWool,
    );
    layer.rotation.y = Math.PI / 2;
    layer.position.x = -0.18 + index * 0.05;
    centreBulge.add(layer);
  }
  centreBulge.position.set(0.2, 1.15, 0);
  winding.add(centreBulge);
  addLabel(
    winding,
    "EVEN LAYERS PREVENT TANGLES",
    new THREE.Vector3(0, 2.9, 0),
    3.0,
  );
  root.add(winding);

  // Stage 8: inspect thickness, strength, twist, and winding.
  const quality = new THREE.Group();
  quality.name = "yarn-quality-inspection-stage";
  quality.add(machineBase(6.2, 3.2));
  const qualityYarn = createHelicalBundle(0x4baa72, 3.6, 11, 0.055, 5, 0.017);
  qualityYarn.position.set(0, 1.35, 0);
  quality.add(qualityYarn);
  for (const x of [-2.05, 2.05]) {
    const clampBlock = mesh(
      geometry(new THREE.BoxGeometry(0.32, 0.72, 0.42)),
      darkSteel,
      "quality-strength-clamp",
    );
    clampBlock.position.set(x, 1.35, 0);
    quality.add(clampBlock);
  }
  const laserScanner = new THREE.Group();
  laserScanner.name = "quality-laser-scanner";
  const scannerArch = mesh(
    geometry(new THREE.TorusGeometry(0.63, 0.075, 10, 40, Math.PI)),
    standard({ color: 0x5d798c, metalness: 0.7, roughness: 0.28 }),
  );
  scannerArch.rotation.z = Math.PI / 2;
  laserScanner.add(scannerArch);
  const laserLine = mesh(
    geometry(new THREE.BoxGeometry(0.025, 1.18, 0.025)),
    basic({ color: 0x62fff3, transparent: true, opacity: 0.88 }),
  );
  laserScanner.add(laserLine);
  laserScanner.position.set(-1.55, 1.35, 0);
  quality.add(laserScanner);
  const qualityIds: YarnQualityCheck[] = [
    "thickness",
    "strength",
    "twist",
    "winding",
  ];
  const qualityStations: THREE.Group[] = [];
  const qualityCores: THREE.Mesh[] = [];
  qualityIds.forEach((id, index) => {
    const station = new THREE.Group();
    station.position.set(-2.35 + index * 1.57, 0.43, 0.78);
    const base = mesh(
      geometry(new THREE.CylinderGeometry(0.46, 0.52, 0.18, 30)),
      darkSteel,
    );
    station.add(base);
    const core = mesh(
      geometry(new THREE.OctahedronGeometry(0.22, 1)),
      standard({
        color: 0xd18a3d,
        emissive: 0x673008,
        emissiveIntensity: 0.35,
        roughness: 0.38,
      }),
      `quality-${id}-indicator`,
    );
    core.position.y = 0.45;
    station.add(core);
    addLabel(station, id.toUpperCase(), new THREE.Vector3(0, -0.35, 0), 1.22);
    interactive(station, `yarn-maker-quality-${id}`);
    quality.add(station);
    qualityStations.push(station);
    qualityCores.push(core);
  });
  const approvedShield = mesh(
    geometry(new THREE.TorusGeometry(2.42, 0.06, 10, 64)),
    basic({ color: 0x75ee98, transparent: true, opacity: 0.8 }),
    "quality-approved-shield",
  );
  approvedShield.position.set(0, 1.35, -0.35);
  quality.add(approvedShield);
  addLabel(quality, "YARN QUALITY LAB", new THREE.Vector3(0, 2.85, 0), 2.4);
  root.add(quality);

  // Stage 9: coloured bobbins, product silhouettes, and the process summary.
  const products = new THREE.Group();
  products.name = "products-and-process-summary-stage";
  products.add(machineBase(6.8, 3.8));
  const summaryBobbins: BobbinModel[] = [];
  [
    { color: 0x3f91e6, x: -1.15 },
    { color: 0xd94f60, x: 0 },
    { color: 0x4eb56a, x: 1.15 },
  ].forEach((item) => {
    const bobbin = createBobbin(item.color, 18);
    bobbin.root.scale.setScalar(0.62);
    bobbin.root.position.set(item.x, 2.15, 0);
    bobbin.root.rotation.z = Math.PI / 2;
    products.add(bobbin.root);
    summaryBobbins.push(bobbin);
  });

  const productModels: THREE.Group[] = [];
  const productIds = ["sweater", "cloth", "scarf", "rug"];
  const productColors = [0xd95764, 0x3d93da, 0x55b872, 0xd2a347];
  productIds.forEach((id, index) => {
    const model = new THREE.Group();
    model.position.set(-2.25 + index * 1.5, 0.75, 0.3);
    const material = standard({ color: productColors[index], roughness: 0.94 });
    if (id === "sweater") {
      const torso = mesh(
        geometry(new THREE.BoxGeometry(0.72, 0.78, 0.13)),
        material,
      );
      model.add(torso);
      for (const side of [-1, 1]) {
        const sleeve = mesh(
          geometry(new THREE.BoxGeometry(0.5, 0.22, 0.13)),
          material,
        );
        sleeve.position.set(side * 0.47, 0.17, 0);
        sleeve.rotation.z = side * 0.48;
        model.add(sleeve);
      }
    } else if (id === "cloth") {
      const cloth = mesh(
        geometry(new THREE.PlaneGeometry(0.95, 0.82, 8, 8)),
        material,
      );
      cloth.rotation.x = -0.18;
      model.add(cloth);
    } else if (id === "scarf") {
      const scarf = mesh(
        geometry(new THREE.BoxGeometry(0.42, 1.05, 0.1)),
        material,
      );
      scarf.rotation.z = 0.16;
      model.add(scarf);
      for (let tasselIndex = 0; tasselIndex < 5; tasselIndex += 1) {
        const tassel = mesh(
          geometry(new THREE.BoxGeometry(0.025, 0.18, 0.025)),
          material,
        );
        tassel.position.set(-0.16 + tasselIndex * 0.08, -0.6, 0);
        model.add(tassel);
      }
    } else {
      const rug = mesh(
        geometry(new THREE.BoxGeometry(1.0, 0.72, 0.08)),
        material,
      );
      model.add(rug);
      for (let stripe = 0; stripe < 4; stripe += 1) {
        const stripeMesh = mesh(
          geometry(new THREE.BoxGeometry(0.9, 0.045, 0.03)),
          standard({ color: stripe % 2 ? 0x8d4a56 : 0xefe1b4, roughness: 1 }),
        );
        stripeMesh.position.set(0, -0.25 + stripe * 0.16, 0.06);
        model.add(stripeMesh);
      }
    }
    addLabel(model, id.toUpperCase(), new THREE.Vector3(0, -0.78, 0), 1.15);
    interactive(model, `yarn-maker-product-${id}`);
    products.add(model);
    productModels.push(model);
  });

  const processIds = [
    "coloured wool",
    "carding",
    "combing",
    "sliver",
    "drawing",
    "roving",
    "spinning",
    "winding",
    "yarn",
  ];
  const processNodes: THREE.Mesh[] = [];
  processIds.forEach((id, index) => {
    const angle =
      Math.PI * 0.08 + (index / (processIds.length - 1)) * Math.PI * 0.84;
    const node = interactive(
      mesh(
        geometry(new THREE.CylinderGeometry(0.25, 0.28, 0.18, 24)),
        standard({
          color: 0x765a87,
          emissive: 0x24152e,
          emissiveIntensity: 0.16,
          roughness: 0.46,
        }),
        `process-${id}`,
      ),
      `yarn-maker-process-${id.replace(/\s+/gu, "-")}`,
    );
    node.position.set(
      Math.cos(angle) * 3.0,
      0.26,
      -0.15 - Math.sin(angle) * 1.35,
    );
    products.add(node);
    addLabel(
      products,
      id.toUpperCase(),
      node.position.clone().add(new THREE.Vector3(0, 0.54, 0)),
      id === "coloured wool" ? 1.35 : 1.05,
    );
    processNodes.push(node);
  });
  addLabel(
    products,
    "BUILD THE WOOL-TO-YARN PROCESS LINE",
    new THREE.Vector3(0, 3.12, 0),
    5.25,
  );
  root.add(products);

  // Stage 10: independent line-building and machine-operation challenge.
  const challenge = new THREE.Group();
  challenge.name = "final-independent-yarn-challenge-stage";
  challenge.add(machineBase(7.0, 3.8));
  const challengeIds = ["carding", "combing", "drawing", "spinning", "winding"];
  const challengeModules: THREE.Group[] = [];
  const challengeCores: THREE.Mesh[] = [];
  challengeIds.forEach((id, index) => {
    const module = new THREE.Group();
    module.position.set(-2.6 + index * 1.3, 1.0, 0);
    const body = mesh(
      geometry(new THREE.BoxGeometry(1.0, 1.15, 1.08)),
      standard({ color: 0x4c5360, metalness: 0.58, roughness: 0.36 }),
      `challenge-${id}-machine`,
    );
    module.add(body);
    const core = mesh(
      geometry(
        id === "carding"
          ? new THREE.CylinderGeometry(0.27, 0.27, 0.58, 24)
          : id === "combing"
            ? new THREE.ConeGeometry(0.32, 0.65, 16)
            : id === "drawing"
              ? new THREE.TorusGeometry(0.29, 0.08, 8, 24)
              : id === "spinning"
                ? new THREE.OctahedronGeometry(0.35, 0)
                : new THREE.CylinderGeometry(0.3, 0.3, 0.62, 24),
      ),
      standard({
        color: 0xe29843,
        emissive: 0x65310a,
        emissiveIntensity: 0.32,
        metalness: 0.28,
        roughness: 0.42,
      }),
      `challenge-${id}-core`,
    );
    if (id === "carding" || id === "winding") core.rotation.z = Math.PI / 2;
    core.position.set(0, 0.15, 0.58);
    module.add(core);
    addLabel(module, id.toUpperCase(), new THREE.Vector3(0, 0.9, 0), 1.18);
    interactive(module, `yarn-maker-challenge-${id}`);
    challenge.add(module);
    challengeModules.push(module);
    challengeCores.push(core);
  });
  const challengeInput = createFibreBundle(0x3e90df, 1.0, 20, false);
  challengeInput.position.set(-3.0, 2.1, 0);
  challenge.add(challengeInput);
  const challengeOutput = createBobbin(0x3e90df, 20);
  challengeOutput.root.scale.setScalar(0.58);
  challengeOutput.root.position.set(2.8, 2.05, 0);
  challenge.add(challengeOutput.root);
  const challengeGauges = new THREE.Group();
  const miniTwistGauge = createGauge("TWIST", 0x5bd77e);
  miniTwistGauge.root.scale.setScalar(0.75);
  miniTwistGauge.root.position.x = -0.55;
  challengeGauges.add(miniTwistGauge.root);
  const miniTensionGauge = createGauge("TENSION", 0x5bd77e);
  miniTensionGauge.root.scale.setScalar(0.75);
  miniTensionGauge.root.position.x = 0.55;
  challengeGauges.add(miniTensionGauge.root);
  challengeGauges.position.set(0, 2.25, 0.25);
  challenge.add(challengeGauges);
  const completionShield = new THREE.Group();
  completionShield.name = "master-yarn-engineer-badge";
  const shieldRing = mesh(
    geometry(new THREE.TorusGeometry(2.7, 0.08, 10, 72)),
    basic({ color: 0x7bf19a, transparent: true, opacity: 0.86 }),
  );
  const shieldDisk = mesh(
    geometry(new THREE.CircleGeometry(2.62, 72)),
    basic({
      color: 0x57db83,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    }),
  );
  completionShield.add(shieldRing, shieldDisk);
  completionShield.position.set(0, 1.35, -0.7);
  challenge.add(completionShield);
  addLabel(
    challenge,
    "MAKE YARN WITHOUT GUIDANCE • 50 POINTS",
    new THREE.Vector3(0, 3.08, 0),
    4.2,
  );
  root.add(challenge);

  const stageGroups = [
    comparison,
    carding,
    combing,
    drawing,
    twistExperiment,
    spinning,
    winding,
    quality,
    products,
    challenge,
  ];
  stageGroups.forEach((group, index) => {
    group.visible = index === 0;
  });

  // A camera-relative anchor keeps the mission and action panels in a safe,
  // readable part of the viewport for orbit, touch, and headset cameras.
  const panelAnchor = new THREE.Group();
  panelAnchor.name = "yarn-maker-screen-safe-mission-panel-anchor";
  root.add(panelAnchor);
  const instruction = makeCard(4.8, 1.82, 1024, 390, true);
  instruction.plane.position.set(-0.9, 1.35, 0);
  instruction.plane.name = "yarn-maker-mission-panel";
  panelAnchor.add(instruction.plane);
  const action = makeCard(2.55, 0.66, 860, 230, true);
  action.plane.position.set(-0.9, -1.12, 0);
  interactive(action.plane, "yarn-maker-primary-action");
  panelAnchor.add(action.plane);

  let currentSnapshot: YarnMakerWorldSnapshot | undefined;
  let lastStage = -1;
  let lastFeedback = "";
  let lastActionLabel = "";
  let lastCompleted = false;
  const panelPosition = new THREE.Vector3();
  const panelQuaternion = new THREE.Quaternion();

  const setGauge = (
    gauge: GaugeModel,
    value: number,
    goodLow = 40,
    goodHigh = 70,
  ) => {
    const percent = controlPercent(value);
    gauge.needle.rotation.z = Math.PI * 0.7 - (percent / 100) * Math.PI * 1.4;
    const good = percent >= goodLow && percent <= goodHigh;
    gauge.faceMaterial.color.set(
      good ? 0x234a35 : percent > goodHigh ? 0x572a2a : 0x283746,
    );
    gauge.faceMaterial.emissive.set(
      good ? 0x163823 : percent > goodHigh ? 0x461313 : 0x11171b,
    );
    gauge.faceMaterial.emissiveIntensity = good ? 0.62 : 0.38;
  };

  const hasAny = (values: readonly string[], aliases: readonly string[]) =>
    aliases.some((alias) => values.includes(alias));

  const setSnapshot = (snapshot: YarnMakerWorldSnapshot) => {
    currentSnapshot = snapshot;
    stageGroups.forEach((group, index) => {
      group.visible = snapshot.stage === index;
    });
    if (
      snapshot.stage !== lastStage ||
      snapshot.feedback !== lastFeedback ||
      snapshot.completed !== lastCompleted
    ) {
      paintMissionCard(instruction, snapshot);
      lastStage = snapshot.stage;
      lastFeedback = snapshot.feedback;
    }
    if (
      snapshot.actionLabel !== lastActionLabel ||
      snapshot.completed !== lastCompleted
    ) {
      paintActionCard(action, snapshot.actionLabel, snapshot.completed);
      lastActionLabel = snapshot.actionLabel;
    }
    lastCompleted = snapshot.completed;

    const fibreChecked = hasAny(snapshot.fibreYarnChecks, [
      "fibre",
      "single-fibre",
      "loose-fibre",
      "loose",
    ]);
    const yarnChecked = hasAny(snapshot.fibreYarnChecks, [
      "yarn",
      "twisted-yarn",
      "finished-yarn",
      "finished",
    ]);
    loosePod.scale.setScalar(fibreChecked ? 1.1 : 0.94);
    yarnPod.scale.setScalar(yarnChecked ? 1.1 : 0.94);
    (looseRing.material as THREE.MeshStandardMaterial).emissiveIntensity =
      fibreChecked ? 1 : 0.5;
    (yarnRing.material as THREE.MeshStandardMaterial).emissiveIntensity =
      yarnChecked ? 1 : 0.5;
    const twistMagnified = snapshot.fibreYarnChecks.includes("magnified-twist");
    (magnifier.material as THREE.MeshBasicMaterial).opacity = twistMagnified
      ? 1
      : 0.52;
    magnifier.scale.setScalar(twistMagnified ? 1.08 : 0.92);

    const cardingSpeed = controlPercent(snapshot.cardingSpeed);
    const cardingSpeedGood = cardingSpeed >= 40 && cardingSpeed <= 70;
    setGauge(cardingGauge, snapshot.cardingSpeed, 40, 70);
    safetyCover.rotation.x = snapshot.cardingStep >= 2 ? 0 : -0.32;
    safetyCover.position.y = snapshot.cardingStep >= 2 ? 1.26 : 1.55;
    feedBundle.visible = snapshot.cardingStep < 4;
    feedBundle.position.x = -2.05 + clamp(snapshot.cardingStep, 0, 3) * 0.45;
    cardedWeb.visible = snapshot.cardingStep >= 4 && cardingSpeedGood;
    cardingWaste.forEach((mote, index) => {
      mote.visible =
        snapshot.cardingStep >= 3 && index < snapshot.cardingStep * 5;
    });
    coverMaterial.color.set(snapshot.cardingStep >= 2 ? 0x8de7f1 : 0xf3a365);
    coverMaterial.opacity = snapshot.cardingStep >= 2 ? 0.18 : 0.28;
    startButton.material = snapshot.cardingStep >= 3 ? safetyGreen : warningRed;

    const combProgress = progressPercent(snapshot.combingProgress, 4);
    combPins.position.x = -1.35 + (combProgress / 100) * 2.7;
    combHandle.position.x = combPins.position.x;
    combWeb.visible = combProgress < 58;
    combedSliver.visible = combProgress >= 30;
    combedSliver.scale.y = 0.7 + (combProgress / 100) * 0.7;
    shortFibres.forEach((item, index) => {
      item.visible = combProgress > (index / shortFibres.length) * 100;
    });
    combDirection.forEach((arrow) => {
      const material = arrow.material as THREE.MeshBasicMaterial;
      material.opacity = 0.42 + (combProgress / 100) * 0.5;
    });

    const drawSpeed = drawingSpeedPercent(snapshot.drawingSpeed);
    const drawProgress = progressPercent(snapshot.drawingProgress, 4);
    const drawingTooFast = drawSpeed > 73;
    const drawingGood = drawSpeed >= 42 && drawSpeed <= 67;
    setGauge(drawingGauge, drawSpeed, 42, 67);
    thicknessPointer.position.x = clamp((drawSpeed - 50) / 34, -0.96, 0.96);
    thickSliver.visible = drawProgress < 75;
    drawnRoving.visible = drawProgress > 0 && !drawingTooFast;
    drawnRoving.scale.y = drawingGood ? 0.7 : drawSpeed < 42 ? 1.65 : 0.42;
    drawnRoving.scale.z = drawnRoving.scale.y;
    rovingOutput.visible = drawProgress >= 75 && drawingGood;
    brokenRovingLeft.visible = drawProgress > 0 && drawingTooFast;
    brokenRovingRight.visible = drawProgress > 0 && drawingTooFast;
    thicknessZone.material = drawingGood ? safetyGreen : warningRed;

    twistPods.forEach((pod, index) => {
      const id = twistSpecs[index].id;
      const selected =
        snapshot.twistLevel === id || snapshot.twistChecks.includes(id);
      pod.scale.setScalar(selected ? 1.1 : 0.92);
      const halo = pod.getObjectByName(`${id}-twist-halo`) as
        | THREE.Mesh
        | undefined;
      if (halo) {
        (halo.material as THREE.MeshStandardMaterial).emissiveIntensity =
          selected ? 0.92 : 0.22;
      }
    });

    const spinDraw = controlPercent(snapshot.spinningDrawingSpeed);
    const spinTwist = controlPercent(snapshot.spinningTwist);
    const spinTension = controlPercent(snapshot.yarnTension);
    const drawGood = spinDraw >= 40 && spinDraw <= 68;
    const twistGood = spinTwist >= 43 && spinTwist <= 70;
    const tensionGood = spinTension >= 38 && spinTension <= 66;
    setGauge(spinDrawingGauge, snapshot.spinningDrawingSpeed, 40, 68);
    setGauge(spinTwistGauge, snapshot.spinningTwist, 43, 70);
    setGauge(spinTensionGauge, snapshot.yarnTension, 38, 66);
    spinFeed.visible = snapshot.spinningStep < 2;
    spinDraft.visible = snapshot.spinningStep >= 1;
    const tensionHigh = spinTension > 66;
    looseLoops.visible =
      snapshot.spinningStep >= 3 && spinTension > 0 && spinTension < 38;
    spunYarn.visible = snapshot.spinningStep >= 3 && !tensionHigh;
    spinBreakLeft.visible = snapshot.spinningStep >= 3 && tensionHigh;
    spinBreakRight.visible = snapshot.spinningStep >= 3 && tensionHigh;
    spinBobbin.yarnLayers.forEach((layer, index) => {
      layer.visible =
        snapshot.spinningStep >= 4 &&
        drawGood &&
        twistGood &&
        tensionGood &&
        index < snapshot.spinningStep * 3;
    });

    const windProgress = progressPercent(snapshot.windingProgress, 5);
    const windSpeed = controlPercent(snapshot.windingSpeed);
    const windSpeedGood = windSpeed >= 25 && windSpeed <= 62;
    setGauge(windingGauge, snapshot.windingSpeed, 25, 62);
    const rawGuide = snapshot.guidePosition;
    const guideNormal =
      rawGuide >= -1 && rawGuide <= 1
        ? rawGuide
        : clamp(rawGuide / 50 - 1, -1, 1);
    yarnGuide.position.x = 0.2 + guideNormal * 1.18;
    windingBobbin.yarnLayers.forEach((layer, index) => {
      layer.visible =
        index < (windProgress / 100) * windingBobbin.yarnLayers.length &&
        windSpeedGood;
    });
    centreBulge.visible = windProgress > 8 && snapshot.windingStep < 4;
    incomingYarn.visible = snapshot.windingStep >= 1;

    qualityCores.forEach((core, index) => {
      const checked = snapshot.qualityChecks.includes(qualityIds[index]);
      const material = core.material as THREE.MeshStandardMaterial;
      material.color.set(checked ? 0x59d57b : 0xd18a3d);
      material.emissive.set(checked ? 0x176836 : 0x673008);
      material.emissiveIntensity = checked ? 0.86 : 0.35;
      qualityStations[index].scale.setScalar(checked ? 1.08 : 0.94);
    });
    approvedShield.visible = qualityIds.every((id) =>
      snapshot.qualityChecks.includes(id),
    );

    productModels.forEach((model, index) => {
      const selected = snapshot.productChecks.includes(productIds[index]);
      model.scale.setScalar(selected ? 1.12 : 0.9);
    });
    const sequenceProgress =
      snapshot.sequenceCount <= 5
        ? (snapshot.sequenceCount / 5) * processNodes.length
        : snapshot.sequenceCount;
    processNodes.forEach((node, index) => {
      const done = index < clamp(sequenceProgress, 0, processNodes.length);
      const material = node.material as THREE.MeshStandardMaterial;
      material.color.set(done ? 0x55ca76 : 0x765a87);
      material.emissive.set(done ? 0x176332 : 0x24152e);
      material.emissiveIntensity = done ? 0.72 : 0.16;
      node.position.y = done ? 0.42 : 0.26;
    });

    challengeCores.forEach((core, index) => {
      const id = challengeIds[index];
      const passed = hasAny(snapshot.challengeChecks, [
        id,
        `${id}-complete`,
        `correct-${id}`,
      ]);
      const active = index === snapshot.challengeStep;
      const material = core.material as THREE.MeshStandardMaterial;
      material.color.set(passed ? 0x55d27a : active ? 0xf0bd54 : 0xe29843);
      material.emissive.set(passed ? 0x176a35 : active ? 0x76500e : 0x65310a);
      material.emissiveIntensity = passed ? 0.86 : active ? 0.72 : 0.32;
      challengeModules[index].scale.setScalar(
        passed ? 1.04 : active ? 1.09 : 0.94,
      );
    });
    setGauge(miniTwistGauge, snapshot.challengeScore * 2, 70, 100);
    setGauge(miniTensionGauge, snapshot.challengeScore * 2, 70, 100);
    completionShield.visible =
      snapshot.completed || snapshot.challengeScore >= 50;
  };

  const update = (elapsed: number, activeCamera: THREE.Camera) => {
    looseFibre.children.forEach((fibre, index) => {
      fibre.rotation.y = Math.sin(elapsed * 1.4 + index) * 0.04;
    });
    strongYarn.rotation.y = Math.sin(elapsed * 0.8) * 0.1;

    const cardingSpeed = controlPercent(currentSnapshot?.cardingSpeed ?? 0);
    const cardingRunning = (currentSnapshot?.cardingStep ?? 0) >= 3;
    cardingRollers.forEach((roller, index) => {
      if (cardingRunning) {
        roller.rotation.z =
          elapsed * (index % 2 ? -1 : 1) * (0.8 + cardingSpeed * 0.035);
      }
    });
    cardingWaste.forEach((mote, index) => {
      if (mote.visible)
        mote.position.y = 0.34 + ((elapsed * 0.16 + index * 0.03) % 0.08);
    });

    combDirection.forEach((arrow, index) => {
      arrow.position.x = -1.3 + ((elapsed * 0.55 + index * 0.65) % 3.25);
    });
    drawingRollers.forEach((roller, index) => {
      const speed = drawingSpeedPercent(currentSnapshot?.drawingSpeed ?? 0);
      if ((currentSnapshot?.drawingProgress ?? 0) > 0) {
        roller.rotation.z =
          elapsed * (index % 2 ? -1 : 1) * (0.7 + speed * 0.04);
      }
    });
    twistCores.forEach((sample, index) => {
      sample.rotation.y = Math.sin(elapsed * 0.9 + index) * 0.12;
    });

    spinningRollers.forEach((roller, index) => {
      if ((currentSnapshot?.spinningStep ?? 0) >= 2) {
        roller.rotation.z = elapsed * (index % 2 ? -1 : 1) * 2.8;
      }
    });
    if ((currentSnapshot?.spinningStep ?? 0) >= 3)
      flyer.rotation.x = elapsed * 3.4;
    if ((currentSnapshot?.spinningStep ?? 0) >= 4)
      spinBobbin.root.rotation.x = elapsed * 2.7;
    looseLoops.rotation.x = Math.sin(elapsed * 1.9) * 0.12;

    if ((currentSnapshot?.windingStep ?? 0) >= 2) {
      windingBobbin.root.rotation.x =
        elapsed *
        (0.8 + controlPercent(currentSnapshot?.windingSpeed ?? 0) * 0.035);
    }
    if ((currentSnapshot?.windingStep ?? 0) >= 3) {
      const guideSpeed =
        0.9 + controlPercent(currentSnapshot?.windingSpeed ?? 0) * 0.012;
      yarnGuide.position.x = 0.2 + Math.sin(elapsed * guideSpeed) * 1.12;
    }
    laserScanner.position.x = -1.55 + ((elapsed * 0.7) % 3.1);
    approvedShield.rotation.z = elapsed * 0.24;
    summaryBobbins.forEach((bobbin, index) => {
      bobbin.root.rotation.y = Math.sin(elapsed * 0.6 + index) * 0.09;
    });
    processNodes.forEach((node, index) => {
      node.rotation.y = elapsed * 0.44 + index;
    });
    challengeCores.forEach((core, index) => {
      core.rotation.y = elapsed * (0.6 + index * 0.05);
    });
    completionShield.rotation.z = elapsed * 0.22;
    completionShield.scale.setScalar(1 + Math.sin(elapsed * 2.2) * 0.025);

    activeCamera.getWorldPosition(panelPosition);
    activeCamera.getWorldQuaternion(panelQuaternion);
    panelAnchor.position.copy(panelPosition);
    panelAnchor.quaternion.copy(panelQuaternion);
    panelAnchor.translateZ(-4.6);
    action.plane.scale.setScalar(1 + Math.sin(elapsed * 2.7) * 0.025);
  };

  const dispose = () => {
    scene.remove(root, hemisphere, keyLight, fillLight);
    if (scene.background === environmentTexture)
      scene.background = previousBackground;
    if (scene.environment === environmentTexture)
      scene.environment = previousEnvironment;
    if (scene.fog === factoryFog) scene.fog = previousFog;
    geometries.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    textures.forEach((item) => item.dispose());
    geometries.clear();
    materials.clear();
    textures.clear();
    interactables.length = 0;
    renderer.setAnimationLoop(null);
  };

  return { root, interactables, setSnapshot, update, dispose };
}
