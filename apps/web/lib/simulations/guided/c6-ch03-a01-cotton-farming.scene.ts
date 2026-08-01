import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  COTTON_FARMING_GUIDANCE,
  COTTON_FARMING_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createCottonFarmingWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: COTTON_FARMING_GUIDANCE,
    metadata: COTTON_FARMING_SCENE_METADATA,
  });
}

export const COTTON_FARMING_SCENE_ADAPTER = createGuidedSceneAdapter(
  COTTON_FARMING_GUIDANCE,
  createCottonFarmingWorld,
);
export const COTTON_FARMING_SCENE_ENTRY = Object.freeze({
  moduleId: COTTON_FARMING_GUIDANCE.moduleId,
  createWorld: createCottonFarmingWorld,
  adapter: COTTON_FARMING_SCENE_ADAPTER,
});
export default COTTON_FARMING_SCENE_ADAPTER;
