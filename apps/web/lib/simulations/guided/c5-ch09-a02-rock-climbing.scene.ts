import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  ROCK_CLIMBING_GUIDANCE,
  ROCK_CLIMBING_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createRockClimbingWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: ROCK_CLIMBING_GUIDANCE,
    metadata: ROCK_CLIMBING_SCENE_METADATA,
  });
}

export const ROCK_CLIMBING_SCENE_ADAPTER = createGuidedSceneAdapter(
  ROCK_CLIMBING_GUIDANCE,
  createRockClimbingWorld,
);
export const ROCK_CLIMBING_SCENE_ENTRY = Object.freeze({
  moduleId: ROCK_CLIMBING_GUIDANCE.moduleId,
  createWorld: createRockClimbingWorld,
  adapter: ROCK_CLIMBING_SCENE_ADAPTER,
});
export default ROCK_CLIMBING_SCENE_ADAPTER;
