import {
  evaluateFungalExperiment,
  type FungalExperimentInput,
  type FungalExperimentOutput,
} from './fungalGrowthExperiment.js';

export type FungalTrialPrediction = string;

export type FungalExperimentVariable = keyof FungalExperimentInput;

export interface CurrentFungalTrial {
  readonly input: Readonly<FungalExperimentInput>;
  readonly output: Readonly<FungalExperimentOutput>;
  readonly prediction?: FungalTrialPrediction;
}

export interface SavedFungalTrial extends CurrentFungalTrial {
  readonly id: string;
}

export interface FungalTrialComparison {
  readonly trialIds: readonly [string, string];
  readonly quality: 'fair' | 'confounded';
  readonly changedVariables: readonly FungalExperimentVariable[];
}

export interface FungiExperimentSession {
  readonly firstPrediction?: FungalTrialPrediction;
  readonly latestPrediction?: FungalTrialPrediction;
  readonly currentInput: Readonly<FungalExperimentInput>;
  readonly currentOutput: Readonly<FungalExperimentOutput>;
  readonly currentTrial?: CurrentFungalTrial;
  readonly savedTrials: readonly SavedFungalTrial[];
  readonly comparison?: FungalTrialComparison;
  readonly observations: readonly string[];
}

export type FungiExperimentAction =
  | {
      readonly type: 'predict-trial';
      readonly prediction: FungalTrialPrediction;
    }
  | {
      readonly type: 'set-input';
      readonly input: FungalExperimentInput;
    }
  | {
      readonly type: 'run-trial';
      readonly input: FungalExperimentInput;
    }
  | { readonly type: 'save-current-trial' }
  | {
      readonly type: 'compare-trials';
      readonly trialIds: readonly [string, string];
    }
  | {
      readonly type: 'record-observation';
      readonly observation: string;
    }
  | { readonly type: 'reset-camera' }
  | { readonly type: 'reset-experiment' }
  | { readonly type: 'restart-journey' };

const DEFAULT_INPUT: FungalExperimentInput = {
  temperatureC: 27,
  moisturePercent: 82,
  substrate: 'bread',
  elapsedHours: 0,
  inoculumViability: 1,
};

const EXPERIMENT_VARIABLES = Object.freeze([
  'temperatureC',
  'moisturePercent',
  'substrate',
  'elapsedHours',
  'inoculumViability',
] as const satisfies readonly FungalExperimentVariable[]);

interface SessionValues {
  firstPrediction?: FungalTrialPrediction;
  latestPrediction?: FungalTrialPrediction;
  currentInput: FungalExperimentInput;
  currentOutput: FungalExperimentOutput;
  currentTrial?: CurrentFungalTrial;
  savedTrials: readonly SavedFungalTrial[];
  comparison?: FungalTrialComparison;
  observations: readonly string[];
}

function cloneInput(
  input: Readonly<FungalExperimentInput>,
): FungalExperimentInput {
  return {
    temperatureC: input.temperatureC,
    moisturePercent: input.moisturePercent,
    substrate: input.substrate,
    elapsedHours: input.elapsedHours,
    inoculumViability: input.inoculumViability,
  };
}

function freezeInput(
  input: Readonly<FungalExperimentInput>,
): Readonly<FungalExperimentInput> {
  return Object.freeze(cloneInput(input));
}

function freezeOutput(
  output: Readonly<FungalExperimentOutput>,
): Readonly<FungalExperimentOutput> {
  return Object.freeze({ ...output });
}

function freezeCurrentTrial(trial: CurrentFungalTrial): CurrentFungalTrial {
  return Object.freeze({
    input: freezeInput(trial.input),
    output: freezeOutput(trial.output),
    ...(trial.prediction === undefined ? {} : { prediction: trial.prediction }),
  });
}

function freezeSavedTrial(trial: SavedFungalTrial): SavedFungalTrial {
  return Object.freeze({
    id: trial.id,
    input: freezeInput(trial.input),
    output: freezeOutput(trial.output),
    ...(trial.prediction === undefined ? {} : { prediction: trial.prediction }),
  });
}

function freezeComparison(
  comparison: FungalTrialComparison,
): FungalTrialComparison {
  return Object.freeze({
    trialIds: Object.freeze([...comparison.trialIds]) as readonly [
      string,
      string,
    ],
    quality: comparison.quality,
    changedVariables: Object.freeze([...comparison.changedVariables]),
  });
}

function createSession(values: SessionValues): FungiExperimentSession {
  return Object.freeze({
    ...(values.firstPrediction === undefined
      ? {}
      : { firstPrediction: values.firstPrediction }),
    ...(values.latestPrediction === undefined
      ? {}
      : { latestPrediction: values.latestPrediction }),
    currentInput: freezeInput(values.currentInput),
    currentOutput: freezeOutput(values.currentOutput),
    ...(values.currentTrial === undefined
      ? {}
      : { currentTrial: freezeCurrentTrial(values.currentTrial) }),
    savedTrials: Object.freeze(values.savedTrials.map(freezeSavedTrial)),
    ...(values.comparison === undefined
      ? {}
      : { comparison: freezeComparison(values.comparison) }),
    observations: Object.freeze([...values.observations]),
  });
}

