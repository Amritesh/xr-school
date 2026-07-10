'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  NormalizedInputSource,
} from '../../../../packages/simulation-schema/src/index';
import {
  createScientificModelRegistry,
} from '../../../../packages/simulation-runtime/src/world/scientificModels';
import {
  pollinationSnapshotForStage,
} from '../../../../packages/simulation-runtime/src/models/pollinationModel';
import type {
  LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/experience/lessonSession';
import SimulationExperienceShell, {
  type ExperiencePreferences,
} from '@/components/simulation-experience/SimulationExperienceShell';
import { playSimulationNarration, stopSimulationNarration } from '@/lib/simulationAudio';
import { createVrHudPanel, type VrHudContent } from '@/lib/vr/vrHudPanel';
import { createVrLocomotion } from '@/lib/vr/vrLocomotion';
import { createVrPlayerRig } from '@/lib/vr/vrPlayerRig';
import { createEnvironment } from '@/lib/world-builder/environmentFactory';
import { createMaterialFactory } from '@/lib/world-builder/materialFactory';
import {
  createPollinationExperience,
  type PollinationExperience,
} from '@/lib/world-builder/pollinationExperience';
import {
  createPollinationScene,
  type PollinationScene,
  type PollinationSceneMaterials,
} from '@/lib/world-builder/pollinationScene';
import { POLLINATION_WORLD } from '@/lib/world-builder/pollinationWorld';
import {
  createScaleTransition,
  type ScaleTransition,
} from '@/lib/world-builder/scaleTransition';
import {
  resolveFocusGuide,
  type FocusGuideVisibility,
} from '@/lib/world-builder/focusGuidance';
import { createToolInteraction } from '@/lib/world-builder/toolInteraction';
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
  'You are the field biologist for this school pollinator garden. Inspect the experimental flower and identify the petals, pollen-bearing anthers, and receptive stigma.',
  'Collect a pollen sample. Draw the soft brush across a mature anther and look for golden grains on the bristles.',
  'Observe the visiting bee. Notice how flower colour, scent, and nectar bring the pollinator into contact with the anthers.',
  'Transfer your pollen sample to the experimental flower’s stigma. The second flower remains untouched as the control.',
  'Pollination is complete, but fertilisation happens later. Enter the enlarged cutaway and trace the pollen tube through the style to an ovule.',
  'Advance biological time and compare both flowers. Only the pollinated treatment develops a fruit; the untouched control does not.',
  'Open the fruit, choose a seed, plant it, cover it with soil, and add enough water to begin germination.',
  'Inspect the enlarged soil window. The radicle emerges first and grows down; the plumule grows upward. Return to the garden to complete the cycle.',
];

const NARRATION_AUDIO_URLS = Array.from(
  { length: 8 },
  (_, index) => `/audio/pollination/stage-${String(index + 1).padStart(2, '0')}.mp3`,
);

const ACTION_LABELS: Record<string, string> = {
  'inspect-flower': 'Inspect flower anatomy',
  'collect-pollen': 'Brush the anther',
  'observe-pollinator': 'Observe the visiting bee',
  'transfer-pollen': 'Brush the stigma',
  'trace-pollen-tube': 'Trace pollen tube to ovule',
  'advance-time-lapse': 'Advance biological time',
  'compare-control': 'Compare treatment and control',
  'open-fruit': 'Open the fruit',
  'plant-seed': 'Plant one seed',
  'cover-seed': 'Cover the seed with soil',
  'water-seed': 'Water the planted seed',
  'inspect-germination': 'Inspect radicle and plumule',
};

const ACTION_BY_TARGET: Record<string, string> = {
  'treatment-flower': 'inspect-flower',
  'treatment-flower-head': 'inspect-flower',
  'anther-target': 'collect-pollen',
  'pollinator-bee': 'observe-pollinator',
  'stigma-target': 'transfer-pollen',
  'ovary-cutaway': 'trace-pollen-tube',
  'target-ovule': 'trace-pollen-tube',
  'time-lapse-dial': 'advance-time-lapse',
  'time-lapse-knob': 'advance-time-lapse',
  'control-flower': 'compare-control',
  'control-flower-head': 'compare-control',
  'fruit-and-seed': 'open-fruit',
  'fruit-halves': 'open-fruit',
  'plantable-seed': 'plant-seed',
  trowel: 'cover-seed',
  'watering-can': 'water-seed',
  'soil-observation-window': 'inspect-germination',
  'germination-specimen': 'inspect-germination',
  radicle: 'inspect-germination',
  plumule: 'inspect-germination',
};

