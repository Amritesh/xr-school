import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  SEED_DISPERSAL_GUIDANCE,
  SEED_DISPERSAL_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createSeedDispersalWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: SEED_DISPERSAL_GUIDANCE,
    metadata: SEED_DISPERSAL_SCENE_METADATA,
  });
}

export const SEED_DISPERSAL_SCENE_ADAPTER = createGuidedSceneAdapter(
  SEED_DISPERSAL_GUIDANCE,
  createSeedDispersalWorld,
);
export const SEED_DISPERSAL_SCENE_ENTRY = Object.freeze({
  moduleId: SEED_DISPERSAL_GUIDANCE.moduleId,
  createWorld: createSeedDispersalWorld,
  adapter: SEED_DISPERSAL_SCENE_ADAPTER,
});
export default SEED_DISPERSAL_SCENE_ADAPTER;
