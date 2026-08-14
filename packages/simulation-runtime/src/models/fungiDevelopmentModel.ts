export type FungalObjectId = 'mushroom' | 'bread-mould' | 'green-plant';
export type FungalKingdom = 'fungus' | 'plant';
export type FungalGrowthCondition = 'favourable' | 'slow' | 'suppressed';
export type FungalGrowthConditionChoice =
  | 'dry-cold'
  | 'warm-moist'
  | 'hot-dry';
export type FungalGrowthStage =
  | 'landed-spore'
  | 'hyphae-visible'
  | 'mycelium-spreading'
  | 'spore-structures'
  | 'spores-released';
export type FungalLifeCycleLabel =
  | 'spore-lands'
  | 'hypha-grows'
  | 'mycelium-forms'
  | 'spore-structure-forms'
  | 'spores-release';
export type FungalUsefulRole = 'decomposer' | 'food' | 'medicine';
export type FungalUsefulActorId =
  | 'yeast'
  | 'antibiotic-producing-fungus'
  | 'saprotrophic-fungus';
export type FungalSafetyOutcome =
  | 'observe-without-touching-or-eating'
  | 'touch-or-eat-unknown-fungus';

export interface FungalObjectDefinition {
  id: FungalObjectId;
  label: string;
  kingdom: FungalKingdom;
  fact: string;
}

export const FUNGAL_OBJECTS: Record<FungalObjectId, FungalObjectDefinition> = {
  mushroom: {
    id: 'mushroom',
    label: 'Mushroom',
    kingdom: 'fungus',
    fact: 'A mushroom is a fungus that makes spores instead of seeds.',
  },
  'bread-mould': {
    id: 'bread-mould',
    label: 'Bread mould',
    kingdom: 'fungus',
    fact: 'Bread mould is a fungus made of tiny branching threads called hyphae.',
  },
  'green-plant': {
    id: 'green-plant',
    label: 'Green plant',
    kingdom: 'plant',
    fact: 'A green plant uses sunlight to make its own food; fungi do not.',
  },
};

export const FUNGAL_GROWTH_STAGES: readonly FungalGrowthStage[] = [
  'landed-spore',
  'hyphae-visible',
  'mycelium-spreading',
  'spore-structures',
  'spores-released',
];

export const FUNGAL_LIFE_CYCLE_LABELS: readonly FungalLifeCycleLabel[] = [
  'spore-lands',
  'hypha-grows',
  'mycelium-forms',
  'spore-structure-forms',
  'spores-release',
];

export const FUNGAL_USEFUL_ROLE_BY_ACTOR: Readonly<Record<FungalUsefulActorId, FungalUsefulRole>> = {
  yeast: 'food',
  'antibiotic-producing-fungus': 'medicine',
  'saprotrophic-fungus': 'decomposer',
};

const FUNGAL_SAFETY_OUTCOMES: readonly FungalSafetyOutcome[] = [
  'observe-without-touching-or-eating',
  'touch-or-eat-unknown-fungus',
];

const FUNGAL_GROWTH_CONDITION_CHOICES: readonly FungalGrowthConditionChoice[] =
  ['dry-cold', 'warm-moist', 'hot-dry'];

export const FUNGAL_GROWTH_BOUNDS = {
  day: { minimum: 1, maximum: 5 },
  temperatureC: { minimum: 0, maximum: 45 },
  moisturePercent: { minimum: 0, maximum: 100 },
} as const;

export interface FungalGrowthInput {
  day: number;
  temperatureC: number;
  moisturePercent: number;
}

export interface FungalGrowthResult {
  stage: FungalGrowthStage;
  condition: FungalGrowthCondition;
  developmentRate: number;
}

