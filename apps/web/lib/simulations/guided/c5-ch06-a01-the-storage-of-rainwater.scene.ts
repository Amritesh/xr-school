import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  RAINWATER_STORAGE_GUIDANCE,
  RAINWATER_STORAGE_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createRainwaterStorageWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: RAINWATER_STORAGE_GUIDANCE,
    metadata: RAINWATER_STORAGE_SCENE_METADATA,
  });
}

export const RAINWATER_STORAGE_SCENE_ADAPTER = createGuidedSceneAdapter(
  RAINWATER_STORAGE_GUIDANCE,
  createRainwaterStorageWorld,
);
export const RAINWATER_STORAGE_SCENE_ENTRY = Object.freeze({
  moduleId: RAINWATER_STORAGE_GUIDANCE.moduleId,
  createWorld: createRainwaterStorageWorld,
  adapter: RAINWATER_STORAGE_SCENE_ADAPTER,
});
export default RAINWATER_STORAGE_SCENE_ADAPTER;
