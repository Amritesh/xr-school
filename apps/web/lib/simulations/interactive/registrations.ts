import {
  FLOAT_OR_SINK,
  INTERACTIVE_SIMULATIONS,
  LIPID_TEST,
  MINERAL_SOURCES,
  SHAPE_SORTING,
  SOLUBILITY,
  VITAMIN_DEFICIENCIES,
} from '@xr-school/simulation-content';
import {
  FLOAT_OR_SINK_OBJECTS,
  LIPID_PROCEDURE,
  LIPID_SAMPLES,
  MINERAL_CASES,
  SHAPE_ITEMS,
  SOLUBILITY_SUBSTANCES,
  VITAMIN_CASES,
  createInteractiveInvestigationSession,
  createNutritionMatchReducer,
  initialFloatOrSinkState,
  initialLipidTestState,
  initialShapeSortingState,
  initialSolubilityInvestigationState,
  reduceFloatOrSink,
  reduceLipidTest,
  reduceShapeSorting,
  reduceSolubilityInvestigation,
  type AssessmentBinding,
  type FloatOrSinkState,
  type LipidTestState,
  type NutritionCase,
  type NutritionMatchState,
  type ShapeId,
  type ShapeSortingState,
  type SolubilityInvestigationState,
} from '@xr-school/simulation-runtime';
import { createFloatOrSinkSceneAdapter } from './float-or-sink.scene';
import { createLipidTestSceneAdapter } from './lipid-test.scene';
import { createMineralSourcesSceneAdapter } from './mineral-sources.scene';
import { createShapeSortingSceneAdapter } from './shape-sorting.scene';
import { createSolubilitySceneAdapter } from './solubility.scene';
import { createVitaminDeficienciesSceneAdapter } from './vitamin-deficiencies.scene';
import type {
  AnyInteractiveViewerRegistration,
  InteractiveChoice,
  InteractiveViewerRegistration,
} from './types';

function action(
  id: string,
  label: string,
  actionId: string,
  targetEntityId: string,
  value?: string,
): InteractiveChoice {
  return {
    id,
    label,
    action: {
      actionId,
      targetEntityId,
      phase: 'commit',
      ...(value === undefined ? {} : { value }),
    },
  };
}

function bindings(
  entries: ReadonlyArray<readonly [string, string, string]>,
): Readonly<Record<string, AssessmentBinding>> {
  return Object.freeze(
    Object.fromEntries(
      entries.map(([promptId, lessonActionId, lessonEvidenceId]) => [
        promptId,
        Object.freeze({ lessonActionId, lessonEvidenceId }),
      ]),
    ),
  );
}

const FLOAT_BINDINGS = bindings([
  ['float-sink-observation', 'float-sink.answer-observation', 'float-sink-observation-explained'],
  ['float-sink-misconception', 'float-sink.answer-misconception', 'float-sink-misconception-resolved'],
  ['float-sink-transfer', 'float-sink.answer-transfer', 'float-sink-transfer-solved'],
]);

const SOLUBILITY_BINDINGS = bindings([
  ['solubility-observation', 'solubility.answer-observation', 'solubility-observation-explained'],
  ['solubility-misconception', 'solubility.answer-misconception', 'solubility-misconception-resolved'],
  ['solubility-transfer', 'solubility.answer-transfer', 'solubility-transfer-solved'],
]);

const LIPID_BINDINGS = bindings([
  ['lipid-observation', 'lipid.answer-observation', 'lipid-observation-explained'],
  ['lipid-misconception', 'lipid.answer-misconception', 'lipid-misconception-resolved'],
  ['lipid-transfer', 'lipid.answer-transfer', 'lipid-transfer-solved'],
]);

const MINERAL_BINDINGS = bindings([
  ['mineral-observation', 'mineral.answer-observation', 'mineral-observation-explained'],
  ['mineral-misconception', 'mineral.answer-misconception', 'mineral-misconception-resolved'],
  ['mineral-transfer', 'mineral.answer-transfer', 'mineral-transfer-solved'],
]);

const VITAMIN_BINDINGS = bindings([
  ['vitamin-observation', 'vitamin.answer-observation', 'vitamin-observation-explained'],
  ['vitamin-misconception', 'vitamin.answer-misconception', 'vitamin-misconception-resolved'],
  ['vitamin-transfer', 'vitamin.answer-transfer', 'vitamin-transfer-solved'],
]);

const SHAPE_BINDINGS = bindings([
  ['shape-observation', 'shape.answer-observation', 'shape-observation-explained'],
  ['shape-misconception', 'shape.answer-misconception', 'shape-misconception-resolved'],
  ['shape-transfer', 'shape.answer-transfer', 'shape-transfer-solved'],
]);

