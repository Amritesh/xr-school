'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createParticleCloud, createPhysicsWorld, type RuntimePhysicsWorld } from '@/lib/runtimePhysics';
import type { ScienceSimulationCatalogItem } from '@/lib/scienceCatalog.generated';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import { computeFocusFrame, createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';

type Stage = {
  title: string;
  cue: string;
  action: string;
};

const ARCHETYPE_COLORS: Record<string, number> = {
  modelInspection: 0x38bdf8,
  scenario: 0xfb7185,
  sortingBoard: 0x4ade80,
  guidedTour: 0xa78bfa,
  experimentBench: 0x67e8f9,
  processTimeline: 0xfb923c,
  measurementGraph: 0xf472b6,
  systemMap: 0x2dd4bf,
};

const ARCHETYPE_LABELS: Record<string, string> = {
  modelInspection: 'Inspect',
  scenario: 'Decide',
  sortingBoard: 'Sort',
  guidedTour: 'Explore',
  experimentBench: 'Experiment',
  processTimeline: 'Sequence',
  measurementGraph: 'Measure',
  systemMap: 'Connect',
};

export function buildArchetypeStages(simulation: ScienceSimulationCatalogItem): Stage[] {
  const subject = simulation.subject.replace(/([A-Z])/g, ' $1').toLowerCase();
  const archetype = ARCHETYPE_LABELS[simulation.primaryArchetype] ?? 'Explore';
  return [
    {
      title: 'Set Up',
      cue: `Class ${simulation.classLevel} ${subject}: ${simulation.title}.`,
      action: `Start with the central question from ${simulation.topic}.`,
    },
    {
      title: archetype,
      cue: simulation.implementationNotes,
      action: 'Use the 3D controls to inspect the evidence before answering.',
    },
    {
      title: 'Misconception Check',
      cue: `Compare what you see with a common wrong idea about ${simulation.title.toLowerCase()}.`,
      action: 'Name one observation that proves the wrong idea is incomplete.',
    },
    {
      title: 'Explain',
      cue: `Connect the virtual evidence back to the textbook chapter: ${simulation.topic}.`,
      action: 'Say the explanation in one measurable sentence.',
    },
  ];
}

function makeLabelTexture(text: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = '#f8fafc';
  ctx.font = text.length > 18 ? 'bold 44px sans-serif' : 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeButton(label: string, color: string) {
  const group = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.18, 0.05),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 0.18, roughness: 0.42 })
  );
  const text = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 0.16),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture(label, color), transparent: true, depthTest: false })
  );
  text.position.z = 0.032;
  group.add(text);
  return group;
}

function makeControllerRay() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -3)]);
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.74 }));
}

function addStageButtons(scene: THREE.Scene, stages: Stage[], color: string) {
  return stages.map((stage, index) => {
    const button = makeButton(stage.title, color);
    button.name = `catalog-stage-button-${index}`;
    button.position.set(-1.35 + index * 0.9, 0.72, -1.7);
    scene.add(button);
    return button;
  });
}

