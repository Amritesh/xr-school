import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  MOSQUITO_LIFE_CYCLE_GUIDANCE,
  MOSQUITO_LIFE_CYCLE_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createMosquitoLifeCycleWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: MOSQUITO_LIFE_CYCLE_GUIDANCE,
    metadata: MOSQUITO_LIFE_CYCLE_SCENE_METADATA,
  });
}

export const MOSQUITO_LIFE_CYCLE_SCENE_ADAPTER = createGuidedSceneAdapter(
  MOSQUITO_LIFE_CYCLE_GUIDANCE,
  createMosquitoLifeCycleWorld,
);
export const MOSQUITO_LIFE_CYCLE_SCENE_ENTRY = Object.freeze({
  moduleId: MOSQUITO_LIFE_CYCLE_GUIDANCE.moduleId,
  createWorld: createMosquitoLifeCycleWorld,
  adapter: MOSQUITO_LIFE_CYCLE_SCENE_ADAPTER,
});
export default MOSQUITO_LIFE_CYCLE_SCENE_ADAPTER;
