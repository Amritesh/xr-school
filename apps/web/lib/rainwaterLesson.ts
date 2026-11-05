import {
  createSocketAssembly,
  emptySockets,
  isAssemblyFull,
  isAssemblySolved,
  pickPiece,
  placePiece,
  removePiece,
  type AssemblyState,
} from '@xr-school/simulation-runtime';

export const RAINWATER_STAGES = [
  'rainy-day',
  'drought',
  'rooftop',
  'filter',
  'school',
  'recharge',
  'storm',
  'summer',
  'finale',
] as const;
export type RainwaterStageId = (typeof RAINWATER_STAGES)[number];

export const RAINWATER_GOAL_LITRES = 10_000;
export const STAGE_LITRES = { rooftop: 1250, filter: 1250, school: 2500, recharge: 1500 };
export const STORM_MAX_LITRES = 3500;
export const SUMMER_NEEDS = { garden: 2500, animals: 2000, cleaning: 1500 };
export const SUMMER_STEP_LITRES = 500;

export type SummerTarget = keyof typeof SUMMER_NEEDS;
export type DroughtOption = 'drain' | 'road' | 'collect';
export type AssemblyStageId = 'rooftop' | 'filter' | 'school' | 'recharge';

export type AssemblyInput =
  | { kind: 'pick'; pieceId: string }
  | { kind: 'place'; socketId: string }
  | { kind: 'remove'; socketId: string };

export type RainwaterAction =
  | { type: 'continue' }
  | { type: 'back' }
  | { type: 'observe' }
  | { type: 'choose'; option: DroughtOption }
  | { type: 'assembly'; action: AssemblyInput }
  | { type: 'open-first-flush' }
  | { type: 'storm-finished'; routedLitres: number }
  | { type: 'retry-storm' }
  | { type: 'allocate'; target: SummerTarget }
  | { type: 'try-drinking' };

export interface RainwaterState {
  readonly stage: RainwaterStageId;
  readonly observedRunoff: boolean;
  readonly choseCollect: boolean;
  readonly assemblies: Readonly<Record<AssemblyStageId, AssemblyState>>;
  readonly firstFlushOpen: boolean;
  readonly stormBestLitres: number | null;
  readonly allocated: Readonly<Record<SummerTarget, number>>;
  readonly feedback: string | null;
}

const SAFETY_MESSAGE =
  'Filtered rainwater is not safe to drink until it has had proper treatment and testing.';

const TAKE_OFF_HINT = 'Select a piece to take it off.';

const litres = (value: number) => value.toLocaleString('en-US');

export function createRainwaterState(): RainwaterState {
  return {
    stage: 'rainy-day',
    observedRunoff: false,
    choseCollect: false,
    firstFlushOpen: false,
    stormBestLitres: null,
    allocated: { garden: 0, animals: 0, cleaning: 0 },
    feedback: null,
    assemblies: {
      rooftop: createSocketAssembly({
        pieces: {
          'gutter-1': 'gutter',
          'gutter-2': 'gutter',
          'gutter-3': 'gutter',
          'gutter-4': 'gutter',
        },
        sockets: [
          { id: 'gutter-socket-1' },
          { id: 'gutter-socket-2' },
          { id: 'gutter-socket-3' },
          { id: 'gutter-socket-4' },
        ],
      }),
      filter: createSocketAssembly({
        pieces: { stones: 'stones', sand: 'sand', charcoal: 'charcoal' },
        sockets: [
          { id: 'filter-top', solutionKind: 'stones' },
          { id: 'filter-middle', solutionKind: 'sand' },
          { id: 'filter-bottom', solutionKind: 'charcoal' },
        ],
      }),
      school: createSocketAssembly({
        pieces: {
          'school-gutter': 'gutter',
          'school-pipe': 'pipe',
          'school-tank': 'tank',
        },
        sockets: [
          { id: 'school-gutter-socket', solutionKind: 'gutter' },
          { id: 'school-pipe-socket', solutionKind: 'pipe' },
          { id: 'school-tank-socket', solutionKind: 'tank' },
        ],
      }),
      recharge: createSocketAssembly({
        pieces: {
          'large-stones': 'large-stones',
          'small-stones': 'small-stones',
          'pit-sand': 'sand',
        },
        sockets: [
          { id: 'pit-bottom', solutionKind: 'large-stones' },
          { id: 'pit-middle', solutionKind: 'small-stones' },
          { id: 'pit-top', solutionKind: 'sand' },
        ],
      }),
    },
  };
}

export function waterIsClear(state: RainwaterState): boolean {
  return state.firstFlushOpen && isAssemblySolved(state.assemblies.filter);
}

function stageSolved(state: RainwaterState, stage: AssemblyStageId): boolean {
  return stage === 'filter'
    ? waterIsClear(state)
    : isAssemblySolved(state.assemblies[stage]);
}

