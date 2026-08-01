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

const slug = 'c5-ch07-a01-a-concept-about-what-floats-what-sinks';

const experience: ExperienceDefinition = {
  id: 'experience-float-or-sink',
  gradeTone: 'class3To5',
  objective:
    'Predict, test, and explain floating using material, shape, trapped air, weight, and displaced water.',
  stages: [
    {
      id: 'predict',
      title: 'Predict six objects',
      cue: 'Predict before each object touches the water.',
      requiredActionIds: ['float-sink.predict'],
      completionEvidenceIds: [
        'prediction-leaf-recorded',
        'prediction-stone-recorded',
        'prediction-cork-recorded',
        'prediction-spoon-recorded',
        'prediction-bottle-recorded',
        'prediction-marble-recorded',
      ],
    },
    {
      id: 'observe',
      title: 'Test in water',
      cue: 'Release each object and observe its final position before classifying it.',
      requiredActionIds: ['float-sink.test'],
      completionEvidenceIds: [
        'observation-leaf-float',
        'observation-stone-sink',
        'observation-cork-float',
        'observation-spoon-sink',
        'observation-bottle-float',
        'observation-marble-sink',
      ],
    },
    {
      id: 'explain',
      title: 'Read the evidence',
      cue: 'Choose the observation pair that proves size alone cannot decide.',
      requiredActionIds: ['float-sink.answer-observation'],
      completionEvidenceIds: ['float-sink-observation-explained'],
    },
    {
      id: 'misconception',
      title: 'Resolve the size rule',
      cue: 'Decide whether every large object floats and every small object sinks.',
      requiredActionIds: ['float-sink.answer-misconception'],
      completionEvidenceIds: ['float-sink-misconception-resolved'],
    },
    {
      id: 'transfer',
      title: 'Transfer to a foil boat',
      cue: 'Apply displacement and trapped-air evidence to the same foil in a new shape.',
      requiredActionIds: ['float-sink.answer-transfer'],
      completionEvidenceIds: ['float-sink-transfer-solved'],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: 'assessment-float-or-sink',
  objectiveId: experience.id,
  prompts: [
    {
      id: 'float-sink-observation',
      kind: 'observation',
      stageId: 'explain',
      question: 'Which pair best shows that size alone does not decide floating?',
      options: [
        {
          id: 'bottle-floats-marble-sinks',
          label: 'The large empty bottle floats while the small marble sinks',
        },
        { id: 'leaf-and-cork-float', label: 'The leaf and cork both float' },
      ],
      acceptedEvidenceIds: ['bottle-floats-marble-sinks'],
      hint: 'Compare one large object with one small object.',
      explanation:
        'The large bottle floats because trapped air lowers average density; the small glass marble sinks.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'float-sink-misconception',
      kind: 'misconception',
      stageId: 'misconception',
      question: 'Is “large floats and small sinks” a reliable rule?',
      options: [
        { id: 'size-decides', label: 'Yes, size decides' },
        {
          id: 'balance-decides',
          label: 'No, weight and displaced-water support must balance',
        },
      ],
      acceptedEvidenceIds: ['balance-decides'],
      hint: 'Use the bottle and marble evidence.',
      explanation:
        'Material, shape, trapped air, weight, and displaced volume determine the balance.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'float-sink-transfer',
      kind: 'transfer',
      stageId: 'transfer',
      question: 'The same sheet of foil sinks as a tight ball. What can make it float?',
      options: [
        { id: 'paint-it-blue', label: 'Paint it blue' },
        {
          id: 'shape-wide-boat',
          label: 'Shape it into a wide boat that displaces more water',
        },
      ],
      acceptedEvidenceIds: ['shape-wide-boat'],
      hint: 'Change displaced volume without changing foil mass.',
      explanation:
        'A wide boat shape displaces enough water for buoyant support to balance its weight.',
      retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ['observation', 'misconception', 'transfer'],
    allowHintedMastery: false,
  },
};

export const FLOAT_OR_SINK: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: 'sim-c05-ch07-a01-a-concept-about-what-floats-what-sinks',
    slug,
    viewerKey: 'interactive-float-or-sink',
    legacyAliases: ['experiments-with-water-float-or-sink'],
    title: 'What Floats, What Sinks?',
    summary:
      'Predict and test six familiar objects, then explain floating through weight, displaced water, shape, material, and trapped air.',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience', 'science'],
    curriculumMapIds: ['cm-cbse-c5-ch07-water-experiments'],
    conceptIds: ['concept-buoyancy', 'concept-density', 'concept-displacement'],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification:
      'A resettable transparent tank makes the complete motion and displaced-water relationship visible from multiple viewpoints.',
    learningObjective: experience.objective,
    scientificConceptExplanation:
      'An object floats when the upward buoyant force from displaced water can balance its weight before it is fully submerged. Average density, shape, and trapped air change that balance.',
    misconceptionsAddressed: [
      'Large objects always float.',
      'Small objects always sink.',
      'Only weight matters; shape and trapped air do not.',
    ],
    visualizationStrategy:
      'Use a transparent tank, waterline, force arrows, ripples, and final-position markers.',
    interactionStrategy:
      'Learners select an object, record a prediction, release it, and cite the observed final position.',
    imaginationHelperStrategy:
      'Visible force arrows represent weight and buoyant support; arrows are illustrative and not to scale.',
    practicalUseCase:
      'Connects boats, life jackets, bottles, stones, and household water observations.',
    cueCardIds: experience.stages.map(stage => `cue-${stage.id}`),
    revisionCardIds: ['rev-float-sink-foil-boat'],
    assessmentHookIds: assessment.prompts.map(prompt => prompt.id),
    instructorScript:
      'Collect six predictions before launch. Require the learner to release every object and name its final position, then debrief the bottle-versus-marble comparison and foil-boat transfer.',
    batchActivityPrompt:
      'Record object, prediction, final position, and one explanation clue for all six trials.',
    expectedDurationMinutes: 8,
    maxSessionDurationMinutes: 10,
    comfortRiskLevel: 'low',
    safetyNotes: [
      'Use stationary tank mode.',
      'Force arrows are explanatory representations, not measured to scale.',
    ],
    offlineContentPackId: 'pack-evs-water-experiments-class5-v1',
    estimatedPackageSizeMb: 150,
    stages: experience.stages.length,
  }),
  kind: 'interactive',
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: 'float-sink-predict',
      stageId: 'predict',
      text: 'Predict whether each object will float or sink before releasing it. Size alone is not a rule.',
      caption: '',
    },
    {
      id: 'float-sink-observe',
      stageId: 'observe',
      text: 'Release each object and wait for its final position. Watch the surface, middle, and bottom.',
      caption: '',
    },
    {
      id: 'float-sink-explain',
      stageId: 'explain',
      text: 'Compare the large empty bottle with the small glass marble. Which observation challenges the size rule?',
      caption: '',
    },
    {
      id: 'float-sink-misconception',
      stageId: 'misconception',
      text: 'Floating depends on the balance between weight and support from displaced water, not size alone.',
      caption: '',
    },
    {
      id: 'float-sink-transfer',
      stageId: 'transfer',
      text: 'Apply the evidence to foil. A wide boat shape can displace more water than the same foil pressed into a ball.',
      caption: '',
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: 'apps/web/public/environments/float-sink-school-lab-360.png',
    sourceSha256:
      '3d6dab260c2695634e6160ce91724f91dbd8fe22e184786f60a247b4561ea92d',
  }),
  legacyPaths: ['/simulations/experiments-with-water-float-or-sink'],
  contribution: {
    source: 'pr-8',
    contributor: PR8_CONTRIBUTOR,
    sourcePath: 'apps/web/components/simulations/FloatOrSinkViewer.tsx',
  },
};
