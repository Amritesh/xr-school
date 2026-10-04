import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  IRRIGATION_METHODS_GUIDANCE,
  IRRIGATION_METHODS_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createIrrigationMethodsSceneWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: IRRIGATION_METHODS_GUIDANCE,
    metadata: IRRIGATION_METHODS_SCENE_METADATA,
  });
}

export const IRRIGATION_METHODS_SCENE_ADAPTER = createGuidedSceneAdapter(
  IRRIGATION_METHODS_GUIDANCE,
  createIrrigationMethodsSceneWorld,
);

export const IRRIGATION_METHODS_SCENE_ENTRY = Object.freeze({
  moduleId: IRRIGATION_METHODS_GUIDANCE.moduleId,
  createWorld: createIrrigationMethodsSceneWorld,
  adapter: IRRIGATION_METHODS_SCENE_ADAPTER,
});

export default IRRIGATION_METHODS_SCENE_ADAPTER;
