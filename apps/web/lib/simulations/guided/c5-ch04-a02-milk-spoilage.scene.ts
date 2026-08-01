import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  MILK_SPOILAGE_GUIDANCE,
  MILK_SPOILAGE_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createMilkSpoilageWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: MILK_SPOILAGE_GUIDANCE,
    metadata: MILK_SPOILAGE_SCENE_METADATA,
  });
}

export const MILK_SPOILAGE_SCENE_ADAPTER = createGuidedSceneAdapter(
  MILK_SPOILAGE_GUIDANCE,
  createMilkSpoilageWorld,
);
export const MILK_SPOILAGE_SCENE_ENTRY = Object.freeze({
  moduleId: MILK_SPOILAGE_GUIDANCE.moduleId,
  createWorld: createMilkSpoilageWorld,
  adapter: MILK_SPOILAGE_SCENE_ADAPTER,
});
export default MILK_SPOILAGE_SCENE_ADAPTER;
