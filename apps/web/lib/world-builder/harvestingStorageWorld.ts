import * as THREE from "three";

export type HarvestMethod = "sickle" | "combine";
export type ThreshingMethod =
  | "hand-beating"
  | "attached-grain"
  | "thresher"
  | "straw"
  | "combine";
export type GrainMoistureState = number | "unknown" | "damp" | "dry";

export interface HarvestingStorageWorldSnapshot {
  stage: number;
  maturityChecks: readonly string[];
  harvestProgress: number;
  harvestMethod?: HarvestMethod;
  threshingMethod?: ThreshingMethod;
  threshingStep: number;
  winnowingProgress: number;
  grainMoisture: GrainMoistureState;
  storageChecks: readonly string[];
  sequenceCount: number;
  challengeMatches: readonly string[];
  completed: boolean;
  feedback: string;
  actionLabel: string;
  title: string;
  cue: string;
}

interface LabelCard {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  plane: THREE.Mesh;
}

export interface HarvestingStorageWorld {
  root: THREE.Group;
  interactables: THREE.Object3D[];
  setSnapshot: (snapshot: HarvestingStorageWorldSnapshot) => void;
  update: (elapsed: number, activeCamera: THREE.Camera) => void;
  dispose: () => void;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const progressPercent = (value: number, stepCount: number) =>
  clamp(value <= stepCount ? (value / stepCount) * 100 : value, 0, 100);

const moisturePercent = (value: GrainMoistureState) => {
  if (typeof value === "number") return clamp(value, 0, 30);
  if (value === "dry") return 12;
  if (value === "damp") return 22;
  return 24;
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

function paintMissionCard(
  card: LabelCard,
  snapshot: HarvestingStorageWorldSnapshot,
) {
  const context = card.canvas.getContext("2d");
  if (!context) return;
  const gradient = context.createLinearGradient(
    0,
    0,
    card.canvas.width,
    card.canvas.height,
  );
  gradient.addColorStop(0, "rgba(42, 30, 13, .98)");
  gradient.addColorStop(1, "rgba(38, 76, 42, .98)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, card.canvas.width, card.canvas.height);
  context.strokeStyle = snapshot.completed ? "#86e797" : "#f1c867";
  context.lineWidth = 8;
  context.strokeRect(7, 7, card.canvas.width - 14, card.canvas.height - 14);
  context.fillStyle = snapshot.completed ? "#86e797" : "#f1c867";
  context.font = "800 30px sans-serif";
  context.fillText(`HARVEST LAB  •  ${snapshot.stage + 1}/8`, 42, 54);
  context.fillStyle = "#ffffff";
  context.font = "800 44px sans-serif";
  wrapText(context, snapshot.title, 42, 112, 930, 48, 2);
  context.fillStyle = "#f0f7dd";
  context.font = "28px sans-serif";
  wrapText(context, snapshot.cue, 42, 218, 930, 34, 3);
  if (snapshot.feedback) {
    context.fillStyle = "#ffedaa";
    context.font = "700 24px sans-serif";
    wrapText(context, snapshot.feedback, 42, 330, 930, 30, 1);
  }
  card.texture.needsUpdate = true;
}

function paintActionCard(card: LabelCard, label: string, complete: boolean) {
  const context = card.canvas.getContext("2d");
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, card.canvas.width, 0);
  gradient.addColorStop(0, complete ? "#3a9b55" : "#a76b24");
  gradient.addColorStop(1, complete ? "#91e8a0" : "#edc45f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, card.canvas.width, card.canvas.height);
  context.strokeStyle = "#fff6cf";
  context.lineWidth = 8;
  context.strokeRect(5, 5, card.canvas.width - 10, card.canvas.height - 10);
  context.fillStyle = "#182014";
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

export function createHarvestingStorageWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): HarvestingStorageWorld {
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

  const billboards: THREE.Mesh[] = [];
  const makeCard = (
    width: number,
    height: number,
    canvasWidth = 1024,
    canvasHeight = 390,
    alwaysOnTop = false,
  ): LabelCard => {
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
    plane.renderOrder = alwaysOnTop ? 100 : 30;
    billboards.push(plane);
    return { canvas, texture, plane };
  };
  const textLabel = (text: string, width = 1.55, color = "#fff4c2") => {
    const card = makeCard(width, 0.34, 720, 150);
    const context = card.canvas.getContext("2d");
    if (context) {
      context.fillStyle = "rgba(34, 38, 20, .93)";
      context.fillRect(0, 0, card.canvas.width, card.canvas.height);
      context.strokeStyle = "#d8ad4b";
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

  const root = new THREE.Group();
  root.name = "Harvesting, threshing, and storage learning farm";
  scene.add(root);

  const previousBackground = scene.background;
  const previousEnvironment = scene.environment;
  const previousFog = scene.fog;
  const environmentTexture = new THREE.TextureLoader().load(
    "/simulations/c8-ch01-a05-harvesting-threshing-and-storage-of-crops/environment.webp",
  );
  environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
  environmentTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(environmentTexture);
  scene.background = environmentTexture;
  scene.environment = environmentTexture;
  const farmFog = new THREE.FogExp2(0xc9c39a, 0.007);
  scene.fog = farmFog;

  const hemisphere = new THREE.HemisphereLight(0xfff3ce, 0x5b482d, 2.2);
  const sunlight = new THREE.DirectionalLight(0xffe1a3, 3.7);
  sunlight.position.set(-5.5, 8.5, 4.5);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.near = 0.1;
  sunlight.shadow.camera.far = 30;
  scene.add(hemisphere, sunlight);

  const soilMaterial = standard({ color: 0x725033, roughness: 0.98 });
  const earthMaterial = standard({ color: 0x916b3e, roughness: 0.95 });
  const strawMaterial = standard({ color: 0xc99a3d, roughness: 0.9 });
  const ripeStemMaterial = standard({ color: 0xb8892f, roughness: 0.88 });
  const ripeGrainMaterial = standard({
    color: 0xe0b34e,
    roughness: 0.78,
    emissive: 0x4b3005,
    emissiveIntensity: 0.08,
  });
  const greenStemMaterial = standard({ color: 0x4c8a3d, roughness: 0.9 });
  const greenGrainMaterial = standard({ color: 0x78a84a, roughness: 0.86 });
  const darkMetalMaterial = standard({
    color: 0x424843,
    metalness: 0.7,
    roughness: 0.38,
  });
  const silverMaterial = standard({
    color: 0x9ea7a2,
    metalness: 0.78,
    roughness: 0.32,
  });
  const redMachineMaterial = standard({
    color: 0xa63d28,
    metalness: 0.45,
    roughness: 0.42,
  });
  const greenMachineMaterial = standard({
    color: 0x4f7139,
    metalness: 0.36,
    roughness: 0.48,
  });
  const rubberMaterial = standard({ color: 0x1e211f, roughness: 0.88 });
  const glassMaterial = standard({
    color: 0x7fc8d5,
    metalness: 0.08,
    roughness: 0.16,
    transparent: true,
    opacity: 0.72,
  });
  const woodMaterial = standard({ color: 0x744626, roughness: 0.92 });
  const safeMaterial = standard({
    color: 0x46b96a,
    emissive: 0x145d2d,
    emissiveIntensity: 0.34,
    roughness: 0.54,
  });
  const warningMaterial = standard({
    color: 0xdb7b32,
    emissive: 0x6c260d,
    emissiveIntensity: 0.3,
    roughness: 0.58,
  });

  const floor = mesh(
    geometry(new THREE.CircleGeometry(8.8, 96)),
    standard({ color: 0x82643c, roughness: 1 }),
    "farm-work-yard",
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.045;
  root.add(floor);

  const stalkStemGeometry = geometry(
    new THREE.CylinderGeometry(0.018, 0.032, 1, 7),
  );
  const stalkLeafGeometry = geometry(new THREE.SphereGeometry(0.12, 10, 6));
  const stalkHeadGeometry = geometry(new THREE.SphereGeometry(0.12, 12, 8));
  const grainGeometry = geometry(new THREE.SphereGeometry(0.047, 9, 6));

  const makeWheatStalk = (mature: boolean, height = 1.15) => {
    const group = new THREE.Group();
    group.name = mature ? "mature-wheat-stalk" : "unripe-wheat-stalk";
    const stem = mesh(
      stalkStemGeometry,
      mature ? ripeStemMaterial : greenStemMaterial,
    );
    stem.scale.y = height;
    stem.position.y = height / 2;
    group.add(stem);
    for (const side of [-1, 1]) {
      const leaf = mesh(
        stalkLeafGeometry,
        mature ? ripeStemMaterial : greenStemMaterial,
      );
      leaf.scale.set(1.45, 0.16, 0.5);
      leaf.position.set(side * 0.085, height * (side > 0 ? 0.48 : 0.65), 0);
      leaf.rotation.z = side * (mature ? 0.62 : 0.35);
      group.add(leaf);
    }
    const head = mesh(
      stalkHeadGeometry,
      mature ? ripeGrainMaterial : greenGrainMaterial,
      mature ? "hard-grain-head" : "soft-green-grain-head",
    );
    head.scale.set(0.48, 1.48, 0.48);
    head.position.y = height + 0.1;
    head.rotation.z = mature ? 0.12 : 0.02;
    group.add(head);
    return group;
  };

  const makeSoilBed = (width: number, depth: number) => {
    const bed = mesh(
      geometry(new THREE.BoxGeometry(width, 0.18, depth)),
      soilMaterial,
    );
    bed.position.y = 0.06;
    return bed;
  };

  const makeSilo = (height = 2.15, radius = 0.68) => {
    const silo = new THREE.Group();
    silo.name = "sealed-metal-grain-silo";
    const body = mesh(
      geometry(new THREE.CylinderGeometry(radius, radius, height, 30)),
      silverMaterial,
      "clean-storage-body",
    );
    body.position.y = height / 2;
    silo.add(body);
    const roof = mesh(
      geometry(new THREE.ConeGeometry(radius + 0.08, 0.46, 30)),
      redMachineMaterial,
      "airtight-silo-roof",
    );
    roof.position.y = height + 0.23;
    silo.add(roof);
    for (let ring = 0; ring < 6; ring += 1) {
      const rib = mesh(
        geometry(new THREE.TorusGeometry(radius + 0.01, 0.018, 6, 32)),
        darkMetalMaterial,
      );
      rib.rotation.x = Math.PI / 2;
      rib.position.y = 0.25 + ring * (height / 6);
      silo.add(rib);
    }
    const hatch = mesh(
      geometry(new THREE.BoxGeometry(0.42, 0.55, 0.06)),
      darkMetalMaterial,
      "sealed-inspection-hatch",
    );
    hatch.position.set(0, 0.58, radius + 0.03);
    silo.add(hatch);
    return silo;
  };

  const makeSack = (color: number) => {
    const sack = new THREE.Group();
    const body = mesh(
      geometry(new THREE.SphereGeometry(0.36, 18, 14)),
      standard({ color, roughness: 1 }),
      "grain-sack",
    );
    body.scale.set(0.82, 1.24, 0.68);
    body.position.y = 0.43;
    const tie = mesh(
      geometry(new THREE.TorusGeometry(0.1, 0.022, 7, 18)),
      woodMaterial,
    );
    tie.rotation.x = Math.PI / 2;
    tie.position.y = 0.78;
    sack.add(body, tie);
    return sack;
  };

  const stageGroups: THREE.Group[] = [];

  // Stage 1: compare an unripe crop with a mature, harvest-ready crop.
  const maturityComparison = new THREE.Group();
  maturityComparison.name = "crop-ready-maturity-comparison";
  const maturityStalks: THREE.Group[] = [];
  const unripePlot = new THREE.Group();
  unripePlot.name = "unripe-crop-plot";
  unripePlot.userData.interactive = true;
  unripePlot.position.x = -1.75;
  unripePlot.add(makeSoilBed(2.45, 2.35));
  const maturePlot = new THREE.Group();
  maturePlot.name = "harvest-ready-crop-plot";
  maturePlot.userData.interactive = true;
  maturePlot.position.x = 1.75;
  maturePlot.add(makeSoilBed(2.45, 2.35));
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const x = (column - 2) * 0.42 + (row % 2) * 0.06;
      const z = (row - 1.5) * 0.5;
      const youngStalk = makeWheatStalk(
        false,
        1.05 + ((row + column) % 3) * 0.05,
      );
      youngStalk.position.set(x, 0.14, z);
      unripePlot.add(youngStalk);
      maturityStalks.push(youngStalk);
      const ripeStalk = makeWheatStalk(
        true,
        1.12 + ((row + column) % 3) * 0.05,
      );
      ripeStalk.position.set(x, 0.14, z);
      maturePlot.add(ripeStalk);
      maturityStalks.push(ripeStalk);
    }
  }
  const unripeLabel = textLabel("UNRIPE • GREEN", 1.82, "#c9f2a6");
  unripeLabel.plane.position.set(0, 2.15, -0.75);
  unripePlot.add(unripeLabel.plane);
  const matureLabel = textLabel("MATURE • GOLDEN", 1.92);
  matureLabel.plane.position.set(0, 2.15, -0.75);
  maturePlot.add(matureLabel.plane);
  maturityComparison.add(unripePlot, maturePlot);

  const maturityScanner = mesh(
    geometry(new THREE.TorusGeometry(0.72, 0.035, 10, 52)),
    basic({ color: 0xffdb6f, transparent: true, opacity: 0.86 }),
    "maturity-scanner",
  );
  maturityScanner.position.set(1.75, 1.03, 0.26);
  maturityComparison.add(maturityScanner);
  const maturityCheckIds = ["green-crop", "golden-crop", "firm-grain"] as const;
  const maturityCheckLabels = ["GREEN • SOFT", "GOLDEN • DRY", "FULL • FIRM"];
  const maturityMarkerX = [-1.75, 1.32, 2.2];
  const maturityMarkers: THREE.Mesh[] = [];
  maturityCheckIds.forEach((checkId, index) => {
    const marker = mesh(
      geometry(new THREE.OctahedronGeometry(0.16, 1)),
      standard({
        color: 0x7a6532,
        emissive: 0x241c05,
        emissiveIntensity: 0.12,
        roughness: 0.5,
      }),
      `maturity-check-${checkId}`,
    );
    marker.position.set(maturityMarkerX[index], 2.68, 0.1);
    maturityComparison.add(marker);
    maturityMarkers.push(marker);
    const label = textLabel(maturityCheckLabels[index], 1.18, "#fff8d1");
    label.plane.position.set(marker.position.x, 2.37, 0.1);
    maturityComparison.add(label.plane);
  });
  root.add(maturityComparison);
  stageGroups.push(maturityComparison);

  // Stage 2: harvest by hand or with a combine and leave useful stubble behind.
  const harvesting = new THREE.Group();
  harvesting.name = "crop-harvesting-field";
  const harvestingBed = makeSoilBed(6.6, 3.25);
  harvestingBed.name = "harvesting-field-soil";
  harvestingBed.userData.interactive = true;
  harvesting.add(harvestingBed);
  const harvestStalks: THREE.Group[] = [];
  const harvestStubble: THREE.Mesh[] = [];
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      const index = row * 9 + column;
      const stalk = makeWheatStalk(true, 1.02 + (index % 4) * 0.035);
      stalk.position.set((column - 4) * 0.62, 0.14, (row - 2.5) * 0.48);
      stalk.userData.baseX = stalk.position.x;
      stalk.userData.baseZ = stalk.position.z;
      harvesting.add(stalk);
      harvestStalks.push(stalk);
      const stubble = mesh(
        geometry(new THREE.CylinderGeometry(0.022, 0.035, 0.18, 7)),
        ripeStemMaterial,
        "cut-stubble",
      );
      stubble.position.set(stalk.position.x, 0.22, stalk.position.z);
      stubble.visible = false;
      harvesting.add(stubble);
      harvestStubble.push(stubble);
    }
  }

  const sickle = new THREE.Group();
  sickle.name = "hand-sickle";
  sickle.userData.interactive = true;
  const sickleHandle = mesh(
    geometry(new THREE.CylinderGeometry(0.055, 0.07, 0.64, 12)),
    woodMaterial,
  );
  sickleHandle.rotation.z = -0.72;
  sickleHandle.position.set(-0.17, 0.17, 0);
  const sickleBlade = mesh(
    geometry(new THREE.TorusGeometry(0.36, 0.045, 8, 34, Math.PI * 1.2)),
    silverMaterial,
    "curved-sickle-blade",
  );
  sickleBlade.rotation.z = -0.35;
  sickleBlade.position.set(0.1, 0.46, 0);
  sickle.add(sickleHandle, sickleBlade);
  sickle.position.set(-2.55, 1.18, 1.7);
  sickle.scale.setScalar(1.18);
  harvesting.add(sickle);

  const combine = new THREE.Group();
  combine.name = "combine-harvester";
  combine.userData.interactive = true;
  const combineBody = mesh(
    geometry(new THREE.BoxGeometry(1.55, 0.92, 1.05)),
    redMachineMaterial,
    "combine-body",
  );
  combineBody.position.y = 1.0;
  combine.add(combineBody);
  const grainTank = mesh(
    geometry(new THREE.BoxGeometry(1.28, 0.55, 0.92)),
    greenMachineMaterial,
    "combine-grain-tank",
  );
  grainTank.position.set(-0.06, 1.72, 0.05);
  combine.add(grainTank);
  const cab = mesh(
    geometry(new THREE.BoxGeometry(0.78, 0.78, 0.64)),
    glassMaterial,
    "combine-cab",
  );
  cab.position.set(0.42, 1.58, -0.28);
  combine.add(cab);
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.43, 0.43]) {
      const wheel = mesh(
        geometry(
          new THREE.CylinderGeometry(
            z < 0 ? 0.38 : 0.3,
            z < 0 ? 0.38 : 0.3,
            0.2,
            20,
          ),
        ),
        rubberMaterial,
        "combine-wheel",
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, z < 0 ? 0.55 : 0.47, z);
      combine.add(wheel);
    }
  }
  const headerFrame = mesh(
    geometry(new THREE.BoxGeometry(2.5, 0.15, 0.38)),
    darkMetalMaterial,
    "combine-cutter-bar",
  );
  headerFrame.position.set(0, 0.46, -0.9);
  combine.add(headerFrame);
  const combineReel = new THREE.Group();
  combineReel.name = "combine-header-reel";
  combineReel.position.set(0, 0.78, -1.03);
  const reelAxle = mesh(
    geometry(new THREE.CylinderGeometry(0.055, 0.055, 2.42, 12)),
    darkMetalMaterial,
  );
  reelAxle.rotation.z = Math.PI / 2;
  combineReel.add(reelAxle);
  for (let spoke = 0; spoke < 6; spoke += 1) {
    const bar = mesh(
      geometry(new THREE.BoxGeometry(2.35, 0.035, 0.035)),
      silverMaterial,
    );
    const angle = (spoke / 6) * Math.PI * 2;
    bar.position.set(0, Math.cos(angle) * 0.32, Math.sin(angle) * 0.32);
    combineReel.add(bar);
  }
  combine.add(combineReel);
  for (let tooth = 0; tooth < 13; tooth += 1) {
    const cutter = mesh(
      geometry(new THREE.ConeGeometry(0.065, 0.32, 5)),
      silverMaterial,
      "header-cutter-tooth",
    );
    cutter.rotation.x = Math.PI / 2;
    cutter.position.set((tooth - 6) * 0.19, 0.36, -1.08);
    combine.add(cutter);
  }
  combine.position.set(0, 0, 1.72);
  combine.scale.setScalar(0.82);
  harvesting.add(combine);
  root.add(harvesting);
  stageGroups.push(harvesting);

  // Stage 3: reveal how beating, a thresher, and a combine separate grain.
  const threshing = new THREE.Group();
  threshing.name = "threshing-methods-station";
  const threshingMethodIds = ["hand-beating", "thresher", "combine"] as const;
  const threshingMethodLabels = [
    "HAND BEATING",
    "POWER THRESHER",
    "COMBINE INSIDE",
  ];
  const threshingStations: THREE.Group[] = [];
  const threshingDrums: THREE.Object3D[] = [];
  threshingMethodIds.forEach((methodId, index) => {
    const station = new THREE.Group();
    station.name = `threshing-method-${methodId}`;
    station.userData.interactive = true;
    station.position.x = (index - 1) * 2.35;
    const base = mesh(
      geometry(new THREE.CylinderGeometry(0.94, 1.02, 0.16, 30)),
      earthMaterial,
    );
    base.position.y = 0.08;
    station.add(base);
    if (methodId === "hand-beating") {
      const stone = mesh(
        geometry(new THREE.BoxGeometry(1.3, 0.16, 0.9)),
        standard({ color: 0x777168, roughness: 0.96 }),
        "threshing-stone",
      );
      stone.position.y = 0.25;
      station.add(stone);
      const sheaf = new THREE.Group();
      sheaf.name = "wheat-sheaf-for-beating";
      for (let stalkIndex = 0; stalkIndex < 9; stalkIndex += 1) {
        const stalk = makeWheatStalk(true, 0.82);
        stalk.position.set((stalkIndex - 4) * 0.035, 0.35, 0);
        stalk.rotation.z = -0.72 + stalkIndex * 0.025;
        sheaf.add(stalk);
      }
      station.add(sheaf);
      const beater = mesh(
        geometry(new THREE.CylinderGeometry(0.035, 0.045, 1.15, 9)),
        woodMaterial,
        "wooden-threshing-stick",
      );
      beater.position.set(0.3, 1.15, 0.18);
      beater.rotation.z = -0.72;
      station.add(beater);
      threshingDrums.push(beater);
    } else if (methodId === "thresher") {
      const machine = mesh(
        geometry(new THREE.BoxGeometry(1.45, 1.15, 1.0)),
        greenMachineMaterial,
        "powered-thresher-body",
      );
      machine.position.y = 0.8;
      station.add(machine);
      const intake = mesh(
        geometry(new THREE.BoxGeometry(0.9, 0.18, 0.7)),
        darkMetalMaterial,
        "thresher-feed-tray",
      );
      intake.position.set(0, 1.26, -0.72);
      intake.rotation.x = -0.22;
      station.add(intake);
      const drum = mesh(
        geometry(new THREE.CylinderGeometry(0.34, 0.34, 0.84, 22)),
        silverMaterial,
        "thresher-drum",
      );
      drum.rotation.z = Math.PI / 2;
      drum.position.set(0, 0.86, 0.52);
      station.add(drum);
      threshingDrums.push(drum);
      const grainChute = mesh(
        geometry(new THREE.BoxGeometry(0.55, 0.15, 0.65)),
        darkMetalMaterial,
        "thresher-grain-chute",
      );
      grainChute.position.set(0.25, 0.33, 0.68);
      grainChute.rotation.x = 0.36;
      station.add(grainChute);
    } else {
      const shell = mesh(
        geometry(new THREE.BoxGeometry(1.5, 1.28, 0.24)),
        standard({
          color: 0x803727,
          metalness: 0.34,
          roughness: 0.5,
          transparent: true,
          opacity: 0.42,
        }),
        "combine-cutaway-shell",
      );
      shell.position.y = 0.85;
      station.add(shell);
      const drum = mesh(
        geometry(new THREE.CylinderGeometry(0.38, 0.38, 0.86, 24)),
        silverMaterial,
        "combine-threshing-drum",
      );
      drum.rotation.z = Math.PI / 2;
      drum.position.set(-0.28, 1.02, 0);
      station.add(drum);
      threshingDrums.push(drum);
      const sieve = mesh(
        geometry(new THREE.BoxGeometry(1.18, 0.08, 0.68)),
        darkMetalMaterial,
        "combine-cleaning-sieve",
      );
      sieve.position.set(0.1, 0.52, 0);
      sieve.rotation.z = -0.12;
      station.add(sieve);
      const tank = mesh(
        geometry(new THREE.BoxGeometry(0.62, 0.45, 0.5)),
        greenMachineMaterial,
        "combine-separated-grain-tank",
      );
      tank.position.set(0.42, 1.48, 0);
      station.add(tank);
    }
    const label = textLabel(threshingMethodLabels[index], 1.72);
    label.plane.position.set(0, 2.4, 0);
    station.add(label.plane);
    threshing.add(station);
    threshingStations.push(station);
  });
  const separatedGrains: THREE.Mesh[] = [];
  for (let index = 0; index < 36; index += 1) {
    const grain = mesh(grainGeometry, ripeGrainMaterial, "separated-grain");
    grain.scale.set(0.8, 1.4, 0.8);
    grain.position.set(
      ((index % 9) - 4) * 0.12,
      0.18 + (index % 3) * 0.035,
      1.2 + (Math.floor(index / 9) - 1.5) * 0.12,
    );
    grain.visible = false;
    threshing.add(grain);
    separatedGrains.push(grain);
  }
  const strawOutlet = new THREE.Group();
  strawOutlet.name = "separated-straw";
  for (let index = 0; index < 13; index += 1) {
    const straw = mesh(
      geometry(new THREE.CylinderGeometry(0.014, 0.022, 0.92, 6)),
      strawMaterial,
    );
    straw.position.set(
      -0.75 + (index % 7) * 0.23,
      0.28,
      1.4 + Math.floor(index / 7) * 0.12,
    );
    straw.rotation.z = Math.PI / 2 + (index % 4) * 0.14;
    strawOutlet.add(straw);
  }
  strawOutlet.visible = false;
  threshing.add(strawOutlet);
  root.add(threshing);
  stageGroups.push(threshing);

  // Stage 4: winnow with moving air so dense grain falls and light chaff travels.
  const winnowing = new THREE.Group();
  winnowing.name = "winnowing-air-separation";
  const winnowingMat = mesh(
    geometry(new THREE.CircleGeometry(2.8, 48)),
    standard({ color: 0xa77a3d, roughness: 0.95, side: THREE.DoubleSide }),
    "winnowing-work-mat",
  );
  winnowingMat.rotation.x = -Math.PI / 2;
  winnowingMat.position.y = 0.035;
  winnowingMat.userData.interactive = true;
  winnowing.add(winnowingMat);

  const winnowingBasket = new THREE.Group();
  winnowingBasket.name = "winnowing-basket";
  winnowingBasket.userData.interactive = true;
  const basketTray = mesh(
    geometry(new THREE.CylinderGeometry(0.86, 0.72, 0.13, 32, 1, true)),
    standard({ color: 0x9b6b31, roughness: 1, side: THREE.DoubleSide }),
    "woven-winnowing-tray",
  );
  basketTray.position.y = 0.96;
  basketTray.rotation.z = -0.12;
  const basketRim = mesh(
    geometry(new THREE.TorusGeometry(0.86, 0.045, 8, 36)),
    woodMaterial,
  );
  basketRim.rotation.x = Math.PI / 2;
  basketRim.position.y = 1.04;
  basketRim.rotation.z = -0.12;
  winnowingBasket.add(basketTray, basketRim);
  winnowing.add(winnowingBasket);

  const handFan = new THREE.Group();
  handFan.name = "winnowing-air-fan";
  handFan.userData.interactive = true;
  handFan.position.set(-2.45, 1.1, 0.15);
  const fanHub = mesh(
    geometry(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 16)),
    darkMetalMaterial,
  );
  fanHub.rotation.x = Math.PI / 2;
  handFan.add(fanHub);
  const fanBlades = new THREE.Group();
  for (let bladeIndex = 0; bladeIndex < 5; bladeIndex += 1) {
    const blade = mesh(
      geometry(new THREE.BoxGeometry(0.72, 0.18, 0.045)),
      greenMachineMaterial,
    );
    blade.position.x = 0.38;
    blade.rotation.z = (bladeIndex * Math.PI * 2) / 5;
    const bladePivot = new THREE.Group();
    bladePivot.rotation.z = (bladeIndex * Math.PI * 2) / 5;
    blade.rotation.z = 0.24;
    bladePivot.add(blade);
    fanBlades.add(bladePivot);
  }
  handFan.add(fanBlades);
  winnowing.add(handFan);
  const airflowArrows: THREE.Mesh[] = [];
  for (let index = 0; index < 4; index += 1) {
    const airflow = mesh(
      geometry(new THREE.CylinderGeometry(0.022, 0.045, 1.25, 8)),
      basic({ color: 0x9fe4ef, transparent: true, opacity: 0.42 }),
      "winnowing-airflow",
    );
    airflow.rotation.z = -Math.PI / 2;
    airflow.position.set(-1.55 + index * 0.62, 0.78 + index * 0.15, 0.12);
    winnowing.add(airflow);
    airflowArrows.push(airflow);
  }

  const winnowingGrains: THREE.Mesh[] = [];
  for (let index = 0; index < 44; index += 1) {
    const grain = mesh(
      grainGeometry,
      ripeGrainMaterial,
      "clean-winnowed-grain",
    );
    grain.scale.set(0.72, 1.34, 0.72);
    grain.userData.phase = index / 44;
    grain.userData.offsetX = ((index % 8) - 3.5) * 0.11;
    grain.userData.offsetZ = ((Math.floor(index / 8) % 5) - 2) * 0.1;
    winnowing.add(grain);
    winnowingGrains.push(grain);
  }
  const chaffParticles: THREE.Mesh[] = [];
  for (let index = 0; index < 28; index += 1) {
    const chaff = mesh(
      geometry(new THREE.BoxGeometry(0.13, 0.018, 0.045)),
      strawMaterial,
      "light-chaff",
    );
    chaff.userData.phase = index / 28;
    chaff.userData.offsetY = (index % 6) * 0.08;
    chaff.userData.offsetZ = ((index % 7) - 3) * 0.12;
    winnowing.add(chaff);
    chaffParticles.push(chaff);
  }
  const grainPileLabel = textLabel("HEAVY GRAIN FALLS", 1.78, "#fff2a8");
  grainPileLabel.plane.position.set(0.7, 0.55, 1.25);
  winnowing.add(grainPileLabel.plane);
  const chaffLabel = textLabel("LIGHT CHAFF BLOWS", 1.78, "#f6dca2");
  chaffLabel.plane.position.set(2.15, 1.75, 0.3);
  winnowing.add(chaffLabel.plane);
  root.add(winnowing);
  stageGroups.push(winnowing);

  // Stage 5: dry the cleaned grain and read its moisture before storage.
  const drying = new THREE.Group();
  drying.name = "sun-drying-and-moisture-check";
  const dryingTarp = mesh(
    geometry(new THREE.CircleGeometry(2.15, 56)),
    standard({ color: 0x306f86, roughness: 0.8, side: THREE.DoubleSide }),
    "clean-drying-tarp",
  );
  dryingTarp.rotation.x = -Math.PI / 2;
  dryingTarp.position.set(-0.45, 0.04, 0.12);
  dryingTarp.userData.interactive = true;
  drying.add(dryingTarp);
  const dryingGrains: THREE.Mesh[] = [];
  for (let index = 0; index < 76; index += 1) {
    const radius = 0.18 + (index % 10) * 0.16;
    const angle = index * 2.39996;
    const grain = mesh(grainGeometry, ripeGrainMaterial, "sun-drying-grain");
    grain.scale.set(0.72, 1.25, 0.72);
    grain.position.set(
      -0.45 + Math.cos(angle) * radius,
      0.1 + (index % 3) * 0.025,
      0.12 + Math.sin(angle) * radius * 0.68,
    );
    grain.rotation.z = angle;
    drying.add(grain);
    dryingGrains.push(grain);
  }
  const dryingSun = mesh(
    geometry(new THREE.SphereGeometry(0.48, 28, 20)),
    standard({
      color: 0xffd763,
      emissive: 0xff8d1e,
      emissiveIntensity: 1.1,
      roughness: 0.62,
    }),
    "warm-drying-sun",
  );
  dryingSun.position.set(-2.75, 2.3, -0.45);
  drying.add(dryingSun);
  const dryingRays: THREE.Mesh[] = [];
  for (let index = 0; index < 10; index += 1) {
    const ray = mesh(
      geometry(new THREE.CylinderGeometry(0.025, 0.04, 0.42, 7)),
      basic({ color: 0xffd86b, transparent: true, opacity: 0.76 }),
    );
    const angle = (index * Math.PI * 2) / 10;
    ray.position
      .copy(dryingSun.position)
      .add(
        new THREE.Vector3(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0),
      );
    ray.rotation.z = angle + Math.PI / 2;
    drying.add(ray);
    dryingRays.push(ray);
  }

  const moistureMeter = new THREE.Group();
  moistureMeter.name = "digital-grain-moisture-meter";
  moistureMeter.userData.interactive = true;
  moistureMeter.position.set(2.2, 0.18, 0.1);
  const meterBody = mesh(
    geometry(new THREE.BoxGeometry(1.02, 1.75, 0.46)),
    darkMetalMaterial,
  );
  meterBody.position.y = 0.88;
  moistureMeter.add(meterBody);
  const meterTrack = mesh(
    geometry(new THREE.BoxGeometry(0.22, 1.12, 0.04)),
    basic({ color: 0x203026 }),
  );
  meterTrack.position.set(0.22, 0.89, 0.25);
  moistureMeter.add(meterTrack);
  const moistureBarMaterial = standard({
    color: 0xd87138,
    emissive: 0x6f2d12,
    emissiveIntensity: 0.5,
    roughness: 0.46,
  });
  const moistureBar = mesh(
    geometry(new THREE.BoxGeometry(0.16, 1, 0.06)),
    moistureBarMaterial,
    "moisture-level-bar",
  );
  moistureBar.position.set(0.22, 0.42, 0.29);
  moistureMeter.add(moistureBar);
  const safeBand = mesh(
    geometry(new THREE.BoxGeometry(0.34, 0.28, 0.07)),
    basic({ color: 0x58da79, transparent: true, opacity: 0.5 }),
    "safe-moisture-band",
  );
  safeBand.position.set(0.22, 0.47, 0.31);
  moistureMeter.add(safeBand);
  const probe = mesh(
    geometry(new THREE.CylinderGeometry(0.025, 0.025, 0.78, 8)),
    silverMaterial,
    "moisture-probe",
  );
  probe.position.set(-0.35, -0.16, 0.15);
  probe.rotation.z = 0.78;
  moistureMeter.add(probe);
  const moistureReadout = makeCard(1.42, 0.62, 680, 280);
  moistureReadout.plane.position.set(0, 2.14, 0);
  moistureMeter.add(moistureReadout.plane);
  drying.add(moistureMeter);
  const moistureDroplets: THREE.Mesh[] = [];
  for (let index = 0; index < 24; index += 1) {
    const droplet = mesh(
      geometry(new THREE.SphereGeometry(0.04, 9, 6)),
      basic({ color: 0x5ec9ee, transparent: true, opacity: 0.72 }),
      "grain-moisture-droplet",
    );
    droplet.position.set(
      -1.7 + (index % 8) * 0.34,
      0.48 + Math.floor(index / 8) * 0.16,
      0.15 + ((index % 3) - 1) * 0.5,
    );
    drying.add(droplet);
    moistureDroplets.push(droplet);
  }
  root.add(drying);
  stageGroups.push(drying);

  // Stage 6: store only clean, dry grain in sealed, raised containers.
  const storage = new THREE.Group();
  storage.name = "safe-grain-storage-yard";
  const storeFloor = mesh(
    geometry(new THREE.BoxGeometry(6.4, 0.18, 3.15)),
    standard({ color: 0x8e8a78, roughness: 0.92 }),
    "clean-storage-floor",
  );
  storeFloor.position.y = 0.06;
  storeFloor.userData.interactive = true;
  storage.add(storeFloor);
  const storageSilo = makeSilo(2.15, 0.68);
  storageSilo.position.set(-2.0, 0.15, 0.15);
  storageSilo.userData.interactive = true;
  storage.add(storageSilo);
  const pallet = new THREE.Group();
  pallet.name = "raised-wooden-pallet";
  for (let plank = 0; plank < 5; plank += 1) {
    const board = mesh(
      geometry(new THREE.BoxGeometry(1.75, 0.1, 0.24)),
      woodMaterial,
    );
    board.position.set(0, 0.22, (plank - 2) * 0.29);
    pallet.add(board);
  }
  for (const x of [-0.7, 0, 0.7]) {
    const foot = mesh(
      geometry(new THREE.BoxGeometry(0.18, 0.22, 1.35)),
      woodMaterial,
    );
    foot.position.set(x, 0.1, 0);
    pallet.add(foot);
  }
  pallet.position.set(0.15, 0, 0.35);
  pallet.userData.interactive = true;
  storage.add(pallet);
  for (let index = 0; index < 4; index += 1) {
    const sack = makeSack(index % 2 ? 0xb89a62 : 0xc9ae75);
    sack.position.set(
      -0.45 + (index % 2) * 0.78,
      0.28 + Math.floor(index / 2) * 0.64,
      0.18 + (index % 2) * 0.12,
    );
    sack.rotation.z = (index % 2 ? 1 : -1) * 0.05;
    pallet.add(sack);
  }
  const sealedBin = new THREE.Group();
  sealedBin.name = "airtight-storage-bin";
  sealedBin.userData.interactive = true;
  sealedBin.position.set(2.15, 0.15, 0.18);
  const binBody = mesh(
    geometry(new THREE.CylinderGeometry(0.62, 0.66, 1.55, 26)),
    standard({ color: 0x47768b, metalness: 0.5, roughness: 0.42 }),
    "airtight-bin-body",
  );
  binBody.position.y = 0.8;
  sealedBin.add(binBody);
  const binLid = mesh(
    geometry(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 26)),
    darkMetalMaterial,
    "airtight-bin-lid",
  );
  binLid.position.y = 1.62;
  sealedBin.add(binLid);
  const lidSeal = mesh(
    geometry(new THREE.TorusGeometry(0.63, 0.035, 8, 28)),
    standard({ color: 0x2d2f2c, roughness: 0.72 }),
  );
  lidSeal.rotation.x = Math.PI / 2;
  lidSeal.position.y = 1.56;
  sealedBin.add(lidSeal);
  storage.add(sealedBin);

  const storageCheckIds = [
    "raised-platform",
    "metal-bin",
    "silo",
    "torn-bag",
    "damp-wall",
  ] as const;
  const storageCheckLabels = [
    "RAISED",
    "SEALED BIN",
    "SILO",
    "TORN BAG",
    "DAMP WALL",
  ];
  const storageMarkers: THREE.Mesh[] = [];
  storageCheckIds.forEach((checkId, index) => {
    const markerMaterial = standard({
      color: 0xd07b32,
      emissive: 0x612608,
      emissiveIntensity: 0.28,
      roughness: 0.5,
    });
    const marker = mesh(
      geometry(new THREE.OctahedronGeometry(0.18, 1)),
      markerMaterial,
      `storage-check-${checkId}`,
    );
    marker.position.set(-2.6 + index * 1.3, 2.82, 0.12);
    storage.add(marker);
    storageMarkers.push(marker);
    const label = textLabel(storageCheckLabels[index], 1.08);
    label.plane.position.set(marker.position.x, 2.5, 0.12);
    storage.add(label.plane);
  });
  const pestHazards = new THREE.Group();
  pestHazards.name = "storage-pests-and-moisture-hazards";
  for (let index = 0; index < 5; index += 1) {
    const pest = mesh(
      geometry(new THREE.SphereGeometry(0.11, 12, 8)),
      standard({ color: 0x4a2a1f, roughness: 0.92 }),
      "grain-storage-pest",
    );
    pest.scale.set(1.45, 0.65, 0.75);
    pest.position.set(
      1.45 + (index % 3) * 0.28,
      0.18,
      1.22 + Math.floor(index / 3) * 0.22,
    );
    pestHazards.add(pest);
  }
  storage.add(pestHazards);
  const storageShield = mesh(
    geometry(new THREE.TorusGeometry(1.0, 0.075, 10, 48)),
    basic({ color: 0x62e18a, transparent: true, opacity: 0.82 }),
    "safe-storage-shield",
  );
  storageShield.position.set(0.15, 1.1, 0.8);
  storageShield.visible = false;
  storage.add(storageShield);
  root.add(storage);
  stageGroups.push(storage);

  // Stage 7: assemble the complete field-to-store process in order.
  const summary = new THREE.Group();
  summary.name = "harvest-process-summary";
  const summaryIds = [
    "harvesting",
    "threshing",
    "winnowing",
    "drying",
    "storage",
  ] as const;
  const summaryLabels = ["HARVEST", "THRESH", "WINNOW", "DRY", "STORE"];
  const summaryNodes: THREE.Mesh[] = [];
  const summaryIcons: THREE.Object3D[] = [];
  summaryIds.forEach((processId, index) => {
    const x = (index - 2) * 1.45;
    const nodeMaterial = standard({
      color: 0x856430,
      emissive: 0x2f2108,
      emissiveIntensity: 0.12,
      roughness: 0.58,
    });
    const node = mesh(
      geometry(new THREE.CylinderGeometry(0.52, 0.62, 0.3, 28)),
      nodeMaterial,
      `process-step-${processId}`,
    );
    node.position.set(x, 0.2, 0);
    node.userData.interactive = true;
    summary.add(node);
    summaryNodes.push(node);

    let icon: THREE.Object3D;
    if (processId === "harvesting") {
      const iconGroup = new THREE.Group();
      const handle = mesh(
        geometry(new THREE.CylinderGeometry(0.035, 0.045, 0.7, 9)),
        woodMaterial,
      );
      handle.rotation.z = -0.7;
      const blade = mesh(
        geometry(new THREE.TorusGeometry(0.25, 0.035, 7, 26, Math.PI * 1.2)),
        silverMaterial,
      );
      blade.position.set(0.08, 0.28, 0);
      iconGroup.add(handle, blade);
      icon = iconGroup;
    } else if (processId === "threshing") {
      const drum = mesh(
        geometry(new THREE.CylinderGeometry(0.3, 0.3, 0.56, 20)),
        silverMaterial,
      );
      drum.rotation.z = Math.PI / 2;
      icon = drum;
    } else if (processId === "winnowing") {
      const tray = mesh(
        geometry(new THREE.CylinderGeometry(0.42, 0.34, 0.1, 26, 1, true)),
        woodMaterial,
      );
      tray.rotation.z = -0.16;
      icon = tray;
    } else if (processId === "drying") {
      const sun = mesh(
        geometry(new THREE.SphereGeometry(0.3, 18, 12)),
        standard({
          color: 0xffd25a,
          emissive: 0xf1891c,
          emissiveIntensity: 0.85,
        }),
      );
      icon = sun;
    } else {
      icon = makeSilo(0.86, 0.3);
      icon.scale.setScalar(0.9);
    }
    icon.position.set(x, 0.78, 0);
    icon.name = `summary-icon-${processId}`;
    summary.add(icon);
    summaryIcons.push(icon);
    const label = textLabel(summaryLabels[index], 1.08);
    label.plane.position.set(x, 1.65, 0);
    summary.add(label.plane);
    if (index < summaryIds.length - 1) {
      const arrow = mesh(
        geometry(new THREE.ConeGeometry(0.11, 0.34, 8)),
        basic({ color: 0xe5bd55 }),
        "process-flow-arrow",
      );
      arrow.rotation.z = -Math.PI / 2;
      arrow.position.set(x + 0.73, 0.95, 0);
      summary.add(arrow);
    }
  });
  const summaryThreshingCallout = textLabel(
    "THRESHING: GRAIN FROM STALK",
    2.55,
    "#ffe69a",
  );
  summaryThreshingCallout.plane.position.set(-1.25, 2.35, 0);
  summary.add(summaryThreshingCallout.plane);
  const summaryWinnowingCallout = textLabel(
    "WINNOWING: CHAFF FROM GRAIN",
    2.65,
    "#dff8e3",
  );
  summaryWinnowingCallout.plane.position.set(1.45, 2.35, 0);
  summary.add(summaryWinnowingCallout.plane);
  root.add(summary);
  stageGroups.push(summary);

  // Stage 8: four evidence-based decisions protect the final harvest.
  const challenge = new THREE.Group();
  challenge.name = "protect-the-harvest-challenge";
  const challengeIds = [
    "select-mature-crop",
    "arrange-farming-processes",
    "select-grain-separator",
    "choose-safe-storage",
  ] as const;
  const challengeLabels = [
    "PICK MATURE",
    "ORDER PROCESS",
    "PICK THRESHER",
    "STORE SAFELY",
  ];
  const challengeAliases: readonly (readonly string[])[] = [
    ["select-mature-crop", "mature-crop"],
    ["arrange-farming-processes", "process-order"],
    ["select-grain-separator", "thresher"],
    ["choose-safe-storage", "safe-storage"],
  ];
  const challengeStations: THREE.Group[] = [];
  const challengeCores: THREE.Mesh[] = [];
  challengeIds.forEach((challengeId, index) => {
    const station = new THREE.Group();
    station.name = `harvest-challenge-${challengeId}`;
    station.userData.interactive = true;
    station.position.set((index - 1.5) * 1.75, 0, 0);
    const platform = mesh(
      geometry(new THREE.CylinderGeometry(0.72, 0.82, 0.22, 28)),
      standard({ color: 0x705632, roughness: 0.86 }),
      `challenge-platform-${challengeId}`,
    );
    platform.position.y = 0.12;
    station.add(platform);
    const coreMaterial = standard({
      color: 0xd37b32,
      emissive: 0x67280a,
      emissiveIntensity: 0.32,
      roughness: 0.42,
    });
    const core = mesh(
      geometry(new THREE.OctahedronGeometry(0.18, 1)),
      coreMaterial,
      `challenge-core-${challengeId}`,
    );
    core.position.y = 1.85;
    station.add(core);
    challengeCores.push(core);
    const label = textLabel(challengeLabels[index], 1.48);
    label.plane.position.y = 2.25;
    station.add(label.plane);

    if (challengeId === "select-mature-crop") {
      const green = makeWheatStalk(false, 0.75);
      green.position.set(-0.25, 0.24, 0);
      const golden = makeWheatStalk(true, 0.75);
      golden.position.set(0.25, 0.24, 0);
      station.add(green, golden);
    } else if (challengeId === "arrange-farming-processes") {
      const processColors = [0xb48939, 0x7990a0, 0xd2aa54, 0xe8c75e, 0x678b75];
      for (let processIndex = 0; processIndex < 5; processIndex += 1) {
        const tile = mesh(
          geometry(new THREE.BoxGeometry(0.22, 0.22, 0.22)),
          standard({
            color: processColors[processIndex],
            roughness: 0.62,
            emissive: 0x171307,
            emissiveIntensity: 0.08,
          }),
          `ordered-process-${processIndex + 1}`,
        );
        tile.position.set(
          (processIndex - 2) * 0.25,
          0.72 + processIndex * 0.1,
          0,
        );
        station.add(tile);
      }
    } else if (challengeId === "select-grain-separator") {
      const thresher = mesh(
        geometry(new THREE.BoxGeometry(0.62, 0.56, 0.5)),
        greenMachineMaterial,
        "correct-grain-thresher",
      );
      thresher.position.set(0, 0.62, 0);
      const drum = mesh(
        geometry(new THREE.CylinderGeometry(0.18, 0.18, 0.48, 16)),
        silverMaterial,
      );
      drum.rotation.z = Math.PI / 2;
      drum.position.set(0, 0.75, 0.28);
      station.add(thresher, drum);
      const distractorPipe = mesh(
        geometry(new THREE.CylinderGeometry(0.04, 0.04, 0.52, 9)),
        darkMetalMaterial,
        "irrigation-pump-distractor",
      );
      distractorPipe.position.set(-0.48, 0.5, 0);
      const distractorDrill = mesh(
        geometry(new THREE.ConeGeometry(0.12, 0.52, 10)),
        redMachineMaterial,
        "seed-drill-distractor",
      );
      distractorDrill.position.set(0.5, 0.5, 0);
      station.add(distractorPipe, distractorDrill);
    } else {
      const miniSilo = makeSilo(0.88, 0.3);
      miniSilo.position.set(-0.22, 0.24, 0);
      miniSilo.scale.setScalar(0.82);
      station.add(miniSilo);
      const miniPallet = mesh(
        geometry(new THREE.BoxGeometry(0.7, 0.09, 0.46)),
        woodMaterial,
        "safe-raised-platform",
      );
      miniPallet.position.set(0.18, 0.34, 0.12);
      const cleanBag = makeSack(0xcab37e);
      cleanBag.position.set(0.22, 0.38, 0.05);
      cleanBag.scale.setScalar(0.52);
      station.add(miniPallet, cleanBag);
      const tornBag = makeSack(0x77664a);
      tornBag.name = "unsafe-torn-bag-on-floor";
      tornBag.position.set(0.52, 0.12, 0.26);
      tornBag.scale.setScalar(0.34);
      tornBag.rotation.z = 0.9;
      station.add(tornBag);
    }
    challenge.add(station);
    challengeStations.push(station);
  });

  const harvestShield = new THREE.Group();
  harvestShield.name = "protected-harvest-shield";
  const shieldRing = mesh(
    geometry(new THREE.TorusGeometry(2.15, 0.09, 10, 64)),
    basic({ color: 0x66e38c, transparent: true, opacity: 0.86 }),
  );
  const shieldArc = mesh(
    geometry(
      new THREE.SphereGeometry(2.12, 42, 22, 0, Math.PI * 2, 0, Math.PI / 2),
    ),
    basic({
      color: 0x5ce49b,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  shieldArc.rotation.x = Math.PI / 2;
  harvestShield.add(shieldRing, shieldArc);
  harvestShield.position.set(0, 1.25, 0.35);
  harvestShield.visible = false;
  challenge.add(harvestShield);
  root.add(challenge);
  stageGroups.push(challenge);

  const instruction = makeCard(4.9, 1.86, 1024, 390, true);
  instruction.plane.position.set(0, 3.28, -3.15);
  instruction.plane.name = "harvesting-storage-instruction-panel";
  root.add(instruction.plane);
  const action = makeCard(2.55, 0.68, 860, 230, true);
  action.plane.position.set(0, 0.88, -2.72);
  action.plane.name = "harvesting-storage-primary-action";
  action.plane.userData.interactive = true;
  root.add(action.plane);

  const interactables: THREE.Object3D[] = [
    action.plane,
    unripePlot,
    maturePlot,
    harvestingBed,
    sickle,
    combine,
    ...threshingStations,
    winnowingBasket,
    handFan,
    dryingTarp,
    moistureMeter,
    storageSilo,
    pallet,
    sealedBin,
    ...summaryNodes,
    ...challengeStations,
  ];

  stageGroups.forEach((group, index) => {
    group.visible = index === 0;
  });

  let currentSnapshot: HarvestingStorageWorldSnapshot | undefined;
  let lastStage = -1;
  let lastFeedback = "";
  let lastActionLabel = "";
  let lastCompleted = false;
  let lastMoisture = Number.NaN;

  const paintMoistureReadout = (moisture: number) => {
    const context = moistureReadout.canvas.getContext("2d");
    if (!context) return;
    const safe = moisture <= 14;
    const gradient = context.createLinearGradient(
      0,
      0,
      moistureReadout.canvas.width,
      moistureReadout.canvas.height,
    );
    gradient.addColorStop(0, safe ? "#195f38" : "#713b20");
    gradient.addColorStop(1, safe ? "#49bd69" : "#df8340");
    context.fillStyle = gradient;
    context.fillRect(
      0,
      0,
      moistureReadout.canvas.width,
      moistureReadout.canvas.height,
    );
    context.strokeStyle = safe ? "#b8ffbe" : "#ffe2a4";
    context.lineWidth = 8;
    context.strokeRect(
      5,
      5,
      moistureReadout.canvas.width - 10,
      moistureReadout.canvas.height - 10,
    );
    context.fillStyle = "#ffffff";
    context.font = "900 92px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      `${Math.round(moisture)}%`,
      moistureReadout.canvas.width / 2,
      112,
    );
    context.font = "800 32px sans-serif";
    context.fillText(
      safe ? "SAFE TO STORE" : "KEEP DRYING • TARGET ≤14%",
      moistureReadout.canvas.width / 2,
      220,
    );
    context.textAlign = "start";
    context.textBaseline = "alphabetic";
    moistureReadout.texture.needsUpdate = true;
  };

  const setSnapshot = (snapshot: HarvestingStorageWorldSnapshot) => {
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

    maturityMarkers.forEach((marker, index) => {
      const checked = snapshot.maturityChecks.includes(maturityCheckIds[index]);
      const material = marker.material as THREE.MeshStandardMaterial;
      material.color.set(checked ? 0x69d77d : 0x7a6532);
      material.emissive.set(checked ? 0x22763a : 0x241c05);
      material.emissiveIntensity = checked ? 0.72 : 0.12;
      marker.scale.setScalar(checked ? 1.24 : 0.86);
    });
    const maturityComplete = maturityCheckIds.every((check) =>
      snapshot.maturityChecks.includes(check),
    );
    maturePlot.scale.setScalar(maturityComplete ? 1.05 : 1);
    unripePlot.scale.setScalar(snapshot.maturityChecks.length ? 0.92 : 1);
    maturityScanner.visible =
      snapshot.maturityChecks.length < maturityCheckIds.length;

    const harvestProgress = progressPercent(snapshot.harvestProgress, 4);
    const cutCount = Math.round((harvestProgress / 100) * harvestStalks.length);
    harvestStalks.forEach((stalk, index) => {
      stalk.visible = index >= cutCount;
    });
    harvestStubble.forEach((stubble, index) => {
      stubble.visible = index < cutCount;
    });
    sickle.visible =
      !snapshot.harvestMethod || snapshot.harvestMethod === "sickle";
    combine.visible =
      !snapshot.harvestMethod || snapshot.harvestMethod === "combine";
    sickle.position.x = -2.55 + harvestProgress * 0.049;
    sickle.position.z = 1.7 - Math.floor(harvestProgress / 18) * 0.46;
    combine.position.z = 1.72 - harvestProgress * 0.028;

    const selectedThreshingIndex =
      snapshot.threshingMethod === "combine"
        ? 2
        : snapshot.threshingMethod === "thresher"
          ? 1
          : 0;
    threshingStations.forEach((station, index) => {
      const selected = index === selectedThreshingIndex;
      station.scale.setScalar(
        !snapshot.threshingMethod ? 1 : selected ? 1.08 : 0.86,
      );
    });
    const threshingProgress = clamp(snapshot.threshingStep, 0, 4) / 4;
    const separatedCount = Math.round(
      threshingProgress * separatedGrains.length,
    );
    separatedGrains.forEach((grain, index) => {
      grain.visible = index < separatedCount;
    });
    strawOutlet.visible = snapshot.threshingStep >= 2;

    const winnowProgress = progressPercent(snapshot.winnowingProgress, 4);
    airflowArrows.forEach((airflow) => {
      airflow.visible = winnowProgress > 0;
    });
    winnowingGrains.forEach((grain, index) => {
      grain.visible = winnowProgress > (index / winnowingGrains.length) * 100;
    });
    chaffParticles.forEach((chaff, index) => {
      chaff.visible = winnowProgress > (index / chaffParticles.length) * 100;
    });

    const moisture = moisturePercent(snapshot.grainMoisture);
    if (moisture !== lastMoisture) {
      paintMoistureReadout(moisture);
      lastMoisture = moisture;
    }
    const moistureHeight = clamp((moisture - 8) / 22, 0.04, 1);
    moistureBar.scale.y = moistureHeight;
    moistureBar.position.y = 0.33 + moistureHeight / 2;
    moistureBarMaterial.color.set(moisture <= 14 ? 0x4ac36c : 0xd87138);
    moistureBarMaterial.emissive.set(moisture <= 14 ? 0x155d2b : 0x6f2d12);
    const visibleDroplets = Math.round(
      (moisture / 30) * moistureDroplets.length,
    );
    moistureDroplets.forEach((droplet, index) => {
      droplet.visible = index < visibleDroplets;
    });
    dryingGrains.forEach((grain, index) => {
      grain.rotation.x = moisture > 14 ? (index % 4) * 0.08 : 0;
    });

    storageMarkers.forEach((marker, index) => {
      const checked = snapshot.storageChecks.includes(storageCheckIds[index]);
      const material = marker.material as THREE.MeshStandardMaterial;
      material.color.set(checked ? 0x54cf76 : 0xd07b32);
      material.emissive.set(checked ? 0x16763a : 0x612608);
      material.emissiveIntensity = checked ? 0.7 : 0.28;
      marker.scale.setScalar(checked ? 1.2 : 0.86);
    });
    const storageComplete = storageCheckIds.every((check) =>
      snapshot.storageChecks.includes(check),
    );
    const lidClosed = snapshot.storageChecks.includes("metal-bin");
    binLid.position.y = lidClosed ? 1.62 : 1.86;
    binLid.rotation.z = lidClosed ? 0 : 0.28;
    pestHazards.visible = !storageComplete;
    storageShield.visible = storageComplete;

    const summaryProgress = clamp(
      snapshot.sequenceCount,
      0,
      summaryNodes.length,
    );
    summaryNodes.forEach((node, index) => {
      const complete = index < summaryProgress;
      const material = node.material as THREE.MeshStandardMaterial;
      material.color.set(complete ? 0x52bf6f : 0x856430);
      material.emissive.set(complete ? 0x176735 : 0x2f2108);
      material.emissiveIntensity = complete ? 0.66 : 0.12;
      node.position.y = complete ? 0.28 : 0.2;
      summaryIcons[index].scale.setScalar(complete ? 1.12 : 0.9);
    });

    challengeCores.forEach((core, index) => {
      const matched = challengeAliases[index].some((matchId) =>
        snapshot.challengeMatches.includes(matchId),
      );
      const material = core.material as THREE.MeshStandardMaterial;
      material.color.set(matched ? 0x58d879 : 0xd37b32);
      material.emissive.set(matched ? 0x16783a : 0x67280a);
      material.emissiveIntensity = matched ? 0.76 : 0.32;
      challengeStations[index].scale.setScalar(matched ? 1.04 : 0.94);
    });
    harvestShield.visible = snapshot.completed;
  };

  const update = (elapsed: number, activeCamera: THREE.Camera) => {
    maturityStalks.forEach((stalk, index) => {
      stalk.rotation.z = Math.sin(elapsed * 1.15 + index * 0.7) * 0.018;
      stalk.rotation.x = Math.cos(elapsed * 0.9 + index * 0.53) * 0.012;
    });
    maturityScanner.rotation.z = elapsed * 0.52;
    maturityMarkers.forEach((marker, index) => {
      marker.rotation.y = elapsed * 0.55 + index;
    });

    harvestStalks.forEach((stalk, index) => {
      stalk.rotation.z = Math.sin(elapsed * 1.35 + index * 0.42) * 0.016;
    });
    combineReel.rotation.x = elapsed * 3.2;
    sickle.rotation.z = Math.sin(elapsed * 4.8) * 0.16;

    threshingDrums.forEach((drum, index) => {
      if (index === 0) {
        drum.rotation.z = -0.72 + Math.sin(elapsed * 4.2) * 0.42;
      } else {
        drum.rotation.x = elapsed * (2.4 + index * 0.55);
      }
    });
    separatedGrains.forEach((grain, index) => {
      grain.rotation.z = elapsed * (0.4 + (index % 4) * 0.1);
    });

    fanBlades.rotation.z = -elapsed * 4.5;
    airflowArrows.forEach((airflow, index) => {
      const material = airflow.material as THREE.MeshBasicMaterial;
      material.opacity = 0.28 + (Math.sin(elapsed * 3 + index) + 1) * 0.12;
    });
    const winnowProgress = progressPercent(
      currentSnapshot?.winnowingProgress ?? 0,
      4,
    );
    winnowingBasket.rotation.z = Math.sin(elapsed * 2.1) * 0.06;
    winnowingGrains.forEach((grain, index) => {
      const threshold = (index / winnowingGrains.length) * 100;
      const separated = winnowProgress > threshold;
      const phase = Number(grain.userData.phase ?? 0);
      const offsetX = Number(grain.userData.offsetX ?? 0);
      const offsetZ = Number(grain.userData.offsetZ ?? 0);
      if (separated) {
        grain.position.set(
          0.55 + offsetX,
          0.14 + Math.abs(Math.sin(elapsed * 1.8 + phase * 9)) * 0.025,
          0.72 + offsetZ,
        );
      } else {
        grain.position.set(
          offsetX,
          1.05 + Math.sin(elapsed * 2.2 + phase * 8) * 0.08,
          offsetZ,
        );
      }
      grain.rotation.z = elapsed * 0.8 + index;
    });
    chaffParticles.forEach((chaff, index) => {
      const threshold = (index / chaffParticles.length) * 100;
      const separated = winnowProgress > threshold;
      const phase = Number(chaff.userData.phase ?? 0);
      const offsetY = Number(chaff.userData.offsetY ?? 0);
      const offsetZ = Number(chaff.userData.offsetZ ?? 0);
      if (separated) {
        const travel = 1.1 + winnowProgress * 0.018 + phase * 0.65;
        chaff.position.set(
          travel,
          0.72 + offsetY + Math.sin(elapsed * 2.5 + index) * 0.16,
          offsetZ,
        );
      } else {
        chaff.position.set(
          phase * 0.45 - 0.2,
          1.1 + offsetY * 0.3,
          offsetZ * 0.5,
        );
      }
      chaff.rotation.z = elapsed * (0.7 + (index % 4) * 0.16);
      chaff.rotation.y = elapsed * 0.52 + phase * 5;
    });

    dryingSun.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.035);
    dryingRays.forEach((ray, index) => {
      ray.scale.y = 0.82 + Math.sin(elapsed * 2.2 + index) * 0.16;
    });
    moistureDroplets.forEach((droplet, index) => {
      droplet.position.y = 0.38 + ((elapsed * 0.16 + index * 0.09) % 0.62);
      droplet.scale.setScalar(0.78 + Math.sin(elapsed * 2 + index) * 0.12);
    });

    storageShield.rotation.z = elapsed * 0.34;
    summaryIcons.forEach((icon, index) => {
      icon.rotation.y = Math.sin(elapsed * 0.8 + index) * 0.12;
    });
    challengeCores.forEach((core, index) => {
      core.rotation.y = elapsed * 0.62 + index;
      core.position.y = 1.85 + Math.sin(elapsed * 1.8 + index) * 0.06;
    });
    harvestShield.rotation.y = elapsed * 0.18;
    harvestShield.scale.setScalar(1 + Math.sin(elapsed * 2) * 0.025);

    billboards.forEach((card) => {
      card.lookAt(activeCamera.position);
    });
    action.plane.scale.setScalar(1 + Math.sin(elapsed * 2.6) * 0.025);
  };

  const dispose = () => {
    scene.remove(root, hemisphere, sunlight);
    if (scene.background === environmentTexture)
      scene.background = previousBackground;
    if (scene.environment === environmentTexture)
      scene.environment = previousEnvironment;
    if (scene.fog === farmFog) scene.fog = previousFog;
    geometries.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    textures.forEach((item) => item.dispose());
    geometries.clear();
    materials.clear();
    textures.clear();
    billboards.length = 0;
    interactables.length = 0;
    renderer.setAnimationLoop(null);
  };

  return { root, interactables, setSnapshot, update, dispose };
}
