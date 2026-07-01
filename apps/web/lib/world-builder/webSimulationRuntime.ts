import * as THREE from 'three';
import {
  createResourceRegistry,
  type ResourceRegistry,
} from '../../../../packages/simulation-runtime/src/world/resourceRegistry';
import {
  createWorldRuntime,
  type FixedUpdateContext,
  type RenderUpdateContext,
} from '../../../../packages/simulation-runtime/src/world/runtime';
import type {
  QualityProfileId,
} from '../../../../packages/simulation-schema/src/index';
import { detectDeviceProfile } from './deviceProfile';
import { createPresentationPipeline } from './presentationPipeline';

export interface WebSimulationFrame {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  profileId: QualityProfileId;
}

export interface WebSimulationUpdates {
  fixedUpdate?(context: FixedUpdateContext & WebSimulationFrame): void;
  renderUpdate?(context: RenderUpdateContext & WebSimulationFrame): void;
}

export interface WebSimulationRuntimeConfig {
  mount: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  rendererOptions?: THREE.WebGLRendererParameters;
  updates: WebSimulationUpdates;
  onProfileChange?(profileId: QualityProfileId): void;
}

export interface WebSimulationRuntime {
  renderer: THREE.WebGLRenderer;
  resources: ResourceRegistry;
  profile(): QualityProfileId;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

export function createWebSimulationRuntime(
  config: WebSimulationRuntimeConfig,
): WebSimulationRuntime {
  const resourceRegistry = createResourceRegistry();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    ...config.rendererOptions,
  });
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  config.mount.replaceChildren(renderer.domElement);

  const browserProfile = detectDeviceProfile(renderer);
  let profileId: QualityProfileId = browserProfile;
  const pipeline = createPresentationPipeline(renderer, profileId);
  let runtime: ReturnType<typeof createWorldRuntime> | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let previousTime = 0;
  let disposed = false;

  const frame = (): WebSimulationFrame => ({
    renderer,
    scene: config.scene,
    camera: config.camera,
    profileId,
  });

  const onSessionStart = () => {
    profileId = 'questBaseline';
    pipeline.setQualityProfile(profileId);
    config.onProfileChange?.(profileId);
  };
  const onSessionEnd = () => {
    profileId = browserProfile;
    pipeline.setQualityProfile(profileId);
    config.onProfileChange?.(profileId);
  };

  renderer.xr.addEventListener('sessionstart', onSessionStart);
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  resourceRegistry.register('renderer', () => {
    renderer.setAnimationLoop(null);
    renderer.xr.removeEventListener('sessionstart', onSessionStart);
    renderer.xr.removeEventListener('sessionend', onSessionEnd);
    renderer.dispose();
    renderer.domElement.remove();
  });
  resourceRegistry.register('presentation', () => pipeline.dispose());

  return {
    renderer,
    resources: resourceRegistry,
    profile: () => profileId,

    async initialize() {
      if (disposed) throw new Error('Web simulation runtime is disposed');
      if (runtime) {
        throw new Error('Web simulation runtime is already initialized');
      }

      runtime = createWorldRuntime({
        resourceRegistry,
        systems: [{
          id: 'experience',
          dependencies: [],
          initialize() {},
          fixedUpdate(context) {
            config.updates.fixedUpdate?.({ ...context, ...frame() });
          },
          renderUpdate(context) {
            config.updates.renderUpdate?.({ ...context, ...frame() });
            pipeline.render(config.scene, config.camera);
          },
          dispose() {},
        }],
      });
      await runtime.initialize();

      const resize = () => {
        const width = Math.max(1, config.mount.clientWidth);
        const height = Math.max(1, config.mount.clientHeight);
        config.camera.aspect = width / height;
        config.camera.updateProjectionMatrix();
        pipeline.resize(width, height, window.devicePixelRatio);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(config.mount);
      resourceRegistry.register(
        'resize-observer',
        () => resizeObserver?.disconnect(),
      );
      resize();

      renderer.setAnimationLoop(time => {
        if (!runtime || runtime.state() !== 'running') return;
        const deltaSeconds = previousTime === 0
          ? 0
          : Math.max(0, (time - previousTime) / 1000);
        previousTime = time;
        runtime.advance(deltaSeconds);
      });
    },

    async dispose() {
      if (disposed) return;
      disposed = true;
      if (runtime) await runtime.dispose();
      else await resourceRegistry.disposeAll();
    },
  };
}
