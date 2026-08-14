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

  it('preserves the first condition choice while updating the latest choice', () => {
    const first = reduceFungiDevelopment(initialFungiDevelopmentState, {
      type: 'choose-growth-condition',
      condition: 'dry-cold',
    });
    const retry = reduceFungiDevelopment(first, {
      type: 'choose-growth-condition',
      condition: 'warm-moist',
    });

    expect(retry.firstGrowthPrediction).toBe('dry-cold');
    expect(retry.latestGrowthPrediction).toBe('warm-moist');
    expect(first.latestGrowthPrediction).toBe('dry-cold');
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
        objectId: 'saprotrophic-fungus',
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
      usefulRoleMatches: [{ objectId: 'saprotrophic-fungus', role: 'decomposer' }],
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
      'useful-role:saprotrophic-fungus:decomposer',
      'quiz-answered:transfer-1',
    ]);
    expect(initialFungiDevelopmentState.evidenceIds).toEqual([]);
  });

  it('keeps useful actors scientifically distinct from classification specimens', () => {
    const state = reduceAll([
      { type: 'match-useful-role', objectId: 'yeast', role: 'food' },
      { type: 'match-useful-role', objectId: 'antibiotic-producing-fungus', role: 'medicine' },
      { type: 'match-useful-role', objectId: 'saprotrophic-fungus', role: 'decomposer' },
    ]);

    expect(state.usefulRoleMatches).toEqual([
      { objectId: 'yeast', role: 'food' },
      { objectId: 'antibiotic-producing-fungus', role: 'medicine' },
      { objectId: 'saprotrophic-fungus', role: 'decomposer' },
    ]);
    expect(() => reduceFungiDevelopment(state, {
      type: 'match-useful-role', objectId: 'mushroom', role: 'medicine',
    } as never)).toThrow(/useful actor/i);
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

  it('resolves an unsafe-to-touch-or-eat decision after a correction', () => {
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

  it('treats a correct-first safety decision as misconception resolution for mastery', () => {
    const state = reduceAll([
      { type: 'visit-day', day: 1 },
      {
        type: 'decide-safety',
        outcome: 'observe-without-touching-or-eating',
      },
      {
        type: 'answer-quiz',
        questionId: 'new-sample',
        answer: 'fungus',
        correct: true,
        independentTransfer: true,
      },
    ]);

    expect(state).toMatchObject({
      safetyMisconceptionResolved: true,
      mastery: true,
      completed: false,
    });
  });

  it('does not regress resolution across safe, unsafe, safe decisions', () => {
    const safe = reduceFungiDevelopment(initialFungiDevelopmentState, {
      type: 'decide-safety',
      outcome: 'observe-without-touching-or-eating',
    });
    const unsafe = reduceFungiDevelopment(safe, {
      type: 'decide-safety',
      outcome: 'touch-or-eat-unknown-fungus',
    });
    const safeAgain = reduceFungiDevelopment(unsafe, {
      type: 'decide-safety',
      outcome: 'observe-without-touching-or-eating',
    });

    expect(safe.safetyMisconceptionResolved).toBe(true);
    expect(unsafe.safetyMisconceptionResolved).toBe(true);
    expect(safeAgain.safetyMisconceptionResolved).toBe(true);
    expect(safeAgain.safetyDecisions).toEqual([
      'observe-without-touching-or-eating',
      'touch-or-eat-unknown-fungus',
    ]);
  });

  it('distinguishes completion from mastery', () => {
    const completedOnly = reduceFungiDevelopment(initialFungiDevelopmentState, {
      type: 'complete',
    });
    expect(completedOnly.completed).toBe(true);
    expect(completedOnly.mastery).toBe(false);

    const masteredBeforeCompletion = reduceAll([
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
    ]);
    expect(masteredBeforeCompletion).toMatchObject({
      completed: false,
      mastery: true,
    });
  });

  it('rejects unknown actions', () => {
    expect(() =>
      reduceFungiDevelopment(initialFungiDevelopmentState, {
        type: 'invent-evidence',
      } as never),
    ).toThrow(/unknown fungi development action/i);
  });

  it.each([
    [
      { type: 'choose-growth-condition', condition: 'giant-mushroom' },
      /growth condition choice/i,
    ],
    [
      { type: 'match-useful-role', objectId: 'yeast', role: 'runs-fast' },
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
