import * as THREE from 'three';

export interface IrrigationWorldSnapshot {
  stage: number;
  rootFeatures: readonly string[];
  waterSources: readonly string[];
  traditionalMethods: readonly string[];
  sprinklerStep: number;
  dripStep: number;
  comparedMethods: readonly string[];
  fieldMatches: readonly string[];
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
  if (line && lineIndex < maxLines) context.fillText(line, x, y + lineIndex * lineHeight);
}

function paintMissionCard(card: LabelCard, snapshot: IrrigationWorldSnapshot) {
  const context = card.canvas.getContext('2d');
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, card.canvas.width, card.canvas.height);
  gradient.addColorStop(0, 'rgba(18, 40, 25, .98)');
  gradient.addColorStop(1, 'rgba(17, 76, 82, .98)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, card.canvas.width, card.canvas.height);
  context.strokeStyle = snapshot.completed ? '#7df0a5' : '#62d7ee';
  context.lineWidth = 8;
  context.strokeRect(7, 7, card.canvas.width - 14, card.canvas.height - 14);
  context.fillStyle = snapshot.completed ? '#7df0a5' : '#75e8ff';
  context.font = '800 30px sans-serif';
  context.fillText(`WATER-WISE FARM  •  ${snapshot.stage + 1}/8`, 42, 54);
  context.fillStyle = '#ffffff';
  context.font = '800 44px sans-serif';
  wrapText(context, snapshot.title, 42, 112, 930, 48, 2);
  context.fillStyle = '#dff8ec';
  context.font = '28px sans-serif';
  wrapText(context, snapshot.cue, 42, 218, 930, 34, 3);
  if (snapshot.feedback) {
    context.fillStyle = '#fff0aa';
    context.font = '700 24px sans-serif';
    wrapText(context, snapshot.feedback, 42, 330, 930, 30, 1);
  }
  card.texture.needsUpdate = true;
}

function paintActionCard(card: LabelCard, label: string, complete: boolean) {
  const context = card.canvas.getContext('2d');
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, card.canvas.width, 0);
  gradient.addColorStop(0, complete ? '#2d9d5d' : '#1678a2');
  gradient.addColorStop(1, complete ? '#8ceca3' : '#69dbea');
  context.fillStyle = gradient;
  context.fillRect(0, 0, card.canvas.width, card.canvas.height);
  context.strokeStyle = '#f1fff7';
  context.lineWidth = 8;
  context.strokeRect(5, 5, card.canvas.width - 10, card.canvas.height - 10);
  context.fillStyle = '#092116';
  context.font = '800 40px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  wrapText(context, label, card.canvas.width / 2, card.canvas.height / 2 - 8, card.canvas.width - 48, 44, 2);
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
  card.texture.needsUpdate = true;
}

