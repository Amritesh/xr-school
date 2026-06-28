import { describe, expect, it, vi } from 'vitest';
import {
  createRapierWorld,
} from '../../packages/simulation-runtime/src/index';

describe('canonical Rapier world', () => {
  it('applies SI gravity with a fixed 1/60 integration step', async () => {
    const warn = vi.spyOn(console, 'warn');
    const world = await createRapierWorld({
      gravity: [0, -9.81, 0],
      fixedStepSeconds: 1 / 60,
    });
    world.addSphere({
      id: 'ball',
      radiusMeters: 0.1,
      massKg: 1,
      positionMeters: [0, 1, 0],
      restitution: 0,
    });
    world.addCuboid({
      id: 'ground',
      halfExtentsMeters: [2, 0.05, 2],
      positionMeters: [0, 0, 0],
      fixed: true,
    });

    for (let index = 0; index < 120; index += 1) world.step();

    expect(world.body('ball').positionMeters[1]).toBeCloseTo(0.15, 2);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    await world.dispose();
  });

  it('returns identical snapshots for identical insertion order and steps', async () => {
    const first = await createRapierWorld();
    const second = await createRapierWorld();
    for (const world of [first, second]) {
      world.addSphere({
        id: 'body',
        radiusMeters: 0.1,
        massKg: 1,
        positionMeters: [0, 1, 0],
        restitution: 0.2,
      });
      for (let index = 0; index < 30; index += 1) world.step();
    }

    expect(first.snapshot()).toEqual(second.snapshot());
    await first.dispose();
    await second.dispose();
  });
});
