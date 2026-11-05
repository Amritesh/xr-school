import { describe, expect, it } from 'vitest';
import {
  STORM,
  clearBlock,
  createStorm,
  routeStorm,
  setStormPaused,
  stepStorm,
  stormResult,
  type StormState,
  type StormTarget,
} from '../../apps/web/lib/rainwaterStorm';

const DT = 0.05;

function runIdeal(start: StormState, onStep?: (state: StormState) => void): StormState {
  const order: StormTarget[] = ['houseTank', 'schoolTank', 'rechargePit', 'pond'];
  let state = start;
  while (!stormResult(state).finished) {
    if (state.blocked) state = clearBlock(state);
    const active = state.active;
    if (state.levels[active] >= STORM.capacities[active] - 5) {
      const next = order.find(
        target => state.levels[target] < STORM.capacities[target] - 5,
      );
      if (next) state = routeStorm(state, next);
    }
    state = stepStorm(state, DT);
    onStep?.(state);
  }
  return state;
}

function runIdle(start: StormState): StormState {
  let state = start;
  while (!stormResult(state).finished) state = stepStorm(state, DT);
  return state;
}

describe('storm routing simulation', () => {
  it('declares the storm tuning values', () => {
    expect(STORM.durationSeconds).toBe(75);
    expect(STORM.totalLitres).toBe(3500);
    expect(Object.values(STORM.capacities).reduce((a, b) => a + b, 0)).toBe(3900);
  });

  it('conserves water at every step', () => {
    runIdeal(createStorm({ seed: 3 }), state => {
      const { routed, flooded } = stormResult(state);
      expect(Math.abs(routed + flooded - state.inflowSoFar)).toBeLessThan(0.5);
    });
  });

  it('delivers the total litres over the storm', () => {
    const { routed, flooded, finished } = stormResult(runIdle(createStorm({ seed: 1 })));
    expect(finished).toBe(true);
    expect(routed + flooded).toBeCloseTo(3500, 0);
  });

  it('ideal play routes all 3500', () => {
    const { routed, flooded } = stormResult(runIdeal(createStorm({ seed: 7 })));
    expect(routed).toBeGreaterThan(3499);
    expect(flooded).toBeLessThan(1);
  });

  it('no play routes at most 800 and floods the rest', () => {
    const { routed, flooded } = stormResult(runIdle(createStorm({ seed: 7 })));
    expect(routed).toBeLessThanOrEqual(800);
    expect(flooded).toBeGreaterThanOrEqual(2700);
  });

  it('gives identical runs for the same seed', () => {
    expect(runIdle(createStorm({ seed: 5 }))).toEqual(runIdle(createStorm({ seed: 5 })));
  });

  it('blocks the channel at most 4 times', () => {
    let blocks = 0;
    let state = createStorm({ seed: 11 });
    let wasBlocked = false;
    while (!stormResult(state).finished) {
      if (state.blocked && !wasBlocked) blocks += 1;
      wasBlocked = state.blocked;
      if (state.blocked) {
        state = clearBlock(state);
        wasBlocked = false;
      }
      state = stepStorm(state, DT);
    }
    expect(blocks).toBeGreaterThanOrEqual(1);
    expect(blocks).toBeLessThanOrEqual(4);
  });

  it('floods only after the block grace period', () => {
    let state = createStorm({ seed: 2 });
    while (!state.blocked) state = stepStorm(state, DT);
    const before = stormResult(state).flooded;
    for (let t = 0; t < STORM.blockGraceSeconds - 0.2; t += DT) state = stepStorm(state, DT);
    expect(stormResult(state).flooded).toBe(before);
    for (let t = 0; t < 1; t += DT) state = stepStorm(state, DT);
    expect(stormResult(state).flooded).toBeGreaterThan(before);
  });

  it('clamps a large time step', () => {
    const state = stepStorm(createStorm({ seed: 1 }), 10);
    expect(state.elapsed).toBeCloseTo(STORM.maxStepSeconds, 5);
    const slow = stepStorm(createStorm({ seed: 1, pace: 0.5 }), 10);
    expect(slow.elapsed).toBeCloseTo(STORM.maxStepSeconds * 0.5, 5);
  });

  it('does not advance while paused and resumes without a time jump', () => {
    const start = stepStorm(createStorm({ seed: 1 }), DT);
    const paused = setStormPaused(start, true);
    expect(stepStorm(paused, 5)).toEqual(paused);
    const resumed = stepStorm(setStormPaused(paused, false), DT);
    expect(resumed.elapsed).toBeCloseTo(start.elapsed + DT, 5);
  });

  it('half pace reaches the same total and takes twice as long', () => {
    let steps = 0;
    let state = createStorm({ seed: 4, pace: 0.5 });
    while (!stormResult(state).finished) {
      state = stepStorm(state, DT);
      steps += 1;
    }
    expect(stormResult(state).routed + stormResult(state).flooded).toBeCloseTo(3500, 0);
    expect(steps * DT).toBeCloseTo(150, 0);
  });

  it('ignores invalid time steps and repeat clears', () => {
    const start = createStorm({ seed: 1 });
    expect(stepStorm(start, Number.NaN)).toEqual(start);
    expect(stepStorm(start, -1)).toEqual(start);
    expect(clearBlock(start)).toEqual(start);
  });
});
