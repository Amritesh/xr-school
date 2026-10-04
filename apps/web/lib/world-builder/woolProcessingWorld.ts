import * as THREE from 'three';

export type WoolSeason = 'winter' | 'rainy' | 'summer';
export type WoolExperiment = 'cold' | 'controlled' | 'hot';

export interface WoolWorldSnapshot {
  stage: number;
  season?: WoolSeason;
  shearingProgress: number;
  detectedImpurities: readonly string[];
  experiment?: WoolExperiment;
  scouringStep: number;
  comparedSamples: readonly string[];
  sequenceCount: number;
  quizComplete: boolean;
  feedback: string;
  actionLabel: string;
  title: string;
  cue: string;
}

interface SheepModel {
  root: THREE.Group;
  fleece: THREE.Mesh[];
  body: THREE.Mesh;
  bodyMaterial: THREE.MeshStandardMaterial;
  head: THREE.Group;
  tail: THREE.Mesh;
}

const materials = new Set<THREE.Material>();
const geometries = new Set<THREE.BufferGeometry>();

function standard(parameters: THREE.MeshStandardMaterialParameters) {
  const material = new THREE.MeshStandardMaterial(parameters);
  materials.add(material);
  return material;
}

function basic(parameters: THREE.MeshBasicMaterialParameters) {
  const material = new THREE.MeshBasicMaterial(parameters);
  materials.add(material);
  return material;
}

function geometry<T extends THREE.BufferGeometry>(value: T): T {
  geometries.add(value);
  return value;
}

function mesh(
  shape: THREE.BufferGeometry,
  material: THREE.Material,
  name?: string,
) {
  const result = new THREE.Mesh(shape, material);
  if (name) result.name = name;
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function makeTextPlane(
  width: number,
  height: number,
  canvasWidth = 1024,
  canvasHeight = 360,
) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plane = mesh(
    geometry(new THREE.PlaneGeometry(width, height)),
    basic({ map: texture, transparent: true, depthWrite: false }),
  );
  plane.renderOrder = 20;
  return { canvas, texture, plane };
}

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
  let line = '';
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

function drawInstructionCard(
  canvas: HTMLCanvasElement,
  snapshot: WoolWorldSnapshot,
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, 'rgba(13, 34, 31, .97)');
  gradient.addColorStop(1, 'rgba(31, 63, 48, .97)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#f5d680';
  context.lineWidth = 8;
  context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
  context.fillStyle = '#f5d680';
  context.font = '700 30px sans-serif';
  context.fillText(`MISSION WOOL  •  ${snapshot.stage + 1}/10`, 42, 54);
  context.fillStyle = '#ffffff';
  context.font = '800 44px sans-serif';
  wrapText(context, snapshot.title, 42, 112, 930, 48, 2);
  context.fillStyle = '#dff5e6';
  context.font = '28px sans-serif';
  wrapText(context, snapshot.cue, 42, 218, 930, 34, 3);
  if (snapshot.feedback) {
    context.fillStyle = '#fff1b8';
    context.font = '700 25px sans-serif';
    wrapText(context, snapshot.feedback, 42, 328, 930, 30, 1);
  }
}

