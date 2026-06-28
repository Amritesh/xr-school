'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createParticleCloud, createPhysicsWorld, type RuntimePhysicsWorld } from '@/lib/runtimePhysics';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';

const STAGES = [
  {
    key: 'solid',
    title: 'Solid',
    cue: 'Particles stay close together and vibrate in fixed positions.',
    note: 'Shape: fixed. Volume: fixed. Motion: vibration.',
    heat: 0.18,
    color: 0x60a5fa,
  },
  {
    key: 'liquid',
    title: 'Liquid',
    cue: 'Particles remain close, but they slide past each other and take the container shape.',
    note: 'Shape: container. Volume: fixed. Motion: flowing.',
    heat: 0.48,
    color: 0x34d399,
  },
  {
    key: 'gas',
    title: 'Gas',
    cue: 'Particles spread far apart, move quickly, and fill all available space.',
    note: 'Shape: container. Volume: container. Motion: rapid.',
    heat: 0.82,
    color: 0xfbbf24,
  },
  {
    key: 'phase-change',
    title: 'Phase Change',
    cue: 'Adding or removing heat changes particle energy and can change the state of matter.',
    note: 'Heat up: solid to liquid to gas. Cool down: gas to liquid to solid.',
    heat: 0.62,
    color: 0xf97316,
  },
] as const;

type Stage = (typeof STAGES)[number];

const NARRATIONS = STAGES.map(stage => `${stage.title}. ${stage.cue} ${stage.note}`);

const NARRATION_AUDIO_URLS = [
  '/audio/states-of-matter/stage-01.mp3',
  '/audio/states-of-matter/stage-02.mp3',
  '/audio/states-of-matter/stage-03.mp3',
  '/audio/states-of-matter/stage-04.mp3',
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function stateFromHeat(heat: number) {
  if (heat < 0.34) return STAGES[0];
  if (heat < 0.68) return STAGES[1];
  return STAGES[2];
}

function drawCueCard(canvas: HTMLCanvasElement, stage: Stage, heat: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#07111f';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('States of Matter Particle Lab', 26, 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(stage.title, 26, 98);
  ctx.fillStyle = '#d1d5db';
  ctx.font = '24px sans-serif';
  wrapText(ctx, stage.cue, 26, 138, w - 52, 32);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`Heat energy: ${Math.round(heat * 100)}%`, 26, h - 34);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line.trimEnd(), x, currentY);
      line = `${word} `;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) ctx.fillText(line.trimEnd(), x, currentY);
}

function makeStageButtonLabelTexture(label: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = '#f8fafc';
  ctx.font = label.length > 12 ? 'bold 38px sans-serif' : 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeStageButtonLabelMesh(label: string, color: string) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.54, 0.16),
    new THREE.MeshBasicMaterial({ map: makeStageButtonLabelTexture(label, color), transparent: true, depthTest: false })
  );
  mesh.position.z = 0.026;
  return mesh;
}

function makeControllerRay() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.6)]);
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8 }));
}

