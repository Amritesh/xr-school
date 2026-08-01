import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  MALARIA_DIAGNOSIS_GUIDANCE,
  MALARIA_DIAGNOSIS_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createMalariaDiagnosisWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: MALARIA_DIAGNOSIS_GUIDANCE,
    metadata: MALARIA_DIAGNOSIS_SCENE_METADATA,
  });
}

export const MALARIA_DIAGNOSIS_SCENE_ADAPTER = createGuidedSceneAdapter(
  MALARIA_DIAGNOSIS_GUIDANCE,
  createMalariaDiagnosisWorld,
);
export const MALARIA_DIAGNOSIS_SCENE_ENTRY = Object.freeze({
  moduleId: MALARIA_DIAGNOSIS_GUIDANCE.moduleId,
  createWorld: createMalariaDiagnosisWorld,
  adapter: MALARIA_DIAGNOSIS_SCENE_ADAPTER,
});
export default MALARIA_DIAGNOSIS_SCENE_ADAPTER;