function drawActionButton(canvas: HTMLCanvasElement, label: string) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#b56f24');
  gradient.addColorStop(1, '#e7ad42');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#fff2bf';
  context.lineWidth = 8;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  context.fillStyle = '#161f18';
  context.font = '800 42px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  wrapText(context, label, canvas.width / 2, canvas.height / 2, canvas.width - 40, 44, 2);
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function createSheep(): SheepModel {
  const root = new THREE.Group();
  root.name = 'Woolly the sheep';

  const skin = standard({ color: 0x5b5043, roughness: 0.88 });
  const dark = standard({ color: 0x2f2a27, roughness: 0.92 });
  const wool = standard({ color: 0xf2ead4, roughness: 1 });
  const eye = standard({ color: 0x11110f, roughness: 0.35 });

  const bodyMaterial = standard({ color: 0x5b5043, roughness: 0.92 });
  const body = mesh(geometry(new THREE.SphereGeometry(0.92, 30, 22)), bodyMaterial, 'shorn-body');
  body.scale.set(1.28, 0.82, 0.72);
  body.position.y = 1.13;
  root.add(body);

  const fleece: THREE.Mesh[] = [];
  for (let ring = 0; ring < 5; ring += 1) {
    const angleY = -0.72 + ring * 0.36;
    const radiusY = Math.sin((ring + 1) * Math.PI / 6);
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2 + ring * 0.19;
      const puff = mesh(
        geometry(new THREE.IcosahedronGeometry(0.28, 2)),
        wool,
        'fleece-puff',
      );
      puff.scale.set(1.12, 0.96, 0.98);
      puff.position.set(
        Math.cos(angle) * 0.86 * radiusY,
        1.12 + angleY,
        Math.sin(angle) * 0.58 * radiusY,
      );
      root.add(puff);
      fleece.push(puff);
    }
  }

  const head = new THREE.Group();
  head.position.set(1.12, 1.44, 0);
  const face = mesh(geometry(new THREE.SphereGeometry(0.36, 24, 18)), skin);
  face.scale.set(0.85, 1.08, 0.78);
  head.add(face);
  const muzzle = mesh(geometry(new THREE.SphereGeometry(0.2, 20, 14)), dark);
  muzzle.scale.set(0.82, 0.64, 0.76);
  muzzle.position.set(0.18, -0.18, 0);
  head.add(muzzle);
  for (const side of [-1, 1]) {
    const ear = mesh(geometry(new THREE.SphereGeometry(0.16, 16, 10)), skin);
    ear.scale.set(1.35, 0.34, 0.68);
    ear.position.set(-0.04, 0.2, side * 0.31);
    ear.rotation.x = side * 0.25;
    head.add(ear);
    const eyeball = mesh(geometry(new THREE.SphereGeometry(0.045, 14, 10)), eye);
    eyeball.position.set(0.25, 0.08, side * 0.28);
    head.add(eyeball);
  }
  root.add(head);

  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.37, 0.37]) {
      const leg = mesh(geometry(new THREE.CylinderGeometry(0.075, 0.065, 0.8, 12)), dark);
      leg.position.set(x, 0.43, z);
      root.add(leg);
      const hoof = mesh(geometry(new THREE.BoxGeometry(0.18, 0.11, 0.15)), dark);
      hoof.position.set(x + 0.04, 0.06, z);
      root.add(hoof);
    }
  }
  const tail = mesh(geometry(new THREE.SphereGeometry(0.2, 14, 10)), wool);
  tail.scale.set(0.65, 1.15, 0.7);
  tail.position.set(-1.1, 1.36, 0);
  tail.rotation.z = -0.55;
  root.add(tail);
  return { root, fleece, body, bodyMaterial, head, tail };
}

