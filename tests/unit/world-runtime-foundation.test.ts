import { describe, expect, it, vi } from 'vitest';
import {
  createFixedClock,
  createResourceRegistry,
} from '../../packages/simulation-runtime/src/index';

describe('world runtime foundation', () => {
  it('uses 1/60 fixed updates and caps catch-up at four steps', () => {
    const clock = createFixedClock({
      fixedStepSeconds: 1 / 60,
      maxSubsteps: 4,
      maxFrameDeltaSeconds: 0.1,
    });

    expect(clock.advance(1 / 30)).toMatchObject({
      steps: 2,
      fixedStepSeconds: 1 / 60,
    });
    expect(clock.advance(1)).toMatchObject({ steps: 4 });
  });

  it('disposes registered resources in reverse order exactly once', async () => {
    const order: string[] = [];
    const registry = createResourceRegistry();
    registry.register('texture', () => {
      order.push('texture');
    });
    registry.register('renderer', async () => {
      order.push('renderer');
    });

    await registry.disposeAll();
    await registry.disposeAll();

    expect(order).toEqual(['renderer', 'texture']);
    expect(registry.leaks()).toEqual([]);
  });

  it('reports leaked resource identifiers', () => {
    const registry = createResourceRegistry();
    registry.register('environment-map', vi.fn());

    expect(registry.leaks()).toEqual(['environment-map']);
  });
});