export function createIrrigationMethodsWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
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
  const mesh = (shape: THREE.BufferGeometry, material: THREE.Material, name?: string) => {
    const result = new THREE.Mesh(shape, material);
    if (name) result.name = name;
    result.castShadow = true;
    result.receiveShadow = true;
    return result;
  };
  const makeCard = (width: number, height: number, canvasWidth = 1024, canvasHeight = 390): LabelCard => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const plane = mesh(
      geometry(new THREE.PlaneGeometry(width, height)),
      basic({ map: texture, transparent: true, depthWrite: false }),
    );
    plane.renderOrder = 30;
    return { canvas, texture, plane };
  };
  const textLabel = (text: string, width = 1.5, color = '#e9fff4') => {
    const card = makeCard(width, 0.32, 640, 150);
    const context = card.canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(11, 38, 27, .92)';
      context.fillRect(0, 0, card.canvas.width, card.canvas.height);
      context.strokeStyle = '#61d6c9';
      context.lineWidth = 5;
      context.strokeRect(4, 4, card.canvas.width - 8, card.canvas.height - 8);
      context.fillStyle = color;
      context.font = '800 46px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, card.canvas.width / 2, card.canvas.height / 2);
      card.texture.needsUpdate = true;
    }
    return card;
  };
  const makePlant = (height = 0.72, healthy = true) => {
    const group = new THREE.Group();
    const stem = mesh(
      geometry(new THREE.CylinderGeometry(0.025, 0.04, height, 8)),
      standard({ color: healthy ? 0x3f9c45 : 0x8e7a3f, roughness: 0.78 }),
    );
    stem.position.y = height / 2;
    group.add(stem);
    for (let index = 0; index < 5; index += 1) {
      const leaf = mesh(
        geometry(new THREE.SphereGeometry(0.13, 14, 8)),
        standard({ color: healthy ? 0x5fb64b : 0xa48c46, roughness: 0.82 }),
      );
      leaf.scale.set(1.8, 0.22, 0.72);
      leaf.position.set((index % 2 ? 1 : -1) * 0.11, 0.22 + index * height / 7, 0);
      leaf.rotation.z = (index % 2 ? -1 : 1) * (healthy ? 0.35 : 0.92);
      group.add(leaf);
    }
    return group;
  };

  const root = new THREE.Group();
  root.name = 'Irrigation Methods learning farm';
  scene.add(root);

  const environmentTexture = new THREE.TextureLoader().load(
    '/simulations/c8-ch01-a03-irrigation-methods/environment.webp',
  );
  environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
  environmentTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(environmentTexture);
  scene.background = environmentTexture;
  scene.environment = environmentTexture;
  scene.fog = new THREE.FogExp2(0xc0d7ba, 0.008);

  const hemisphere = new THREE.HemisphereLight(0xdff7ff, 0x665238, 2.35);
  const sunlight = new THREE.DirectionalLight(0xffe5b8, 3.5);
  sunlight.position.set(-5, 8, 4);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  scene.add(hemisphere, sunlight);

  const floor = mesh(
    geometry(new THREE.CircleGeometry(8.8, 96)),
    standard({ color: 0x6b5533, roughness: 0.94, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.04;
  root.add(floor);

  const dryField = new THREE.Group();
  const dryPatchMaterial = standard({ color: 0x8e6c3d, roughness: 1 });
  const dryPatch = mesh(geometry(new THREE.CylinderGeometry(2.7, 2.7, 0.12, 64)), dryPatchMaterial, 'dry-soil');
  dryPatch.position.y = 0.02;
  dryField.add(dryPatch);
  const dryPlants: THREE.Group[] = [];
  for (let index = 0; index < 20; index += 1) {
    const plant = makePlant(0.55 + (index % 3) * 0.07, false);
    plant.position.set(((index % 5) - 2) * 0.72, 0.08, (Math.floor(index / 5) - 1.5) * 0.72);
    dryField.add(plant);
    dryPlants.push(plant);
  }
  for (let index = 0; index < 14; index += 1) {
    const crack = mesh(geometry(new THREE.BoxGeometry(0.52, 0.012, 0.025)), basic({ color: 0x2e241a }));
    crack.position.set(Math.sin(index * 2.2) * 2.1, 0.09, Math.cos(index * 1.37) * 1.9);
    crack.rotation.y = index * 1.19;
    dryField.add(crack);
  }
  const sourceTank = mesh(
    geometry(new THREE.CylinderGeometry(0.58, 0.62, 1.3, 28)),
    standard({ color: 0x587d86, metalness: 0.35, roughness: 0.42 }),
    'nearby-water-source',
  );
  sourceTank.position.set(3.2, 0.65, -0.6);
  dryField.add(sourceTank);
  root.add(dryField);

  const rootZone = new THREE.Group();
  const soilCutaway = mesh(
    geometry(new THREE.BoxGeometry(5.4, 1.45, 1.4)),
    standard({ color: 0x684126, roughness: 0.95, transparent: true, opacity: 0.92 }),
    'soil-cutaway',
  );
  soilCutaway.position.y = 0.72;
  rootZone.add(soilCutaway);
  const rootPlant = makePlant(1.75, true);
  rootPlant.position.set(0, 1.45, 0.5);
  rootZone.add(rootPlant);
  const roots = new THREE.Group();
  for (let index = 0; index < 18; index += 1) {
    const length = 0.55 + (index % 5) * 0.14;
    const rootBranch = mesh(
      geometry(new THREE.CylinderGeometry(0.018, 0.035, length, 7)),
      standard({ color: 0xe0c296, roughness: 0.9 }),
      'absorbing-root',
    );
    const angle = (index / 18) * Math.PI * 2;
    rootBranch.position.set(Math.cos(angle) * (0.15 + (index % 4) * 0.13), 1.18 - length / 2, Math.sin(angle) * 0.38 + 0.38);
    rootBranch.rotation.z = Math.cos(angle) * 0.5;
    rootBranch.rotation.x = Math.sin(angle) * 0.42;
    roots.add(rootBranch);
  }
  rootZone.add(roots);
  const waterDroplets: THREE.Mesh[] = [];
  const nutrientOrbs: THREE.Mesh[] = [];
  for (let index = 0; index < 24; index += 1) {
    const droplet = mesh(
      geometry(new THREE.SphereGeometry(0.055, 10, 8)),
      basic({ color: 0x48ccff, transparent: true, opacity: 0.9 }),
      'root-water-droplet',
    );
    droplet.position.set(Math.sin(index * 1.9) * 1.9, 0.25 + (index % 5) * 0.18, 0.55 + Math.cos(index) * 0.42);
    rootZone.add(droplet);
    waterDroplets.push(droplet);
    const nutrient = mesh(
      geometry(new THREE.OctahedronGeometry(0.045, 0)),
      basic({ color: index % 2 ? 0xffcf52 : 0xff7e63 }),
      'dissolved-mineral',
    );
    nutrient.position.copy(droplet.position).add(new THREE.Vector3(0.1, 0.03, -0.04));
    rootZone.add(nutrient);
    nutrientOrbs.push(nutrient);
  }
  root.add(rootZone);

  const waterSourceMap = new THREE.Group();
  const sourceIds = ['well', 'tube-well', 'pond', 'river', 'dam', 'canal'] as const;
  const sourceLabels = ['WELL', 'TUBE WELL', 'POND', 'RIVER', 'DAM', 'CANAL'];
  const sourceGroups: THREE.Group[] = [];
  sourceIds.forEach((sourceId, index) => {
    const angle = -Math.PI * 0.72 + index * (Math.PI * 0.29);
    const group = new THREE.Group();
    group.position.set(Math.sin(angle) * 3.05, 0, -Math.cos(angle) * 2.25);
    const base = mesh(
      geometry(new THREE.CylinderGeometry(0.56, 0.72, 0.32, 28)),
      standard({ color: 0x5a6848, roughness: 0.72 }),
    );
    base.position.y = 0.16;
    group.add(base);
    if (sourceId === 'well') {
      const well = mesh(geometry(new THREE.CylinderGeometry(0.38, 0.44, 0.64, 24, 1, true)), standard({ color: 0x8f765d, roughness: 0.9, side: THREE.DoubleSide }));
      well.position.y = 0.64;
      group.add(well);
    } else if (sourceId === 'tube-well') {
      const pipe = mesh(geometry(new THREE.CylinderGeometry(0.09, 0.09, 1.12, 14)), standard({ color: 0x65727a, metalness: 0.72, roughness: 0.34 }));
      pipe.position.y = 0.86;
      const outlet = mesh(geometry(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 12)), standard({ color: 0x65727a, metalness: 0.72 }));
      outlet.rotation.z = Math.PI / 2;
      outlet.position.set(0.22, 1.3, 0);
      group.add(pipe, outlet);
    } else if (sourceId === 'pond' || sourceId === 'river' || sourceId === 'canal') {
      const waterShape = sourceId === 'pond'
        ? geometry(new THREE.CircleGeometry(0.48, 30))
        : geometry(new THREE.BoxGeometry(0.88, 0.05, sourceId === 'river' ? 0.72 : 0.38));
      const water = mesh(
        waterShape,
        basic({ color: 0x49bde2, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
      );
      if (sourceId === 'pond') water.rotation.x = -Math.PI / 2;
      water.position.y = 0.38;
      group.add(water);
    } else {
      const wall = mesh(geometry(new THREE.BoxGeometry(0.9, 0.78, 0.22)), standard({ color: 0x777a72, roughness: 0.82 }));
      wall.position.y = 0.7;
      const reservoir = mesh(geometry(new THREE.BoxGeometry(0.86, 0.08, 0.68)), basic({ color: 0x4dbce2, transparent: true, opacity: 0.8 }));
      reservoir.position.set(0, 0.42, -0.38);
      group.add(wall, reservoir);
    }
    const label = textLabel(sourceLabels[index], 1.22);
    label.plane.position.y = 1.72;
    group.add(label.plane);
    waterSourceMap.add(group);
    sourceGroups.push(group);
  });
  root.add(waterSourceMap);

  const traditional = new THREE.Group();
  const traditionalIds = ['moat', 'dhekli', 'chain-pump', 'rahat'] as const;
  const traditionalLabels = ['MOAT + PULLEY', 'DHEKLI LEVER', 'CHAIN PUMP', 'RAHAT WHEEL'];
  const traditionalGroups: THREE.Group[] = [];
  const rotatingWheels: THREE.Object3D[] = [];
  traditionalIds.forEach((methodId, index) => {
    const group = new THREE.Group();
    group.position.set((index - 1.5) * 1.75, 0, 0);
    const well = mesh(geometry(new THREE.CylinderGeometry(0.42, 0.5, 0.58, 24, 1, true)), standard({ color: 0x8a745d, roughness: 0.88, side: THREE.DoubleSide }));
    well.position.y = 0.3;
    group.add(well);
    if (methodId === 'moat') {
      const frame = mesh(geometry(new THREE.BoxGeometry(0.08, 1.7, 0.08)), standard({ color: 0x6d4a2c, roughness: 0.85 }));
      frame.position.set(0, 1.12, 0);
      const pulley = mesh(geometry(new THREE.TorusGeometry(0.24, 0.045, 8, 26)), standard({ color: 0x47413a, metalness: 0.5 }));
      pulley.position.y = 1.75;
      group.add(frame, pulley);
      rotatingWheels.push(pulley);
    } else if (methodId === 'dhekli') {
      const post = mesh(geometry(new THREE.CylinderGeometry(0.07, 0.09, 1.55, 10)), standard({ color: 0x694426, roughness: 0.9 }));
      post.position.y = 0.9;
      const lever = mesh(geometry(new THREE.BoxGeometry(1.45, 0.09, 0.09)), standard({ color: 0x8a5a2f, roughness: 0.9 }));
      lever.position.set(0.28, 1.46, 0);
      lever.rotation.z = -0.24;
      group.add(post, lever);
      rotatingWheels.push(lever);
    } else {
      const wheel = mesh(geometry(new THREE.TorusGeometry(methodId === 'rahat' ? 0.58 : 0.46, 0.06, 10, 42)), standard({ color: 0x59646a, metalness: 0.48, roughness: 0.5 }));
      wheel.position.y = 1.13;
      group.add(wheel);
      for (let spoke = 0; spoke < 8; spoke += 1) {
        const spokeMesh = mesh(geometry(new THREE.BoxGeometry(methodId === 'rahat' ? 1.02 : 0.78, 0.025, 0.025)), standard({ color: 0x6b7478, metalness: 0.4 }));
        spokeMesh.position.copy(wheel.position);
        spokeMesh.rotation.z = spoke * Math.PI / 4;
        group.add(spokeMesh);
      }
      rotatingWheels.push(wheel);
    }
    const label = textLabel(traditionalLabels[index], 1.55);
    label.plane.position.y = 2.2;
    group.add(label.plane);
    traditional.add(group);
    traditionalGroups.push(group);
  });
  root.add(traditional);

  const sprinkler = new THREE.Group();
  const pump = mesh(geometry(new THREE.BoxGeometry(0.95, 0.72, 0.78)), standard({ color: 0x356c7b, metalness: 0.42, roughness: 0.38 }), 'sprinkler-pump');
  pump.position.set(-2.8, 0.4, 1.2);
  sprinkler.add(pump);
  const mainPipe = mesh(geometry(new THREE.CylinderGeometry(0.075, 0.075, 6.2, 16)), standard({ color: 0x333d43, metalness: 0.48, roughness: 0.42 }), 'main-pressure-pipe');
  mainPipe.rotation.z = Math.PI / 2;
  mainPipe.position.set(0, 0.12, 0.85);
  sprinkler.add(mainPipe);
  const sprinklerHeads: THREE.Group[] = [];
  const sprinklerDrops: THREE.Mesh[] = [];
  const coverageRings: THREE.Mesh[] = [];
  for (let index = 0; index < 3; index += 1) {
    const head = new THREE.Group();
    head.position.set((index - 1) * 2.25, 0, 0);
    const riser = mesh(geometry(new THREE.CylinderGeometry(0.055, 0.065, 1.42, 12)), standard({ color: 0x4d5a60, metalness: 0.55 }));
    riser.position.y = 0.72;
    const nozzle = mesh(geometry(new THREE.BoxGeometry(0.68, 0.08, 0.09)), standard({ color: 0x2d353a, metalness: 0.64 }));
    nozzle.position.y = 1.43;
    head.add(riser, nozzle);
    sprinkler.add(head);
    sprinklerHeads.push(head);
    const ring = mesh(geometry(new THREE.RingGeometry(0.9, 1.75, 56)), basic({ color: 0x5bcbed, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(head.position.x, 0.025, head.position.z);
    sprinkler.add(ring);
    coverageRings.push(ring);
    for (let drop = 0; drop < 32; drop += 1) {
      const droplet = mesh(geometry(new THREE.SphereGeometry(0.025, 7, 5)), basic({ color: 0x8eeaff, transparent: true, opacity: 0.85 }));
      droplet.userData.phase = drop / 32;
      droplet.userData.headIndex = index;
      sprinkler.add(droplet);
      sprinklerDrops.push(droplet);
    }
  }
  root.add(sprinkler);

  const drip = new THREE.Group();
  const dripRows: THREE.Group[] = [];
  const dripDrops: THREE.Mesh[] = [];
  const wetZones: THREE.Mesh[] = [];
  for (let row = 0; row < 3; row += 1) {
    const rowGroup = new THREE.Group();
    rowGroup.position.z = (row - 1) * 1.35;
    const pipe = mesh(geometry(new THREE.CylinderGeometry(0.045, 0.045, 5.4, 12)), standard({ color: 0x171d20, roughness: 0.55 }));
    pipe.rotation.z = Math.PI / 2;
    pipe.position.y = 0.14;
    rowGroup.add(pipe);
    for (let plantIndex = 0; plantIndex < 5; plantIndex += 1) {
      const x = (plantIndex - 2) * 1.12;
      const plant = makePlant(0.92, true);
      plant.position.set(x, 0.1, 0);
      rowGroup.add(plant);
      const drop = mesh(geometry(new THREE.SphereGeometry(0.04, 8, 6)), basic({ color: 0x4bd3ff, transparent: true, opacity: 0.9 }), 'drip-emitter-water');
      drop.position.set(x - 0.14, 0.11, 0.05);
      rowGroup.add(drop);
      dripDrops.push(drop);
      const wet = mesh(geometry(new THREE.CircleGeometry(0.32, 24)), basic({ color: 0x3d6a61, transparent: true, opacity: 0.56, side: THREE.DoubleSide }));
      wet.rotation.x = -Math.PI / 2;
      wet.position.set(x, 0.015, 0);
      rowGroup.add(wet);
      wetZones.push(wet);
    }
    drip.add(rowGroup);
    dripRows.push(rowGroup);
  }
  const valve = mesh(geometry(new THREE.TorusGeometry(0.22, 0.045, 8, 24)), standard({ color: 0xd2543d, metalness: 0.38 }), 'drip-main-valve');
  valve.position.set(-3.05, 0.42, 1.35);
  valve.rotation.y = Math.PI / 2;
  drip.add(valve);
  root.add(drip);

  const comparison = new THREE.Group();
  const comparisonIds = ['traditional', 'sprinkler', 'drip'] as const;
  const comparisonLabels = ['TRADITIONAL', 'SPRINKLER', 'DRIP'];
  const comparisonGroups: THREE.Group[] = [];
  const efficiencies = [0.48, 0.72, 0.92];
  comparisonIds.forEach((methodId, index) => {
    const group = new THREE.Group();
    group.position.set((index - 1) * 2.35, 0, 0);
    const plot = mesh(geometry(new THREE.BoxGeometry(1.85, 0.22, 2.05)), standard({ color: index === 0 ? 0x795f39 : 0x4f713d, roughness: 0.9 }));
    plot.position.y = 0.12;
    group.add(plot);
    const barBack = mesh(geometry(new THREE.BoxGeometry(0.28, 1.8, 0.22)), basic({ color: 0x17343a, transparent: true, opacity: 0.72 }));
    barBack.position.set(0.62, 1.25, -0.7);
    group.add(barBack);
    const bar = mesh(geometry(new THREE.BoxGeometry(0.22, efficiencies[index] * 1.7, 0.25)), standard({ color: index === 2 ? 0x70e69a : index === 1 ? 0x5dcbe8 : 0xffb960, emissive: 0x12392b, emissiveIntensity: 0.22 }), `efficiency-${methodId}`);
    bar.position.set(0.62, 0.36 + efficiencies[index] * 0.85, -0.68);
    group.add(bar);
    const label = textLabel(comparisonLabels[index], 1.62);
    label.plane.position.y = 2.55;
    group.add(label.plane);
    comparison.add(group);
    comparisonGroups.push(group);
  });
  root.add(comparison);

  const challenge = new THREE.Group();
  const challengeIds = ['uneven-field', 'orchard', 'small-farm'] as const;
  const challengeLabels = ['UNEVEN WHEAT FIELD', 'WATER-SCARCE ORCHARD', 'SMALL FARM + WELL'];
  const challengeGroups: THREE.Group[] = [];
  const challengeCores: THREE.Mesh[] = [];
  challengeIds.forEach((fieldId, index) => {
    const group = new THREE.Group();
    group.position.set((index - 1) * 2.35, 0, 0);
    const hologram = mesh(
      geometry(new THREE.BoxGeometry(1.9, 0.18, 1.85)),
      standard({ color: 0x2a7785, transparent: true, opacity: 0.62, emissive: 0x145b68, emissiveIntensity: 0.26 }),
      `field-${fieldId}`,
    );
    hologram.position.y = 0.3;
    group.add(hologram);
    const core = mesh(
      geometry(new THREE.OctahedronGeometry(0.42, 1)),
      standard({ color: 0xffb853, emissive: 0x8f4812, emissiveIntensity: 0.34, roughness: 0.38 }),
      `method-match-${fieldId}`,
    );
    core.position.y = 1.35;
    group.add(core);
    challengeCores.push(core);
    const label = textLabel(challengeLabels[index], 1.82);
    label.plane.position.y = 2.25;
    group.add(label.plane);
    challenge.add(group);
    challengeGroups.push(group);
  });
  root.add(challenge);

  const stageGroups = [dryField, rootZone, waterSourceMap, traditional, sprinkler, drip, comparison, challenge];

  const instruction = makeCard(4.9, 1.86);
  instruction.plane.position.set(0, 3.15, -3.2);
  root.add(instruction.plane);
  const action = makeCard(2.65, 0.72, 860, 230);
  action.plane.position.set(0, 1.05, -2.78);
  root.add(action.plane);

  const interactables: THREE.Object3D[] = [action.plane, dryPatch, sourceTank, soilCutaway, ...sourceGroups, ...traditionalGroups, pump, mainPipe, ...sprinklerHeads, ...dripRows, valve, ...comparisonGroups, ...challengeGroups];
  let currentSnapshot: IrrigationWorldSnapshot | null = null;

  const setSnapshot = (snapshot: IrrigationWorldSnapshot) => {
    currentSnapshot = snapshot;
    stageGroups.forEach((group, index) => { group.visible = snapshot.stage === index; });
    paintMissionCard(instruction, snapshot);
    paintActionCard(action, snapshot.actionLabel, snapshot.completed);

    dryPatchMaterial.color.set(snapshot.completed && snapshot.stage === 0 ? 0x65533b : 0x8e6c3d);
    dryPlants.forEach(plant => {
      plant.rotation.z = snapshot.completed && snapshot.stage === 0 ? 0 : 0.09;
    });
    const rootProgress = snapshot.rootFeatures.length;
    waterDroplets.forEach((item, index) => { item.visible = index < rootProgress * 8; });
    nutrientOrbs.forEach((item, index) => { item.visible = index < Math.max(0, rootProgress - 1) * 12; });
    sourceGroups.forEach((group, index) => {
      const active = snapshot.waterSources.includes(sourceIds[index]);
      group.scale.setScalar(active ? 1 : 0.74);
      group.visible = active || index === snapshot.waterSources.length;
    });
    traditionalGroups.forEach((group, index) => {
      const active = snapshot.traditionalMethods.includes(traditionalIds[index]);
      group.scale.setScalar(active ? 1 : 0.78);
      group.visible = active || index === snapshot.traditionalMethods.length;
    });
    pump.visible = snapshot.sprinklerStep >= 1;
    mainPipe.visible = snapshot.sprinklerStep >= 2;
    sprinklerHeads.forEach(head => { head.visible = snapshot.sprinklerStep >= 3; });
    sprinklerDrops.forEach(drop => { drop.visible = snapshot.sprinklerStep >= 4; });
    coverageRings.forEach((ring, index) => {
      ring.visible = snapshot.sprinklerStep >= 4;
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = Math.min(0.38, 0.12 + snapshot.sprinklerStep * 0.06 + index * 0.015);
    });
    valve.rotation.z = snapshot.dripStep >= 1 ? Math.PI / 2 : 0;
    dripRows.forEach((row, index) => { row.visible = snapshot.dripStep >= index + 2; });
    dripDrops.forEach((drop, index) => { drop.visible = snapshot.dripStep >= 5 && index % 3 <= snapshot.dripStep - 5; });
    wetZones.forEach(wet => { wet.visible = snapshot.dripStep >= 5; });
    comparisonGroups.forEach((group, index) => {
      const active = snapshot.comparedMethods.includes(comparisonIds[index]);
      group.visible = active || index === snapshot.comparedMethods.length;
      group.scale.setScalar(active ? 1 : 0.78);
    });
    challengeCores.forEach((core, index) => {
      const matched = snapshot.fieldMatches.includes(challengeIds[index]);
      const material = core.material as THREE.MeshStandardMaterial;
      material.color.set(matched ? 0x62e58e : 0xffb853);
      material.emissive.set(matched ? 0x197a42 : 0x8f4812);
    });
  };

  const update = (elapsed: number, activeCamera: THREE.Camera) => {
    rotatingWheels.forEach((wheel, index) => {
      if (currentSnapshot?.traditionalMethods.includes(traditionalIds[index])) wheel.rotation.z = elapsed * (0.6 + index * 0.08);
    });
    sprinklerHeads.forEach((head, index) => { head.rotation.y = elapsed * (0.85 + index * 0.12); });
    sprinklerDrops.forEach(drop => {
      const headIndex = Number(drop.userData.headIndex ?? 0);
      const phase = (Number(drop.userData.phase ?? 0) + elapsed * 0.26) % 1;
      const angle = phase * Math.PI * 2 + headIndex * 0.9;
      const radius = 0.35 + phase * 1.65;
      drop.position.set((headIndex - 1) * 2.25 + Math.cos(angle) * radius, 1.45 + Math.sin(phase * Math.PI) * 0.9, Math.sin(angle) * radius);
    });
    dripDrops.forEach((drop, index) => {
      drop.position.y = 0.1 + ((elapsed * 0.12 + index * 0.08) % 0.18);
    });
    challengeCores.forEach((core, index) => {
      core.rotation.y = elapsed * 0.48 + index;
      core.position.y = 1.35 + Math.sin(elapsed * 1.8 + index) * 0.08;
    });
    instruction.plane.lookAt(activeCamera.position);
    action.plane.lookAt(activeCamera.position);
    action.plane.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.025);
  };

  const dispose = () => {
    scene.remove(root, hemisphere, sunlight);
    geometries.forEach(item => item.dispose());
    materials.forEach(item => item.dispose());
    textures.forEach(item => item.dispose());
    geometries.clear();
    materials.clear();
    textures.clear();
    renderer.setAnimationLoop(null);
  };

  return { root, interactables, setSnapshot, update, dispose };
}