function addArchetypeScene(scene: THREE.Scene, simulation: ScienceSimulationCatalogItem, physicsWorld: RuntimePhysicsWorld, color: number) {
  const objects: THREE.Object3D[] = [];
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.14, roughness: 0.36 });

  if (simulation.primaryArchetype === 'experimentBench') {
    const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.58, 1.45, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.22 }));
    beaker.position.set(0, 1.05, -0.25);
    scene.add(beaker);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.52, 0.82, 48), new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 }));
    water.position.set(0, 0.82, -0.25);
    scene.add(water);
  } else if (simulation.primaryArchetype === 'measurementGraph') {
    const track = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.12), material);
    track.position.set(0, 0.7, -0.2);
    scene.add(track);
    const graph = new THREE.Group();
    [0.35, 0.65, 1.05, 1.5].forEach((height, index) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, height, 0.08), new THREE.MeshStandardMaterial({ color: 0xf472b6 }));
      bar.position.set(-0.48 + index * 0.32, 0.45 + height / 2, -1.35);
      graph.add(bar);
    });
    scene.add(graph);
  } else if (simulation.primaryArchetype === 'processTimeline') {
    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.42), material.clone());
      step.position.set(-1.2 + i * 0.8, 0.85, -0.2);
      scene.add(step);
      objects.push(step);
    }
  } else if (simulation.primaryArchetype === 'sortingBoard') {
    for (let i = 0; i < 3; i++) {
      const platform = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.82), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.38 }));
      platform.position.set(-1.35 + i * 1.35, 0.56, -0.72);
      scene.add(platform);
    }
  } else if (simulation.primaryArchetype === 'systemMap') {
    const points = [
      new THREE.Vector3(0, 1.25, -0.2),
      new THREE.Vector3(-1.1, 0.78, -0.2),
      new THREE.Vector3(1.1, 0.78, -0.2),
      new THREE.Vector3(0, 0.58, 0.82),
    ];
    points.forEach(point => {
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), material.clone());
      node.position.copy(point);
      scene.add(node);
      objects.push(node);
    });
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color }));
    scene.add(line);
  } else {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), material);
    core.position.set(0, 1.08, -0.2);
    scene.add(core);
    objects.push(core);
    for (let i = 0; i < 5; i++) {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 18), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
      marker.position.set(Math.cos(i * 1.25) * 1.25, 1.08 + Math.sin(i * 0.9) * 0.35, -0.2 + Math.sin(i * 1.25) * 1.25);
      scene.add(marker);
      objects.push(marker);
    }
  }

  createParticleCloud({
    prefix: 'catalog-particle',
    count: 36,
    seed: simulation.classLevel * 1000 + simulation.chapter * 37 + simulation.activityNumber,
    bounds: { min: { x: -1.45, y: 0.45, z: -1.45 }, max: { x: 1.45, y: 1.9, z: 1.45 } },
    speed: 0.08,
    mass: 1,
    radius: 0.035,
    tags: [simulation.primaryArchetype],
  }).forEach(body => {
    physicsWorld.addBody(body);
    const particle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.3 }));
    particle.name = body.id;
    particle.position.set(body.position.x, body.position.y, body.position.z);
    scene.add(particle);
    objects.push(particle);
  });

  return objects;
}

