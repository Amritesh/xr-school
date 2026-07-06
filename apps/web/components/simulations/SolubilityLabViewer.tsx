'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import { computeFocusFrame, createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';

const SUBSTANCES = [
  { id: 'salt', label: 'Salt', outcome: 'dissolves', color: 0xe0f2fe, explanation: 'Salt spreads through the water and forms a clear solution.' },
  { id: 'sugar', label: 'Sugar', outcome: 'dissolves', color: 0xfef9c3, explanation: 'Sugar dissolves when its particles spread evenly through water.' },
  { id: 'sand', label: 'Sand', outcome: 'settles', color: 0xd6a15f, explanation: 'Sand is insoluble and settles at the bottom of the beaker.' },
  { id: 'chalk', label: 'Chalk', outcome: 'clouds', color: 0xf8fafc, explanation: 'Chalk powder does not truly dissolve; it makes the water cloudy and some particles settle.' },
  { id: 'oil', label: 'Oil', outcome: 'separates', color: 0xfacc15, explanation: 'Oil is insoluble in water and forms a separate layer.' },
] as const;

const OUTCOMES = [
  { id: 'dissolves', label: 'Dissolves' },
  { id: 'settles', label: 'Settles' },
  { id: 'clouds', label: 'Clouds' },
  { id: 'separates', label: 'Separates' },
] as const;

const STAGES = [
  { title: 'Predict', cue: 'Choose a substance and predict what it will do in water.' },
  { title: 'Observe', cue: 'Run the trial and watch the beaker evidence carefully.' },
  { title: 'Explain', cue: 'Compare prediction with observation and explain the result.' },
  { title: 'Reset', cue: 'Reset the bench and try another fair test.' },
] as const;

const NARRATIONS = STAGES.map(stage => `${stage.title}. ${stage.cue}`);

type SubstanceId = (typeof SUBSTANCES)[number]['id'];
type OutcomeId = (typeof OUTCOMES)[number]['id'];
type Substance = (typeof SUBSTANCES)[number];

const NARRATION_AUDIO_URLS = [
  '/audio/solubility/stage-01.mp3',
  '/audio/solubility/stage-02.mp3',
  '/audio/solubility/stage-03.mp3',
  '/audio/solubility/stage-04.mp3',
];

const SUBSTANCE_AUDIO_URLS: Record<SubstanceId, string> = {
  salt: '/audio/solubility/substance-salt.mp3',
  sugar: '/audio/solubility/substance-sugar.mp3',
  sand: '/audio/solubility/substance-sand.mp3',
  chalk: '/audio/solubility/substance-chalk.mp3',
  oil: '/audio/solubility/substance-oil.mp3',
};

const PREDICTION_AUDIO_URLS: Record<OutcomeId, string> = {
  dissolves: '/audio/solubility/prediction-dissolves.mp3',
  settles: '/audio/solubility/prediction-settles.mp3',
  clouds: '/audio/solubility/prediction-clouds.mp3',
  separates: '/audio/solubility/prediction-separates.mp3',
};

const TRIAL_AUDIO_URLS: Record<`${SubstanceId}-${OutcomeId}`, string> = {
  'salt-dissolves': '/audio/solubility/trial-salt-dissolves.mp3',
  'salt-settles': '/audio/solubility/trial-salt-settles.mp3',
  'salt-clouds': '/audio/solubility/trial-salt-clouds.mp3',
  'salt-separates': '/audio/solubility/trial-salt-separates.mp3',
  'sugar-dissolves': '/audio/solubility/trial-sugar-dissolves.mp3',
  'sugar-settles': '/audio/solubility/trial-sugar-settles.mp3',
  'sugar-clouds': '/audio/solubility/trial-sugar-clouds.mp3',
  'sugar-separates': '/audio/solubility/trial-sugar-separates.mp3',
  'sand-dissolves': '/audio/solubility/trial-sand-dissolves.mp3',
  'sand-settles': '/audio/solubility/trial-sand-settles.mp3',
  'sand-clouds': '/audio/solubility/trial-sand-clouds.mp3',
  'sand-separates': '/audio/solubility/trial-sand-separates.mp3',
  'chalk-dissolves': '/audio/solubility/trial-chalk-dissolves.mp3',
  'chalk-settles': '/audio/solubility/trial-chalk-settles.mp3',
  'chalk-clouds': '/audio/solubility/trial-chalk-clouds.mp3',
  'chalk-separates': '/audio/solubility/trial-chalk-separates.mp3',
  'oil-dissolves': '/audio/solubility/trial-oil-dissolves.mp3',
  'oil-settles': '/audio/solubility/trial-oil-settles.mp3',
  'oil-clouds': '/audio/solubility/trial-oil-clouds.mp3',
  'oil-separates': '/audio/solubility/trial-oil-separates.mp3',
};

