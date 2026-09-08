import * as THREE from 'three';
import {
  createFungiNurseryWorld,
  type FungiNurseryWorld,
  type FungiNurseryWorldSnapshot,
} from '@/lib/world-builder/fungiNurseryWorld';
import {
  createFungiCameraController,
  type CameraSafeInsets,
  type FungiCameraController,
  type FungiCameraSnapshot,
} from './fungiCameraController';
import {
  createFungiExperienceDirector,
  type FungiDirectorAction,
  type FungiDirectorSnapshot,
  type FungiExperienceDirector,
  type FungiMissionDescriptor,
  type FungiMissionId,
  type FungiInputSource,
} from './fungiExperienceDirector';
import type { FungalUsefulRole } from '@xr-school/simulation-runtime';
import {
  createFungiInteractionTools,
  type FungiInteractionTools,
  type FungiManipulation,
  type FungiToolSnapshot,
} from './fungiInteractionTools';

export interface FungiViewerControllerOptions {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  reducedMotion?: boolean;
  seed?: number;
}

export interface FungiViewerSnapshot {
  director: FungiDirectorSnapshot;
  tools: FungiToolSnapshot;
  world: FungiNurseryWorldSnapshot;
  camera: FungiCameraSnapshot;
  mission: FungiMissionDescriptor;
}

export interface FungiViewerController {
  root: THREE.Group;
  tools: FungiInteractionTools;
  /** The camera this controller drives, for projecting guidance. */
  camera: THREE.PerspectiveCamera;
  /** Named objects a learner can select, by mouse or by controller ray. */
  pickTargets: Record<string, THREE.Object3D>;
  /** World bounds of a pickable, for framing and for the edge guide. */
  pickBounds(pickId: string): THREE.Box3 | undefined;
  /** What the learner clicked in the world, or undefined for empty space. */
  pickAt(normalizedX: number, normalizedY: number): string | undefined;
  /** Acts on a picked object in the way the current mission expects. */
  interactWith(pickId: string, source: FungiInputSource): FungiViewerSnapshot;
  /** One plain sentence naming the very next thing to do. */
  nextStep(): string;
  /** Which object the arrow is currently pointing at, if any. */
  attentionTarget(): string | undefined;
  manipulate(
    manipulation: FungiManipulation,
    source: FungiInputSource,
  ): FungiViewerSnapshot;
  act(action: FungiDirectorAction): FungiViewerSnapshot;
  setViewport(width: number, height: number, safeInsets: CameraSafeInsets): void;
  setReducedMotion(reduced: boolean): void;
  focusSpecimen(): void;
  resetExperiment(): FungiViewerSnapshot;
  resetCamera(): FungiViewerSnapshot;
  restartJourney(): FungiViewerSnapshot;
  update(deltaSeconds: number, elapsedSeconds: number): void;
  snapshot(): FungiViewerSnapshot;
  dispose(): void;
}

/** How far above the object the eye sits, as a fraction of the shot distance. */
const CLOSE_UP_RISE = 0.42;
/** World units of sky kept above a pickable so its arrow stays in shot. */
const POINTER_HEADROOM = 1.1;

const SPECIMEN_PICKS = new Set(['mushroom', 'bread-mould', 'green-plant']);
const SAFETY_PICKS = new Set(['fresh-item', 'mouldy-item']);
/** The script's three workplaces, and the role each one stands for. */
const ROLE_BY_PLACE: Record<string, FungalUsefulRole> = {
  bakery: 'food',
  laboratory: 'medicine',
  'compost-pit': 'decomposer',
};
const SPECIMEN_ORDER = ['mushroom', 'bread-mould', 'green-plant'] as const;
const SPECIMEN_LABEL: Record<string, string> = {
  mushroom: 'mushroom',
  'bread-mould': 'mouldy bread',
  'green-plant': 'green plant',
};

function boundsOf(mission: FungiMissionDescriptor): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(...mission.focusBounds.minimum),
    new THREE.Vector3(...mission.focusBounds.maximum),
  );
}

