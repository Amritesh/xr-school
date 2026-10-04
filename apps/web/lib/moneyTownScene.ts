import * as THREE from 'three';
import { drawFittedText } from './vr/screenSafeTextPanel';
import {
  getMoneyDefinition,
  MONEY_TOWN_STAGES,
  type MoneyId,
} from './moneyTownLesson';
import { moneyActivity, type MoneyTownState } from './moneyTownActivity';
import { MONEY_PHOTOS } from './moneyTownPhotos';

function material(color: number, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.08,
    transparent: opacity < 1,
    opacity,
  });
}
function makeTextTexture(
  title: string,
  subtitle = '',
  accent = '#fbbf24',
  width = 640,
  height = 240,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#102c36';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, width - 8, height - 8);
  drawFittedText(ctx, title, {
    x: 22,
    y: 14,
    width: width - 44,
    height: height * (subtitle ? 0.57 : 0.84),
    fontWeight: 800,
    maxFontSize: 56,
    minFontSize: 20,
    maxLines: 2,
    color: '#fff9e6',
    verticalAlign: 'middle',
  });
  if (subtitle)
    drawFittedText(ctx, subtitle, {
      x: 22,
      y: height * 0.64,
      width: width - 44,
      height: height * 0.29,
      maxFontSize: 30,
      minFontSize: 16,
      maxLines: 2,
      color: accent,
    });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function makeLabel(
  text: string,
  subtitle = '',
  accent = '#fbbf24',
  width = 1.5,
  height = 0.58,
) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture(
        text,
        subtitle,
        accent,
        Math.round((256 * width) / height),
        256,
      ),
      side: THREE.DoubleSide,
    }),
  );
}

