import type { SimulationSceneContext } from "@xr-school/simulation-web";
import {
  SUPER_SENSES_DANGER_GUIDANCE,
  SUPER_SENSES_DANGER_SCENE_METADATA,
} from "@xr-school/simulation-content";
import { createGuidedSceneAdapter } from "./createGuidedSceneAdapter";
import { createDeclarativeGuidedSceneWorld } from "./createDeclarativeGuidedSceneWorld";

export function createSuperSensesDangerSceneWorld(
  context: SimulationSceneContext,
) {
  return createDeclarativeGuidedSceneWorld(context, {
    definition: SUPER_SENSES_DANGER_GUIDANCE,
    metadata: SUPER_SENSES_DANGER_SCENE_METADATA,
  });
}

export const SUPER_SENSES_DANGER_SCENE_ADAPTER = createGuidedSceneAdapter(
  SUPER_SENSES_DANGER_GUIDANCE,
  createSuperSensesDangerSceneWorld,
);

export const SUPER_SENSES_DANGER_SCENE_ENTRY = Object.freeze({
  moduleId: SUPER_SENSES_DANGER_GUIDANCE.moduleId,
  createWorld: createSuperSensesDangerSceneWorld,
  adapter: SUPER_SENSES_DANGER_SCENE_ADAPTER,
});

export default SUPER_SENSES_DANGER_SCENE_ADAPTER;
