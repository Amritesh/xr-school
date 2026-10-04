import { describe, expect, it } from 'vitest';
import {
  COLOUR_ADVENTURE_COLOURS,
  COLOUR_ADVENTURE_STAGES,
  COLOUR_ADVENTURE_VR_REQUIREMENTS,
  COLOUR_MEMORY_QUESTIONS,
  answerColourMemoryQuestion,
  applyColourAdventureAction,
  canFinishColourMemory,
  canVisitColourStage,
  colourMemoryActionId,
  createColourAdventureProgress,
  getColourMemoryScore,
  getActiveColourQuestion,
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

  it('rejects DOM, scene and controller Finish until all answers are correct', () => {
    let progress = createColourAdventureProgress();
    for (const question of COLOUR_MEMORY_QUESTIONS) {
      progress = answerColourMemoryQuestion(progress, question.id, question.optionIds.find(id => id !== question.correctColourId)!);
    }
    expect(Object.keys(progress.memoryAnswers)).toHaveLength(10);
    expect(canFinishColourMemory(progress)).toBe(false);
    expect(recordColourAdventureAction(progress, 'memory-check', 'complete-memory-check')).toBe(progress);
    const finish = applyColourAdventureAction(progress, 'memory-check', 'complete-memory-check');
    expect(finish.accepted).toBe(false);
    expect(isColourAdventureStageComplete(finish.progress, 'memory-check')).toBe(false);
    expect(canVisitColourStage(finish.progress, 13)).toBe(false);
  });

  it('does not crash on the cloud-blue regression or an unknown/stale question', () => {
    const progress = createColourAdventureProgress();
    expect(answerColourMemoryQuestion(progress, 'cloud-white', 'blue')).toBe(progress);
    expect(answerColourMemoryQuestion(progress, 'missing', 'red')).toBe(progress);
    for (const action of ['memory-pad-blue', colourMemoryActionId('cloud-white', 'blue')]) {
      expect(applyColourAdventureAction(progress, 'memory-check', action).progress).toBe(progress);
    }
  });

  it('keeps wrong answers on the same object and ignores delayed previous-question actions', () => {
    const progress = createColourAdventureProgress();
    const wrong = applyColourAdventureAction(progress, 'memory-check', colourMemoryActionId('apple-red', 'blue'));
    expect(wrong.accepted).toBe(false);
    expect(getActiveColourQuestion(wrong.progress)?.id).toBe('apple-red');
    expect(getColourMemoryScore(wrong.progress).correct).toBe(0);
    const correct = applyColourAdventureAction(wrong.progress, 'memory-check', colourMemoryActionId('apple-red', 'red'));
    expect(getActiveColourQuestion(correct.progress)?.id).toBe('banana-yellow');
    const duplicate = applyColourAdventureAction(correct.progress, 'memory-check', colourMemoryActionId('apple-red', 'red'));
    expect(duplicate.progress).toBe(correct.progress);
    expect(getColourMemoryScore(duplicate.progress).correct).toBe(1);
  });

  it('requires all ten matches AND explicit Finish before unlocking celebration', () => {
    let progress = createColourAdventureProgress();
    for (const stage of COLOUR_ADVENTURE_STAGES.slice(0, 12)) {
      for (const action of stage.requiredActionIds) progress = applyColourAdventureAction(progress, stage.id, action).progress;
    }
    expect(canVisitColourStage(progress, 12)).toBe(true);
    for (const question of COLOUR_MEMORY_QUESTIONS) {
      expect(getActiveColourQuestion(progress)?.id).toBe(question.id);
      progress = applyColourAdventureAction(progress, 'memory-check', colourMemoryActionId(question.id, question.correctColourId)).progress;
      expect(canVisitColourStage(progress, 13)).toBe(false);
    }
    expect(getActiveColourQuestion(progress)).toBeUndefined();
    expect(canFinishColourMemory(progress)).toBe(true);
    progress = applyColourAdventureAction(progress, 'memory-check', 'complete-memory-check').progress;
    expect(canVisitColourStage(progress, 13)).toBe(true);
    expect(canVisitColourStage(createColourAdventureProgress(), 13)).toBe(false);
    expect(canVisitColourStage(progress, Number.NaN)).toBe(false);
  });

  it('does not trust a finish flag with missing answers', () => {
    const progress = { ...createColourAdventureProgress(), completedActions: { 'memory-check': ['complete-memory-check'] } };
    expect(isColourAdventureStageComplete(progress, 'memory-check')).toBe(false);
  });
});
