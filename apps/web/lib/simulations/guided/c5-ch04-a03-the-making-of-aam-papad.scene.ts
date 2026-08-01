import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  AAM_PAPAD_GUIDANCE,
  AAM_PAPAD_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createAamPapadWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: AAM_PAPAD_GUIDANCE,
    metadata: AAM_PAPAD_SCENE_METADATA,
  });
}

export const AAM_PAPAD_SCENE_ADAPTER = createGuidedSceneAdapter(
  AAM_PAPAD_GUIDANCE,
  createAamPapadWorld,
);
export const AAM_PAPAD_SCENE_ENTRY = Object.freeze({
  moduleId: AAM_PAPAD_GUIDANCE.moduleId,
  createWorld: createAamPapadWorld,
  adapter: AAM_PAPAD_SCENE_ADAPTER,
});
export default AAM_PAPAD_SCENE_ADAPTER;
