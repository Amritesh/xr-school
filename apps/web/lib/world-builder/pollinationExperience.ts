import {
  createActionRouter,
  createLessonSession,
  createPollinationModel,
  type LessonSnapshot,
  type PollinationEvent,
  type PollinationSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import { POLLINATION_WORLD } from './pollinationWorld';

const ACTION_EVENTS: Record<string, PollinationEvent | undefined> = {
  'inspect-flower': undefined,
  'release-pollen': 'producePollen',
  'observe-pollinator': 'arrivePollinator',
  'transfer-pollen': 'transferPollen',
  'trace-pollen-tube': 'fertilise',
  'inspect-seed-fruit': 'formSeed',
  'water-seed': 'germinate',
  'inspect-mature-plant': 'maturePlant',
};

export interface PollinationExperience {
  perform(actionId: string): LessonSnapshot;
  observe(evidenceId: string): LessonSnapshot;
  next(): LessonSnapshot;
  previous(): LessonSnapshot;
  restart(): LessonSnapshot;
  snapshot(): LessonSnapshot;
  biologySnapshot(): PollinationSnapshot;
}

export function createPollinationExperience(): PollinationExperience {
  const definition = POLLINATION_WORLD.experienceDefinitions?.[0];
  if (!definition) throw new Error('Pollination experience definition is missing');

  const lesson = createLessonSession(definition);
  const biology = createPollinationModel();
  const router = createActionRouter();

  for (const [actionId, event] of Object.entries(ACTION_EVENTS)) {
    router.register(actionId, () => {
      lesson.performAction(actionId);
      if (event) biology.apply(event);
    });
  }

  const rebuildBiology = () => {
    biology.reset();
    const completedActions = new Set(lesson.snapshot().performedActionIds);
    for (const stage of definition.stages) {
      const actionId = stage.requiredActionIds[0];
      const event = ACTION_EVENTS[actionId];
      if (event && completedActions.has(actionId)) biology.apply(event);
    }
  };

  return {
    perform(actionId) {
      router.route({
        actionId,
        targetEntityId: `pollination-${actionId}`,
        source: 'mouse',
        phase: 'commit',
        stageId: lesson.snapshot().stageId,
        timestampMs: 0,
      });
      return lesson.snapshot();
    },
    observe(evidenceId) {
      return lesson.recordEvidence(evidenceId);
    },
    next() {
      return lesson.next();
    },
    previous() {
      const snapshot = lesson.previous();
      rebuildBiology();
      return snapshot;
    },
    restart() {
      biology.reset();
      return lesson.restart();
    },
    snapshot: () => lesson.snapshot(),
    biologySnapshot: () => biology.snapshot(),
  };
}