function createTub(
  label: string,
  color: number,
  x: number,
  waterColor: number,
) {
  const group = new THREE.Group();
  group.position.x = x;
  const outer = mesh(
    geometry(new THREE.CylinderGeometry(0.62, 0.56, 0.72, 28, 1, true)),
    standard({ color, metalness: 0.42, roughness: 0.38, side: THREE.DoubleSide }),
  );
  outer.position.y = 0.38;
  group.add(outer);
  const rim = mesh(
    geometry(new THREE.TorusGeometry(0.62, 0.055, 10, 32)),
    standard({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.25 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.74;
  group.add(rim);
  const waterMaterial = standard({
    color: waterColor,
    transparent: true,
    opacity: 0.74,
    roughness: 0.18,
    metalness: 0.08,
  });
  const water = mesh(geometry(new THREE.CylinderGeometry(0.54, 0.54, 0.07, 28)), waterMaterial);
  water.position.y = 0.69;
  group.add(water);
  const tag = makeTextPlane(0.54, 0.22, 420, 150);
  const context = tag.canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#14231c';
    context.fillRect(0, 0, tag.canvas.width, tag.canvas.height);
    context.fillStyle = '#fff4c4';
    context.font = '800 58px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, tag.canvas.width / 2, tag.canvas.height / 2);
    tag.texture.needsUpdate = true;
  }
  tag.plane.position.set(0, 1.05, 0);
  group.add(tag.plane);
  return { group, water, waterMaterial };
}

function makeFleeceSample(color: number, clean: boolean) {
  const group = new THREE.Group();
  const sampleMaterial = standard({ color, roughness: 1 });
  for (let index = 0; index < 24; index += 1) {
    const puff = mesh(geometry(new THREE.IcosahedronGeometry(0.13, 1)), sampleMaterial);
    puff.position.set(
      ((index % 6) - 2.5) * 0.17,
      Math.floor(index / 6) * 0.12,
      ((index * 3) % 5 - 2) * 0.07,
    );
    puff.scale.set(1.2, clean ? 1.08 : 0.82, 0.86);
    group.add(puff);
  }
  return group;
}

export function createWoolProcessingWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
  const root = new THREE.Group();
  scene.add(root);
  scene.background = new THREE.Color(0x8dc6df);
  scene.fog = new THREE.FogExp2(0xbed7cb, 0.018);

  const environmentTexture = new THREE.TextureLoader().load(
    '/simulations/c7-ch03-a01-shearing-and-scouring-of-wool/environment.webp',
  );
  environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
  environmentTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = environmentTexture;
  scene.environment = environmentTexture;

  const hemi = new THREE.HemisphereLight(0xfff8e6, 0x304a34, 1.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffedbb, 3.4);
  sun.position.set(-5, 8, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const ground = mesh(
    geometry(new THREE.CircleGeometry(8.4, 96)),
    standard({ color: 0x5f8f42, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  root.add(ground);
  const stationFloor = mesh(
    geometry(new THREE.BoxGeometry(4.6, 0.16, 3.4)),
    standard({ color: 0x72523b, roughness: 0.92 }),
  );
  stationFloor.position.y = 0.08;
  root.add(stationFloor);

  const sheep = createSheep();
  sheep.root.position.set(-0.35, 0.06, 0.12);
  root.add(sheep.root);

  const weather = new THREE.Group();
  const rainMaterial = basic({ color: 0xa8ddff, transparent: true, opacity: 0.78 });
  const snowMaterial = basic({ color: 0xffffff, transparent: true, opacity: 0.92 });
  const rain: THREE.Mesh[] = [];
  const snow: THREE.Mesh[] = [];
  for (let index = 0; index < 48; index += 1) {
    const drop = mesh(geometry(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 5)), rainMaterial);
    drop.position.set(((index * 17) % 37) / 5 - 3.7, 0.5 + ((index * 13) % 28) / 7, ((index * 11) % 31) / 5 - 3.1);
    weather.add(drop);
    rain.push(drop);
    const flake = mesh(geometry(new THREE.SphereGeometry(0.035, 6, 5)), snowMaterial);
    flake.position.copy(drop.position);
    weather.add(flake);
    snow.push(flake);
  }
  root.add(weather);

  const scanner = mesh(
    geometry(new THREE.TorusGeometry(0.72, 0.025, 10, 72)),
    basic({ color: 0x67e8f9, transparent: true, opacity: 0.9 }),
  );
  scanner.rotation.y = Math.PI / 2;
  scanner.position.set(-0.35, 1.15, 0.12);
  root.add(scanner);

  const platform = mesh(
    geometry(new THREE.BoxGeometry(3.1, 0.18, 2.2)),
    standard({ color: 0x33473d, roughness: 0.78 }),
  );
  platform.position.set(-0.2, 0.18, 0.12);
  root.add(platform);

  const table = mesh(
    geometry(new THREE.BoxGeometry(1.7, 0.14, 0.82)),
    standard({ color: 0x8b633f, roughness: 0.82 }),
  );
  table.position.set(2.05, 0.96, 0.12);
  root.add(table);
  for (const x of [1.38, 2.72]) {
    for (const z of [-0.2, 0.44]) {
      const leg = mesh(
        geometry(new THREE.BoxGeometry(0.1, 0.9, 0.1)),
        standard({ color: 0x65432f, roughness: 0.9 }),
      );
      leg.position.set(x, 0.5, z);
      root.add(leg);
    }
  }

  const shears = new THREE.Group();
  const shearMetal = standard({ color: 0xbfc8cc, metalness: 0.82, roughness: 0.22 });
  const shearBody = mesh(geometry(new THREE.BoxGeometry(0.42, 0.17, 0.18)), shearMetal);
  shears.add(shearBody);
  for (const side of [-1, 1]) {
    const blade = mesh(geometry(new THREE.BoxGeometry(0.42, 0.035, 0.055)), shearMetal);
    blade.position.set(-0.38, side * 0.055, 0);
    blade.rotation.z = side * 0.11;
    shears.add(blade);
  }
  shears.position.set(2.0, 1.16, 0.08);
  shears.rotation.y = -0.25;
  root.add(shears);

  const guideLines = new THREE.Group();
  for (let index = 0; index < 4; index += 1) {
    const guide = mesh(
      geometry(new THREE.TorusGeometry(0.73 - index * 0.05, 0.013, 8, 64, Math.PI * 1.4)),
      basic({ color: 0x38bdf8, transparent: true, opacity: 0.95 }),
    );
    guide.rotation.set(Math.PI / 2, 0, index * 0.22 - 0.3);
    guide.position.set(-0.35, 1.08 + index * 0.12, 0.12);
    guideLines.add(guide);
  }
  root.add(guideLines);

  const inspection = new THREE.Group();
  const inspectionTable = mesh(
    geometry(new THREE.BoxGeometry(3.4, 0.2, 2.2)),
    standard({ color: 0x28444a, roughness: 0.58, metalness: 0.16 }),
  );
  inspectionTable.position.y = 0.82;
  inspection.add(inspectionTable);
  const rawFleece = makeFleeceSample(0xcdb87e, false);
  rawFleece.scale.setScalar(1.65);
  rawFleece.position.set(0, 1.04, 0);
  inspection.add(rawFleece);
  const impurityColors = [0x6b4423, 0x6aa7c8, 0x71843a, 0xe0ad4d];
  const impurities: THREE.Mesh[] = [];
  impurityColors.forEach((color, index) => {
    const impurity = mesh(
      geometry(index === 2 ? new THREE.ConeGeometry(0.09, 0.34, 7) : new THREE.SphereGeometry(0.1, 12, 9)),
      standard({ color, emissive: color, emissiveIntensity: 0.22, roughness: 0.7 }),
      `impurity-${index}`,
    );
    impurity.position.set(-0.76 + index * 0.5, 1.36 + (index % 2) * 0.12, (index % 2 ? -1 : 1) * 0.23);
    inspection.add(impurity);
    impurities.push(impurity);
  });
  root.add(inspection);

  const experiment = new THREE.Group();
  const coldTub = createTub('A · COLD WATER', 0x5681a8, -1.55, 0x67b8e8);
  const controlledTub = createTub('B · CONTROLLED WARM', 0x4b8a62, 0, 0x68c8b7);
  const hotTub = createTub('C · VERY HOT + ROUGH', 0xad5a4f, 1.55, 0xf08a68);
  experiment.add(coldTub.group, controlledTub.group, hotTub.group);
  const sampleA = makeFleeceSample(0xc4b27e, false);
  sampleA.scale.setScalar(0.7);
  sampleA.position.set(-1.55, 0.72, 0);
  const sampleB = makeFleeceSample(0xeee8d4, true);
  sampleB.scale.setScalar(0.7);
  sampleB.position.set(0, 0.72, 0);
  const sampleC = makeFleeceSample(0x8f8064, false);
  sampleC.scale.set(0.55, 0.55, 0.55);
  sampleC.position.set(1.55, 0.72, 0);
  experiment.add(sampleA, sampleB, sampleC);
  root.add(experiment);

  const scouring = new THREE.Group();
  const washTub = createTub('WASH', 0x477b78, -1.7, 0x60b6b1);
  const rinseOne = createTub('RINSE 1', 0x54738c, -0.35, 0x91cbe1);
  const rinseTwo = createTub('RINSE 2', 0x497b91, 1.0, 0xbde8f2);
  scouring.add(washTub.group, rinseOne.group, rinseTwo.group);
  const rollers = new THREE.Group();
  rollers.position.set(2.25, 0.68, 0);
  for (const y of [-0.17, 0.17]) {
    const roller = mesh(
      geometry(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 22)),
      standard({ color: 0xcbd5e1, metalness: 0.72, roughness: 0.24 }),
    );
    roller.rotation.z = Math.PI / 2;
    roller.position.y = y;
    rollers.add(roller);
  }
  scouring.add(rollers);
  const dryingRack = new THREE.Group();
  dryingRack.position.set(0.3, 0, -1.45);
  for (const x of [-1.25, 1.25]) {
    const post = mesh(
      geometry(new THREE.CylinderGeometry(0.045, 0.06, 1.3, 10)),
      standard({ color: 0x725235, roughness: 0.9 }),
    );
    post.position.set(x, 0.65, 0);
    dryingRack.add(post);
  }
  const bar = mesh(
    geometry(new THREE.CylinderGeometry(0.045, 0.045, 2.55, 10)),
    standard({ color: 0x725235, roughness: 0.9 }),
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 1.25;
  dryingRack.add(bar);
  const dryingWool = makeFleeceSample(0xf4f0df, true);
  dryingWool.scale.set(1.35, 0.7, 0.72);
  dryingWool.position.y = 0.84;
  dryingRack.add(dryingWool);
  scouring.add(dryingRack);
  const dirtyParticles: THREE.Mesh[] = [];
  for (let index = 0; index < 28; index += 1) {
    const particle = mesh(
      geometry(new THREE.SphereGeometry(0.025 + (index % 3) * 0.008, 7, 5)),
      basic({ color: index % 2 ? 0x7c522c : 0xd29a42 }),
    );
    particle.position.set(-1.7 + ((index % 6) - 2.5) * 0.15, 0.48 + (index % 5) * 0.08, ((index * 7) % 9 - 4) * 0.06);
    scouring.add(particle);
    dirtyParticles.push(particle);
  }
  root.add(scouring);

  const comparison = new THREE.Group();
  const rawCompare = makeFleeceSample(0xc2ae77, false);
  rawCompare.scale.setScalar(1.3);
  rawCompare.position.set(-1.15, 0.82, 0);
  const cleanCompare = makeFleeceSample(0xf6f3e8, true);
  cleanCompare.scale.setScalar(1.55);
  cleanCompare.position.set(1.15, 0.82, 0);
  comparison.add(rawCompare, cleanCompare);
  root.add(comparison);

  const timeline = new THREE.Group();
  const timelineBlocks: THREE.Mesh[] = [];
  const timelineColors = [0xefe3c3, 0xaab8bd, 0xc6ad6c, 0x4d8b81, 0x6bb5cd, 0xf3edda];
  for (let index = 0; index < 6; index += 1) {
    const block = mesh(
      geometry(new THREE.BoxGeometry(0.72, 0.45, 0.72)),
      standard({
        color: timelineColors[index],
        emissive: timelineColors[index],
        emissiveIntensity: 0.08,
        roughness: 0.65,
      }),
      `timeline-${index}`,
    );
    block.position.set((index - 2.5) * 0.88, 0.38, 0);
    timeline.add(block);
    timelineBlocks.push(block);
  }
  const timelineLine = mesh(
    geometry(new THREE.BoxGeometry(5.1, 0.05, 0.1)),
    basic({ color: 0xf6c85f }),
  );
  timelineLine.position.y = 0.08;
  timeline.add(timelineLine);
  root.add(timeline);

  const celebration = new THREE.Group();
  const badge = mesh(
    geometry(new THREE.CylinderGeometry(0.78, 0.78, 0.12, 48)),
    standard({ color: 0xf5c451, metalness: 0.72, roughness: 0.24, emissive: 0x7c4a05, emissiveIntensity: 0.28 }),
  );
  badge.rotation.x = Math.PI / 2;
  badge.position.y = 1.25;
  celebration.add(badge);
  const yarn = mesh(
    geometry(new THREE.TorusKnotGeometry(0.34, 0.1, 90, 14)),
    standard({ color: 0xb22e4b, roughness: 0.92 }),
  );
  yarn.position.set(-1.35, 0.7, 0);
  celebration.add(yarn);
  const sweater = new THREE.Group();
  const torso = mesh(
    geometry(new THREE.BoxGeometry(0.9, 1.0, 0.18)),
    standard({ color: 0xd25b5b, roughness: 0.96 }),
  );
  sweater.add(torso);
  for (const side of [-1, 1]) {
    const sleeve = mesh(
      geometry(new THREE.BoxGeometry(0.62, 0.28, 0.18)),
      standard({ color: 0xd25b5b, roughness: 0.96 }),
    );
    sleeve.position.set(side * 0.7, 0.22, 0);
    sleeve.rotation.z = side * 0.42;
    sweater.add(sleeve);
  }
  sweater.position.set(1.35, 0.9, 0);
  celebration.add(sweater);
  root.add(celebration);

  const instruction = makeTextPlane(3.8, 1.34);
  instruction.plane.position.set(0, 2.75, -2.1);
  root.add(instruction.plane);
  const action = makeTextPlane(1.65, 0.48, 760, 220);
  action.plane.position.set(0, 0.78, -1.42);
  action.plane.name = 'wool-primary-action';
  action.plane.userData.interactive = true;
  root.add(action.plane);

  const interactables: THREE.Object3D[] = [action.plane];
  let lastStage = -1;
  let lastActionLabel = '';
  let lastFeedback = '';
  let currentSnapshot: WoolWorldSnapshot | undefined;

  const setSnapshot = (snapshot: WoolWorldSnapshot) => {
    currentSnapshot = snapshot;
    const stageChanged = snapshot.stage !== lastStage;
    if (stageChanged || snapshot.feedback !== lastFeedback) {
      drawInstructionCard(instruction.canvas, snapshot);
      instruction.texture.needsUpdate = true;
      lastStage = snapshot.stage;
      lastFeedback = snapshot.feedback;
    }
    if (snapshot.actionLabel !== lastActionLabel) {
      drawActionButton(action.canvas, snapshot.actionLabel);
      action.texture.needsUpdate = true;
      lastActionLabel = snapshot.actionLabel;
    }

    const stage = snapshot.stage;
    sheep.root.visible = stage <= 3 || (stage === 9 && snapshot.quizComplete);
    stationFloor.visible = stage === 2 || stage === 3;
    platform.visible = stage === 2 || stage === 3;
    table.visible = stage === 2;
    shears.visible = stage === 2 || stage === 3;
    guideLines.visible = stage === 3;
    scanner.visible = stage === 0;
    inspection.visible = stage === 4;
    experiment.visible = stage === 5;
    scouring.visible = stage === 6;
    comparison.visible = stage === 7;
    timeline.visible = stage === 8;
    celebration.visible = stage === 9;
    weather.visible = stage === 1;

    rain.forEach(drop => {
      drop.visible = snapshot.season === 'rainy';
    });
    snow.forEach(flake => {
      flake.visible = snapshot.season === 'winter';
    });
    sun.intensity = snapshot.season === 'summer' ? 4.2 : 3.4;
    hemi.intensity = snapshot.season === 'winter' ? 1.18 : 1.8;

    sheep.fleece.forEach((puff, index) => {
      const removed = stage === 3 && index / sheep.fleece.length < snapshot.shearingProgress / 100;
      puff.visible = stage < 3 || (stage === 3 && !removed);
    });
    sheep.bodyMaterial.color.set(
      stage === 3 && snapshot.shearingProgress > 0 ? 0x796a58 : 0x5b5043,
    );

    impurities.forEach((impurity, index) => {
      const names = ['dust', 'sweat', 'grass', 'lanolin'];
      const detected = snapshot.detectedImpurities.includes(names[index]);
      impurity.scale.setScalar(detected ? 1.38 : 1);
      const material = impurity.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = detected ? 0.92 : 0.22;
    });
    sampleA.visible = !snapshot.experiment || snapshot.experiment === 'cold';
    sampleB.visible = !snapshot.experiment || snapshot.experiment === 'controlled';
    sampleC.visible = !snapshot.experiment || snapshot.experiment === 'hot';

    dirtyParticles.forEach((particle, index) => {
      particle.visible = snapshot.scouringStep >= 2 && snapshot.scouringStep < 4;
      particle.position.y = 0.42 + ((index * 0.07 + snapshot.scouringStep * 0.09) % 0.42);
    });
    washTub.waterMaterial.color.set(snapshot.scouringStep >= 2 ? 0x7b5a3c : 0x60b6b1);
    rinseOne.waterMaterial.color.set(snapshot.scouringStep >= 3 ? 0xa9c1c8 : 0x91cbe1);
    dryingRack.visible = snapshot.scouringStep >= 5;
    rollers.visible = snapshot.scouringStep >= 4;

    rawCompare.scale.setScalar(snapshot.comparedSamples.includes('raw') ? 1.48 : 1.3);
    cleanCompare.scale.setScalar(snapshot.comparedSamples.includes('clean') ? 1.72 : 1.55);
    timelineBlocks.forEach((block, index) => {
      const material = block.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = index < snapshot.sequenceCount ? 0.65 : 0.08;
      block.position.y = index < snapshot.sequenceCount ? 0.58 : 0.38;
    });
  };

  const update = (elapsed: number, activeCamera: THREE.Camera) => {
    sheep.head.rotation.z = Math.sin(elapsed * 1.1) * 0.045;
    sheep.tail.rotation.z = -0.55 + Math.sin(elapsed * 4.4) * 0.14;
    scanner.rotation.z = elapsed * 0.8;
    shears.position.y = 1.16 + Math.sin(elapsed * 7) * 0.012;
    impurities.forEach((impurity, index) => {
      impurity.rotation.y = elapsed * (0.42 + index * 0.08);
    });
    timelineBlocks.forEach((block, index) => {
      block.rotation.y = Math.sin(elapsed * 0.8 + index) * 0.08;
    });
    celebration.rotation.y = Math.sin(elapsed * 0.55) * 0.1;
    if (currentSnapshot?.season === 'rainy') {
      rain.forEach((drop, index) => {
        drop.position.y -= 0.08 + (index % 4) * 0.015;
        if (drop.position.y < 0.1) drop.position.y = 4.2;
      });
    }
    if (currentSnapshot?.season === 'winter') {
      snow.forEach((flake, index) => {
        flake.position.y -= 0.012 + (index % 3) * 0.004;
        flake.position.x += Math.sin(elapsed + index) * 0.0015;
        if (flake.position.y < 0.1) flake.position.y = 4.2;
      });
    }
    instruction.plane.lookAt(activeCamera.position);
    action.plane.lookAt(activeCamera.position);
    action.plane.scale.setScalar(1 + Math.sin(elapsed * 2.8) * 0.025);
  };

  const dispose = () => {
    scene.remove(root, hemi, sun);
    environmentTexture.dispose();
    instruction.texture.dispose();
    action.texture.dispose();
    geometries.forEach(item => item.dispose());
    materials.forEach(item => item.dispose());
    geometries.clear();
    materials.clear();
    renderer.setAnimationLoop(null);
  };

  return { root, interactables, setSnapshot, update, dispose };
}
