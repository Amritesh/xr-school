import { describe, expect, it } from 'vitest';

import {
  createFungiExperimentSession,
  evaluateFungalExperiment,
  reduceFungiExperiment,
} from '@xr-school/simulation-runtime';
import type {
  FungalExperimentInput,
  FungiExperimentAction,
  FungiExperimentSession,
} from '@xr-school/simulation-runtime';

const warmMoistBread: FungalExperimentInput = {
  temperatureC: 27,
  moisturePercent: 82,
  substrate: 'bread',
  elapsedHours: 96,
  inoculumViability: 0.9,
};

function dispatch(
  state: FungiExperimentSession,
  action: FungiExperimentAction,
): FungiExperimentSession {
  return reduceFungiExperiment(state, action);
}

function saveTrial(
  state: FungiExperimentSession,
  input: FungalExperimentInput,
): FungiExperimentSession {
  return dispatch(dispatch(state, { type: 'run-trial', input }), {
    type: 'save-current-trial',
  });
}

describe('fungi experiment session', () => {
  it('preserves the first prediction while updating the latest prediction', () => {
    const initial = createFungiExperimentSession();
    const first = dispatch(initial, {
      type: 'predict-trial',
      prediction: 'rapid-growth',
    });
    const revised = dispatch(first, {
      type: 'predict-trial',
      prediction: 'slow-growth',
    });

    expect(initial).not.toHaveProperty('firstPrediction');
    expect(first).toMatchObject({
      firstPrediction: 'rapid-growth',
      latestPrediction: 'rapid-growth',
    });
    expect(revised).toMatchObject({
      firstPrediction: 'rapid-growth',
      latestPrediction: 'slow-growth',
    });
    expect(first.latestPrediction).toBe('rapid-growth');
  });

  it('accepts a non-empty learner-authored prediction', () => {
    const predicted = dispatch(createFungiExperimentSession(), {
      type: 'predict-trial',
      prediction: 'visible growth after two days',
    });

    expect(predicted.latestPrediction).toBe('visible growth after two days');
  });

  it('validates and defensively copies current inputs and calculated outputs', () => {
    const suppliedInput = { ...warmMoistBread };
    const initial = createFungiExperimentSession();
    const adjusted = dispatch(initial, {
      type: 'set-input',
      input: suppliedInput,
    });

    suppliedInput.temperatureC = 8;

    expect(adjusted.currentInput).toEqual(warmMoistBread);
    expect(adjusted.currentInput).not.toBe(suppliedInput);
    expect(adjusted.currentOutput).toEqual(
      evaluateFungalExperiment(warmMoistBread),
    );
    expect(initial.currentInput).not.toEqual(warmMoistBread);
    expect(adjusted.currentTrial).toBeUndefined();
  });

  it('runs and saves trials without mutating earlier states', () => {
    const predicted = dispatch(createFungiExperimentSession(), {
      type: 'predict-trial',
      prediction: 'rapid-growth',
    });
    const run = dispatch(predicted, {
      type: 'run-trial',
      input: warmMoistBread,
    });
    const saved = dispatch(run, { type: 'save-current-trial' });

    expect(run.currentTrial).toEqual({
      input: warmMoistBread,
      output: evaluateFungalExperiment(warmMoistBread),
      prediction: 'rapid-growth',
    });
    expect(saved.savedTrials).toEqual([
      {
        id: 'trial-1',
        input: warmMoistBread,
        output: evaluateFungalExperiment(warmMoistBread),
        prediction: 'rapid-growth',
      },
    ]);
    expect(saved.currentTrial).toBeUndefined();
    expect(predicted.savedTrials).toEqual([]);
    expect(run.savedTrials).toEqual([]);
  });

  it('assigns stable sequential IDs to defensively copied saved trials', () => {
    const firstInput = { ...warmMoistBread };
    const secondInput = { ...warmMoistBread, temperatureC: 8 };
    const afterFirst = saveTrial(createFungiExperimentSession(), firstInput);
    const afterSecond = saveTrial(afterFirst, secondInput);

    firstInput.temperatureC = 5;
    secondInput.temperatureC = 40;

    expect(afterSecond.savedTrials.map((trial) => trial.id)).toEqual([
      'trial-1',
      'trial-2',
    ]);
    expect(
      afterSecond.savedTrials.map((trial) => trial.input.temperatureC),
    ).toEqual([27, 8]);
    expect(afterFirst.savedTrials).toHaveLength(1);
  });

  it('marks exactly one changed experimental variable as a fair comparison', () => {
    const first = saveTrial(createFungiExperimentSession(), warmMoistBread);
    const second = saveTrial(first, {
      ...warmMoistBread,
      moisturePercent: 30,
    });
    const compared = dispatch(second, {
      type: 'compare-trials',
      trialIds: ['trial-1', 'trial-2'],
    });

    expect(compared.comparison).toEqual({
      trialIds: ['trial-1', 'trial-2'],
      quality: 'fair',
      changedVariables: ['moisturePercent'],
    });
    expect(second.comparison).toBeUndefined();
  });

  it.each([
    ['no changed variables', warmMoistBread, [] as string[]],
    [
      'multiple changed variables',
      { ...warmMoistBread, temperatureC: 8, substrate: 'fruit' as const },
      ['temperatureC', 'substrate'],
    ],
  ])('marks %s as confounded', (_label, secondInput, changedVariables) => {
    const first = saveTrial(createFungiExperimentSession(), warmMoistBread);
    const second = saveTrial(first, secondInput);
    const compared = dispatch(second, {
      type: 'compare-trials',
      trialIds: ['trial-1', 'trial-2'],
    });

    expect(compared.comparison).toEqual({
      trialIds: ['trial-1', 'trial-2'],
      quality: 'confounded',
      changedVariables,
    });
  });

  it('requires two different existing trial IDs for comparison', () => {
    const state = saveTrial(createFungiExperimentSession(), warmMoistBread);
    const snapshot = structuredClone(state);

    expect(() =>
      dispatch(state, {
        type: 'compare-trials',
        trialIds: ['trial-1', 'trial-1'],
      }),
    ).toThrow(/different trial IDs/i);
    expect(() =>
      dispatch(state, {
        type: 'compare-trials',
        trialIds: ['trial-1', 'trial-404'],
      }),
    ).toThrow(/trial-404.*does not exist/i);
    expect(state).toEqual(snapshot);
  });

  it('records observations once and rejects empty observations', () => {
    const initial = createFungiExperimentSession();
    const observed = dispatch(initial, {
      type: 'record-observation',
      observation: 'hyphae extend beyond the visible patch',
    });
    const repeated = dispatch(observed, {
      type: 'record-observation',
      observation: 'hyphae extend beyond the visible patch',
    });

    expect(repeated.observations).toEqual([
      'hyphae extend beyond the visible patch',
    ]);
    expect(initial.observations).toEqual([]);
    expect(() =>
      dispatch(repeated, {
        type: 'record-observation',
        observation: '',
      }),
    ).toThrow(/observation.*non-empty string/i);
  });

  it('resets trial work while preserving observations and prediction history', () => {
    const predicted = dispatch(createFungiExperimentSession(), {
      type: 'predict-trial',
      prediction: 'rapid-growth',
    });
    const revised = dispatch(predicted, {
      type: 'predict-trial',
      prediction: 'slow-growth',
    });
    const observed = dispatch(revised, {
      type: 'record-observation',
      observation: 'warm moist bread grew faster',
    });
    const first = saveTrial(observed, warmMoistBread);
    const second = saveTrial(first, {
      ...warmMoistBread,
      moisturePercent: 30,
    });
    const compared = dispatch(second, {
      type: 'compare-trials',
      trialIds: ['trial-1', 'trial-2'],
    });
    const reset = dispatch(compared, { type: 'reset-experiment' });
    const fresh = createFungiExperimentSession();

    expect(reset).toMatchObject({
      firstPrediction: 'rapid-growth',
      latestPrediction: 'slow-growth',
      currentInput: fresh.currentInput,
      currentOutput: fresh.currentOutput,
      savedTrials: [],
      observations: ['warm moist bread grew faster'],
    });
    expect(reset.currentTrial).toBeUndefined();
    expect(reset.comparison).toBeUndefined();
    expect(compared.savedTrials).toHaveLength(2);
  });

  it('restarts the journey with a new initial session', () => {
    const changed = dispatch(
      saveTrial(createFungiExperimentSession(), warmMoistBread),
      {
        type: 'record-observation',
        observation: 'growth recorded',
      },
    );
    const restarted = dispatch(changed, { type: 'restart-journey' });
    const fresh = createFungiExperimentSession();

    expect(restarted).toEqual(fresh);
    expect(restarted).not.toBe(fresh);
    expect(restarted.savedTrials).not.toBe(fresh.savedTrials);
    expect(changed.savedTrials).toHaveLength(1);
  });

  it('leaves experiment state untouched when a camera reset fans out', () => {
    const state = saveTrial(createFungiExperimentSession(), warmMoistBread);

    const afterCameraReset = reduceFungiExperiment(state, {
      type: 'reset-camera',
    });

    expect(afterCameraReset).toBe(state);
  });

  it('deeply freezes initial, running, saved, and compared session state', () => {
    const initial = createFungiExperimentSession();
    const running = dispatch(initial, {
      type: 'run-trial',
      input: warmMoistBread,
    });
    const first = dispatch(running, { type: 'save-current-trial' });
    const second = saveTrial(first, {
      ...warmMoistBread,
      moisturePercent: 30,
    });
    const compared = dispatch(second, {
      type: 'compare-trials',
      trialIds: ['trial-1', 'trial-2'],
    });
    const snapshot = structuredClone(compared);

    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.currentInput)).toBe(true);
    expect(Object.isFrozen(initial.currentOutput)).toBe(true);
    expect(Object.isFrozen(initial.savedTrials)).toBe(true);
    expect(Object.isFrozen(initial.observations)).toBe(true);

    expect(Object.isFrozen(running.currentTrial)).toBe(true);
    expect(Object.isFrozen(running.currentTrial?.input)).toBe(true);
    expect(Object.isFrozen(running.currentTrial?.output)).toBe(true);

    expect(Object.isFrozen(compared.savedTrials)).toBe(true);
    for (const trial of compared.savedTrials) {
      expect(Object.isFrozen(trial)).toBe(true);
      expect(Object.isFrozen(trial.input)).toBe(true);
      expect(Object.isFrozen(trial.output)).toBe(true);
    }
    expect(Object.isFrozen(compared.comparison)).toBe(true);
    expect(Object.isFrozen(compared.comparison?.trialIds)).toBe(true);
    expect(Object.isFrozen(compared.comparison?.changedVariables)).toBe(true);

    expect(Reflect.set(initial.currentInput, 'temperatureC', 8)).toBe(false);
    expect(Reflect.set(initial.currentOutput, 'surfaceCoverage', 1)).toBe(
      false,
    );
    expect(Reflect.set(running.currentTrial!, 'prediction', 'changed')).toBe(
      false,
    );
    expect(Reflect.set(running.currentTrial!.input, 'temperatureC', 8)).toBe(
      false,
    );
    expect(
      Reflect.set(running.currentTrial!.output, 'surfaceCoverage', 1),
    ).toBe(false);
    expect(Reflect.set(compared.savedTrials, 'length', 0)).toBe(false);
    expect(Reflect.set(compared.savedTrials[0]!, 'id', 'trial-99')).toBe(false);
    expect(Reflect.set(compared.savedTrials[0]!.input, 'temperatureC', 8)).toBe(
      false,
    );
    expect(
      Reflect.set(compared.savedTrials[0]!.output, 'surfaceCoverage', 1),
    ).toBe(false);
    expect(Reflect.set(compared.comparison!, 'quality', 'confounded')).toBe(
      false,
    );
    expect(Reflect.set(compared.comparison!.trialIds, 0, 'trial-99')).toBe(
      false,
    );
    expect(
      Reflect.set(compared.comparison!.changedVariables, 0, 'temperatureC'),
    ).toBe(false);
    expect(compared).toEqual(snapshot);
  });

  it.each([
    [{ type: 'constructor' }],
    [{ type: 'toString' }],
    [{ type: '__proto__' }],
    [{ type: 42 }],
    [null],
    [{ type: 'predict-trial', prediction: new String('rapid-growth') }],
    [{ type: 'record-observation', observation: ['growth recorded'] }],
    [{ type: 'compare-trials', trialIds: ['trial-1', 2] }],
  ])('rejects invalid actions atomically: %#', (action) => {
    const state = saveTrial(createFungiExperimentSession(), warmMoistBread);
    const snapshot = structuredClone(state);

    expect(() =>
      reduceFungiExperiment(state, action as unknown as FungiExperimentAction),
    ).toThrow();
    expect(state).toEqual(snapshot);
  });

  it('rejects invalid input actions without changing the current session', () => {
    const state = createFungiExperimentSession();
    const snapshot = structuredClone(state);
    const invalidInput = {
      ...warmMoistBread,
      temperatureC: Number.NaN,
    };

    expect(() =>
      dispatch(state, { type: 'set-input', input: invalidInput }),
    ).toThrow('temperatureC must be finite');
    expect(() =>
      dispatch(state, { type: 'run-trial', input: invalidInput }),
    ).toThrow('temperatureC must be finite');
    expect(state).toEqual(snapshot);
  });
});
