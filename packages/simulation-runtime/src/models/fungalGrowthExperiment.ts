export type FungalSubstrate = 'bread' | 'fruit' | 'dry-paper';

export interface FungalExperimentInput {
  temperatureC: number;
  moisturePercent: number;
  substrate: FungalSubstrate;
  elapsedHours: number;
  inoculumViability: number;
}

export interface FungalExperimentOutput {
  germinationDelayHours: number;
  hyphalExtensionRate: number;
  branchingDensity: number;
  colonyRadiusMm: number;
  surfaceCoverage: number;
  sporulationReadiness: number;
  sporeReleaseIntensity: number;
  phase: 'dormant' | 'germinating' | 'extending' | 'colonising' | 'sporulating';
}

export interface YeastDoughInput {
  temperatureC: number;
  elapsedHours: number;
  yeastPresent: boolean;
}

export interface YeastDoughOutput {
  gasVolumeMl: number;
  doughVolumeMl: number;
  doughExpansion: number;
}

export interface LitterDecompositionInput {
  temperatureC: number;
  elapsedHours: number;
  initialLitterMassGrams: number;
}

export interface LitterDecompositionOutput {
  remainingLitterMassGrams: number;
  decomposedLitterMassGrams: number;
  decomposedFraction: number;
  releasedNutrientsGrams: number;
}

export const FUNGAL_EXPERIMENT_BOUNDS = Object.freeze({
  temperatureC: Object.freeze({ minimum: 5, maximum: 40 }),
  moisturePercent: Object.freeze({ minimum: 10, maximum: 100 }),
  elapsedHours: Object.freeze({ minimum: 0, maximum: 120 }),
  inoculumViability: Object.freeze({ minimum: 0, maximum: 1 }),
});

const SUBSTRATE_FACTORS: Readonly<
  Record<
    FungalSubstrate,
    { germination: number; extension: number; branching: number }
  >
