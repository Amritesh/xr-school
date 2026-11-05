import { describe, expect, it } from 'vitest';
import {
  createRainwaterState,
  reduceRainwater,
  type RainwaterAction,
  type RainwaterState,
} from '../../apps/web/lib/rainwaterLesson';
import { soundsFor } from '../../apps/web/lib/rainwaterSounds';

const apply = (state: RainwaterState, ...actions: RainwaterAction[]) =>
  actions.reduce(reduceRainwater, state);
const go: RainwaterAction = { type: 'continue' };
const atRooftop = () =>
  apply(
    createRainwaterState(),
    { type: 'observe' },
    go,
    { type: 'choose', option: 'collect' },
    go,
  );

describe('rainwater sounds', () => {
  it('plays a pick-up sound and a snap on placing', () => {
    const before = atRooftop();
    const picked = reduceRainwater(before, {
      type: 'assembly',
      action: { kind: 'pick', pieceId: 'gutter-1' },
    });
    expect(soundsFor(before, picked)).toEqual(['pick']);
    const placed = reduceRainwater(picked, {
      type: 'assembly',
      action: { kind: 'place', socketId: 'gutter-socket-1' },
    });
    expect(soundsFor(picked, placed)).toEqual(['snap']);
  });

  it('celebrates when litres are earned', () => {
    const state = apply(
      atRooftop(),
      ...[1, 2, 3].flatMap((n): RainwaterAction[] => [
        { type: 'assembly', action: { kind: 'pick', pieceId: `gutter-${n}` } },
        { type: 'assembly', action: { kind: 'place', socketId: `gutter-socket-${n}` } },
      ]),
      { type: 'assembly', action: { kind: 'pick', pieceId: 'gutter-4' } },
    );
    const done = reduceRainwater(state, {
      type: 'assembly',
      action: { kind: 'place', socketId: 'gutter-socket-4' },
    });
    expect(soundsFor(state, done)).toContain('earn');
  });

  it('gives a gentle cue for feedback and stays silent when nothing changes', () => {
    const atDrought = apply(createRainwaterState(), { type: 'observe' }, go);
    const wrong = reduceRainwater(atDrought, { type: 'choose', option: 'drain' });
    expect(soundsFor(atDrought, wrong)).toEqual(['wrong']);
    expect(soundsFor(atDrought, atDrought)).toEqual([]);
  });

  it('plays a pouring sound when water is shared', () => {
    const summer = { ...createRainwaterState(), stage: 'summer' as const, stormBestLitres: 3500 };
    const after = reduceRainwater(
      {
        ...summer,
        assemblies: summer.assemblies,
      },
      { type: 'allocate', target: 'garden' },
    );
    expect(soundsFor(summer, { ...after, allocated: { ...after.allocated, garden: 500 } })).toEqual(['pour']);
  });

  it('marks a new stage', () => {
    const before = reduceRainwater(createRainwaterState(), { type: 'observe' });
    expect(soundsFor(before, reduceRainwater(before, go))).toEqual(['stage']);
  });
});
