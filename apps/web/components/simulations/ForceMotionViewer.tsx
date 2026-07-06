'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  NormalizedInputSource,
} from '../../../../packages/simulation-schema/src/index';
import type {
  LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/experience/lessonSession';
import SimulationExperienceShell, {
  type ExperiencePreferences,
} from '@/components/simulation-experience/SimulationExperienceShell';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import {
  isQuestBackPressed,
  updateButtonLatch,
  updateSnapTurn,
} from '@/lib/xrNavigation';
import {
  FORCE_MOTION_EXPERIENCE_DEFINITION,
  createForceMotionExperience,
  type ForceMotionExperience,
} from '@/lib/world-builder/forceMotionExperience';
import {
  createForceMotionScene,
  type ForceMotionScene,
} from '@/lib/world-builder/forceMotionScene';
import type { ForceMotionMaterials } from '@/lib/world-builder/forceMotionAnatomy';
import {
  resolveFocusGuide,
  type FocusGuideVisibility,
} from '@/lib/world-builder/focusGuidance';
import {
  createWebSimulationRuntime,
  type WebSimulationRuntime,
  type WebSimulationUpdates,
} from '@/lib/world-builder/webSimulationRuntime';
import {
  computeFocusFrame,
  createGuidedCamera,
  type CameraFrame,
} from '@/lib/world-builder/guidedCamera';
import { createInteractionSystem } from '@/lib/world-builder/interactionSystem';

const NARRATIONS = [
  'A ball sits at rest inside the arena. Give it one push, then watch closely: it keeps rolling on its own even after your push ends, and only turns when it bounces off a wall. That tendency to keep moving is called inertia. The yellow arrow shows its speed and direction.',
  'The ball is already rolling and, with no force acting on it, it would keep going forever. Apply the brake — a force opposing its motion — and watch the arrow shrink as the ball slows to a stop.',
  'The ball is rolling at a steady speed. Apply a stronger push in the same direction and watch the arrow grow as the ball speeds up.',
  'The ball is rolling straight ahead. Apply a sideways push and watch its path bend as the arrow swings to a new direction.',
  'Squeeze the ball between the two plates, then release it. Notice whether it returns to its original shape once the force is removed.',
  'Review the comparison board to see all five ways a force changed this ball\'s motion or shape.',
];

const ACTION_LABELS: Record<string, string> = {
  'apply-push': 'Push the resting ball',
  'apply-brake': 'Apply the brake',
  'apply-accelerate': 'Push harder to speed up',
  'apply-deflect': 'Push sideways to redirect',
  'squeeze-ball': 'Squeeze the ball',
  'release-ball': 'Release the ball',
  'compare-motion-effects': 'Compare the effects of force',
};

const EVIDENCE_LABELS: Record<string, string> = {
  'motion-started': 'A push started the ball moving from rest',
  'motion-stopped': 'A brake force brought the moving ball to rest',
  'speed-increased': 'A stronger push in the same direction increased speed',
  'direction-changed': 'A sideways push changed the ball\'s direction',
  'shape-changed': 'Squeezing changed the ball\'s shape, and it sprang back on release',
  'effects-compared': 'Compared how force changed motion and shape across the whole run',
};

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

const DEFAULT_FORCE_MOTION_FRAME: CameraFrame = {
  position: new THREE.Vector3(0.4, 3.0, 2.6),
  target: new THREE.Vector3(0, 0.15, 0),
};

// Every stage approaches from the same elevated front-3/4 vantage instead
// of wherever the previous stage happened to leave the camera — see the
// Pollination stage-5 fix this pattern is copied from: letting the approach
// angle drift between stages produced an accidental wide shot once the
// framed subjects were far enough apart. From the front (+Z) and above, the
// left-side control panel and the board behind the arena both stay visible.
const APPROACH_FROM = new THREE.Vector3(0.4, 3.0, 2.6);

type ForceMotionObjectKey =
  | 'track' | 'ball' | 'pushControl' | 'brakeControl' | 'accelerateControl'
  | 'deflectControl' | 'shapeRig' | 'squeezeControl' | 'releaseControl' | 'comparisonBoard';

const OBJECT_KEY_BY_ACTION: Record<string, ForceMotionObjectKey> = {
  'apply-push': 'pushControl',
  'apply-brake': 'brakeControl',
  'apply-accelerate': 'accelerateControl',
  'apply-deflect': 'deflectControl',
  'squeeze-ball': 'squeezeControl',
  'release-ball': 'releaseControl',
  'compare-motion-effects': 'comparisonBoard',
};

interface StageCameraFocus {
  objectIds: ForceMotionObjectKey[];
  fitPadding: number;
}

// The ball now keeps its velocity and roams the whole arena (bouncing off
// the walls), so the motion stages frame the entire arena — never just the
// ball's starting spot — with the stage's control included so the whole
// play area stays in view no matter where the ball rolls.
const STAGE_CAMERA_FOCUS: StageCameraFocus[] = [
  { objectIds: ['track', 'pushControl'], fitPadding: 1.2 }, // 0: push into motion
  { objectIds: ['track', 'brakeControl'], fitPadding: 1.2 }, // 1: brake to a stop
  { objectIds: ['track', 'accelerateControl'], fitPadding: 1.2 }, // 2: speed up
  { objectIds: ['track', 'deflectControl'], fitPadding: 1.2 }, // 3: change direction
  { objectIds: ['shapeRig', 'squeezeControl', 'releaseControl'], fitPadding: 1.8 }, // 4: change shape
  { objectIds: ['comparisonBoard', 'track'], fitPadding: 1.25 }, // 5: compare
];

function focusStageOverview(
  stageIndex: number,
  guidedCamera: ReturnType<typeof createGuidedCamera>,
  camera: THREE.PerspectiveCamera,
  world: ForceMotionScene,
) {
  const focus = STAGE_CAMERA_FOCUS[stageIndex];
  const objects = focus?.objectIds.map(id => world[id]) ?? [];
  guidedCamera.focusOn(
    objects.length > 0
      ? computeFocusFrame(objects, camera, { fitPadding: focus.fitPadding, approachFrom: APPROACH_FROM })
      : DEFAULT_FORCE_MOTION_FRAME,
  );
}

function isObjectActionSource(source: NormalizedInputSource) {
  return source === 'xr-controller' || source === 'mouse';
}

function advanceAfterObjectAction(source: NormalizedInputSource, snapshot: LessonSnapshot) {
  return isObjectActionSource(source) && snapshot.stageComplete && !snapshot.lessonComplete;
}

function playNarration(stageIndex: number, enabled: boolean) {
  if (!enabled) return;
  void playSimulationNarration(NARRATIONS[stageIndex], stageIndex);
}

function createForceMotionMaterials(): { materials: ForceMotionMaterials; dispose(): void } {
  const owned: THREE.Material[] = [];
  const material = (parameters: THREE.MeshStandardMaterialParameters) => {
    const created = new THREE.MeshStandardMaterial(parameters);
    owned.push(created);
    return created;
  };

  const materials: ForceMotionMaterials = {
    track: material({ color: '#334155', roughness: 0.8, metalness: 0.05 }),
    ball: material({ color: '#38bdf8', roughness: 0.35, metalness: 0.15 }),
    shapeBall: material({ color: '#4ade80', roughness: 0.5, metalness: 0.05 }),
    paddle: material({ color: '#94a3b8', roughness: 0.5, metalness: 0.2 }),
    pushControl: material({ color: '#4ade80', roughness: 0.35, metalness: 0.1, emissive: '#14532d', emissiveIntensity: 0.4 }),
    brakeControl: material({ color: '#f87171', roughness: 0.35, metalness: 0.1, emissive: '#7f1d1d', emissiveIntensity: 0.4 }),
    accelerateControl: material({ color: '#fb923c', roughness: 0.35, metalness: 0.1, emissive: '#7c2d12', emissiveIntensity: 0.4 }),
    deflectControl: material({ color: '#a78bfa', roughness: 0.35, metalness: 0.1, emissive: '#4c1d95', emissiveIntensity: 0.4 }),
    shapeControl: material({ color: '#22d3ee', roughness: 0.35, metalness: 0.1, emissive: '#164e63', emissiveIntensity: 0.4 }),
    velocity: material({ color: '#fde047', roughness: 0.3, metalness: 0.1, emissive: '#a16207', emissiveIntensity: 0.55 }),
    board: material({ color: '#1e293b', roughness: 0.7, metalness: 0.05 }),
  };

  return { materials, dispose: () => { for (const item of owned) item.dispose(); } };
}

export default function ForceMotionViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const guidedCameraRef = useRef<ReturnType<typeof createGuidedCamera> | null>(null);
  const playerRigRef = useRef<THREE.Group | null>(null);
  const sceneApiRef = useRef<ForceMotionScene | null>(null);
  const experienceRef = useRef<ForceMotionExperience>(createForceMotionExperience());
  const snapshotRef = useRef<LessonSnapshot>(experienceRef.current.snapshot());
  const previousRef = useRef<() => void>(() => {});
  const focusActionRef = useRef<string | undefined>(undefined);

  const [snapshot, setSnapshot] = useState(snapshotRef.current);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [focusVisibility, setFocusVisibility] = useState<FocusGuideVisibility>({
    direction: 'forward',
    visible: false,
  });
  const focusVisibilityRef = useRef(focusVisibility);

  const currentStage = FORCE_MOTION_EXPERIENCE_DEFINITION.stages[snapshot.stageIndex];
  const remainingActions = useMemo(
    () => currentStage.requiredActionIds.filter(
      actionId => !snapshot.performedActionIds.includes(actionId),
    ),
    [currentStage, snapshot.performedActionIds],
  );
  focusActionRef.current = remainingActions[0];

  const applyVisualAction = useCallback((actionId: string) => {
    const world = sceneApiRef.current;
    if (!world) return;
    if (actionId === 'apply-push') world.applyPush();
    if (actionId === 'apply-brake') world.applyBrake();
    if (actionId === 'apply-accelerate') world.applyAccelerate();
    if (actionId === 'apply-deflect') world.applyDeflect();
    if (actionId === 'squeeze-ball') world.squeezeBall();
    if (actionId === 'release-ball') world.releaseBall();
  }, []);

  const moveCameraToStage = useCallback((stageIndex: number) => {
    if (guidedCameraRef.current && cameraRef.current && sceneApiRef.current) {
      focusStageOverview(stageIndex, guidedCameraRef.current, cameraRef.current, sceneApiRef.current);
    }
  }, []);

  const performAction = useCallback((actionId: string, source: NormalizedInputSource) => {
    const before = experienceRef.current.snapshot();
    const stage = FORCE_MOTION_EXPERIENCE_DEFINITION.stages[before.stageIndex];
    if (!stage.requiredActionIds.includes(actionId) || before.performedActionIds.includes(actionId)) {
      return;
    }

    try {
      let next = experienceRef.current.perform(actionId);
      applyVisualAction(actionId);
      const authoredStage = FORCE_MOTION_EXPERIENCE_DEFINITION.stages[next.stageIndex];
      if (
        authoredStage.requiredActionIds.every(id => next.performedActionIds.includes(id))
        && !authoredStage.completionEvidenceIds.every(id => next.recordedEvidenceIds.includes(id))
      ) {
        for (const evidenceId of authoredStage.completionEvidenceIds) {
          next = experienceRef.current.observe(evidenceId);
          setEvidence(values => values.includes(EVIDENCE_LABELS[evidenceId])
            ? values
            : [...values, EVIDENCE_LABELS[evidenceId]]);
        }
      }
      snapshotRef.current = next;
      setSnapshot(next);
      if (next.lessonComplete && isObjectActionSource(source)) {
        setCompleted(true);
      } else if (advanceAfterObjectAction(source, next)) {
        window.setTimeout(() => {
          try {
            const advanced = experienceRef.current.next();
            snapshotRef.current = advanced;
            setSnapshot(advanced);
            sceneApiRef.current?.setStage(advanced.stageIndex);
            moveCameraToStage(advanced.stageIndex);
            playNarration(advanced.stageIndex, preferences.audio);
          } catch (error) {
            setRuntimeError(error instanceof Error ? error.message : String(error));
          }
        }, 280);
      }
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [applyVisualAction, moveCameraToStage, preferences.audio]);

  const previous = useCallback(() => {
    setCompleted(false);
    const next = experienceRef.current.previous();
    snapshotRef.current = next;
    setSnapshot(next);
    sceneApiRef.current?.setStage(next.stageIndex);
    moveCameraToStage(next.stageIndex);
    playNarration(next.stageIndex, preferences.audio);
  }, [moveCameraToStage, preferences.audio]);
  previousRef.current = previous;

  const next = useCallback(() => {
    if (!snapshotRef.current.stageComplete) return;
    if (snapshotRef.current.lessonComplete) {
      setCompleted(true);
      return;
    }
    try {
      const nextSnapshot = experienceRef.current.next();
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      sceneApiRef.current?.setStage(nextSnapshot.stageIndex);
      moveCameraToStage(nextSnapshot.stageIndex);
      playNarration(nextSnapshot.stageIndex, preferences.audio);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [moveCameraToStage, preferences.audio]);

  const enterVr = useCallback(async () => {
    if (!rendererRef.current || !('xr' in navigator)) return;
    try {
      const session = await (navigator as Navigator & {
        xr: { requestSession(mode: string, options: XRSessionInit): Promise<XRSession> };
      }).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      playNarration(snapshotRef.current.stageIndex, preferences.audio);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'The headset could not start immersive mode.');
    }
  }, [preferences.audio]);

  useEffect(() => {
    if ('xr' in navigator) {
      void (navigator as Navigator & {
        xr: { isSessionSupported(mode: string): Promise<boolean> };
      }).xr.isSessionSupported('immersive-vr').then(setVrSupported);
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

    async function initialize() {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0a1220');
      const camera = new THREE.PerspectiveCamera(52, 1, 0.04, 40);
      camera.position.copy(DEFAULT_FORCE_MOTION_FRAME.position);
      camera.lookAt(DEFAULT_FORCE_MOTION_FRAME.target);
      const playerRig = new THREE.Group();
      playerRig.name = 'player-rig';
      playerRig.add(camera);
      scene.add(playerRig);
      playerRigRef.current = playerRig;

      host = createWebSimulationRuntime({
        mount: mountElement,
        scene,
        camera,
        updates: {
          fixedUpdate(context) { fixedUpdate?.(context); },
          renderUpdate(context) { renderUpdate?.(context); },
        },
      });
      rendererRef.current = host.renderer;
      cameraRef.current = camera;

      const hemisphere = new THREE.HemisphereLight('#cfe8ff', '#101826', 1.6);
      scene.add(hemisphere);
      const key = new THREE.DirectionalLight('#fff4e0', 2.2);
      key.position.set(2.2, 3, -1);
      key.castShadow = true;
      scene.add(key);
      const rim = new THREE.PointLight('#7dd3fc', 1.4, 8);
      rim.position.set(-1.2, 1.4, 1.5);
      scene.add(rim);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(3.2, 48),
        new THREE.MeshStandardMaterial({ color: '#0f1b2d', roughness: 0.95 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0.3, -0.05, 0.6);
      floor.receiveShadow = true;
      scene.add(floor);

      const { materials, dispose: disposeMaterials } = createForceMotionMaterials();
      host.resources.register('force-motion-materials', disposeMaterials);

      const world = createForceMotionScene({ scene, materials });
      sceneApiRef.current = world;
      host.resources.register('force-motion-scene', () => world.dispose());

      const guidedCamera = createGuidedCamera(camera, host.renderer.domElement, {
        transitionSeconds: 0.7,
      });
      // Snap straight to stage 0's own framing rather than a separately
      // hand-tuned "default" shot — the two drifting out of sync is exactly
      // what produced an unintentionally wide opening view here.
      const openingFocus = STAGE_CAMERA_FOCUS[0];
      const openingObjects = openingFocus.objectIds.map(id => world[id]);
      guidedCamera.focusOn(
        computeFocusFrame(openingObjects, camera, {
          fitPadding: openingFocus.fitPadding,
          approachFrom: APPROACH_FROM,
        }),
        { animate: false },
      );
      guidedCameraRef.current = guidedCamera;
      host.resources.register('force-motion-camera', () => {
        // Resource disposal runs through an awaited loop (see
        // resourceRegistry.disposeAll), so under React Strict Mode's
        // dev-only double-mount this callback can fire *after* a second,
        // real mount has already assigned its own guided camera to this
        // same ref. Only clear it if it still points at this instance.
        if (guidedCameraRef.current === guidedCamera) guidedCameraRef.current = null;
        guidedCamera.dispose();
      });

      const controllerRayGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -2.5),
      ]);
      const controllerRayMaterial = new THREE.LineBasicMaterial({
        color: '#7dd3fc',
        transparent: true,
        opacity: 0.72,
      });
      const controllers = [0, 1].map(index => {
        const controller = host!.renderer.xr.getController(index);
        controller.name = `quest-controller-${index}`;
        controller.add(new THREE.Line(controllerRayGeometry, controllerRayMaterial));
        playerRig.add(controller);
        return controller;
      });
      host.resources.register('force-motion-controller-rays', () => {
        controllerRayGeometry.dispose();
        controllerRayMaterial.dispose();
        for (const controller of controllers) playerRig.remove(controller);
      });

      const interactionSystem = createInteractionSystem({
        camera,
        domElement: host.renderer.domElement,
        xrControllers: controllers,
        onSelect: (id, object, source) => {
          const activeSnapshot = snapshotRef.current;
          const activeStage = FORCE_MOTION_EXPERIENCE_DEFINITION.stages[activeSnapshot.stageIndex];
          if (activeStage.requiredActionIds.includes(id) && !activeSnapshot.performedActionIds.includes(id)) {
            performAction(id, source);
          }
          interactionSystem.setSelected(id);
          guidedCamera.focusOn(computeFocusFrame(object, camera, { fitPadding: 2.4 }));
        },
      });
      interactionSystem.register('apply-push', world.pushControl, { highlightColor: '#4ade80' });
      interactionSystem.register('apply-brake', world.brakeControl, { highlightColor: '#f87171' });
      interactionSystem.register('apply-accelerate', world.accelerateControl, { highlightColor: '#fb923c' });
      interactionSystem.register('apply-deflect', world.deflectControl, { highlightColor: '#a78bfa' });
      interactionSystem.register('squeeze-ball', world.squeezeControl, { highlightColor: '#22d3ee' });
      interactionSystem.register('release-ball', world.releaseControl, { highlightColor: '#22d3ee' });
      interactionSystem.register('compare-motion-effects', world.comparisonBoard, { highlightColor: '#94a3b8' });
      host.resources.register('force-motion-interaction', () => interactionSystem.dispose());

      const snapTurnLatches = [false, false];
      const backButtonLatches = [false, false];
      const projectedFocus = new THREE.Vector3();
      renderUpdate = context => {
        world.update(context.frameDeltaSeconds);

        const suggestedTargetId = focusActionRef.current;
        interactionSystem.setSuggested(suggestedTargetId);
        interactionSystem.update(context.elapsedSeconds);

        if (host!.renderer.xr.isPresenting) {
          const session = host!.renderer.xr.getSession();
          session?.inputSources.forEach((inputSource, index) => {
            const gamepad = inputSource.gamepad;
            if (!gamepad) return;
            const snap = updateSnapTurn(gamepad.axes[2] ?? gamepad.axes[0] ?? 0, snapTurnLatches[index]);
            snapTurnLatches[index] = snap.latched;
            playerRig.rotation.y += snap.radians;
            const back = updateButtonLatch(
              isQuestBackPressed(gamepad.buttons, inputSource.handedness),
              backButtonLatches[index],
            );
            backButtonLatches[index] = back.latched;
            if (back.pressed) {
              if (snapshotRef.current.stageIndex > 0) previousRef.current();
              else void session.end();
            }
          });
        } else {
          guidedCamera.update(context.frameDeltaSeconds);
          const focusTarget = suggestedTargetId
            ? world[OBJECT_KEY_BY_ACTION[suggestedTargetId]]
            : undefined;
          if (focusTarget instanceof THREE.Object3D) {
            focusTarget.getWorldPosition(projectedFocus).project(camera);
            const nextFocusVisibility = resolveFocusGuide(projectedFocus);
            const currentFocusVisibility = focusVisibilityRef.current;
            if (
              nextFocusVisibility.visible !== currentFocusVisibility.visible
              || nextFocusVisibility.direction !== currentFocusVisibility.direction
            ) {
              focusVisibilityRef.current = nextFocusVisibility;
              setFocusVisibility(nextFocusVisibility);
            }
          }
        }
      };
      fixedUpdate = () => {};
      await host.initialize();
    }

    void initialize().catch(error => {
      if (!cancelled) {
        setRuntimeError(error instanceof Error ? error.message : String(error));
      }
      void host?.dispose();
    });
    return () => {
      cancelled = true;
      stopSimulationNarration();
      sceneApiRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      void host?.dispose();
    };
  }, [performAction]);

  return (
    <SimulationExperienceShell
      title="Force and Motion Lab"
      classContext="Class 8 Science · Force and Pressure"
      objective="Show how a force can start, stop, speed up, or redirect a moving object, and change an object's shape."
      snapshot={snapshot}
      started={started}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onStartBrowser={() => {
        setStarted(true);
        playNarration(snapshot.stageIndex, preferences.audio);
      }}
      onEnterVr={vrSupported ? enterVr : undefined}
      onPrevious={previous}
      onNext={next}
      evidence={evidence}
      completed={completed}
      completionEyebrow="Model complete"
      completionHeadline="Effects of force observed and recorded"
      completionBody="You started the ball moving, braked it to a stop, sped it up, redirected it sideways, changed its shape by squeezing it, and compared all five effects of force."
      completionActionLabel="Review final comparison"
      focusGuide={{
        direction: focusVisibility.direction,
        label: remainingActions.length > 0
          ? `Look toward: ${ACTION_LABELS[remainingActions[0]]}`
          : 'Look toward the comparison board',
        visible: started && !completed && focusVisibility.visible,
      }}
      error={runtimeError || undefined}
    >
      <div ref={mountRef} className="force-motion-world-mount" />
      {started && remainingActions.length > 0 && (
        <section className="force-motion-action-tray" aria-label="Force and motion actions">
          <span>Model action</span>
          <strong>{ACTION_LABELS[remainingActions[0]]}</strong>
          <div>
            {remainingActions.map(actionId => (
              <button
                key={actionId}
                type="button"
                className="secondary"
                onClick={() => performAction(actionId, 'keyboard')}
              >
                {ACTION_LABELS[actionId]}
              </button>
            ))}
          </div>
        </section>
      )}
    </SimulationExperienceShell>
  );
}