export default function GenericCatalogSimulationViewer({ simulation }: { simulation: ScienceSimulationCatalogItem }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const physicsWorldRef = useRef<RuntimePhysicsWorld | null>(null);
  const stageRef = useRef(0);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const stages = useMemo(() => buildArchetypeStages(simulation), [simulation]);
  const color = ARCHETYPE_COLORS[simulation.primaryArchetype] ?? 0x38bdf8;
  const colorString = `#${color.toString(16).padStart(6, '0')}`;

  const narrateStage = useCallback((index: number) => {
    const stage = stages[index];
    void playSimulationNarration(`${stage.title}. ${stage.cue} ${stage.action}`, index);
  }, [stages]);

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
    scene.background = new THREE.Color(0x07111f);
    scene.fog = new THREE.Fog(0x07111f, 7, 18);
    const camera = new THREE.PerspectiveCamera(66, mount.clientWidth / mount.clientHeight, 0.05, 50);
    const guidedCamera = createGuidedCamera(camera, renderer.domElement);
    guidedCamera.focusOn(
      { position: new THREE.Vector3(0, 2.15, 4.8), target: new THREE.Vector3(0, 1, 0) },
      { animate: false },
    );
    scene.add(new THREE.HemisphereLight(0xf8fafc, 0x111827, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(4, 6, 4);
    scene.add(key);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: 0x101827, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.18, 3), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 }));
    bench.position.y = 0.32;
    scene.add(bench);

    const title = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.74), new THREE.MeshBasicMaterial({ map: makeLabelTexture(simulation.title, colorString), transparent: true }));
    title.position.set(0, 2.28, -1.35);
    scene.add(title);
    const physicsWorld = createPhysicsWorld({
      bounds: { min: { x: -1.55, y: 0.42, z: -1.55 }, max: { x: 1.55, y: 1.95, z: 1.55 } },
      restitution: 0.82,
      drag: 0.16,
    });
    physicsWorldRef.current = physicsWorld;
    const movingObjects = addArchetypeScene(scene, simulation, physicsWorld, color);
    const stageButtons = addStageButtons(scene, stages, colorString);

    const ctrl0 = renderer.xr.getController(0);
    const ctrl1 = renderer.xr.getController(1);
    ctrl0.add(makeControllerRay());
    ctrl1.add(makeControllerRay());
    scene.add(ctrl0, ctrl1);

    // ── Selection: one shared raycasting/highlight system for mouse + XR ─
    const interactionSystem = createInteractionSystem({
      camera,
      domElement: renderer.domElement,
      xrControllers: [ctrl0, ctrl1],
      onSelect: (id, object) => {
        const nextIndex = Number(id.replace('catalog-stage-button-', ''));
        if (Number.isInteger(nextIndex)) {
          stageRef.current = nextIndex;
          setStageIndex(nextIndex);
          narrateStage(nextIndex);
        }
        interactionSystem.setSelected(id);
        guidedCamera.focusOn(computeFocusFrame(object, camera, { fitPadding: 3 }));
      },
    });
    for (const button of stageButtons) {
      interactionSystem.register(button.name, button, { highlightColor: colorString });
    }

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.033);
      const elapsed = clock.elapsedTime;
      if (!renderer.xr.isPresenting) guidedCamera.update(dt);
      physicsWorld.bodies().forEach(body => {
        physicsWorld.applyForce(body.id, {
          x: Math.sin(elapsed * 1.2 + body.position.y * 7) * 0.8,
          y: Math.cos(elapsed * 1.4 + body.position.x * 5) * 0.35,
          z: Math.sin(elapsed * 1.1 + body.position.z * 6) * 0.8,
        });
      });
      physicsWorld.step(dt);
      const bodies = new Map(physicsWorld.bodies().map(body => [body.id, body.position]));
      movingObjects.forEach((object, index) => {
        if (object.name.startsWith('catalog-particle')) {
          const position = bodies.get(object.name);
          if (position) object.position.set(position.x, position.y, position.z);
        } else {
          object.rotation.y += 0.002 + index * 0.0002;
        }
      });
      title.lookAt(camera.position);
      stageButtons.forEach(button => button.lookAt(camera.position));
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
      interactionSystem.dispose();
      guidedCamera.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      physicsWorldRef.current = null;
      stopSimulationNarration();
    };
  }, [color, colorString, narrateStage, simulation, stages]);

  const setStage = (index: number) => {
    stageRef.current = index;
    setStageIndex(index);
    narrateStage(index);
  };

  const startExperience = () => {
    setStarted(true);
    narrateStage(stageRef.current);
  };

  const enterVR = async () => {
    setStarted(true);
    narrateStage(stageRef.current);
    const renderer = rendererRef.current;
    if (!renderer || !navigator.xr) return;
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
    await renderer.xr.setSession(session);
  };

  const stage = stages[stageIndex];

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#07111f' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {!started && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(circle at 50% 24%, rgba(30,41,59,0.94), rgba(7,17,31,0.98) 68%)', zIndex: 10 }}>
          <div style={{ maxWidth: 720, textAlign: 'center', color: '#f8fafc' }}>
            <div style={{ color: colorString, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Class {simulation.classLevel} · {simulation.subject}</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 4rem)', lineHeight: 1.02 }}>{simulation.title}</h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.65, margin: '20px auto 28px' }}>{simulation.implementationNotes}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={startExperience} style={buttonStyle(colorString, '#06121d')}>View in Browser</button>
              <button onClick={enterVR} disabled={!vrSupported} style={buttonStyle(vrSupported ? '#facc15' : '#475569', '#111827')}>{vrSupported ? 'Enter VR' : 'VR unavailable'}</button>
            </div>
          </div>
        </div>
      )}
      {started && (
        <section style={panelStyle}>
          <div style={{ color: colorString, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{simulation.primaryArchetype} · {simulation.expectedDurationMinutes} min</div>
          <h2 style={{ margin: '6px 0 8px', fontSize: 22 }}>{stage.title}</h2>
          <p style={{ color: '#cbd5e1', lineHeight: 1.45, margin: '0 0 10px' }}>{stage.cue}</p>
          <p style={{ color: '#94a3b8', lineHeight: 1.4, margin: '0 0 14px', fontSize: 13 }}>{stage.action}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {stages.map((item, index) => (
              <button key={item.title} onClick={() => setStage(index)} style={smallButtonStyle(index === stageIndex ? colorString : '#1f2937', index === stageIndex ? '#06121d' : '#f8fafc')}>{item.title}</button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function buttonStyle(background: string, color: string) {
  return {
    border: 0,
    borderRadius: 8,
    padding: '12px 18px',
    background,
    color,
    fontWeight: 900,
    cursor: 'pointer',
  };
}

function smallButtonStyle(background: string, color: string) {
  return {
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 7,
    padding: '9px 10px',
    background,
    color,
    fontWeight: 850,
    cursor: 'pointer',
    minHeight: 38,
  };
}

const panelStyle = {
  position: 'absolute',
  right: 18,
  top: 18,
  width: 'min(420px, calc(100vw - 36px))',
  borderRadius: 8,
  padding: 16,
  background: 'rgba(7, 17, 31, 0.9)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#f8fafc',
  backdropFilter: 'blur(12px)',
} as const;
