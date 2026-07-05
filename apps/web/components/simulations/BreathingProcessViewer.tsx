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
  BREATHING_EXPERIENCE_DEFINITION,
  createBreathingExperience,
  type BreathingExperience,
} from '@/lib/world-builder/breathingExperience';
import {
  createBreathingScene,
  type BreathingScene,
} from '@/lib/world-builder/breathingScene';
import type { BreathingAnatomyMaterials } from '@/lib/world-builder/breathingAnatomy';
import {
  createScaleTransition,
  type ScaleTransition,
} from '@/lib/world-builder/scaleTransition';
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
  'You are examining a model of the human respiratory system. Begin by tracing the airway: air enters through the nose or mouth, travels down the windpipe, and splits into two bronchi.',
  'Locate the two lungs sitting inside the protective rib cage, then find the diaphragm, a dome-shaped muscle stretched beneath them.',
  'Pull the diaphragm to contract it. Watch it flatten and move downward while the rib cage lifts outward, drawing air into the lungs.',
  'Release the diaphragm to let it relax. Watch it dome back upward while the rib cage falls, pushing air back out.',
  'Zoom into the alveoli, tiny grape-like air sacs at the end of the smallest airways, where oxygen enters the blood and carbon dioxide leaves it.',
  'Review the comparison board to see how rib position, diaphragm shape, and lung volume differ between inhaling and exhaling.',
];

const ACTION_LABELS: Record<string, string> = {
  'inspect-airway': 'Trace the airway',
  'inspect-lungs': 'Inspect the lungs',
  'inspect-diaphragm': 'Inspect the diaphragm',
  'trigger-inhale': 'Pull the diaphragm to inhale',
  'trigger-exhale': 'Release the diaphragm to exhale',
  'inspect-alveoli': 'Zoom into the alveoli',
  'compare-breathing-cycle': 'Compare the breathing cycle',
};

const EVIDENCE_LABELS: Record<string, string> = {
  'airway-path-identified': 'Traced air from the nose or mouth through the windpipe to the bronchi',
  'lungs-diaphragm-identified': 'Located both lungs and the diaphragm beneath them',
  'inhale-mechanics-observed': 'Diaphragm flattened and the rib cage lifted as air moved in',
  'exhale-mechanics-observed': 'Diaphragm domed upward and the rib cage fell as air moved out',
  'gas-exchange-observed': 'Identified the alveoli as the site of oxygen and carbon dioxide exchange',
  'breathing-cycle-compared': 'Compared rib position, diaphragm shape, and lung volume across the breathing cycle',
};

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

const DEFAULT_BREATHING_FRAME: CameraFrame = {
  position: new THREE.Vector3(0, 0.85, 2.2),
  target: new THREE.Vector3(0, 0.6, 0),
};

// Every stage approaches from the same "standing in front, chest height"
// vantage instead of wherever the previous stage happened to leave the
// camera — see the Pollination stage-5 fix this pattern is copied from:
// letting the approach angle drift between stages produced an accidental
// wide shot once the framed subjects were far enough apart.
const APPROACH_FROM = new THREE.Vector3(0, 0.85, 2.2);

/** Keys of BreathingScene that resolve to an actual Object3D — excludes the
 * method properties (setStage/update/setBreathingPhase/dispose) so camera
 * framing and focus-arrow lookups can index the scene without a runtime
 * `instanceof` filter losing the object-vs-function distinction. */
type BreathingObjectKey =
  | 'ribCage' | 'lungs' | 'diaphragm' | 'airway'
  | 'alveoli' | 'inhaleControl' | 'exhaleControl' | 'comparisonBoard';

// Maps each action id to the scene object a learner should be looking at
// while that action is the next required one — used for both the
// suggested-highlight beacon's off-screen arrow and (via
// STAGE_CAMERA_FOCUS) the per-stage camera shot.
const OBJECT_KEY_BY_ACTION: Record<string, BreathingObjectKey> = {
  'inspect-airway': 'airway',
  'inspect-lungs': 'lungs',
  'inspect-diaphragm': 'diaphragm',
  'trigger-inhale': 'inhaleControl',
  'trigger-exhale': 'exhaleControl',
  'inspect-alveoli': 'alveoli',
  'compare-breathing-cycle': 'comparisonBoard',
};

interface StageCameraFocus {
  objectIds: BreathingObjectKey[];
  fitPadding: number;
}

