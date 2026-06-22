'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const NARRATIONS = [
  "Welcome to the flower garden. Look all around you — you are standing inside a living garden. Flowers are structures designed for reproduction. Each flower has petals to attract pollinators, stamens that produce pollen, and a pistil that receives it.",
  "Pollen production. The stamens at the center of each flower produce tiny pollen grains. Each grain contains male genetic material. The golden particles you can see drifting around you are pollen gathering on the anthers.",
  "The pollinator arrives. A bee is approaching! Bees are attracted by bright colours, distinct shapes, and the sweet scent of nectar. Watch it fly close to you — this is a crucial moment in plant reproduction.",
  "Cross-pollination. As the bee moves from flower to flower collecting nectar, pollen sticks to its fuzzy body and is carried to the stigma of another flower. This transfer of pollen between two plants is called cross-pollination.",
  "Fertilisation. A pollen tube grows down through the style to reach the ovule deep inside the flower. The male nucleus travels down this tube and fuses with the egg cell. This is fertilisation — the beginning of a new seed.",
  "Seed and fruit formation. The fertilised ovule becomes a seed. The ovary wall swells and becomes fruit, protecting the seed inside. The petals fall away — their job is done. The fruit will help disperse the seeds.",
  "Germination. Look at the ground. Underground, the seed absorbs water and begins to sprout. The radicle grows downward as the first root, while the plumule pushes upward toward light. This process is called germination.",
  "The cycle completes. The seedling grows into a new plant which will one day flower and produce its own pollen. You are surrounded by the result of countless successful pollinations. This is how plant populations grow and evolve.",
];

const STAGES = [
  { title: '🌸 The Flower Garden', cue: 'Flowers are structures designed to enable reproduction. Look around — you\'re standing in a living garden.', detail: 'Each flower has petals (to attract pollinators), stamens (male parts that make pollen), and a pistil (female part that receives pollen).', instructor: 'Ask students: Why are flowers brightly coloured? Why do they smell sweet?' },
  { title: '🟡 Pollen Production', cue: 'The stamens produce pollen grains — each contains male genetic material.', detail: 'Watch the yellow pollen particles gathering on the anthers at the tip of each stamen.', instructor: 'Ask: What do you notice about where the pollen is concentrated?' },
  { title: '🐝 The Pollinator Arrives', cue: 'A bee is approaching! Bees are attracted by colour, shape, and nectar scent.', detail: 'As the bee lands to collect nectar, pollen grains stick to its fuzzy body — especially its legs and abdomen.', instructor: 'Ask: How does the flower benefit from the bee? How does the bee benefit from the flower?' },
  { title: '🌼 Cross-Pollination', cue: 'Pollen travels from one flower\'s stamen to another flower\'s stigma.', detail: 'The sticky stigma (top of the pistil) captures pollen from the bee. This mixes genetic material from two plants.', instructor: 'Ask: Why is mixing genes from two different plants beneficial?' },
  { title: '🌱 Fertilisation', cue: 'Pollen grows a tube down through the style to reach the ovule.', detail: 'A pollen tube grows down to the ovary. The male nucleus travels down this tube and fuses with the egg cell — this is fertilisation.', instructor: 'Misconception: Pollination is NOT the same as fertilisation. Pollination leads to fertilisation.' },
  { title: '🍎 Seed & Fruit Formation', cue: 'The fertilised ovule becomes a seed. The ovary wall becomes the fruit.', detail: 'The petals drop away. The ovary swells and becomes fruit that protects the seeds and aids in their dispersal.', instructor: 'Ask: Can you name 5 fruits? What seed is inside each one?' },
  { title: '🌧️ Germination', cue: 'Seeds need water, warmth, and oxygen to begin germination. Look at the ground.', detail: 'Underground: the seed coat splits open. The radicle (root) grows downward. The plumule (shoot) pushes upward toward light.', instructor: 'Ask: What would happen if you planted a seed upside-down?' },
  { title: '🌳 The Cycle Completes', cue: 'The new plant grows, flowers, and the entire cycle begins again. You are surrounded by the result.', detail: 'One successful pollination can lead to hundreds of seeds — and hundreds of new plants.', instructor: 'Recap: Flower → Pollen → Pollinator → Cross-pollination → Fertilisation → Seed → Germination → New plant.' },
];

