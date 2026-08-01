import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  SNOW_MOUNTAIN_CLIMBING_GUIDANCE,
  SNOW_MOUNTAIN_CLIMBING_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createSnowMountainClimbingWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: SNOW_MOUNTAIN_CLIMBING_GUIDANCE,
    metadata: SNOW_MOUNTAIN_CLIMBING_SCENE_METADATA,
  });
}

export const SNOW_MOUNTAIN_CLIMBING_SCENE_ADAPTER = createGuidedSceneAdapter(
  SNOW_MOUNTAIN_CLIMBING_GUIDANCE,
  createSnowMountainClimbingWorld,
);
export const SNOW_MOUNTAIN_CLIMBING_SCENE_ENTRY = Object.freeze({
  moduleId: SNOW_MOUNTAIN_CLIMBING_GUIDANCE.moduleId,
  createWorld: createSnowMountainClimbingWorld,
  adapter: SNOW_MOUNTAIN_CLIMBING_SCENE_ADAPTER,
});
export default SNOW_MOUNTAIN_CLIMBING_SCENE_ADAPTER;
