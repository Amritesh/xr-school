import {
  createLessonSession,
  type LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import type {
  ExperienceDefinition,
} from '../../../../packages/simulation-schema/src/index';

export const BREATHING_EXPERIENCE_DEFINITION: ExperienceDefinition = {
  id: 'experience-breathing-process',
  gradeTone: 'class6To8',
  objective: 'Explain how the diaphragm and rib cage work together to move air into and out of the lungs.',
  stages: [
    {
      id: 'stage-airway',
      title: 'Follow the airway',
      cue: 'Trace the path air takes from the nose or mouth, down the windpipe, into the two bronchi.',
      requiredActionIds: ['inspect-airway'],
      completionEvidenceIds: ['airway-path-identified'],
    },
    {
      id: 'stage-lungs-diaphragm',
      title: 'Find the lungs and diaphragm',
      cue: 'Locate the two lungs inside the rib cage, then find the diaphragm muscle beneath them.',
      requiredActionIds: ['inspect-lungs', 'inspect-diaphragm'],
      completionEvidenceIds: ['lungs-diaphragm-identified'],
    },
    {
      id: 'stage-inhale',
      title: 'Breathe in',
      cue: 'Contract the diaphragm and watch it flatten and move down as the rib cage lifts and air rushes in.',
      requiredActionIds: ['trigger-inhale'],
      completionEvidenceIds: ['inhale-mechanics-observed'],
    },
    {
      id: 'stage-exhale',
      title: 'Breathe out',
      cue: 'Relax the diaphragm and watch it dome upward as the rib cage falls and air flows back out.',
      requiredActionIds: ['trigger-exhale'],
      completionEvidenceIds: ['exhale-mechanics-observed'],
    },
    {
      id: 'stage-alveoli',
      title: 'Zoom into the alveoli',
      cue: 'Enter the enlarged cutaway to see the alveoli, tiny air sacs where oxygen and carbon dioxide are exchanged.',
      requiredActionIds: ['inspect-alveoli'],
      completionEvidenceIds: ['gas-exchange-observed'],
    },
    {
      id: 'stage-compare',
      title: 'Compare inhale and exhale',
      cue: 'Review the comparison board to contrast rib position, diaphragm shape, and lung volume in each phase.',
      requiredActionIds: ['compare-breathing-cycle'],
      completionEvidenceIds: ['breathing-cycle-compared'],
    },
  ],
};

export interface BreathingExperience {
  perform(actionId: string): LessonSnapshot;
  observe(evidenceId: string): LessonSnapshot;
  next(): LessonSnapshot;
  previous(): LessonSnapshot;
  restart(): LessonSnapshot;
  snapshot(): LessonSnapshot;
}

export function createBreathingExperience(): BreathingExperience {
  const lesson = createLessonSession(BREATHING_EXPERIENCE_DEFINITION);

  return {
    perform(actionId) {
      const stage = BREATHING_EXPERIENCE_DEFINITION.stages[lesson.snapshot().stageIndex];
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
