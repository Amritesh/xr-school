import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  STEPWELL_STRUCTURE_GUIDANCE,
  STEPWELL_STRUCTURE_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createStepwellStructureWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: STEPWELL_STRUCTURE_GUIDANCE,
    metadata: STEPWELL_STRUCTURE_SCENE_METADATA,
  });
}

export const STEPWELL_STRUCTURE_SCENE_ADAPTER = createGuidedSceneAdapter(
  STEPWELL_STRUCTURE_GUIDANCE,
  createStepwellStructureWorld,
);
export const STEPWELL_STRUCTURE_SCENE_ENTRY = Object.freeze({
  moduleId: STEPWELL_STRUCTURE_GUIDANCE.moduleId,
  createWorld: createStepwellStructureWorld,
  adapter: STEPWELL_STRUCTURE_SCENE_ADAPTER,
});
export default STEPWELL_STRUCTURE_SCENE_ADAPTER;
