import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  SHEARING_SCOURING_WOOL_GUIDANCE,
  SHEARING_SCOURING_WOOL_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createShearingScouringWoolWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: SHEARING_SCOURING_WOOL_GUIDANCE,
    metadata: SHEARING_SCOURING_WOOL_SCENE_METADATA,
  });
}

export const SHEARING_SCOURING_WOOL_SCENE_ADAPTER = createGuidedSceneAdapter(
  SHEARING_SCOURING_WOOL_GUIDANCE,
  createShearingScouringWoolWorld,
);

export const SHEARING_SCOURING_WOOL_SCENE_ENTRY = Object.freeze({
  moduleId: SHEARING_SCOURING_WOOL_GUIDANCE.moduleId,
  createWorld: createShearingScouringWoolWorld,
  adapter: SHEARING_SCOURING_WOOL_SCENE_ADAPTER,
});

export default SHEARING_SCOURING_WOOL_SCENE_ADAPTER;
