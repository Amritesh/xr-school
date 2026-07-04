'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
import {
  isQuestBackPressed,
  updateButtonLatch,
  updateSnapTurn,
} from '@/lib/xrNavigation';
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
import { createToolInteraction } from '@/lib/world-builder/toolInteraction';
import {
  createWebSimulationRuntime,
  type WebSimulationRuntime,
  type WebSimulationUpdates,
} from '@/lib/world-builder/webSimulationRuntime';

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
  const playerRigRef = useRef<THREE.Group | null>(null);
  const sceneApiRef = useRef<PollinationScene | null>(null);
  const experienceRef = useRef<PollinationExperience>(createPollinationExperience());
  const transitionRef = useRef<ScaleTransition>(createScaleTransition());
  const snapshotRef = useRef<LessonSnapshot>(experienceRef.current.snapshot());
  const performRef = useRef<(actionId: string, source: NormalizedInputSource, target?: string) => void>(() => {});
  const previousRef = useRef<() => void>(() => {});

  const [snapshot, setSnapshot] = useState(snapshotRef.current);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [scaleDisclosure, setScaleDisclosure] = useState(
    'The garden and tools are shown at life size.',
  );

  const experienceDefinition = POLLINATION_WORLD.experienceDefinitions![0];
  const currentStage = experienceDefinition.stages[snapshot.stageIndex];
  const remainingActions = useMemo(
    () => currentStage.requiredActionIds.filter(
      actionId => !snapshot.performedActionIds.includes(actionId),
    ),
    [currentStage, snapshot.performedActionIds],
  );

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
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [applyVisualAction, experienceDefinition]);
  performRef.current = performAction;

  const previous = useCallback(() => {
    const next = experienceRef.current.previous();
    snapshotRef.current = next;
    setSnapshot(next);
    sceneApiRef.current?.setStage(next.stageIndex);
    playNarration(next.stageIndex, preferences.audio);
  }, [preferences.audio]);
  previousRef.current = previous;

  const next = useCallback(() => {
    if (!snapshotRef.current.stageComplete) return;
    try {
      const nextSnapshot = experienceRef.current.next();
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      sceneApiRef.current?.setStage(nextSnapshot.stageIndex);
      transitionRef.current.reset();
      setScaleDisclosure(nextSnapshot.stageIndex === 4
        ? 'The next view enlarges the internal flower structures.'
        : 'The garden and tools are shown at life size.');
      playNarration(nextSnapshot.stageIndex, preferences.audio);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [preferences.audio]);

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
          fixedUpdate(context) {
            fixedUpdate?.(context);
          },
          renderUpdate(context) {
            renderUpdate?.(context);
          },
        },
      });
      rendererRef.current = host.renderer;

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

      const controls = new OrbitControls(camera, host.renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.055;
      controls.target.set(0, 1.02, -0.92);
      controls.minDistance = 1.25;
      controls.maxDistance = 6;
      controls.maxPolarAngle = Math.PI * 0.49;
      host.resources.register('pollination-orbit-controls', () => controls.dispose());

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const selectObject = (
        object: THREE.Object3D | undefined,
        source: NormalizedInputSource,
      ) => {
        const actionId = actionForObject(object);
        if (actionId) performRef.current(actionId, source, object?.name);
      };
      const onPointerUp = (event: PointerEvent) => {
        const bounds = host!.renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        selectObject(raycaster.intersectObject(world.root, true)[0]?.object, 'mouse');
      };
      host.renderer.domElement.addEventListener('pointerup', onPointerUp);
      host.resources.register(
        'pollination-pointer',
        () => host?.renderer.domElement.removeEventListener('pointerup', onPointerUp),
      );

      const controllerRayGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -2.5),
      ]);
      const controllerRayMaterial = new THREE.LineBasicMaterial({
        color: '#d9f99d',
        transparent: true,
        opacity: 0.72,
      });
      const controllerMatrix = new THREE.Matrix4();
      const controllers = [0, 1].map(index => {
        const controller = host!.renderer.xr.getController(index);
        controller.name = `quest-controller-${index}`;
        controller.add(new THREE.Line(controllerRayGeometry, controllerRayMaterial));
        playerRig.add(controller);
        const onSelect = () => {
          controllerMatrix.identity().extractRotation(controller.matrixWorld);
          raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
          raycaster.ray.direction.set(0, 0, -1).applyMatrix4(controllerMatrix);
          selectObject(
            raycaster.intersectObject(world.root, true)[0]?.object,
            'xr-controller',
          );
        };
        controller.addEventListener('selectstart', onSelect);
        host!.resources.register(
          `pollination-controller-${index}`,
          () => controller.removeEventListener('selectstart', onSelect),
        );
        return controller;
      });
      host.resources.register('pollination-controller-rays', () => {
        controllerRayGeometry.dispose();
        controllerRayMaterial.dispose();
        for (const controller of controllers) playerRig.remove(controller);
      });

      const snapTurnLatches = [false, false];
      const backButtonLatches = [false, false];
      renderUpdate = context => {
        world.update(context.frameDeltaSeconds, context.elapsedSeconds);
        transitionRef.current.update(context.frameDeltaSeconds * 1.8);
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
            if (back.pressed) previousRef.current();
          });
        } else {
          controls.update();
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
      evidence={[...evidence, scaleDisclosure]}
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
          <small>{scaleDisclosure}</small>
        </section>
      )}
    </SimulationExperienceShell>
  );
}