function speakText(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.87; utterance.pitch = 1.02; utterance.volume = 1.0;
  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      const voice =
        voices.find(v => v.name === 'Samantha') ||
        voices.find(v => v.name.includes('Google US English')) ||
        voices.find(v => v.name.includes('Karen')) ||
        voices.find(v => v.lang === 'en-US' && v.localService) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };
  if (window.speechSynthesis.getVoices().length > 0) trySpeak();
  else window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
}

function buildFlower(petalHex: number, x: number, z: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, roughness: 0.9 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.5, 8), stemMat);
  stem.position.y = 0.75;
  g.add(stem);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0); leafShape.bezierCurveTo(0.35, 0.08, 0.4, 0.35, 0, 0.55); leafShape.bezierCurveTo(-0.4, 0.35, -0.35, 0.08, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, side: THREE.DoubleSide, roughness: 0.85 });
  [-1, 1].forEach(side => {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(side * 0.06, 0.5, 0);
    leaf.rotation.set(Math.PI / 5, side * (Math.PI / 3.5), 0);
    g.add(leaf);
  });
  const head = new THREE.Group();
  head.position.y = 1.55;
  g.add(head);
  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0); petalShape.bezierCurveTo(0.18, 0.04, 0.22, 0.22, 0.18, 0.4); petalShape.bezierCurveTo(0.14, 0.55, 0, 0.62, 0, 0.62); petalShape.bezierCurveTo(0, 0.62, -0.14, 0.55, -0.18, 0.4); petalShape.bezierCurveTo(-0.22, 0.22, -0.18, 0.04, 0, 0);
  const petalGeo = new THREE.ShapeGeometry(petalShape, 8);
  const petalMat = new THREE.MeshStandardMaterial({ color: petalHex, side: THREE.DoubleSide, roughness: 0.55 });
  for (let i = 0; i < 6; i++) {
    const petal = new THREE.Mesh(petalGeo, petalMat);
    const a = (i / 6) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16);
    petal.rotation.y = -a; petal.rotation.x = Math.PI / 2 - 0.3;
    head.add(petal);
  }
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, emissive: 0xd97706, emissiveIntensity: 0.3 }));
  head.add(center);
  const antherMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfbbf24, emissiveIntensity: 0.6 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
    fil.position.set(Math.cos(a) * 0.09, 0.1, Math.sin(a) * 0.09);
    const anther = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), antherMat);
    anther.position.set(Math.cos(a) * 0.09, 0.18, Math.sin(a) * 0.09);
    head.add(fil, anther);
  }
  return g;
}

function buildBee(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
  body.scale.z = 1.6;
  g.add(body);
  // Stripes
  for (let i = 0; i < 3; i++) {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 4, 16), new THREE.MeshStandardMaterial({ color: 0x1c1917 }));
    stripe.position.z = -0.05 + i * 0.06;
    stripe.rotation.x = Math.PI / 2;
    g.add(stripe);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), new THREE.MeshStandardMaterial({ color: 0x1c1917 }));
  head.position.z = 0.19;
  g.add(head);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  [[1, 0.12], [-1, 0.12]].forEach(([side, y]) => {
    const wg = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.22), wingMat);
    wg.position.set(side * 0.18, y as number, 0);
    wg.rotation.set(-0.3, (side as number) * 0.2, 0);
    g.add(wg);
  });
  // Pollen bags on legs
  const pollenBagMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfbbf24, emissiveIntensity: 0.4 });
  [-1, 1].forEach(side => {
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), pollenBagMat);
    bag.position.set(side * 0.1, -0.1, 0);
    g.add(bag);
  });
  return g;
}

