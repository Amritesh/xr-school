import type { NormalizedAction } from '@xr-school/simulation-schema';
import type { InvestigationReducer } from '../experience/interactiveInvestigation.js';

export type ShapeId = 'sphere' | 'cylinder' | 'cuboid' | 'cone';

export interface ShapeItem {
  id: string;
  label: string;
  shape: ShapeId;
  clue: string;
}

export const SHAPE_ITEMS = {
  ball: {
    id: 'ball',
    label: 'Rubber ball',
    shape: 'sphere',
    clue: 'It is round in every direction and has no flat face.',
  },
  orange: {
    id: 'orange',
    label: 'Orange',
    shape: 'sphere',
    clue: 'Its overall form is round in every direction.',
  },
  can: {
    id: 'can',
    label: 'Tin can',
    shape: 'cylinder',
    clue: 'It has two circular faces joined by a curved surface.',
  },
  chalk: {
    id: 'chalk',
    label: 'Piece of chalk',
    shape: 'cylinder',
    clue: 'It has two circular ends and one curved surface.',
  },
  book: {
    id: 'book',
    label: 'Book',
    shape: 'cuboid',
    clue: 'It has six flat rectangular faces.',
  },
  block: {
    id: 'block',
    label: 'Wooden block',
    shape: 'cuboid',
    clue: 'Its flat faces meet along edges at corners.',
  },
  'party-hat': {
    id: 'party-hat',
    label: 'Party hat',
    shape: 'cone',
    clue: 'It has one circular base and narrows to a point.',
  },
  'traffic-cone': {
    id: 'traffic-cone',
    label: 'Traffic cone',
    shape: 'cone',
    clue: 'Its broad circular base tapers toward a point.',
  },
} as const satisfies Record<string, ShapeItem>;

export type ShapeItemId = keyof typeof SHAPE_ITEMS;

export interface ShapeSortingState {
  assignments: Partial<Record<ShapeItemId, ShapeId>>;
  attempts: Partial<Record<ShapeItemId, number>>;
  lastItemId?: ShapeItemId;
}

export const initialShapeSortingState: ShapeSortingState = {
  assignments: {},
  attempts: {},
};

export const reduceShapeSorting: InvestigationReducer<ShapeSortingState> = (
  state,
  action,
) => {
  if (action.actionId !== 'shape.assign') {
    throw new Error(`Unsupported shape-sorting action ${action.actionId}`);
  }
  const [rawId, encodedShape] = action.targetEntityId.split('::');
  const id = rawId as ShapeItemId;
  const item = SHAPE_ITEMS[id];
  if (!item) throw new Error(`Unknown shape item ${action.targetEntityId}`);
  const selectedShape =
    typeof action.value === 'string' ? action.value : encodedShape;
  if (
    selectedShape !== 'sphere' &&
    selectedShape !== 'cylinder' &&
    selectedShape !== 'cuboid' &&
    selectedShape !== 'cone'
  ) {
    throw new Error(`Unknown shape choice ${String(selectedShape)}`);
  }
  const attempts = {
    ...state.attempts,
    [id]: (state.attempts[id] ?? 0) + 1,
  };
  if (selectedShape !== item.shape) {
    return {
      state: {
        ...state,
        assignments: { ...state.assignments },
        attempts,
        lastItemId: id,
      },
      lessonActionId: 'shape.assign',
      evidenceIds: [],
      feedback: {
        tone: 'retry',
        message: item.clue,
      },
    };
  }
  return {
    state: {
      ...state,
      assignments: { ...state.assignments, [id]: selectedShape },
      attempts,
      lastItemId: id,
    },
    lessonActionId: 'shape.assign',
    evidenceIds: [`shape-${id}-${selectedShape}`],
    feedback: {
      tone: 'success',
      message: `${item.label} is supported by the observed features.`,
    },
  };
};
