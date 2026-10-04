import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  VIRUS_INVASION_GUIDANCE,
  VIRUS_INVASION_SCENE_METADATA,
} from '@xr-school/simulation-content';
import { createGuidedSceneAdapter } from './createGuidedSceneAdapter';
import { createDeclarativeGuidedSceneWorld } from './createDeclarativeGuidedSceneWorld';

export function createVirusInvasionWorld(context: SimulationSceneContext) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: VIRUS_INVASION_GUIDANCE,
    metadata: VIRUS_INVASION_SCENE_METADATA,
  });
}

export const VIRUS_INVASION_SCENE_ADAPTER = createGuidedSceneAdapter(
  VIRUS_INVASION_GUIDANCE,
  createVirusInvasionWorld,
);

export const VIRUS_INVASION_SCENE_ENTRY = Object.freeze({
  moduleId: VIRUS_INVASION_GUIDANCE.moduleId,
  createWorld: createVirusInvasionWorld,
  adapter: VIRUS_INVASION_SCENE_ADAPTER,
});

export default VIRUS_INVASION_SCENE_ADAPTER;