function drawCueCard(canvas: HTMLCanvasElement, stage: typeof STAGES[0], num: number, total: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#040a16';
  ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.strokeStyle = 'rgba(52,211,153,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(4, 4, w - 8, h - 8);
  ctx.stroke();
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText(`Stage ${num} of ${total}  ·  🌸 Pollination`, 20, 38);
  ctx.fillStyle = 'rgba(52,211,153,0.3)';
  ctx.fillRect(20, 46, w - 40, 1);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#ffffff';
  const titleLines = wrapText(ctx, stage.title, 20, 72, w - 40, 30);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#d1d5db';
  wrapText(ctx, stage.cue, 20, titleLines + 10, w - 40, 26);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words = text.split(' ');
  let line = '', cy = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trimEnd(), x, cy); line = word + ' '; cy += lh; }
    else line = test;
  }
  if (line.trim()) { ctx.fillText(line.trimEnd(), x, cy); cy += lh; }
  return cy;
}

export default function PollinationViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cueNeedsUpdateRef = useRef(true);
  const cueCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cueTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const beeRef = useRef<THREE.Group | null>(null);
  const pollenParentRef = useRef<THREE.Group | null>(null);
  const pollenRef = useRef<{ points: THREE.Points; positions: Float32Array } | null>(null);
  const seedRef = useRef<THREE.Mesh | null>(null);
  const seedlingRef = useRef<THREE.Group | null>(null);
  const seedlingGrowthRef = useRef(0);
  const stageRef = useRef(0);

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      setVrSupported(true);
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xc5e8f5, 0.022);

    // ── Sky sphere (gradient: horizon pale blue → zenith deep blue) ───────
    const skyGeo = new THREE.SphereGeometry(48, 32, 20);
    const skyCols = new Float32Array(skyGeo.attributes.position.count * 3);
    for (let i = 0; i < skyGeo.attributes.position.count; i++) {
      const yy = (skyGeo.attributes.position.getY(i) + 48) / 96;
      skyCols[i * 3 + 0] = THREE.MathUtils.lerp(0.84, 0.24, yy);
      skyCols[i * 3 + 1] = THREE.MathUtils.lerp(0.93, 0.47, yy);
      skyCols[i * 3 + 2] = THREE.MathUtils.lerp(1.00, 0.82, yy);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCols, 3));
    scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

    // ── Camera (for browser mode — VR uses headset) ───────────────────────
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.05, 100);
    camera.position.set(0, 1.7, 3.5);
    camera.lookAt(0, 1.5, 0);

    // ── Lights ────────────────────────────────────────────────────────────
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a7d44, 0.7);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff5d6, 1.6);
    sun.position.set(8, 14, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15;
    scene.add(sun);
    // Sun glow fill
    const fill = new THREE.DirectionalLight(0xffd6a5, 0.4);
    fill.position.set(-5, 6, -8);
    scene.add(fill);

    // ── Ground ────────────────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x3d8b47, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    // Dirt patch (center stage)
    const dirt = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 1 }));
    dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.005;
    scene.add(dirt);

    // ── Clouds ────────────────────────────────────────────────────────────
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
    const clouds: THREE.Group[] = [];
    for (let c = 0; c < 5; c++) {
      const cg = new THREE.Group();
      const angle = (c / 5) * Math.PI * 2;
      cg.position.set(Math.cos(angle) * (14 + c * 3), 11 + c * 1.2, Math.sin(angle) * (12 + c * 2));
      for (let b = 0; b < 5; b++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random(), 8, 6), cloudMat);
        blob.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 1.5);
        cg.add(blob);
      }
      scene.add(cg);
      clouds.push(cg);
    }

    // ── 360° Flowers ─────────────────────────────────────────────────────
    const PETAL_COLORS = [0xf472b6, 0xfbbf24, 0xa78bfa, 0xf87171, 0x86efac, 0xfb923c, 0xe879f9, 0x67e8f9];
    const flowerPositions: {x:number,z:number,color:number,scale:number}[] = [];
    // Inner ring (very close — almost touching distance in VR)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      flowerPositions.push({ x: Math.cos(a) * (1.4 + Math.random() * 0.4), z: Math.sin(a) * (1.4 + Math.random() * 0.4), color: PETAL_COLORS[i % PETAL_COLORS.length], scale: 0.7 + Math.random() * 0.3 });
    }
    // Middle ring
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.5;
      flowerPositions.push({ x: Math.cos(a) * (3.5 + Math.random() * 0.8), z: Math.sin(a) * (3.5 + Math.random() * 0.8), color: PETAL_COLORS[(i + 3) % PETAL_COLORS.length], scale: 0.85 + Math.random() * 0.3 });
    }
    // Outer ring
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 1.1;
      flowerPositions.push({ x: Math.cos(a) * (5.5 + Math.random() * 1.5), z: Math.sin(a) * (5.5 + Math.random() * 1.5), color: PETAL_COLORS[(i + 5) % PETAL_COLORS.length], scale: 1.0 + Math.random() * 0.4 });
    }
    flowerPositions.forEach(({ x, z, color, scale }) => {
      const f = buildFlower(color, x, z, scale);
      f.traverse(m => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      scene.add(f);
    });

    // ── Trees (all 360°) ─────────────────────────────────────────────────
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 9 + Math.random() * 5;
      const h = 3 + Math.random() * 2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, h, 7), new THREE.MeshStandardMaterial({ color: 0x6b3d14, roughness: 0.9 }));
      trunk.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      trunk.castShadow = true;
      scene.add(trunk);
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random() * 0.8, 8, 6), new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0x15803d : 0x166534, roughness: 0.9 }));
      foliage.position.set(Math.cos(a) * r, h + 0.9, Math.sin(a) * r);
      foliage.castShadow = true;
      scene.add(foliage);
    }

    // ── Bee (large, flies very close to player at eye level) ─────────────
    const bee = buildBee();
    bee.scale.setScalar(1.6);
    scene.add(bee);
    beeRef.current = bee;

    // ── Pollen particles (spread across the whole garden) ─────────────────
    const POLLEN_COUNT = 200;
    const pollenPositions = new Float32Array(POLLEN_COUNT * 3);
    for (let i = 0; i < POLLEN_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 5;
      pollenPositions[i * 3 + 0] = Math.cos(a) * r;
      pollenPositions[i * 3 + 1] = 0.5 + Math.random() * 2.5;
      pollenPositions[i * 3 + 2] = Math.sin(a) * r;
    }
    const pollenGeo = new THREE.BufferGeometry();
    pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPositions.slice(), 3));
    const pollenMat = new THREE.PointsMaterial({ color: 0xfde68a, size: 0.06, transparent: true, opacity: 0.9, sizeAttenuation: true });
    const pollenPoints = new THREE.Points(pollenGeo, pollenMat);
    const pollenParent = new THREE.Group();
    pollenParent.add(pollenPoints);
    pollenParent.visible = false;
    scene.add(pollenParent);
    pollenParentRef.current = pollenParent;
    pollenRef.current = { points: pollenPoints, positions: pollenPositions };

    // ── Underground section (for stage 6-7) ──────────────────────────────
    const pitGroup = new THREE.Group();
    pitGroup.visible = false;
    scene.add(pitGroup);
    const soilWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 0.1), new THREE.MeshStandardMaterial({ color: 0x7c5c3a }));
    soilWall.position.set(0, -0.9, -0.5);
    pitGroup.add(soilWall);
    const rootMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.6 + Math.random() * 0.4, 4), rootMat);
      root.position.set((Math.random() - 0.5) * 1.5, -1.3, -0.5);
      root.rotation.z = (Math.random() - 0.5) * 0.8;
      pitGroup.add(root);
    }

    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }));
    seed.position.set(0, -0.55, 0);
    seed.visible = false;
    scene.add(seed);
    seedRef.current = seed;

    const seedling = new THREE.Group();
    seedling.visible = false;
    scene.add(seedling);
    const sprout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1, 6), new THREE.MeshStandardMaterial({ color: 0x4ade80 }));
    sprout.position.y = 0.5;
    seedling.add(sprout);
    const sproutLeaf = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshStandardMaterial({ color: 0x22c55e, side: THREE.DoubleSide }));
    sproutLeaf.position.set(0.2, 0.9, 0); sproutLeaf.rotation.z = 0.3;
    seedling.add(sproutLeaf);
    seedlingRef.current = seedling;

    // ── 3D Cue card panel (visible in VR headset) ────────────────────────
    const cueCanvas = document.createElement('canvas');
    cueCanvas.width = 512; cueCanvas.height = 256;
    cueCanvasRef.current = cueCanvas;
    const cueTexture = new THREE.CanvasTexture(cueCanvas);
    cueTextureRef.current = cueTexture;
    const cueMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.55),
      new THREE.MeshBasicMaterial({ map: cueTexture })
    );
    cueMesh.position.set(0, 1.62, -1.8);
    scene.add(cueMesh);

    // Stage nav buttons (VR — point and click)
    const btnMat = (col: number) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 });
    const prevBtn = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.04), btnMat(0x374151));
    prevBtn.position.set(-0.25, 1.28, -1.8); prevBtn.name = 'btn-prev';
    scene.add(prevBtn);
    const nextBtn = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.04), btnMat(0x16a34a));
    nextBtn.position.set(0.25, 1.28, -1.8); nextBtn.name = 'btn-next';
    scene.add(nextBtn);
    const interactables = [prevBtn, nextBtn];

    // ── XR Controllers ────────────────────────────────────────────────────
    function buildControllerVisual() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x2d2d2d, metalness: 0.6 }));
      g.add(body);
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 1.5, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
      );
      ray.position.z = -0.75; ray.rotation.x = Math.PI / 2;
      g.add(ray);
      return g;
    }
    const ctrl0 = renderer.xr.getController(0);
    const ctrl1 = renderer.xr.getController(1);
    ctrl0.add(buildControllerVisual()); ctrl1.add(buildControllerVisual());
    scene.add(ctrl0, ctrl1);

    const ctrlRaycaster = new THREE.Raycaster();
    const advanceStage = () => {
      const next = Math.min(stageRef.current + 1, STAGES.length - 1);
      stageRef.current = next; cueNeedsUpdateRef.current = true;
      if (next === 7) seedlingGrowthRef.current = 0;
      speakText(NARRATIONS[next]);
      setStage(next);
    };
    const retreatStage = () => {
      const next = Math.max(stageRef.current - 1, 0);
      stageRef.current = next; cueNeedsUpdateRef.current = true;
      speakText(NARRATIONS[next]);
      setStage(next);
    };
    const onCtrlSelect = (event: Event) => {
      const ctrl = event.target as unknown as THREE.XRTargetRaySpace;
      ctrlRaycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      ctrlRaycaster.ray.direction.set(0, 0, -1).applyQuaternion(ctrl.quaternion);
      const hits = ctrlRaycaster.intersectObjects(interactables);
      if (hits.length > 0) {
        const name = hits[0].object.name;
        if (name === 'btn-next') advanceStage();
        else if (name === 'btn-prev') retreatStage();
      } else {
        advanceStage();
      }
    };
    ctrl0.addEventListener('selectstart', onCtrlSelect as any);
    ctrl1.addEventListener('selectstart', onCtrlSelect as any);

    // ── OrbitControls (browser mode) ──────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minDistance = 0.3; controls.maxDistance = 20;
    controls.minPolarAngle = 0.05; controls.maxPolarAngle = Math.PI * 0.88;
    controlsRef.current = controls;

    // ── Animation loop ─────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      const s = stageRef.current;

      // Update 3D cue card when stage changes
      if (cueNeedsUpdateRef.current && cueCanvasRef.current) {
        drawCueCard(cueCanvasRef.current, STAGES[stageRef.current], stageRef.current + 1, STAGES.length);
        if (cueTextureRef.current) cueTextureRef.current.needsUpdate = true;
        cueNeedsUpdateRef.current = false;
      }

      // Clouds drift slowly
      clouds.forEach((cg, i) => { cg.position.x += 0.0015 * (i % 2 === 0 ? 1 : -1); });

      // Bee: figure-8 pattern at eye level, very close to player
      bee.visible = s >= 2 && s <= 4;
      if (bee.visible) {
        const bt = t * 0.65;
        if (s === 2) {
          bee.position.set(Math.sin(bt * 2) * 1.8, 1.55 + Math.sin(bt * 1.4) * 0.22, Math.sin(bt) * 2.2 - 0.5);
        } else if (s === 3) {
          bee.position.set(Math.cos(bt * 1.5) * 0.9, 1.6 + Math.sin(bt * 2.2) * 0.12, Math.sin(bt * 1.5) * 1.1 - 0.3);
        } else {
          bee.position.lerp(new THREE.Vector3(-12, 5, 0), 0.006);
        }
        const lookTarget = new THREE.Vector3(bee.position.x + Math.sin(t * 0.7), bee.position.y, bee.position.z - 0.5);
        bee.lookAt(lookTarget);
        bee.children.filter(c => (c as THREE.Mesh).isMesh && ((c as THREE.Mesh).material as THREE.MeshStandardMaterial)?.transparent)
          .forEach((w, i) => { w.rotation.z = Math.sin(t * 20 + i * Math.PI) * 0.45; });
      }

      // Pollen: float and drift
      pollenParent.visible = s >= 1 && s <= 4;
      if (pollenParent.visible && pollenRef.current) {
        const pos = pollenRef.current.points.geometry.attributes.position as THREE.BufferAttribute;
        const orig = pollenRef.current.positions;
        for (let i = 0; i < pos.count; i++) {
          pos.setXYZ(i,
            orig[i * 3] + Math.sin(t * 1.3 + i * 0.7) * 0.04,
            orig[i * 3 + 1] + Math.cos(t * 0.9 + i * 0.4) * 0.05 + Math.sin(t * 0.3) * 0.02,
            orig[i * 3 + 2] + Math.sin(t * 1.6 + i * 1.1) * 0.04
          );
        }
        pos.needsUpdate = true;
      }

      // Underground / seed / seedling stages
      const showUnderground = s === 6 || s === 7;
      pitGroup.visible = showUnderground;
      if (seedRef.current) {
        seedRef.current.visible = s === 6;
        if (s === 6) { seedRef.current.rotation.y = t; seedRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.06); }
      }
      if (seedlingRef.current) {
        seedlingRef.current.visible = s === 7;
        if (s === 7) { seedlingGrowthRef.current = Math.min(seedlingGrowthRef.current + 0.007, 1); seedlingRef.current.scale.setScalar(seedlingGrowthRef.current); }
      }

      // Cue card panel faces player
      const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      cueMesh.lookAt(cam.position);
      prevBtn.lookAt(cam.position);
      nextBtn.lookAt(cam.position);

      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });

    // Initial cue card draw
    drawCueCard(cueCanvas, STAGES[0], 1, STAGES.length);
    cueTexture.needsUpdate = true;

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      window.removeEventListener('resize', onResize);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const advance = useCallback(() => {
    setStage(prev => {
      const next = Math.min(prev + 1, STAGES.length - 1);
      stageRef.current = next; cueNeedsUpdateRef.current = true;
      if (next === 7) seedlingGrowthRef.current = 0;
      speakText(NARRATIONS[next]);
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setStage(prev => {
      const next = Math.max(prev - 1, 0);
      stageRef.current = next; cueNeedsUpdateRef.current = true;
      speakText(NARRATIONS[next]);
      return next;
    });
  }, []);

  const enterVR = useCallback(async () => {
    if (!rendererRef.current) return;
    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      rendererRef.current.xr.setSession(session);
      setStarted(true);
    } catch {
      setStarted(true);
    }
  }, []);

  const info = STAGES[stage];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#0a1f0a', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Intro overlay */}
      {!started && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 40%, #0d2e0d 0%, #030a03 100%)', zIndex: 10 }}>
          <div style={{ textAlign: 'center', maxWidth: 520, padding: '0 24px' }}>
            <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16, filter: 'drop-shadow(0 0 24px rgba(52,211,153,0.5))' }}>🌸</div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f9fafb', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Plant Pollination</h1>
            <p style={{ fontSize: '1.05rem', color: '#4ade80', fontWeight: 600, marginBottom: 8 }}>& Growth Cycle</p>
            <p style={{ color: '#6b7280', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 32 }}>
              Step into a living garden and witness the 8 stages of plant reproduction — from pollen production to germination.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {vrSupported && (
                <button onClick={enterVR} style={{ padding: '14px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 30px rgba(124,58,237,0.5)' }}>
                  <span style={{ fontSize: 22 }}>🥽</span> Enter in VR
                </button>
              )}
              <button onClick={() => { setStarted(true); speakText(NARRATIONS[0]); }} style={{ padding: '14px 28px', borderRadius: 12, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>💻</span> View in Browser
              </button>
            </div>
            {!vrSupported && (
              <p style={{ marginTop: 20, color: '#374151', fontSize: '0.8rem' }}>For immersive VR, open this page in Meta Quest Browser over your local network.</p>
            )}
          </div>
        </div>
      )}

      {started && (
        <>
          <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(3,10,3,0.88)', borderRadius: 8, padding: '6px 14px', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>
            {stage + 1} / {STAGES.length}
          </div>

          <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', width: 'min(580px, 92vw)', background: 'rgba(3,10,3,0.92)', borderRadius: 16, padding: '18px 22px', border: '1px solid rgba(52,211,153,0.2)', color: '#f9fafb' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#34d399', marginBottom: 8 }}>🌸 Pollination Cycle · Stage {stage + 1}</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f9fafb', marginBottom: 7, lineHeight: 1.25 }}>{info.title}</h3>
            <p style={{ color: '#d1d5db', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 8 }}>{info.cue}</p>
            <p style={{ color: '#6b7280', fontSize: '0.78rem', lineHeight: 1.5 }}>{info.detail}</p>
            {info.instructor && (
              <p style={{ marginTop: 10, padding: '7px 11px', borderRadius: 7, background: 'rgba(52,211,153,0.08)', color: '#34d399', fontSize: '0.76rem', lineHeight: 1.5, borderLeft: '2px solid #34d399' }}>
                <strong>Instructor:</strong> {info.instructor}
              </p>
            )}
          </div>

          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={goBack} disabled={stage === 0} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: stage === 0 ? '#374151' : '#e5e7eb', cursor: stage === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
              ← Prev
            </button>
            <button onClick={advance} disabled={stage === STAGES.length - 1} style={{ padding: '10px 24px', borderRadius: 8, background: '#16a34a', border: 'none', color: '#fff', cursor: stage === STAGES.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem', opacity: stage === STAGES.length - 1 ? 0.4 : 1 }}>
              Next Stage →
            </button>
            {vrSupported && (
              <button onClick={enterVR} style={{ padding: '10px 18px', borderRadius: 8, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                🥽 Enter VR
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
