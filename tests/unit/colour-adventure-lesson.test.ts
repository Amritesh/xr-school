import { describe, expect, it } from 'vitest';
import {
  COLOUR_ADVENTURE_COLOURS,
  COLOUR_ADVENTURE_STAGES,
  COLOUR_ADVENTURE_VR_REQUIREMENTS,
  COLOUR_MEMORY_QUESTIONS,
  answerColourMemoryQuestion,
  createColourAdventureProgress,
  getColourMemoryScore,
  isColourAdventureStageComplete,
  recordColourAdventureAction,
} from '../../apps/web/lib/colourAdventureLesson';

describe('Class 1 colour adventure lesson model', () => {
  it('teaches only the ten requested beginner colours', () => {
    expect(COLOUR_ADVENTURE_COLOURS.map(colour => colour.name)).toEqual([
      'Red',
      'Blue',
      'Yellow',
      'Green',
      'Orange',
      'Purple',
      'Pink',
      'Brown',
      'Black',
      'White',
    ]);
  });

  it('structures an 8-10 minute adventure with short interactions', () => {
    const totalSeconds = COLOUR_ADVENTURE_STAGES.reduce(
      (sum, stage) => sum + stage.durationSeconds,
      0,
    );

    expect(totalSeconds).toBeGreaterThanOrEqual(480);
    expect(totalSeconds).toBeLessThanOrEqual(600);
    expect(COLOUR_ADVENTURE_STAGES).toHaveLength(14);
    for (const stage of COLOUR_ADVENTURE_STAGES) {
      expect(stage.teacherNarration.length).toBeGreaterThan(40);
      expect(stage.transition.length).toBeGreaterThan(15);
      expect(stage.reward.length).toBeGreaterThan(15);
    }
  });

  it('keeps the experience age-appropriate for Meta Quest 3S', () => {
    expect(COLOUR_ADVENTURE_VR_REQUIREMENTS).toContain('Meta Quest 3S');
    expect(COLOUR_ADVENTURE_VR_REQUIREMENTS).toContain('Large high-contrast visuals instead of long text');
    expect(COLOUR_ADVENTURE_VR_REQUIREMENTS).toContain('Interaction every 20-30 seconds');
    expect(COLOUR_ADVENTURE_VR_REQUIREMENTS).toContain('No student NPCs');
  });

  it('requires a touch action for each colour world', () => {
    let progress = createColourAdventureProgress();
    progress = recordColourAdventureAction(progress, 'learn-red', 'touch-red-balloon');

    expect(isColourAdventureStageComplete(progress, 'learn-red')).toBe(true);
    expect(() => recordColourAdventureAction(
      progress,
      'learn-red',
      'touch-blue-balloon',
    )).toThrow(/not valid/);
  });

  it('scores the ten memory questions', () => {
    expect(COLOUR_MEMORY_QUESTIONS).toHaveLength(10);
    let progress = createColourAdventureProgress();
    for (const question of COLOUR_MEMORY_QUESTIONS) {
      progress = answerColourMemoryQuestion(progress, question.id, question.correctColourId);
    }

    expect(getColourMemoryScore(progress)).toEqual({ correct: 10, total: 10 });
  });
});
