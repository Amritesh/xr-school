import { describe, expect, it } from 'vitest';
import type { NormalizedAction } from '../../packages/simulation-schema/src/index';
import {
  FLOAT_OR_SINK_OBJECTS,
  evaluateBuoyancy,
  initialFloatOrSinkState,
  reduceFloatOrSink,
} from '../../packages/simulation-runtime/src/index';

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
    stageId: actionId.endsWith('predict') ? 'predict' : 'observe',
    timestampMs: 1,
  };
}

describe('float or sink model', () => {
  it.each([
    ['leaf', 'float'],
    ['stone', 'sink'],
    ['cork', 'float'],
    ['spoon', 'sink'],
    ['bottle', 'float'],
    ['marble', 'sink'],
  ] as const)(
    'classifies %s as %s from mass and maximum displaced volume',
    (id, outcome) => {
      expect(evaluateBuoyancy(FLOAT_OR_SINK_OBJECTS[id])).toMatchObject({
        outcome,
      });
    },
  );

  it('shows how shape can change the result without changing foil mass', () => {
    const ball = evaluateBuoyancy({
      massG: 8,
      maximumDisplacedVolumeMl: 3,
      waterDensityGPerMl: 1,
    });
    const boat = evaluateBuoyancy({
      massG: 8,
      maximumDisplacedVolumeMl: 120,
      waterDensityGPerMl: 1,
    });
    expect(ball.outcome).toBe('sink');
    expect(boat.outcome).toBe('float');
    expect(ball.weightN).toBeCloseTo(boat.weightN, 8);
  });

  it('requires a prediction before a test can generate observation evidence', () => {
    expect(() =>
      reduceFloatOrSink(
        initialFloatOrSinkState,
        action('float-sink.test', 'stone'),
      ),
    ).toThrow(/prediction.*stone/i);
  });

  it('records prediction and observed outcome without mutating the previous state', () => {
    const predicted = reduceFloatOrSink(
      initialFloatOrSinkState,
      action('float-sink.predict', 'stone', 'float'),
    );
    const tested = reduceFloatOrSink(
      predicted.state,
      action('float-sink.test', 'stone'),
    );

    expect(initialFloatOrSinkState.predictions).toEqual({});
    expect(predicted).toMatchObject({
      lessonActionId: 'float-sink.predict',
      evidenceIds: ['prediction-stone-recorded'],
    });
    expect(tested).toMatchObject({
      state: { observations: { stone: 'sink' } },
      lessonActionId: 'float-sink.test',
      evidenceIds: ['observation-stone-sink'],
      feedback: { tone: 'information' },
    });
  });

  it('parses encoded XR choice targets without trusting scene-derived answers', () => {
    const predicted = reduceFloatOrSink(initialFloatOrSinkState, {
      ...action('float-sink.predict', 'leaf::float'),
      source: 'xr-controller',
    });
    expect(predicted.state.predictions).toEqual({ leaf: 'float' });
    expect(predicted.evidenceIds).toEqual(['prediction-leaf-recorded']);
  });

  it('rejects non-finite and non-positive scientific inputs', () => {
    expect(() =>
      evaluateBuoyancy({
        massG: Number.NaN,
        maximumDisplacedVolumeMl: 3,
        waterDensityGPerMl: 1,
      }),
    ).toThrow(/mass/i);
    expect(() =>
      evaluateBuoyancy({
        massG: 8,
        maximumDisplacedVolumeMl: 0,
        waterDensityGPerMl: 1,
      }),
    ).toThrow(/volume/i);
  });
});
