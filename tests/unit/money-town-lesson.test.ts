import { describe, expect, it } from 'vitest';
import {
  MONEY_IDENTIFICATION_ROUNDS,
  MONEY_MEMORY_QUESTIONS,
  MONEY_SHOP_ITEMS,
  MONEY_TOWN_MONEY,
  MONEY_TOWN_STAGES,
  MONEY_TOWN_VR_REQUIREMENTS,
  answerMoneyIdentificationRound,
  answerMoneyMemoryQuestion,
  createMoneyTownProgress,
  getMoneyMemoryScore,
  isMoneyTownStageComplete,
  recordMoneyTownAction,
} from '../../apps/web/lib/moneyTownLesson';

describe('Class 1 Money Town lesson model', () => {
  it('introduces the requested Indian coins and currency notes only', () => {
    expect(MONEY_TOWN_MONEY.map(money => money.label)).toEqual([
      'Rs 1 Coin',
      'Rs 2 Coin',
      'Rs 5 Coin',
      'Rs 10 Coin',
      'Rs 10 Note',
      'Rs 20 Note',
      'Rs 50 Note',
      'Rs 100 Note',
      'Rs 200 Note',
      'Rs 500 Note',
    ]);
    expect(MONEY_TOWN_MONEY.map(money => money.label)).not.toContain('Rs 2000 Note');
  });

  it('structures an 8-10 minute Magic Money Town experience', () => {
    const totalSeconds = MONEY_TOWN_STAGES.reduce(
      (sum, stage) => sum + stage.durationSeconds,
      0,
    );

    expect(totalSeconds).toBeGreaterThanOrEqual(480);
    expect(totalSeconds).toBeLessThanOrEqual(600);
    expect(MONEY_TOWN_STAGES.map(stage => stage.id)).toEqual([
      'intro',
      'learn-coins',
      'learn-notes',
      'coins-vs-notes',
      'identify-money',
      'shopping-challenge',
      'memory-check',
      'celebration',
    ]);
    expect(MONEY_TOWN_STAGES[0].environment).toContain('No students are present');
  });

  it('keeps Quest 3S interactions age-appropriate', () => {
    expect(MONEY_TOWN_VR_REQUIREMENTS).toContain('Meta Quest 3S');
    expect(MONEY_TOWN_VR_REQUIREMENTS).toContain('Trigger picks up coins, grabs notes, and selects answers');
    expect(MONEY_TOWN_VR_REQUIREMENTS).toContain('Soft glowing laser pointer for floating money objects');
    expect(MONEY_TOWN_VR_REQUIREMENTS).toContain('No student NPCs');
  });

  it('requires all coin and note interactions before the learning stages complete', () => {
    let progress = createMoneyTownProgress();
    for (const action of MONEY_TOWN_STAGES.find(stage => stage.id === 'learn-coins')!.requiredActionIds) {
      progress = recordMoneyTownAction(progress, 'learn-coins', action);
    }

    expect(isMoneyTownStageComplete(progress, 'learn-coins')).toBe(true);
    expect(() => recordMoneyTownAction(progress, 'learn-coins', 'touch-note-rs-500')).toThrow(/not valid/);
  });

  it('scores identification, shopping, and memory checks', () => {
    let progress = createMoneyTownProgress();

    for (const round of MONEY_IDENTIFICATION_ROUNDS) {
      progress = answerMoneyIdentificationRound(progress, round.id, round.correctMoneyId);
    }
    expect(isMoneyTownStageComplete(progress, 'identify-money')).toBe(true);

    for (const shopItem of MONEY_SHOP_ITEMS) {
      progress = recordMoneyTownAction(progress, 'shopping-challenge', `buy-${shopItem.id}`);
    }
    expect(isMoneyTownStageComplete(progress, 'shopping-challenge')).toBe(true);

    for (const question of MONEY_MEMORY_QUESTIONS) {
      progress = answerMoneyMemoryQuestion(progress, question.id, question.correctAnswer);
    }
    expect(getMoneyMemoryScore(progress)).toEqual({ correct: 8, total: 8 });
    expect(isMoneyTownStageComplete(progress, 'memory-check')).toBe(true);
  });
});
