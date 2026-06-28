import { describe, expect, it } from 'vitest';
import type {
  AssessmentSequence,
} from '../../packages/simulation-schema/src/index';
import {
  createAssessmentSession,
} from '../../packages/simulation-runtime/src/index';

const TEST_SEQUENCE: AssessmentSequence = {
  id: 'assessment-diagnostic',
  objectiveId: 'objective-diagnostic',
  prompts: [
    {
      id: 'observe',
      kind: 'observation',
      stageId: 'stage-1',
      question: 'Which object changed?',
      acceptedEvidenceIds: ['sphere'],
      hint: 'Watch the sphere.',
      explanation: 'The sphere changed.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'misconception',
      kind: 'misconception',
      stageId: 'stage-1',
      question: 'Did color change mass?',
      acceptedEvidenceIds: ['no'],
      hint: 'Only appearance changed.',
      explanation: 'Color does not change mass.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'transfer',
      kind: 'transfer',
      stageId: 'stage-1',
      question: 'Would another color change mass?',
      acceptedEvidenceIds: ['no'],
      hint: 'Apply the same rule.',
      explanation: 'Material color does not set mass.',
      retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 2,
    requiredKinds: ['misconception', 'transfer'],
    allowHintedMastery: true,
  },
};

describe('assessment mastery engine', () => {
  it('returns a hint after error and records evidence after retry', () => {
    const session = createAssessmentSession(TEST_SEQUENCE);

    expect(session.answer('misconception', 'yes')).toMatchObject({
      correct: false,
      hint: 'Only appearance changed.',
    });
    expect(session.answer('misconception', 'no')).toMatchObject({
      correct: true,
    });
    expect(session.evidence()).toContainEqual(expect.objectContaining({
      promptId: 'misconception',
      hinted: true,
    }));
  });

  it('requires independent misconception and transfer evidence for mastery', () => {
    const session = createAssessmentSession(TEST_SEQUENCE);

    session.answer('observe', 'sphere');
    expect(session.mastery().mastered).toBe(false);
    session.answer('misconception', 'no');
    session.answer('transfer', 'no');

    expect(session.mastery()).toMatchObject({
      mastered: true,
      evidenceCount: 3,
    });
  });
});
