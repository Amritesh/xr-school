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
  ACID_BASE_EXPERIENCE_DEFINITION,
  createAcidBaseExperience,
  type AcidBaseExperience,
} from '@/lib/world-builder/acidBaseExperience';
import {
  createAcidBaseScene,
  type AcidBaseScene,
} from '@/lib/world-builder/acidBaseScene';
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
  'This beaker holds an acid. Dip the red and blue litmus paper into it. Blue litmus turns red in an acid, while red litmus stays red — that colour change identifies an acid.',
  'Now the beaker holds a base. Dip the litmus again and watch the colours flip: red litmus turns blue, and blue litmus stays blue. That identifies a base.',
  'Add a universal indicator to the acid. Its colour tells you the exact pH — match the colour to the pH scale below. A strong acid reads red.',
  'Add base to the acid drop by drop. Watch the pH climb from 2 toward 7 and the colour move from red through orange to green — the acid and base neutralise each other to make a salt and water.',
  'Compare the three solutions on the pH scale: the acidic start near 2, the neutral product at 7, and the base near 12.',
];

const ACTION_LABELS: Record<string, string> = {
  'test-acid-litmus': 'Dip litmus in the acid',
  'test-base-litmus': 'Dip litmus in the base',
  'add-indicator': 'Add universal indicator',
  'add-base': 'Add base to neutralise',
  'compare-solutions': 'Compare on the pH scale',
};

const EVIDENCE_LABELS: Record<string, string> = {
  'acid-identified': 'Blue litmus turned red — the solution is an acid',
  'base-identified': 'Red litmus turned blue — the solution is a base',
  'ph-colour-observed': 'The universal indicator colour placed the solution on the pH scale',
  'neutralisation-observed': 'Adding base raised the pH to 7 — the acid was neutralised into salt and water',
  'comparison-recorded': 'Compared acidic (pH 2), neutral (pH 7), and basic (pH 12) solutions',
};

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true, subtitles: true, comfort: true, seated: false, reducedMotion: false,
};

const DEFAULT_FRAME: CameraFrame = {
  position: new THREE.Vector3(0.4, 1.75, 2.7),
  target: new THREE.Vector3(0, 0.6, 0.2),
};
const APPROACH_FROM = new THREE.Vector3(0.4, 1.75, 2.7);

type ObjectKey = 'beaker' | 'redLitmus' | 'blueLitmus' | 'dropper' | 'burette' | 'phScale' | 'comparisonBoard';

const OBJECT_KEY_BY_ACTION: Record<string, ObjectKey> = {
  'test-acid-litmus': 'redLitmus',
  'test-base-litmus': 'blueLitmus',
  'add-indicator': 'dropper',
  'add-base': 'burette',
  'compare-solutions': 'comparisonBoard',
};

interface StageCameraFocus { objectIds: ObjectKey[]; fitPadding: number; }

const STAGE_CAMERA_FOCUS: StageCameraFocus[] = [
  { objectIds: ['beaker', 'redLitmus', 'blueLitmus'], fitPadding: 2.0 },
  { objectIds: ['beaker', 'redLitmus', 'blueLitmus'], fitPadding: 2.0 },
  { objectIds: ['beaker', 'dropper', 'phScale'], fitPadding: 1.9 },
  { objectIds: ['beaker', 'burette', 'phScale'], fitPadding: 1.9 },
  { objectIds: ['comparisonBoard', 'phScale', 'beaker'], fitPadding: 1.55 },
];

