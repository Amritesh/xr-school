import type { NormalizedAction } from '@xr-school/simulation-schema';
import type { InvestigationReducer } from '../experience/interactiveInvestigation.js';

export type LipidSampleId = 'peanut' | 'coconut' | 'rice';
export type LipidPrediction = 'present' | 'absent';
export type LipidObservation = 'persistent' | 'none';
export type LipidProcedureStep =
  | 'place'
  | 'fold'
  | 'crush'
  | 'remove'
  | 'dry'
  | 'inspect';

export interface LipidSampleDefinition {
  id: LipidSampleId;
  label: string;
  expectedObservation: LipidObservation;
  explanation: string;
}

export const LIPID_SAMPLES: Record<LipidSampleId, LipidSampleDefinition> = {
  peanut: {
    id: 'peanut',
    label: 'Peanut',
    expectedObservation: 'persistent',
    explanation:
      'Peanut lipids leave a persistent translucent patch after drying.',
  },
  coconut: {
    id: 'coconut',
    label: 'Dry coconut',
    expectedObservation: 'persistent',
    explanation:
      'Dry coconut lipids leave a persistent translucent patch after drying.',
  },
  rice: {
    id: 'rice',
    label: 'Rice grain',
    expectedObservation: 'none',
    explanation:
      'This equal rice sample leaves little or no lasting translucent patch in the qualitative test.',
  },
};

export const LIPID_PROCEDURE: readonly LipidProcedureStep[] = [
  'place',
  'fold',
  'crush',
  'remove',
  'dry',
  'inspect',
];

export interface LipidSampleRecord {
  prediction?: LipidPrediction;
  completedSteps: LipidProcedureStep[];
  observation?: LipidObservation;
}

export interface LipidTestState {
  records: Partial<Record<LipidSampleId, LipidSampleRecord>>;
  lastSampleId?: LipidSampleId;
}

export const initialLipidTestState: LipidTestState = { records: {} };

function actionParts(action: NormalizedAction): {
  sample: LipidSampleDefinition;
  value?: string;
} {
  const [rawId, encodedValue] = action.targetEntityId.split('::');
  const sample = LIPID_SAMPLES[rawId as LipidSampleId];
  if (!sample) throw new Error(`Unknown lipid sample ${action.targetEntityId}`);
  return {
    sample,
    value: typeof action.value === 'string' ? action.value : encodedValue,
  };
}

function recordFor(
  state: Readonly<LipidTestState>,
  id: LipidSampleId,
): LipidSampleRecord {
  const existing = state.records[id];
  return existing
    ? { ...existing, completedSteps: [...existing.completedSteps] }
    : { completedSteps: [] };
}

export const reduceLipidTest: InvestigationReducer<LipidTestState> = (
  state,
  action,
) => {
  const { sample, value } = actionParts(action);
  const record = recordFor(state, sample.id);

  if (action.actionId === 'lipid.predict') {
    if (value !== 'present' && value !== 'absent') {
      throw new Error(`Lipid prediction for ${sample.id} must be present or absent`);
    }
    const nextRecord = { ...record, prediction: value };
    return {
      state: {
        ...state,
        records: { ...state.records, [sample.id]: nextRecord },
        lastSampleId: sample.id,
      },
      lessonActionId: 'lipid.predict',
      evidenceIds: [`prediction-${sample.id}`],
      feedback: {
        tone: 'information',
        message: `Prediction recorded for ${sample.label}.`,
      },
    };
  }

  if (action.actionId === 'lipid.advance-procedure') {
    if (!record.prediction) {
      throw new Error(
        `Record a prediction for ${sample.id} before beginning the paper test`,
      );
    }
    const expectedStep = LIPID_PROCEDURE[record.completedSteps.length];
    if (!expectedStep) {
      throw new Error(`${sample.label} paper test is already complete`);
    }
    if (value !== expectedStep) {
      throw new Error(
        `Lipid procedure expected ${expectedStep}, received ${String(value)}`,
      );
    }
    const completedSteps = [...record.completedSteps, expectedStep];
    const complete = expectedStep === 'inspect';
    const nextRecord: LipidSampleRecord = {
      ...record,
      completedSteps,
      ...(complete ? { observation: sample.expectedObservation } : {}),
    };
    return {
      state: {
        ...state,
        records: { ...state.records, [sample.id]: nextRecord },
        lastSampleId: sample.id,
      },
      lessonActionId: 'lipid.advance-procedure',
      evidenceIds: complete ? [`procedure-${sample.id}-complete`] : [],
      feedback: {
        tone: complete ? 'success' : 'information',
        message: complete
          ? `${sample.label}: ${sample.explanation}`
          : `${sample.label}: ${expectedStep} complete.`,
      },
    };
  }

  throw new Error(`Unsupported lipid-test action ${action.actionId}`);
};
