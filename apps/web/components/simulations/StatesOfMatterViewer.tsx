'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createParticleCloud, createPhysicsWorld, type RuntimePhysicsWorld } from '@/lib/runtimePhysics';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import { computeFocusFrame, createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import {
  createAssessmentSession,
  type AssessmentAnswerResult,
} from '../../../../packages/simulation-runtime/src/world/assessment';
import { createScientificModelRegistry } from '../../../../packages/simulation-runtime/src/world/scientificModels';
import { evaluateMatterState } from '../../../../packages/simulation-runtime/src/models/matterStateModel';
import { matterAgitationForce } from '@/lib/world-builder/matterParticleForces';
import { createEnvironment } from '@/lib/world-builder/environmentFactory';
import { createMaterialFactory } from '@/lib/world-builder/materialFactory';
import { STATES_WORLD } from '@/lib/world-builder/statesWorld';
import {
  createWebSimulationRuntime,
  type WebSimulationRuntime,
  type WebSimulationUpdates,
} from '@/lib/world-builder/webSimulationRuntime';

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
const ASSESSMENT_STAGE_REQUIREMENTS = [1, 2, 3] as const;
const ASSESSMENT_SEQUENCE = STATES_WORLD.assessments[0];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function stateFromHeat(heat: number) {
  const phase = evaluateMatterState(heat).phase;
  return STAGES.find(stage => stage.key === phase) ?? STAGES[0];
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
  const particlesRef = useRef<THREE.Mesh[]>([]);
  const physicsWorldRef = useRef<RuntimePhysicsWorld | null>(null);
  const cueCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cueTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const heatRef = useRef<number>(STAGES[0].heat);
  const stageRef = useRef(0);
  const assessmentRef = useRef(createAssessmentSession(STATES_WORLD.assessments[0]));

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [heat, setHeat] = useState<number>(STAGES[0].heat);
  const [runtimeError, setRuntimeError] = useState('');
  const [assessmentPromptIndex, setAssessmentPromptIndex] = useState(0);
  const [assessmentResult, setAssessmentResult] =
    useState<AssessmentAnswerResult | null>(null);
  const [mastered, setMastered] = useState(false);

  const stage = STAGES[stageIndex];
  const observedState = useMemo(() => (stage.key === 'phase-change' ? stateFromHeat(heat) : stage), [heat, stage]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) setVrSupported(true);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const hostMount = mount;
    let cancelled = false;
    let host: WebSimulationRuntime | undefined;
    let fixedUpdate: WebSimulationUpdates['fixedUpdate'];
    let renderUpdate: WebSimulationUpdates['renderUpdate'];

    async function start() {
    setRuntimeError('');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 50);

    host = createWebSimulationRuntime({
      mount: hostMount,
      scene,
      camera,
      updates: {
        fixedUpdate: context => fixedUpdate?.(context),
        renderUpdate: context => renderUpdate?.(context),
      },
    });
    const renderer = host.renderer;
    rendererRef.current = renderer;

    const guidedCamera = createGuidedCamera(camera, renderer.domElement);
    guidedCamera.focusOn(
      { position: new THREE.Vector3(0, 1.65, 4.4), target: new THREE.Vector3(0, 1.2, 0) },
      { animate: false },
    );

    const factory = createMaterialFactory({
      assets: STATES_WORLD.assetManifests[0],
      materials: STATES_WORLD.materials,
      qualityProfileId: 'questBaseline',
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    });
    const definition = (id: string) => {
      const value = STATES_WORLD.materials.find(material => material.id === id);
      if (!value) throw new Error(`Missing States material ${id}`);
      return value;
    };
    const [floorMaterial, chamberMaterial, heaterMaterial, particleMaterial] =
      await Promise.all(['lab-floor', 'chamber-shell', 'heater', 'particle-marker']
        .map(id => factory.create(definition(id))));
    if (cancelled) {
      factory.dispose();
      await host.dispose();
      return;
    }
    host.resources.register('states-materials', () => factory.dispose());
    const environment = await createEnvironment({
      renderer,
      scene,
      definition: STATES_WORLD.environments[0],
      assets: STATES_WORLD.assetManifests[0],
    });
    if (cancelled) {
      await host.dispose();
      return;
    }
    host.resources.register('states-environment', () => environment.dispose());

    const models = createScientificModelRegistry();
    models.register({
      manifest: STATES_WORLD.scientificModels[0],
      evaluate: input => evaluateMatterState(Number(input.heat)),
    });
    const modelFailures = models.verify('matter-state-from-heat');
    if (modelFailures.length) throw new Error(modelFailures.join('; '));
    host.resources.register('states-scientific-model', () => models.dispose());

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 64),
      floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const chamber = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 2.2, 3.1),
      chamberMaterial,
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
      heaterMaterial,
    );
    heater.position.set(0, 0.1, 0);
    scene.add(heater);

    const particleGeometry = new THREE.SphereGeometry(0.075, 16, 16);
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

    // ── Selection: one shared raycasting/highlight system for mouse + XR ─
    const interactionSystem = createInteractionSystem({
      camera,
      domElement: renderer.domElement,
      xrControllers: [controller0, controller1],
      onSelect: (id, object) => {
        if (id.startsWith('stage-button-')) {
          const nextIndex = Number(id.replace('stage-button-', ''));
          if (Number.isInteger(nextIndex)) applyStage(nextIndex);
        }
        interactionSystem.setSelected(id);
        guidedCamera.focusOn(computeFocusFrame(object, camera, { fitPadding: 3.4 }));
      },
    });
    for (const button of stageButtons) {
      interactionSystem.register(button.name, button, { highlightColor: '#38bdf8' });
    }

    fixedUpdate = ({ deltaSeconds, elapsedSeconds }) => {
      const activeStage = STAGES[stageRef.current];
      const activeHeat = heatRef.current;
      const visualState = activeStage.key === 'phase-change' ? stateFromHeat(activeHeat) : activeStage;
      const physicsWorld = physicsWorldRef.current;
      if (visualState.key === 'solid' || !physicsWorld) return;

      // spacingFactor (solid 0.12, liquid 0.5, gas 1.0) is the whole point of
      // this lesson — drive the visual with it so a liquid clusters and a gas
      // fills the chamber, instead of both just filling the box identically.
      const { spacingFactor } = evaluateMatterState(clamp(activeHeat, 0, 1));
      const bodies = physicsWorld.bodies();
      bodies.forEach((body, i) => {
        physicsWorld.applyForce(
          body.id,
          matterAgitationForce(i, elapsedSeconds, activeHeat, spacingFactor, body.position),
        );
      });
      physicsWorld.step(deltaSeconds);
    };

    renderUpdate = ({ elapsedSeconds, interpolationAlpha, frameDeltaSeconds, renderer }) => {
      if (!renderer.xr.isPresenting) guidedCamera.update(frameDeltaSeconds);
      const activeStage = STAGES[stageRef.current];
      const activeHeat = heatRef.current;
      const visualState = activeStage.key === 'phase-change' ? stateFromHeat(activeHeat) : activeStage;
      const elapsed = elapsedSeconds + interpolationAlpha / 60;
      const bodyPositions = new Map(
        physicsWorldRef.current?.bodies().map(body => [body.id, body.position]) ?? [],
      );
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
          const position = bodyPositions.get(`matter-particle-${i}`);
          if (position) particle.position.lerp(new THREE.Vector3(position.x, position.y, position.z), 0.75);
        }
      });
      if (cueCanvasRef.current && cueTextureRef.current) {
        drawCueCard(cueCanvasRef.current, visualState, activeHeat);
        cueTextureRef.current.needsUpdate = true;
      }

      heater.scale.setScalar(0.85 + activeHeat * 0.22);
      const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
      cueMesh.lookAt(activeCamera.position);
      stageButtons.forEach(button => button.lookAt(activeCamera.position));
    };

    host.resources.register('states-camera', () => guidedCamera.dispose());
    host.resources.register('states-interaction', () => interactionSystem.dispose());
    host.resources.register('states-scene', () => {
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      });
      scene.clear();
      physicsWorldRef.current = null;
    });
    await host.initialize();
    }

    void start().catch(error => {
      if (!cancelled) {
        setRuntimeError(error instanceof Error ? error.message : String(error));
      }
      void host?.dispose();
    });

    return () => {
      cancelled = true;
      stopSimulationNarration();
      void host?.dispose();
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

  const answerAssessment = useCallback((evidenceId: string) => {
    const prompt = ASSESSMENT_SEQUENCE.prompts[assessmentPromptIndex];
    const result = assessmentRef.current.answer(prompt.id, evidenceId);
    setAssessmentResult(result);
    setMastered(assessmentRef.current.mastery().mastered);
  }, [assessmentPromptIndex]);

  const continueAssessment = useCallback(() => {
    setAssessmentPromptIndex(index => Math.min(
      index + 1,
      ASSESSMENT_SEQUENCE.prompts.length - 1,
    ));
    setAssessmentResult(null);
  }, []);

  const assessmentPrompt = ASSESSMENT_SEQUENCE.prompts[assessmentPromptIndex];
  const assessmentReady = stageIndex >= (
    ASSESSMENT_STAGE_REQUIREMENTS[assessmentPromptIndex] ?? STAGES.length
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#08111f' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {runtimeError && (
        <div role="alert" style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'grid', placeContent: 'center', padding: 24, background: 'rgba(2,6,23,0.96)', color: '#fecaca', textAlign: 'center' }}>
          <strong>States of Matter world could not start.</strong>
          <span style={{ marginTop: 8 }}>{runtimeError}</span>
        </div>
      )}

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
          {assessmentReady && (
            <aside aria-label="Matter evidence check" style={{ position: 'absolute', left: 18, top: 86, zIndex: 5, width: 320, padding: 16, borderRadius: 12, background: 'rgba(2,6,23,0.92)', border: '1px solid rgba(56,189,248,0.28)', color: '#e5e7eb' }}>
              {mastered ? (
                <>
                  <strong style={{ color: '#86efac' }}>Concept mastered</strong>
                  <p style={{ color: '#d1fae5', fontSize: 13, lineHeight: 1.5 }}>
                    You connected particle spacing and motion to state changes and cooling.
                  </p>
                </>
              ) : (
                <>
                  <div style={{ color: '#38bdf8', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>{assessmentPrompt.kind} evidence</div>
                  <p style={{ fontSize: 14 }}>{assessmentPrompt.question}</p>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {assessmentPrompt.options?.map(option => (
                      <button key={option.id} disabled={assessmentResult?.correct} onClick={() => answerAssessment(option.id)} style={{ padding: 8, borderRadius: 7, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.06)', color: '#f8fafc', textAlign: 'left' }}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {assessmentResult && (
                    <div style={{ marginTop: 9, color: assessmentResult.correct ? '#86efac' : '#fde68a', fontSize: 12 }}>
                      {assessmentResult.correct ? assessmentResult.explanation : assessmentResult.hint}
                      {assessmentResult.correct && assessmentPromptIndex < 2 && (
                        <button onClick={continueAssessment} style={{ display: 'block', marginTop: 8, padding: '7px 10px', border: 0, borderRadius: 6, background: '#2563eb', color: '#fff' }}>Continue</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </aside>
          )}

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
            Drag to look around. Use Phase Change, then adjust heat.
          </div>
        </>
      )}
    </div>
  );
}