/** Readable temporary fallback while the local RBI photograph loads. */
function moneyFace(id: MoneyId) {
  const money = getMoneyDefinition(id);
  const coin = money.kind === 'coin';
  const canvas = document.createElement('canvas');
  canvas.width = coin ? 512 : 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const colors: Record<number, string> = {
    10: '#ba8857',
    20: '#d6c86e',
    50: '#8dc6c8',
    100: '#bc9bd4',
    200: '#edb462',
    500: '#bdc4ae',
  };
  ctx.fillStyle = coin
    ? money.value === 5
      ? '#dab556'
      : '#d4dbe0'
    : colors[money.value];
  if (coin) {
    ctx.beginPath();
    ctx.arc(256, 256, 249, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = money.value === 10 ? '#c3942c' : '#879194';
    ctx.lineWidth = money.value === 10 ? 48 : 12;
    ctx.beginPath();
    ctx.arc(256, 256, 227, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 0; i < 72; i++) {
      const a = (i * Math.PI) / 36;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(a) * 235, 256 + Math.sin(a) * 235);
      ctx.lineTo(256 + Math.cos(a) * 247, 256 + Math.sin(a) * 247);
      ctx.stroke();
    }
  } else {
    ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = '#30424d';
    ctx.lineWidth = 10;
    ctx.strokeRect(15, 15, 994, 482);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.16;
    for (let i = 30; i < 1000; i += 16) {
      ctx.beginPath();
      ctx.ellipse(i, 256, 130, 214, 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#253b43';
    ctx.fillText('INDIAN RUPEES', 44, 70);
    ctx.textAlign = 'right';
    ctx.fillText(String(money.value), 975, 70);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#23343c';
  ctx.font = 'bold 164px sans-serif';
  ctx.fillText('₹ ' + money.value, canvas.width / 2, 305);
  ctx.font = 'bold 31px sans-serif';
  ctx.fillText(
    coin ? 'RUPEES' : 'LEARNING NOTE • NOT LEGAL TENDER',
    canvas.width / 2,
    coin ? 362 : 385,
  );
  if (coin) {
    ctx.font = '21px sans-serif';
    ctx.fillText('LEARNING MODEL', 256, 400);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function createMoneyModel(id: MoneyId) {
  const money = getMoneyDefinition(id);
  const coin = money.kind === 'coin';
  const photos = MONEY_PHOTOS[id];
  const noteWidth = 1.45;
  const noteHeight = (noteWidth * photos.height) / photos.width;
  const group = new THREE.Group();
  group.name = 'money-model-' + id;
  group.userData.moneyId = id;
  const body = new THREE.Mesh(
    coin
      ? new THREE.CylinderGeometry(0.43, 0.43, 0.09, 64)
      : new THREE.BoxGeometry(noteWidth, noteHeight, 0.02),
    new THREE.MeshStandardMaterial({
      color: coin ? 0xd5be79 : 0xddd4b6,
      metalness: coin ? 0.72 : 0,
      roughness: coin ? 0.35 : 0.8,
    }),
  );
  if (coin) body.rotation.x = Math.PI / 2;
  group.add(body);
  for (const sign of [1, -1]) {
    const faceMaterial = new THREE.MeshBasicMaterial({
      map: moneyFace(id),
      transparent: true,
      toneMapped: false,
    });
    const face = new THREE.Mesh(
      coin
        ? new THREE.CircleGeometry(0.425, 64)
        : new THREE.PlaneGeometry(noteWidth, noteHeight),
      faceMaterial,
    );
    face.name = `currency-photo-${id}-${sign === 1 ? 'front' : 'back'}`;
    face.position.z = sign * (coin ? 0.048 : 0.012);
    if (sign < 0) face.rotation.y = Math.PI;
    group.add(face);
    const source = sign === 1 ? photos.front : photos.back;
    const texture = new THREE.TextureLoader().load(
      source,
      (loaded) => {
        // A learner can advance before the image finishes downloading.
        // Never attach a late texture to a scene which has already been disposed.
        if (face.userData.moneyPhotoDisposed) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = 4;
        const fallback = faceMaterial.map;
        faceMaterial.map = loaded;
        faceMaterial.needsUpdate = true;
        fallback?.dispose();
        face.userData.moneyPhotoLoaded = true;
      },
      undefined,
      () => texture.dispose(),
    );
    face.userData.moneyPhoto = source;
    face.userData.pendingMoneyTexture = texture;
  }
  return group;
}
export function disposeMoneyScene(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    object.userData.moneyPhotoDisposed = true;
    const pending = object.userData.pendingMoneyTexture as
      | THREE.Texture
      | undefined;
    if (pending) textures.add(pending);
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    for (const mat of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material])
      if (mat) {
        materials.add(mat);
        const map = (mat as THREE.MeshStandardMaterial).map;
        if (map) textures.add(map);
      }
  });
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
  geometries.forEach((g) => g.dispose());
}
function addParticleRing(
  group: THREE.Group,
  name: string,
  color: number,
  count = 140,
) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const radius = 1.15 + (index % 8) * 0.16;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0.85 + (index % 13) * 0.12;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    ),
    new THREE.PointsMaterial({
      color,
      size: 0.045,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  particles.name = name;
  group.add(particles);
}

export function addMoneyTownEnvironment(scene: THREE.Scene) {
  const town = new THREE.Group();
  town.name = 'class-1-magic-money-town-no-students';
  scene.add(town);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 96),
    material(0x0f766e, 0.94),
  );
  floor.name = 'rainbow-pathways-market-floor';
  floor.rotation.x = -Math.PI / 2;
  town.add(floor);

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(4.3, 4.3, 2.8, 96, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0f766e,
      emissiveIntensity: 0.16,
      transparent: true,
      opacity: 0.24,
      roughness: 0.55,
      side: THREE.BackSide,
    }),
  );
  wall.name = 'colorful-money-adventure-park-classroom-transform';
  wall.position.y = 1.35;
  town.add(wall);

  const piggy = new THREE.Group();
  piggy.name = 'giant-smiling-piggy-bank';
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 36, 24),
    material(0xf9a8d4),
  );
  body.scale.set(1.25, 0.85, 0.82);
  piggy.add(body);
  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.07, 18),
    material(0xfb7185),
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.02, 0.39);
  piggy.add(nose);
  piggy.position.set(1.75, 0.55, -1.35);
  town.add(piggy);

  const fountain = new THREE.Group();
  fountain.name = 'coin-fountain-floating-golden-coins';
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.72, 0.24, 48),
    material(0x0891b2),
  );
  bowl.position.y = 0.18;
  fountain.add(bowl);
  for (let index = 0; index < 12; index += 1) {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24),
      material(0xfbbf24),
    );
    coin.rotation.x = Math.PI / 2;
    const angle = (index / 12) * Math.PI * 2;
    coin.position.set(
      Math.cos(angle) * 0.55,
      0.65 + (index % 3) * 0.14,
      Math.sin(angle) * 0.55,
    );
    fountain.add(coin);
  }
  fountain.position.set(-1.65, 0, -1.15);
  town.add(fountain);

  const teacher = new THREE.Group();
  teacher.name = 'friendly-animated-teacher-guide-smiles-waves-no-students';
  const teacherBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.74, 8, 18),
    material(0x14b8a6),
  );
  teacherBody.position.y = 0.72;
  teacher.add(teacherBody);
  const teacherHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 22, 16),
    material(0xf8c9a5),
  );
  teacherHead.position.y = 1.25;
  teacher.add(teacherHead);
  const teacherHand = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.035, 0.58, 6, 12),
    material(0xfacc15),
  );
  teacherHand.name = 'teacher-slow-encouraging-gesture';
  teacherHand.rotation.z = -1;
  teacherHand.position.set(0.32, 0.98, 0);
  teacher.add(teacherHand);
  teacher.position.set(-2.05, 0.04, -1.95);
  town.add(teacher);

  [
    'Toy Market',
    'Fruit Stall',
    'Candy Shop',
    'Balloon Shop',
    'Mini Bank',
  ].forEach((shop, index) => {
    const shopGroup = new THREE.Group();
    shopGroup.name = `${shop.toLowerCase().replace(/\s+/g, '-')}-child-friendly-shop`;
    const stall = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.72, 0.45),
      material([0x38bdf8, 0x22c55e, 0xf97316, 0xa855f7, 0x0ea5e9][index]),
    );
    stall.position.y = 0.36;
    shopGroup.add(stall);
    const sign = makeLabel(shop, 'Price board', '#fde68a');
    sign.position.set(0, 0.94, 0.02);
    sign.scale.setScalar(0.5);
    shopGroup.add(sign);
    shopGroup.position.set(-2 + index, 0, -2.55 + (index % 2) * 0.2);
    town.add(shopGroup);
  });

  addParticleRing(
    town,
    'animated-birds-happy-background-music-and-magical-sparkles',
    0xfde047,
    180,
  );
  return { town, teacher, piggy };
}

