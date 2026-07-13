'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import type { LessonSnapshot } from '../../../../packages/simulation-runtime/src/index';
import { ClassroomSync } from '@/components/robotree/ClassroomSync';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import { createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import {
  createSolubilityExperience,
  SOLUBILITY_EXPERIENCE_DEFINITION,
} from '@/lib/world-builder/solubilityExperience';
import {
  createSolubilityModel,
  SOLUBILITY_SUBSTANCES,
  type MixtureSnapshot,
  type SubstanceId,
} from '@/lib/world-builder/solubilityModel';
import { createSolubilityScene, type SolubilityScene } from '@/lib/world-builder/solubilityScene';
import {
  createWebSimulationRuntime,
  type WebSimulationRuntime,
  type WebSimulationUpdates,
} from '@/lib/world-builder/webSimulationRuntime';

type OutcomeId = 'dissolves' | 'settles' | 'clouds' | 'separates';

const OUTCOMES: readonly { id: OutcomeId; label: string; evidence: string }[] = [
  { id: 'dissolves', label: 'Clear solution', evidence: 'Uniform and clear; dissolved matter does not settle.' },
  { id: 'settles', label: 'Sediment', evidence: 'Visible solid collects at the bottom.' },
  { id: 'clouds', label: 'Suspension', evidence: 'Cloudy particles remain suspended, then settle slowly.' },
  { id: 'separates', label: 'Separate layer', evidence: 'A second liquid phase forms above the water.' },
];

const EXPECTED_OUTCOME: Record<SubstanceId, OutcomeId> = {
  salt: 'dissolves', sugar: 'dissolves', sand: 'settles', chalk: 'clouds', oil: 'separates',
};

const NARRATIONS = SOLUBILITY_EXPERIENCE_DEFINITION.stages.map(stage => `${stage.title}. ${stage.cue}`);
const NARRATION_AUDIO_URLS = [
  '/audio/solubility/stage-01.mp3', '/audio/solubility/stage-02.mp3',
  '/audio/solubility/stage-03.mp3', '/audio/solubility/stage-04.mp3',
  '/audio/solubility/stage-04.mp3',
];
const SUBSTANCE_AUDIO_URLS: Record<SubstanceId, string> = {
  salt: '/audio/solubility/substance-salt.mp3', sugar: '/audio/solubility/substance-sugar.mp3',
  sand: '/audio/solubility/substance-sand.mp3', chalk: '/audio/solubility/substance-chalk.mp3',
  oil: '/audio/solubility/substance-oil.mp3',
};
const PREDICTION_AUDIO_URLS: Record<OutcomeId, string> = {
  dissolves: '/audio/solubility/prediction-dissolves.mp3', settles: '/audio/solubility/prediction-settles.mp3',
  clouds: '/audio/solubility/prediction-clouds.mp3', separates: '/audio/solubility/prediction-separates.mp3',
};
const TRIAL_AUDIO_URLS = {
  'salt-dissolves': '/audio/solubility/trial-salt-dissolves.mp3',
  'sugar-dissolves': '/audio/solubility/trial-sugar-dissolves.mp3',
  'sand-settles': '/audio/solubility/trial-sand-settles.mp3',
  'chalk-clouds': '/audio/solubility/trial-chalk-clouds.mp3',
  'oil-separates': '/audio/solubility/trial-oil-separates.mp3',
} as const;

const INITIAL_MODEL = createSolubilityModel();
const INITIAL_MIXTURE = INITIAL_MODEL.snapshot();

function formatMass(value: number) { return `${value.toFixed(value < 10 ? 2 : 1)} g`; }
function formatPhase(value: string) { return value.replaceAll('-', ' '); }

function makeControllerRay() {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.8),
  ]);
  const material = new THREE.LineBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.82 });
  const ray = new THREE.Line(geometry, material);
  ray.userData.dispose = () => { geometry.dispose(); material.dispose(); };
  return ray;
}