export default function StatesOfMatterViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const particlesRef = useRef<THREE.Mesh[]>([]);
  const physicsWorldRef = useRef<RuntimePhysicsWorld | null>(null);
  const cueCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cueTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const heatRef = useRef<number>(STAGES[0].heat);
  const stageRef = useRef(0);

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [heat, setHeat] = useState<number>(STAGES[0].heat);

  const stage = STAGES[stageIndex];
  const observedState = useMemo(() => (stage.key === 'phase-change' ? stateFromHeat(heat) : stage), [heat, stage]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) setVrSupported(true);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08111f);
    scene.fog = new THREE.Fog(0x08111f, 6, 18);

    const camera = new THREE.PerspectiveCamera(68, mount.clientWidth / mount.clientHeight, 0.05, 50);
    camera.position.set(0, 1.65, 4.4);
    camera.lookAt(0, 1.2, 0);

    scene.add(new THREE.HemisphereLight(0x90cdf4, 0x0f172a, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(4, 6, 4);
    key.castShadow = true;
    scene.add(key);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const chamber = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 2.2, 3.1),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12, roughness: 0.2 })
    );
    chamber.position.y = 1.25;
    scene.add(chamber);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(3.1, 2.2, 3.1)),
      new THREE.LineBasicMaterial({ color: 0x38bdf8 })
    );
    edges.position.copy(chamber.position);
    scene.add(edges);

    const heater = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 0.08, 48),
      new THREE.MeshStandardMaterial({ color: 0x7c2d12, emissive: 0xef4444, emissiveIntensity: 0.6 })
    );
    heater.position.set(0, 0.1, 0);
    scene.add(heater);

    const particleGeometry = new THREE.SphereGeometry(0.075, 16, 16);
    const particleMaterial = new THREE.MeshStandardMaterial({ color: STAGES[0].color, emissive: STAGES[0].color, emissiveIntensity: 0.45 });
    const particles: THREE.Mesh[] = [];
    const physicsWorld = createPhysicsWorld({
      bounds: { min: { x: -1.45, y: 0.35, z: -1.45 }, max: { x: 1.45, y: 2.1, z: 1.45 } },
      restitution: 0.86,
      drag: 0.18,
    });
    createParticleCloud({
      prefix: 'matter-particle',
      count: 72,
      seed: 90210,
      bounds: { min: { x: -0.9, y: 0.55, z: -0.9 }, max: { x: 0.9, y: 1.85, z: 0.9 } },
      speed: 0.018,
      mass: 1,
      radius: 0.075,
      tags: ['matter'],
    }).forEach(body => physicsWorld.addBody(body));
    physicsWorldRef.current = physicsWorld;
    const initialBodies = physicsWorld.bodies();
    for (let i = 0; i < initialBodies.length; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      const body = initialBodies[i];
      particle.position.set(body.position.x, body.position.y, body.position.z);
      particle.castShadow = true;
      scene.add(particle);
      particles.push(particle);
    }
    particlesRef.current = particles;

    const cueCanvas = document.createElement('canvas');
    cueCanvas.width = 700;
    cueCanvas.height = 360;
    cueCanvasRef.current = cueCanvas;
    const cueTexture = new THREE.CanvasTexture(cueCanvas);
    cueTextureRef.current = cueTexture;
    const cueMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.92), new THREE.MeshBasicMaterial({ map: cueTexture, transparent: true }));
    cueMesh.position.set(-2.35, 1.75, -0.9);
    scene.add(cueMesh);

    const stageButtons: THREE.Mesh[] = [];
    STAGES.forEach((item, index) => {
      const button = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.18, 0.04),
        new THREE.MeshStandardMaterial({ color: item.color, emissive: item.color, emissiveIntensity: 0.22, roughness: 0.42 })
      );
      button.name = `stage-button-${index}`;
      button.position.set(-1.17 + index * 0.78, 0.68, -1.85);
      const color = `#${item.color.toString(16).padStart(6, '0')}`;
      button.add(makeStageButtonLabelMesh(item.title, color));
      scene.add(button);
      stageButtons.push(button);
    });

    const controllerRaycaster = new THREE.Raycaster();
    const applyStage = (nextIndex: number) => {
      const next = STAGES[nextIndex];
      stageRef.current = nextIndex;
      heatRef.current = next.heat;
      setStageIndex(nextIndex);
      setHeat(next.heat);
      void playSimulationNarration(NARRATIONS[nextIndex], nextIndex, NARRATION_AUDIO_URLS[nextIndex]);
    };
    const controller0 = renderer.xr.getController(0);
    const controller1 = renderer.xr.getController(1);
    controller0.add(makeControllerRay());
    controller1.add(makeControllerRay());
    scene.add(controller0, controller1);
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.Group;
      controllerRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      controllerRaycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.quaternion);
      const hits = controllerRaycaster.intersectObjects(stageButtons);
      if (!hits.length) return;
      const nextIndex = Number(hits[0].object.name.replace('stage-button-', ''));
      if (Number.isInteger(nextIndex)) applyStage(nextIndex);
    };
    controller0.addEventListener('selectstart', onControllerSelect as any);
    controller1.addEventListener('selectstart', onControllerSelect as any);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.minDistance = 2.4;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controlsRef.current = controls;

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.033);
      const elapsed = clock.elapsedTime;
      const activeStage = STAGES[stageRef.current];
      const activeHeat = heatRef.current;
      const visualState = activeStage.key === 'phase-change' ? stateFromHeat(activeHeat) : activeStage;
      const forceScale = 0.45 + activeHeat * 4.2;
      const physicsWorld = physicsWorldRef.current;
      const bodyPositions = new Map(physicsWorld?.bodies().map(body => [body.id, body.position]) ?? []);

      particles.forEach((particle, i) => {
        const material = particle.material as THREE.MeshStandardMaterial;
        material.color.setHex(visualState.color);
        material.emissive.setHex(visualState.color);

        if (visualState.key === 'solid') {
          const row = i % 6;
          const col = Math.floor(i / 6) % 6;
          const layer = Math.floor(i / 36);
          const base = new THREE.Vector3((row - 2.5) * 0.28, 0.74 + col * 0.18, (layer - 0.5) * 0.34);
          particle.position.lerp(base.add(new THREE.Vector3(Math.sin(elapsed * 10 + i) * 0.025, Math.cos(elapsed * 9 + i) * 0.025, 0)), 0.12);
        } else {
          physicsWorld?.applyForce(`matter-particle-${i}`, {
            x: Math.sin(elapsed * 1.7 + i * 12.9898) * forceScale,
            y: Math.cos(elapsed * 1.3 + i * 78.233) * forceScale * 0.72,
            z: Math.sin(elapsed * 1.1 + i * 37.719) * forceScale,
          });
          const position = bodyPositions.get(`matter-particle-${i}`);
          if (position) particle.position.lerp(new THREE.Vector3(position.x, position.y, position.z), 0.75);
        }
      });

      if (visualState.key !== 'solid') physicsWorld?.step(dt);

      if (cueCanvasRef.current && cueTextureRef.current) {
        drawCueCard(cueCanvasRef.current, visualState, activeHeat);
        cueTextureRef.current.needsUpdate = true;
      }

      heater.scale.setScalar(0.85 + activeHeat * 0.22);
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      cueMesh.lookAt(activeCamera.position);
      stageButtons.forEach(button => button.lookAt(activeCamera.position));
      if (!renderer.xr.isPresenting) controls.update();
      renderer.render(scene, camera);
    });

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      controller0.removeEventListener('selectstart', onControllerSelect as any);
      controller1.removeEventListener('selectstart', onControllerSelect as any);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      physicsWorldRef.current = null;
      stopSimulationNarration();
    };
  }, []);

  const setStage = useCallback((index: number) => {
    const nextIndex = clamp(index, 0, STAGES.length - 1);
    const next = STAGES[nextIndex];
    stageRef.current = nextIndex;
    heatRef.current = next.heat;
    setStageIndex(nextIndex);
    setHeat(next.heat);
    void playSimulationNarration(NARRATIONS[nextIndex], nextIndex, NARRATION_AUDIO_URLS[nextIndex]);
  }, []);

  const enterVR = useCallback(async () => {
    if (!rendererRef.current) return;
    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      rendererRef.current.xr.setSession(session);
    } finally {
      setStarted(true);
      void playSimulationNarration(NARRATIONS[stageRef.current], stageRef.current, NARRATION_AUDIO_URLS[stageRef.current]);
    }
  }, []);

  const startExperience = useCallback(() => {
    setStarted(true);
    void playSimulationNarration(NARRATIONS[stageRef.current], stageRef.current, NARRATION_AUDIO_URLS[stageRef.current]);
  }, []);

  const updateHeat = (value: number) => {
    const nextHeat = Number(value);
    heatRef.current = nextHeat;
    setHeat(nextHeat);
    if (stage.key !== 'phase-change') return;
    stageRef.current = 3;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#08111f' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {!started && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 35%, #0f2a44 0%, #050812 72%)', zIndex: 10 }}>
          <div style={{ maxWidth: 560, padding: 24, textAlign: 'center' }}>
            <div style={{ color: '#38bdf8', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Class 9 Science</div>
            <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '2.4rem', lineHeight: 1.05 }}>States of Matter Particle Lab</h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.7, margin: '18px 0 28px' }}>Step inside a particle chamber. Add heat, cool it down, and watch the invisible motion behind solids, liquids, gases, and phase changes.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {vrSupported && (
                <button onClick={enterVR} style={{ padding: '13px 24px', borderRadius: 10, border: 0, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Enter VR</button>
              )}
              <button onClick={startExperience} style={{ padding: '13px 24px', borderRadius: 10, border: '1px solid rgba(56,189,248,0.5)', background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', fontWeight: 800, cursor: 'pointer' }}>View in Browser</button>
            </div>
          </div>
        </div>
      )}

      {started && (
        <>
          <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: 10, borderRadius: 12, background: 'rgba(2,6,23,0.88)', border: '1px solid rgba(148,163,184,0.18)' }}>
            {STAGES.map((item, index) => (
              <button key={item.key} onClick={() => setStage(index)} style={{ padding: '9px 12px', borderRadius: 8, border: index === stageIndex ? '1px solid #38bdf8' : '1px solid transparent', background: index === stageIndex ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.05)', color: index === stageIndex ? '#7dd3fc' : '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}>{item.title}</button>
            ))}
          </div>

          <div style={{ position: 'absolute', right: 18, top: 86, width: 300, padding: 16, borderRadius: 12, background: 'rgba(2,6,23,0.9)', border: '1px solid rgba(56,189,248,0.22)', color: '#e5e7eb' }}>
            <div style={{ color: '#38bdf8', fontSize: 12, textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em' }}>Observed State</div>
            <h2 style={{ margin: '8px 0', fontSize: '1.3rem' }}>{observedState.title}</h2>
            <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>{observedState.cue}</p>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{observedState.note}</p>
            <label style={{ display: 'block', color: '#fbbf24', fontWeight: 900, marginTop: 14, marginBottom: 8 }}>Heat energy: {Math.round(heat * 100)}%</label>
            <input aria-label="Heat energy" type="range" min={0.12} max={0.92} step={0.01} value={heat} onChange={event => updateHeat(Number(event.target.value))} style={{ width: '100%' }} />
          </div>

          <div style={{ position: 'absolute', left: 18, bottom: 18, color: '#64748b', fontSize: 13 }}>
            Drag to orbit. Use Phase Change, then adjust heat.
          </div>
        </>
      )}
    </div>
  );
}
