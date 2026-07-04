import {
  createActionRouter,
  createLessonSession,
  createPollinationModel,
  type LessonSnapshot,
  type PollinationEvent,
  type PollinationSnapshot,
} from '../../../../packages/simulation-runtime/src/index';
import { POLLINATION_WORLD } from './pollinationWorld';
import {
  createPollinationExperiment,
  type PollinationExperimentAction,
  type PollinationExperimentSnapshot,
} from './pollinationExperiment';

const ACTION_EVENTS: Record<string, PollinationEvent | undefined> = {
  'inspect-flower': undefined,
  'collect-pollen': 'producePollen',
  'observe-pollinator': 'arrivePollinator',
  'transfer-pollen': 'transferPollen',
  'trace-pollen-tube': 'fertilise',
  'advance-time-lapse': 'formSeed',
  'compare-control': undefined,
  'open-fruit': undefined,
  'plant-seed': undefined,
  'cover-seed': undefined,
  'water-seed': 'germinate',
  'inspect-germination': 'maturePlant',
};

const EXPERIMENT_ACTIONS = new Set<PollinationExperimentAction>([
  'collect-pollen',
  'transfer-pollen',
  'trace-pollen-tube',
  'advance-time-lapse',
  'open-fruit',
  'plant-seed',
  'cover-seed',
  'water-seed',
]);

function isExperimentAction(
  actionId: string,
): actionId is PollinationExperimentAction {
  return EXPERIMENT_ACTIONS.has(actionId as PollinationExperimentAction);
}

export interface PollinationExperience {
  perform(actionId: string): LessonSnapshot;
  observe(evidenceId: string): LessonSnapshot;
  next(): LessonSnapshot;
  previous(): LessonSnapshot;
  restart(): LessonSnapshot;
  snapshot(): LessonSnapshot;
  biologySnapshot(): PollinationSnapshot;
  experimentSnapshot(): PollinationExperimentSnapshot;
}

export function createPollinationExperience(): PollinationExperience {
  const definition = POLLINATION_WORLD.experienceDefinitions?.[0];
  if (!definition) throw new Error('Pollination experience definition is missing');

  const lesson = createLessonSession(definition);
  const biology = createPollinationModel();
  const experiment = createPollinationExperiment();
  const router = createActionRouter();

  for (const [actionId, event] of Object.entries(ACTION_EVENTS)) {
    router.register(actionId, () => {
      const activeStage = definition.stages[lesson.snapshot().stageIndex];
      if (!activeStage.requiredActionIds.includes(actionId)) {
        throw new Error(`Action ${actionId} is not permitted in the current stage ${activeStage.id}`);
      }
      if (isExperimentAction(actionId)) experiment.apply(actionId);
      if (event) biology.apply(event);
      lesson.performAction(actionId);
    });
  }

  const rebuildModels = () => {
    biology.reset();
    experiment.reset();
    const completedActions = new Set(lesson.snapshot().performedActionIds);
    for (const stage of definition.stages) {
      for (const actionId of stage.requiredActionIds) {
        if (!completedActions.has(actionId)) continue;
        if (isExperimentAction(actionId)) experiment.apply(actionId);
        const event = ACTION_EVENTS[actionId];
        if (event) biology.apply(event);
      }
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
      rebuildModels();
      return snapshot;
    },
    restart() {
      biology.reset();
      experiment.reset();
      return lesson.restart();
    },
    snapshot: () => lesson.snapshot(),
    biologySnapshot: () => biology.snapshot(),
    experimentSnapshot: () => experiment.snapshot(),
  };
}
