import { describe, expect, it } from 'vitest';
import {
  PREPOSITION_DEFINITIONS,
  PREPOSITION_MEMORY_QUESTIONS,
  PREPOSITION_PRACTICE_CHALLENGES,
  PREPOSITION_STAGES,
  PREPOSITION_VR_REQUIREMENTS,
  answerPrepositionMemoryQuestion,
  answerPrepositionPractice,
  createPrepositionProgress,
  getPrepositionMemoryScore,
  isPrepositionStageComplete,
  recordPrepositionAction,
} from '../../apps/web/lib/prepositionAdventureLesson';

describe('Class 2 preposition adventure lesson model', () => {
  it('covers the requested prepositions', () => {
    expect(PREPOSITION_DEFINITIONS.map(preposition => preposition.label)).toEqual([
      'On',
      'Under',
      'In',
      'Inside',
      'Outside',
      'Above',
      'Below',
      'Behind',
      'In Front Of',
      'Next To',
      'Near',
      'Between',
      'Over',
    ]);
  });

  it('structures an 8-10 minute child-friendly English adventure', () => {
    const totalSeconds = PREPOSITION_STAGES.reduce(
      (sum, stage) => sum + stage.durationSeconds,
      0,
    );

    expect(totalSeconds).toBeGreaterThanOrEqual(480);
    expect(totalSeconds).toBeLessThanOrEqual(600);
    expect(PREPOSITION_STAGES.map(stage => stage.id)).toEqual([
      'intro',
      'learn-prepositions',
      'preposition-practice',
      'memory-check',
      'celebration',
    ]);
    expect(PREPOSITION_STAGES[0].environment).toContain('No students appear inside the simulation');
  });

  it('keeps VR requirements positive, playful, and no-student', () => {
    expect(PREPOSITION_VR_REQUIREMENTS).toContain('Class 2 English');
    expect(PREPOSITION_VR_REQUIREMENTS).toContain('8-10 minute adventure');
    expect(PREPOSITION_VR_REQUIREMENTS).toContain('Positive reinforcement only');
    expect(PREPOSITION_VR_REQUIREMENTS).toContain('No student NPCs');
  });

  it('requires each preposition placement in the learning section', () => {
    let progress = createPrepositionProgress();
    for (const definition of PREPOSITION_DEFINITIONS) {
      progress = recordPrepositionAction(progress, 'learn-prepositions', definition.actionId);
    }

    expect(isPrepositionStageComplete(progress, 'learn-prepositions')).toBe(true);
    expect(() => recordPrepositionAction(progress, 'learn-prepositions', 'wrong-action')).toThrow(/not valid/);
  });

  it('scores practice and memory checks', () => {
    let progress = createPrepositionProgress();

    for (const challenge of PREPOSITION_PRACTICE_CHALLENGES) {
      progress = answerPrepositionPractice(progress, challenge.id, challenge.correctPrepositionId);
    }
    expect(isPrepositionStageComplete(progress, 'preposition-practice')).toBe(true);

    for (const question of PREPOSITION_MEMORY_QUESTIONS) {
      progress = answerPrepositionMemoryQuestion(progress, question.id, question.correctPrepositionId);
    }
    expect(getPrepositionMemoryScore(progress)).toEqual({ correct: 6, total: 6 });
    expect(isPrepositionStageComplete(progress, 'memory-check')).toBe(true);
  });
});
