import {
  validateExperienceDefinition,
  type ExperienceDefinition,
} from '../../../simulation-schema/src/index';

export interface LessonSnapshot {
  experienceId: string;
  objective: string;
  stageIndex: number;
  stageCount: number;
  stageId: string;
  stageTitle: string;
  cue: string;
  performedActionIds: string[];
  recordedEvidenceIds: string[];
  stageComplete: boolean;
  lessonComplete: boolean;
}

export interface LessonSession {
  snapshot(): LessonSnapshot;
  performAction(actionId: string): LessonSnapshot;
  recordEvidence(evidenceId: string): LessonSnapshot;
  previous(): LessonSnapshot;
  next(): LessonSnapshot;
  restart(): LessonSnapshot;
}

export function createLessonSession(
  definition: ExperienceDefinition,
): LessonSession {
  const validationErrors = validateExperienceDefinition(definition);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('; '));
  }

  let stageIndex = 0;
  const performedActionIds = new Set<string>();
  const recordedEvidenceIds = new Set<string>();

  const stage = () => definition.stages[stageIndex];
  const stageComplete = () => (
    stage().requiredActionIds.every(id => performedActionIds.has(id))
    && stage().completionEvidenceIds.every(id => recordedEvidenceIds.has(id))
  );
  const snapshot = (): LessonSnapshot => ({
    experienceId: definition.id,
    objective: definition.objective,
    stageIndex,
    stageCount: definition.stages.length,
    stageId: stage().id,
    stageTitle: stage().title,
    cue: stage().cue,
    performedActionIds: [...performedActionIds],
    recordedEvidenceIds: [...recordedEvidenceIds],
    stageComplete: stageComplete(),
    lessonComplete: stageIndex === definition.stages.length - 1 && stageComplete(),
  });

  return {
    snapshot,
    performAction(actionId) {
      if (!stage().requiredActionIds.includes(actionId)) {
        throw new Error(`Action ${actionId} is not permitted in the current stage ${stage().id}`);
      }
      performedActionIds.add(actionId);
      return snapshot();
    },
    recordEvidence(evidenceId) {
      if (!stage().completionEvidenceIds.includes(evidenceId)) {
        throw new Error(`Evidence ${evidenceId} does not belong to the current stage ${stage().id}`);
      }
      recordedEvidenceIds.add(evidenceId);
      return snapshot();
    },
    previous() {
      stageIndex = Math.max(0, stageIndex - 1);
      return snapshot();
    },
    next() {
      if (!stageComplete()) {
        throw new Error(`Complete stage ${stage().id} before continuing`);
      }
      stageIndex = Math.min(definition.stages.length - 1, stageIndex + 1);
      return snapshot();
    },
    restart() {
      stageIndex = 0;
      performedActionIds.clear();
      recordedEvidenceIds.clear();
      return snapshot();
    },
  };
}