> = {
  bread: { germination: 1, extension: 1, branching: 1 },
  fruit: { germination: 0.88, extension: 0.86, branching: 0.9 },
  'dry-paper': { germination: 0.16, extension: 0.08, branching: 0.12 },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampUnit(value: number): number {
  return clamp(value, 0, 1);
}

function smootherStep(value: number): number {
  const x = clampUnit(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function finiteInRange(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
  if (value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function temperatureResponse(temperatureC: number): number {
  return anchoredTemperatureResponse(temperatureC, 27);
}

function anchoredTemperatureResponse(
  temperatureC: number,
  optimumC: number,
): number {
  const lowC = FUNGAL_EXPERIMENT_BOUNDS.temperatureC.minimum;
  const highC = FUNGAL_EXPERIMENT_BOUNDS.temperatureC.maximum;
  return temperatureC <= optimumC
    ? smootherStep((temperatureC - lowC) / (optimumC - lowC))
    : smootherStep((highC - temperatureC) / (highC - optimumC));
}

/**
 * Produces a deterministic, representative classroom projection. It is not a
 * species-specific growth forecast.
 */
export function evaluateFungalExperiment(
  input: FungalExperimentInput,
): FungalExperimentOutput {
  const temperatureC = finiteInRange(
    input.temperatureC,
    'temperatureC',
    FUNGAL_EXPERIMENT_BOUNDS.temperatureC.minimum,
    FUNGAL_EXPERIMENT_BOUNDS.temperatureC.maximum,
  );
  const moisturePercent = finiteInRange(
    input.moisturePercent,
    'moisturePercent',
    FUNGAL_EXPERIMENT_BOUNDS.moisturePercent.minimum,
    FUNGAL_EXPERIMENT_BOUNDS.moisturePercent.maximum,
  );
  const elapsedHours = finiteInRange(
    input.elapsedHours,
    'elapsedHours',
    FUNGAL_EXPERIMENT_BOUNDS.elapsedHours.minimum,
    FUNGAL_EXPERIMENT_BOUNDS.elapsedHours.maximum,
  );
  const inoculumViability = finiteInRange(
    input.inoculumViability,
    'inoculumViability',
    FUNGAL_EXPERIMENT_BOUNDS.inoculumViability.minimum,
    FUNGAL_EXPERIMENT_BOUNDS.inoculumViability.maximum,
  );
  if (
    typeof input.substrate !== 'string' ||
    !Object.hasOwn(SUBSTRATE_FACTORS, input.substrate)
  ) {
    throw new Error('substrate must be bread, fruit, or dry-paper');
  }
  const substrate = SUBSTRATE_FACTORS[input.substrate];

  const temperatureFactor = temperatureResponse(temperatureC);
  const germinationMoistureFactor = smootherStep((moisturePercent - 10) / 72);
  const extensionMoistureFactor = smootherStep((moisturePercent - 18) / 64);
  const germinationFactor =
    temperatureFactor *
    germinationMoistureFactor *
    substrate.germination *
    inoculumViability;
  const germinationDelayHours = clamp(8 + 48 * (1 - germinationFactor), 8, 56);
  const hyphalExtensionRate = clamp(
    1.15 *
      temperatureFactor *
      extensionMoistureFactor *
      substrate.extension *
      inoculumViability,
    0,
    1.15,
  );
  const postGerminationHours = Math.max(
    0,
    elapsedHours - germinationDelayHours,
  );
  const colonyRadiusMm = clamp(
    postGerminationHours * hyphalExtensionRate,
    0,
    120,
  );
  const surfaceCoverage = clampUnit(
    1 - Math.exp(-Math.pow(colonyRadiusMm / 30, 1.45)),
  );
  const ageFactor = smootherStep(postGerminationHours / 72);
  const branchingDensity = clampUnit(
    surfaceCoverage *
      (0.35 + 0.65 * extensionMoistureFactor) *
      substrate.branching *
      ageFactor,
  );
  const sporulationReadiness = clampUnit(
    smootherStep((surfaceCoverage - 0.42) / 0.48) *
      smootherStep(postGerminationHours / 80) *
      temperatureFactor,
  );
  const sporeReleaseIntensity = clampUnit(
    sporulationReadiness *
      smootherStep((postGerminationHours - 42) / 42) *
      (0.4 + 0.6 * extensionMoistureFactor),
  );

  const phase: FungalExperimentOutput['phase'] =
    inoculumViability === 0 || hyphalExtensionRate < 0.001
      ? 'dormant'
      : elapsedHours < germinationDelayHours
        ? elapsedHours === 0
          ? 'dormant'
          : 'germinating'
        : sporulationReadiness >= 0.45
          ? 'sporulating'
          : surfaceCoverage >= 0.35
            ? 'colonising'
            : 'extending';

  return {
    germinationDelayHours,
    hyphalExtensionRate,
    branchingDensity,
    colonyRadiusMm,
    surfaceCoverage,
    sporulationReadiness,
    sporeReleaseIntensity,
    phase,
  };
}

/** Representative classroom projection for a yeast-treated dough vessel. */
export function calculateYeastDoughResponse(
  input: YeastDoughInput,
): YeastDoughOutput {
  const temperatureC = finiteInRange(
    input.temperatureC,
    'temperatureC',
    FUNGAL_EXPERIMENT_BOUNDS.temperatureC.minimum,
    FUNGAL_EXPERIMENT_BOUNDS.temperatureC.maximum,
  );
  const elapsedHours = finiteInRange(
    input.elapsedHours,
    'elapsedHours',
    FUNGAL_EXPERIMENT_BOUNDS.elapsedHours.minimum,
    FUNGAL_EXPERIMENT_BOUNDS.elapsedHours.maximum,
  );
  if (typeof input.yeastPresent !== 'boolean') {
    throw new Error('yeastPresent must be a boolean');
  }

  const gasVolumeMl = input.yeastPresent
    ? clamp(
        75 *
          anchoredTemperatureResponse(temperatureC, 30) *
          smootherStep(elapsedHours / 72),
        0,
        75,
      )
    : 0;
  const doughVolumeMl = clamp(100 + gasVolumeMl * 0.65, 100, 150);

  return {
    gasVolumeMl,
    doughVolumeMl,
    doughExpansion: clampUnit((doughVolumeMl - 100) / 50),
  };
}

/** Representative classroom projection for litter loss and nutrient release. */
export function calculateLitterDecomposition(
  input: LitterDecompositionInput,
): LitterDecompositionOutput {
  const temperatureC = finiteInRange(
    input.temperatureC,
    'temperatureC',
    FUNGAL_EXPERIMENT_BOUNDS.temperatureC.minimum,
    FUNGAL_EXPERIMENT_BOUNDS.temperatureC.maximum,
  );
  const elapsedHours = finiteInRange(
    input.elapsedHours,
    'elapsedHours',
    FUNGAL_EXPERIMENT_BOUNDS.elapsedHours.minimum,
    FUNGAL_EXPERIMENT_BOUNDS.elapsedHours.maximum,
  );
  const initialLitterMassGrams = finiteInRange(
    input.initialLitterMassGrams,
    'initialLitterMassGrams',
    0,
    10_000,
  );

  const decomposedFraction = clampUnit(
    0.65 *
      anchoredTemperatureResponse(temperatureC, 26) *
      smootherStep(elapsedHours / 120),
  );
  const decomposedLitterMassGrams = initialLitterMassGrams * decomposedFraction;

  return {
    remainingLitterMassGrams:
      initialLitterMassGrams - decomposedLitterMassGrams,
    decomposedLitterMassGrams,
    decomposedFraction,
    releasedNutrientsGrams: decomposedLitterMassGrams * 0.35,
  };
}
