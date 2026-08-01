import {
  validateNormalizedAction,
  type AssessmentSequence,
  type ExperienceDefinition,
  type NormalizedAction,
} from '@xr-school/simulation-schema';
import { createAssessmentSession } from '../world/assessment.js';
import {
  createLessonSession,
  type LessonSnapshot,
} from './lessonSession.js';

export interface InvestigationFeedback {
  tone: 'information' | 'success' | 'retry' | 'error';
  message: string;
}

export interface InvestigationTransition<State> {
  state: State;
  lessonActionId: string;
  evidenceIds: readonly string[];
  feedback?: InvestigationFeedback;
}

export type InvestigationReducer<State> = (
  state: Readonly<State>,
  action: NormalizedAction,
) => InvestigationTransition<State>;

export interface AssessmentBinding {
  lessonActionId: string;
  lessonEvidenceId: string;
}

export interface InteractiveInvestigationConfig<State> {
  experience: ExperienceDefinition;
  assessment: AssessmentSequence;
  initialState: State;
  reducer: InvestigationReducer<State>;
  assessmentBindings: Record<string, AssessmentBinding>;
}

export interface InteractiveInvestigationSnapshot<State> {
  lesson: LessonSnapshot;
  domain: State;
  mastery: ReturnType<ReturnType<typeof createAssessmentSession>['mastery']>;
  feedback?: InvestigationFeedback;
}

export interface InteractiveInvestigationSession<State> {
  dispatch(action: NormalizedAction): InteractiveInvestigationSnapshot<State>;
  next(): InteractiveInvestigationSnapshot<State>;
  previous(): InteractiveInvestigationSnapshot<State>;
  restart(): InteractiveInvestigationSnapshot<State>;
  snapshot(): InteractiveInvestigationSnapshot<State>;
}

function clone<State>(value: State): State {
  return structuredClone(value);
}

export function createInteractiveInvestigationSession<State>(
  config: InteractiveInvestigationConfig<State>,
): InteractiveInvestigationSession<State> {
  const lesson = createLessonSession(config.experience);
  const assessment = createAssessmentSession(config.assessment);
  let domain = clone(config.initialState);
  let feedback: InvestigationFeedback | undefined;

  const currentStage = () =>
    config.experience.stages[lesson.snapshot().stageIndex];

  const snapshot = (): InteractiveInvestigationSnapshot<State> => ({
    lesson: lesson.snapshot(),
    domain: clone(domain),
    mastery: assessment.mastery(),
    feedback: feedback ? { ...feedback } : undefined,
  });

  const assertCurrentAction = (action: NormalizedAction) => {
    const errors = validateNormalizedAction(action);
    if (errors.length > 0) throw new Error(errors.join('; '));
    if (action.phase !== 'commit') {
      throw new Error(
        `Interactive action ${action.actionId} must use the commit phase`,
      );
    }
    if (action.stageId !== currentStage().id) {
      throw new Error(
        `Action ${action.actionId} targets ${action.stageId}; current stage ${currentStage().id}`,
      );
    }
  };

  const assertLessonTransition = (
    lessonActionId: string,
    evidenceIds: readonly string[],
  ) => {
    const stage = currentStage();
    if (!stage.requiredActionIds.includes(lessonActionId)) {
      throw new Error(
        `Action ${lessonActionId} is not permitted in current stage ${stage.id}`,
      );
    }
    for (const evidenceId of evidenceIds) {
      if (!stage.completionEvidenceIds.includes(evidenceId)) {
        throw new Error(
          `Evidence ${evidenceId} does not belong to current stage ${stage.id}`,
        );
      }
    }
  };

  return {
    dispatch(action) {
      assertCurrentAction(action);

      if (action.actionId === 'assessment.answer') {
        const binding = config.assessmentBindings[action.targetEntityId];
        if (!binding) {
          throw new Error(
            `Assessment prompt ${action.targetEntityId} has no lesson binding`,
          );
        }
        if (typeof action.value !== 'string' || !action.value.trim()) {
          throw new Error(
            `Assessment prompt ${action.targetEntityId} requires an answer ID`,
          );
        }
        assertLessonTransition(binding.lessonActionId, [
          binding.lessonEvidenceId,
        ]);
        const answer = assessment.answer(action.targetEntityId, action.value);
        lesson.performAction(binding.lessonActionId);
        if (answer.correct) {
          lesson.recordEvidence(binding.lessonEvidenceId);
          feedback = {
            tone: 'success',
            message: answer.explanation ?? 'Evidence accepted.',
          };
        } else {
          feedback = {
            tone: 'retry',
            message: answer.hint ?? 'Observe again and retry.',
          };
        }
        return snapshot();
      }

      const transition = config.reducer(clone(domain), action);
      assertLessonTransition(transition.lessonActionId, transition.evidenceIds);
      lesson.performAction(transition.lessonActionId);
      for (const evidenceId of transition.evidenceIds) {
        lesson.recordEvidence(evidenceId);
      }
      domain = clone(transition.state);
      feedback = transition.feedback ? { ...transition.feedback } : undefined;
      return snapshot();
    },

    next() {
      lesson.next();
      feedback = undefined;
      return snapshot();
    },

    previous() {
      lesson.previous();
      feedback = undefined;
      return snapshot();
    },

    restart() {
      lesson.restart();
      assessment.reset();
      domain = clone(config.initialState);
      feedback = undefined;
      return snapshot();
    },

    snapshot,
  };
}