const TARGET_BY_ACTION: Record<string, string> = {
  'inspect-flower': 'treatment-flower-head',
  'collect-pollen': 'anther-target',
  'observe-pollinator': 'pollinator-bee',
  'transfer-pollen': 'stigma-target',
  'trace-pollen-tube': 'target-ovule',
  'advance-time-lapse': 'time-lapse-knob',
  'compare-control': 'control-flower-head',
  'open-fruit': 'fruit-halves',
  'plant-seed': 'plantable-seed',
  'cover-seed': 'trowel',
  'water-seed': 'watering-can',
  'inspect-germination': 'germination-specimen',
};

const EVIDENCE_LABELS: Record<string, string> = {
  'flower-parts-identified': 'Petals, anthers, and stigma identified',
  'pollen-collected-on-brush': 'Golden pollen adhered to the brush',
  'bee-flower-visit-observed': 'Bee contacted anthers while collecting nectar',
  'pollen-on-stigma-observed': 'Pollen transferred to the treatment stigma',
  'fertilisation-route-observed': 'Pollen tube reached an ovule after pollination',
  'treatment-control-difference-observed': 'Only the pollinated treatment formed fruit',
  'germination-conditions-provided': 'Seed was planted, covered, and watered',
  'cycle-completion-observed': 'Radicle and plumule emerged in opposite directions',
};

const DEFAULT_PREFERENCES: ExperiencePreferences = {
  audio: true,
  subtitles: true,
  comfort: true,
  seated: false,
  reducedMotion: false,
};

function playNarration(stageIndex: number, enabled: boolean) {
  if (!enabled) return;
  void playSimulationNarration(
    NARRATIONS[stageIndex],
    stageIndex,
    NARRATION_AUDIO_URLS[stageIndex],
  );
}

function actionForObject(object?: THREE.Object3D) {
  let candidate = object;
  while (candidate) {
    const action = ACTION_BY_TARGET[candidate.name];
    if (action) return action;
    candidate = candidate.parent ?? undefined;
  }
  return undefined;
}

function advanceAfterObjectAction(
  source: NormalizedInputSource,
  snapshot: LessonSnapshot,
) {
  return (
    isObjectActionSource(source)
    && snapshot.stageComplete
    && !snapshot.lessonComplete
  );
}

function isObjectActionSource(source: NormalizedInputSource) {
  return source === 'xr-controller' || source === 'mouse';
}

const DEFAULT_POLLINATION_FRAME: CameraFrame = {
  position: new THREE.Vector3(0, 1.55, 3.15),
  target: new THREE.Vector3(0, 1.02, -0.92),
};

// Feet on the garden path a couple of metres south of the flower beds,
// facing the experimental flower — standing height comes from the headset.
const VR_SPAWN = {
  position: new THREE.Vector3(0, 0, 2.4),
  lookAt: new THREE.Vector3(0, 1.0, -0.9),
};

interface StageCameraFocus {
  /** Object(s) to frame together. Multiple names fit all of them in one shot. */
  names: string[];
  fitPadding: number;
  /**
   * World point to approach the subject from. computeFocusFrame() defaults
   * this to the camera's current position, which for a fresh stage overview
   * is really just "wherever the previous stage's shot happened to leave
   * the camera" — an arbitrary angle, not a composed one. Stages that union
   * widely-separated objects need an explicit vantage so the shot looks
   * deliberately composed instead of orbiting in from whatever direction
   * the last stage's subject happened to be.
   */
  approachFrom?: THREE.Vector3;
}

