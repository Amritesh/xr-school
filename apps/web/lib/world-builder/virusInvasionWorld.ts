import * as THREE from 'three';

export interface VirusWorldSnapshot {
  stage: number;
  scannedParts: number;
  replicationStep: number;
  revealedRoutes: readonly string[];
  protectionCount: number;
  sequenceCount: number;
  chainMatches: readonly string[];
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

function paintMissionCard(card: LabelCard, snapshot: VirusWorldSnapshot) {
  const context = card.canvas.getContext('2d');
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, card.canvas.width, card.canvas.height);
  gradient.addColorStop(0, 'rgba(5, 17, 34, .98)');
  gradient.addColorStop(1, 'rgba(15, 54, 72, .98)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, card.canvas.width, card.canvas.height);
  context.strokeStyle = snapshot.completed ? '#64f2bd' : '#66d9ff';
  context.lineWidth = 8;
  context.strokeRect(7, 7, card.canvas.width - 14, card.canvas.height - 14);
  context.fillStyle = snapshot.completed ? '#64f2bd' : '#66d9ff';
  context.font = '800 30px sans-serif';
  context.fillText(`VIRUS SHIELD  •  ${snapshot.stage + 1}/7`, 42, 54);
  context.fillStyle = '#ffffff';
  context.font = '800 44px sans-serif';
  wrapText(context, snapshot.title, 42, 112, 930, 48, 2);
  context.fillStyle = '#d8f4ff';
  context.font = '28px sans-serif';
  wrapText(context, snapshot.cue, 42, 218, 930, 34, 3);
  if (snapshot.feedback) {
    context.fillStyle = '#fff1a8';
    context.font = '700 24px sans-serif';
    wrapText(context, snapshot.feedback, 42, 330, 930, 30, 1);
  }
  card.texture.needsUpdate = true;
}

function paintActionCard(card: LabelCard, label: string, complete: boolean) {
  const context = card.canvas.getContext('2d');
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, card.canvas.width, 0);
  gradient.addColorStop(0, complete ? '#25a96b' : '#1b79b5');
  gradient.addColorStop(1, complete ? '#74f0ad' : '#57d9f6');
  context.fillStyle = gradient;
  context.fillRect(0, 0, card.canvas.width, card.canvas.height);
  context.strokeStyle = '#e8fbff';
  context.lineWidth = 8;
  context.strokeRect(5, 5, card.canvas.width - 10, card.canvas.height - 10);
  context.fillStyle = '#061724';
  context.font = '800 40px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  wrapText(context, label, card.canvas.width / 2, card.canvas.height / 2 - 8, card.canvas.width - 48, 44, 2);
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
  card.texture.needsUpdate = true;
}

