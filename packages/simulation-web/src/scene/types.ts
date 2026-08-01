import type * as THREE from 'three';
import type {
  FixedUpdateContext,
  LessonSnapshot,
  RenderUpdateContext,
  ResourceRegistry,
} from '@xr-school/simulation-runtime';
import type {
  NormalizedAction,
  NormalizedInputSource,
  QualityProfileId,
} from '@xr-school/simulation-schema';

export interface SimulationLaunchPreferences {
  reducedMotion: boolean;
  seatedMode: boolean;
  locomotion: 'stationary' | 'boundedTeleport';
  turnMode: 'snap' | 'smooth' | 'none';
}

export interface SimulationInteractionTarget {
  id: string;
  object: THREE.Object3D;
  actionId: string;
  accessibilityLabel: string;
  inputSources?: NormalizedInputSource[];
  onCommit?(action: NormalizedAction): void;
}

export interface SimulationInteractionRegistry {
  register(target: SimulationInteractionTarget): () => void;
  activate(targetId: string, source: NormalizedInputSource): void;
  clear(): void;
}

export interface SimulationSceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  resources: ResourceRegistry;
  profile(): QualityProfileId;
  preferences: SimulationLaunchPreferences;
  interactions: SimulationInteractionRegistry;
  dispatch(action: NormalizedAction): void;
  recordEvidence(evidenceId: string): void;
}

export interface SimulationSceneHandle {
  applySnapshot(snapshot: LessonSnapshot): void;
  fixedUpdate?(context: FixedUpdateContext): void;
  renderUpdate?(context: RenderUpdateContext): void;
  focusTarget?(): THREE.Object3D | undefined;
  dispose(): void | Promise<void>;
}

export interface SimulationSceneAdapter {
  id: string;
  create(
    context: SimulationSceneContext,
  ): SimulationSceneHandle | Promise<SimulationSceneHandle>;
}
