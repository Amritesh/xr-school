import { describe, expect, it } from 'vitest';
import {
  RAINWATER_GOAL_LITRES,
  RAINWATER_STAGES,
  SUMMER_NEEDS,
  createRainwaterState,
  rainwaterCanContinue,
  rainwaterPrompt,
  reduceRainwater,
  savedLitres,
  spillingSockets,
  storedLitres,
  summerShortage,
  waterIsClear,
  type RainwaterAction,
  type RainwaterState,
} from '../../apps/web/lib/rainwaterLesson';

const apply = (state: RainwaterState, ...actions: RainwaterAction[]) =>
  actions.reduce(reduceRainwater, state);
const put = (piece: string, socket: string): RainwaterAction[] => [
  { type: 'assembly', action: { kind: 'pick', pieceId: piece } },
  { type: 'assembly', action: { kind: 'place', socketId: socket } },
];
const go: RainwaterAction = { type: 'continue' };

const atRooftop = () =>
  apply(
    createRainwaterState(),
    { type: 'observe' },
    go,
    { type: 'choose', option: 'collect' },
    go,
  );
const rooftopDone = () =>
  apply(
    atRooftop(),
    ...put('gutter-1', 'gutter-socket-1'),
    ...put('gutter-2', 'gutter-socket-2'),
    ...put('gutter-3', 'gutter-socket-3'),
    ...put('gutter-4', 'gutter-socket-4'),
  );
const filterDone = () =>
  apply(
    rooftopDone(),
    go,
    { type: 'open-first-flush' },
    ...put('stones', 'filter-top'),
    ...put('sand', 'filter-middle'),
    ...put('charcoal', 'filter-bottom'),
  );
const schoolDone = () =>
  apply(
    filterDone(),
    go,
    ...put('school-gutter', 'school-gutter-socket'),
    ...put('school-pipe', 'school-pipe-socket'),
    ...put('school-tank', 'school-tank-socket'),
  );
const rechargeDone = () =>
  apply(
    schoolDone(),
    go,
    ...put('large-stones', 'pit-bottom'),
    ...put('small-stones', 'pit-middle'),
    ...put('pit-sand', 'pit-top'),
  );
const atSummer = (routed: number) =>
  apply(rechargeDone(), go, { type: 'storm-finished', routedLitres: routed }, go);

