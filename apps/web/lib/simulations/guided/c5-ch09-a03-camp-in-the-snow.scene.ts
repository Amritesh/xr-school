import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  CAMP_IN_SNOW_GUIDANCE,
  CAMP_IN_SNOW_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createCampInSnowWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: CAMP_IN_SNOW_GUIDANCE,
    metadata: CAMP_IN_SNOW_SCENE_METADATA,
  });
}

export const CAMP_IN_SNOW_SCENE_ADAPTER = createGuidedSceneAdapter(
  CAMP_IN_SNOW_GUIDANCE,
  createCampInSnowWorld,
);
export const CAMP_IN_SNOW_SCENE_ENTRY = Object.freeze({
  moduleId: CAMP_IN_SNOW_GUIDANCE.moduleId,
  createWorld: createCampInSnowWorld,
  adapter: CAMP_IN_SNOW_SCENE_ADAPTER,
});
export default CAMP_IN_SNOW_SCENE_ADAPTER;
