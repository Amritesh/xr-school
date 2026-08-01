import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  DEAD_SEA_SALT_WATER_GUIDANCE,
  DEAD_SEA_SALT_WATER_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createDeadSeaSaltWaterWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: DEAD_SEA_SALT_WATER_GUIDANCE,
    metadata: DEAD_SEA_SALT_WATER_SCENE_METADATA,
  });
}

export const DEAD_SEA_SALT_WATER_SCENE_ADAPTER = createGuidedSceneAdapter(
  DEAD_SEA_SALT_WATER_GUIDANCE,
  createDeadSeaSaltWaterWorld,
);
export const DEAD_SEA_SALT_WATER_SCENE_ENTRY = Object.freeze({
  moduleId: DEAD_SEA_SALT_WATER_GUIDANCE.moduleId,
  createWorld: createDeadSeaSaltWaterWorld,
  adapter: DEAD_SEA_SALT_WATER_SCENE_ADAPTER,
});
export default DEAD_SEA_SALT_WATER_SCENE_ADAPTER;
