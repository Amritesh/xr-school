'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const STAGES = [
  {
    title: '🌸 The Flower Garden',
    cue: 'Flowers are structures designed to enable reproduction.',
    detail: 'Each flower has petals (to attract pollinators), stamens (male parts that make pollen), and a pistil (female part that receives pollen).',
    instructor: 'Ask students: Why are flowers brightly coloured? Why do they smell sweet?',
  },
  {
    title: '🟡 Pollen Production',
    cue: 'The stamens produce pollen grains — each contains male genetic material.',
    detail: 'Watch the yellow pollen particles gathering on the anthers at the tip of each stamen.',
    instructor: 'Ask: What do you notice about where the pollen is concentrated?',
  },
  {
    title: '🐝 The Pollinator Arrives',
    cue: 'Bees are attracted by colour, shape, and nectar scent.',
    detail: 'As the bee lands to collect nectar, pollen grains stick to its fuzzy body — especially its legs and abdomen.',
    instructor: 'Ask: How does the flower benefit from the bee? How does the bee benefit from the flower?',
  },
  {
    title: '🌼 Cross-Pollination',
    cue: 'Pollen travels from one flower\'s stamen to another flower\'s stigma.',
    detail: 'The sticky stigma (top of the pistil) captures pollen from the bee. This is called cross-pollination — it mixes genetic material from two plants.',
    instructor: 'Ask: Why is mixing genes from two different plants beneficial?',
  },
  {
    title: '🌱 Fertilisation',
    cue: 'Pollen grows a tube down through the style to reach the ovule.',
    detail: 'A pollen tube grows down to the ovary. The male nucleus travels down this tube and fuses with the egg cell (ovule) — this is fertilisation.',
    instructor: 'Misconception to address: Pollination is NOT the same as fertilisation. Pollination leads to fertilisation.',
  },
  {
    title: '🍎 Seed & Fruit Formation',
    cue: 'The fertilised ovule becomes a seed. The ovary wall becomes the fruit.',
    detail: 'The petals drop away. The ovary swells and becomes fruit that protects the seeds and aids in their dispersal by animals.',
    instructor: 'Ask: Can you name 5 fruits? What seed is inside each one?',
  },
  {
    title: '🌧️ Germination',
    cue: 'Seeds need water, warmth, and oxygen to begin germination.',
    detail: 'Underground: the seed coat splits open. The radicle (root) grows downward. The plumule (shoot) pushes upward toward light — this is phototropism.',
    instructor: 'Ask: What would happen if you planted a seed upside-down? (Answer: it still grows the right way due to gravitropism)',
  },
  {
    title: '🌳 The Cycle Completes',
    cue: 'The new plant grows, flowers, and the entire cycle begins again.',
    detail: 'One successful pollination can lead to hundreds of seeds — and hundreds of new plants. This is how plant populations spread and evolve.',
    instructor: 'Recap: Flower → Pollen → Pollinator → Cross-pollination → Fertilisation → Seed → Germination → New plant.',
  },
];

function buildFlower(petalHex: number, x: number, z: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, roughness: 0.9 });

  // Stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.6, 8), stemMat);
  stem.position.y = 0.8;
  g.add(stem);

  // Leaf pair
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.35, 0.08, 0.4, 0.35, 0, 0.55);
  leafShape.bezierCurveTo(-0.4, 0.35, -0.35, 0.08, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, side: THREE.DoubleSide, roughness: 0.85 });
  [-1, 1].forEach((side) => {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(side * 0.06, 0.55, 0);
    leaf.rotation.set(Math.PI / 5, side * (Math.PI / 3.5), 0);
    g.add(leaf);
  });

  // Flower head group
  const head = new THREE.Group();
  head.position.y = 1.62;
  g.add(head);

  // Petals — 6 rounded shapes around center
  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.bezierCurveTo(0.18, 0.04, 0.22, 0.22, 0.18, 0.4);
  petalShape.bezierCurveTo(0.14, 0.55, 0, 0.62, 0, 0.62);
  petalShape.bezierCurveTo(0, 0.62, -0.14, 0.55, -0.18, 0.4);
  petalShape.bezierCurveTo(-0.22, 0.22, -0.18, 0.04, 0, 0);
  const petalGeo = new THREE.ShapeGeometry(petalShape, 8);
  const petalMat = new THREE.MeshStandardMaterial({ color: petalHex, side: THREE.DoubleSide, roughness: 0.55 });
  for (let i = 0; i < 6; i++) {
    const petal = new THREE.Mesh(petalGeo, petalMat);
    const angle = (i / 6) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 0.16, 0, Math.sin(angle) * 0.16);
    petal.rotation.y = -angle;
    petal.rotation.x = Math.PI / 2 - 0.3;
    head.add(petal);
  }

  // Flower center disc
  const centerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, emissive: 0xd97706, emissiveIntensity: 0.2 });
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), centerMat);
  head.add(center);

  // Stamens
  const antherMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfbbf24, emissiveIntensity: 0.5, roughness: 0.3 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const stamen = new THREE.Group();
    stamen.position.set(Math.cos(a) * 0.09, 0.04, Math.sin(a) * 0.09);
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
    fil.position.y = 0.06;
    const anther = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), antherMat);
    anther.position.y = 0.135;
    stamen.add(fil, anther);
    head.add(stamen);
  }

  return g;
}

