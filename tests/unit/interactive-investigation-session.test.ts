import { describe, expect, it } from 'vitest';
import type {
  AssessmentSequence,
  ExperienceDefinition,
  NormalizedAction,
  NormalizedInputSource,
} from '../../packages/simulation-schema/src/index';
import {
  createInteractiveInvestigationSession,
  type InvestigationReducer,
} from '../../packages/simulation-runtime/src/index';

interface TestState {
  observations: number;
}

const experience: ExperienceDefinition = {
  id: 'experience-interactive-test',
  gradeTone: 'class6To8',
  objective: 'Use observation, misconception, and transfer evidence.',
  stages: [
    {
      id: 'observe',
      title: 'Observe',
      cue: 'Run the trial.',
      requiredActionIds: ['trial.observe'],
      completionEvidenceIds: ['trial-observed'],
    },
    {
      id: 'misconception',
      title: 'Resolve',
      cue: 'Reject the misconception.',
      requiredActionIds: ['assessment.answer'],
      completionEvidenceIds: ['misconception-resolved'],
    },
    {
      id: 'transfer',
      title: 'Transfer',
      cue: 'Apply the idea to a new case.',
      requiredActionIds: ['assessment.answer'],
      completionEvidenceIds: ['transfer-solved'],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: 'assessment-interactive-test',
  objectiveId: experience.id,
  prompts: [
    {
      id: 'misconception-prompt',
      kind: 'misconception',
      stageId: 'misconception',
      question: 'Does appearance alone determine the result?',
      options: [
        { id: 'appearance-only', label: 'Yes' },
        { id: 'measured-evidence', label: 'No' },
      ],
      acceptedEvidenceIds: ['measured-evidence'],
      hint: 'Use the observed trial.',
      explanation:
        'The measured trial, not appearance alone, determines the result.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'transfer-prompt',
      kind: 'transfer',
      stageId: 'transfer',
      question: 'Which new case follows the observed rule?',
      options: [
        { id: 'same-rule', label: 'The case with the same measured evidence' },
        { id: 'same-colour', label: 'The case with the same colour' },
      ],
      acceptedEvidenceIds: ['same-rule'],
      hint: 'Transfer the evidence rule.',
      explanation: 'The new case must match the evidence pattern.',
      retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 2,
    requiredKinds: ['misconception', 'transfer'],
    allowHintedMastery: false,
  },
};

const reducer: InvestigationReducer<TestState> = (state, action) => {
  if (action.actionId !== 'trial.observe') {
    throw new Error(`Unsupported test action ${action.actionId}`);
  }
  return {
    state: { observations: state.observations + 1 },
    lessonActionId: 'trial.observe',
    evidenceIds: ['trial-observed'],
    feedback: { tone: 'success', message: 'The trial was observed.' },
  };
};

function action(
  actionId: string,
  stageId: string,
  source: NormalizedInputSource = 'mouse',
  targetEntityId = 'trial',
  value?: string,
): NormalizedAction {
  return {
    actionId,
    targetEntityId,
    source,
    phase: 'commit',
    stageId,
    timestampMs: 100,
    value,
  };
}

function createSession() {
  return createInteractiveInvestigationSession({
    experience,
    assessment,
    initialState: { observations: 0 },
    reducer,
    assessmentBindings: {
      'misconception-prompt': {
        lessonActionId: 'assessment.answer',
        lessonEvidenceId: 'misconception-resolved',
      },
      'transfer-prompt': {
        lessonActionId: 'assessment.answer',
        lessonEvidenceId: 'transfer-solved',
      },
    },
  });
}

describe('interactive investigation session', () => {
  it('records lesson evidence only after a valid domain transition', () => {
    const session = createSession();
    const result = session.dispatch(action('trial.observe', 'observe'));

    expect(result.domain.observations).toBe(1);
    expect(result.lesson).toMatchObject({
      stageComplete: true,
      performedActionIds: ['trial.observe'],
      recordedEvidenceIds: ['trial-observed'],
    });
  });

  it('rejects stale-stage actions before mutating domain or lesson state', () => {
    const session = createSession();

    expect(() => session.dispatch(action('trial.observe', 'transfer'))).toThrow(
      /current stage observe/i,
    );
    expect(session.snapshot()).toMatchObject({
      domain: { observations: 0 },
      lesson: { performedActionIds: [], recordedEvidenceIds: [] },
    });
  });

  it('does not award evidence or mastery for a wrong assessment answer', () => {
    const session = createSession();
    session.dispatch(action('trial.observe', 'observe'));
    session.next();

    const wrong = session.dispatch(
      action(
        'assessment.answer',
        'misconception',
        'keyboard',
        'misconception-prompt',
        'appearance-only',
      ),
    );

    expect(wrong.lesson.stageComplete).toBe(false);
    expect(wrong.lesson.recordedEvidenceIds).not.toContain(
      'misconception-resolved',
    );
    expect(wrong.mastery.mastered).toBe(false);
    expect(wrong.feedback).toMatchObject({
      tone: 'retry',
      message: 'Use the observed trial.',
    });
  });

  it('keeps completion separate from unhinted mastery', () => {
    const session = createSession();
    session.dispatch(action('trial.observe', 'observe'));
    session.next();
    session.dispatch(
      action(
        'assessment.answer',
        'misconception',
        'mouse',
        'misconception-prompt',
        'measured-evidence',
      ),
    );
    session.next();

    expect(session.snapshot().lesson.lessonComplete).toBe(false);
    expect(session.snapshot().mastery.mastered).toBe(false);

    const completed = session.dispatch(
      action(
        'assessment.answer',
        'transfer',
        'touch',
        'transfer-prompt',
        'same-rule',
      ),
    );
    expect(completed.lesson.lessonComplete).toBe(true);
    expect(completed.mastery.mastered).toBe(true);
  });

  it.each<NormalizedInputSource>([
    'mouse',
    'touch',
    'keyboard',
    'xr-controller',
  ])('maps %s to the same domain and evidence result', (source) => {
    const session = createSession();
    const result = session.dispatch(action('trial.observe', 'observe', source));
    expect(result.domain).toEqual({ observations: 1 });
    expect(result.lesson.recordedEvidenceIds).toEqual(['trial-observed']);
  });

  it('restarts lesson, assessment, feedback, and domain state together', () => {
    const session = createSession();
    session.dispatch(action('trial.observe', 'observe'));
    session.restart();

    expect(session.snapshot()).toMatchObject({
      domain: { observations: 0 },
      lesson: { stageId: 'observe', recordedEvidenceIds: [] },
      mastery: { mastered: false, evidenceCount: 0 },
      feedback: undefined,
    });
  });
});
