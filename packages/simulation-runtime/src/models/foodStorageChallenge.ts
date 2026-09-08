import {
  FUNGAL_EXPERIMENT_BOUNDS,
  evaluateFungalExperiment,
  type FungalSubstrate,
} from './fungalGrowthExperiment.js';

/**
 * An open storage problem: several foods, one store, and settings the learner
 * chooses freely. There is deliberately no setting that saves everything —
 * sealing keeps airborne spores off but traps the water a food already holds,
 * so a learner has to reason about each food rather than find "the answer".
 */
export interface StoredFood {
  readonly id: string;
  readonly label: string;
  /** Water the food itself holds, 0-1. Dry rice is low, ripe fruit is high. */
  readonly waterActivity: number;
  readonly substrate: FungalSubstrate;
}

export interface StorageConditions {
  temperatureC: number;
  humidityPercent: number;
  /** Default wrapping for the shelf. */
  sealed: boolean;
  /**
   * Foods the learner chose to wrap individually. This is what makes the
   * problem worth solving: the store has one temperature and one humidity, but
   * each food can be wrapped or left open, so the best answer requires
   * reasoning about every item rather than finding one global setting.
   */
  sealedFoodIds?: readonly string[];
}

export interface StorageDayReading {
  day: number;
  surfaceCoverage: number;
  spoiled: boolean;
}

export interface StoredFoodOutcome {
  foodId: string;
  sealed: boolean;
  /** Moisture at the food's surface once the store and the food equilibrate. */
  effectiveMoisturePercent: number;
  inoculumViability: number;
  readings: StorageDayReading[];
  spoiledOnDay?: number;
  safeAtEnd: boolean;
}

export interface StorageChallengeResult {
  conditions: StorageConditions;
  days: number;
  outcomes: StoredFoodOutcome[];
  safeCount: number;
}

export interface StoragePredictionScore {
  correctlyRanked: number;
  accuracy: number;
  firstToSpoilCalled: boolean;
  observedOrder: string[];
}

/** Visible mould: the point a child would say "I am not eating that". */
export const SPOILAGE_COVERAGE = 0.15;

/**
 * The brief the learner works under. Refrigeration is deliberately off the
 * table: with a fridge, "make it cold" saves everything and a learner can win
 * knowing one variable. A village store without power forces the real
 * reasoning — where each food's water comes from — and makes it honest that
 * one of these foods cannot be kept for a week at all.
 */
export interface StorageBrief {
  readonly minimumTemperatureC: number;
  readonly maximumTemperatureC: number;
  readonly days: number;
  readonly question: string;
}

export const VILLAGE_STORE_BRIEF: StorageBrief = Object.freeze({
  minimumTemperatureC: 18,
  maximumTemperatureC: 34,
  days: 7,
  question:
    'The store has no electricity, so it cannot go below 18°C. Keep as much food as you can edible for seven days — and be ready to say which one cannot be saved, and why.',
});

/** True when a setting respects the brief the learner was given. */
export function respectsBrief(
  conditions: StorageConditions,
  brief: StorageBrief = VILLAGE_STORE_BRIEF,
): boolean {
  return (
    conditions.temperatureC >= brief.minimumTemperatureC &&
    conditions.temperatureC <= brief.maximumTemperatureC
  );
}

const HOURS_PER_DAY = 24;

/**
 * Food arrives already carrying its own spores, so wrapping does not change
 * the load in any way a week-long store would show. Sealing is modelled purely
 * as what it really controls — where the food's water comes from — which keeps
 * one clear mechanism for a learner to reason about instead of two that fight.
 */
const SURFACE_VIABILITY = 0.92;

export const CHALLENGE_FOODS: readonly StoredFood[] = Object.freeze([
  Object.freeze({
    id: 'bread',
    label: 'Loaf of bread',
    waterActivity: 0.62,
    substrate: 'bread' as FungalSubstrate,
  }),
  Object.freeze({
    id: 'fruit',
    label: 'Ripe mango',
    waterActivity: 0.86,
    substrate: 'fruit' as FungalSubstrate,
  }),
  Object.freeze({
    id: 'rice',
    label: 'Dry rice',
    waterActivity: 0.14,
    substrate: 'dry-paper' as FungalSubstrate,
  }),
  Object.freeze({
    id: 'chapati',
    label: 'Stack of chapatis',
    waterActivity: 0.48,
    substrate: 'bread' as FungalSubstrate,
  }),
]);

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`storage ${label} must be a finite number`);
  }
  return value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Where the food's surface moisture settles.
 *
 * Sealed, the small headspace equilibrates with the food itself, so the food
 * sits in its own water and the room stops mattering. Open, the surface drifts
 * partway toward the room. That is the trade-off the learner has to find: a
 * seal saves dry rice from a damp room and ruins a mango in its own juice.
 */
function isSealed(food: StoredFood, conditions: StorageConditions): boolean {
  return conditions.sealedFoodIds === undefined
    ? conditions.sealed
    : conditions.sealedFoodIds.includes(food.id);
}

