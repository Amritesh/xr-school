import type { NormalizedAction } from '@xr-school/simulation-schema';
import type { InvestigationReducer } from '../experience/interactiveInvestigation.js';

export interface NutritionCase {
  id: string;
  label: string;
  acceptedSourceIds: readonly string[];
  acceptedRelationId: string;
  evidenceId: string;
  sourceHint: string;
  relationHint: string;
}

export interface NutritionMatchState {
  completedIds: string[];
  attempts: Record<string, number>;
}

export const MINERAL_CASES: readonly NutritionCase[] = [
  {
    id: 'calcium',
    label: 'Calcium',
    acceptedSourceIds: ['milk-curd', 'ragi', 'sesame', 'leafy-greens'],
    acceptedRelationId: 'bones-teeth',
    evidenceId: 'mineral-calcium-matched',
    sourceHint: 'Choose a calcium source.',
    relationHint: 'Connect calcium to bones and teeth.',
  },
  {
    id: 'iodine',
    label: 'Iodine',
    acceptedSourceIds: ['iodized-salt', 'sea-fish', 'seaweed'],
    acceptedRelationId: 'thyroid-growth',
    evidenceId: 'mineral-iodine-matched',
    sourceHint: 'Choose an iodine source.',
    relationHint: 'Connect iodine to thyroid function and growth.',
  },
  {
    id: 'iron',
    label: 'Iron',
    acceptedSourceIds: ['leafy-greens', 'beans', 'jaggery', 'meat'],
    acceptedRelationId: 'red-blood-cells',
    evidenceId: 'mineral-iron-matched',
    sourceHint: 'Choose an iron source.',
    relationHint: 'Connect iron to haemoglobin and red blood cells.',
  },
];

export const VITAMIN_CASES: readonly NutritionCase[] = [
  {
    id: 'a',
    label: 'Vitamin A',
    acceptedSourceIds: ['carrot', 'papaya', 'mango', 'leafy-greens'],
    acceptedRelationId: 'night-blindness',
    evidenceId: 'vitamin-a-matched',
    sourceHint: 'Choose a vitamin A source.',
    relationHint: 'Connect long-term vitamin A deficiency to night blindness.',
  },
  {
    id: 'b1',
    label: 'Vitamin B1',
    acceptedSourceIds: ['whole-grains', 'pulses', 'nuts-seeds'],
    acceptedRelationId: 'beriberi',
    evidenceId: 'vitamin-b1-matched',
    sourceHint: 'Choose a vitamin B1 source.',
    relationHint: 'Connect long-term vitamin B1 deficiency to beriberi.',
  },
  {
    id: 'c',
    label: 'Vitamin C',
    acceptedSourceIds: ['amla', 'guava', 'orange', 'tomato'],
    acceptedRelationId: 'scurvy',
    evidenceId: 'vitamin-c-matched',
    sourceHint: 'Choose a vitamin C source.',
    relationHint: 'Connect long-term vitamin C deficiency to scurvy.',
  },
  {
    id: 'd',
    label: 'Vitamin D',
    acceptedSourceIds: ['sunlight', 'egg-yolk', 'fish', 'fortified-milk'],
    acceptedRelationId: 'rickets',
    evidenceId: 'vitamin-d-matched',
    sourceHint: 'Choose a vitamin D source or exposure.',
    relationHint: 'Connect long-term vitamin D deficiency to rickets.',
  },
];

export function createNutritionMatchReducer(
  cases: readonly NutritionCase[],
): InvestigationReducer<NutritionMatchState> {
  const byId = new Map(cases.map(current => [current.id, current]));
  if (byId.size !== cases.length) {
    throw new Error('Nutrition cases must use unique IDs');
  }

  return (state, action) => {
    if (action.actionId !== 'nutrition.submit-match') {
      throw new Error(`Unsupported nutrition action ${action.actionId}`);
    }
    const targetParts = action.targetEntityId.split('::');
    const id = targetParts.shift() ?? '';
    const current = byId.get(id);
    if (!current) throw new Error(`Unknown nutrition case ${id}`);

    const value =
      typeof action.value === 'string'
        ? action.value
        : targetParts.join('::');
    const [sourceId, relationId, ...extra] = value.split('::');
    if (!sourceId || !relationId || extra.length > 0) {
      throw new Error(
        `${current.label} match must encode exactly source::relation`,
      );
    }

    const attempts = {
      ...state.attempts,
      [current.id]: (state.attempts[current.id] ?? 0) + 1,
    };
    const sourceCorrect = current.acceptedSourceIds.includes(sourceId);
    const relationCorrect = current.acceptedRelationId === relationId;
    if (!sourceCorrect || !relationCorrect) {
      return {
        state: {
          completedIds: [...state.completedIds],
          attempts,
        },
        lessonActionId: 'nutrition.submit-match',
        evidenceIds: [],
        feedback: {
          tone: 'retry',
          message: sourceCorrect ? current.relationHint : current.sourceHint,
        },
      };
    }

    return {
      state: {
        completedIds: [...new Set([...state.completedIds, current.id])],
        attempts,
      },
      lessonActionId: 'nutrition.submit-match',
      evidenceIds: [current.evidenceId],
      feedback: {
        tone: 'success',
        message: `${current.label}: both links are supported.`,
      },
    };
  };
}
