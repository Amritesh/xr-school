import { describe, expect, it } from 'vitest';
import type { NormalizedAction } from '../../packages/simulation-schema/src/index';
import {
  initialLipidTestState,
  reduceLipidTest,
} from '../../packages/simulation-runtime/src/index';

function action(
  actionId: string,
  sampleId: string,
  value?: string,
): NormalizedAction {
  return {
    actionId,
    targetEntityId: sampleId,
    value,
    source: 'mouse',
    phase: 'commit',
    stageId: actionId === 'lipid.predict' ? 'predict' : 'procedure',
    timestampMs: 1,
  };
}

function predictAndRun(
  sampleId: 'peanut' | 'coconut' | 'rice',
  prediction: 'present' | 'absent',
) {
  let transition = reduceLipidTest(
    initialLipidTestState,
    action('lipid.predict', sampleId, prediction),
  );
  for (const step of ['place', 'fold', 'crush', 'remove', 'dry', 'inspect']) {
    transition = reduceLipidTest(
      transition.state,
      action('lipid.advance-procedure', sampleId, step),
    );
  }
  return transition;
}

describe('lipid paper-test model', () => {
  it('enforces place, fold, crush, remove, dry, inspect order', () => {
    const predicted = reduceLipidTest(
      initialLipidTestState,
      action('lipid.predict', 'peanut', 'present'),
    );
    expect(() =>
      reduceLipidTest(
        predicted.state,
        action('lipid.advance-procedure', 'peanut', 'inspect'),
      ),
    ).toThrow(/expected place/i);
  });

  it('does not expose a result before the paper is dry and inspected', () => {
    let transition = reduceLipidTest(
      initialLipidTestState,
      action('lipid.predict', 'peanut', 'present'),
    );
    for (const step of ['place', 'fold', 'crush', 'remove', 'dry']) {
      transition = reduceLipidTest(
        transition.state,
        action('lipid.advance-procedure', 'peanut', step),
      );
    }
    expect(transition.state.records.peanut?.observation).toBeUndefined();
    expect(transition.evidenceIds).toEqual([]);
  });

  it.each([
    ['peanut', 'persistent'],
    ['coconut', 'persistent'],
    ['rice', 'none'],
  ] as const)('returns qualitative dry-paper evidence for %s', (sampleId, observation) => {
    const result = predictAndRun(
      sampleId,
      sampleId === 'rice' ? 'absent' : 'present',
    );
    expect(result.state.records[sampleId]?.observation).toBe(observation);
    expect(result.evidenceIds).toEqual([`procedure-${sampleId}-complete`]);
  });

  it('parses encoded XR procedure targets', () => {
    const predicted = reduceLipidTest(initialLipidTestState, {
      ...action('lipid.predict', 'peanut::present'),
      source: 'xr-controller',
    });
    const placed = reduceLipidTest(predicted.state, {
      ...action('lipid.advance-procedure', 'peanut::place'),
      source: 'xr-controller',
    });
    expect(placed.state.records.peanut?.completedSteps).toEqual(['place']);
  });

  it('does not mutate the initial record map', () => {
    reduceLipidTest(
      initialLipidTestState,
      action('lipid.predict', 'rice', 'absent'),
    );
    expect(initialLipidTestState.records).toEqual({});
  });
});
