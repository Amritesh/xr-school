import type * as THREE from 'three';
import * as THREE_RUNTIME from 'three';
import {
  createResourceRegistry,
  createWorldRuntime,
  type WorldRuntime,
  type LessonSnapshot,
  type ResourceRegistry,
} from '@xr-school/simulation-runtime';
import {
  validateNormalizedAction,
  type NormalizedAction,
  type QualityProfileId,
  type SimulationNarrationManifest,
} from '@xr-school/simulation-schema';
import type {
  SimulationInteractionRegistry,
  SimulationLaunchPreferences,
  SimulationSceneAdapter,
} from '../scene/types.js';
import {
  createNarrationController,
  type SimulationNarrationController,
} from '../audio/createNarrationController.js';
import {
  createWebInputRouter,
  type WebInputRouter as SimulationInputRouter,
} from '../input/createWebInputRouter.js';
import { detectDeviceProfile } from '../device/detectDeviceProfile.js';
import { createPresentationPipeline } from '../presentation/createPresentationPipeline.js';
import { createVrLocomotion } from '../vr/vrLocomotion.js';

export interface SimulationPresentation {
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  resize(width: number, height: number, pixelRatio: number): void;
  setQualityProfile(profileId: QualityProfileId): void;
  dispose(): void;
}

export interface SimulationHostNavigationConfig {
  movementBounds: THREE.Box3;
  teleportStepMeters?: number;
}

export interface SimulationHostConfig {
  mount: HTMLElement;
  adapter: SimulationSceneAdapter;
  preferences: SimulationLaunchPreferences;
  narration: SimulationNarrationManifest;
  navigation?: SimulationHostNavigationConfig;
  onAction?(action: NormalizedAction): void;
  onEvidence?(evidenceId: string): void;
  onProfileChange?(profileId: QualityProfileId): void;
}

export interface SimulationHost {
  renderer: THREE.WebGLRenderer;
  resources: ResourceRegistry;
  initialize(): Promise<void>;
  profile(): QualityProfileId;
  dispatch(action: NormalizedAction): void;
  applySnapshot(snapshot: LessonSnapshot): void;
  enterVr(): Promise<void>;
  focusTarget(): THREE.Object3D | undefined;
  narration: SimulationNarrationController;
  dispose(): Promise<void>;
}

export interface SimulationHostDependencies {
  createRenderer(options?: THREE.WebGLRendererParameters): THREE.WebGLRenderer;
  createPresentation(
    renderer: THREE.WebGLRenderer,
    initialProfile: QualityProfileId,
  ): SimulationPresentation;
  createNarration(
    manifest: SimulationNarrationManifest,
  ): SimulationNarrationController;
  createInput(config: {
    domElement: HTMLElement;
    camera: THREE.PerspectiveCamera;
    currentSnapshot(): Pick<LessonSnapshot, 'stageId'>;
    dispatch(action: NormalizedAction): void;
    xrControllers: THREE.XRTargetRaySpace[];
    now(): number;
  }): SimulationInputRouter;
  createResizeObserver(callback: () => void): {
    observe(target: Element): void;
    disconnect(): void;
  };
  observeVisibility(callback: (hidden: boolean) => void): () => void;
  detectProfile(renderer: THREE.WebGLRenderer): QualityProfileId;
  requestXrSession(
    mode: 'immersive-vr',
    options: XRSessionInit,
  ): Promise<XRSession>;
  devicePixelRatio(): number;
  now(): number;
}

export function normalizeLaunchPreferences(
  preferences: SimulationLaunchPreferences,
): SimulationLaunchPreferences {
  return Object.freeze({
    ...preferences,
    turnMode: preferences.reducedMotion && preferences.turnMode === 'smooth'
      ? 'snap'
      : preferences.turnMode,
  });
}

export function createBrowserSimulationHostDependencies(): SimulationHostDependencies {
  return {
    createRenderer: options => new THREE_RUNTIME.WebGLRenderer(options),
    createPresentation: createPresentationPipeline,
    createNarration: createNarrationController,
    createInput: createWebInputRouter,
    createResizeObserver(callback) {
      if (typeof ResizeObserver === 'undefined') {
        throw new Error('ResizeObserver is unavailable in this browser');
      }
      return new ResizeObserver(callback);
    },
    observeVisibility(callback) {
      if (typeof document === 'undefined') return () => {};
      const notify = () => callback(document.hidden);
      document.addEventListener('visibilitychange', notify);
      notify();
      return () => document.removeEventListener('visibilitychange', notify);
    },
    detectProfile: renderer => detectDeviceProfile(renderer),
    requestXrSession(mode, options) {
      const xr = (typeof navigator === 'undefined'
        ? undefined
        : (navigator as Navigator & {
          xr?: {
            requestSession(
              mode: 'immersive-vr',
              options: XRSessionInit,
            ): Promise<XRSession>;
          };
        }).xr);
      if (!xr) throw new Error('WebXR is unavailable in this browser');
      return xr.requestSession(mode, options);
    },
    devicePixelRatio: () => (
      typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio)
    ),
    now: () => globalThis.performance?.now() ?? Date.now(),
  };
}