function finiteInRange(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
  if (value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function evaluateFungalGrowth(
  input: FungalGrowthInput,
): FungalGrowthResult {
  const day = finiteInRange(input.day, 'day', 1, 5);
  if (!Number.isInteger(day)) {
    throw new Error('day must be an integer from 1 to 5');
  }
  const temperatureC = finiteInRange(input.temperatureC, 'temperature', 0, 45);
  const moisturePercent = finiteInRange(
    input.moisturePercent,
    'moisture',
    0,
    100,
  );

  const temperatureRate =
    temperatureC <= 27
      ? clampUnit((temperatureC - 5) / 22)
      : clampUnit((45 - temperatureC) / 18);
  const moistureRate = clampUnit((moisturePercent - 20) / 62);
  const developmentRate = Math.min(temperatureRate, moistureRate);
  const condition: FungalGrowthCondition =
    developmentRate >= 0.95
      ? 'favourable'
      : developmentRate > 0
        ? 'slow'
        : 'suppressed';
  const stageIndex =
    condition === 'favourable'
      ? day - 1
      : Math.floor((day - 1) * developmentRate * 0.75);

  return {
    stage: FUNGAL_GROWTH_STAGES[stageIndex] ?? 'landed-spore',
    condition,
    developmentRate,
  };
}

export interface FungalUsefulRoleMatch {
  objectId: FungalUsefulActorId;
  role: FungalUsefulRole;
}

export function hasCompleteFungalUsefulRoleMatches(
  matches: readonly FungalUsefulRoleMatch[],
): boolean {
  const expected = Object.entries(FUNGAL_USEFUL_ROLE_BY_ACTOR) as Array<[
    FungalUsefulActorId,
    FungalUsefulRole,
  ]>;
  return matches.length === expected.length && expected.every(([objectId, role]) =>
    matches.some(match => match.objectId === objectId && match.role === role));
}

export interface FungalQuizAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  independentTransfer: boolean;
}

export interface FungiDevelopmentState {
  selectedFungi: FungalObjectId[];
  touchedHyphae: string[];
  sporeGuidance: string[];
  sporeLandings: string[];
  firstGrowthPrediction?: FungalGrowthConditionChoice;
  latestGrowthPrediction?: FungalGrowthConditionChoice;
  visitedDays: number[];
  lifeCycleLabels: FungalLifeCycleLabel[];
  usefulRoleMatches: FungalUsefulRoleMatch[];
  safetyDecisions: FungalSafetyOutcome[];
  safetyMisconceptionResolved: boolean;
  quizAnswers: FungalQuizAnswer[];
  evidenceIds: string[];
  completed: boolean;
  mastery: boolean;
}

export type FungiDevelopmentAction =
  | { type: 'select-fungus'; objectId: FungalObjectId }
  | { type: 'touch-hypha'; hyphaId: string }
  | { type: 'guide-spore'; guidanceId: string }
  | { type: 'land-spore'; landingId: string }
  | {
      type: 'choose-growth-condition';
      condition: FungalGrowthConditionChoice;
    }
  | { type: 'visit-day'; day: number }
  | { type: 'record-life-cycle'; label: FungalLifeCycleLabel }
  | {
      type: 'match-useful-role';
      objectId: FungalUsefulActorId;
      role: FungalUsefulRole;
    }
  | { type: 'decide-safety'; outcome: FungalSafetyOutcome }
  | {
      type: 'answer-quiz';
      questionId: string;
      answer: string;
      correct: boolean;
      independentTransfer: boolean;
    }
  | { type: 'complete' };

export const initialFungiDevelopmentState: FungiDevelopmentState = {
  selectedFungi: [],
  touchedHyphae: [],
  sporeGuidance: [],
  sporeLandings: [],
  visitedDays: [],
  lifeCycleLabels: [],
  usefulRoleMatches: [],
  safetyDecisions: [],
  safetyMisconceptionResolved: false,
  quizAnswers: [],
  evidenceIds: [],
  completed: false,
  mastery: false,
};

function requireNonEmpty(value: string, label: string): string {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty`);
  return value;
}

function addUnique<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? [...values] : [...values, value];
}

function addEvidence(
  state: FungiDevelopmentState,
  evidenceId: string,
): string[] {
  return addUnique(state.evidenceIds, evidenceId);
}

function withMastery(state: FungiDevelopmentState): FungiDevelopmentState {
  const hasObservation = state.visitedDays.length > 0;
  const hasIndependentTransfer = state.quizAnswers.some(
    (answer) => answer.correct && answer.independentTransfer,
  );
  return {
    ...state,
    mastery:
      hasObservation &&
      state.safetyMisconceptionResolved &&
      hasIndependentTransfer,
  };
}

export function reduceFungiDevelopment(
  state: FungiDevelopmentState,
  action: FungiDevelopmentAction,
): FungiDevelopmentState {
  let next: FungiDevelopmentState;

  switch (action.type) {
    case 'select-fungus': {
      const object = FUNGAL_OBJECTS[action.objectId];
      if (!object || object.kingdom !== 'fungus') {
        throw new Error(`${String(action.objectId)} is not a fungus`);
      }
      next = {
        ...state,
        selectedFungi: addUnique(state.selectedFungi, action.objectId),
        evidenceIds: addEvidence(state, `fungus-selected:${action.objectId}`),
      };
      break;
    }
    case 'touch-hypha': {
      const hyphaId = requireNonEmpty(action.hyphaId, 'hypha ID');
      next = {
        ...state,
        touchedHyphae: addUnique(state.touchedHyphae, hyphaId),
        evidenceIds: addEvidence(state, `hypha-touched:${hyphaId}`),
      };
      break;
    }
    case 'guide-spore': {
      const guidanceId = requireNonEmpty(
        action.guidanceId,
        'spore guidance ID',
      );
      next = {
        ...state,
        sporeGuidance: addUnique(state.sporeGuidance, guidanceId),
        evidenceIds: addEvidence(state, `spore-guided:${guidanceId}`),
      };
      break;
    }
    case 'land-spore': {
      const landingId = requireNonEmpty(action.landingId, 'spore landing ID');
      next = {
        ...state,
        sporeLandings: addUnique(state.sporeLandings, landingId),
        evidenceIds: addEvidence(state, `spore-landed:${landingId}`),
      };
      break;
    }
    case 'choose-growth-condition':
      if (!FUNGAL_GROWTH_CONDITION_CHOICES.includes(action.condition)) {
        throw new Error(
          `Unknown fungal growth condition choice ${String(action.condition)}`,
        );
      }
      next = {
        ...state,
        firstGrowthPrediction:
          state.firstGrowthPrediction ?? action.condition,
        latestGrowthPrediction: action.condition,
        evidenceIds: addEvidence(
          state,
          `growth-condition-choice:${action.condition}`,
        ),
      };
      break;
    case 'visit-day': {
      const day = finiteInRange(action.day, 'day', 1, 5);
      if (!Number.isInteger(day))
        throw new Error('day must be an integer from 1 to 5');
      next = {
        ...state,
        visitedDays: addUnique(state.visitedDays, day).sort((a, b) => a - b),
        evidenceIds: addEvidence(state, `day-visited:${day}`),
      };
      break;
    }
    case 'record-life-cycle': {
      if (state.lifeCycleLabels.includes(action.label)) return state;
      const expected = FUNGAL_LIFE_CYCLE_LABELS[state.lifeCycleLabels.length];
      if (action.label !== expected) {
        throw new Error(
          `Life cycle expected ${String(expected)}, received ${action.label}`,
        );
      }
      next = {
        ...state,
        lifeCycleLabels: [...state.lifeCycleLabels, action.label],
        evidenceIds: addEvidence(state, `life-cycle:${action.label}`),
      };
      break;
    }
    case 'match-useful-role': {
      if (!Object.hasOwn(FUNGAL_USEFUL_ROLE_BY_ACTOR, action.objectId)) {
        throw new Error(`Unknown fungal useful actor ${String(action.objectId)}`);
      }
      const expectedRole = FUNGAL_USEFUL_ROLE_BY_ACTOR[action.objectId];
      if (action.role !== expectedRole) {
        throw new Error(`${action.objectId} must match the ${expectedRole} useful role`);
      }
      const duplicate = state.usefulRoleMatches.some(
        (match) =>
          match.objectId === action.objectId && match.role === action.role,
      );
      if (duplicate) return state;
      next = {
        ...state,
        usefulRoleMatches: [
          ...state.usefulRoleMatches,
          { objectId: action.objectId, role: action.role },
        ],
        evidenceIds: addEvidence(
          state,
          `useful-role:${action.objectId}:${action.role}`,
        ),
      };
      break;
    }
    case 'decide-safety': {
      if (!FUNGAL_SAFETY_OUTCOMES.includes(action.outcome)) {
        throw new Error(
          `Unknown fungal safety outcome ${String(action.outcome)}`,
        );
      }
      next = {
        ...state,
        safetyDecisions: addUnique(state.safetyDecisions, action.outcome),
        safetyMisconceptionResolved:
          state.safetyMisconceptionResolved ||
          action.outcome === 'observe-without-touching-or-eating',
        evidenceIds: addEvidence(state, `safety-decision:${action.outcome}`),
      };
      break;
    }
    case 'answer-quiz': {
      const questionId = requireNonEmpty(action.questionId, 'question ID');
      requireNonEmpty(action.answer, 'quiz answer');
      if (
        typeof action.correct !== 'boolean' ||
        typeof action.independentTransfer !== 'boolean'
      ) {
        throw new Error('Quiz correctness and transfer flags must be boolean');
      }
      const duplicate = state.quizAnswers.some(
        (answer) =>
          answer.questionId === questionId &&
          answer.answer === action.answer &&
          answer.correct === action.correct &&
          answer.independentTransfer === action.independentTransfer,
      );
      if (duplicate) return state;
      next = {
        ...state,
        quizAnswers: [
          ...state.quizAnswers,
          {
            questionId,
            answer: action.answer,
            correct: action.correct,
            independentTransfer: action.independentTransfer,
          },
        ],
        evidenceIds: addEvidence(state, `quiz-answered:${questionId}`),
      };
      break;
    }
    case 'complete':
      if (state.completed) return withMastery(state);
      next = {
        ...state,
        completed: true,
        evidenceIds: addEvidence(state, 'lesson-completed'),
      };
      break;
    default:
      throw new Error(
        `Unknown fungi development action ${String((action as { type?: unknown }).type)}`,
      );
  }

  return withMastery(next);
}