/** Every litre the child has earned, including water recharged into the ground. */
export function savedLitres(state: RainwaterState): number {
  const built = (Object.keys(STAGE_LITRES) as AssemblyStageId[]).reduce(
    (total, stage) => total + (stageSolved(state, stage) ? STAGE_LITRES[stage] : 0),
    0,
  );
  return built + (state.stormBestLitres ?? 0);
}

/** Water available in tanks and the pond; recharged water is in the ground. */
export function storedLitres(state: RainwaterState): number {
  const recharged = stageSolved(state, 'recharge') ? STAGE_LITRES.recharge : 0;
  return savedLitres(state) - recharged;
}

export function spillingSockets(state: RainwaterState): string[] {
  return emptySockets(state.assemblies.rooftop);
}

export function allocatedLitres(state: RainwaterState): number {
  return Object.values(state.allocated).reduce((total, value) => total + value, 0);
}

function totalSummerNeed(): number {
  return Object.values(SUMMER_NEEDS).reduce((total, value) => total + value, 0);
}

export function summerShortage(state: RainwaterState): number {
  return Math.max(0, totalSummerNeed() - storedLitres(state));
}

export function rainwaterCanContinue(state: RainwaterState): boolean {
  switch (state.stage) {
    case 'rainy-day':
      return state.observedRunoff;
    case 'drought':
      return state.choseCollect;
    case 'rooftop':
    case 'filter':
    case 'school':
    case 'recharge':
      return stageSolved(state, state.stage);
    case 'storm':
      return state.stormBestLitres !== null;
    case 'summer': {
      const remaining = storedLitres(state) - allocatedLitres(state);
      return remaining < SUMMER_STEP_LITRES || allocatedLitres(state) >= totalSummerNeed();
    }
    case 'finale':
      return false;
  }
}

function assemblyStage(stage: RainwaterStageId): AssemblyStageId | null {
  return stage === 'rooftop' || stage === 'filter' || stage === 'school' || stage === 'recharge'
    ? stage
    : null;
}

function applyAssembly(assembly: AssemblyState, input: AssemblyInput): AssemblyState {
  if (input.kind === 'pick') return pickPiece(assembly, input.pieceId);
  if (input.kind === 'place') return placePiece(assembly, input.socketId);
  return removePiece(assembly, input.socketId);
}

const DROUGHT_FEEDBACK: Record<Exclude<DroughtOption, 'collect'>, string> = {
  drain: 'Rain sent down the drain is gone by summer. The pond stays dry.',
  road: 'Water left on the road floods it now and is gone by summer.',
};

export function reduceRainwater(
  state: RainwaterState,
  action: RainwaterAction,
): RainwaterState {
  const base = { ...state, feedback: null };
  const index = RAINWATER_STAGES.indexOf(state.stage);
  switch (action.type) {
    case 'continue': {
      const next = RAINWATER_STAGES[index + 1];
      if (!next) return base;
      if (!rainwaterCanContinue(state)) {
        return { ...state, feedback: 'Finish this step first.' };
      }
      return { ...base, stage: next };
    }
    case 'back':
      return { ...base, stage: RAINWATER_STAGES[Math.max(0, index - 1)]! };
    case 'observe':
      return state.stage === 'rainy-day' ? { ...base, observedRunoff: true } : state;
    case 'choose':
      if (state.stage !== 'drought') return state;
      return action.option === 'collect'
        ? { ...base, choseCollect: true }
        : { ...base, feedback: DROUGHT_FEEDBACK[action.option] };
    case 'assembly': {
      const stage = assemblyStage(state.stage);
      if (!stage) return state;
      return {
        ...base,
        assemblies: {
          ...state.assemblies,
          [stage]: applyAssembly(state.assemblies[stage], action.action),
        },
      };
    }
    case 'open-first-flush':
      return state.stage === 'filter' ? { ...base, firstFlushOpen: true } : state;
    case 'storm-finished': {
      if (state.stage !== 'storm' || !Number.isFinite(action.routedLitres)) return state;
      const routed = Math.min(STORM_MAX_LITRES, Math.max(0, Math.round(action.routedLitres)));
      return {
        ...base,
        stormBestLitres: Math.max(state.stormBestLitres ?? 0, routed),
      };
    }
    case 'retry-storm':
      return state.stormBestLitres === null ? state : { ...base, stage: 'storm' };
    case 'allocate': {
      if (state.stage !== 'summer') return state;
      const { target } = action;
      if (state.allocated[target] >= SUMMER_NEEDS[target]) {
        return { ...base, feedback: `The ${target} has enough water now.` };
      }
      if (storedLitres(state) - allocatedLitres(state) < SUMMER_STEP_LITRES) {
        const left = storedLitres(state) - allocatedLitres(state);
        return {
          ...base,
          feedback:
            left > 0
              ? `Only ${litres(left)} litres are left, not enough for another share.`
              : 'The tanks are empty. Every litre has been used.',
        };
      }
      return {
        ...base,
        allocated: {
          ...state.allocated,
          [target]: state.allocated[target] + SUMMER_STEP_LITRES,
        },
      };
    }
    case 'try-drinking':
      return state.stage === 'summer' ? { ...base, feedback: SAFETY_MESSAGE } : state;
  }
}