function buildBee(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
  body.scale.z = 1.7;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), new THREE.MeshStandardMaterial({ color: 0x1c1917 }));
  head.position.z = 0.15;
  g.add(head);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  [1, -1].forEach(side => {
    const wg = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2), wingMat);
    wg.position.set(side * 0.14, 0.1, 0);
    wg.rotation.set(-0.3, side * 0.15, 0);
    g.add(wg);
  });
  return g;
}

function buildPollenCloud(count: number): { points: THREE.Points; positions: Float32Array } {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.3;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
  const mat = new THREE.PointsMaterial({ color: 0xfde68a, size: 0.04, transparent: true, opacity: 0.85, sizeAttenuation: true });
  return { points: new THREE.Points(geo, mat), positions };
}

export default function PollinationViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [stage, setStage] = useState(0);
  const [vrSupported, setVrSupported] = useState(false);
  const stageRef = useRef(0);
  const beeRef = useRef<THREE.Group | null>(null);
  const pollenRef = useRef<{ points: THREE.Points; positions: Float32Array } | null>(null);
  const pollenParentRef = useRef<THREE.Group | null>(null);
  const seedRef = useRef<THREE.Mesh | null>(null);
  const seedlingRef = useRef<THREE.Group | null>(null);
  const seedlingGrowthRef = useRef(0);
  const timeRef = useRef(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      (navigator as any).xr?.isSessionSupported?.('immersive-vr').then((ok: boolean) => setVrSupported(ok));
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0xb0d8f5, 0.04);

    // ── Camera ──────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 2.2, 5.5);
    camera.lookAt(0, 1.2, 0);

    // ── Lights ──────────────────────────────────────────────
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2d7a3a, 0.6);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff8e1, 1.4);
    sun.position.set(6, 12, 5);
    sun.castShadow = true;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    // ── Ground ──────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x3a7d44, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Dirt path circle under scene center
    const path = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 32),
      new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 1 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.01;
    scene.add(path);

    // ── Flowers ──────────────────────────────────────────────
    const flowerDefs = [
      { color: 0xf472b6, x: 0, z: 0, scale: 1.2 },        // centre pink
      { color: 0xfbbf24, x: -2.2, z: -1.2, scale: 0.95 },  // left yellow
      { color: 0xa78bfa, x: 2.2, z: -1.4, scale: 0.9 },    // right purple
      { color: 0xf87171, x: -1.8, z: 2, scale: 0.8 },      // back-left red
      { color: 0x86efac, x: 2, z: 1.8, scale: 0.75 },      // back-right mint
    ];
    flowerDefs.forEach(({ color, x, z, scale }) => {
      const f = buildFlower(color, x, z, scale);
      f.traverse(m => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      scene.add(f);
    });

    // ── Bee ──────────────────────────────────────────────────
    const bee = buildBee();
    bee.position.set(-5, 3, 0);
    bee.scale.setScalar(1.4);
    scene.add(bee);
    beeRef.current = bee;

    // ── Pollen ───────────────────────────────────────────────
    const pollenParent = new THREE.Group();
    pollenParent.position.set(0, 1.62, 0); // at centre flower head
    pollenParent.visible = false;
    scene.add(pollenParent);
    pollenParentRef.current = pollenParent;
    const pollen = buildPollenCloud(80);
    pollenParent.add(pollen.points);
    pollenRef.current = pollen;

    // ── Underground cross-section ─────────────────────────────
    // Soil wall (only visible in stage 6+)
    const soilGroup = new THREE.Group();
    soilGroup.visible = false;
    scene.add(soilGroup);
    const soilBack = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x7c5c3a })
    );
    soilBack.position.set(0, -0.8, -0.5);
    soilGroup.add(soilBack);

    // ── Seed ─────────────────────────────────────────────────
    const seed = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 })
    );
    seed.position.set(0, -0.6, 0);
    seed.visible = false;
    scene.add(seed);
    seedRef.current = seed;

    // ── Seedling ─────────────────────────────────────────────
    const seedling = new THREE.Group();
    seedling.visible = false;
    scene.add(seedling);
    const sprout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 1, 6),
      new THREE.MeshStandardMaterial({ color: 0x4ade80 })
    );
    sprout.position.y = 0.5;
    seedling.add(sprout);
    const sproutLeaf = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, side: THREE.DoubleSide })
    );
    sproutLeaf.position.set(0.2, 0.9, 0);
    sproutLeaf.rotation.z = 0.3;
    seedling.add(sproutLeaf);
    seedlingRef.current = seedling;

    // ── Background trees (billboards) ────────────────────────
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 10 + Math.random() * 4;
      const trunkH = 2.5 + Math.random();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.25, trunkH, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b3d14 })
      );
      trunk.position.set(Math.cos(a) * r, trunkH / 2, Math.sin(a) * r);
      scene.add(trunk);
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(1.2 + Math.random() * 0.6, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 })
      );
      foliage.position.set(Math.cos(a) * r, trunkH + 0.8, Math.sin(a) * r);
      scene.add(foliage);
    }

    // ── Controls (desktop) ────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.5;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    // ── Animation loop ────────────────────────────────────────
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      timeRef.current = t;
      const s = stageRef.current;

      // Bee flight path
      bee.visible = s >= 2 && s <= 4;
      if (bee.visible) {
        const progress = Math.min((t % 8) / 8, 1);
        const beeAngle = t * 0.9;
        if (s === 2) {
          bee.position.set(Math.cos(beeAngle) * 2.5, 2.2 + Math.sin(t * 1.5) * 0.3, Math.sin(beeAngle) * 2.5);
        } else if (s === 3) {
          bee.position.set(Math.cos(t * 0.4) * 1.5, 1.8 + Math.sin(t * 2) * 0.15, Math.sin(t * 0.4) * 1.5);
        } else {
          bee.position.lerp(new THREE.Vector3(-8, 4, 0), 0.005);
        }
        bee.lookAt(new THREE.Vector3(0, 1.6, 0));
        // Wing flap
        const wings = bee.children.filter((_, i) => i >= 2);
        wings.forEach((w, i) => { (w as THREE.Object3D).rotation.z = Math.sin(t * 18 + i * Math.PI) * 0.4; });
      }

      // Pollen cloud animation
      pollenParent.visible = s >= 1 && s <= 3;
      if (pollenParent.visible && pollenRef.current) {
        const pos = pollenRef.current.points.geometry.attributes.position as THREE.BufferAttribute;
        const orig = pollenRef.current.positions;
        for (let i = 0; i < pos.count; i++) {
          const drift = s === 3 ? (bee.position.distanceTo(new THREE.Vector3(2.2, 1.5, -1.4)) < 4 ? 0.012 : 0) : 0;
          pos.setXYZ(i,
            orig[i * 3] + Math.sin(t * 2 + i) * 0.02 + drift * (Math.random() - 0.5),
            orig[i * 3 + 1] + Math.cos(t * 1.7 + i * 0.5) * 0.025,
            orig[i * 3 + 2] + Math.sin(t * 2.3 + i * 0.8) * 0.02
          );
        }
        pos.needsUpdate = true;
      }

      // Seed underground
      if (seed) {
        seed.visible = s === 6;
        if (s === 6) {
          seed.rotation.y = t;
          seed.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
        }
      }

      // Seedling growth
      if (seedling) {
        seedling.visible = s === 7;
        if (s === 7) {
          seedlingGrowthRef.current = Math.min(seedlingGrowthRef.current + 0.008, 1);
          seedling.scale.setScalar(seedlingGrowthRef.current);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    });

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
      mount.removeChild(renderer.domElement);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const advance = useCallback(() => {
    setStage(prev => {
      const next = Math.min(prev + 1, STAGES.length - 1);
      stageRef.current = next;
      if (next === 7) seedlingGrowthRef.current = 0;
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setStage(prev => {
      const next = Math.max(prev - 1, 0);
      stageRef.current = next;
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
    } catch (e) {
      alert('Could not start VR session. Make sure WebXR is supported on your device.');
    }
  }, []);

  const info = STAGES[stage];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Stage counter */}
      <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', borderRadius: 8, padding: '6px 14px', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>
        {stage + 1} / {STAGES.length}
      </div>

      {/* Cue card */}
      <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', width: 'min(600px, 92vw)', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#34d399', marginBottom: 8 }}>🌸 Pollination Cycle · Stage {stage + 1}</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb', marginBottom: 8, lineHeight: 1.2 }}>{info.title}</h3>
        <p style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 10 }}>{info.cue}</p>
        <p style={{ color: '#6b7280', fontSize: '0.8rem', lineHeight: 1.5 }}>{info.detail}</p>
        {info.instructor && (
          <p style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: '0.78rem', lineHeight: 1.5, borderLeft: '2px solid #34d399' }}>
            <strong>Instructor:</strong> {info.instructor}
          </p>
        )}
      </div>

      {/* Controls */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={goBack} disabled={stage === 0} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: stage === 0 ? '#374151' : '#e5e7eb', cursor: stage === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
          ← Prev
        </button>
        <button onClick={advance} disabled={stage === STAGES.length - 1} style={{ padding: '10px 24px', borderRadius: 8, background: '#16a34a', border: 'none', color: '#fff', cursor: stage === STAGES.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem', opacity: stage === STAGES.length - 1 ? 0.4 : 1 }}>
          Next Stage →
        </button>
        {vrSupported && (
          <button onClick={enterVR} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
            🥽 Enter VR
          </button>
        )}
      </div>
    </div>
  );
}
