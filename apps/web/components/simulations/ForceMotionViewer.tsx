'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { LessonSnapshot } from '@xr-school/simulation-runtime';
import SimulationExperienceShell, {
  type ExperiencePreferences,
} from '@/components/simulation-experience/SimulationExperienceShell';
import SimulationCanvasHost from '@/components/simulation-experience/SimulationCanvasHost';
import {
  FORCE_LAB_SCENES,
  QUIZ,
  createForceLabState,
  forceLabCanContinue,
  forceLabPrompt,
  reduceForceLab,
  type ForceLabAction,
  type ForceLabSceneId,
  type ForceLabState,
  type Surface,
} from '@/lib/forceLabLesson';
import { createForceLabScene, type DragId, type ForceLabScene } from '@/lib/forceLabScene';
import { createVrHudPanel, type VrHudButtonId, type VrHudContent } from '@/lib/vr/vrHudPanel';
import { createVrLocomotion } from '@/lib/vr/vrLocomotion';
import { createVrPlayerRig } from '@/lib/vr/vrPlayerRig';
import { createGlbAssetLoader } from '@/lib/world-builder/glbAssets';
import { createGuidedCamera } from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';
import { publishRenderStats, readRenderStats } from '@/lib/world-builder/renderBudget';
import {
  createWebSimulationRuntime,
  type WebSimulationRuntime,
  type WebSimulationUpdates,
} from '@/lib/world-builder/webSimulationRuntime';
import { playNarration, stopNarration, unlockNarration } from './narrationAudio';

const NARRATIONS = [
  "Welcome to our little store! Today we will find out what makes things move. A force is a push or a pull. Grab the trolley handle and push it to the counter.",
  "Every push and every pull is a force, and every force acts in a direction. Forces can make things start moving.",
  "It's break time! The football is not moving. It is at rest. Watch Riya. Her kick put a force on the ball, so it started moving. Do you think a gentle kick or a strong kick will make the ball go faster?",
  "The stronger kick gave a bigger force, so the ball moved faster. Your tap changed its direction. Force can start motion, change speed and change direction.",
  "Here is a toy car, a ramp and two different floors. Make a guess. Will the car stop sooner on the smooth tiles or on the rough carpet? For a fair test we use the same car, the same starting line, and we let go without pushing.",
  "The car stopped much sooner on the carpet. A force called friction slowed it down. Friction acts where two surfaces touch, and it works against the motion. Rough surfaces have more friction. Smooth surfaces have less, but never none.",
  "Welcome to the practice wall. Roll the ball at the wall. Where do you think it will go after it hits?",
  "When the ball hit the wall, the wall pushed back on it, and that force changed its direction. Your racket did the same. A force can change the direction of a moving object.",
  "Let's check what you learned. Choose the best answer.",
  "Well done! You found out that forces are pushes and pulls that can start motion, change speed and change direction, and that friction slows moving things down.",
];

type NarrationKey =
  | 'store' | 'store-done' | 'playground' | 'playground-done' | 'friction' | 'friction-done'
  | 'wall' | 'wall-done' | 'quiz' | 'quiz-done';
const NARRATION_INDEX: Record<NarrationKey, number> = {
  store: 0, 'store-done': 1, playground: 2, 'playground-done': 3, friction: 4, 'friction-done': 5,
  wall: 6, 'wall-done': 7, quiz: 8, 'quiz-done': 9,
};

function narrationKeyFor(state: ForceLabState): NarrationKey {
  if (state.scene === 'quiz') return state.quiz.complete ? 'quiz-done' : 'quiz';
  return forceLabCanContinue(state) ? `${state.scene}-done` : state.scene;
}

const SCENE_TITLES: Record<ForceLabSceneId, string> = {
  store: 'Push or Pull?',
  playground: 'Kick Off!',
  friction: 'Why Do Things Slow Down?',
  wall: 'Bounce It Back!',
  quiz: 'Quick Quiz',
};

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