function poseOf(mission: FungiMissionDescriptor) {
  return {
    position: [...mission.cameraPose.position] as [number, number, number],
    target: [...mission.cameraPose.target] as [number, number, number],
  };
}

/**
 * The single owner of the fungi lab: one director, one persistent world, one
 * camera, one tool set. The React component composes this and renders its
 * snapshots — it never holds simulation state of its own.
 */
export function createFungiViewerController(
  options: FungiViewerControllerOptions,
): FungiViewerController {
  const { camera, domElement } = options;
  let disposed = false;

  const director: FungiExperienceDirector = createFungiExperienceDirector();
  const tools: FungiInteractionTools = createFungiInteractionTools(director);
  const world: FungiNurseryWorld = createFungiNurseryWorld({
    ...(options.seed === undefined ? {} : { seed: options.seed }),
    reducedMotion: options.reducedMotion ?? false,
  });
  const cameraController: FungiCameraController = createFungiCameraController(
    camera,
    domElement,
    { reducedMotion: options.reducedMotion ?? false },
  );

  let framedMissionId: FungiMissionId | undefined;
  let framedPickId: string | undefined;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const assertLive = () => {
    if (disposed) throw new Error('fungi viewer controller has been disposed');
  };

  const projectWorld = () => {
    world.project(tools.worldProjection());
  };

  /**
   * A close, slightly-above-eye-level shot of one object, approached from the
   * mission's authored side. Children are shown the thing itself rather than
   * the whole bench it happens to sit on.
   */
  function closeUpPose(mission: FungiMissionDescriptor, box: THREE.Box3) {
    const centre = box.getCenter(new THREE.Vector3());
    const away = new THREE.Vector3(
      mission.cameraPose.position[0] - mission.cameraPose.target[0],
      0,
      mission.cameraPose.position[2] - mission.cameraPose.target[2],
    );
    if (away.lengthSq() < 1e-6) away.set(0, 0, 1);
    away.normalize();

    const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.25);
    const distance = radius * 4.2;
    return {
      position: [
        centre.x + away.x * distance,
        centre.y + distance * CLOSE_UP_RISE,
        centre.z + away.z * distance,
      ] as [number, number, number],
      target: [centre.x, centre.y, centre.z] as [number, number, number],
    };
  }

  /**
   * Re-frames when the journey moves on, and also when the arrow moves to a
   * different object — the camera looks at whatever the learner must click.
   */
  const frameMission = (animate: boolean) => {
    const mission = director.descriptor();
    const pickId = attentionTarget();
    if (mission.id === framedMissionId && pickId === framedPickId) return;
    framedMissionId = mission.id;
    framedPickId = pickId;

    const box = pickId === undefined ? undefined : world.pickBounds(pickId);
    if (box !== undefined) {
      // The pointer hovers above the object, so frame the room it needs too —
      // otherwise the very arrow telling a child where to look is cropped off.
      box.max.y += POINTER_HEADROOM;
      cameraController.focusBounds(box, closeUpPose(mission, box), { animate });
      return;
    }
    cameraController.focusBounds(boundsOf(mission), poseOf(mission), { animate });
  };

  /**
   * The single object the learner should click next. Driving the in-world
   * arrow from real evidence means the pointer is never stale or wrong.
   */
  function attentionTarget(): string | undefined {
    const state = director.snapshot();
    const evidence = state.evidence;
    switch (state.missionId) {
      case 'diagnose': {
        if (evidence.diagnose.firstPrediction === undefined) return undefined;
        return SPECIMEN_ORDER.find(
          (id) => !evidence.diagnose.lensCrossings.includes(id),
        );
      }
      case 'mycelium':
        return ['log-branch-near', 'log-branch-middle', 'log-branch-far'].find(
          (id) => !evidence.mycelium.branchTraces.includes(id),
        );
      case 'useful-fungi': {
        if (evidence.usefulFungi.doughObservations.length === 0) return 'yeast-jar';
        const carried = tools.snapshot().grabbedActorId;
        if (carried === 'yeast') return 'bakery';
        if (carried === 'antibiotic-producing-fungus') return 'laboratory';
        if (carried === 'saprotrophic-fungus') return 'compost-pit';
        return undefined;
      }
      case 'safety': {
        if (evidence.safety.maximumScanDepth <= 0.5) return undefined;
        return ['mouldy-item', 'fresh-item'].find(
          (id) => evidence.safety.classificationByItem[id] === undefined,
        );
      }
      default:
        return undefined;
    }
  }

  const settle = (): FungiViewerSnapshot => {
    projectWorld();
    world.setAttention(attentionTarget());
    frameMission(true);
    return snapshot();
  };

  function manipulate(
    manipulation: FungiManipulation,
    source: FungiInputSource,
  ): FungiViewerSnapshot {
    assertLive();
    tools.apply(manipulation, source);
    return settle();
  }

  function act(action: FungiDirectorAction): FungiViewerSnapshot {
    assertLive();
    director.dispatch(action);
    return settle();
  }

  function setViewport(
    width: number,
    height: number,
    safeInsets: CameraSafeInsets,
  ): void {
    assertLive();
    cameraController.setViewport(width, height, safeInsets);
  }

  function setReducedMotion(reduced: boolean): void {
    assertLive();
    world.setReducedMotion(reduced);
  }

  function focusSpecimen(): void {
    assertLive();
    cameraController.focusSpecimen();
  }

  function resetExperiment(): FungiViewerSnapshot {
    assertLive();
    const boundary = director.descriptor().resetBoundary;
    director.resetExperiment();
    tools.reset(boundary);
    projectWorld();
    return snapshot();
  }

  function resetCamera(): FungiViewerSnapshot {
    assertLive();
    director.resetCameraRequest();
    cameraController.resetView();
    return snapshot();
  }

  function restartJourney(): FungiViewerSnapshot {
    assertLive();
    director.restartJourney();
    tools.reset('mission');
    framedMissionId = undefined;
    framedPickId = undefined;
    projectWorld();
    world.setAttention(attentionTarget());
    frameMission(true);
    return snapshot();
  }

  function pickAt(normalizedX: number, normalizedY: number): string | undefined {
    assertLive();
    pointer.set(normalizedX * 2 - 1, -(normalizedY * 2 - 1));
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(world.root, true);
    for (const hit of hits) {
      let cursor: THREE.Object3D | null = hit.object;
      while (cursor) {
        if (cursor.name.startsWith('pick-')) return cursor.name.slice(5);
        cursor = cursor.parent;
      }
    }
    return undefined;
  }

  /**
   * Clicking a thing means the obvious thing for the mission you are on, so a
   * learner never has to translate an intention into an abstract control.
   */
  function interactWith(
    pickId: string,
    source: FungiInputSource,
  ): FungiViewerSnapshot {
    assertLive();
    const missionId = director.snapshot().missionId;
    if (missionId === 'diagnose' && SPECIMEN_PICKS.has(pickId)) {
      tools.apply({ type: 'inspect-specimen', specimenId: pickId as never }, source);
    } else if (missionId === 'mycelium' && pickId.startsWith('log-branch-')) {
      tools.apply({ type: 'trace-branch', branchId: pickId }, source);
    } else if (missionId === 'useful-fungi' && pickId === 'yeast-jar') {
      tools.apply({ type: 'pipette-drop', vesselId: 'yeast' }, source);
    } else if (missionId === 'useful-fungi' && pickId === 'control-jar') {
      tools.apply({ type: 'pipette-drop', vesselId: 'control' }, source);
    } else if (missionId === 'useful-fungi' && ROLE_BY_PLACE[pickId] !== undefined) {
      // Carrying an organism to a workplace is the answer: the bakery means
      // food, the laboratory medicine, the compost pit decomposition.
      const carried = tools.snapshot().grabbedActorId;
      if (carried !== undefined) {
        tools.apply(
          { type: 'role-drop', actorId: carried, role: ROLE_BY_PLACE[pickId]! },
          source,
        );
      }
    } else if (missionId === 'safety' && SAFETY_PICKS.has(pickId)) {
      director.dispatch({
        actionId: 'safety.classify',
        source,
        targetId: pickId,
        value: pickId === 'mouldy-item' ? 'do-not-eat' : 'check-use',
      });
    }
    return settle();
  }

  function nextStep(): string {
    const state = director.snapshot();
    const evidence = state.evidence;
    switch (state.missionId) {
      case 'diagnose': {
        if (evidence.diagnose.firstPrediction === undefined) {
          return 'Answer the question first: which two are fungi?';
        }
        const left = SPECIMEN_ORDER.filter(
          (id) => !evidence.diagnose.lensCrossings.includes(id),
        );
        if (left.length > 0) {
          return `Now click the ${SPECIMEN_LABEL[left[0]!]} to look at it closely.`;
        }
        return 'You have looked at all three. Choose the answer you now believe.';
      }
      case 'mycelium': {
        const traced = evidence.mycelium.branchTraces.length;
        if (traced < 3) {
          return `Click a glowing thread on the log to trace it (${traced} of 3 done).`;
        }
        return 'Answer: are these separate roots, or one connected network?';
      }
      case 'spore-flight':
        return evidence.sporeFlight.landingOutcomes.length === 0
          ? 'Set the fan to zero and release a spore. Watch where it lands.'
          : 'Now turn the fan up and release again, to reach the moist bread.';
      case 'growth-chamber': {
        const saved = state.experiment.savedTrials.length;
        if (saved < 2) {
          return `Set the dials, then press Save trial (${saved} of 2 saved). Change only ONE dial for the second trial.`;
        }
        if (evidence.growth.comparisonHistory.length === 0) {
          return 'Press Compare last two to see which dial mattered.';
        }
        return 'Pick which dial changed the growth, then press Record.';
      }
      case 'useful-fungi':
        return evidence.usefulFungi.doughObservations.length === 0
          ? 'Click the yeast dough jar, then raise the proving hours.'
          : 'Give each fungus its job: food, medicine, or decomposer.';
      case 'safety': {
        if (evidence.safety.maximumScanDepth <= 0.5) {
          return 'Drag the scan depth slider deeper to see under the mould patch.';
        }
        const classified = Object.keys(evidence.safety.classificationByItem).length;
        if (classified < 2) {
          return 'Click each food item to say whether it is safe to eat.';
        }
        return 'Answer: is cutting the mould off enough?';
      }
      case 'recommendation': {
        if (evidence.recommendation.storageChanges.length === 0) {
          return 'Answer: where should the food be stored?';
        }
        if (evidence.recommendation.citedTrialIds.length === 0) {
          return 'Press Cite trial-1 to back up your answer with your own experiment.';
        }
        return 'Last step: say how spoilage differs from useful rotting.';
      }
      default:
        return 'Follow the question shown on the card.';
    }
  }

  function update(deltaSeconds: number, elapsedSeconds: number): void {
    if (disposed) return;
    cameraController.update(deltaSeconds);
    world.update(deltaSeconds, elapsedSeconds);
  }

  function snapshot(): FungiViewerSnapshot {
    return {
      director: director.snapshot(),
      tools: tools.snapshot(),
      world: world.snapshot(),
      camera: cameraController.snapshot(),
      mission: director.descriptor(),
    };
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    cameraController.dispose();
    world.dispose();
  }

  projectWorld();
  world.setAttention(attentionTarget());
  frameMission(false);

  return {
    root: world.root,
    tools,
    camera,
    pickTargets: world.pickTargets,
    pickBounds: (pickId: string) => world.pickBounds(pickId),
    pickAt,
    interactWith,
    nextStep,
    attentionTarget,
    manipulate,
    act,
    setViewport,
    setReducedMotion,
    focusSpecimen,
    resetExperiment,
    resetCamera,
    restartJourney,
    update,
    snapshot,
    dispose,
  };
}
