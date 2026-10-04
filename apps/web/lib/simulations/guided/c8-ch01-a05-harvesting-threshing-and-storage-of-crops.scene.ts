import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  HARVESTING_THRESHING_STORAGE_GUIDANCE,
  HARVESTING_THRESHING_STORAGE_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createHarvestingThreshingStorageSceneWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: HARVESTING_THRESHING_STORAGE_GUIDANCE,
    metadata: HARVESTING_THRESHING_STORAGE_SCENE_METADATA,
  });
}

export const HARVESTING_THRESHING_STORAGE_SCENE_ADAPTER = createGuidedSceneAdapter(
  HARVESTING_THRESHING_STORAGE_GUIDANCE,
  createHarvestingThreshingStorageSceneWorld,
);

export const HARVESTING_THRESHING_STORAGE_SCENE_ENTRY = Object.freeze({
  moduleId: HARVESTING_THRESHING_STORAGE_GUIDANCE.moduleId,
  createWorld: createHarvestingThreshingStorageSceneWorld,
  adapter: HARVESTING_THRESHING_STORAGE_SCENE_ADAPTER,
});

export default HARVESTING_THRESHING_STORAGE_SCENE_ADAPTER;