// One explicit shot per stage — deliberately NOT derived from
// TARGET_BY_ACTION (which exists for the continuous arrow/beacon guidance,
// a different concern: "what's the very next clickable thing" vs "what's
// this whole stage about"). Deriving the stage shot from the first
// required action's target used to send the camera to whatever object
// that action happened to touch — for stage 5 that was a tool on the far
// field table, when the stage is actually about comparing the two
// flowers. Each stage's shot is authored here instead, so it's obvious at
// a glance what the learner sees when a stage begins.
const SOUTH_OF_BEDS = new THREE.Vector3(0, 1.6, 3.2);
const STAGE_CAMERA_FOCUS: StageCameraFocus[] = [
  { names: ['treatment-flower'], fitPadding: 3.2 }, // 0: inspect the flower
  { names: ['anther-target'], fitPadding: 4.5 }, // 1: collect pollen
  { names: ['pollinator-bee'], fitPadding: 4.5 }, // 2: observe the pollinator
  { names: ['stigma-target'], fitPadding: 4.5 }, // 3: transfer pollen
  { names: ['enlarged-pistil-cutaway'], fitPadding: 1.7 }, // 4: trace the pollen tube
  // The two flowers sit 4.7m apart, so their combined bounding sphere is far
  // larger than a single flower's. A tighter padding keeps this a "stand
  // between the two beds" shot, and an explicit south-facing approachFrom
  // (matching the spawn view) stops it inheriting stage 4's leftover
  // off-to-the-side angle, which used to sweep the shot wide enough to
  // reveal the whole garden and field table behind the flowers.
  { names: ['treatment-flower', 'control-flower'], fitPadding: 1.25, approachFrom: SOUTH_OF_BEDS }, // 5: compare both flowers
  { names: ['fruit-halves'], fitPadding: 4.2 }, // 6: open the fruit, plant a seed
  { names: ['enlarged-germination-cutaway'], fitPadding: 1.7 }, // 7: inspect germination
];

/** Moves the camera once per real stage transition — an explicit, occasional
 * move (like Circuit's), not a per-substep nudge that would fight the
 * learner's own free look-around. */
function focusStageOverview(
  stageIndex: number,
  guidedCamera: ReturnType<typeof createGuidedCamera>,
  camera: THREE.PerspectiveCamera,
  world: PollinationScene,
) {
  const focus = STAGE_CAMERA_FOCUS[stageIndex];
  const objects = focus?.names
    .map(name => world.root.getObjectByName(name))
    .filter((object): object is THREE.Object3D => Boolean(object)) ?? [];
  const frame = objects.length > 0
    ? computeFocusFrame(objects, camera, {
      fitPadding: focus.fitPadding,
      approachFrom: focus.approachFrom,
    })
    : DEFAULT_POLLINATION_FRAME;
  guidedCamera.focusOn(frame);
}

// Stage 4 swaps the whole garden for the enlarged pistil cutaway — worth a
// heads-up on arrival. Every other stage transition stays silent (see the
// scale-note removal rationale above the `scaleDisclosure` state).
function scaleDisclosureForStage(stageIndex: number) {
  return stageIndex === 4
    ? 'The next view enlarges the internal flower structures.'
    : '';
}

function createDerivedMaterial(
  source: THREE.MeshStandardMaterial,
  parameters: THREE.MeshStandardMaterialParameters,
) {
  const material = source.clone();
  material.setValues(parameters);
  material.needsUpdate = true;
  return material;
}

