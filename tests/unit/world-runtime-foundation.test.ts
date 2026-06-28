import { describe, expect, it, vi } from 'vitest';
import {
  createFixedClock,
  createResourceRegistry,
  createWorldRuntime,
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

  it('initializes dependencies first and updates each system once per step', async () => {
    const events: string[] = [];
    const runtime = createWorldRuntime({
      systems: [
        {
          id: 'presentation',
          dependencies: ['science'],
          initialize: () => {
            events.push('init:presentation');
          },
          fixedUpdate: () => {
            events.push('fixed:presentation');
          },
          dispose: () => {
            events.push('dispose:presentation');
          },
        },
        {
          id: 'science',
          dependencies: [],
          initialize: () => {
            events.push('init:science');
          },
          fixedUpdate: () => {
            events.push('fixed:science');
          },
          dispose: () => {
            events.push('dispose:science');
          },
        },
      ],
    });

    await runtime.initialize();
    runtime.advance(1 / 60);
    await runtime.dispose();

    expect(events).toEqual([
      'init:science',
      'init:presentation',
      'fixed:science',
      'fixed:presentation',
      'dispose:presentation',
      'dispose:science',
    ]);
  });

  it('rejects system dependency cycles before initialization', () => {
    expect(() => createWorldRuntime({
      systems: [
        {
          id: 'a',
          dependencies: ['b'],
          initialize() {},
          dispose() {},
        },
        {
          id: 'b',
          dependencies: ['a'],
          initialize() {},
          dispose() {},
        },
      ],
    })).toThrow(/dependency cycle/);
  });
});