function substanceById(id: SubstanceId) {
  return SUBSTANCES.find(substance => substance.id === id) ?? SUBSTANCES[0];
}

function makeLabelTexture(text: string, color = '#38bdf8') {
  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.fillStyle = '#06121d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeControllerRay() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -3)]);
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.82 }));
}

function makeVrButton(label: string, color: string, width = 0.76) {
  const button = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.18, 0.05),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 0.18, roughness: 0.42 })
  );
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.92, 0.16),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture(label, color), transparent: true, depthTest: false })
  );
  labelMesh.position.z = 0.031;
  button.add(labelMesh);
  return button;
}

function trialAudioUrl(substanceId: SubstanceId, prediction: OutcomeId) {
  return TRIAL_AUDIO_URLS[`${substanceId}-${prediction}`];
}

export default function SolubilityLabViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Mesh[]>([]);
  const waterRef = useRef<THREE.Mesh | null>(null);
  const layerRef = useRef<THREE.Mesh | null>(null);
  const vrButtonRefs = useRef<THREE.Mesh[]>([]);
  const activeSubstanceRef = useRef<Substance>(SUBSTANCES[0]);
  const substanceIdRef = useRef<SubstanceId>('salt');
  const predictionRef = useRef<OutcomeId>('dissolves');
  const observedRef = useRef(false);
  const runningRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [substanceId, setSubstanceId] = useState<SubstanceId>('salt');
  const [prediction, setPrediction] = useState<OutcomeId>('dissolves');
  const [observed, setObserved] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [trialCount, setTrialCount] = useState(0);

  const substance = useMemo(() => substanceById(substanceId), [substanceId]);
  const correct = observed && prediction === substance.outcome;

  useEffect(() => {
    activeSubstanceRef.current = substance;
    substanceIdRef.current = substance.id;
  }, [substance]);

  useEffect(() => {
    predictionRef.current = prediction;
  }, [prediction]);

  useEffect(() => {
    observedRef.current = observed;
  }, [observed]);

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
    scene.background = new THREE.Color(0x07131d);
    scene.fog = new THREE.Fog(0x07131d, 7, 18);

    const camera = new THREE.PerspectiveCamera(64, mount.clientWidth / mount.clientHeight, 0.05, 50);
    const guidedCamera = createGuidedCamera(camera, renderer.domElement);
    guidedCamera.focusOn(
      { position: new THREE.Vector3(0, 2.55, 5.2), target: new THREE.Vector3(0, 1, 0) },
      { animate: false },
    );

    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x07131d, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(4, 6, 4);
    key.castShadow = true;
    scene.add(key);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: 0x0f2230, roughness: 0.88 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.25, 3), new THREE.MeshStandardMaterial({ color: 0x243447, roughness: 0.62 }));
    bench.position.y = 0.32;
    bench.receiveShadow = true;
    scene.add(bench);

    const beaker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.7, 1.8, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.2, roughness: 0.1 })
    );
    beaker.position.set(0, 1.18, -0.25);
    scene.add(beaker);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.62, 1.05, 64),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.38, roughness: 0.15 })
    );
    water.position.set(0, 0.9, -0.25);
    scene.add(water);
    waterRef.current = water;

    const oilLayer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.12, 64),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, transparent: true, opacity: 0 })
    );
    oilLayer.position.set(0, 1.48, -0.25);
    scene.add(oilLayer);
    layerRef.current = oilLayer;

    const label = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.8), new THREE.MeshBasicMaterial({ map: makeLabelTexture('Predict -> Observe -> Explain') }));
    label.position.set(0, 2.25, -1.35);
    scene.add(label);

    vrButtonRefs.current = [];
    SUBSTANCES.forEach((substance, index) => {
      const button = makeVrButton(substance.label, '#facc15', 0.66);
      button.name = `substance-button-${substance.id}`;
      button.position.set(-1.6 + index * 0.8, 0.74, 1.45);
      scene.add(button);
      vrButtonRefs.current.push(button);
    });
    OUTCOMES.forEach((outcome, index) => {
      const button = makeVrButton(outcome.label, '#67e8f9', 0.82);
      button.name = `prediction-button-${outcome.id}`;
      button.position.set(-1.25 + index * 0.84, 0.74, 2.05);
      scene.add(button);
      vrButtonRefs.current.push(button);
    });
    const runButton = makeVrButton('Run Trial', '#86efac', 0.95);
    runButton.name = 'action-button-run';
    runButton.position.set(-0.55, 1.08, 1.75);
    scene.add(runButton);
    vrButtonRefs.current.push(runButton);
    const resetButton = makeVrButton('Reset', '#94a3b8', 0.78);
    resetButton.name = 'action-button-reset';
    resetButton.position.set(0.65, 1.08, 1.75);
    scene.add(resetButton);
    vrButtonRefs.current.push(resetButton);

    const particleGeometry = new THREE.SphereGeometry(0.045, 12, 12);
    particlesRef.current = Array.from({ length: 90 }, (_, index) => {
      const particle = new THREE.Mesh(particleGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
      particle.position.set((Math.random() - 0.5) * 1.1, 1.35 + Math.random() * 0.3, -0.25 + (Math.random() - 0.5) * 1.1);
      particle.castShadow = true;
      scene.add(particle);
      return particle;
    });

    const controller0 = renderer.xr.getController(0);
    const controller1 = renderer.xr.getController(1);
    controller0.add(makeControllerRay());
    controller1.add(makeControllerRay());
    scene.add(controller0, controller1);
    const selectSubstanceInScene = (nextId: SubstanceId) => {
      const nextSubstance = substanceById(nextId);
      runningRef.current = false;
      observedRef.current = false;
      activeSubstanceRef.current = nextSubstance;
      substanceIdRef.current = nextId;
      setObserved(false);
      setSubstanceId(nextId);
      setStageIndex(0);
      void playSimulationNarration(`Predict. ${nextSubstance.label} is selected. Choose what you think it will do in water.`, 0, SUBSTANCE_AUDIO_URLS[nextId]);
    };
    const setPredictionInScene = (nextPrediction: OutcomeId) => {
      predictionRef.current = nextPrediction;
      setPrediction(nextPrediction);
      const label = OUTCOMES.find(outcome => outcome.id === nextPrediction)?.label ?? nextPrediction;
      void playSimulationNarration(`Prediction selected: ${label}.`, OUTCOMES.findIndex(outcome => outcome.id === nextPrediction), PREDICTION_AUDIO_URLS[nextPrediction]);
    };
    const runTrialInScene = () => {
      const activeId = substanceIdRef.current;
      const active = substanceById(activeId);
      const currentPrediction = predictionRef.current;
      if (!observedRef.current) {
        setTrialCount(count => count + 1);
        if (currentPrediction === active.outcome) setCorrectCount(count => count + 1);
      }
      runningRef.current = true;
      observedRef.current = true;
      setObserved(true);
      setStageIndex(2);
      void playSimulationNarration(
        `${active.label} in water. Observed result: ${active.outcome}. ${active.explanation} Your prediction ${currentPrediction === active.outcome ? 'matched the evidence.' : 'needs revision.'}`,
        2,
        trialAudioUrl(activeId, currentPrediction)
      );
    };
    // ── Selection: one shared raycasting/highlight system for mouse + XR ─
    const interactionSystem = createInteractionSystem({
      camera,
      domElement: renderer.domElement,
      xrControllers: [controller0, controller1],
      onSelect: (id, object) => {
        if (id.startsWith('substance-button-')) {
          selectSubstanceInScene(id.replace('substance-button-', '') as SubstanceId);
        } else if (id.startsWith('prediction-button-')) {
          setPredictionInScene(id.replace('prediction-button-', '') as OutcomeId);
        } else if (id === 'action-button-run') {
          runTrialInScene();
        } else if (id === 'action-button-reset') {
          selectSubstanceInScene(substanceIdRef.current);
        }
        interactionSystem.setSelected(id);
        guidedCamera.focusOn(computeFocusFrame(object, camera, { fitPadding: 3 }));
      },
    });
    for (const button of vrButtonRefs.current) {
      interactionSystem.register(button.name, button, { highlightColor: '#67e8f9' });
    }

    const clock = new THREE.Clock();
    let elapsedTotal = 0;
    let runStartElapsed = 0;
    let wasRunning = false;
    const waterBase = new THREE.Color(0x38bdf8);
    const soluteTint = new THREE.Color();
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      elapsedTotal += delta;
      const elapsed = elapsedTotal;
      if (!renderer.xr.isPresenting) guidedCamera.update(delta);
      const active = activeSubstanceRef.current;
      const isRunning = runningRef.current;
      if (isRunning && !wasRunning) runStartElapsed = elapsed;
      wasRunning = isRunning;
      // How far the trial has progressed (0 -> 1 over ~3.5s), used to show a
      // soluble substance gradually spreading out and fading into a uniform
      // solution rather than lingering as visible floating particles.
      const dissolveProgress = isRunning ? Math.min(1, (elapsed - runStartElapsed) / 3.5) : 0;

      if (waterRef.current) {
        const material = waterRef.current.material as THREE.MeshStandardMaterial;
        if (active.outcome === 'clouds' && isRunning) {
          material.color.setHex(0xdbeafe);
          material.opacity = 0.55;
        } else if (active.outcome === 'dissolves' && isRunning) {
          // Water takes on a faint even tint as the solute forms a solution.
          soluteTint.setHex(active.color);
          material.color.copy(waterBase).lerp(soluteTint, 0.28 * dissolveProgress);
          material.opacity = 0.38 + 0.06 * dissolveProgress;
        } else {
          material.color.copy(waterBase);
          material.opacity = 0.38;
        }
      }
      if (layerRef.current) {
        const material = layerRef.current.material as THREE.MeshStandardMaterial;
        material.opacity = active.outcome === 'separates' && isRunning ? 0.62 : 0;
      }

      particlesRef.current.forEach((particle, index) => {
        const material = particle.material as THREE.MeshStandardMaterial;
        material.color.setHex(active.color);
        material.opacity = isRunning ? 0.86 : 0;
        if (!isRunning) return;

        const angle = elapsed * (0.6 + index * 0.004) + index;
        if (active.outcome === 'dissolves') {
          // Spread from a tight just-poured cluster to fill the water evenly,
          // and fade out as the particles become an invisible clear solution.
          const spread = 0.28 + 0.72 * dissolveProgress;
          particle.position.x = Math.cos(angle) * (0.08 + (index % 9) * 0.065) * spread;
          particle.position.y = 0.62 + ((index * 0.071 + elapsed * 0.05) % (0.35 + 0.55 * dissolveProgress));
          particle.position.z = -0.25 + Math.sin(angle) * (0.08 + (index % 7) * 0.07) * spread;
          material.opacity = 0.86 * (1 - 0.8 * dissolveProgress);
        } else if (active.outcome === 'settles') {
          particle.position.x = Math.cos(angle) * 0.48;
          particle.position.y = 0.42 + (index % 5) * 0.018;
          particle.position.z = -0.25 + Math.sin(angle) * 0.48;
        } else if (active.outcome === 'clouds') {
          particle.position.x = Math.cos(angle) * 0.52;
          particle.position.y = 0.62 + (index % 13) * 0.052;
          particle.position.z = -0.25 + Math.sin(angle * 1.3) * 0.52;
        } else {
          particle.position.x = Math.cos(angle) * 0.5;
          particle.position.y = 1.42 + Math.sin(angle * 1.7) * 0.035;
          particle.position.z = -0.25 + Math.sin(angle) * 0.5;
        }
      });

      vrButtonRefs.current.forEach(button => button.lookAt(camera.position));
      renderer.render(scene, camera);
    });

    const handleResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.setAnimationLoop(null);
      interactionSystem.dispose();
      guidedCamera.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      particlesRef.current = [];
      vrButtonRefs.current = [];
      stopSimulationNarration();
    };
  }, []);

  function runTrial() {
    if (!observed) {
      setTrialCount(count => count + 1);
      if (prediction === substance.outcome) setCorrectCount(count => count + 1);
    }
    runningRef.current = true;
    setObserved(true);
    setStageIndex(2);
    void playSimulationNarration(
      `${substance.label} in water. Observed result: ${substance.outcome}. ${substance.explanation} Your prediction ${prediction === substance.outcome ? 'matched the evidence.' : 'needs revision.'}`,
      2,
      trialAudioUrl(substance.id, prediction)
    );
  }

  function resetTrial(nextSubstanceId = substanceId) {
    runningRef.current = false;
    observedRef.current = false;
    setObserved(false);
    setSubstanceId(nextSubstanceId as SubstanceId);
    setStageIndex(0);
    const nextSubstance = substanceById(nextSubstanceId as SubstanceId);
    activeSubstanceRef.current = nextSubstance;
    substanceIdRef.current = nextSubstance.id;
    void playSimulationNarration(`Predict. ${nextSubstance.label} is selected. Choose what you think it will do in water.`, 0, SUBSTANCE_AUDIO_URLS[nextSubstance.id]);
  }

  function startExperience() {
    setStarted(true);
    void playSimulationNarration(NARRATIONS[stageIndex], stageIndex, NARRATION_AUDIO_URLS[stageIndex]);
  }

  function setLabStage(index: number) {
    setStageIndex(index);
    void playSimulationNarration(NARRATIONS[index], index, NARRATION_AUDIO_URLS[index]);
  }

  function setLabPrediction(outcomeId: OutcomeId) {
    predictionRef.current = outcomeId;
    setPrediction(outcomeId);
    const label = OUTCOMES.find(outcome => outcome.id === outcomeId)?.label ?? outcomeId;
    void playSimulationNarration(`Prediction selected: ${label}.`, OUTCOMES.findIndex(outcome => outcome.id === outcomeId), PREDICTION_AUDIO_URLS[outcomeId]);
  }

  async function enterVr() {
    setStarted(true);
    void playSimulationNarration(NARRATIONS[stageIndex], stageIndex, NARRATION_AUDIO_URLS[stageIndex]);
    const renderer = rendererRef.current;
    if (!renderer || !navigator.xr) return;
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
    await renderer.xr.setSession(session);
  }

  return (
    <>
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
      {!started && (
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(circle at 50% 20%, rgba(20,64,90,0.94), rgba(7,19,29,0.96) 64%)' }}>
        <div style={{ maxWidth: 680, color: '#f8fafc', textAlign: 'center' }}>
          <div style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#67e8f9', fontWeight: 800, marginBottom: 16 }}>Class 5 EVS</div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', lineHeight: 1, margin: 0 }}>Soluble and Insoluble Substances Lab</h1>
          <p style={{ color: '#cbd5e1', fontSize: '1.08rem', lineHeight: 1.6, margin: '22px auto 30px' }}>Predict, mix, stir, and observe what salt, sugar, sand, chalk, and oil do in water.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={startExperience} style={buttonStyle('#67e8f9', '#06202c')}>View in Browser</button>
            <button onClick={enterVr} disabled={!vrSupported} style={buttonStyle(vrSupported ? '#facc15' : '#4b5563', '#111827')}>{vrSupported ? 'Enter VR' : 'VR unavailable'}</button>
          </div>
        </div>
      </div>
      )}
      {started && (
      <section style={panelStyle}>
        <div style={{ color: '#67e8f9', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Water Experiments</div>
        <h2 style={{ margin: '4px 0 8px', fontSize: 22 }}>{STAGES[stageIndex].title}</h2>
        <p style={{ margin: '0 0 12px', color: '#cbd5e1', lineHeight: 1.45 }}>{STAGES[stageIndex].cue}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginBottom: 12 }}>
          {STAGES.map((stage, index) => (
            <button key={stage.title} onClick={() => setLabStage(index)} style={smallButtonStyle(index === stageIndex ? '#67e8f9' : '#1f2937', index === stageIndex ? '#06202c' : '#f8fafc')}>{stage.title}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6, marginBottom: 12 }}>
          {SUBSTANCES.map(item => (
            <button key={item.id} onClick={() => resetTrial(item.id)} style={smallButtonStyle(item.id === substanceId ? '#facc15' : '#173246', item.id === substanceId ? '#1f1600' : '#f8fafc')}>{item.label}</button>
          ))}
        </div>
        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 12, background: 'rgba(0,0,0,0.18)', marginBottom: 12 }}>
          <strong>{substance.label} in water</strong>
          <p style={{ margin: '6px 0 0', color: '#cbd5e1', lineHeight: 1.4 }}>{observed ? substance.explanation : 'Make a prediction, then run the trial.'}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
          {OUTCOMES.map(outcome => (
            <button key={outcome.id} onClick={() => setLabPrediction(outcome.id)} style={smallButtonStyle(prediction === outcome.id ? '#67e8f9' : '#1f2937', prediction === outcome.id ? '#06202c' : '#f8fafc')}>{outcome.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runTrial} style={{ ...smallButtonStyle('#67e8f9', '#06202c'), flex: 1 }}>Run Trial</button>
          <button onClick={() => resetTrial()} style={{ ...smallButtonStyle('#334155', '#f8fafc'), flex: 1 }}>Reset</button>
        </div>
        <div style={{ marginTop: 12, color: observed ? (correct ? '#86efac' : '#fb923c') : '#94a3b8', fontSize: 13 }}>
          {observed ? `Observed: ${substance.outcome}. Prediction ${correct ? 'matched' : 'needs revision'}.` : 'No observation yet.'}
          <br />
          Score: {correctCount}/{trialCount}
        </div>
      </section>
      )}
    </>
  );
}

function buttonStyle(background: string, color: string): CSSProperties {
  return {
    border: 0,
    borderRadius: 8,
    padding: '12px 18px',
    background,
    color,
    fontWeight: 800,
    cursor: 'pointer',
  };
}

function smallButtonStyle(background: string, color: string): CSSProperties {
  return {
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 7,
    padding: '8px 9px',
    background,
    color,
    fontWeight: 800,
    cursor: 'pointer',
    minHeight: 36,
  };
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  right: 18,
  top: 18,
  width: 'min(440px, calc(100vw - 36px))',
  maxHeight: 'calc(100vh - 36px)',
  overflowY: 'auto',
  borderRadius: 8,
  padding: 16,
  background: 'rgba(7, 19, 29, 0.88)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#f8fafc',
  backdropFilter: 'blur(12px)',
};