const STAGE_CAMERA_FOCUS: StageCameraFocus[] = [
  { objectIds: ['airway'], fitPadding: 2.4 }, // 0: follow the airway
  { objectIds: ['lungs', 'diaphragm', 'ribCage'], fitPadding: 1.55 }, // 1: find lungs + diaphragm
  { objectIds: ['diaphragm', 'inhaleControl', 'ribCage'], fitPadding: 1.7 }, // 2: breathe in
  { objectIds: ['diaphragm', 'exhaleControl', 'ribCage'], fitPadding: 1.7 }, // 3: breathe out
  { objectIds: ['alveoli'], fitPadding: 1.35 }, // 4: zoom into the alveoli
  { objectIds: ['lungs', 'ribCage', 'comparisonBoard'], fitPadding: 1.5 }, // 5: compare the cycle
];

function scaleDisclosureForStage(stageIndex: number) {
  return stageIndex === 4
    ? 'The next view enlarges the alveoli far beyond their real, microscopic size.'
    : '';
}

function focusStageOverview(
  stageIndex: number,
  guidedCamera: ReturnType<typeof createGuidedCamera>,
  camera: THREE.PerspectiveCamera,
  world: BreathingScene,
) {
  const focus = STAGE_CAMERA_FOCUS[stageIndex];
  const objects = focus?.objectIds.map(id => world[id]) ?? [];
  guidedCamera.focusOn(
    objects.length > 0
      ? computeFocusFrame(objects, camera, { fitPadding: focus.fitPadding, approachFrom: APPROACH_FROM })
      : DEFAULT_BREATHING_FRAME,
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

function createAnatomyMaterials(): { materials: BreathingAnatomyMaterials; dispose(): void } {
  const owned: THREE.Material[] = [];
  const material = (parameters: THREE.MeshStandardMaterialParameters) => {
    const created = new THREE.MeshStandardMaterial(parameters);
    owned.push(created);
    return created;
  };

  const materials: BreathingAnatomyMaterials = {
    bone: material({ color: '#e7ddc8', roughness: 0.62, metalness: 0.02 }),
    muscle: material({ color: '#c2686f', roughness: 0.55, metalness: 0.02 }),
    lung: material({ color: '#e8a3ac', roughness: 0.5, metalness: 0.01 }),
    airway: material({ color: '#d7cdbb', roughness: 0.58, metalness: 0.02 }),
    capillary: material({ color: '#5b8def', roughness: 0.4, metalness: 0.05 }),
    control: material({ color: '#38bdf8', roughness: 0.35, metalness: 0.1, emissive: '#0c4a6e', emissiveIntensity: 0.4 }),
    controlAccent: material({ color: '#fb923c', roughness: 0.35, metalness: 0.1, emissive: '#7c2d12', emissiveIntensity: 0.4 }),
    board: material({ color: '#334155', roughness: 0.7, metalness: 0.05 }),
  };

  return { materials, dispose: () => { for (const item of owned) item.dispose(); } };
}

export default function BreathingProcessViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const guidedCameraRef = useRef<ReturnType<typeof createGuidedCamera> | null>(null);
  const playerRigRef = useRef<THREE.Group | null>(null);
  const sceneApiRef = useRef<BreathingScene | null>(null);
  const experienceRef = useRef<BreathingExperience>(createBreathingExperience());
  const transitionRef = useRef<ScaleTransition>(createScaleTransition());
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
  const [scaleDisclosure, setScaleDisclosure] = useState('');
  const [focusVisibility, setFocusVisibility] = useState<FocusGuideVisibility>({
    direction: 'forward',
    visible: false,
  });
  const focusVisibilityRef = useRef(focusVisibility);

  const currentStage = BREATHING_EXPERIENCE_DEFINITION.stages[snapshot.stageIndex];
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
    if (actionId === 'trigger-inhale') world.setBreathingPhase(1);
    if (actionId === 'trigger-exhale') world.setBreathingPhase(0);
    if (actionId === 'inspect-alveoli') {
      const transition = transitionRef.current.begin('lungs', 'alveoli-cutaway');
      setScaleDisclosure(transition.scaleDisclosure);
    }
  }, []);

  const moveCameraToStage = useCallback((stageIndex: number) => {
    if (guidedCameraRef.current && cameraRef.current && sceneApiRef.current) {
      focusStageOverview(stageIndex, guidedCameraRef.current, cameraRef.current, sceneApiRef.current);
    }
  }, []);

  const performAction = useCallback((actionId: string, source: NormalizedInputSource) => {
    const before = experienceRef.current.snapshot();
    const stage = BREATHING_EXPERIENCE_DEFINITION.stages[before.stageIndex];
    if (!stage.requiredActionIds.includes(actionId) || before.performedActionIds.includes(actionId)) {
      return;
    }

    try {
      let next = experienceRef.current.perform(actionId);
      applyVisualAction(actionId);
      const authoredStage = BREATHING_EXPERIENCE_DEFINITION.stages[next.stageIndex];
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
            setScaleDisclosure(scaleDisclosureForStage(advanced.stageIndex));
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
    setScaleDisclosure(scaleDisclosureForStage(next.stageIndex));
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
      setScaleDisclosure(scaleDisclosureForStage(nextSnapshot.stageIndex));
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
      camera.position.copy(DEFAULT_BREATHING_FRAME.position);
      camera.lookAt(DEFAULT_BREATHING_FRAME.target);
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
      key.position.set(2.2, 3, 2.5);
      key.castShadow = true;
      scene.add(key);
      const rim = new THREE.PointLight('#7dd3fc', 1.4, 8);
      rim.position.set(-1.6, 1.4, -1.2);
      scene.add(rim);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(2.4, 48),
        new THREE.MeshStandardMaterial({ color: '#0f1b2d', roughness: 0.95 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.9;
      floor.receiveShadow = true;
      scene.add(floor);

      const { materials, dispose: disposeMaterials } = createAnatomyMaterials();
      host.resources.register('breathing-materials', disposeMaterials);

      const world = createBreathingScene({ scene, materials });
      world.root.position.y = -0.35;
      sceneApiRef.current = world;
      host.resources.register('breathing-scene', () => world.dispose());

      const guidedCamera = createGuidedCamera(camera, host.renderer.domElement, {
        transitionSeconds: 0.7,
      });
      guidedCamera.focusOn(DEFAULT_BREATHING_FRAME, { animate: false });
      guidedCameraRef.current = guidedCamera;
      host.resources.register('breathing-camera', () => {
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
      host.resources.register('breathing-controller-rays', () => {
        controllerRayGeometry.dispose();
        controllerRayMaterial.dispose();
        for (const controller of controllers) playerRig.remove(controller);
      });

      const interactionSystem = createInteractionSystem({
        camera,
        domElement: host.renderer.domElement,
        xrControllers: controllers,
        onSelect: (id, _object, source) => {
          const activeSnapshot = snapshotRef.current;
          const activeStage = BREATHING_EXPERIENCE_DEFINITION.stages[activeSnapshot.stageIndex];
          if (activeStage.requiredActionIds.includes(id) && !activeSnapshot.performedActionIds.includes(id)) {
            performAction(id, source);
          }
          interactionSystem.setSelected(id);
          guidedCamera.focusOn(computeFocusFrame(_object, camera, { fitPadding: 2.1 }));
        },
      });
      interactionSystem.register('inspect-airway', world.airway, { highlightColor: '#7dd3fc' });
      interactionSystem.register('inspect-lungs', world.lungs, { highlightColor: '#f9a8d4' });
      interactionSystem.register('inspect-diaphragm', world.diaphragm, { highlightColor: '#fca5a5' });
      interactionSystem.register('trigger-inhale', world.inhaleControl, { highlightColor: '#38bdf8' });
      interactionSystem.register('trigger-exhale', world.exhaleControl, { highlightColor: '#fb923c' });
      interactionSystem.register('inspect-alveoli', world.alveoli, { highlightColor: '#f87171' });
      interactionSystem.register('compare-breathing-cycle', world.comparisonBoard, { highlightColor: '#a78bfa' });
      host.resources.register('breathing-interaction', () => interactionSystem.dispose());

      const snapTurnLatches = [false, false];
      const backButtonLatches = [false, false];
      const projectedFocus = new THREE.Vector3();
      renderUpdate = context => {
        world.update(context.frameDeltaSeconds, context.elapsedSeconds);
        transitionRef.current.update(context.frameDeltaSeconds * 1.8);

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
      title="Human Respiratory System Lab"
      classContext="Class 7 Science · Respiration in Organisms"
      objective="Explain how the diaphragm and rib cage work together to move air into and out of the lungs."
      snapshot={snapshot}
      started={started}
      preferences={preferences}
      onPreferencesChange={nextPreferences => {
        setPreferences(nextPreferences);
        transitionRef.current = createScaleTransition({
          reducedMotion: nextPreferences.reducedMotion,
        });
      }}
      onStartBrowser={() => {
        setStarted(true);
        playNarration(snapshot.stageIndex, preferences.audio);
      }}
      onEnterVr={vrSupported ? enterVr : undefined}
      onPrevious={previous}
      onNext={next}
      evidence={evidence}
      scaleNote={scaleDisclosure}
      completed={completed}
      completionEyebrow="Model complete"
      completionHeadline="Breathing cycle observed and recorded"
      completionBody="You traced the airway, located the lungs and diaphragm, triggered inhalation and exhalation, zoomed into the alveoli, and compared the two phases of the breathing cycle."
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
      <div ref={mountRef} className="breathing-world-mount" />
      {started && remainingActions.length > 0 && (
        <section className="breathing-action-tray" aria-label="Respiratory system actions">
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
          {scaleDisclosure && <small>{scaleDisclosure}</small>}
        </section>
      )}
    </SimulationExperienceShell>
  );
}
