import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  FOOD_SPOILAGE_GUIDANCE,
  FOOD_SPOILAGE_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createFoodSpoilageWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: FOOD_SPOILAGE_GUIDANCE,
    metadata: FOOD_SPOILAGE_SCENE_METADATA,
  });
}

export const FOOD_SPOILAGE_SCENE_ADAPTER = createGuidedSceneAdapter(
  FOOD_SPOILAGE_GUIDANCE,
  createFoodSpoilageWorld,
);
export const FOOD_SPOILAGE_SCENE_ENTRY = Object.freeze({
  moduleId: FOOD_SPOILAGE_GUIDANCE.moduleId,
  createWorld: createFoodSpoilageWorld,
  adapter: FOOD_SPOILAGE_SCENE_ADAPTER,
});
export default FOOD_SPOILAGE_SCENE_ADAPTER;