const floatOrSinkRegistration: InteractiveViewerRegistration<FloatOrSinkState> = {
  definition: FLOAT_OR_SINK,
  assessmentBindings: FLOAT_BINDINGS,
  createSession: () =>
    createInteractiveInvestigationSession({
      experience: FLOAT_OR_SINK.experience,
      assessment: FLOAT_OR_SINK.assessment,
      initialState: initialFloatOrSinkState,
      reducer: reduceFloatOrSink,
      assessmentBindings: { ...FLOAT_BINDINGS },
    }),
  createAdapter: createFloatOrSinkSceneAdapter,
  choices(snapshot) {
    if (snapshot.lesson.stageId === 'predict') {
      return Object.values(FLOAT_OR_SINK_OBJECTS).flatMap(item =>
        snapshot.domain.predictions[item.id]
          ? []
          : (['float', 'sink'] as const).map(prediction =>
              action(
                `${item.id}-${prediction}`,
                `${item.label}: ${prediction}`,
                'float-sink.predict',
                `${item.id}::${prediction}`,
                prediction,
              ),
            ),
      );
    }
    if (snapshot.lesson.stageId === 'observe') {
      return Object.values(FLOAT_OR_SINK_OBJECTS).flatMap(item =>
        snapshot.domain.predictions[item.id] && !snapshot.domain.observations[item.id]
          ? [
              action(
                `release-${item.id}`,
                `Release ${item.label}`,
                'float-sink.test',
                item.id,
              ),
            ]
          : [],
      );
    }
    return [];
  },
};

const solubilityRegistration: InteractiveViewerRegistration<SolubilityInvestigationState> = {
  definition: SOLUBILITY,
  assessmentBindings: SOLUBILITY_BINDINGS,
  createSession: () =>
    createInteractiveInvestigationSession({
      experience: SOLUBILITY.experience,
      assessment: SOLUBILITY.assessment,
      initialState: initialSolubilityInvestigationState,
      reducer: reduceSolubilityInvestigation,
      assessmentBindings: { ...SOLUBILITY_BINDINGS },
    }),
  createAdapter: createSolubilitySceneAdapter,
  choices(snapshot) {
    if (snapshot.lesson.stageId === 'predict') {
      return Object.values(SOLUBILITY_SUBSTANCES).flatMap(item =>
        snapshot.domain.predictions[item.id]
          ? []
          : (['soluble', 'insoluble'] as const).map(prediction =>
              action(
                `${item.id}-${prediction}`,
                `${item.label}: ${prediction}`,
                'solubility.predict',
                `${item.id}::${prediction}`,
                prediction,
              ),
            ),
      );
    }
    if (snapshot.lesson.stageId === 'fair-test') {
      return Object.values(SOLUBILITY_SUBSTANCES).flatMap(item =>
        snapshot.domain.predictions[item.id] && !snapshot.domain.trials[item.id]
          ? [
              action(
                `trial-${item.id}`,
                `Run equal ${item.label} trial`,
                'solubility.run-fair-trial',
                item.id,
              ),
            ]
          : [],
      );
    }
    if (snapshot.lesson.stageId === 'investigate-rate') {
      return (['stirring', 'temperature'] as const).flatMap(comparison =>
        snapshot.domain.rateComparisons[comparison]
          ? []
          : [
              action(
                `compare-${comparison}`,
                `Compare ${comparison}`,
                'solubility.compare-rate',
                comparison,
              ),
            ],
      );
    }
    return [];
  },
};

const lipidRegistration: InteractiveViewerRegistration<LipidTestState> = {
  definition: LIPID_TEST,
  assessmentBindings: LIPID_BINDINGS,
  createSession: () =>
    createInteractiveInvestigationSession({
      experience: LIPID_TEST.experience,
      assessment: LIPID_TEST.assessment,
      initialState: initialLipidTestState,
      reducer: reduceLipidTest,
      assessmentBindings: { ...LIPID_BINDINGS },
    }),
  createAdapter: createLipidTestSceneAdapter,
  choices(snapshot) {
    if (snapshot.lesson.stageId === 'predict') {
      return Object.values(LIPID_SAMPLES).flatMap(sample =>
        snapshot.domain.records[sample.id]?.prediction
          ? []
          : (['present', 'absent'] as const).map(prediction =>
              action(
                `${sample.id}-${prediction}`,
                `${sample.label}: ${prediction}`,
                'lipid.predict',
                `${sample.id}::${prediction}`,
                prediction,
              ),
            ),
      );
    }
    if (snapshot.lesson.stageId === 'procedure') {
      return Object.values(LIPID_SAMPLES).flatMap(sample => {
        const record = snapshot.domain.records[sample.id];
        const next = LIPID_PROCEDURE[record?.completedSteps.length ?? 0];
        return record?.prediction && next
          ? [
              action(
                `${sample.id}-${next}`,
                `${sample.label}: ${next}`,
                'lipid.advance-procedure',
                `${sample.id}::${next}`,
                next,
              ),
            ]
          : [];
      });
    }
    return [];
  },
};