function surfaceMoisturePercent(
  food: StoredFood,
  conditions: StorageConditions,
): number {
  const ownWater = food.waterActivity * 100;
  const equilibrium = isSealed(food, conditions)
    ? ownWater
    : 0.45 * conditions.humidityPercent + 0.55 * ownWater;
  return clamp(
    equilibrium,
    FUNGAL_EXPERIMENT_BOUNDS.moisturePercent.minimum,
    FUNGAL_EXPERIMENT_BOUNDS.moisturePercent.maximum,
  );
}

export function evaluateStorageChallenge(
  conditions: StorageConditions,
  foods: readonly StoredFood[],
  days: number,
): StorageChallengeResult {
  const temperatureC = finite(conditions?.temperatureC, 'temperature');
  if (
    temperatureC < FUNGAL_EXPERIMENT_BOUNDS.temperatureC.minimum ||
    temperatureC > FUNGAL_EXPERIMENT_BOUNDS.temperatureC.maximum
  ) {
    throw new Error(
      `storage temperature must be between ${FUNGAL_EXPERIMENT_BOUNDS.temperatureC.minimum} and ${FUNGAL_EXPERIMENT_BOUNDS.temperatureC.maximum}`,
    );
  }
  const humidityPercent = finite(conditions?.humidityPercent, 'humidity');
  if (humidityPercent < 0 || humidityPercent > 100) {
    throw new Error('storage humidity must be between 0 and 100');
  }
  if (typeof conditions?.sealed !== 'boolean') {
    throw new Error('storage sealed must be a boolean');
  }
  if (
    conditions.sealedFoodIds !== undefined &&
    (!Array.isArray(conditions.sealedFoodIds) ||
      conditions.sealedFoodIds.some((id) => typeof id !== 'string'))
  ) {
    throw new Error('storage sealed food IDs must be a list of strings');
  }
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('storage days must be a whole number of at least 1');
  }
  if (!Array.isArray(foods) || foods.length === 0) {
    throw new Error('storage needs at least one food on the shelf');
  }

  const inoculumViability = SURFACE_VIABILITY;

  const outcomes = foods.map<StoredFoodOutcome>((food) => {
    const effectiveMoisturePercent = surfaceMoisturePercent(food, conditions);
    const readings: StorageDayReading[] = [];
    let spoiledOnDay: number | undefined;

    for (let day = 0; day <= days; day += 1) {
      const { surfaceCoverage } = evaluateFungalExperiment({
        temperatureC,
        moisturePercent: effectiveMoisturePercent,
        substrate: food.substrate,
        elapsedHours: Math.min(
          day * HOURS_PER_DAY,
          FUNGAL_EXPERIMENT_BOUNDS.elapsedHours.maximum,
        ),
        inoculumViability,
      });
      const spoiled = surfaceCoverage >= SPOILAGE_COVERAGE;
      if (spoiled && spoiledOnDay === undefined) spoiledOnDay = day;
      readings.push({ day, surfaceCoverage, spoiled });
    }

    return {
      foodId: food.id,
      effectiveMoisturePercent,
      sealed: isSealed(food, conditions),
      inoculumViability,
      readings,
      ...(spoiledOnDay === undefined ? {} : { spoiledOnDay }),
      safeAtEnd: spoiledOnDay === undefined,
    };
  });

  return {
    conditions: {
      temperatureC,
      humidityPercent,
      sealed: conditions.sealed,
      ...(conditions.sealedFoodIds === undefined
        ? {}
        : { sealedFoodIds: [...conditions.sealedFoodIds] }),
    },
    days,
    outcomes,
    safeCount: outcomes.filter((outcome) => outcome.safeAtEnd).length,
  };
}

/**
 * Scores a learner's ranking of which food will suffer most. Ranking is the
 * cheapest honest probe of understanding: it cannot be satisfied by clicking
 * through, and it is wrong in informative ways.
 */
export function scoreStoragePrediction(
  predictedWorstFirst: readonly string[],
  observed: StorageChallengeResult,
): StoragePredictionScore {
  const observedOrder = [...observed.outcomes]
    .sort(
      (a, b) =>
        b.readings[b.readings.length - 1]!.surfaceCoverage -
        a.readings[a.readings.length - 1]!.surfaceCoverage,
    )
    .map((outcome) => outcome.foodId);

  if (
    !Array.isArray(predictedWorstFirst) ||
    predictedWorstFirst.length !== observedOrder.length ||
    new Set(predictedWorstFirst).size !== predictedWorstFirst.length ||
    predictedWorstFirst.some((foodId) => !observedOrder.includes(foodId))
  ) {
    throw new Error(
      'a storage prediction must rank each food on the shelf exactly once',
    );
  }

  const correctlyRanked = predictedWorstFirst.filter(
    (foodId, index) => observedOrder[index] === foodId,
  ).length;

  return {
    correctlyRanked,
    accuracy: correctlyRanked / observedOrder.length,
    firstToSpoilCalled: predictedWorstFirst[0] === observedOrder[0],
    observedOrder,
  };
}
