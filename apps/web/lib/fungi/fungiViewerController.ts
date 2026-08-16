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

  const assertLive = () => {
    if (disposed) throw new Error('fungi viewer controller has been disposed');
  };

  const projectWorld = () => {
    world.project(tools.worldProjection());
  };

  /** Re-frames only when the journey genuinely moved to another mission. */
  const frameMission = (animate: boolean) => {
    const mission = director.descriptor();
    if (mission.id === framedMissionId) return;
    framedMissionId = mission.id;
    cameraController.focusBounds(boundsOf(mission), poseOf(mission), { animate });
  };

  const settle = (): FungiViewerSnapshot => {
    projectWorld();
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
    projectWorld();
    frameMission(true);
    return snapshot();
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
  frameMission(false);

  return {
    root: world.root,
    tools,
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
