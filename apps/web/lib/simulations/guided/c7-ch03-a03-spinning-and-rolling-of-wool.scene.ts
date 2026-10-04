import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  YARN_MAKER_GUIDANCE,
  YARN_MAKER_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createYarnMakerSceneWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: YARN_MAKER_GUIDANCE,
    metadata: YARN_MAKER_SCENE_METADATA,
  });
}

export const YARN_MAKER_SCENE_ADAPTER = createGuidedSceneAdapter(
  YARN_MAKER_GUIDANCE,
  createYarnMakerSceneWorld,
);

export const YARN_MAKER_SCENE_ENTRY = Object.freeze({
  moduleId: YARN_MAKER_GUIDANCE.moduleId,
  createWorld: createYarnMakerSceneWorld,
  adapter: YARN_MAKER_SCENE_ADAPTER,
});

export default YARN_MAKER_SCENE_ADAPTER;
