import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  COTTON_GINNING_GUIDANCE,
  COTTON_GINNING_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createCottonGinningWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: COTTON_GINNING_GUIDANCE,
    metadata: COTTON_GINNING_SCENE_METADATA,
  });
}

export const COTTON_GINNING_SCENE_ADAPTER = createGuidedSceneAdapter(
  COTTON_GINNING_GUIDANCE,
  createCottonGinningWorld,
);
export const COTTON_GINNING_SCENE_ENTRY = Object.freeze({
  moduleId: COTTON_GINNING_GUIDANCE.moduleId,
  createWorld: createCottonGinningWorld,
  adapter: COTTON_GINNING_SCENE_ADAPTER,
});
export default COTTON_GINNING_SCENE_ADAPTER;
