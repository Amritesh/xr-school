import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  PITCHER_PLANT_GUIDANCE,
  PITCHER_PLANT_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createPitcherPlantWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: PITCHER_PLANT_GUIDANCE,
    metadata: PITCHER_PLANT_SCENE_METADATA,
  });
}

export const PITCHER_PLANT_SCENE_ADAPTER = createGuidedSceneAdapter(
  PITCHER_PLANT_GUIDANCE,
  createPitcherPlantWorld,
);
export const PITCHER_PLANT_SCENE_ENTRY = Object.freeze({
  moduleId: PITCHER_PLANT_GUIDANCE.moduleId,
  createWorld: createPitcherPlantWorld,
  adapter: PITCHER_PLANT_SCENE_ADAPTER,
});
export default PITCHER_PLANT_SCENE_ADAPTER;
