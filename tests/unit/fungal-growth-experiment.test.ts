import { describe, expect, it } from 'vitest';

import {
  calculateLitterDecomposition,
  calculateYeastDoughResponse,
  evaluateFungalExperiment,
} from '@xr-school/simulation-runtime';

describe('evaluateFungalExperiment', () => {
  it('makes a warm moist bread trial outgrow a cold dry control', () => {
    const control = evaluateFungalExperiment({
      temperatureC: 8,
      moisturePercent: 20,
      substrate: 'bread',
      elapsedHours: 96,
      inoculumViability: 0.9,
    });
    const treatment = evaluateFungalExperiment({
      temperatureC: 27,
      moisturePercent: 82,
      substrate: 'bread',
      elapsedHours: 96,
      inoculumViability: 0.9,
    });

    expect(treatment.surfaceCoverage).toBeGreaterThan(
      control.surfaceCoverage + 0.5,
    );
    expect(treatment.sporulationReadiness).toBeGreaterThan(
      control.sporulationReadiness,
    );
  });

  it('suppresses extension at the high-temperature boundary', () => {
    const optimum = evaluateFungalExperiment({
      temperatureC: 27,
      moisturePercent: 85,
      substrate: 'fruit',
      elapsedHours: 120,
      inoculumViability: 1,
    });
    const hot = evaluateFungalExperiment({
      temperatureC: 40,
      moisturePercent: 85,
      substrate: 'fruit',
      elapsedHours: 120,
      inoculumViability: 1,
    });

    expect(hot.hyphalExtensionRate).toBeLessThan(
      optimum.hyphalExtensionRate * 0.3,
    );
  });

  it('advances continuously without decreasing colony coverage', () => {
    const samples = [0, 12, 36, 72, 120].map(
      (elapsedHours) =>
        evaluateFungalExperiment({
          temperatureC: 25,
          moisturePercent: 80,
          substrate: 'bread',
          elapsedHours,
          inoculumViability: 0.95,
        }).surfaceCoverage,
    );

    expect(samples).toEqual([...samples].sort((a, b) => a - b));
    expect(new Set(samples).size).toBeGreaterThan(3);
  });

  it('is deterministic and keeps normalized outputs clamped', () => {
    const input = {
      temperatureC: 26,
      moisturePercent: 78,
      substrate: 'fruit' as const,
      elapsedHours: 84,
      inoculumViability: 0.87,
    };
    const first = evaluateFungalExperiment(input);

    expect(evaluateFungalExperiment(input)).toEqual(first);
    expect(first.branchingDensity).toBeGreaterThanOrEqual(0);
    expect(first.branchingDensity).toBeLessThanOrEqual(1);
    expect(first.surfaceCoverage).toBeGreaterThanOrEqual(0);
    expect(first.surfaceCoverage).toBeLessThanOrEqual(1);
    expect(first.sporulationReadiness).toBeGreaterThanOrEqual(0);
    expect(first.sporulationReadiness).toBeLessThanOrEqual(1);
    expect(first.sporeReleaseIntensity).toBeGreaterThanOrEqual(0);
    expect(first.sporeReleaseIntensity).toBeLessThanOrEqual(1);
  });

  it('keeps dry paper a weak substrate control', () => {
    const common = {
      temperatureC: 27,
      moisturePercent: 82,
      elapsedHours: 120,
      inoculumViability: 1,
    };
    const bread = evaluateFungalExperiment({ ...common, substrate: 'bread' });
    const paper = evaluateFungalExperiment({
      ...common,
      substrate: 'dry-paper',
    });

    expect(paper.surfaceCoverage).toBeLessThan(0.15);
    expect(bread.surfaceCoverage).toBeGreaterThan(paper.surfaceCoverage + 0.5);
  });

  it.each([
    [
      {
        temperatureC: Number.NaN,
        moisturePercent: 82,
        substrate: 'bread',
        elapsedHours: 24,
        inoculumViability: 1,
      },
      'temperatureC must be finite',
    ],
    [
      {
        temperatureC: 4,
        moisturePercent: 82,
        substrate: 'bread',
        elapsedHours: 24,
        inoculumViability: 1,
      },
      'temperatureC must be between 5 and 40',
    ],
    [
      {
        temperatureC: 27,
        moisturePercent: 101,
        substrate: 'bread',
        elapsedHours: 24,
        inoculumViability: 1,
      },
      'moisturePercent must be between 10 and 100',
    ],
    [
      {
        temperatureC: 27,
        moisturePercent: 82,
        substrate: 'bread',
        elapsedHours: -1,
        inoculumViability: 1,
      },
      'elapsedHours must be between 0 and 120',
    ],
    [
      {
        temperatureC: 27,
        moisturePercent: 82,
        substrate: 'bread',
        elapsedHours: 24,
        inoculumViability: Number.POSITIVE_INFINITY,
      },
      'inoculumViability must be finite',
    ],
    [
      {
        temperatureC: 27,
        moisturePercent: 82,
        substrate: 'compost',
        elapsedHours: 24,
        inoculumViability: 1,
      },
      'substrate must be bread, fruit, or dry-paper',
    ],
    [
      {
        temperatureC: 27,
        moisturePercent: 82,
        substrate: 'constructor',
        elapsedHours: 24,
        inoculumViability: 1,
      },
      'substrate must be bread, fruit, or dry-paper',
    ],
  ] as const)('rejects invalid experiment input %#', (input, message) => {
    expect(() =>
      evaluateFungalExperiment(
        input as Parameters<typeof evaluateFungalExperiment>[0],
      ),
    ).toThrow(message);
  });
});

describe('representative fungi-at-work calculators', () => {
  it('makes warm active yeast produce more gas and dough expansion over time', () => {
    const early = calculateYeastDoughResponse({
      temperatureC: 28,
      elapsedHours: 12,
      yeastPresent: true,
    });
    const later = calculateYeastDoughResponse({
      temperatureC: 28,
      elapsedHours: 72,
      yeastPresent: true,
    });
    const cold = calculateYeastDoughResponse({
      temperatureC: 8,
      elapsedHours: 72,
      yeastPresent: true,
    });
    const control = calculateYeastDoughResponse({
      temperatureC: 28,
      elapsedHours: 72,
      yeastPresent: false,
    });

    expect(later.gasVolumeMl).toBeGreaterThan(early.gasVolumeMl);
    expect(later.doughVolumeMl).toBeGreaterThan(early.doughVolumeMl);
    expect(later.gasVolumeMl).toBeGreaterThan(cold.gasVolumeMl);
    expect(later.doughVolumeMl).toBeGreaterThan(control.doughVolumeMl);
  });

  it('reduces litter mass while nutrient release increases with time and warmth', () => {
    const initial = calculateLitterDecomposition({
      temperatureC: 26,
      elapsedHours: 0,
      initialLitterMassGrams: 100,
    });
    const later = calculateLitterDecomposition({
      temperatureC: 26,
      elapsedHours: 120,
      initialLitterMassGrams: 100,
    });
    const cold = calculateLitterDecomposition({
      temperatureC: 8,
      elapsedHours: 120,
      initialLitterMassGrams: 100,
    });

    expect(later.remainingLitterMassGrams).toBeLessThan(
      initial.remainingLitterMassGrams,
    );
    expect(later.releasedNutrientsGrams).toBeGreaterThan(
      initial.releasedNutrientsGrams,
    );
    expect(later.decomposedFraction).toBeGreaterThan(cold.decomposedFraction);
  });
});