describe('rainwater lesson', () => {
  it('keeps the learning order in nine stages', () => {
    expect(RAINWATER_STAGES).toEqual([
      'rainy-day',
      'drought',
      'rooftop',
      'filter',
      'school',
      'recharge',
      'storm',
      'summer',
      'finale',
    ]);
    expect(RAINWATER_GOAL_LITRES).toBe(10_000);
  });

  it('starts at rainy-day with 0 saved', () => {
    const state = createRainwaterState();
    expect(state.stage).toBe('rainy-day');
    expect(savedLitres(state)).toBe(0);
  });

  it('blocks continue until the stage is done', () => {
    const state = createRainwaterState();
    expect(rainwaterCanContinue(state)).toBe(false);
    const blocked = reduceRainwater(state, go);
    expect(blocked.stage).toBe('rainy-day');
    expect(blocked.feedback).toBeTruthy();
    expect(rainwaterCanContinue(reduceRainwater(state, { type: 'observe' }))).toBe(true);
  });

  it('explains wrong drought choices and accepts only collect', () => {
    const atDrought = apply(createRainwaterState(), { type: 'observe' }, go);
    const wrong = reduceRainwater(atDrought, { type: 'choose', option: 'drain' });
    expect(rainwaterCanContinue(wrong)).toBe(false);
    expect(wrong.feedback).toMatch(/drain/i);
    expect(
      rainwaterCanContinue(reduceRainwater(wrong, { type: 'choose', option: 'collect' })),
    ).toBe(true);
  });

  it('earns rooftop litres only when all 4 gutters are placed', () => {
    const three = apply(
      atRooftop(),
      ...put('gutter-1', 'gutter-socket-1'),
      ...put('gutter-2', 'gutter-socket-2'),
      ...put('gutter-3', 'gutter-socket-3'),
    );
    expect(savedLitres(three)).toBe(0);
    expect(spillingSockets(three)).toEqual(['gutter-socket-4']);
    expect(rainwaterCanContinue(three)).toBe(false);
    expect(savedLitres(rooftopDone())).toBe(1250);
    expect(spillingSockets(rooftopDone())).toEqual([]);
  });

  it('keeps the filter cloudy with first flush closed or a wrong order, then allows a retry', () => {
    const closed = apply(
      rooftopDone(),
      go,
      ...put('stones', 'filter-top'),
      ...put('sand', 'filter-middle'),
      ...put('charcoal', 'filter-bottom'),
    );
    expect(waterIsClear(closed)).toBe(false);
    expect(savedLitres(closed)).toBe(1250);

    const wrongOrder = apply(
      rooftopDone(),
      go,
      { type: 'open-first-flush' },
      ...put('sand', 'filter-top'),
      ...put('stones', 'filter-middle'),
      ...put('charcoal', 'filter-bottom'),
    );
    expect(waterIsClear(wrongOrder)).toBe(false);
    expect(rainwaterCanContinue(wrongOrder)).toBe(false);

    const fixed = apply(
      wrongOrder,
      { type: 'assembly', action: { kind: 'remove', socketId: 'filter-top' } },
      { type: 'assembly', action: { kind: 'remove', socketId: 'filter-middle' } },
      ...put('stones', 'filter-top'),
      ...put('sand', 'filter-middle'),
    );
    expect(waterIsClear(fixed)).toBe(true);
    expect(savedLitres(fixed)).toBe(2500);
  });

  it('builds the recharge pit from large stones, small stones, then sand', () => {
    const wrong = apply(
      schoolDone(),
      go,
      ...put('pit-sand', 'pit-bottom'),
      ...put('small-stones', 'pit-middle'),
      ...put('large-stones', 'pit-top'),
    );
    expect(savedLitres(wrong)).toBe(5000);
    expect(rainwaterPrompt(wrong)).toMatch(/large stones/i);
    expect(savedLitres(rechargeDone())).toBe(6500);
  });

  it('adds routed storm litres and keeps the best after a retry', () => {
    const first = atSummer(2000);
    expect(savedLitres(first)).toBe(8500);
    const retried = apply(first, { type: 'retry-storm' });
    expect(retried.stage).toBe('storm');
    expect(savedLitres(retried)).toBe(8500);
    const worse = reduceRainwater(retried, { type: 'storm-finished', routedLitres: 1000 });
    expect(savedLitres(worse)).toBe(8500);
  });

  it('caps storm litres and ignores invalid values', () => {
    const atStorm = apply(rechargeDone(), go);
    expect(
      savedLitres(reduceRainwater(atStorm, { type: 'storm-finished', routedLitres: 99_999 })),
    ).toBe(10_000);
    const invalid = reduceRainwater(atStorm, {
      type: 'storm-finished',
      routedLitres: Number.NaN,
    });
    expect(savedLitres(invalid)).toBe(6500);
    expect(rainwaterCanContinue(invalid)).toBe(false);
  });

  it('counts recharge as saved but not as stored in tanks', () => {
    const none = atSummer(0);
    expect(savedLitres(none)).toBe(6500);
    expect(storedLitres(none)).toBe(5000);
    const full = atSummer(3500);
    expect(savedLitres(full)).toBe(10_000);
    expect(storedLitres(full)).toBe(8500);
  });

  it('cannot allocate past stored water in summer, showing the shortage', () => {
    const needed = Object.values(SUMMER_NEEDS).reduce((a, b) => a + b, 0);
    expect(needed).toBe(6000);
    let state = atSummer(0);
    expect(summerShortage(state)).toBe(1000);
    for (let i = 0; i < 20; i += 1) {
      for (const target of ['garden', 'animals', 'cleaning'] as const) {
        state = reduceRainwater(state, { type: 'allocate', target });
      }
    }
    const spent = Object.values(state.allocated).reduce((a, b) => a + b, 0);
    expect(spent).toBe(5000);
    expect(state.allocated.garden).toBeLessThanOrEqual(SUMMER_NEEDS.garden);
    expect(rainwaterCanContinue(state)).toBe(true);
    expect(summerShortage(atSummer(3500))).toBe(0);
  });

  it('spends nothing on drinking and explains why', () => {
    const state = reduceRainwater(atSummer(1000), { type: 'try-drinking' });
    expect(Object.values(state.allocated).reduce((a, b) => a + b, 0)).toBe(0);
    expect(state.feedback).toContain('treatment and testing');
  });

  it('does not double count repeated actions', () => {
    const done = rooftopDone();
    const again = apply(done, ...put('gutter-1', 'gutter-socket-1'));
    expect(savedLitres(again)).toBe(1250);
    const once = apply(rechargeDone(), go, { type: 'storm-finished', routedLitres: 1000 });
    const twice = reduceRainwater(once, { type: 'storm-finished', routedLitres: 1000 });
    expect(savedLitres(twice)).toBe(savedLitres(once));
    const observed = apply(createRainwaterState(), { type: 'observe' }, { type: 'observe' });
    expect(savedLitres(observed)).toBe(0);
  });

  it('keeps progress when going back and returning', () => {
    const back = apply(rooftopDone(), go, { type: 'back' });
    expect(back.stage).toBe('rooftop');
    expect(savedLitres(back)).toBe(1250);
    expect(apply(back, go).stage).toBe('filter');
    expect(reduceRainwater(createRainwaterState(), { type: 'back' }).stage).toBe('rainy-day');
  });

  it('ignores assembly actions outside assembly stages', () => {
    const state = createRainwaterState();
    expect(savedLitres(apply(state, ...put('gutter-1', 'gutter-socket-1')))).toBe(0);
  });

  it('tells the truth in the finale below the target', () => {
    const shareAll = (summer: RainwaterState) => {
      let current = summer;
      for (let i = 0; i < 20; i += 1) {
        for (const target of ['garden', 'animals', 'cleaning'] as const) {
          current = reduceRainwater(current, { type: 'allocate', target });
        }
      }
      return reduceRainwater(current, go);
    };
    const state = shareAll(atSummer(0));
    expect(state.stage).toBe('finale');
    const prompt = rainwaterPrompt(state);
    expect(prompt).toContain('6,500');
    expect(prompt).not.toMatch(/every drop/i);
    expect(prompt).not.toMatch(/saved (all )?10,000/i);
    expect(prompt).toMatch(/storm/i);
    expect(rainwaterPrompt(shareAll(atSummer(3500)))).toMatch(/saved all 10,000/i);
  });

  it('keeps the non-drinking safety message on the filter stage', () => {
    expect(rainwaterPrompt(apply(rooftopDone(), go))).toContain('treatment and testing');
  });
});
