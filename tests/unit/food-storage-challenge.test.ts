import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_FOODS,
  SPOILAGE_COVERAGE,
  evaluateStorageChallenge,
  scoreStoragePrediction,
} from '@xr-school/simulation-runtime';
import type { StorageConditions } from '@xr-school/simulation-runtime';

const WEEK = 7;

function conditions(overrides: Partial<StorageConditions> = {}): StorageConditions {
  return { temperatureC: 25, humidityPercent: 70, sealed: false, ...overrides };
}

function outcomeFor(foodId: string, given: StorageConditions) {
  const result = evaluateStorageChallenge(given, CHALLENGE_FOODS, WEEK);
  const outcome = result.outcomes.find((entry) => entry.foodId === foodId);
  expect(outcome, `no outcome for ${foodId}`).toBeDefined();
  return outcome!;
}

describe('evaluateStorageChallenge', () => {
  it('keeps food longer in a cool dry store than a warm humid one', () => {
    const warmHumid = outcomeFor('bread', conditions({ temperatureC: 30, humidityPercent: 90 }));
    const coolDry = outcomeFor('bread', conditions({ temperatureC: 6, humidityPercent: 25 }));

    expect(warmHumid.safeAtEnd).toBe(false);
    expect(coolDry.safeAtEnd).toBe(true);
    expect(warmHumid.spoiledOnDay).toBeDefined();
    expect(coolDry.spoiledOnDay).toBeUndefined();
  });

  it('has no single setting that saves everything, so the learner must trade off', () => {
    // The whole point of the challenge: a seal decides where a food's water
    // comes from. There is no setting that rescues both the rice and the mango.
    const sealed = conditions({ temperatureC: 22, humidityPercent: 35, sealed: true });
    const open = conditions({ temperatureC: 22, humidityPercent: 35, sealed: false });

    // Dry rice in a damp-ish room: sealing keeps the room's water out.
    const riceSealed = outcomeFor('rice', sealed);
    const riceOpen = outcomeFor('rice', open);
    expect(riceSealed.effectiveMoisturePercent).toBeLessThan(
      riceOpen.effectiveMoisturePercent,
    );
    expect(riceSealed.readings.at(-1)!.surfaceCoverage).toBeLessThan(
      riceOpen.readings.at(-1)!.surfaceCoverage,
    );

    // A ripe mango carries its own juice: sealing shuts it in, and it goes first.
    const fruitSealed = outcomeFor('fruit', sealed);
    const fruitOpen = outcomeFor('fruit', open);
    expect(fruitSealed.effectiveMoisturePercent).toBeGreaterThan(
      fruitOpen.effectiveMoisturePercent,
    );
    // Both are visibly mouldy within days, so compare while they still differ.
    expect(fruitSealed.readings[2]!.surfaceCoverage).toBeGreaterThan(
      fruitOpen.readings[2]!.surfaceCoverage,
    );
  });

  it('spoils different foods on different days under identical conditions', () => {
    const result = evaluateStorageChallenge(
      conditions({ temperatureC: 27, humidityPercent: 80 }),
      CHALLENGE_FOODS,
      WEEK,
    );
    const days = result.outcomes
      .map((outcome) => outcome.spoiledOnDay)
      .filter((day): day is number => day !== undefined);

    expect(days.length).toBeGreaterThan(1);
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('never lets mould retreat as the week goes on', () => {
    for (const food of CHALLENGE_FOODS) {
      const outcome = outcomeFor(food.id, conditions({ temperatureC: 26, humidityPercent: 75 }));
      const coverage = outcome.readings.map((reading) => reading.surfaceCoverage);
      expect(coverage, `${food.id} coverage went backwards`).toEqual(
        [...coverage].sort((a, b) => a - b),
      );
      expect(outcome.readings).toHaveLength(WEEK + 1);
      expect(outcome.readings[0]!.day).toBe(0);
    }
  });

  it('reports the first day a food is visibly mouldy', () => {
    const outcome = outcomeFor('bread', conditions({ temperatureC: 30, humidityPercent: 92 }));
    const firstVisible = outcome.readings.find(
      (reading) => reading.surfaceCoverage >= SPOILAGE_COVERAGE,
    );

    expect(outcome.spoiledOnDay).toBe(firstVisible?.day);
    expect(outcome.readings.at(-1)!.spoiled).toBe(true);
  });

  it('rejects impossible storage settings rather than inventing a result', () => {
    expect(() => evaluateStorageChallenge(conditions({ temperatureC: Number.NaN }), CHALLENGE_FOODS, WEEK))
      .toThrow(/temperature/i);
    expect(() => evaluateStorageChallenge(conditions({ humidityPercent: 500 }), CHALLENGE_FOODS, WEEK))
      .toThrow(/humidity/i);
    expect(() => evaluateStorageChallenge(conditions(), CHALLENGE_FOODS, 0))
      .toThrow(/days/i);
    expect(() => evaluateStorageChallenge(conditions(), [], WEEK)).toThrow(/food/i);
  });
});

describe('scoreStoragePrediction', () => {
  const result = () =>
    evaluateStorageChallenge(
      conditions({ temperatureC: 28, humidityPercent: 85 }),
      CHALLENGE_FOODS,
      WEEK,
    );

  it('credits a learner who called the order right', () => {
    const observed = result();
    const trueOrder = [...observed.outcomes]
      .sort((a, b) => (b.readings.at(-1)!.surfaceCoverage - a.readings.at(-1)!.surfaceCoverage))
      .map((outcome) => outcome.foodId);

    const score = scoreStoragePrediction(trueOrder, observed);

    expect(score.correctlyRanked).toBe(trueOrder.length);
    expect(score.accuracy).toBe(1);
    expect(score.firstToSpoilCalled).toBe(true);
  });

  it('does not credit a reversed guess', () => {
    const observed = result();
    const trueOrder = [...observed.outcomes]
      .sort((a, b) => (b.readings.at(-1)!.surfaceCoverage - a.readings.at(-1)!.surfaceCoverage))
      .map((outcome) => outcome.foodId);

    const score = scoreStoragePrediction([...trueOrder].reverse(), observed);

    expect(score.accuracy).toBeLessThan(1);
    expect(score.firstToSpoilCalled).toBe(false);
  });

  it('refuses a prediction that is not about the foods on the shelf', () => {
    const observed = result();
    expect(() => scoreStoragePrediction(['pizza'], observed)).toThrow(/prediction/i);
    expect(() => scoreStoragePrediction([], observed)).toThrow(/prediction/i);
  });
});
