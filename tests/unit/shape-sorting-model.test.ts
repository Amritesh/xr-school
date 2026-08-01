import { describe, expect, it } from 'vitest';
import {
  SHAPE_ITEMS,
  initialShapeSortingState,
  reduceShapeSorting,
} from '../../packages/simulation-runtime/src/index';

const action = (id: string, shape?: string) => ({
  actionId: 'shape.assign',
  targetEntityId: id,
  value: shape,
  source: 'xr-controller' as const,
  phase: 'commit' as const,
  stageId: 'sort',
  timestampMs: 1,
});

describe('shape sorting model', () => {
  it.each([
    ['ball', 'sphere'],
    ['orange', 'sphere'],
    ['can', 'cylinder'],
    ['chalk', 'cylinder'],
    ['book', 'cuboid'],
    ['block', 'cuboid'],
    ['party-hat', 'cone'],
    ['traffic-cone', 'cone'],
  ] as const)('records evidence only for the correct %s placement', (id, shape) => {
    const result = reduceShapeSorting(initialShapeSortingState, action(id, shape));
    expect(result.evidenceIds).toEqual([`shape-${id}-${shape}`]);
  });

  it('keeps a wrong object available and never reveals the correct bin', () => {
    const result = reduceShapeSorting(
      initialShapeSortingState,
      action('ball', 'cuboid'),
    );
    expect(result.evidenceIds).toEqual([]);
    expect(result.state.assignments).toEqual({});
    expect(result.feedback?.message).toContain(SHAPE_ITEMS.ball.clue);
    expect(result.feedback?.message).not.toContain('sphere');
  });

  it('parses an encoded XR learner-selected placement', () => {
    const result = reduceShapeSorting(
      initialShapeSortingState,
      action('ball::sphere'),
    );
    expect(result.state.assignments).toEqual({ ball: 'sphere' });
  });
});
