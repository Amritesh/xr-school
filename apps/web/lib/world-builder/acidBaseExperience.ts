import {
  createLessonSession,
  type LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import type {
  ExperienceDefinition,
} from '../../../../packages/simulation-schema/src/index';

export const ACID_BASE_EXPERIENCE_DEFINITION: ExperienceDefinition = {
  id: 'experience-acids-bases',
  gradeTone: 'class9To10',
  objective: 'Identify acids and bases with litmus, read pH from a universal indicator, and neutralise an acid with a base.',
  stages: [
    {
      id: 'stage-test-acid',
      title: 'Test the acid with litmus',
      cue: 'Dip red and blue litmus into the acidic solution and see which paper changes colour.',
      requiredActionIds: ['test-acid-litmus'],
      completionEvidenceIds: ['acid-identified'],
    },
    {
      id: 'stage-test-base',
      title: 'Test the base with litmus',
      cue: 'Switch to the basic solution and dip the litmus again — the colours flip.',
      requiredActionIds: ['test-base-litmus'],
      completionEvidenceIds: ['base-identified'],
    },
    {
      id: 'stage-indicator',
      title: 'Read the pH with a universal indicator',
      cue: 'Add a universal indicator and match the solution colour to its place on the pH scale.',
      requiredActionIds: ['add-indicator'],
      completionEvidenceIds: ['ph-colour-observed'],
    },
    {
      id: 'stage-neutralise',
      title: 'Neutralise the acid',
      cue: 'Add base to the acid drop by drop and watch the pH climb toward 7 as the colour turns green.',
      requiredActionIds: ['add-base'],
      completionEvidenceIds: ['neutralisation-observed'],
    },
    {
      id: 'stage-compare',
      title: 'Compare acid, neutral, and base',
      cue: 'Review the pH scale comparing the acidic start, the neutral product, and the basic solution.',
      requiredActionIds: ['compare-solutions'],
      completionEvidenceIds: ['comparison-recorded'],
    },
  ],
};

export interface AcidBaseExperience {
  perform(actionId: string): LessonSnapshot;
  observe(evidenceId: string): LessonSnapshot;
  next(): LessonSnapshot;
  previous(): LessonSnapshot;
  restart(): LessonSnapshot;
  snapshot(): LessonSnapshot;
}

export function createAcidBaseExperience(): AcidBaseExperience {
  const lesson = createLessonSession(ACID_BASE_EXPERIENCE_DEFINITION);
  return {
    perform(actionId) {
      const stage = ACID_BASE_EXPERIENCE_DEFINITION.stages[lesson.snapshot().stageIndex];
      if (!stage.requiredActionIds.includes(actionId)) {
        throw new Error(`Action ${actionId} is not permitted in the current stage ${stage.id}`);
      }
      return lesson.performAction(actionId);
    },
    observe: evidenceId => lesson.recordEvidence(evidenceId),
    next: () => lesson.next(),
    previous: () => lesson.previous(),
    restart: () => lesson.restart(),
    snapshot: () => lesson.snapshot(),
  };
}
