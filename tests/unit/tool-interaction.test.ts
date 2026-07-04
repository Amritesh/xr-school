import { describe, expect, it } from 'vitest';
import {
  createToolInteraction,
} from '../../apps/web/lib/world-builder/toolInteraction';

describe('reusable tool interaction', () => {
  it('returns a released tool home when no valid target accepted it', () => {
    const tool = createToolInteraction({
      actionId: 'transfer-pollen',
      toolId: 'pollen-brush',
      home: [1, 1.1, -0.4],
      validTargets: ['anther', 'stigma'],
    });

    tool.pickUp('mouse');
    const released = tool.release(undefined, 'stage-transfer', 100);

    expect(released.state).toBe('returning');
    expect(released.pose).toEqual([1, 1.1, -0.4]);
    expect(released.action).toBeUndefined();
  });

  it('commits a normalized action only against a valid target', () => {
    const tool = createToolInteraction({
      actionId: 'transfer-pollen',
      toolId: 'pollen-brush',
      home: [0, 0, 0],
      validTargets: ['stigma'],
    });

    tool.pickUp('xr-controller');
    expect(tool.release('leaf', 'stage-transfer', 120).action).toBeUndefined();
    tool.pickUp('xr-controller');
    const result = tool.release('stigma', 'stage-transfer', 140);

    expect(result.state).toBe('valid');
    expect(result.action).toMatchObject({
      actionId: 'transfer-pollen',
      targetEntityId: 'stigma',
      source: 'xr-controller',
      phase: 'commit',
      stageId: 'stage-transfer',
      timestampMs: 140,
    });
  });

  it('tracks hover validity without changing the held tool', () => {
    const tool = createToolInteraction({
      actionId: 'water-seed',
      toolId: 'watering-can',
      home: [0, 0, 0],
      validTargets: ['seed-pot'],
    });

    tool.pickUp('touch');

    expect(tool.hover('soil')).toBe('invalid');
    expect(tool.hover('seed-pot')).toBe('valid');
    expect(tool.snapshot().state).toBe('held');
  });
});
