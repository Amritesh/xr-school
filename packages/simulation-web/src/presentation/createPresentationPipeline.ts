import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  BROWSER_BALANCED_PROFILE,
  BROWSER_ENHANCED_PROFILE,
  QUEST_BASELINE_PROFILE,
  type QualityProfile,
  type QualityProfileId,
} from '@xr-school/simulation-schema';
import type { SimulationPresentation } from '../host/createSimulationHost.js';

const PROFILES: Record<QualityProfileId, QualityProfile> = {
  questBaseline: QUEST_BASELINE_PROFILE,
  browserBalanced: BROWSER_BALANCED_PROFILE,
  browserEnhanced: BROWSER_ENHANCED_PROFILE,
};

export function createPresentationPipeline(
  renderer: THREE.WebGLRenderer,
  initialProfile: QualityProfileId,
): SimulationPresentation {
  let profileId = initialProfile;
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let composer: EffectComposer | undefined;
  let composerScene: THREE.Scene | undefined;
  let composerCamera: THREE.Camera | undefined;

  function disposeComposer() {
    if (!composer) return;
    for (const pass of composer.passes) pass.dispose();
    composer.dispose();
    composer = undefined;
    composerScene = undefined;
    composerCamera = undefined;
  }

  function ensureComposer(scene: THREE.Scene, camera: THREE.Camera) {
    if (composer && composerScene === scene && composerCamera === camera) return composer;
    disposeComposer();
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const hints = (scene.userData.postProcessing ?? {}) as {
      ambientOcclusion?: boolean;
      bloom?: boolean;
    };
    if (profileId === 'browserEnhanced') {
      if (hints.ambientOcclusion !== false) {
        const gtao = new GTAOPass(scene, camera, width, height);
        gtao.output = GTAOPass.OUTPUT.Default;
        composer.addPass(gtao);
      }
      if (hints.bloom !== false) {
        composer.addPass(new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.18,
          0.25,
          0.92,
        ));
      }
    }
    const cappedPixelRatio = Math.min(pixelRatio, PROFILES[profileId].maxPixelRatio);
    composer.addPass(new SMAAPass(width * cappedPixelRatio, height * cappedPixelRatio));
    composer.addPass(new OutputPass());
    composer.setSize(width, height);
    composer.setPixelRatio(cappedPixelRatio);
    composerScene = scene;
    composerCamera = camera;
    return composer;
  }

  function applySize() {
    const profile = PROFILES[profileId];
    const cappedPixelRatio = Math.min(pixelRatio, profile.maxPixelRatio);
    renderer.setPixelRatio(cappedPixelRatio);
    renderer.setSize(width, height);
    composer?.setPixelRatio(cappedPixelRatio);
    composer?.setSize(width, height);
  }

  return {
    render(scene, camera) {
      if (renderer.xr.isPresenting || profileId === 'questBaseline') {
        renderer.render(scene, camera);
        return;
      }
      const composer = ensureComposer(scene, camera);
      composer.render();
    },
    resize(nextWidth, nextHeight, nextPixelRatio) {
      if (!Number.isFinite(nextWidth) || nextWidth <= 0
        || !Number.isFinite(nextHeight) || nextHeight <= 0
        || !Number.isFinite(nextPixelRatio) || nextPixelRatio <= 0) {
        throw new Error('Presentation dimensions and pixel ratio must be positive finite numbers');
      }
      width = nextWidth;
      height = nextHeight;
      pixelRatio = nextPixelRatio;
      applySize();
    },
    setQualityProfile(nextProfile) {
      if (profileId === nextProfile) return;
      profileId = nextProfile;
      disposeComposer();
      applySize();
    },
    dispose: disposeComposer,
  };
}
