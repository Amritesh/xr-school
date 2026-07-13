import {
  createLessonSession,
  type LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import type { ExperienceDefinition } from '../../../../packages/simulation-schema/src/index';

export const SOLUBILITY_EXPERIENCE_DEFINITION: ExperienceDefinition = {
  id: 'experience-solubility-physics-lab',
  gradeTone: 'class3To5',
  objective: 'Use measured evidence to distinguish solutions, suspensions, sediments, and immiscible layers.',
  stages: [
    {
      id: 'predict', title: 'Predict before mixing',
      cue: 'Choose a material and predict what the beaker evidence will show.',
      requiredActionIds: ['record-prediction'], completionEvidenceIds: ['prediction-recorded'],
    },
    {
      id: 'mix', title: 'Make a measured mixture',
      cue: 'Add a 5 g scoop, then observe where that mass goes.',
      requiredActionIds: ['add-scoop'], completionEvidenceIds: ['mass-accounted'],
    },
    {
      id: 'investigate', title: 'Change one variable',
      cue: 'Stir or change temperature. Watch rate, turbidity, sediment, and saturation separately.',
      requiredActionIds: ['investigate-rate'], completionEvidenceIds: ['rate-compared'],
    },
    {
      id: 'explain', title: 'Explain with the molecular lens',
      cue: 'Open the representational molecular lens and connect invisible particles to visible evidence.',
      requiredActionIds: ['open-molecular-lens'], completionEvidenceIds: ['misconception-resolved'],
    },
    {
      id: 'transfer', title: 'Classify an unknown',
      cue: 'Use only the evidence pattern to classify the mystery mixture.',
      requiredActionIds: ['classify-unknown'], completionEvidenceIds: ['unknown-classified'],
    },
  ],
};

export interface SolubilityExperience {
  perform(actionId: string): LessonSnapshot;
  observe(evidenceId: string): LessonSnapshot;
  next(): LessonSnapshot;
  previous(): LessonSnapshot;
  restart(): LessonSnapshot;
  snapshot(): LessonSnapshot;
}

export function createSolubilityExperience(): SolubilityExperience {
  const session = createLessonSession(SOLUBILITY_EXPERIENCE_DEFINITION);
  return {
    perform(actionId) {
      const stage = SOLUBILITY_EXPERIENCE_DEFINITION.stages[session.snapshot().stageIndex];
      if (!stage.requiredActionIds.includes(actionId)) {
        throw new Error(`Action ${actionId} is not permitted in the current stage ${stage.id}`);
      }
      return session.performAction(actionId);
    },
    observe: evidenceId => session.recordEvidence(evidenceId),
    next: () => session.next(),
    previous: () => session.previous(),
    restart: () => session.restart(),
    snapshot: () => session.snapshot(),
  };
}