export function createVirusInvasionWorld(
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
  ): LabelCard => {
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
  const textLabel = (text: string, width = 1.5, color = '#dff9ff') => {
    const card = makeCard(width, 0.32, 640, 150);
    const context = card.canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(5, 21, 34, .92)';
      context.fillRect(0, 0, card.canvas.width, card.canvas.height);
      context.strokeStyle = '#4fcff0';
      context.lineWidth = 5;
      context.strokeRect(4, 4, card.canvas.width - 8, card.canvas.height - 8);
      context.fillStyle = color;
      context.font = '800 48px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, card.canvas.width / 2, card.canvas.height / 2);
      card.texture.needsUpdate = true;
    }
    return card;
  };

  const root = new THREE.Group();
  root.name = 'Invisible Invader laboratory';
  scene.add(root);

  const environmentTexture = new THREE.TextureLoader().load(
    '/simulations/c8-ch02-a02-virus-introduction-spreading-and-its-effects/environment.webp',
  );
  environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
  environmentTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(environmentTexture);
  scene.background = environmentTexture;
  scene.environment = environmentTexture;
  scene.fog = new THREE.FogExp2(0x071a2b, 0.012);

  const hemisphere = new THREE.HemisphereLight(0xc8f5ff, 0x07121c, 1.7);
  const keyLight = new THREE.DirectionalLight(0xd8f9ff, 3.2);
  keyLight.position.set(-4, 7, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  const warningLight = new THREE.PointLight(0xff3344, 14, 12, 2);
  warningLight.position.set(-3.8, 2.8, -1.2);
  scene.add(hemisphere, keyLight, warningLight);

  const floor = mesh(
    geometry(new THREE.CircleGeometry(8.8, 96)),
    standard({ color: 0x0c2333, roughness: 0.34, metalness: 0.62 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  root.add(floor);
  for (const radius of [2.6, 5.2, 8]) {
    const ring = mesh(
      geometry(new THREE.TorusGeometry(radius, 0.018, 8, 128)),
      basic({ color: 0x2dbbd4, transparent: true, opacity: 0.46 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.015;
    root.add(ring);
  }

  const createVirus = (radius: number, color: number) => {
    const group = new THREE.Group();
    const envelopeMaterial = standard({
      color,
      roughness: 0.42,
      metalness: 0.06,
      transparent: true,
      opacity: 0.92,
      emissive: color,
      emissiveIntensity: 0.13,
    });
    const envelope = mesh(geometry(new THREE.IcosahedronGeometry(radius, 4)), envelopeMaterial, 'virus-envelope');
    group.add(envelope);
    const core = mesh(
      geometry(new THREE.TorusKnotGeometry(radius * 0.43, radius * 0.07, 90, 10, 2, 3)),
      standard({ color: 0xffd64a, emissive: 0xa85a00, emissiveIntensity: 0.65, roughness: 0.36 }),
      'viral-genetic-material',
    );
    group.add(core);
    const spikes: THREE.Group[] = [];
    const count = Math.max(18, Math.round(radius * 38));
    for (let index = 0; index < count; index += 1) {
      const phi = Math.acos(1 - (2 * (index + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      );
      const spike = new THREE.Group();
      const stem = mesh(
        geometry(new THREE.CylinderGeometry(radius * 0.032, radius * 0.052, radius * 0.32, 7)),
        standard({ color: 0xffb76a, roughness: 0.55 }),
      );
      stem.position.y = radius * 0.16;
      const tip = mesh(
        geometry(new THREE.SphereGeometry(radius * 0.09, 10, 8)),
        standard({ color: 0xff765f, emissive: 0x7a1a12, emissiveIntensity: 0.32, roughness: 0.48 }),
        'attachment-spike',
      );
      tip.scale.set(1.2, 0.72, 1.2);
      tip.position.y = radius * 0.34;
      spike.add(stem, tip);
      spike.position.copy(direction.clone().multiplyScalar(radius));
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      group.add(spike);
      spikes.push(spike);
    }
    return { group, envelope, core, spikes };
  };

  const warningStation = new THREE.Group();
  const chamberBase = mesh(
    geometry(new THREE.CylinderGeometry(1.15, 1.28, 0.35, 48)),
    standard({ color: 0x263746, metalness: 0.78, roughness: 0.24 }),
  );
  chamberBase.position.y = 0.18;
  warningStation.add(chamberBase);
  const chamber = mesh(
    geometry(new THREE.CylinderGeometry(0.92, 0.92, 2.15, 48, 1, true)),
    standard({ color: 0xb3efff, transparent: true, opacity: 0.18, roughness: 0.06, metalness: 0.05, side: THREE.DoubleSide }),
    'sealed-virus-chamber',
  );
  chamber.position.y = 1.4;
  warningStation.add(chamber);
  const sampleVirus = createVirus(0.38, 0x9b2747);
  sampleVirus.group.position.y = 1.45;
  warningStation.add(sampleVirus.group);
  const scannerRings: THREE.Mesh[] = [];
  for (let index = 0; index < 3; index += 1) {
    const scanner = mesh(
      geometry(new THREE.TorusGeometry(0.98 + index * 0.12, 0.018, 8, 80)),
      basic({ color: index === 1 ? 0xff3344 : 0x55ddff, transparent: true, opacity: 0.88 }),
    );
    scanner.rotation.x = Math.PI / 2;
    scanner.position.y = 0.72 + index * 0.72;
    warningStation.add(scanner);
    scannerRings.push(scanner);
  }
  root.add(warningStation);

  const anatomy = new THREE.Group();
  const anatomyVirus = createVirus(1.08, 0x326cad);
  anatomyVirus.group.position.y = 1.45;
  anatomy.add(anatomyVirus.group);
  const anatomyLabels = [
    ['GENETIC MATERIAL', new THREE.Vector3(-1.9, 1.7, 0)],
    ['PROTEIN COAT', new THREE.Vector3(1.9, 1.72, 0)],
    ['OUTER ENVELOPE', new THREE.Vector3(0, 3.15, 0)],
    ['ATTACHMENT SPIKES', new THREE.Vector3(0, 0.15, 0)],
  ] as const;
  const anatomyCards = anatomyLabels.map(([label, position]) => {
    const card = textLabel(label, 1.7);
    card.plane.position.copy(position);
    anatomy.add(card.plane);
    return card;
  });
  const hostNeeded = textLabel('NEEDS A LIVING HOST CELL', 2.5, '#fff0a8');
  hostNeeded.plane.position.set(0, 0.48, -1.55);
  anatomy.add(hostNeeded.plane);
  root.add(anatomy);

  const replication = new THREE.Group();
  const cellMaterial = standard({
    color: 0x56c1d8,
    transparent: true,
    opacity: 0.2,
    roughness: 0.1,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const cell = mesh(geometry(new THREE.SphereGeometry(2.1, 64, 40)), cellMaterial, 'living-host-cell');
  cell.scale.set(1.25, 0.88, 1);
  cell.position.y = 1.55;
  replication.add(cell);
  const nucleus = mesh(
    geometry(new THREE.SphereGeometry(0.72, 38, 24)),
    standard({ color: 0x6f5cc2, transparent: true, opacity: 0.72, roughness: 0.34 }),
    'host-cell-nucleus',
  );
  nucleus.position.set(0.25, 1.55, 0.12);
  replication.add(nucleus);
  const incomingVirus = createVirus(0.32, 0xc8425f);
  incomingVirus.group.position.set(-2.45, 1.82, 0.08);
  replication.add(incomingVirus.group);
  const viralStrand = mesh(
    geometry(new THREE.TorusKnotGeometry(0.46, 0.055, 100, 8, 2, 3)),
    standard({ color: 0xffdc5e, emissive: 0x9a5b00, emissiveIntensity: 0.7 }),
    'released-viral-genetic-material',
  );
  viralStrand.position.set(-0.72, 1.54, 0.08);
  replication.add(viralStrand);
  const newViruses: THREE.Group[] = [];
  for (let index = 0; index < 16; index += 1) {
    const child = createVirus(0.16, index % 2 ? 0xb83963 : 0xd85a53);
    const angle = (index / 16) * Math.PI * 2;
    child.group.position.set(
      Math.cos(angle) * (0.65 + (index % 3) * 0.22),
      1.5 + Math.sin(index * 1.7) * 0.58,
      Math.sin(angle) * 0.58,
    );
    replication.add(child.group);
    newViruses.push(child.group);
  }
  const replicationLabels = ['ATTACHMENT', 'ENTRY', 'COPYING', 'ASSEMBLY', 'RELEASE'].map((label, index) => {
    const card = textLabel(label, 1.12, '#f8ffff');
    card.plane.position.set((index - 2) * 1.18, 0.36, -1.25);
    replication.add(card.plane);
    return card;
  });
  root.add(replication);

  const transmission = new THREE.Group();
  const routeNames = ['respiratory', 'surface', 'water', 'mosquito', 'blood'] as const;
  const routeLabels = ['RESPIRATORY', 'HANDS + SURFACES', 'FOOD + WATER', 'MOSQUITO VECTOR', 'BLOOD + FLUIDS'];
  const routeGroups: THREE.Group[] = [];
  routeNames.forEach((route, index) => {
    const angle = -Math.PI * 0.7 + index * (Math.PI * 0.35);
    const group = new THREE.Group();
    group.position.set(Math.sin(angle) * 3.1, 0, -Math.cos(angle) * 2.2);
    const pedestal = mesh(
      geometry(new THREE.CylinderGeometry(0.55, 0.7, 0.5, 24)),
      standard({ color: 0x163c51, metalness: 0.55, roughness: 0.38, emissive: 0x0b3c52, emissiveIntensity: 0.15 }),
    );
    pedestal.position.y = 0.25;
    group.add(pedestal);
    const iconMaterial = standard({ color: 0xff6077, emissive: 0x8e1833, emissiveIntensity: 0.45, roughness: 0.5 });
    if (route === 'respiratory') {
      for (let particle = 0; particle < 14; particle += 1) {
        const droplet = mesh(geometry(new THREE.SphereGeometry(0.035 + (particle % 3) * 0.012, 8, 6)), iconMaterial);
        droplet.position.set(((particle % 5) - 2) * 0.12, 0.85 + Math.floor(particle / 5) * 0.15, (particle % 2) * 0.14);
        group.add(droplet);
      }
    } else if (route === 'surface') {
      const desk = mesh(geometry(new THREE.BoxGeometry(0.92, 0.1, 0.55)), iconMaterial);
      desk.position.y = 0.78;
      group.add(desk);
      const hand = mesh(geometry(new THREE.SphereGeometry(0.21, 14, 10)), standard({ color: 0xdfa27f, roughness: 0.72 }));
      hand.scale.set(1.7, 0.55, 0.9);
      hand.position.set(0.1, 1.08, 0);
      group.add(hand);
    } else if (route === 'water') {
      const cup = mesh(geometry(new THREE.CylinderGeometry(0.28, 0.22, 0.58, 20, 1, true)), iconMaterial);
      cup.position.y = 0.88;
      group.add(cup);
      const water = mesh(geometry(new THREE.CylinderGeometry(0.245, 0.245, 0.05, 20)), basic({ color: 0x5cd9ff, transparent: true, opacity: 0.82 }));
      water.position.y = 1.13;
      group.add(water);
    } else if (route === 'mosquito') {
      const body = mesh(geometry(new THREE.CylinderGeometry(0.055, 0.085, 0.7, 9)), iconMaterial);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.98;
      group.add(body);
      for (const side of [-1, 1]) {
        const wing = mesh(geometry(new THREE.SphereGeometry(0.2, 16, 8)), basic({ color: 0xc8f4ff, transparent: true, opacity: 0.48 }));
        wing.scale.set(1.5, 0.18, 0.65);
        wing.position.set(-0.05, 1.16, side * 0.2);
        group.add(wing);
      }
      for (let leg = 0; leg < 6; leg += 1) {
        const limb = mesh(geometry(new THREE.CylinderGeometry(0.009, 0.009, 0.54, 5)), standard({ color: 0x2b1522, roughness: 0.8 }));
        limb.rotation.z = Math.PI / 2.8;
        limb.rotation.y = (leg / 6) * Math.PI * 2;
        limb.position.y = 0.9;
        group.add(limb);
      }
    } else {
      const barrel = mesh(geometry(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 14)), iconMaterial);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.y = 0.92;
      group.add(barrel);
      const plunger = mesh(geometry(new THREE.BoxGeometry(0.28, 0.12, 0.12)), iconMaterial);
      plunger.position.set(-0.55, 0.92, 0);
      group.add(plunger);
    }
    const label = textLabel(routeLabels[index], 1.48);
    label.plane.position.y = 1.62;
    group.add(label.plane);
    transmission.add(group);
    routeGroups.push(group);
  });
  root.add(transmission);

  const effects = new THREE.Group();
  const body = new THREE.Group();
  const bodyMaterial = standard({ color: 0x57cfe0, transparent: true, opacity: 0.5, roughness: 0.28 });
  const torso = mesh(geometry(new THREE.CapsuleGeometry(0.55, 1.45, 12, 24)), bodyMaterial, 'transparent-anatomical-body');
  torso.position.y = 1.55;
  body.add(torso);
  const head = mesh(geometry(new THREE.SphereGeometry(0.42, 24, 18)), bodyMaterial);
  head.position.y = 2.9;
  body.add(head);
  for (const side of [-1, 1]) {
    const arm = mesh(geometry(new THREE.CapsuleGeometry(0.12, 1.28, 8, 14)), bodyMaterial);
    arm.position.set(side * 0.72, 1.65, 0);
    arm.rotation.z = side * -0.15;
    body.add(arm);
    const leg = mesh(geometry(new THREE.CapsuleGeometry(0.16, 1.55, 8, 16)), bodyMaterial);
    leg.position.set(side * 0.26, 0.15, 0);
    body.add(leg);
  }
  effects.add(body);
  const organColors = [0xff6b7c, 0xffc857, 0x8b72dc, 0x65d88c, 0xff9f68, 0x62c8ef];
  const organMarkers = organColors.map((color, index) => {
    const marker = mesh(
      geometry(new THREE.SphereGeometry(0.12 + (index % 2) * 0.035, 14, 10)),
      standard({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.45 }),
      `symptom-marker-${index}`,
    );
    marker.position.set((index % 2 ? 1 : -1) * (0.24 + (index % 3) * 0.05), 2.6 - index * 0.38, 0.46);
    body.add(marker);
    return marker;
  });
  const shieldRings: THREE.Mesh[] = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const shield = mesh(
      geometry(new THREE.TorusGeometry(0.48, 0.055, 10, 40, Math.PI * 1.45)),
      basic({ color: 0x51f0a2, transparent: true, opacity: 0.82 }),
      `prevention-shield-${index}`,
    );
    shield.position.set(Math.cos(angle) * 1.7, 1.55 + Math.sin(angle) * 1.35, -0.1);
    shield.rotation.z = angle + 0.4;
    effects.add(shield);
    shieldRings.push(shield);
  }
  root.add(effects);

  const summary = new THREE.Group();
  const summaryLabels = ['ATTACHMENT', 'ENTRY', 'COPYING', 'ASSEMBLY', 'RELEASE'];
  const summaryNodes: THREE.Mesh[] = [];
  summaryLabels.forEach((label, index) => {
    const angle = -Math.PI / 2 + (index / 5) * Math.PI * 2;
    const node = mesh(
      geometry(new THREE.IcosahedronGeometry(0.36, 2)),
      standard({ color: 0x326f9e, emissive: 0x164b70, emissiveIntensity: 0.16, roughness: 0.42 }),
      `replication-sequence-${index}`,
    );
    node.position.set(Math.cos(angle) * 2.15, 1.55 + Math.sin(angle) * 1.15, 0);
    summary.add(node);
    summaryNodes.push(node);
    const card = textLabel(label, 1.08);
    card.plane.position.set(node.position.x, node.position.y - 0.58, 0);
    summary.add(card.plane);
  });
  const cycleRing = mesh(
    geometry(new THREE.TorusGeometry(2.15, 0.025, 8, 120)),
    basic({ color: 0x5bdff4, transparent: true, opacity: 0.48 }),
  );
  cycleRing.position.y = 1.55;
  summary.add(cycleRing);
  root.add(summary);

  const challenge = new THREE.Group();
  const challengeCore = mesh(
    geometry(new THREE.IcosahedronGeometry(0.82, 3)),
    standard({ color: 0x183b5a, transparent: true, opacity: 0.82, emissive: 0x0d6984, emissiveIntensity: 0.25, roughness: 0.3 }),
    'virus-shield-core',
  );
  challengeCore.position.y = 1.5;
  challenge.add(challengeCore);
  const challengeNodes: THREE.Mesh[] = [];
  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + (index / 5) * Math.PI * 2;
    const node = mesh(
      geometry(new THREE.DodecahedronGeometry(0.4, 1)),
      standard({ color: 0xa52d4f, emissive: 0x5f112b, emissiveIntensity: 0.35, roughness: 0.48 }),
      `viral-chain-risk-${routeNames[index]}`,
    );
    node.position.set(Math.cos(angle) * 2.25, 1.5 + Math.sin(angle) * 1.45, 0);
    challenge.add(node);
    challengeNodes.push(node);
    const linkShape = geometry(new THREE.CylinderGeometry(0.022, 0.022, node.position.distanceTo(challengeCore.position), 6));
    const link = mesh(linkShape, basic({ color: 0xff596f, transparent: true, opacity: 0.7 }));
    const midpoint = node.position.clone().add(challengeCore.position).multiplyScalar(0.5);
    link.position.copy(midpoint);
    link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), node.position.clone().sub(challengeCore.position).normalize());
    challenge.add(link);
  }
  const successShield = mesh(
    geometry(new THREE.SphereGeometry(1.28, 38, 24)),
    standard({ color: 0x4cffad, transparent: true, opacity: 0.2, emissive: 0x28b979, emissiveIntensity: 0.6, side: THREE.DoubleSide }),
    'completed-virus-shield',
  );
  successShield.position.copy(challengeCore.position);
  challenge.add(successShield);
  root.add(challenge);

  const instruction = makeCard(3.9, 1.48);
  instruction.plane.position.set(0, 3.15, -2.25);
  root.add(instruction.plane);
  const action = makeCard(1.78, 0.5, 780, 220);
  action.plane.position.set(0, 0.75, -1.6);
  action.plane.name = 'virus-primary-action';
  action.plane.userData.interactive = true;
  root.add(action.plane);

  const interactables: THREE.Object3D[] = [action.plane];
  let currentSnapshot: VirusWorldSnapshot | undefined;
  let lastStage = -1;
  let lastFeedback = '';
  let lastActionLabel = '';

  const setSnapshot = (snapshot: VirusWorldSnapshot) => {
    currentSnapshot = snapshot;
    if (snapshot.stage !== lastStage || snapshot.feedback !== lastFeedback) {
      paintMissionCard(instruction, snapshot);
      lastStage = snapshot.stage;
      lastFeedback = snapshot.feedback;
    }
    if (snapshot.actionLabel !== lastActionLabel || snapshot.completed) {
      paintActionCard(action, snapshot.actionLabel, snapshot.completed);
      lastActionLabel = snapshot.actionLabel;
    }

    warningStation.visible = snapshot.stage === 0;
    anatomy.visible = snapshot.stage === 1;
    replication.visible = snapshot.stage === 2;
    transmission.visible = snapshot.stage === 3;
    effects.visible = snapshot.stage === 4;
    summary.visible = snapshot.stage === 5;
    challenge.visible = snapshot.stage === 6;

    anatomyCards.forEach((card, index) => {
      card.plane.visible = index < snapshot.scannedParts;
    });
    hostNeeded.plane.visible = snapshot.scannedParts >= 4;
    anatomyVirus.core.visible = snapshot.scannedParts >= 1;
    anatomyVirus.envelope.visible = snapshot.scannedParts >= 3;
    anatomyVirus.spikes.forEach(spike => {
      spike.visible = snapshot.scannedParts >= 4;
    });

    incomingVirus.group.position.x = snapshot.replicationStep >= 1 ? -2.02 : -2.55;
    viralStrand.visible = snapshot.replicationStep >= 2;
    newViruses.forEach((virus, index) => {
      virus.visible = snapshot.replicationStep >= 3 && index < Math.max(2, (snapshot.replicationStep - 2) * 8);
      if (snapshot.replicationStep >= 5) virus.position.x += Math.sign(virus.position.x || 1) * 0.02;
    });
    replicationLabels.forEach((card, index) => {
      const complete = index < snapshot.replicationStep;
      card.plane.visible = complete;
      card.plane.scale.setScalar(complete ? 1 : 0.8);
    });

    routeGroups.forEach((group, index) => {
      const active = snapshot.revealedRoutes.includes(routeNames[index]);
      group.visible = active;
      group.scale.setScalar(active ? 1 : 0.01);
    });
    organMarkers.forEach((marker, index) => {
      marker.visible = snapshot.protectionCount === 0 || index >= snapshot.protectionCount;
    });
    shieldRings.forEach((shield, index) => {
      shield.visible = index < snapshot.protectionCount;
    });
    summaryNodes.forEach((node, index) => {
      const material = node.material as THREE.MeshStandardMaterial;
      const placed = index < snapshot.sequenceCount;
      material.color.set(placed ? 0x55e7a1 : 0x326f9e);
      material.emissiveIntensity = placed ? 0.62 : 0.16;
      node.scale.setScalar(placed ? 1.22 : 1);
    });
    challengeNodes.forEach((node, index) => {
      const matched = snapshot.chainMatches.includes(routeNames[index]);
      const material = node.material as THREE.MeshStandardMaterial;
      material.color.set(matched ? 0x45d98b : 0xa52d4f);
      material.emissive.set(matched ? 0x14834f : 0x5f112b);
      material.emissiveIntensity = matched ? 0.7 : 0.35;
    });
    successShield.visible = snapshot.completed;
  };

  const update = (elapsed: number, activeCamera: THREE.Camera) => {
    sampleVirus.group.rotation.y = elapsed * 0.45;
    sampleVirus.group.rotation.x = Math.sin(elapsed * 0.7) * 0.08;
    scannerRings.forEach((ring, index) => {
      ring.rotation.z = elapsed * (index % 2 ? -0.65 : 0.55);
      ring.scale.setScalar(1 + Math.sin(elapsed * 2 + index) * 0.025);
    });
    anatomyVirus.group.rotation.y = elapsed * 0.25;
    incomingVirus.group.rotation.y = elapsed * 0.7;
    newViruses.forEach((virus, index) => {
      virus.rotation.y = elapsed * (0.6 + (index % 4) * 0.08);
      virus.position.y += Math.sin(elapsed * 1.4 + index) * 0.0008;
    });
    routeGroups.forEach((group, index) => {
      group.rotation.y = Math.sin(elapsed * 0.55 + index) * 0.05;
    });
    shieldRings.forEach((shield, index) => {
      shield.rotation.y = Math.sin(elapsed + index) * 0.08;
    });
    summary.rotation.y = Math.sin(elapsed * 0.35) * 0.08;
    challengeNodes.forEach((node, index) => {
      node.rotation.x = elapsed * 0.28 + index;
      node.rotation.y = elapsed * 0.36;
    });
    challengeCore.rotation.y = elapsed * 0.42;
    successShield.scale.setScalar(1 + Math.sin(elapsed * 2.1) * 0.035);
    warningLight.intensity = currentSnapshot?.stage === 0 ? 11 + Math.sin(elapsed * 3.4) * 3 : 2;
    instruction.plane.lookAt(activeCamera.position);
    action.plane.lookAt(activeCamera.position);
    action.plane.scale.setScalar(1 + Math.sin(elapsed * 2.6) * 0.025);
  };

  const dispose = () => {
    scene.remove(root, hemisphere, keyLight, warningLight);
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
