import type { NormalizedAction } from '@xr-school/simulation-schema';
import type { InvestigationReducer } from '../experience/interactiveInvestigation.js';

export type FloatSinkOutcome = 'float' | 'sink';
export type FloatSinkObjectId =
  | 'leaf'
  | 'stone'
  | 'cork'
  | 'spoon'
  | 'bottle'
  | 'marble';

export interface BuoyancyInput {
  massG: number;
  maximumDisplacedVolumeMl: number;
  waterDensityGPerMl: number;
}

export interface FloatSinkObject extends BuoyancyInput {
  id: FloatSinkObjectId;
  label: string;
  material: string;
  clue: string;
}

export interface BuoyancyResult {
  outcome: FloatSinkOutcome;
  averageDensityGPerMl: number;
  weightN: number;
  maximumBuoyantForceN: number;
  supportMarginN: number;
}

const NEWTONS_PER_GRAM_FORCE = 0.00980665;

export const FLOAT_OR_SINK_OBJECTS: Record<FloatSinkObjectId, FloatSinkObject> =
  {
    leaf: {
      id: 'leaf',
      label: 'Dry leaf',
      material: 'plant material',
      clue: 'Broad, light, and dry',
      massG: 0.4,
      maximumDisplacedVolumeMl: 3,
      waterDensityGPerMl: 1,
    },
    stone: {
      id: 'stone',
      label: 'Stone',
      material: 'rock',
      clue: 'Compact and heavy for its size',
      massG: 120,
      maximumDisplacedVolumeMl: 45,
      waterDensityGPerMl: 1,
    },
    cork: {
      id: 'cork',
      label: 'Cork',
      material: 'cork with air spaces',
      clue: 'Contains many tiny air spaces',
      massG: 10,
      maximumDisplacedVolumeMl: 40,
      waterDensityGPerMl: 1,
    },
    spoon: {
      id: 'spoon',
      label: 'Steel spoon',
      material: 'solid steel',
      clue: 'Solid metal with little enclosed air',
      massG: 55,
      maximumDisplacedVolumeMl: 8,
      waterDensityGPerMl: 1,
    },
    bottle: {
      id: 'bottle',
      label: 'Closed empty bottle',
      material: 'plastic and trapped air',
      clue: 'Cap traps a large volume of air',
      massG: 35,
      maximumDisplacedVolumeMl: 500,
      waterDensityGPerMl: 1,
    },
    marble: {
      id: 'marble',
      label: 'Glass marble',
      material: 'solid glass',
      clue: 'Small, compact, and without trapped air',
      massG: 20,
      maximumDisplacedVolumeMl: 8,
      waterDensityGPerMl: 1,
    },
  };

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be positive and finite`);
  }
  return value;
}

export function evaluateBuoyancy(input: BuoyancyInput): BuoyancyResult {
  const massG = positiveFinite(input.massG, 'mass');
  const volumeMl = positiveFinite(
    input.maximumDisplacedVolumeMl,
    'maximum displaced volume',
  );
  const waterDensity = positiveFinite(input.waterDensityGPerMl, 'water density');
  const weightN = massG * NEWTONS_PER_GRAM_FORCE;
  const maximumBuoyantForceN =
    waterDensity * volumeMl * NEWTONS_PER_GRAM_FORCE;
  return {
    outcome: maximumBuoyantForceN >= weightN ? 'float' : 'sink',
    averageDensityGPerMl: massG / volumeMl,
    weightN,
    maximumBuoyantForceN,
    supportMarginN: maximumBuoyantForceN - weightN,
  };
}

export interface FloatOrSinkState {
  predictions: Partial<Record<FloatSinkObjectId, FloatSinkOutcome>>;
  observations: Partial<Record<FloatSinkObjectId, FloatSinkOutcome>>;
  lastObjectId?: FloatSinkObjectId;
}

export const initialFloatOrSinkState: FloatOrSinkState = {
  predictions: {},
  observations: {},
};

function actionParts(action: NormalizedAction): {
  object: FloatSinkObject;
  value?: string;
} {
  const [rawId, encodedValue] = action.targetEntityId.split('::');
  const object = FLOAT_OR_SINK_OBJECTS[rawId as FloatSinkObjectId];
  if (!object) {
    throw new Error(`Unknown Float or Sink object ${action.targetEntityId}`);
  }
  return {
    object,
    value: typeof action.value === 'string' ? action.value : encodedValue,
  };
}

export const reduceFloatOrSink: InvestigationReducer<FloatOrSinkState> = (
  state,
  action,
) => {
  const { object, value } = actionParts(action);
  if (action.actionId === 'float-sink.predict') {
    if (value !== 'float' && value !== 'sink') {
      throw new Error(`Prediction for ${object.id} must be float or sink`);
    }
    return {
      state: {
        ...state,
        predictions: { ...state.predictions, [object.id]: value },
        lastObjectId: object.id,
      },
      lessonActionId: 'float-sink.predict',
      evidenceIds: [`prediction-${object.id}-recorded`],
      feedback: {
        tone: 'information',
        message: `Prediction recorded for ${object.label}. Release it to observe.`,
      },
    };
  }
  if (action.actionId === 'float-sink.test') {
    const prediction = state.predictions[object.id];
    if (!prediction) {
      throw new Error(`Record a prediction for ${object.id} before testing`);
    }
    const result = evaluateBuoyancy(object);
    return {
      state: {
        ...state,
        observations: { ...state.observations, [object.id]: result.outcome },
        lastObjectId: object.id,
      },
      lessonActionId: 'float-sink.test',
      evidenceIds: [`observation-${object.id}-${result.outcome}`],
      feedback: {
        tone: prediction === result.outcome ? 'success' : 'information',
        message: `${object.label} ${result.outcome}s. Its maximum water support is ${result.maximumBuoyantForceN.toFixed(2)} N and its weight is ${result.weightN.toFixed(2)} N.`,
      },
    };
  }
  throw new Error(`Unsupported Float or Sink action ${action.actionId}`);
};
