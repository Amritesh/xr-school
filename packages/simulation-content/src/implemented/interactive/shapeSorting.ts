import type {
  AssessmentSequence,
  ExperienceDefinition,
  ImplementedSimulationDefinition,
} from '@xr-school/simulation-schema';
import {
  captionedNarration,
  contributedEnvironmentAssets,
  PR8_CONTRIBUTOR,
  releasedInteractiveModule,
} from './shared.js';

const slug = 'c6-ch04-a01-sorting-materials-according-to-their-shape';

const experience: ExperienceDefinition = {
  id: 'experience-shape-sorting',
  gradeTone: 'class6To8',
  objective:
    'Classify everyday objects by observable three-dimensional shape and explain why material does not determine shape group.',
  stages: [
    {
      id: 'sort',
      title: 'Sort eight objects',
      cue: 'Inspect faces, curved surfaces, edges, and points before placing each object.',
      requiredActionIds: ['shape.assign'],
      completionEvidenceIds: [
        'shape-ball-sphere',
        'shape-orange-sphere',
        'shape-can-cylinder',
        'shape-chalk-cylinder',
        'shape-book-cuboid',
        'shape-block-cuboid',
        'shape-party-hat-cone',
        'shape-traffic-cone-cone',
      ],
    },
    {
      id: 'observe',
      title: 'Compare object features',
      cue: 'Identify the feature shared by the tin can and chalk.',
      requiredActionIds: ['shape.answer-observation'],
      completionEvidenceIds: ['shape-observation-explained'],
    },
    {
      id: 'misconception',
      title: 'Separate shape from material',
      cue: 'Decide whether two objects made from different materials can share a shape.',
      requiredActionIds: ['shape.answer-misconception'],
      completionEvidenceIds: ['shape-misconception-resolved'],
    },
    {
      id: 'transfer',
      title: 'Sort a new object',
      cue: 'Classify a dice using observable faces, edges, and corners.',
      requiredActionIds: ['shape.answer-transfer'],
      completionEvidenceIds: ['shape-transfer-solved'],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: 'assessment-shape-sorting',
  objectiveId: experience.id,
  prompts: [
    {
      id: 'shape-observation',
      kind: 'observation',
      stageId: 'observe',
      question:
        'What feature makes both a tin can and a straight piece of chalk cylindrical?',
      options: [
        {
          id: 'two-circular-curved',
          label: 'Two circular ends joined by a curved surface',
        },
        { id: 'same-material', label: 'They are made from the same material' },
      ],
      acceptedEvidenceIds: ['two-circular-curved'],
      hint: 'Inspect faces and surfaces, not material.',
      explanation:
        'Both have two circular ends and one curved surface, despite different materials.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'shape-misconception',
      kind: 'misconception',
      stageId: 'misconception',
      question: 'Can different materials belong to the same shape group?',
      options: [
        { id: 'material-decides', label: 'No, material decides shape group' },
        {
          id: 'features-decide',
          label: 'Yes, observable geometric features decide the group',
        },
      ],
      acceptedEvidenceIds: ['features-decide'],
      hint: 'Compare the rubber ball with the orange.',
      explanation:
        'The rubber ball and orange are both approximately spherical although their materials differ.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'shape-transfer',
      kind: 'transfer',
      stageId: 'transfer',
      question: 'A dice has six flat square faces. Which group fits best?',
      options: [
        { id: 'cuboid', label: 'Cuboid' },
        { id: 'sphere', label: 'Sphere' },
      ],
      acceptedEvidenceIds: ['cuboid'],
      hint: 'Count flat faces and corners.',
      explanation: 'A cube is a special cuboid with six square faces.',
      retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ['observation', 'misconception', 'transfer'],
    allowHintedMastery: false,
  },
};

export const SHAPE_SORTING: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: 'sim-c06-ch04-a01-sorting-materials-according-to-their-shape',
    slug,
    viewerKey: 'interactive-shape-sorting',
    legacyAliases: ['sorting-materials-by-shape'],
    title: 'Sorting Materials According to Their Shape',
    summary:
      'Inspect and sort eight familiar objects as spheres, cylinders, cuboids, or cones.',
    gradeBands: ['class6To8'],
    subjects: ['science'],
    curriculumMapIds: ['cm-cbse-c6-ch04-sorting-materials'],
    conceptIds: [
      'concept-material-properties',
      'concept-three-dimensional-shapes',
      'concept-classification',
    ],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification:
      'Learners can rotate objects, inspect surfaces, and place them spatially by observable shape rather than memorizing names from flat pictures.',
    learningObjective: experience.objective,
    scientificConceptExplanation:
      'Classification uses a stated observable property. Shape groups depend on faces, curved surfaces, edges, and vertices; material is a separate property.',
    misconceptionsAddressed: [
      'Material determines shape group.',
      'Every round-looking object is a sphere.',
      'A cube is not a kind of cuboid.',
    ],
    visualizationStrategy:
      'Use rotatable objects, feature highlights, labelled bins, and persistent correct placements.',
    interactionStrategy:
      'Learners choose a bin; wrong choices retain the object and reveal a feature clue without selecting the correct bin.',
    imaginationHelperStrategy:
      'Feature outlines highlight faces and curved surfaces while preserving the familiar object form.',
    practicalUseCase:
      'Connects package shapes, cans, balls, books, chalk, and road-safety objects to classification.',
    cueCardIds: experience.stages.map(stage => `cue-${stage.id}`),
    revisionCardIds: ['rev-shape-dice-transfer'],
    assessmentHookIds: assessment.prompts.map(prompt => prompt.id),
    instructorScript:
      'Ask learners to name the observed feature before each placement. During debrief compare pairs with the same shape but different materials.',
    batchActivityPrompt:
      'Sort eight classroom objects by shape and write one feature that supports each category.',
    expectedDurationMinutes: 9,
    maxSessionDurationMinutes: 11,
    comfortRiskLevel: 'low',
    safetyNotes: [
      'Use stationary sorting-table mode.',
      'Keep all targets within seated reach and provide keyboard-equivalent placement.',
    ],
    offlineContentPackId: 'pack-science-sorting-materials-class6-v1',
    estimatedPackageSizeMb: 140,
    stages: experience.stages.length,
  }),
  kind: 'interactive',
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: 'shape-sort',
      stageId: 'sort',
      text: 'Inspect faces, curved surfaces, edges, and points, then place each object in a shape group.',
      caption: '',
    },
    {
      id: 'shape-observe',
      stageId: 'observe',
      text: 'Compare the tin can and chalk. Their materials differ, but both have two circular ends joined by a curved surface.',
      caption: '',
    },
    {
      id: 'shape-misconception',
      stageId: 'misconception',
      text: 'Material and shape are different properties. Different materials can share the same shape.',
      caption: '',
    },
    {
      id: 'shape-transfer',
      stageId: 'transfer',
      text: 'Apply face, edge, and corner evidence to classify a dice.',
      caption: '',
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: 'apps/web/public/environments/materials-classroom-360.png',
    sourceSha256:
      'd3620b5d71eaac1b41343c004fbb8705838cca1965e3562fc1605be6625ba53c',
  }),
  legacyPaths: ['/simulations/sorting-materials-by-shape'],
  contribution: {
    source: 'pr-8',
    contributor: PR8_CONTRIBUTOR,
    sourcePath: 'apps/web/components/simulations/ShapeSortingViewer.tsx',
  },
};