export function buildMoneyActivityScene(state: MoneyTownState) {
  const activity = moneyActivity(state);
  const stage = MONEY_TOWN_STAGES[state.stage];
  const group = new THREE.Group();
  group.name = 'money-town-stage-' + stage.id;
  const targets: Array<{ id: string; object: THREE.Object3D }> = [];
  const board = makeLabel(
    activity.specimen &&
      (stage.id === 'learn-coins' || stage.id === 'learn-notes')
      ? getMoneyDefinition(activity.specimen).label
      : activity.prompt,
    'RBI reference pictures • enlarged for learning',
    '#fde68a',
    3.5,
    0.72,
  );
  board.name = 'large-digital-smartboard-money-values-quizzes-rewards';
  board.position.set(0, stage.id === 'memory-check' ? 2.9 : 2.65, -0.65);
  group.add(board);
  if (activity.specimen) {
    const model = createMoneyModel(activity.specimen);
    model.position.set(0, stage.id === 'memory-check' ? 2 : 1.7, -0.25);
    group.add(model);
  }
  const count = activity.options.length;
  activity.options.forEach((option, index) => {
    const x =
      count === 1
        ? 0
        : count === 3
          ? (index - 1) * 1.4
          : index % 2 === 0
            ? -0.9
            : 0.9;
    const y =
      count <= 2
        ? 0.72
        : activity.specimen
          ? 1.1 - Math.floor(index / 2) * 0.6
          : 1.65 - Math.floor(index / 2) * 1.05;
    const root = new THREE.Group();
    root.name = 'money-choice-' + option.id;
    root.position.set(x, y, 0.12);
    if (option.moneyId) {
      root.add(createMoneyModel(option.moneyId));
    } else {
      const label = makeLabel(
        option.label,
        '',
        '#67e8f9',
        count === 1 ? 2 : 1.5,
        0.44,
      );
      root.add(label);
    }
    group.add(root);
    targets.push({ id: option.id, object: root });
  });
  if (stage.id === 'celebration') {
    for (let i = 0; i < 7; i++) {
      const star = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.18),
        material(0xfbbf24),
      );
      star.position.set((i - 3) * 0.4, 1.2 + Math.sin(i) * 0.12, 0);
      group.add(star);
    }
  }
  return { group, targets, optionCount: count };
}
export function buildMoneyNavigation() {
  const group = new THREE.Group();
  group.name = 'money-town-vr-controller-navigation';
  const actions = [
    ['back', 'Back'],
    ['next', 'Next'],
    ['replay', 'Replay voice'],
    ['exit', 'Exit VR'],
  ] as const;
  const targets = actions.map(([id, label], index) => {
    const mesh = makeLabel(
      label,
      '',
      id === 'exit' ? '#fca5a5' : '#67e8f9',
      0.78,
      0.25,
    );
    mesh.name = 'money-navigation-' + id;
    mesh.position.set(2.6, 1.9 - index * 0.38, 1.2);
    mesh.lookAt(0, 1.5, 5.3);
    group.add(mesh);
    return { id, object: mesh };
  });
  return { group, targets };
}
