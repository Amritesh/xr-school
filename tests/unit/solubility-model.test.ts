import { describe, expect, it } from 'vitest';
import type { NormalizedAction } from '../../packages/simulation-schema/src/index';
import {
  createSolubilityModel,
  initialSolubilityInvestigationState,
  reduceSolubilityInvestigation,
  runFairSolubilityTrial,
  type MixtureSnapshot,
} from '../../packages/simulation-runtime/src/index';

function total(snapshot: MixtureSnapshot) {
  return (
    snapshot.dissolvedMassG +
    snapshot.suspendedMassG +
    snapshot.settledMassG +
    snapshot.separatedMassG +
    snapshot.floatingMassG
  );
}

function advance(
  model: ReturnType<typeof createSolubilityModel>,
  seconds: number,
) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) {
    model.step(1 / 60);
  }
  return model.snapshot();
}

function action(
  actionId: string,
  targetEntityId: string,
  value?: string,
): NormalizedAction {
  return {
    actionId,
    targetEntityId,
    value,
    source: 'mouse',
    phase: 'commit',
    stageId:
      actionId === 'solubility.predict'
        ? 'predict'
        : actionId === 'solubility.compare-rate'
          ? 'investigate-rate'
          : 'fair-test',
    timestampMs: 1,
  };
}

describe('solubility domain model', () => {
  it('conserves every gram across all mixture pools', () => {
    const model = createSolubilityModel({ substanceId: 'salt' });
    model.addSolute(25);
    model.setStirring(true);
    const result = advance(model, 18);
    expect(total(result)).toBeCloseTo(result.addedMassG, 3);
  });

  it('reaches saturation and leaves excess salt visible', () => {
    const model = createSolubilityModel({ substanceId: 'salt', waterMassG: 100 });
    model.addSolute(50);
    model.setStirring(true);
    const result = advance(model, 120);
    expect(result.saturationCapacityG).toBeCloseTo(36, 0);
    expect(result.dissolvedMassG).toBeCloseTo(result.saturationCapacityG, 1);
    expect(result.settledMassG).toBeGreaterThan(10);
    expect(result.saturationState).toBe('saturated');
  });

  it('changes sugar rate with stirring and temperature without creating mass', () => {
    const still = createSolubilityModel({
      substanceId: 'sugar',
      temperatureC: 15,
    });
    const stirredWarm = createSolubilityModel({
      substanceId: 'sugar',
      temperatureC: 55,
    });
    still.addSolute(40);
    stirredWarm.addSolute(40);
    stirredWarm.setStirring(true);
    const stillResult = advance(still, 8);
    const warmResult = advance(stirredWarm, 8);
    expect(warmResult.dissolvedMassG).toBeGreaterThan(stillResult.dissolvedMassG);
    expect(total(warmResult)).toBeCloseTo(40, 3);
  });

  it('distinguishes sediment, suspension, separated oil, and floating sawdust', () => {
    expect(runFairSolubilityTrial('sand').phaseState).toBe('sediment');
    expect(runFairSolubilityTrial('chalk').phaseState).toBe('suspension');
    expect(runFairSolubilityTrial('oil').phaseState).toBe('separated-layer');
    const sawdust = runFairSolubilityTrial('sawdust');
    expect(sawdust.phaseState).toBe('floating-solid');
    expect(sawdust.floatingMassG).toBeGreaterThan(4.5);
    expect(sawdust.dissolvedMassG).toBe(0);
  });

  it('requires a prediction before returning fair-trial evidence', () => {
    expect(() =>
      reduceSolubilityInvestigation(
        initialSolubilityInvestigationState,
        action('solubility.run-fair-trial', 'salt'),
      ),
    ).toThrow(/prediction.*salt/i);
  });

  it('emits measured evidence for all six fair trials', () => {
    const predicted = reduceSolubilityInvestigation(
      initialSolubilityInvestigationState,
      action('solubility.predict', 'sawdust', 'insoluble'),
    );
    const tested = reduceSolubilityInvestigation(
      predicted.state,
      action('solubility.run-fair-trial', 'sawdust'),
    );
    expect(tested).toMatchObject({
      lessonActionId: 'solubility.run-fair-trial',
      evidenceIds: ['trial-sawdust-floating-solid'],
      state: { trials: { sawdust: { phaseState: 'floating-solid' } } },
    });
  });

  it('records both one-variable rate comparisons', () => {
    const stirring = reduceSolubilityInvestigation(
      initialSolubilityInvestigationState,
      action('solubility.compare-rate', 'stirring'),
    );
    const temperature = reduceSolubilityInvestigation(
      stirring.state,
      action('solubility.compare-rate', 'temperature'),
    );
    expect(stirring.evidenceIds).toEqual(['stirring-rate-compared']);
    expect(temperature.evidenceIds).toEqual(['temperature-rate-compared']);
    expect(temperature.state.rateComparisons).toEqual({
      stirring: true,
      temperature: true,
    });
  });

  it('parses encoded XR prediction targets', () => {
    const predicted = reduceSolubilityInvestigation(
      initialSolubilityInvestigationState,
      {
        ...action('solubility.predict', 'sawdust::insoluble'),
        source: 'xr-controller',
      },
    );
    expect(predicted.state.predictions).toEqual({ sawdust: 'insoluble' });
  });

  it('resets deterministically and rejects non-finite input', () => {
    const model = createSolubilityModel({ substanceId: 'chalk' });
    model.addSolute(10);
    model.setStirring(true);
    advance(model, 3);
    model.reset('chalk');
    expect(model.snapshot()).toMatchObject({
      addedMassG: 0,
      dissolvedMassG: 0,
      suspendedMassG: 0,
      settledMassG: 0,
      separatedMassG: 0,
      floatingMassG: 0,
    });
    expect(() => model.addSolute(Number.NaN)).toThrow(/finite/i);
    expect(() => model.step(Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });
});
