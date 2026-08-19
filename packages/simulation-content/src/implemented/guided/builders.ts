import {
  defineGuidedImplementedSimulation,
  validateGuidedSimulationDefinition,
  type AssessmentPromptDefinition,
  type AssessmentSequence,
  type AssetDefinition,
  type AssetManifest,
  type GuidedSimulationDefinition,
  type NarrationCueDefinition,
  type SimulationModuleRecord,
  type SimulationNarrationManifest,
} from '@xr-school/simulation-schema';
import { withPackagedNarration } from '../narrationAssets.js';

export interface GuidedStageAuthoring {
  id: string;
  title: string;
  cue: string;
  detail: string;
  actionId: string;
  actionLabel: string;
  evidenceId: string;
  evidenceMode: 'scene' | 'answer';
  narrationText: string;
  audioUrl?: string;
  scaleNote?: string;
  misconceptionId?: string;
  transferPromptId?: string;
}

export interface GuidedLessonAuthoring {
  id: string;
  moduleId: string;
  viewerKey: string;
  classContext: string;
  gradeTone: GuidedSimulationDefinition['gradeTone'];
  objective: string;
  stages: GuidedStageAuthoring[];
  completion: GuidedSimulationDefinition['completion'];
}

function requireText(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} is required`);
}

export function createGuidedLesson(input: GuidedLessonAuthoring): {
  guidance: GuidedSimulationDefinition;
  narration: SimulationNarrationManifest;
} {
  const stages = input.stages.map((stage, index) => {
    requireText(stage.id, `stages[${index}].id`);
    requireText(stage.narrationText, `stages[${index}].narrationText`);
    if (stage.evidenceMode === 'answer') {
      const links = [stage.misconceptionId, stage.transferPromptId]
        .filter((value): value is string => Boolean(value?.trim()));
      if (links.length !== 1) {
        throw new Error(
          `${stage.id}: answer evidence requires exactly one linked assessment intent`,
        );
      }
    }

    return {
      id: stage.id,
      title: stage.title,
      cue: stage.cue,
      detail: stage.detail,
      actionLabel: stage.actionLabel,
      requiredActionIds: [stage.actionId],
      completionEvidenceIds: [stage.evidenceId],
      narrationId: `${input.id}:${stage.id}`,
      sceneCueId: `scene:${stage.id}`,
      evidenceMode: stage.evidenceMode,
      ...(stage.scaleNote ? { scaleNote: stage.scaleNote } : {}),
      ...(stage.misconceptionId
        ? { misconceptionId: stage.misconceptionId }
        : {}),
      ...(stage.transferPromptId
        ? { transferPromptId: stage.transferPromptId }
        : {}),
    };
  });
  const cues: NarrationCueDefinition[] = input.stages.map((stage, index) =>
    withPackagedNarration({
      id: stages[index].narrationId,
      stageId: stage.id,
      text: stage.narrationText,
      caption: stage.narrationText,
      ...(stage.audioUrl ? { audioUrl: stage.audioUrl } : {}),
    }),
  );
  const guidance: GuidedSimulationDefinition = {
    id: input.id,
    moduleId: input.moduleId,
    viewerKey: input.viewerKey,
    classContext: input.classContext,
    gradeTone: input.gradeTone,
    objective: input.objective,
    stages,
    completion: { ...input.completion },
  };
  const errors = validateGuidedSimulationDefinition(guidance);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  return {
    guidance,
    narration: {
      id: `narration:${input.id}`,
      cues,
      fallback: 'browserTts',
    },
  };
}

export interface GuidedAssessmentPromptAuthoring {
  id: string;
  stageId: string;
  question: string;
  acceptedEvidenceId: string;
  acceptedLabel: string;
  distractorLabel: string;
  hint: string;
  explanation: string;
}

export interface GuidedAssessmentAuthoring {
  id: string;
  objectiveId: string;
  misconception: GuidedAssessmentPromptAuthoring;
  transfer: GuidedAssessmentPromptAuthoring;
}

function createAssessmentPrompt(
  kind: 'misconception' | 'transfer',
  input: GuidedAssessmentPromptAuthoring,
): AssessmentPromptDefinition {
  for (const [field, value] of Object.entries(input)) {
    requireText(value, `${input.id || kind}.${field}`);
  }
  return {
    id: input.id,
    kind,
    stageId: input.stageId,
    question: input.question,
    options: [
      { id: input.acceptedEvidenceId, label: input.acceptedLabel },
      {
        id: `${input.acceptedEvidenceId}:distractor`,
        label: input.distractorLabel,
      },
    ],
    acceptedEvidenceIds: [input.acceptedEvidenceId],
    hint: input.hint,
    explanation: input.explanation,
    retryPolicy: 'immediateWithHint',
  };
}

export function createGuidedAssessment(
  input: GuidedAssessmentAuthoring,
): AssessmentSequence {
  return {
    id: input.id,
    objectiveId: input.objectiveId,
    prompts: [
      createAssessmentPrompt('misconception', input.misconception),
      createAssessmentPrompt('transfer', input.transfer),
    ],
    masteryRule: {
      requiredEvidenceCount: 2,
      requiredKinds: ['misconception', 'transfer'],
      allowHintedMastery: true,
    },
  };
}

type GuidedModuleInvariant =
  | 'applicableBoards'
  | 'evidenceConfidenceLevel'
  | 'releaseMaturity'
  | 'publicationStatus'
  | 'evidenceMaturity'
  | 'targetFrameRateFps'
  | 'minQuestStorageGb'
  | 'stages'
  | 'status';

export type GuidedModuleAuthoring = Omit<
  SimulationModuleRecord,
  GuidedModuleInvariant
>;

export function createGuidedModuleRecord(
  input: GuidedModuleAuthoring,
  guidance: GuidedSimulationDefinition,
): SimulationModuleRecord {
  if (input.id !== guidance.moduleId) {
    throw new Error(
      `Module ID ${input.id} does not match guidance module ${guidance.moduleId}`,
    );
  }
  if (input.viewerKey !== guidance.viewerKey) {
    throw new Error(
      `Viewer key ${input.viewerKey} does not match guidance viewer ${guidance.viewerKey}`,
    );
  }
  return {
    ...input,
    applicableBoards: ['cbse'],
    evidenceConfidenceLevel: 'experimental',
    releaseMaturity: 'internalQA',
    publicationStatus: 'released',
    evidenceMaturity: 'internalQA',
    targetFrameRateFps: 72,
    minQuestStorageGb: 1,
    stages: guidance.stages.length,
    status: 'released',
  };
}

export interface GuidedAssetManifestAuthoring {
  id: string;
  environment: Omit<AssetDefinition, 'kind'>;
  audio?: readonly Omit<AssetDefinition, 'kind'>[];
}

export function createGuidedAssetManifest(
  input: GuidedAssetManifestAuthoring,
): AssetManifest {
  return {
    id: input.id,
    assets: [
      { ...input.environment, kind: 'environment' },
      ...(input.audio ?? []).map(asset => ({ ...asset, kind: 'audio' as const })),
    ],
  };
}

export { defineGuidedImplementedSimulation };