function nutritionChoices(
  cases: readonly NutritionCase[],
  snapshot: { lesson: { stageId: string }; domain: NutritionMatchState },
): InteractiveChoice[] {
  if (snapshot.lesson.stageId !== 'match') return [];
  return cases.flatMap(nutritionCase => {
    if (snapshot.domain.completedIds.includes(nutritionCase.id)) return [];
    const supported = nutritionCase.acceptedSourceIds.map(sourceId =>
      action(
        `${nutritionCase.id}-${sourceId}`,
        `${nutritionCase.label}: ${sourceId} → ${nutritionCase.acceptedRelationId}`,
        'nutrition.submit-match',
        `${nutritionCase.id}::${sourceId}::${nutritionCase.acceptedRelationId}`,
        `${sourceId}::${nutritionCase.acceptedRelationId}`,
      ),
    );
    return [
      ...supported,
      action(
        `${nutritionCase.id}-check-source`,
        `${nutritionCase.label}: test a different source`,
        'nutrition.submit-match',
        `${nutritionCase.id}::unsupported-source::${nutritionCase.acceptedRelationId}`,
        `unsupported-source::${nutritionCase.acceptedRelationId}`,
      ),
      action(
        `${nutritionCase.id}-check-relation`,
        `${nutritionCase.label}: test a different relation`,
        'nutrition.submit-match',
        `${nutritionCase.id}::${nutritionCase.acceptedSourceIds[0]}::unsupported-relation`,
        `${nutritionCase.acceptedSourceIds[0]}::unsupported-relation`,
      ),
    ];
  });
}

function nutritionInitialState(): NutritionMatchState {
  return { completedIds: [], attempts: {} };
}

const mineralRegistration: InteractiveViewerRegistration<NutritionMatchState> = {
  definition: MINERAL_SOURCES,
  assessmentBindings: MINERAL_BINDINGS,
  createSession: () =>
    createInteractiveInvestigationSession({
      experience: MINERAL_SOURCES.experience,
      assessment: MINERAL_SOURCES.assessment,
      initialState: nutritionInitialState(),
      reducer: createNutritionMatchReducer(MINERAL_CASES),
      assessmentBindings: { ...MINERAL_BINDINGS },
    }),
  createAdapter: createMineralSourcesSceneAdapter,
  choices: snapshot => nutritionChoices(MINERAL_CASES, snapshot),
};

const vitaminRegistration: InteractiveViewerRegistration<NutritionMatchState> = {
  definition: VITAMIN_DEFICIENCIES,
  assessmentBindings: VITAMIN_BINDINGS,
  createSession: () =>
    createInteractiveInvestigationSession({
      experience: VITAMIN_DEFICIENCIES.experience,
      assessment: VITAMIN_DEFICIENCIES.assessment,
      initialState: nutritionInitialState(),
      reducer: createNutritionMatchReducer(VITAMIN_CASES),
      assessmentBindings: { ...VITAMIN_BINDINGS },
    }),
  createAdapter: createVitaminDeficienciesSceneAdapter,
  choices: snapshot => nutritionChoices(VITAMIN_CASES, snapshot),
};

const shapeRegistration: InteractiveViewerRegistration<ShapeSortingState> = {
  definition: SHAPE_SORTING,
  assessmentBindings: SHAPE_BINDINGS,
  createSession: () =>
    createInteractiveInvestigationSession({
      experience: SHAPE_SORTING.experience,
      assessment: SHAPE_SORTING.assessment,
      initialState: initialShapeSortingState,
      reducer: reduceShapeSorting,
      assessmentBindings: { ...SHAPE_BINDINGS },
    }),
  createAdapter: createShapeSortingSceneAdapter,
  choices(snapshot) {
    if (snapshot.lesson.stageId !== 'sort') return [];
    return Object.values(SHAPE_ITEMS).flatMap(item =>
      snapshot.domain.assignments[item.id]
        ? []
        : (['sphere', 'cylinder', 'cuboid', 'cone'] as readonly ShapeId[]).map(
            shape =>
              action(
                `${item.id}-${shape}`,
                `${item.label} → ${shape}`,
                'shape.assign',
                `${item.id}::${shape}`,
                shape,
              ),
          ),
    );
  },
};

export const INTERACTIVE_VIEWER_REGISTRATIONS = Object.freeze({
  'interactive-float-or-sink': floatOrSinkRegistration,
  'interactive-solubility': solubilityRegistration,
  'interactive-lipid-test': lipidRegistration,
  'interactive-mineral-sources': mineralRegistration,
  'interactive-vitamin-deficiencies': vitaminRegistration,
  'interactive-shape-sorting': shapeRegistration,
} satisfies Record<string, AnyInteractiveViewerRegistration>);

if (
  new Set(
    Object.values(INTERACTIVE_VIEWER_REGISTRATIONS).map(
      registration => registration.definition.module.id,
    ),
  ).size !== INTERACTIVE_SIMULATIONS.length
) {
  throw new Error('Interactive viewer registrations must cover six unique modules');
}

export function findInteractiveViewerRegistration(
  viewerKey: string,
): AnyInteractiveViewerRegistration | undefined {
  return (
    INTERACTIVE_VIEWER_REGISTRATIONS as Readonly<
      Record<string, AnyInteractiveViewerRegistration | undefined>
    >
  )[viewerKey];
}
