export const STORM = Object.freeze({
  durationSeconds: 75,
  totalLitres: 3500,
  capacities: Object.freeze({
    houseTank: 800,
    schoolTank: 1400,
    rechargePit: 700,
    pond: 1000,
  }),
  blockGraceSeconds: 2,
  maxStepSeconds: 0.1,
  blockIntervalSeconds: 15,
  maxBlocks: 4,
});

export type StormTarget = keyof typeof STORM.capacities;

export interface StormState {
  readonly pace: 1 | 0.5;
  readonly paused: boolean;
  readonly elapsed: number;
  readonly active: StormTarget;
  readonly levels: Readonly<Record<StormTarget, number>>;
  readonly routed: number;
  readonly flooded: number;
  readonly inflowSoFar: number;
  readonly blocked: boolean;
  readonly blockedFor: number;
  readonly blockTimes: readonly number[];
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStorm({
  seed = 1,
  pace = 1,
}: { seed?: number; pace?: 1 | 0.5 } = {}): StormState {
  const random = seededRandom(seed);
  const blockTimes = Array.from(
    { length: STORM.maxBlocks },
    (_, index) =>
      STORM.blockIntervalSeconds * (index + 1) + (random() - 0.5) * 6,
  );
  return {
    pace,
    paused: false,
    elapsed: 0,
    active: 'houseTank',
    levels: { houseTank: 0, schoolTank: 0, rechargePit: 0, pond: 0 },
    routed: 0,
    flooded: 0,
    inflowSoFar: 0,
    blocked: false,
    blockedFor: 0,
    blockTimes,
  };
}

/** Rainfall to time t. The rate climbs so the storm builds, and integrates to totalLitres. */
function cumulativeInflow(t: number): number {
  const { durationSeconds: d, totalLitres } = STORM;
  return (totalLitres / d) * (0.5 * t + (t * t) / (2 * d));
}

export function stepStorm(state: StormState, dtSeconds: number): StormState {
  if (state.paused || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return state;
  if (state.elapsed >= STORM.durationSeconds) return state;

  const dt = Math.min(dtSeconds, STORM.maxStepSeconds) * state.pace;
  const elapsed = Math.min(STORM.durationSeconds, state.elapsed + dt);
  const inflow = cumulativeInflow(elapsed) - cumulativeInflow(state.elapsed);

  const blockFlooding = state.blocked && state.blockedFor >= STORM.blockGraceSeconds;
  const room = STORM.capacities[state.active] - state.levels[state.active];
  const accepted = blockFlooding ? 0 : Math.min(inflow, Math.max(0, room));

  const blockStarts = state.blockTimes.some(
    time => time > state.elapsed && time <= elapsed,
  );
  const blocked = state.blocked || blockStarts;

  return {
    ...state,
    elapsed,
    levels: { ...state.levels, [state.active]: state.levels[state.active] + accepted },
    routed: state.routed + accepted,
    flooded: state.flooded + (inflow - accepted),
    inflowSoFar: state.inflowSoFar + inflow,
    blocked,
    blockedFor: state.blocked ? state.blockedFor + dt : 0,
  };
}

export function routeStorm(state: StormState, target: StormTarget): StormState {
  return state.active === target ? state : { ...state, active: target };
}

export function clearBlock(state: StormState): StormState {
  return state.blocked ? { ...state, blocked: false, blockedFor: 0 } : state;
}

export function setStormPaused(state: StormState, paused: boolean): StormState {
  return state.paused === paused ? state : { ...state, paused };
}

export function stormResult(state: StormState): {
  routed: number;
  flooded: number;
  finished: boolean;
} {
  return {
    routed: state.routed,
    flooded: state.flooded,
    finished: state.elapsed >= STORM.durationSeconds,
  };
}
