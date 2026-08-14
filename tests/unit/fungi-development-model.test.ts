import { describe, expect, it } from 'vitest';
import {
  FUNGAL_GROWTH_STAGES,
  FUNGAL_OBJECTS,
  evaluateFungalGrowth,
  initialFungiDevelopmentState,
  reduceFungiDevelopment,
} from '../../packages/simulation-runtime/src/index';
import type {
  FungiDevelopmentAction,
  FungiDevelopmentState,
} from '../../packages/simulation-runtime/src/index';

function reduceAll(
  actions: readonly FungiDevelopmentAction[],
): FungiDevelopmentState {
  return actions.reduce(reduceFungiDevelopment, initialFungiDevelopmentState);
}

describe('fungi development model', () => {
  it('classifies the supplied objects and gives child-friendly distinguishing facts', () => {
    expect(FUNGAL_OBJECTS.mushroom).toMatchObject({
      kingdom: 'fungus',
      fact: expect.stringMatching(/spores/i),
    });
    expect(FUNGAL_OBJECTS['bread-mould']).toMatchObject({
      kingdom: 'fungus',
      fact: expect.stringMatching(/threads|hyphae/i),
    });
    expect(FUNGAL_OBJECTS['green-plant']).toMatchObject({
      kingdom: 'plant',
      fact: expect.stringMatching(/sunlight|food/i),
    });
  });

  it('maps the warm, moist reference conditions to the five stages in order', () => {
    expect(
      [1, 2, 3, 4, 5].map(
        (day) =>
          evaluateFungalGrowth({ day, temperatureC: 27, moisturePercent: 82 })
            .stage,
      ),
    ).toEqual(FUNGAL_GROWTH_STAGES);
  });

  it('slows or suppresses development in cooler and drier valid conditions', () => {
    expect(
      evaluateFungalGrowth({ day: 5, temperatureC: 16, moisturePercent: 55 })
        .stage,
    ).toBe('hyphae-visible');
    expect(
      evaluateFungalGrowth({ day: 5, temperatureC: 5, moisturePercent: 20 })
        .stage,
    ).toBe('landed-spore');
  });

  it('accepts declared environmental boundaries and is deterministic', () => {
    const minimum = evaluateFungalGrowth({
      day: 1,
      temperatureC: 0,
      moisturePercent: 0,
    });
    const maximum = evaluateFungalGrowth({
      day: 5,
      temperatureC: 45,
      moisturePercent: 100,
    });
    const input = { day: 4, temperatureC: 21, moisturePercent: 67 };

    expect(minimum.stage).toBe('landed-spore');
    expect(maximum.stage).toBe('landed-spore');
    expect(evaluateFungalGrowth(input)).toEqual(evaluateFungalGrowth(input));
  });

  it.each([
    [{ day: Number.NaN, temperatureC: 27, moisturePercent: 82 }, /day/i],
    [{ day: 1.5, temperatureC: 27, moisturePercent: 82 }, /integer/i],
    [{ day: 0, temperatureC: 27, moisturePercent: 82 }, /1.*5/i],
    [{ day: 6, temperatureC: 27, moisturePercent: 82 }, /1.*5/i],
    [
      { day: 1, temperatureC: Number.POSITIVE_INFINITY, moisturePercent: 82 },
      /temperature/i,
    ],
    [{ day: 1, temperatureC: -1, moisturePercent: 82 }, /temperature/i],
    [{ day: 1, temperatureC: 46, moisturePercent: 82 }, /temperature/i],
    [{ day: 1, temperatureC: 27, moisturePercent: Number.NaN }, /moisture/i],
    [{ day: 1, temperatureC: 27, moisturePercent: -1 }, /moisture/i],
    [{ day: 1, temperatureC: 27, moisturePercent: 101 }, /moisture/i],
  ] as const)('strictly rejects invalid growth input %#', (input, message) => {
    expect(() => evaluateFungalGrowth(input)).toThrow(message);
  });

  it('preserves the first prediction while updating the latest prediction', () => {
    const first = reduceFungiDevelopment(initialFungiDevelopmentState, {
      type: 'predict-growth',
      stage: 'hyphae-visible',
    });
    const retry = reduceFungiDevelopment(first, {
      type: 'predict-growth',
      stage: 'mycelium-spreading',
    });

    expect(retry.firstGrowthPrediction).toBe('hyphae-visible');
    expect(retry.latestGrowthPrediction).toBe('mycelium-spreading');
    expect(first.latestGrowthPrediction).toBe('hyphae-visible');
  });

  it('records selections, unique touches, spore activity, days, roles, quiz answers, and evidence immutably', () => {
    const state = reduceAll([
      { type: 'select-fungus', objectId: 'mushroom' },
      { type: 'touch-hypha', hyphaId: 'hypha-1' },
      { type: 'guide-spore', guidanceId: 'air-current-1' },
      { type: 'land-spore', landingId: 'moist-bread' },
      { type: 'visit-day', day: 1 },
      {
        type: 'match-useful-role',
        objectId: 'bread-mould',
        role: 'decomposer',
      },
      {
        type: 'answer-quiz',
        questionId: 'transfer-1',
        answer: 'fungus',
        correct: true,
        independentTransfer: true,
      },
    ]);

    expect(state).toMatchObject({
      selectedFungi: ['mushroom'],
      touchedHyphae: ['hypha-1'],
      sporeGuidance: ['air-current-1'],
      sporeLandings: ['moist-bread'],
      visitedDays: [1],
      usefulRoleMatches: [{ objectId: 'bread-mould', role: 'decomposer' }],
      quizAnswers: [
        {
          questionId: 'transfer-1',
          answer: 'fungus',
          correct: true,
          independentTransfer: true,
        },
      ],
    });
    expect(state.evidenceIds).toEqual([
      'fungus-selected:mushroom',
      'hypha-touched:hypha-1',
      'spore-guided:air-current-1',
      'spore-landed:moist-bread',
      'day-visited:1',
      'useful-role:bread-mould:decomposer',
      'quiz-answered:transfer-1',
    ]);
    expect(initialFungiDevelopmentState.evidenceIds).toEqual([]);
  });

  it('does not fabricate evidence when the same event is repeated', () => {
    const once = reduceAll([
      { type: 'touch-hypha', hyphaId: 'hypha-1' },
      { type: 'visit-day', day: 2 },
    ]);
    const twice = reduceAll([
      { type: 'touch-hypha', hyphaId: 'hypha-1' },
      { type: 'visit-day', day: 2 },
      { type: 'touch-hypha', hyphaId: 'hypha-1' },
      { type: 'visit-day', day: 2 },
    ]);

    expect(twice).toEqual(once);
  });

  it('requires life-cycle labels to be recorded in biological order', () => {
    const first = reduceFungiDevelopment(initialFungiDevelopmentState, {
      type: 'record-life-cycle',
      label: 'spore-lands',
    });
    expect(() =>
      reduceFungiDevelopment(first, {
        type: 'record-life-cycle',
        label: 'mycelium-forms',
      }),
    ).toThrow(/expected hypha-grows/i);
  });

  it('resolves the unsafe-to-touch-or-eat misconception only after a corrected decision', () => {
    const misconception = reduceFungiDevelopment(initialFungiDevelopmentState, {
      type: 'decide-safety',
      outcome: 'touch-or-eat-unknown-fungus',
    });
    const corrected = reduceFungiDevelopment(misconception, {
      type: 'decide-safety',
      outcome: 'observe-without-touching-or-eating',
    });

    expect(misconception.safetyMisconceptionResolved).toBe(false);
    expect(corrected.safetyMisconceptionResolved).toBe(true);
    expect(corrected.safetyDecisions).toEqual([
      'touch-or-eat-unknown-fungus',
      'observe-without-touching-or-eating',
    ]);
  });

  it('distinguishes completion from mastery', () => {
    const completedOnly = reduceFungiDevelopment(initialFungiDevelopmentState, {
      type: 'complete',
    });
    expect(completedOnly.completed).toBe(true);
    expect(completedOnly.mastery).toBe(false);

    const mastered = reduceAll([
      { type: 'visit-day', day: 1 },
      { type: 'decide-safety', outcome: 'touch-or-eat-unknown-fungus' },
      { type: 'decide-safety', outcome: 'observe-without-touching-or-eating' },
      {
        type: 'answer-quiz',
        questionId: 'new-sample',
        answer: 'fungus',
        correct: true,
        independentTransfer: true,
      },
      { type: 'complete' },
    ]);
    expect(mastered).toMatchObject({ completed: true, mastery: true });
  });

  it('rejects unknown actions', () => {
    expect(() =>
      reduceFungiDevelopment(initialFungiDevelopmentState, {
        type: 'invent-evidence',
      } as never),
    ).toThrow(/unknown fungi development action/i);
  });

  it.each([
    [{ type: 'predict-growth', stage: 'giant-mushroom' }, /growth stage/i],
    [
      { type: 'match-useful-role', objectId: 'mushroom', role: 'runs-fast' },
      /useful role/i,
    ],
    [{ type: 'decide-safety', outcome: 'lick-it' }, /safety outcome/i],
  ])('rejects invalid reducer values %#', (invalidAction, message) => {
    expect(() =>
      reduceFungiDevelopment(
        initialFungiDevelopmentState,
        invalidAction as never,
      ),
    ).toThrow(message);
  });
});
