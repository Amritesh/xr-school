import type { SimulationSceneContext } from "@xr-school/simulation-web";
import {
  SUPER_SENSES_SIGHT_GUIDANCE,
  SUPER_SENSES_SIGHT_SCENE_METADATA,
} from "@xr-school/simulation-content";
import { createGuidedSceneAdapter } from "./createGuidedSceneAdapter";
import { createDeclarativeGuidedSceneWorld } from "./createDeclarativeGuidedSceneWorld";

export function createSuperSensesSightSceneWorld(
  context: SimulationSceneContext,
) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: SUPER_SENSES_SIGHT_GUIDANCE,
    metadata: SUPER_SENSES_SIGHT_SCENE_METADATA,
  });
}

export const SUPER_SENSES_SIGHT_SCENE_ADAPTER = createGuidedSceneAdapter(
  SUPER_SENSES_SIGHT_GUIDANCE,
  createSuperSensesSightSceneWorld,
);

export const SUPER_SENSES_SIGHT_SCENE_ENTRY = Object.freeze({
  moduleId: SUPER_SENSES_SIGHT_GUIDANCE.moduleId,
  createWorld: createSuperSensesSightSceneWorld,
  adapter: SUPER_SENSES_SIGHT_SCENE_ADAPTER,
});

export default SUPER_SENSES_SIGHT_SCENE_ADAPTER;
