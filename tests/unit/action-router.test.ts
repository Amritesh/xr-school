import { describe, expect, it, vi } from 'vitest';
import { createActionRouter } from '../../packages/simulation-runtime/src/index';

describe('normalized action router', () => {
  it.each(['mouse', 'touch', 'keyboard', 'xr-controller'] as const)(
    'routes %s commits through one action handler',
    source => {
      const handler = vi.fn();
      const router = createActionRouter();
      router.register('toggle-switch', handler);
      router.route({
        actionId: 'toggle-switch',
        targetEntityId: 'entity-switch',
        source,
        phase: 'commit',
        stageId: 'stage-circuit',
        timestampMs: 100,
      });
      expect(handler).toHaveBeenCalledOnce();
    },
  );

  it('restores the last valid pose on cancellation', () => {
    const cancel = vi.fn();
    const router = createActionRouter();
    router.register('place-resistor', vi.fn(), cancel);
    router.route({
      actionId: 'place-resistor',
      targetEntityId: 'entity-resistor',
      source: 'xr-controller',
      phase: 'cancel',
      stageId: 'stage-circuit',
      timestampMs: 120,
    });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects unknown and duplicate actions', () => {
    const router = createActionRouter();
    router.register('known', vi.fn());
    expect(() => router.register('known', vi.fn())).toThrow(/already registered/i);
    expect(() => router.route({
      actionId: 'unknown',
      targetEntityId: 'entity',
      source: 'mouse',
      phase: 'commit',
      stageId: 'stage',
      timestampMs: 0,
    })).toThrow(/unknown action/i);
  });
});