function focusStageOverview(
  stageIndex: number,
  guidedCamera: ReturnType<typeof createGuidedCamera>,
  camera: THREE.PerspectiveCamera,
  world: AcidBaseScene,
) {
  const focus = STAGE_CAMERA_FOCUS[stageIndex];
  const objects = focus?.objectIds.map(id => world[id]) ?? [];
  guidedCamera.focusOn(
    objects.length > 0
      ? computeFocusFrame(objects, camera, { fitPadding: focus.fitPadding, approachFrom: APPROACH_FROM })
      : DEFAULT_FRAME,
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

export default function AcidBaseViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const guidedCameraRef = useRef<ReturnType<typeof createGuidedCamera> | null>(null);
  const sceneApiRef = useRef<AcidBaseScene | null>(null);
  const experienceRef = useRef<AcidBaseExperience>(createAcidBaseExperience());
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
  const [focusVisibility, setFocusVisibility] = useState<FocusGuideVisibility>({ direction: 'forward', visible: false });
  const focusVisibilityRef = useRef(focusVisibility);

  const currentStage = ACID_BASE_EXPERIENCE_DEFINITION.stages[snapshot.stageIndex];
  const remainingActions = useMemo(
    () => currentStage.requiredActionIds.filter(id => !snapshot.performedActionIds.includes(id)),
    [currentStage, snapshot.performedActionIds],
  );
  focusActionRef.current = remainingActions[0];

  const applyVisualAction = useCallback((actionId: string) => {
    const world = sceneApiRef.current;
    if (!world) return;
    if (actionId === 'test-acid-litmus') world.testAcidLitmus();
    if (actionId === 'test-base-litmus') world.testBaseLitmus();
    if (actionId === 'add-indicator') world.addIndicator();
    if (actionId === 'add-base') world.addBase();
    if (actionId === 'compare-solutions') world.compareSolutions();
  }, []);

  const moveCameraToStage = useCallback((stageIndex: number) => {
    if (guidedCameraRef.current && cameraRef.current && sceneApiRef.current) {
      focusStageOverview(stageIndex, guidedCameraRef.current, cameraRef.current, sceneApiRef.current);
    }
  }, []);

  const performAction = useCallback((actionId: string, source: NormalizedInputSource) => {
    const before = experienceRef.current.snapshot();
    const stage = ACID_BASE_EXPERIENCE_DEFINITION.stages[before.stageIndex];
    if (!stage.requiredActionIds.includes(actionId) || before.performedActionIds.includes(actionId)) return;

    try {
      let next = experienceRef.current.perform(actionId);
      applyVisualAction(actionId);
      const authored = ACID_BASE_EXPERIENCE_DEFINITION.stages[next.stageIndex];
      if (
        authored.requiredActionIds.every(id => next.performedActionIds.includes(id))
        && !authored.completionEvidenceIds.every(id => next.recordedEvidenceIds.includes(id))
      ) {
        for (const evidenceId of authored.completionEvidenceIds) {
          next = experienceRef.current.observe(evidenceId);
          setEvidence(values => values.includes(EVIDENCE_LABELS[evidenceId]) ? values : [...values, EVIDENCE_LABELS[evidenceId]]);
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
        }, 320);
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
    if (snapshotRef.current.lessonComplete) { setCompleted(true); return; }
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
      scene.background = new THREE.Color('#0b1622');
      const camera = new THREE.PerspectiveCamera(52, 1, 0.04, 40);
      camera.position.copy(DEFAULT_FRAME.position);
      camera.lookAt(DEFAULT_FRAME.target);
      const playerRig = new THREE.Group();
      playerRig.name = 'player-rig';
      playerRig.add(camera);
      scene.add(playerRig);

      host = createWebSimulationRuntime({
        mount: mountElement, scene, camera,
        updates: {
          fixedUpdate(context) { fixedUpdate?.(context); },
          renderUpdate(context) { renderUpdate?.(context); },
        },
      });
      rendererRef.current = host.renderer;
      cameraRef.current = camera;

      scene.add(new THREE.HemisphereLight('#dbeafe', '#0b1420', 1.6));
      const key = new THREE.DirectionalLight('#fff6e6', 2.1);
      key.position.set(2, 3.2, 2.4);
      key.castShadow = true;
      scene.add(key);
      scene.add(new THREE.PointLight('#7dd3fc', 1.1, 8).translateX(-1.4));

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(3, 48),
        new THREE.MeshStandardMaterial({ color: '#0f1d2c', roughness: 0.95 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.02;
      floor.receiveShadow = true;
      scene.add(floor);

      const world = createAcidBaseScene({ scene });
      sceneApiRef.current = world;
      host.resources.register('acid-base-scene', () => world.dispose());

      const guidedCamera = createGuidedCamera(camera, host.renderer.domElement, { transitionSeconds: 0.7 });
      guidedCamera.focusOn(
        computeFocusFrame(STAGE_CAMERA_FOCUS[0].objectIds.map(id => world[id]), camera, {
          fitPadding: STAGE_CAMERA_FOCUS[0].fitPadding, approachFrom: APPROACH_FROM,
        }),
        { animate: false },
      );
      guidedCameraRef.current = guidedCamera;
      host.resources.register('acid-base-camera', () => {
        if (guidedCameraRef.current === guidedCamera) guidedCameraRef.current = null;
        guidedCamera.dispose();
      });

      const controllerRayGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.5),
      ]);
      const controllerRayMaterial = new THREE.LineBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.72 });
      const controllers = [0, 1].map(index => {
        const controller = host!.renderer.xr.getController(index);
        controller.name = `quest-controller-${index}`;
        controller.add(new THREE.Line(controllerRayGeometry, controllerRayMaterial));
        playerRig.add(controller);
        return controller;
      });
      host.resources.register('acid-base-controller-rays', () => {
        controllerRayGeometry.dispose();
        controllerRayMaterial.dispose();
        for (const controller of controllers) playerRig.remove(controller);
      });

      const interactionSystem = createInteractionSystem({
        camera, domElement: host.renderer.domElement, xrControllers: controllers,
        onSelect: (id, object, source) => {
          const activeSnapshot = snapshotRef.current;
          const activeStage = ACID_BASE_EXPERIENCE_DEFINITION.stages[activeSnapshot.stageIndex];
          if (activeStage.requiredActionIds.includes(id) && !activeSnapshot.performedActionIds.includes(id)) {
            performAction(id, source);
          }
          interactionSystem.setSelected(id);
          guidedCamera.focusOn(computeFocusFrame(object, camera, { fitPadding: 2.4 }));
        },
      });
      interactionSystem.register('test-acid-litmus', world.redLitmus, { highlightColor: '#f87171' });
      interactionSystem.register('test-base-litmus', world.blueLitmus, { highlightColor: '#60a5fa' });
      interactionSystem.register('add-indicator', world.dropper, { highlightColor: '#4ade80' });
      interactionSystem.register('add-base', world.burette, { highlightColor: '#22d3ee' });
      interactionSystem.register('compare-solutions', world.comparisonBoard, { highlightColor: '#a78bfa' });
      host.resources.register('acid-base-interaction', () => interactionSystem.dispose());

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
          const focusTarget = suggestedTargetId ? world[OBJECT_KEY_BY_ACTION[suggestedTargetId]] : undefined;
          if (focusTarget instanceof THREE.Object3D) {
            focusTarget.getWorldPosition(projectedFocus).project(camera);
            const nextFocusVisibility = resolveFocusGuide(projectedFocus);
            const current = focusVisibilityRef.current;
            if (nextFocusVisibility.visible !== current.visible || nextFocusVisibility.direction !== current.direction) {
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
      if (!cancelled) setRuntimeError(error instanceof Error ? error.message : String(error));
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
      title="Acids, Bases & Neutralisation Lab"
      classContext="Class 10 Science · Acids, Bases and Salts"
      objective="Identify acids and bases with litmus, read pH from a universal indicator, and neutralise an acid with a base."
      snapshot={snapshot}
      started={started}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onStartBrowser={() => { setStarted(true); playNarration(snapshot.stageIndex, preferences.audio); }}
      onEnterVr={vrSupported ? enterVr : undefined}
      onPrevious={previous}
      onNext={next}
      evidence={evidence}
      completed={completed}
      completionEyebrow="Investigation complete"
      completionHeadline="Acids, bases, and neutralisation observed"
      completionBody="You identified an acid and a base with litmus, read pH from a universal indicator, neutralised the acid with a base to form a salt and water, and compared all three on the pH scale."
      completionActionLabel="Review the pH scale"
      focusGuide={{
        direction: focusVisibility.direction,
        label: remainingActions.length > 0 ? `Look toward: ${ACTION_LABELS[remainingActions[0]]}` : 'Look toward the pH scale',
        visible: started && !completed && focusVisibility.visible,
      }}
      error={runtimeError || undefined}
    >
      <div ref={mountRef} className="acid-base-world-mount" />
      {started && remainingActions.length > 0 && (
        <section className="acid-base-action-tray" aria-label="Acid-base lab actions">
          <span>Lab action</span>
          <strong>{ACTION_LABELS[remainingActions[0]]}</strong>
          <div>
            {remainingActions.map(actionId => (
              <button key={actionId} type="button" className="secondary" onClick={() => performAction(actionId, 'keyboard')}>
                {ACTION_LABELS[actionId]}
              </button>
            ))}
          </div>
        </section>
      )}
    </SimulationExperienceShell>
  );
}
