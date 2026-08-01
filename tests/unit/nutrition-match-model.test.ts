import { describe, expect, it } from 'vitest';
import {
  createNutritionMatchReducer,
  MINERAL_CASES,
  VITAMIN_CASES,
} from '../../packages/simulation-runtime/src/index';

const action = (targetEntityId: string, value?: string) => ({
  actionId: 'nutrition.submit-match',
  targetEntityId,
  value,
  source: 'mouse' as const,
  phase: 'commit' as const,
  stageId: 'match',
  timestampMs: 1,
});

describe('nutrition match model', () => {
  it.each([
    [MINERAL_CASES, 'calcium', 'milk-curd::bones-teeth', 'mineral-calcium-matched'],
    [MINERAL_CASES, 'iodine', 'iodized-salt::thyroid-growth', 'mineral-iodine-matched'],
    [MINERAL_CASES, 'iron', 'leafy-greens::red-blood-cells', 'mineral-iron-matched'],
    [VITAMIN_CASES, 'a', 'carrot::night-blindness', 'vitamin-a-matched'],
    [VITAMIN_CASES, 'b1', 'whole-grains::beriberi', 'vitamin-b1-matched'],
    [VITAMIN_CASES, 'c', 'orange::scurvy', 'vitamin-c-matched'],
    [VITAMIN_CASES, 'd', 'sunlight::rickets', 'vitamin-d-matched'],
  ] as const)(
    'accepts the reference match for %s',
    (cases, id, value, evidenceId) => {
      const result = createNutritionMatchReducer(cases)(
        { completedIds: [], attempts: {} },
        action(id, value),
      );
      expect(result.evidenceIds).toEqual([evidenceId]);
      expect(result.state.completedIds).toContain(id);
    },
  );

  it('keeps an incorrect pair unresolved and returns a directional hint', () => {
    const result = createNutritionMatchReducer(MINERAL_CASES)(
      { completedIds: [], attempts: {} },
      action('iron', 'milk-curd::red-blood-cells'),
    );
    expect(result.evidenceIds).toEqual([]);
    expect(result.state.completedIds).toEqual([]);
    expect(result.feedback).toMatchObject({ tone: 'retry' });
  });

  it('parses an encoded XR full-pair choice target', () => {
    const result = createNutritionMatchReducer(MINERAL_CASES)(
      { completedIds: [], attempts: {} },
      {
        ...action('iron::leafy-greens::red-blood-cells'),
        source: 'xr-controller',
      },
    );
    expect(result.evidenceIds).toEqual(['mineral-iron-matched']);
  });

  it('increments attempts immutably for wrong and correct submissions', () => {
    const reducer = createNutritionMatchReducer(MINERAL_CASES);
    const initial = { completedIds: [], attempts: {} };
    const wrong = reducer(initial, action('calcium', 'milk-curd::thyroid-growth'));
    const correct = reducer(wrong.state, action('calcium', 'milk-curd::bones-teeth'));
    expect(initial.attempts).toEqual({});
    expect(correct.state.attempts.calcium).toBe(2);
  });
});
