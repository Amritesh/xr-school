import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  RIVER_CROSSING_GUIDANCE,
  RIVER_CROSSING_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createRiverCrossingWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: RIVER_CROSSING_GUIDANCE,
    metadata: RIVER_CROSSING_SCENE_METADATA,
  });
}

export const RIVER_CROSSING_SCENE_ADAPTER = createGuidedSceneAdapter(
  RIVER_CROSSING_GUIDANCE,
  createRiverCrossingWorld,
);
export const RIVER_CROSSING_SCENE_ENTRY = Object.freeze({
  moduleId: RIVER_CROSSING_GUIDANCE.moduleId,
  createWorld: createRiverCrossingWorld,
  adapter: RIVER_CROSSING_SCENE_ADAPTER,
});
export default RIVER_CROSSING_SCENE_ADAPTER;
