import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  ANCIENT_FORT_GUIDANCE,
  ANCIENT_FORT_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createAncientFortWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: ANCIENT_FORT_GUIDANCE,
    metadata: ANCIENT_FORT_SCENE_METADATA,
  });
}

export const ANCIENT_FORT_SCENE_ADAPTER = createGuidedSceneAdapter(
  ANCIENT_FORT_GUIDANCE,
  createAncientFortWorld,
);
export const ANCIENT_FORT_SCENE_ENTRY = Object.freeze({
  moduleId: ANCIENT_FORT_GUIDANCE.moduleId,
  createWorld: createAncientFortWorld,
  adapter: ANCIENT_FORT_SCENE_ADAPTER,
});
export default ANCIENT_FORT_SCENE_ADAPTER;
