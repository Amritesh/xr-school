import type * as THREE from 'three';
import type {
  NormalizedInputSource,
} from '@xr-school/simulation-schema';
import type {
  SimulationLaunchPreferences,
  SimulationSceneContext,
} from '@xr-school/simulation-web';

export interface GuidedSceneWorld {
  root: THREE.Group;
  cueIds: readonly string[];
  interactionTargets: readonly {
    id: string;
    object: THREE.Object3D;
    actionId: string;
    accessibilityLabel: string;
    inputSources?: NormalizedInputSource[];
  }[];
  cueDurationSeconds(cueId: string): number;
  applyCue(
    cueId: string,
    progress: number,
    preferences: SimulationLaunchPreferences,
  ): void;
  focusTarget(cueId: string): THREE.Object3D | undefined;
  dispose(): void;
}

export type CreateGuidedSceneWorld = (
  context: SimulationSceneContext,
) => GuidedSceneWorld | Promise<GuidedSceneWorld>;