export default function SolubilityLabViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneApiRef = useRef<SolubilityScene | null>(null);
  const modelRef = useRef(createSolubilityModel());
  const mixtureRef = useRef<MixtureSnapshot>(INITIAL_MIXTURE);
  const experienceRef = useRef(createSolubilityExperience());
  const lessonRef = useRef<LessonSnapshot>(experienceRef.current.snapshot());
  const predictionRef = useRef<OutcomeId>('dissolves');
  const molecularRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const [mixture, setMixture] = useState(INITIAL_MIXTURE);
  const [lesson, setLesson] = useState(lessonRef.current);
  const [prediction, setPrediction] = useState<OutcomeId>('dissolves');
  const [molecularLens, setMolecularLens] = useState(false);
  const [evidence, setEvidence] = useState<string[]>([]);

  const substance = SOLUBILITY_SUBSTANCES[mixture.substanceId];
  const currentStage = SOLUBILITY_EXPERIENCE_DEFINITION.stages[lesson.stageIndex];
  const predictionCorrect = prediction === EXPECTED_OUTCOME[mixture.substanceId];
  const massAccounted = mixture.dissolvedMassG + mixture.suspendedMassG + mixture.settledMassG + mixture.separatedMassG;

  const addEvidence = useCallback((message: string) => {
    setEvidence(values => values.includes(message) ? values : [...values, message].slice(-6));
  }, []);

  const syncLesson = useCallback((next: LessonSnapshot) => {
    lessonRef.current = next;
    setLesson(next);
  }, []);

  const completeCurrentStage = useCallback((actionId: string, evidenceId: string, message: string) => {
    const before = lessonRef.current;
    const stage = SOLUBILITY_EXPERIENCE_DEFINITION.stages[before.stageIndex];
    if (!stage.requiredActionIds.includes(actionId) || before.performedActionIds.includes(actionId)) return;
    try {
      let next = experienceRef.current.perform(actionId);
      next = experienceRef.current.observe(evidenceId);
      addEvidence(message);
      if (next.stageComplete && !next.lessonComplete) {
        next = experienceRef.current.next();
        void playSimulationNarration(NARRATIONS[next.stageIndex], next.stageIndex, NARRATION_AUDIO_URLS[next.stageIndex]);
      }
      syncLesson(next);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [addEvidence, syncLesson]);

  const chooseSubstance = useCallback((id: SubstanceId) => {
    const next = modelRef.current.selectSubstance(id);
    mixtureRef.current = next;
    setMixture(next);
    sceneApiRef.current?.update(next, 0, molecularRef.current);
    void playSimulationNarration(
      `${SOLUBILITY_SUBSTANCES[id].label} selected. Predict using evidence, then add a measured scoop.`,
      0,
      SUBSTANCE_AUDIO_URLS[id],
    );
  }, []);

  const choosePrediction = useCallback((outcome: OutcomeId) => {
    predictionRef.current = outcome;
    setPrediction(outcome);
    const selected = OUTCOMES.find(item => item.id === outcome)!;
    void playSimulationNarration(`Prediction selected: ${selected.label}.`, OUTCOMES.findIndex(item => item.id === outcome), PREDICTION_AUDIO_URLS[outcome]);
    if (lessonRef.current.stageIndex === 0) {
      completeCurrentStage('record-prediction', 'prediction-recorded', `Predicted ${selected.label.toLowerCase()} before mixing.`);
    } else if (lessonRef.current.stageIndex === 4) {
      const expected = EXPECTED_OUTCOME[mixtureRef.current.substanceId];
      completeCurrentStage(
        'classify-unknown', 'unknown-classified',
        outcome === expected ? 'Transfer classification matched the evidence.' : 'Transfer classification recorded; compare it with the evidence.',
      );
    }
  }, [completeCurrentStage]);

  const addScoop = useCallback(() => {
    try {
      const next = modelRef.current.addSolute(5);
      mixtureRef.current = next;
      setMixture(next);
      completeCurrentStage('add-scoop', 'mass-accounted', 'Added 5.00 g; the mass balance accounts for all material.');
      const id = next.substanceId;
      const expected = EXPECTED_OUTCOME[id];
      const trialKey = `${id}-${expected}` as keyof typeof TRIAL_AUDIO_URLS;
      void playSimulationNarration(
        `${SOLUBILITY_SUBSTANCES[id].label} added. Watch dissolved, suspended, settled, and separated mass—not just appearance.`,
        1,
        TRIAL_AUDIO_URLS[trialKey],
      );
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [completeCurrentStage]);

  const toggleStirring = useCallback(() => {
    const next = modelRef.current.setStirring(!mixtureRef.current.stirring);
    mixtureRef.current = next;
    setMixture(next);
    completeCurrentStage(
      'investigate-rate', 'rate-compared',
      'Stirring changes the rate of mixing, not the equilibrium saturation capacity.',
    );
  }, [completeCurrentStage]);

  const changeTemperature = useCallback((temperatureC: number) => {
    const next = modelRef.current.setTemperature(temperatureC);
    mixtureRef.current = next;
    setMixture(next);
    completeCurrentStage('investigate-rate', 'rate-compared', 'Compared temperature while keeping water mass and scoop size fixed.');
  }, [completeCurrentStage]);

  const toggleMolecularLens = useCallback(() => {
    const next = !molecularRef.current;
    molecularRef.current = next;
    setMolecularLens(next);
    sceneApiRef.current?.setMolecularLens(next);
    if (next) {
      completeCurrentStage(
        'open-molecular-lens', 'misconception-resolved',
        'Dissolved matter is still present as dispersed ions or molecules; it did not disappear.',
      );
    }
  }, [completeCurrentStage]);

  const resetMixture = useCallback(() => {
    const next = modelRef.current.reset();
    mixtureRef.current = next;
    setMixture(next);
    molecularRef.current = false;
    setMolecularLens(false);
  }, []);

  const restartMission = useCallback(() => {
    const nextLesson = experienceRef.current.restart();
    syncLesson(nextLesson);
    setEvidence([]);
    resetMixture();
  }, [resetMixture, syncLesson]);

  useEffect(() => {
    if ('xr' in navigator) {
      void (navigator as Navigator & { xr: { isSessionSupported(mode: string): Promise<boolean> } })
        .xr.isSessionSupported('immersive-vr').then(setVrSupported).catch(() => setVrSupported(false));
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mountElement = mount;
    let cancelled = false;
    let host: WebSimulationRuntime | undefined;
    let fixedUpdate: WebSimulationUpdates['fixedUpdate'];
    let renderUpdate: WebSimulationUpdates['renderUpdate'];
    let reactAccumulator = 0;

    async function initialize() {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#071521');
      scene.fog = new THREE.Fog('#071521', 6.5, 16);
      const camera = new THREE.PerspectiveCamera(54, 1, 0.04, 40);
      camera.position.set(0.2, 2.65, 4.7);
      camera.lookAt(-0.15, 0.95, 0);

      host = createWebSimulationRuntime({
        mount: mountElement, scene, camera,
        updates: {
          fixedUpdate(context) { fixedUpdate?.(context); },
          renderUpdate(context) { renderUpdate?.(context); },
        },
        onProfileChange(profileId) { sceneApiRef.current?.setQualityProfile(profileId); },
      });
      rendererRef.current = host.renderer;
      host.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      host.renderer.toneMappingExposure = 1.05;

      scene.add(new THREE.HemisphereLight('#dff7ff', '#07111b', 1.5));
      const key = new THREE.DirectionalLight('#fff4df', 2.2);
      key.position.set(3.4, 5.2, 3.1);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      scene.add(key);
      const rim = new THREE.PointLight('#38bdf8', 1.25, 8);
      rim.position.set(-2.2, 2.2, 1.2);
      scene.add(rim);
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(6, 64),
        new THREE.MeshStandardMaterial({ color: '#0c1c28', roughness: 0.94 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.24;
      floor.receiveShadow = true;
      scene.add(floor);
      host.resources.register('solubility-floor', () => { floor.geometry.dispose(); (floor.material as THREE.Material).dispose(); });

      const world = createSolubilityScene({ scene, profileId: host.profile() });
      sceneApiRef.current = world;
      host.resources.register('solubility-scene', () => world.dispose());

      const guidedCamera = createGuidedCamera(camera, host.renderer.domElement, { transitionSeconds: 0.7 });
      guidedCamera.focusOn({ position: new THREE.Vector3(0.2, 2.65, 4.7), target: new THREE.Vector3(-0.15, 0.95, 0) }, { animate: false });
      host.resources.register('solubility-camera', () => guidedCamera.dispose());

      const controller0 = host.renderer.xr.getController(0);
      const controller1 = host.renderer.xr.getController(1);
      const controllers = [controller0, controller1];
      for (const controller of controllers) {
        const ray = makeControllerRay();
        controller.add(ray);
        scene.add(controller);
      }
      host.resources.register('solubility-controller-rays', () => {
        for (const controller of controllers) {
          controller.traverse(object => { if (object.userData.dispose) object.userData.dispose(); });
          scene.remove(controller);
        }
      });

      const interactionSystem = createInteractionSystem({
        camera, domElement: host.renderer.domElement, xrControllers: controllers,
        onSelect: (id, object) => {
          if (id.startsWith('substance-button-')) chooseSubstance(id.replace('substance-button-', '') as SubstanceId);
          if (id.startsWith('prediction-button-')) choosePrediction(id.replace('prediction-button-', '') as OutcomeId);
          if (id === 'action-button-run') addScoop();
          if (id === 'action-button-stir') toggleStirring();
          if (id === 'action-button-lens') toggleMolecularLens();
          if (id === 'action-button-reset') resetMixture();
          interactionSystem.setSelected(id);
          guidedCamera.focusOn({
            position: new THREE.Vector3(0.15, 2.4, 4.1),
            target: object.getWorldPosition(new THREE.Vector3()),
          });
        },
      });
      for (const object of world.interactives) interactionSystem.register(object.name, object, { highlightColor: '#67e8f9' });
      host.resources.register('solubility-interactions', () => interactionSystem.dispose());

      fixedUpdate = context => {
        try {
          const next = modelRef.current.step(context.deltaSeconds);
          mixtureRef.current = next;
          reactAccumulator += context.deltaSeconds;
          if (reactAccumulator >= 0.12) {
            reactAccumulator = 0;
            setMixture({ ...next });
          }
        } catch (error) {
          setRuntimeError(error instanceof Error ? error.message : String(error));
        }
      };
      renderUpdate = context => {
        if (!host!.renderer.xr.isPresenting) guidedCamera.update(context.frameDeltaSeconds);
        world.update(mixtureRef.current, context.elapsedSeconds, molecularRef.current);
      };
      world.update(mixtureRef.current, 0, false);
      await host.initialize();
      if (cancelled) await host.dispose();
    }

    void initialize().catch(error => setRuntimeError(error instanceof Error ? error.message : String(error)));
    return () => {
      cancelled = true;
      sceneApiRef.current = null;
      rendererRef.current = null;
      stopSimulationNarration();
      if (host) void host.dispose();
    };
  }, [addScoop, choosePrediction, chooseSubstance, resetMixture, toggleMolecularLens, toggleStirring]);

  const startBrowser = useCallback(() => {
    setStarted(true);
    const index = lessonRef.current.stageIndex;
    void playSimulationNarration(NARRATIONS[index], index, NARRATION_AUDIO_URLS[index]);
  }, []);

  const enterVr = useCallback(async () => {
    if (!rendererRef.current || !('xr' in navigator)) return;
    try {
      const session = await (navigator as Navigator & {
        xr: { requestSession(mode: string, options: XRSessionInit): Promise<XRSession> };
      }).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'], optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      const index = lessonRef.current.stageIndex;
      void playSimulationNarration(NARRATIONS[index], index, NARRATION_AUDIO_URLS[index]);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'The headset could not start immersive mode.');
    }
  }, []);

  const measurements = useMemo(() => [
    ['Added mass', formatMass(mixture.addedMassG)],
    ['Dissolved mass', formatMass(mixture.dissolvedMassG)],
    ['Suspended', formatMass(mixture.suspendedMassG)],
    ['Settled', formatMass(mixture.settledMassG)],
    ['Separated', formatMass(mixture.separatedMassG)],
    ['Turbidity', `${mixture.turbidityPercent.toFixed(0)}%`],
    ['Saturation', mixture.saturationState === 'not-applicable' ? 'N/A' : `${mixture.saturationPercent.toFixed(0)}%`],
    ['Mass balance', `${massAccounted.toFixed(2)} / ${mixture.addedMassG.toFixed(2)} g`],
  ], [massAccounted, mixture]);

  return (
    <main style={rootStyle}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <ClassroomSync stageIndex={lesson.stageIndex} stageCount={lesson.stageCount} completed={lesson.lessonComplete} started={started} />

      {!started && (
        <section style={launchStyle}>
          <div style={launchCardStyle}>
            <span style={eyebrowStyle}>Class 5 EVS · Quantitative XR investigation</span>
            <h1 style={{ fontSize: 'clamp(2.25rem, 5vw, 4.5rem)', lineHeight: 0.98, margin: '12px 0 18px' }}>Solubility Physics Lab</h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.65, fontSize: '1.08rem', maxWidth: 680, margin: '0 auto 24px' }}>
              Predict, add measured mass, control stirring and temperature, inspect saturation, and reveal what “disappearing” matter is really doing.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={startBrowser} style={primaryButton}>Start browser lab</button>
              <button type="button" onClick={enterVr} disabled={!vrSupported} style={{ ...secondaryButton, opacity: vrSupported ? 1 : 0.5 }}>
                {vrSupported ? 'Enter VR' : 'VR unavailable here'}
              </button>
            </div>
            <p style={{ color: '#93a7b8', fontSize: 12, marginTop: 20 }}>Safe virtual materials · 200 g water · fixed 1/60 s solver · no locomotion required</p>
          </div>
        </section>
      )}

      {started && !runtimeError && (
        <section style={panelStyle} aria-label="Solubility laboratory controls">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
            <div>
              <span style={eyebrowStyle}>Mission {lesson.stageIndex + 1} of {lesson.stageCount}</span>
              <h2 style={{ margin: '5px 0 5px', fontSize: 22 }}>{currentStage.title}</h2>
            </div>
            <span style={phaseChip}>{formatPhase(mixture.phaseState)}</span>
          </div>
          <p style={{ color: '#cbd5e1', lineHeight: 1.45, margin: '0 0 13px' }}>{currentStage.cue}</p>

          <div style={sectionStyle}>
            <label style={labelStyle}>1 · Choose material</label>
            <div style={fiveGridStyle}>
              {(Object.keys(SOLUBILITY_SUBSTANCES) as SubstanceId[]).map(id => (
                <button type="button" key={id} onClick={() => chooseSubstance(id)} style={chipStyle(id === mixture.substanceId, '#f4c95d')}>
                  {SOLUBILITY_SUBSTANCES[id].label.replace('Table ', '')}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 9, fontSize: 12, color: '#a9c0cf' }}>{substance.formula} · density {substance.densityGPerMl} g/mL</div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>2 · Predict from evidence</label>
            <div style={twoGridStyle}>
              {OUTCOMES.map(item => (
                <button type="button" key={item.id} title={item.evidence} onClick={() => choosePrediction(item.id)} style={chipStyle(item.id === prediction, '#67e8f9')}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={addScoop} style={{ ...primaryButton, flex: 1 }}>Add 5 g scoop</button>
              <button type="button" onClick={toggleStirring} style={{ ...secondaryButton, flex: 1, borderColor: mixture.stirring ? '#a78bfa' : '#40556a', color: mixture.stirring ? '#ddd6fe' : '#dce7ef' }}>
                {mixture.stirring ? 'Stop stirring' : 'Start stirring'}
              </button>
              <button type="button" onClick={resetMixture} style={iconButton} aria-label="Reset beaker">↻</button>
            </div>
            <label style={{ ...labelStyle, marginTop: 12 }}>Temperature · {mixture.temperatureC.toFixed(0)} °C</label>
            <input aria-label="Water temperature" type="range" min="10" max="60" step="5" value={mixture.temperatureC} onChange={event => changeTemperature(Number(event.target.value))} style={{ width: '100%', accentColor: '#fb923c' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7890a1', fontSize: 11 }}><span>10 °C</span><span>60 °C</span></div>
          </div>

          <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <label style={labelStyle}>Live evidence</label>
              <button type="button" onClick={toggleMolecularLens} style={chipStyle(molecularLens, '#fb923c')}>Molecular lens {molecularLens ? 'on' : 'off'}</button>
            </div>
            <div style={measurementGridStyle}>
              {measurements.map(([label, value]) => <div key={label} style={meterStyle}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
            <p style={{ margin: '9px 0 0', color: molecularLens ? '#fed7aa' : '#8fa8b8', fontSize: 11.5, lineHeight: 1.4 }}>
              Molecular lens is representational, not to scale. One visible particle stands for an enormous population of ions, molecules, grains, or droplets.
            </p>
          </div>

          <div style={{ ...sectionStyle, borderColor: predictionCorrect && mixture.addedMassG > 0 ? 'rgba(74,222,128,.35)' : 'rgba(255,255,255,.1)' }}>
            <strong style={{ color: '#f8fafc' }}>{substance.explanation}</strong>
            <p style={{ margin: '7px 0 0', color: '#b9cbd7', fontSize: 12.5, lineHeight: 1.45 }}>
              Stirring changes the rate; it does not change the equilibrium saturation capacity. Matter is conserved: dissolved does not mean gone.
            </p>
          </div>

          {evidence.length > 0 && <div style={{ color: '#93f0bb', fontSize: 12, lineHeight: 1.45 }}>Latest evidence: {evidence.at(-1)}</div>}
          {lesson.lessonComplete && (
            <div style={completionStyle}>
              <strong>Investigation complete</strong>
              <span>You classified using mass, clarity, settling, and phase evidence—not appearance alone.</span>
              <button type="button" onClick={restartMission} style={secondaryButton}>Run a new investigation</button>
            </div>
          )}
        </section>
      )}

      {runtimeError && <section style={errorStyle} role="alert"><strong>Experience paused</strong><span>{runtimeError}</span></section>}
    </main>
  );
}

const rootStyle: CSSProperties = { position: 'fixed', inset: 0, overflow: 'hidden', background: '#071521', color: '#f8fafc', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' };
const launchStyle: CSSProperties = { position: 'absolute', inset: 0, zIndex: 15, display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(circle at 42% 18%, rgba(19,76,100,.91), rgba(4,15,24,.97) 68%)' };
const launchCardStyle: CSSProperties = { maxWidth: 820, textAlign: 'center', padding: 'clamp(22px, 5vw, 54px)', border: '1px solid rgba(125,211,252,.25)', borderRadius: 24, background: 'rgba(6,23,35,.66)', backdropFilter: 'blur(18px)', boxShadow: '0 28px 90px rgba(0,0,0,.38)' };
const panelStyle: CSSProperties = { position: 'absolute', zIndex: 10, top: 16, right: 16, width: 'min(470px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: 17, borderRadius: 18, background: 'rgba(5,18,29,.9)', border: '1px solid rgba(148,211,230,.2)', boxShadow: '0 18px 60px rgba(0,0,0,.36)', backdropFilter: 'blur(16px)' };
const eyebrowStyle: CSSProperties = { color: '#67e8f9', fontSize: 11, fontWeight: 850, textTransform: 'uppercase', letterSpacing: 1.35 };
const phaseChip: CSSProperties = { padding: '6px 9px', borderRadius: 999, background: 'rgba(56,189,248,.12)', border: '1px solid rgba(103,232,249,.26)', color: '#a5f3fc', fontSize: 11, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' };
const sectionStyle: CSSProperties = { border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 11, marginBottom: 10, background: 'rgba(0,0,0,.16)' };
const labelStyle: CSSProperties = { display: 'block', color: '#8fdcf0', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .75, marginBottom: 7 };
const fiveGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 5 };
const twoGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 };
const measurementGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginTop: 9 };
const meterStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 8px', borderRadius: 7, background: 'rgba(22,52,70,.62)', fontSize: 11.5, color: '#b6c8d4' };
const primaryButton: CSSProperties = { border: 0, borderRadius: 9, minHeight: 39, padding: '9px 13px', background: 'linear-gradient(135deg, #67e8f9, #38bdf8)', color: '#06202c', fontWeight: 850, cursor: 'pointer' };
const secondaryButton: CSSProperties = { border: '1px solid #40556a', borderRadius: 9, minHeight: 39, padding: '9px 13px', background: '#162737', color: '#e7f1f7', fontWeight: 800, cursor: 'pointer' };
const iconButton: CSSProperties = { ...secondaryButton, width: 42, padding: 0, fontSize: 22 };
const chipStyle = (active: boolean, accent: string): CSSProperties => ({ border: `1px solid ${active ? accent : 'rgba(255,255,255,.12)'}`, borderRadius: 7, minHeight: 34, padding: '6px 7px', background: active ? `${accent}28` : '#142535', color: active ? '#f8fafc' : '#c1d0da', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' });
const completionStyle: CSSProperties = { display: 'grid', gap: 8, padding: 12, borderRadius: 10, marginTop: 10, background: 'rgba(22,101,52,.28)', border: '1px solid rgba(74,222,128,.35)', color: '#bbf7d0', fontSize: 12.5 };
const errorStyle: CSSProperties = { position: 'absolute', zIndex: 20, inset: 'auto 20px 20px 20px', display: 'flex', gap: 12, padding: 16, borderRadius: 12, background: '#4c1017', border: '1px solid #fb7185' };