export default function PollinationViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const guidedCameraRef = useRef<ReturnType<typeof createGuidedCamera> | null>(null);
  const playerRigRef = useRef<THREE.Group | null>(null);
  const sceneApiRef = useRef<PollinationScene | null>(null);
  const experienceRef = useRef<PollinationExperience>(createPollinationExperience());
  const transitionRef = useRef<ScaleTransition>(createScaleTransition());
  const snapshotRef = useRef<LessonSnapshot>(experienceRef.current.snapshot());
  const performRef = useRef<(actionId: string, source: NormalizedInputSource, target?: string) => void>(() => {});
  const previousRef = useRef<() => void>(() => {});
  const nextRef = useRef<() => void>(() => {});
  const replayRef = useRef<() => void>(() => {});
  const completedRef = useRef(false);
  const evidenceRef = useRef<string[]>([]);
  const focusActionRef = useRef<string | undefined>(undefined);

  const [snapshot, setSnapshot] = useState(snapshotRef.current);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  // Empty by default: the scale note only has something worth saying right
  // around a cutaway transition, not for the ordinary life-size garden.
  const [scaleDisclosure, setScaleDisclosure] = useState('');
  const [focusVisibility, setFocusVisibility] = useState<FocusGuideVisibility>({
    direction: 'forward',
    visible: false,
  });
  const focusVisibilityRef = useRef(focusVisibility);

  // Mirrored into refs so the render loop (which drives the VR HUD panel)
  // reads current values without re-subscribing the effect.
  useEffect(() => { completedRef.current = completed; }, [completed]);
  useEffect(() => { evidenceRef.current = evidence; }, [evidence]);

  const experienceDefinition = POLLINATION_WORLD.experienceDefinitions![0];
  const currentStage = experienceDefinition.stages[snapshot.stageIndex];
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
    if (actionId === 'collect-pollen') {
      world.pollen.visible = true;
      world.brush.scale.setScalar(1.08);
    }
    if (actionId === 'transfer-pollen') {
      world.stigmaTarget.scale.setScalar(1.22);
      world.pollen.position.x += 1.08;
    }
    if (actionId === 'trace-pollen-tube') {
      const transition = transitionRef.current.begin('flower', 'pistil-cutaway');
      setScaleDisclosure(transition.scaleDisclosure);
      world.treatmentFlower.ovaryCutaway.visible = true;
    }
    if (actionId === 'advance-time-lapse') {
      world.fruit.root.visible = true;
      world.fruit.root.scale.setScalar(1);
    }
    if (actionId === 'compare-control') {
      world.controlFlower.root.scale.setScalar(0.96);
      world.treatmentFlower.root.scale.setScalar(1.05);
    }
    if (actionId === 'open-fruit') {
      world.fruit.halves.children.forEach((half, index) => {
        half.position.x += index % 2 === 0 ? -0.1 : 0.1;
      });
    }
    if (actionId === 'plant-seed') {
      world.seed.visible = false;
      world.germination.root.visible = true;
      world.germination.seed.visible = true;
    }
    if (actionId === 'cover-seed') world.germination.seed.visible = false;
    if (actionId === 'water-seed') {
      world.germination.root.visible = true;
      world.germination.radicle.visible = true;
      world.germination.plumule.visible = true;
    }
    if (actionId === 'inspect-germination') {
      const transition = transitionRef.current.begin('garden', 'germination-cutaway');
      setScaleDisclosure(transition.scaleDisclosure);
    }
  }, []);

  const moveCameraToStage = useCallback((stageIndex: number) => {
    if (guidedCameraRef.current && cameraRef.current && sceneApiRef.current) {
      focusStageOverview(stageIndex, guidedCameraRef.current, cameraRef.current, sceneApiRef.current);
    }
  }, []);

  const performAction = useCallback((
    actionId: string,
    source: NormalizedInputSource,
    targetEntityId = actionId,
  ) => {
    const before = experienceRef.current.snapshot();
    if (!experienceDefinition.stages[before.stageIndex].requiredActionIds.includes(actionId)) {
      return;
    }
    const interaction = createToolInteraction({
      actionId,
      toolId: `field-tool-${actionId}`,
      home: [0, 0, 0],
      validTargets: [targetEntityId],
    });
    interaction.pickUp(source);
    const committed = interaction.release(
      targetEntityId,
      before.stageId,
      typeof performance === 'undefined' ? 0 : performance.now(),
    ).action;
    if (!committed) return;

    try {
      let next = experienceRef.current.perform(committed.actionId);
      applyVisualAction(actionId);
      const authoredStage = experienceDefinition.stages[next.stageIndex];
      if (
        authoredStage.requiredActionIds.every(
          required => next.performedActionIds.includes(required),
        )
        && !authoredStage.completionEvidenceIds.every(
          id => next.recordedEvidenceIds.includes(id),
        )
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
            transitionRef.current.reset();
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
  }, [applyVisualAction, experienceDefinition, moveCameraToStage, preferences.audio]);
  performRef.current = performAction;

  const previous = useCallback(() => {
    setCompleted(false);
    const next = experienceRef.current.previous();
    snapshotRef.current = next;
    setSnapshot(next);
    sceneApiRef.current?.setStage(next.stageIndex);
    moveCameraToStage(next.stageIndex);
    transitionRef.current.reset();
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
      transitionRef.current.reset();
      setScaleDisclosure(scaleDisclosureForStage(nextSnapshot.stageIndex));
      playNarration(nextSnapshot.stageIndex, preferences.audio);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [moveCameraToStage, preferences.audio]);
  nextRef.current = next;

  const replay = useCallback(() => {
    setCompleted(false);
    setEvidence([]);
    const fresh = experienceRef.current.restart();
    snapshotRef.current = fresh;
    setSnapshot(fresh);
    sceneApiRef.current?.setStage(fresh.stageIndex);
    moveCameraToStage(fresh.stageIndex);
    transitionRef.current.reset();
    setScaleDisclosure(scaleDisclosureForStage(fresh.stageIndex));
    playNarration(fresh.stageIndex, preferences.audio);
  }, [moveCameraToStage, preferences.audio]);
  replayRef.current = replay;

  const enterVr = useCallback(async () => {
    if (!rendererRef.current || !('xr' in navigator)) return;
    try {
      const session = await (navigator as Navigator & {
        xr: {
          requestSession(
            mode: string,
            options: XRSessionInit,
          ): Promise<XRSession>;
        };
      }).xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await rendererRef.current.xr.setSession(session);
      setStarted(true);
      playNarration(snapshotRef.current.stageIndex, preferences.audio);
    } catch (error) {
      setRuntimeError(error instanceof Error
        ? error.message
        : 'The headset could not start immersive mode.');
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
      const camera = new THREE.PerspectiveCamera(58, 1, 0.04, 80);
      camera.position.set(0, 1.55, 3.15);
      camera.lookAt(0, 1.05, -0.8);

      host = createWebSimulationRuntime({
        mount: mountElement,
        scene,
        camera,
        updates: {
          fixedUpdate(context) {
            fixedUpdate?.(context);
          },
          renderUpdate(context) {
            renderUpdate?.(context);
          },
        },
      });
      rendererRef.current = host.renderer;
      cameraRef.current = camera;

      const vrRig = createVrPlayerRig({
        renderer: host.renderer,
        scene,
        camera,
        spawn: VR_SPAWN,
        rayColor: '#d9f99d',
      });
      playerRigRef.current = vrRig.rig;
      host.resources.register('pollination-player-rig', () => vrRig.dispose());

      const materialFactory = createMaterialFactory({
        assets: POLLINATION_WORLD.assetManifests[0],
        materials: POLLINATION_WORLD.materials,
        qualityProfileId: host.profile(),
        maxAnisotropy: host.renderer.capabilities.getMaxAnisotropy(),
      });
      const definition = (id: string) => {
        const value = POLLINATION_WORLD.materials.find(item => item.id === id);
        if (!value) throw new Error(`Missing Pollination material ${id}`);
        return value;
      };
      const ids = [
        'soil', 'stem', 'leaf', 'petal-pink', 'petal-violet',
        'bark', 'bee-yellow', 'bee-dark', 'bee-wing', 'pollen',
      ];
      const loaded = await Promise.all(
        ids.map(id => materialFactory.create(definition(id))),
      ) as THREE.MeshStandardMaterial[];
      if (cancelled) {
        materialFactory.dispose();
        await host.dispose();
        return;
      }
      const byId = Object.fromEntries(ids.map((id, index) => [id, loaded[index]]));
      const supplementals: THREE.MeshStandardMaterial[] = [];
      const derive = (
        source: THREE.MeshStandardMaterial,
        parameters: THREE.MeshStandardMaterialParameters,
      ) => {
        const result = createDerivedMaterial(source, parameters);
        supplementals.push(result);
        return result;
      };
      const materials: PollinationSceneMaterials = {
        soil: byId.soil,
        stem: byId.stem,
        leaf: byId.leaf,
        petalPrimary: byId['petal-pink'],
        petalControl: byId['petal-violet'],
        pollen: byId.pollen,
        flowerCentre: byId.pollen,
        beeYellow: byId['bee-yellow'],
        beeDark: byId['bee-dark'],
        beeWing: byId['bee-wing'],
        fruitSkin: derive(byId['petal-pink'], { color: '#9f1239', roughness: 0.48 }),
        fruitFlesh: derive(byId.pollen, { color: '#fde68a', roughness: 0.76 }),
        seed: byId.bark,
        root: derive(byId.pollen, { color: '#f5e7c8', roughness: 0.88 }),
        path: derive(byId.soil, { color: '#b98b64', roughness: 0.96 }),
        paintedWood: derive(byId.bark, {
          color: '#d9e8d2',
          roughness: 0.78,
          map: null,
          normalMap: null,
          roughnessMap: null,
        }),
        naturalWood: byId.bark,
        grass: derive(byId.leaf, { color: '#4d7c36', roughness: 0.92 }),
        glass: derive(byId['bee-wing'], {
          color: '#d8f3ef',
          transparent: true,
          opacity: 0.28,
          roughness: 0.12,
          depthWrite: false,
          map: null,
          normalMap: null,
          roughnessMap: null,
        }),
        metal: derive(byId['bee-dark'], {
          color: '#687076',
          metalness: 0.78,
          roughness: 0.3,
        }),
        wood: byId.bark,
        bristle: byId.pollen,
        paintedMetal: derive(byId['petal-violet'], {
          color: '#315f67',
          metalness: 0.35,
          roughness: 0.38,
        }),
        rubber: derive(byId['bee-dark'], { color: '#14201d', roughness: 0.9 }),
        paper: derive(byId['petal-pink'], { color: '#f7f4df', roughness: 0.94 }),
        water: derive(byId['bee-wing'], {
          color: '#7dd3fc',
          transparent: true,
          opacity: 0.58,
          roughness: 0.18,
          depthWrite: false,
        }),
      };
      host.resources.register('pollination-materials', () => {
        for (const material of supplementals) material.dispose();
        materialFactory.dispose();
      });

      const environment = await createEnvironment({
        renderer: host.renderer,
        scene,
        definition: POLLINATION_WORLD.environments[0],
        assets: POLLINATION_WORLD.assetManifests[0],
      });
      host.resources.register('pollination-environment', () => environment.dispose());

      const scientificModels = createScientificModelRegistry();
      scientificModels.register({
        manifest: POLLINATION_WORLD.scientificModels[0],
        evaluate: input => pollinationSnapshotForStage(Number(input.completedStage)),
      });
      const modelFailures = scientificModels.verify('pollination-event-graph');
      if (modelFailures.length > 0) throw new Error(modelFailures.join('; '));
      host.resources.register('pollination-models', () => scientificModels.dispose());

      const world = createPollinationScene({
        scene,
        materials,
        profileId: host.profile(),
      });
      sceneApiRef.current = world;
      host.resources.register('pollination-scene', () => world.dispose());

      // ── Guided camera: moves once per real stage transition (mirroring
      // Circuit), and closer still onto whatever the learner just selected.
      // Rotation itself is always free — the off-screen arrow (below) is
      // the only cue for "look over there", so the camera never fights the
      // learner's own look-around input ──────────────────────────────────
      const guidedCamera = createGuidedCamera(camera, host.renderer.domElement, {
        transitionSeconds: 0.7,
      });
      guidedCamera.focusOn(DEFAULT_POLLINATION_FRAME, { animate: false });
      guidedCameraRef.current = guidedCamera;
      host.resources.register('pollination-camera', () => {
        guidedCameraRef.current = null;
        guidedCamera.dispose();
      });

      // ── Selection: one shared raycasting/highlight system for mouse + XR ─
      const selectObject = (
        object: THREE.Object3D | undefined,
        source: NormalizedInputSource,
      ) => {
        const actionId = actionForObject(object);
        const activeSnapshot = snapshotRef.current;
        const activeStage = experienceDefinition.stages[activeSnapshot.stageIndex];
        if (
          actionId
          && activeStage.requiredActionIds.includes(actionId)
          && !activeSnapshot.performedActionIds.includes(actionId)
        ) {
          performRef.current(actionId, source, object?.name);
        }
      };

      const hud = createVrHudPanel({ scene });
      host.resources.register('pollination-vr-hud', () => hud.dispose());

      const interactionSystem = createInteractionSystem({
        camera,
        domElement: host.renderer.domElement,
        xrControllers: vrRig.controllers,
        onSelect: (id, object, source) => {
          const hudButton = hud.buttonIdFor(id);
          if (hudButton) {
            if (hudButton === 'previous') previousRef.current();
            if (hudButton === 'next') nextRef.current();
            if (hudButton === 'replay') replayRef.current();
            if (hudButton === 'exit') void host!.renderer.xr.getSession()?.end();
            return;
          }
          selectObject(object, source);
          interactionSystem.setSelected(id);
          guidedCamera.focusOn(computeFocusFrame(object, camera, { fitPadding: 2.1 }));
        },
      });
      for (const mesh of Object.values(hud.buttons)) {
        interactionSystem.register(mesh.name, mesh);
      }
      for (const targetName of Object.keys(ACTION_BY_TARGET)) {
        const target = world.root.getObjectByName(targetName);
        if (target) interactionSystem.register(targetName, target, { highlightColor: '#ffe08a' });
      }
      host.resources.register('pollination-interaction', () => interactionSystem.dispose());

      const locomotion = createVrLocomotion({
        renderer: host.renderer,
        rig: vrRig.rig,
        onBack: () => {
          if (snapshotRef.current.stageIndex > 0) previousRef.current();
          else void host!.renderer.xr.getSession()?.end();
        },
      });

      const vrHudContent = (): VrHudContent => {
        if (completedRef.current) {
          return {
            eyebrow: 'Lesson complete',
            title: 'Today you learned',
            body: 'Great field work! Review what your experiment proved.',
            bullets: evidenceRef.current,
            buttons: ['replay', 'exit'],
          };
        }
        const active = snapshotRef.current;
        const focusAction = focusActionRef.current;
        return {
          eyebrow: `Stage ${active.stageIndex + 1} / ${active.stageCount}`,
          title: active.stageTitle,
          body: active.cue,
          hint: focusAction
            ? `Do: ${ACTION_LABELS[focusAction]}`
            : 'Stage complete — press Next ▶',
          buttons: active.stageIndex > 0 ? ['previous', 'next'] : ['next'],
        };
      };

      const projectedFocus = new THREE.Vector3();
      renderUpdate = context => {
        world.update(context.frameDeltaSeconds, context.elapsedSeconds);
        transitionRef.current.update(context.frameDeltaSeconds * 1.8);

        // The next required action's target pulses persistently — in both
        // browser and VR — so there's always a positive "click this" cue,
        // not just a reactive hover highlight or an off-screen arrow.
        const suggestedTargetName = focusActionRef.current
          ? TARGET_BY_ACTION[focusActionRef.current]
          : undefined;
        interactionSystem.setSuggested(suggestedTargetName);
        interactionSystem.update(context.elapsedSeconds);

        if (host!.renderer.xr.isPresenting) {
          locomotion.update(context.frameDeltaSeconds);
          interactionSystem.updateXrHover();
          hud.setVisible(true);
          hud.setContent(vrHudContent());
          hud.update(host!.renderer.xr.getCamera(), context.frameDeltaSeconds);
        } else {
          hud.setVisible(false);
          guidedCamera.update(context.frameDeltaSeconds);
          const focusTarget = suggestedTargetName
            ? world.root.getObjectByName(suggestedTargetName)
            : undefined;
          if (focusTarget) {
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
  }, []);

  return (
    <SimulationExperienceShell
      title="Pollinator Garden Field Study"
      classContext="Class 6 Science · Reproduction in Plants"
      objective="Prove how pollen transfer leads to fruit and seed formation by comparing a pollinated flower with an untouched control."
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
      focusGuide={{
        direction: focusVisibility.direction,
        label: remainingActions.length > 0
          ? `Look toward: ${ACTION_LABELS[remainingActions[0]]}`
          : 'Look toward the experiment result',
        visible: started && !completed && focusVisibility.visible,
      }}
      error={runtimeError || undefined}
    >
      <div ref={mountRef} className="pollination-world-mount" />
      {started && remainingActions.length > 0 && (
        <section
          className="pollination-action-tray"
          aria-label="Field experiment actions"
        >
          <span>Field action</span>
          <strong>
            {ACTION_LABELS[remainingActions[0]]}
          </strong>
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
