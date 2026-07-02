import { describe, expect, it } from 'vitest';
import { createLessonSession } from '../../packages/simulation-runtime/src/index';
import type { ExperienceDefinition } from '../../packages/simulation-schema/src/index';

const definition: ExperienceDefinition = {
  id: 'experience-test',
  gradeTone: 'class6To8',
  objective: 'Observe two valid results.',
  stages: [
    {
      id: 'stage-one',
      title: 'First',
      cue: 'Perform the first action.',
      requiredActionIds: ['first-action'],
      completionEvidenceIds: ['first-observed'],
    },
    {
      id: 'stage-two',
      title: 'Second',
      cue: 'Transfer the observation.',
      requiredActionIds: ['second-action'],
      completionEvidenceIds: ['transfer-observed'],
    },
  ],
};

describe('lesson session', () => {
  it('requires both meaningful action and observable evidence', () => {
    const session = createLessonSession(definition);
    session.performAction('first-action');
    expect(session.snapshot().stageComplete).toBe(false);
    session.recordEvidence('first-observed');
    expect(session.snapshot().stageComplete).toBe(true);
  });

  it('blocks skipping and rejects actions from another stage', () => {
    const session = createLessonSession(definition);
    expect(() => session.next()).toThrow(/complete/i);
    expect(() => session.performAction('second-action')).toThrow(/current stage/i);
  });

  it('advances, preserves evidence, and restarts deterministically', () => {
    const session = createLessonSession(definition);
    session.performAction('first-action');
    session.recordEvidence('first-observed');
    session.next();
    expect(session.snapshot()).toMatchObject({ stageIndex: 1, stageId: 'stage-two' });
    session.restart();
    expect(session.snapshot()).toMatchObject({
      stageIndex: 0,
      performedActionIds: [],
      recordedEvidenceIds: [],
    });
  });

  it('returns copies that cannot mutate session state', () => {
    const session = createLessonSession(definition);
    const snapshot = session.performAction('first-action');
    snapshot.performedActionIds.push('second-action');
    expect(session.snapshot().performedActionIds).toEqual(['first-action']);
  });
});
