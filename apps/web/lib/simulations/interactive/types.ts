import type {
  ImplementedSimulationDefinition,
  NormalizedAction,
} from '@xr-school/simulation-schema';
import type {
  AssessmentBinding,
  InteractiveInvestigationSession,
  InteractiveInvestigationSnapshot,
} from '@xr-school/simulation-runtime';
import type { SimulationSceneAdapter } from '@xr-school/simulation-web';

export interface ProjectableSceneAdapter<State> extends SimulationSceneAdapter {
  projectDomain(state: Readonly<State>): void;
}

export interface InteractiveChoice {
  id: string;
  label: string;
  action: Omit<NormalizedAction, 'source' | 'stageId' | 'timestampMs'>;
}

export interface InteractiveViewerRegistration<State> {
  definition: ImplementedSimulationDefinition;
  assessmentBindings: Readonly<Record<string, AssessmentBinding>>;
  createSession(): InteractiveInvestigationSession<State>;
  createAdapter(): ProjectableSceneAdapter<State>;
  choices(
    snapshot: InteractiveInvestigationSnapshot<State>,
  ): readonly InteractiveChoice[];
  primaryAction?(
    snapshot: InteractiveInvestigationSnapshot<State>,
  ): InteractiveChoice | undefined;
}

export type AnyInteractiveViewerRegistration =
  InteractiveViewerRegistration<unknown>;