/** Hand speed for the button fallbacks, chosen to land in each kick band. */
const GENTLE_HAND = 0.9;
const STRONG_HAND = 2.6;
const AUTO_DRAG_SECONDS = 1.1;

function snapshotOf(state: ForceLabState): LessonSnapshot {
  const index = FORCE_LAB_SCENES.indexOf(state.scene);
  return {
    experienceId: 'experience-force-motion',
    objective: 'Find out how pushes and pulls start, speed up, slow down and turn moving things.',
    stageIndex: index,
    stageCount: FORCE_LAB_SCENES.length,
    stageId: state.scene,
    stageTitle: SCENE_TITLES[state.scene],
    cue: forceLabPrompt(state),
    performedActionIds: [],
    recordedEvidenceIds: [],
    stageComplete: forceLabCanContinue(state),
    lessonComplete: state.quiz.complete,
  };
}

interface Choice {
  label: string;
  action: ForceLabAction;
}

function choicesFor(state: ForceLabState): Choice[] {
  switch (state.scene) {
    case 'store':
      return state.store.wagonPulled && !state.store.doorPrediction
        ? [
            { label: 'Push the door', action: { type: 'predict-door', option: 'push' } },
            { label: 'Pull the door', action: { type: 'predict-door', option: 'pull' } },
          ]
        : [];
    case 'playground':
      return state.playground.prediction
        ? []
        : [
            { label: 'Gentle kick', action: { type: 'predict-kick', option: 'gentle' } },
            { label: 'Strong kick', action: { type: 'predict-kick', option: 'strong' } },
          ];
    case 'friction':
      return state.friction.prediction
        ? []
        : [
            { label: 'Smooth tiles', action: { type: 'predict-friction', option: 'smooth' } },
            { label: 'Rough carpet', action: { type: 'predict-friction', option: 'rough' } },
            { label: 'The same', action: { type: 'predict-friction', option: 'same' } },
          ];
    case 'wall':
      return state.wall.prediction
        ? []
        : [
            { label: 'Back towards me', action: { type: 'predict-bounce', option: 'back' } },
            { label: 'Through the wall', action: { type: 'predict-bounce', option: 'through' } },
            { label: 'It stops dead', action: { type: 'predict-bounce', option: 'stop' } },
          ];
    case 'quiz':
      if (state.quiz.complete) return [];
      return QUIZ[state.quiz.current]!.options.map((label, option) => ({
        label,
        action: { type: 'answer', option },
      }));
  }
}

type Grab =
  | { kind: 'drag'; id: DragId; offset: THREE.Vector3; height: number }
  | { kind: 'swipe'; samples: { point: THREE.Vector3; time: number }[]; height: number }
  | { kind: 'car'; surface: Surface };