function sessionValues(state: FungiExperimentSession): SessionValues {
  return {
    firstPrediction: state.firstPrediction,
    latestPrediction: state.latestPrediction,
    currentInput: cloneInput(state.currentInput),
    currentOutput: { ...state.currentOutput },
    currentTrial: state.currentTrial,
    savedTrials: state.savedTrials,
    comparison: state.comparison,
    observations: state.observations,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireOwnField(
  record: Record<string, unknown>,
  field: string,
): unknown {
  if (!Object.hasOwn(record, field)) {
    throw new Error(`${field} is required`);
  }
  return record[field];
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function validatedPrediction(value: unknown): FungalTrialPrediction {
  return requireNonEmptyString(value, 'prediction');
}

function validatedInput(value: unknown): {
  input: FungalExperimentInput;
  output: FungalExperimentOutput;
} {
  if (!isRecord(value)) {
    throw new Error('input must be an object');
  }
  const input = {
    temperatureC: requireOwnField(value, 'temperatureC'),
    moisturePercent: requireOwnField(value, 'moisturePercent'),
    substrate: requireOwnField(value, 'substrate'),
    elapsedHours: requireOwnField(value, 'elapsedHours'),
    inoculumViability: requireOwnField(value, 'inoculumViability'),
  } as unknown as FungalExperimentInput;
  const output = evaluateFungalExperiment(input);
  return { input: cloneInput(input), output: { ...output } };
}

function validatedTrialIds(value: unknown): readonly [string, string] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error('trialIds must contain exactly two trial IDs');
  }
  return [
    requireNonEmptyString(value[0], 'trialIds[0]'),
    requireNonEmptyString(value[1], 'trialIds[1]'),
  ];
}

function findTrial(
  savedTrials: readonly SavedFungalTrial[],
  trialId: string,
): SavedFungalTrial {
  const trial = savedTrials.find((candidate) => candidate.id === trialId);
  if (trial === undefined) {
    throw new Error(`trial ${trialId} does not exist`);
  }
  return trial;
}

export function createFungiExperimentSession(): FungiExperimentSession {
  const input = cloneInput(DEFAULT_INPUT);
  return createSession({
    currentInput: input,
    currentOutput: evaluateFungalExperiment(input),
    savedTrials: [],
    observations: [],
  });
}

export function reduceFungiExperiment(
  state: FungiExperimentSession,
  action: FungiExperimentAction,
): FungiExperimentSession {
  if (!isRecord(action) || !Object.hasOwn(action, 'type')) {
    throw new Error('experiment action must have a string type');
  }
  const actionType = action.type;
  if (typeof actionType !== 'string') {
    throw new Error('experiment action type must be a string');
  }

  switch (actionType) {
    case 'predict-trial': {
      const prediction = validatedPrediction(
        requireOwnField(action, 'prediction'),
      );
      return createSession({
        ...sessionValues(state),
        firstPrediction: state.firstPrediction ?? prediction,
        latestPrediction: prediction,
      });
    }

    case 'set-input': {
      const { input, output } = validatedInput(
        requireOwnField(action, 'input'),
      );
      return createSession({
        ...sessionValues(state),
        currentInput: input,
        currentOutput: output,
        currentTrial: undefined,
      });
    }

    case 'run-trial': {
      const { input, output } = validatedInput(
        requireOwnField(action, 'input'),
      );
      return createSession({
        ...sessionValues(state),
        currentInput: input,
        currentOutput: output,
        currentTrial: {
          input,
          output,
          ...(state.latestPrediction === undefined
            ? {}
            : { prediction: state.latestPrediction }),
        },
      });
    }

    case 'save-current-trial': {
      if (state.currentTrial === undefined) {
        throw new Error('run a trial before saving it');
      }
      const savedTrial: SavedFungalTrial = {
        id: `trial-${state.savedTrials.length + 1}`,
        input: state.currentTrial.input,
        output: state.currentTrial.output,
        ...(state.currentTrial.prediction === undefined
          ? {}
          : { prediction: state.currentTrial.prediction }),
      };
      return createSession({
        ...sessionValues(state),
        currentTrial: undefined,
        savedTrials: [...state.savedTrials, savedTrial],
      });
    }

    case 'compare-trials': {
      const trialIds = validatedTrialIds(requireOwnField(action, 'trialIds'));
      if (trialIds[0] === trialIds[1]) {
        throw new Error('comparison requires two different trial IDs');
      }
      const first = findTrial(state.savedTrials, trialIds[0]);
      const second = findTrial(state.savedTrials, trialIds[1]);
      const changedVariables = EXPERIMENT_VARIABLES.filter(
        (variable) => first.input[variable] !== second.input[variable],
      );
      return createSession({
        ...sessionValues(state),
        comparison: {
          trialIds,
          quality: changedVariables.length === 1 ? 'fair' : 'confounded',
          changedVariables,
        },
      });
    }

    case 'record-observation': {
      const observation = requireNonEmptyString(
        requireOwnField(action, 'observation'),
        'observation',
      );
      return createSession({
        ...sessionValues(state),
        observations: state.observations.includes(observation)
          ? state.observations
          : [...state.observations, observation],
      });
    }

    case 'reset-camera':
      return state;

    case 'reset-experiment': {
      const reset = createFungiExperimentSession();
      return createSession({
        ...sessionValues(reset),
        firstPrediction: state.firstPrediction,
        latestPrediction: state.latestPrediction,
        observations: state.observations,
      });
    }

    case 'restart-journey':
      return createFungiExperimentSession();

    default:
      throw new Error(`unknown fungi experiment action: ${actionType}`);
  }
}
