import {
  createLessonSession,
  type LessonSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import type {
  ExperienceDefinition,
} from '../../../../packages/simulation-schema/src/index';

export const FORCE_MOTION_EXPERIENCE_DEFINITION: ExperienceDefinition = {
  id: 'experience-force-motion',
  gradeTone: 'class6To8',
  objective: 'Show how a force can start, stop, speed up, or redirect a moving object, and change an object’s shape.',
  stages: [
    {
      id: 'stage-push',
      title: 'Push a resting ball into motion',
      cue: 'Apply a push to the ball at rest and watch it start rolling.',
      requiredActionIds: ['apply-push'],
      completionEvidenceIds: ['motion-started'],
    },
    {
      id: 'stage-brake',
      title: 'Stop a moving ball',
      cue: 'The ball is already rolling — apply the brake and watch it come to rest.',
      requiredActionIds: ['apply-brake'],
      completionEvidenceIds: ['motion-stopped'],
    },
    {
      id: 'stage-accelerate',
      title: 'Speed up a moving ball',
      cue: 'Apply a stronger push to a ball that is already rolling and watch it speed up.',
      requiredActionIds: ['apply-accelerate'],
      completionEvidenceIds: ['speed-increased'],
    },
    {
      id: 'stage-deflect',
      title: 'Change the direction of a moving ball',
      cue: 'Apply a sideways push to the rolling ball and watch its path curve.',
      requiredActionIds: ['apply-deflect'],
      completionEvidenceIds: ['direction-changed'],
    },
    {
      id: 'stage-shape',
      title: 'Change the shape of an object',
      cue: 'Squeeze the ball between the plates, then release it and see whether it springs back.',
      requiredActionIds: ['squeeze-ball', 'release-ball'],
      completionEvidenceIds: ['shape-changed'],
    },
    {
      id: 'stage-compare',
      title: 'Compare the effects of force',
      cue: 'Review the board comparing how force changed motion and shape.',
      requiredActionIds: ['compare-motion-effects'],
      completionEvidenceIds: ['effects-compared'],
    },
  ],
};

export interface ForceMotionExperience {
  perform(actionId: string): LessonSnapshot;
  observe(evidenceId: string): LessonSnapshot;
  next(): LessonSnapshot;
  previous(): LessonSnapshot;
  restart(): LessonSnapshot;
  snapshot(): LessonSnapshot;
}

export function createForceMotionExperience(): ForceMotionExperience {
  const lesson = createLessonSession(FORCE_MOTION_EXPERIENCE_DEFINITION);

  return {
    perform(actionId) {
      const stage = FORCE_MOTION_EXPERIENCE_DEFINITION.stages[lesson.snapshot().stageIndex];
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