export default function ForceMotionViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<ForceLabScene | null>(null);
  const stateRef = useRef<ForceLabState>(createForceLabState());
  const autoDragRef = useRef<{ id: DragId; from: THREE.Vector3; to: THREE.Vector3; t: number } | null>(null);
  const autoSwingRef = useRef(false);
  const autoTapRef = useRef<number | null>(null);
  const hudDirtyRef = useRef(true);
  const audioRef = useRef(true);

  const [state, setState] = useState(stateRef.current);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const [ready, setReady] = useState(false);

  audioRef.current = preferences.audio;
  const narrate = useCallback((current: ForceLabState) => {
    if (audioRef.current) playNarration(NARRATIONS[NARRATION_INDEX[narrationKeyFor(current)]]!);
  }, []);

  const dispatch = useCallback((action: ForceLabAction) => {
    const before = stateRef.current;
    const next = reduceForceLab(before, action);
    if (next === before) return;
    stateRef.current = next;
    worldRef.current?.apply(next);
    hudDirtyRef.current = true;
    setState(next);
    if (narrationKeyFor(next) !== narrationKeyFor(before)) narrate(next);
  }, [narrate]);

  const autoDrag = useCallback((id: DragId, toGoal: boolean) => {
    const world = worldRef.current;
    if (!world) return;
    const from = toGoal ? world.dragStart(id) : world.dragGoal(id);
    const to = toGoal ? world.dragGoal(id) : world.dragStart(id);
    autoDragRef.current = { id, from, to, t: 0 };
  }, []);

  useEffect(() => {
    if ('xr' in navigator) {
      void (navigator as Navigator & {
        xr: { isSessionSupported(mode: string): Promise<boolean> };
      }).xr.isSessionSupported('immersive-vr').then(setVrSupported).catch(() => setVrSupported(false));
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mountElement = mount;
    let cancelled = false;
    let host: WebSimulationRuntime | undefined;
    let renderUpdate: WebSimulationUpdates['renderUpdate'];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    async function initialize() {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#bfe0f2');
      const camera = new THREE.PerspectiveCamera(56, 1, 0.04, 120);
      host = createWebSimulationRuntime({
        mount: mountElement,
        scene,
        camera,
        updates: {
          fixedUpdate() {},
          renderUpdate(context) { renderUpdate?.(context); },
        },
      });
      const renderer = host.renderer;
      rendererRef.current = renderer;
      renderer.shadowMap.enabled = true;
      // The presentation pipeline renders several passes per frame: count them all.
      renderer.info.autoReset = false;

      const vrRig = createVrPlayerRig({
        renderer,
        scene,
        camera,
        spawn: { position: new THREE.Vector3(0, 0, 2.2), lookAt: new THREE.Vector3(0, 1, 0) },
      });
      host.resources.register('force-lab-rig', () => vrRig.dispose());

      const assets = createGlbAssetLoader(renderer);
      host.resources.register('force-lab-assets', () => assets.dispose());
      const world = await createForceLabScene(scene, assets, {
        reducedMotion,
        onEvent: event => dispatch(event),
        onDiagnostic: message => console.warn(message),
      });
      if (cancelled) {
        world.dispose();
        return;
      }
      worldRef.current = world;
      world.apply(stateRef.current);
      host.resources.register('force-lab-scene', () => {
        world.dispose();
        if (worldRef.current === world) worldRef.current = null;
      });

      const guidedCamera = createGuidedCamera(camera, renderer.domElement, { transitionSeconds: 0.8 });
      guidedCamera.focusOn(world.focusFor(stateRef.current.scene), { animate: false });
      host.resources.register('force-lab-camera', () => guidedCamera.dispose());
      let framedScene: ForceLabSceneId = stateRef.current.scene;

      const hud = createVrHudPanel({ scene });
      host.resources.register('force-lab-hud', () => hud.dispose());

      const hudAction = (id: VrHudButtonId) => {
        const current = stateRef.current;
        if (id === 'previous') dispatch({ type: 'back' });
        else if (id === 'next') dispatch({ type: 'continue' });
        else if (id === 'replay') narrate(current);
        else if (id === 'exit') void renderer.xr.getSession()?.end();
        else if (id.startsWith('choice-')) {
          const choice = choicesFor(current)[id.endsWith('a') ? 0 : id.endsWith('b') ? 1 : 2];
          if (choice) dispatch(choice.action);
        }
      };
      const interaction = createInteractionSystem({
        camera,
        domElement: renderer.domElement,
        xrControllers: vrRig.controllers,
        onSelect: id => {
          const button = hud.buttonIdFor(id);
          if (button) hudAction(button);
        },
      });
      for (const mesh of Object.values(hud.buttons)) interaction.register(mesh.name, mesh);
      host.resources.register('force-lab-interaction', () => interaction.dispose());

      const locomotion = createVrLocomotion({
        renderer,
        rig: vrRig.rig,
        locomotion: 'boundedTeleport',
        movementBounds: new THREE.Box3(new THREE.Vector3(-4, -1, -4), new THREE.Vector3(4, 3, 4)),
        onPrimary: () => dispatch({ type: 'continue' }),
        onBack: () => dispatch({ type: 'back' }),
        onNarrate: () => narrate(stateRef.current),
      });
      host.resources.register('force-lab-locomotion', () => locomotion.dispose());

      // ------------------------------------------------------------ hands-on input
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const plane = new THREE.Plane();
      const hit = new THREE.Vector3();
      let grab: Grab | null = null;
      let activeController: THREE.Object3D | null = null;

      const setRay = (source: THREE.Object3D | null) => {
        if (source) {
          source.updateMatrixWorld(true);
          raycaster.ray.origin.setFromMatrixPosition(source.matrixWorld);
          raycaster.ray.direction.set(0, 0, -1).transformDirection(source.matrixWorld);
        } else {
          raycaster.setFromCamera(pointer, camera);
        }
      };
      const pointAt = (height: number) => {
        plane.set(new THREE.Vector3(0, 1, 0), -height);
        return raycaster.ray.intersectPlane(plane, hit) ? hit.clone() : null;
      };
      const touches = (object: THREE.Object3D) =>
        object.visible && raycaster.intersectObject(object, true).length > 0;

      const begin = (source: THREE.Object3D | null) => {
        const current = stateRef.current;
        if (!worldRef.current) return;
        setRay(source);
        const w = worldRef.current;
        if (current.scene === 'store') {
          for (const id of ['trolley', 'wagon', 'door'] as const) {
            if (!touches(w.targets[id])) continue;
            const height = id === 'trolley' ? 1.0 : id === 'wagon' ? 0.62 : 1.0;
            const point = pointAt(height);
            if (!point) return;
            const anchor = id === 'door' ? point.clone() : w.targets[id].position.clone();
            grab = { kind: 'drag', id, offset: anchor.sub(point).setY(0), height };
            return;
          }
        }
        if (current.scene === 'playground') {
          const point = pointAt(0.11);
          if (!point) return;
          if (w.ballMoving()) {
            if (point.distanceTo(w.ballPosition()) < 0.6) {
              w.tap(point.x >= w.ballPosition().x ? -1 : 1);
            }
            return;
          }
          grab = { kind: 'swipe', samples: [{ point, time: performance.now() / 1000 }], height: 0.11 };
          return;
        }
        if (current.scene === 'friction') {
          for (const surface of ['tile', 'carpet'] as const) {
            if (touches(w.targets.cars[surface]) && !w.carRunning(surface)) {
              grab = { kind: 'car', surface };
              return;
            }
          }
          return;
        }
        if (current.scene === 'wall') {
          if (current.wall.bounced && w.ballInReach()) {
            const point = pointAt(0.5);
            w.swing(point ? THREE.MathUtils.clamp(point.x - w.racketSpot.x, -1, 1) : 0);
            return;
          }
          const point = pointAt(0.034);
          if (point) grab = { kind: 'swipe', samples: [{ point, time: performance.now() / 1000 }], height: 0.034 };
        }
      };

      const move = (source: THREE.Object3D | null) => {
        if (!grab || !worldRef.current) return;
        setRay(source);
        const w = worldRef.current;
        if (grab.kind === 'drag') {
          const point = pointAt(grab.height);
          if (point) w.dragTo(grab.id, point.add(grab.offset));
        } else if (grab.kind === 'swipe') {
          const point = pointAt(grab.height);
          if (point) {
            grab.samples.push({ point, time: performance.now() / 1000 });
            if (grab.samples.length > 12) grab.samples.shift();
          }
        } else if (grab.kind === 'car') {
          const point = pointAt(0.85);
          if (point) w.targets.cars[grab.surface].position.set(point.x, 0.85, point.z);
        }
      };

      const end = (source: THREE.Object3D | null) => {
        const current = grab;
        grab = null;
        if (!current || !worldRef.current) return;
        move(source);
        const w = worldRef.current;
        if (current.kind === 'swipe') {
          const samples = current.samples;
          const first = samples[0]!;
          const last = samples[samples.length - 1]!;
          const seconds = Math.max(0.03, last.time - first.time);
          const velocity = last.point.clone().sub(first.point).divideScalar(seconds).setY(0);
          const speed = velocity.length();
          if (stateRef.current.scene === 'playground') {
            const passedBall = samples.some(s => s.point.distanceTo(w.ballPosition()) < 0.45);
            if (passedBall && speed > 0.2) w.kick(speed, velocity);
          } else if (stateRef.current.scene === 'wall' && speed > 0.3) {
            const towardWall = velocity.z < -0.2 ? velocity : new THREE.Vector3(velocity.x * 0.3, 0, -1);
            w.throwBall(towardWall.normalize().multiplyScalar(THREE.MathUtils.clamp(speed, 1.6, 4)));
          }
        } else if (current.kind === 'car') {
          const car = w.targets.cars[current.surface];
          const lane: Surface = car.position.x < 0 ? 'tile' : 'carpet';
          w.releaseCar(lane);
          if (lane !== current.surface) w.releaseCar(current.surface);
        }
      };

      const onPointerMove = (event: PointerEvent) => {
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        move(null);
      };
      const onPointerDown = (event: PointerEvent) => {
        onPointerMove(event);
        begin(null);
        if (grab) guidedCamera.controls.enabled = false;
      };
      const onPointerUp = (event: PointerEvent) => {
        onPointerMove(event);
        end(null);
        guidedCamera.controls.enabled = true;
      };
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);
      const onSelectStart = (event: { target: unknown }) => {
        const controller = event.target as THREE.Object3D;
        const hovered = interaction.hoveredId;
        if (hovered && hud.buttonIdFor(hovered)) return;
        activeController = controller;
        begin(controller);
      };
      const onSelectEnd = (event: { target: unknown }) => {
        end(event.target as THREE.Object3D);
        activeController = null;
      };
      for (const controller of vrRig.controllers) {
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
      }
      host.resources.register('force-lab-input', () => {
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        for (const controller of vrRig.controllers) {
          controller.removeEventListener('selectstart', onSelectStart);
          controller.removeEventListener('selectend', onSelectEnd);
        }
      });

      // In VR the racket rides on the controller; in the browser it waits by the ball path.
      const racketHome = world.targets.racket.position.clone();

      let lastStatsAt = 0;
      let feedClock = 0;
      renderUpdate = context => {
        const w = worldRef.current;
        if (!w) return;
        const dt = context.frameDeltaSeconds;
        const current = stateRef.current;

        const auto = autoDragRef.current;
        if (auto) {
          auto.t = Math.min(1, auto.t + dt / (reducedMotion ? 0.05 : AUTO_DRAG_SECONDS));
          w.dragTo(auto.id, auto.from.clone().lerp(auto.to, auto.t));
          if (auto.t >= 1) autoDragRef.current = null;
        }
        if (current.scene === 'wall' && current.wall.bounced && !current.wall.hit) {
          // Feed the next ball only once the last one has stopped rolling.
          feedClock = w.tennisMoving() ? 0 : feedClock + Math.min(dt, 0.1);
          if (feedClock > 1.5) {
            feedClock = 0;
            w.feedBall();
          }
          if (autoSwingRef.current && w.ballInReach()) {
            autoSwingRef.current = false;
            w.swing(0);
          }
        }
        if (activeController) move(activeController);
        w.update(dt);
        if (autoTapRef.current !== null) {
          autoTapRef.current -= Math.min(dt, 0.1);
          if (autoTapRef.current <= 0) {
            autoTapRef.current = null;
            w.tap(1);
          }
        }

        if (current.scene !== framedScene) {
          framedScene = current.scene;
          if (renderer.xr.isPresenting) {
            vrRig.rig.position.copy(w.vrSpotFor(current.scene));
            vrRig.rig.rotation.set(0, 0, 0);
          } else {
            guidedCamera.focusOn(w.focusFor(current.scene));
          }
        }

        if (renderer.xr.isPresenting) {
          const controller = vrRig.controllers[1] ?? vrRig.controllers[0];
          if (controller && current.scene === 'wall') {
            controller.getWorldPosition(w.targets.racket.position);
          }
          locomotion.update(dt);
          interaction.updateXrHover();
          if (hudDirtyRef.current) {
            hudDirtyRef.current = false;
            hud.setContent(hudContent(current));
          }
          hud.setVisible(true);
          hud.update(renderer.xr.getCamera(), dt);
        } else {
          w.targets.racket.position.copy(racketHome);
          hud.setVisible(false);
          guidedCamera.update(dt);
        }
        interaction.update(context.elapsedSeconds);

        if (statsRef.current && context.elapsedSeconds - lastStatsAt >= 1) {
          lastStatsAt = context.elapsedSeconds;
          publishRenderStats(statsRef.current, readRenderStats(renderer.info));
        }
        renderer.info.reset();
      };
      await host.initialize();
      setReady(true);
    }

    void initialize().catch(error => {
      if (!cancelled) setRuntimeError(error instanceof Error ? error.message : String(error));
      void host?.dispose();
    });
    return () => {
      cancelled = true;
      stopNarration();
      worldRef.current = null;
      rendererRef.current = null;
      void host?.dispose();
    };
  }, [dispatch, narrate]);

  const enterVr = useCallback(async () => {
    const xr = (navigator as Navigator & {
      xr?: { requestSession(mode: string, options: object): Promise<XRSession> };
    }).xr;
    if (!rendererRef.current || !xr) return;
    try {
      unlockNarration();
      const session = await xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await rendererRef.current.xr.setSession(session);
      hudDirtyRef.current = true;
      setStarted(true);
      narrate(stateRef.current);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'The headset could not start immersive mode.');
    }
  }, [narrate]);

  const snapshot = useMemo(() => snapshotOf(state), [state]);
  const choices = choicesFor(state).map((choice, index) => ({
    id: `choice-${index}`,
    label: choice.label,
    onActivate: () => dispatch(choice.action),
  }));
  const world = worldRef.current;

  return (
    <SimulationExperienceShell
      title="Force and Motion"
      classContext="Grades 6–7 Science · Force and Motion"
      objective="Find out how pushes and pulls start, speed up, slow down and turn moving things."
      snapshot={snapshot}
      started={started}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onStartBrowser={() => {
        unlockNarration();
        setStarted(true);
        narrate(stateRef.current);
      }}
      onEnterVr={vrSupported ? enterVr : undefined}
      onPrevious={() => dispatch({ type: 'back' })}
      onNext={() => dispatch({ type: 'continue' })}
      evidence={evidenceFor(state)}
      completed={state.quiz.complete}
      completionEyebrow="Lesson complete"
      completionHeadline="You know what forces do"
      completionBody="Pushes and pulls are forces. They can start motion, change speed and change direction, and friction slows moving things down."
      choices={choices}
      caption={preferences.subtitles ? forceLabPrompt(state) : undefined}
      feedback={state.feedback ?? undefined}
      onReplayNarration={() => narrate(stateRef.current)}
      error={runtimeError || undefined}
    >
      <div
        ref={statsRef}
        data-testid="force-lab"
        data-ready={ready}
        data-scene={state.scene}
        style={{ position: 'absolute', inset: 0 }}
      >
        <SimulationCanvasHost
          ref={mountRef}
          className="force-motion-world-mount"
          ariaLabel="Force and motion world"
        />
      </div>
      {started && world && state.scene !== 'quiz' && (
        <section className="force-motion-action-tray" aria-label="Force and motion actions">
          <span>Or use a button</span>
          <div>
            {state.scene === 'store' && (
              <>
                <button type="button" className="secondary" disabled={state.store.trolleyPushed}
                  onClick={() => autoDrag('trolley', true)}>Push the trolley</button>
                <button type="button" className="secondary" disabled={state.store.wagonPulled}
                  onClick={() => autoDrag('wagon', true)}>Pull the wagon</button>
                <button type="button" className="secondary" disabled={state.store.doorOpened}
                  onClick={() => autoDrag('door', true)}>Open the door</button>
                <button type="button" className="secondary" disabled={!state.store.doorOpened || state.store.doorClosed}
                  onClick={() => autoDrag('door', false)}>Close the door</button>
              </>
            )}
            {state.scene === 'playground' && (
              <>
                <button type="button" className="secondary" onClick={() => { world.resetBall(); world.kick(GENTLE_HAND); }}>
                  Kick gently
                </button>
                <button type="button" className="secondary" onClick={() => { world.resetBall(); world.kick(STRONG_HAND); }}>
                  Kick hard
                </button>
                <button type="button" className="secondary" onClick={() => {
                  if (!world.ballMoving()) {
                    world.resetBall();
                    world.kick(GENTLE_HAND);
                  }
                  autoTapRef.current = 0.3;
                }}>
                  Tap the rolling ball from the side
                </button>
              </>
            )}
            {state.scene === 'friction' && (
              <>
                <button type="button" className="secondary" onClick={() => world.releaseCar('tile')}>
                  Release on smooth tiles
                </button>
                <button type="button" className="secondary" onClick={() => world.releaseCar('carpet')}>
                  Release on rough carpet
                </button>
              </>
            )}
            {state.scene === 'wall' && (
              <>
                <button type="button" className="secondary" onClick={() => world.throwBall(new THREE.Vector3(0.1, 0, -3))}>
                  Roll the ball at the wall
                </button>
                <button type="button" className="secondary" disabled={!state.wall.bounced}
                  onClick={() => { autoSwingRef.current = true; world.feedBall(); }}>
                  Hit a ball with the racket
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </SimulationExperienceShell>
  );
}

/** What the child has found out so far, shown in the lesson panel. */
function evidenceFor(state: ForceLabState): string[] {
  const found: string[] = [];
  if (state.store.trolleyPushed) found.push('Pushing moved the trolley away from me');
  if (state.store.wagonPulled) found.push('Pulling moved the wagon towards me');
  if (state.store.doorClosed) found.push('A door opens with a pull and shuts with a push');
  const { gentleSpeed, strongSpeed } = state.playground;
  if (gentleSpeed !== null && strongSpeed !== null) {
    found.push(`A stronger kick was faster: ${strongSpeed.toFixed(1)} m/s against ${gentleSpeed.toFixed(1)} m/s`);
  }
  if (state.playground.directionChanged) found.push('A sideways tap changed the ball\'s direction');
  const { smoothDistance, roughDistance } = state.friction;
  if (smoothDistance !== null && roughDistance !== null) {
    found.push(`Friction: ${smoothDistance.toFixed(1)} m on tiles, ${roughDistance.toFixed(1)} m on carpet`);
  }
  if (state.wall.bounced) found.push('The wall pushed back and turned the ball around');
  if (state.wall.hit) found.push('The racket\'s force sent the ball in a new direction');
  return found;
}

function hudContent(state: ForceLabState): VrHudContent {
  const index = FORCE_LAB_SCENES.indexOf(state.scene);
  const canGoOn = forceLabCanContinue(state);
  return {
    eyebrow: `Scene ${index + 1} of ${FORCE_LAB_SCENES.length}`,
    title: SCENE_TITLES[state.scene],
    body: state.feedback ?? forceLabPrompt(state),
    hint: canGoOn ? 'Done! Press Next.' : undefined,
    choices: choicesFor(state).map(choice => ({ label: choice.label })),
    buttons: [
      ...(index > 0 ? (['previous'] as const) : []),
      ...(canGoOn ? (['next'] as const) : []),
      'replay',
      'exit',
    ],
  };
}