export const RAINWATER_NARRATION_KEYS = [
  'rainy-day',
  'rainy-lost',
  'drought',
  'rooftop',
  'filter',
  'school',
  'recharge',
  'storm',
  'summer',
  'summer-short',
  'finale-full',
  'finale-partial',
] as const;
export type RainwaterNarrationKey = (typeof RAINWATER_NARRATION_KEYS)[number];

/** The narration line that matches what the child has actually done. */
export function narrationKeyFor(state: RainwaterState): RainwaterNarrationKey {
  switch (state.stage) {
    case 'rainy-day':
      return state.observedRunoff ? 'rainy-lost' : 'rainy-day';
    case 'summer':
      return summerShortage(state) > 0 ? 'summer-short' : 'summer';
    case 'finale':
      return savedLitres(state) >= RAINWATER_GOAL_LITRES ? 'finale-full' : 'finale-partial';
    default:
      return state.stage;
  }
}

function assemblyPrompt(
  assembly: AssemblyState,
  building: string,
  wrongOrder: string,
): string {
  return isAssemblyFull(assembly) && !isAssemblySolved(assembly) ? wrongOrder : building;
}

export function rainwaterPrompt(state: RainwaterState): string {
  const saved = savedLitres(state);
  switch (state.stage) {
    case 'rainy-day':
      return state.observedRunoff
        ? 'All 10,000 litres of rain ran into the drain and were lost.'
        : 'Follow a raindrop from the roof and see where it goes.';
    case 'drought':
      return state.choseCollect
        ? 'Yes. Collect it and store it for the dry months.'
        : 'What should the village do with its rain next monsoon?';
    case 'rooftop':
      return isAssemblySolved(state.assemblies.rooftop)
        ? 'The roof catches the rain, and the gutters guide it to the tank. But look: the first rain washes dust off the roof, so this water is dirty.'
        : 'Pick up each gutter piece and snap it to the lower edge of the roof. Any gap spills water onto the road.';
    case 'filter':
      if (waterIsClear(state)) {
        return `The dirty water was emptied, and now clean rain runs through the filter into the tank. ${SAFETY_MESSAGE}`;
      }
      if (!state.firstFlushOpen) {
        return `Open the first-flush valve to send the dirty first rain away. ${SAFETY_MESSAGE}`;
      }
      return `${assemblyPrompt(
        state.assemblies.filter,
        'Stack the filter layers so water passes through stones, then sand, then charcoal.',
        `The water is still cloudy. Water must pass through stones, then sand, then charcoal. ${TAKE_OFF_HINT}`,
      )} ${SAFETY_MESSAGE}`;
    case 'school':
      return isAssemblySolved(state.assemblies.school)
        ? 'A bigger roof catches far more rain, so the tank fills faster.'
        : assemblyPrompt(
            state.assemblies.school,
            'Connect the school roof: the long gutter at the roof edge, the pipe down the wall, and the cover on the big tank.',
            `Something is in the wrong place. The gutter goes on the roof edge, the pipe goes down the wall, and the cover goes on the tank. ${TAKE_OFF_HINT}`,
          );
    case 'recharge':
      return isAssemblySolved(state.assemblies.recharge)
        ? 'Water soaks slowly through the layers and refills the ground.'
        : assemblyPrompt(
            state.assemblies.recharge,
            'Build the pit from the bottom up: large stones, small stones, then sand.',
            `Water cannot soak through well in that order. Use large stones at the bottom, small stones in the middle, and sand on top. ${TAKE_OFF_HINT}`,
          );
    case 'storm':
      return state.stormBestLitres === null
        ? 'Heavy rain! Turn the valves to send water to whichever store has room.'
        : `Your best is ${litres(state.stormBestLitres)} litres saved in the storm. Play again to beat it, or continue.`;
    case 'summer': {
      const shortage = summerShortage(state);
      const { garden, animals, cleaning } = state.allocated;
      const shared = `Garden ${litres(garden)} of ${litres(SUMMER_NEEDS.garden)} L, animals ${litres(animals)} of ${litres(SUMMER_NEEDS.animals)} L, cleaning ${litres(cleaning)} of ${litres(SUMMER_NEEDS.cleaning)} L.`;
      return shortage > 0
        ? `You stored ${litres(storedLitres(state))} litres, but the village needs ${litres(totalSummerNeed())}. Choose carefully. ${shared}`
        : `You stored ${litres(storedLitres(state))} litres. Share it between the garden, the animals and cleaning. ${shared}`;
    }
    case 'finale':
      return saved >= RAINWATER_GOAL_LITRES
        ? 'You saved all 10,000 litres. Sundargram is ready for summer.'
        : `You saved ${litres(saved)} of 10,000 litres. That is real water for Sundargram. Replay the storm to save more.`;
  }
}