export function createSimulationHost(
  config: SimulationHostConfig,
  dependencies?: SimulationHostDependencies,
): SimulationHost {
  const resolvedDependencies = dependencies
    ?? createBrowserSimulationHostDependencies();
  const preferences = normalizeLaunchPreferences(config.preferences);
  if (preferences.locomotion === 'boundedTeleport' && !config.navigation?.movementBounds) {
    throw new Error('Bounded teleport requires authored bounds');
  }

  const resources = createResourceRegistry();
  const constructionResources: {
    id: string;
    dispose(): void;
  }[] = [];
  let renderer!: THREE.WebGLRenderer;
  let scene!: THREE.Scene;
  let camera!: THREE.PerspectiveCamera;
  let navigationRig!: THREE.Group;
  let navigation: ReturnType<typeof createVrLocomotion> | undefined;
  const xrControllers: THREE.XRTargetRaySpace[] = [];
  let browserProfileId!: QualityProfileId;
  let profileId!: QualityProfileId;
  let presentation!: SimulationPresentation;
  let narration!: SimulationNarrationController;
  let input!: SimulationInputRouter;
  let resizeObserver!: ReturnType<SimulationHostDependencies['createResizeObserver']>;
  let onSessionStart = () => {};
  let onSessionEnd = () => {};
  let snapshot: LessonSnapshot | undefined;
  let sceneHandle: Awaited<ReturnType<SimulationSceneAdapter['create']>> | undefined;
  let runtime: WorldRuntime | undefined;
  let initialized = false;
  let disposed = false;
  let previousTimeMs: number | undefined;
  let documentHidden = false;

  const dispatch = (action: NormalizedAction) => {
    const errors = validateNormalizedAction(action);
    if (errors.length > 0) throw new Error(errors.join('; '));
    config.onAction?.(action);
  };
  const recordEvidence = (evidenceId: string) => {
    if (!evidenceId.trim()) throw new Error('Evidence ID is required');
    config.onEvidence?.(evidenceId);
  };
  const setProfile = (nextProfileId: QualityProfileId) => {
    if (profileId === nextProfileId) return;
    profileId = nextProfileId;
    presentation.setQualityProfile(profileId);
    config.onProfileChange?.(profileId);
  };
  const resize = () => {
    const width = Math.max(1, config.mount.clientWidth);
    const height = Math.max(1, config.mount.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    presentation.resize(width, height, resolvedDependencies.devicePixelRatio());
  };
  const handleVisibility = (hidden: boolean) => {
    documentHidden = hidden;
    if (!runtime || disposed) return;
    if (hidden && runtime.state() === 'running') {
      runtime.pause();
    } else if (!hidden && runtime.state() === 'paused') {
      previousTimeMs = undefined;
      runtime.resume();
    }
  };

  const rollbackConstruction = (reason: unknown): never => {
    const failures: Error[] = [];
    for (let index = constructionResources.length - 1; index >= 0; index -= 1) {
      try {
        constructionResources[index].dispose();
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(
        [reason, ...failures],
        'Simulation host construction and rollback both failed',
      );
    }
    throw reason;
  };

  try {
    renderer = resolvedDependencies.createRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    constructionResources.push({
      id: 'renderer',
      dispose() {
        renderer.setAnimationLoop(null);
        renderer.xr.removeEventListener('sessionstart', onSessionStart);
        renderer.xr.removeEventListener('sessionend', onSessionEnd);
        renderer.dispose();
        renderer.domElement.remove();
      },
    });
    scene = new THREE_RUNTIME.Scene();
    camera = new THREE_RUNTIME.PerspectiveCamera(58, 1, 0.04, 80);
    navigationRig = new THREE_RUNTIME.Group();
    navigationRig.name = 'simulation-navigation-rig';
    navigationRig.add(camera);
    scene.add(navigationRig);
    constructionResources.push({
      id: 'navigation',
      dispose() {
        navigation?.dispose();
        navigationRig.remove(camera, ...xrControllers);
        scene.remove(navigationRig);
      },
    });
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE_RUNTIME.PCFSoftShadowMap;
    for (const index of [0, 1]) {
      const controller = renderer.xr.getController(index);
      xrControllers.push(controller);
      navigationRig.add(controller);
    }
    navigation = createVrLocomotion({
      renderer,
      rig: navigationRig,
      locomotion: preferences.locomotion,
      movementBounds: config.navigation?.movementBounds,
      teleportStepMeters: config.navigation?.teleportStepMeters,
      turnMode: preferences.turnMode,
      reducedMotion: preferences.reducedMotion,
    });
    browserProfileId = resolvedDependencies.detectProfile(renderer);
    profileId = browserProfileId;

    presentation = resolvedDependencies.createPresentation(renderer, profileId);
    constructionResources.push({
      id: 'presentation',
      dispose: () => presentation.dispose(),
    });
    narration = resolvedDependencies.createNarration(config.narration);
    constructionResources.push({
      id: 'narration',
      dispose: () => narration.dispose(),
    });

    config.mount.replaceChildren(renderer.domElement);
    input = resolvedDependencies.createInput({
      domElement: renderer.domElement,
      camera,
      currentSnapshot() {
        if (!snapshot) throw new Error('Apply a lesson snapshot before accepting input');
        return snapshot;
      },
      dispatch,
      xrControllers,
      now: resolvedDependencies.now,
    });
    constructionResources.push({ id: 'input', dispose: () => input.dispose() });
    resizeObserver = resolvedDependencies.createResizeObserver(resize);
    constructionResources.push({
      id: 'resize-observer',
      dispose: () => resizeObserver.disconnect(),
    });
    const stopVisibilityObserver = resolvedDependencies.observeVisibility(
      handleVisibility,
    );
    constructionResources.push({
      id: 'visibility-observer',
      dispose: stopVisibilityObserver,
    });

    onSessionStart = () => setProfile('questBaseline');
    onSessionEnd = () => setProfile(browserProfileId);
    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);
  } catch (error) {
    rollbackConstruction(error);
  }

  const releaseRegisteredResources: (() => void)[] = [];
  try {
    for (const resource of constructionResources) {
      releaseRegisteredResources.push(resources.register(resource.id, resource.dispose));
    }
  } catch (error) {
    for (const release of releaseRegisteredResources.reverse()) release();
    rollbackConstruction(error);
  }

  runtime = createWorldRuntime({
    resourceRegistry: resources,
    systems: [{
      id: `scene:${config.adapter.id}`,
      dependencies: [],
      async initialize() {
        sceneHandle = await config.adapter.create({
          renderer,
          scene,
          camera,
          resources,
          profile: () => profileId,
          preferences,
          interactions: input.interactions,
          dispatch,
          recordEvidence,
        });
      },
      fixedUpdate(context) {
        sceneHandle?.fixedUpdate?.(context);
      },
      renderUpdate(context) {
        sceneHandle?.renderUpdate?.(context);
        presentation.render(scene, camera);
      },
      dispose() {
        return sceneHandle?.dispose();
      },
    }],
  });

  return {
    renderer,
    resources,
    narration,
    profile: () => profileId,
    async initialize() {
      if (disposed) throw new Error('Simulation host is disposed');
      if (initialized) throw new Error('Simulation host is already initialized');
      initialized = true;
      try {
        await runtime!.initialize();
        if (documentHidden) runtime!.pause();
        resizeObserver.observe(config.mount);
        resize();
        renderer.setAnimationLoop(timeMs => {
          if (runtime!.state() !== 'running') return;
          const deltaSeconds = previousTimeMs === undefined
            ? 0
            : Math.max(0, (timeMs - previousTimeMs) / 1000);
          previousTimeMs = timeMs;
          navigation!.update(deltaSeconds);
          runtime!.advance(deltaSeconds);
        });
      } catch (error) {
        disposed = true;
        try {
          await runtime!.dispose();
        } catch (disposalError) {
          throw new AggregateError(
            [error, disposalError],
            'Simulation host initialization and rollback both failed',
          );
        }
        throw error;
      }
    },
    dispatch,
    applySnapshot(nextSnapshot) {
      if (!sceneHandle) throw new Error('Initialize the simulation host before applying a snapshot');
      snapshot = nextSnapshot;
      sceneHandle.applySnapshot(nextSnapshot);
    },
    async enterVr() {
      if (disposed) throw new Error('Simulation host is disposed');
      if (!initialized) throw new Error('Initialize the simulation host before entering VR');
      const session = await resolvedDependencies.requestXrSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      await renderer.xr.setSession(session);
    },
    focusTarget() {
      return sceneHandle?.focusTarget?.();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await runtime!.dispose();
    },
  };
}
