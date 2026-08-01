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

const slug = 'c5-ch07-a03-soluble-and-insoluble-substances';

const experience: ExperienceDefinition = {
  id: 'experience-solubility-physics-lab',
  gradeTone: 'class3To5',
  objective:
    'Use a fair test and measured evidence to distinguish solutions, suspensions, sediments, floating solids, and immiscible layers.',
  stages: [
    {
      id: 'predict',
      title: 'Predict six substances',
      cue: 'Classify salt, sugar, sand, chalk, oil, and sawdust before mixing.',
      requiredActionIds: ['solubility.predict'],
      completionEvidenceIds: [
        'prediction-salt',
        'prediction-sugar',
        'prediction-sand',
        'prediction-chalk',
        'prediction-oil',
        'prediction-sawdust',
      ],
    },
    {
      id: 'fair-test',
      title: 'Run equal trials',
      cue: 'Use 200 g water, a 5 g sample, equal stirring, and equal settling time.',
      requiredActionIds: ['solubility.run-fair-trial'],
      completionEvidenceIds: [
        'trial-salt-solution',
        'trial-sugar-solution',
        'trial-sand-sediment',
        'trial-chalk-suspension',
        'trial-oil-separated-layer',
        'trial-sawdust-floating-solid',
      ],
    },
    {
      id: 'investigate-rate',
      title: 'Change one variable',
      cue: 'Compare sugar with and without stirring, then compare equal samples at two temperatures.',
      requiredActionIds: [
        'solubility.compare-rate',
        'solubility.answer-observation',
      ],
      completionEvidenceIds: [
        'stirring-rate-compared',
        'temperature-rate-compared',
        'solubility-observation-explained',
      ],
    },
    {
      id: 'misconception',
      title: 'Resolve disappearing matter',
      cue: 'Explain whether dissolved salt is still present.',
      requiredActionIds: ['solubility.answer-misconception'],
      completionEvidenceIds: ['solubility-misconception-resolved'],
    },
    {
      id: 'transfer',
      title: 'Classify an unknown',
      cue: 'Use clouding and settling evidence to classify flour in water.',
      requiredActionIds: ['solubility.answer-transfer'],
      completionEvidenceIds: ['solubility-transfer-solved'],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: 'assessment-solubility',
  objectiveId: experience.id,
  prompts: [
    {
      id: 'solubility-observation',
      kind: 'observation',
      stageId: 'investigate-rate',
      question: 'What did stirring change for sugar?',
      options: [
        {
          id: 'rate-not-capacity',
          label: 'It increased the dissolving rate, not equilibrium capacity',
        },
        { id: 'created-more-sugar', label: 'It created more sugar' },
      ],
      acceptedEvidenceIds: ['rate-not-capacity'],
      hint: 'Compare equal water, mass, and temperature.',
      explanation:
        'Stirring exposes fresh liquid to the solid and changes rate; it does not create matter or change the fixed-temperature capacity.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'solubility-misconception',
      kind: 'misconception',
      stageId: 'misconception',
      question: 'Salt grains are no longer visible. What happened?',
      options: [
        { id: 'salt-vanished', label: 'The salt vanished' },
        {
          id: 'salt-dispersed',
          label: 'Salt particles remain dispersed through the solution',
        },
      ],
      acceptedEvidenceIds: ['salt-dispersed'],
      hint: 'Use the mass balance and molecular lens.',
      explanation:
        'Dissolved matter remains present even when individual grains cannot be seen.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'solubility-transfer',
      kind: 'transfer',
      stageId: 'transfer',
      question: 'Flour makes water cloudy and slowly settles. How should it be classified?',
      options: [
        { id: 'clear-solution', label: 'A clear solution' },
        {
          id: 'insoluble-suspension',
          label: 'An insoluble suspension that can settle',
        },
      ],
      acceptedEvidenceIds: ['insoluble-suspension'],
      hint: 'Visible particles and settling are not solution evidence.',
      explanation:
        'Clouding followed by settling is evidence of an insoluble suspension.',
      retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ['observation', 'misconception', 'transfer'],
    allowHintedMastery: false,
  },
};

export const SOLUBILITY: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: 'sim-c05-ch07-a03-soluble-and-insoluble-substances',
    slug,
    viewerKey: 'interactive-solubility',
    legacyAliases: ['experiments-with-water-soluble-insoluble'],
    title: 'Soluble and Insoluble Substances Lab',
    summary:
      'Run equal water-mixing trials and observe dissolving, suspension, settling, floating particles, and separated oil.',
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience', 'science'],
    curriculumMapIds: ['cm-cbse-c5-ch07-water-experiments'],
    conceptIds: [
      'concept-solubility',
      'concept-solution',
      'concept-mixture-observation',
    ],
    simulationFormat: 'practicalLabSimulation',
    xrFitType: 'strongVrFit',
    xrFitJustification:
      'A resettable bench makes equal trials repeatable and exposes particle, mass-balance, and phase evidence that is hard to inspect in one classroom demonstration.',
    learningObjective: experience.objective,
    scientificConceptExplanation:
      'Soluble particles disperse uniformly up to a temperature-dependent capacity. Insoluble solids may settle, remain suspended, or float; immiscible oil forms a separate layer.',
    misconceptionsAddressed: [
      'Dissolving means disappearing.',
      'Every powder dissolves.',
      'Floating and dissolving are the same.',
    ],
    visualizationStrategy:
      'Use measured mass readouts, turbidity, sediment, floating sawdust, oil layers, and an illustrative molecular lens.',
    interactionStrategy:
      'Learners predict, use equal samples, stir for equal time, wait, compare one changed variable, and classify an unknown.',
    imaginationHelperStrategy:
      'The molecular lens enlarges representative particles and explicitly states that it is not to scale.',
    practicalUseCase:
      'Connects cooking, washing, muddy water, filtration, and separating mixtures.',
    cueCardIds: experience.stages.map(stage => `cue-${stage.id}`),
    revisionCardIds: ['rev-solubility-fair-test'],
    assessmentHookIds: assessment.prompts.map(prompt => prompt.id),
    instructorScript:
      'Collect predictions for six substances. Require equal water, sample, stirring, and waiting conditions. Debrief the different insoluble behaviours and conserved dissolved mass.',
    batchActivityPrompt:
      'Complete a predict-observe-explain table and identify which variable must stay fixed in a fair comparison.',
    expectedDurationMinutes: 8,
    maxSessionDurationMinutes: 10,
    comfortRiskLevel: 'low',
    safetyNotes: [
      'Use stationary lab mode.',
      'Only teacher-approved materials belong in a real water experiment.',
    ],
    offlineContentPackId: 'pack-evs-water-experiments-class5-v1',
    estimatedPackageSizeMb: 135,
    stages: experience.stages.length,
  }),
  kind: 'interactive',
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: 'solubility-predict',
      stageId: 'predict',
      text: 'Predict soluble or insoluble for salt, sugar, sand, chalk, oil, and sawdust before mixing.',
      caption: '',
    },
    {
      id: 'solubility-fair-test',
      stageId: 'fair-test',
      text: 'Keep water, sample mass, stirring time, and waiting time equal so the comparison is fair.',
      caption: '',
    },
    {
      id: 'solubility-rate',
      stageId: 'investigate-rate',
      text: 'Change one variable. Stirring changes rate; warmer water can change both rate and capacity for sugar.',
      caption: '',
    },
    {
      id: 'solubility-misconception',
      stageId: 'misconception',
      text: 'Dissolved salt remains in the water. The mass balance and molecular lens show that it did not vanish.',
      caption: '',
    },
    {
      id: 'solubility-transfer',
      stageId: 'transfer',
      text: 'Use visible particles, clouding, settling, floating, or layering to classify a new mixture.',
      caption: '',
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: 'apps/web/public/environments/float-sink-school-lab-360.png',
    sourceSha256:
      '3d6dab260c2695634e6160ce91724f91dbd8fe22e184786f60a247b4561ea92d',
  }),
  legacyPaths: ['/simulations/experiments-with-water-soluble-insoluble'],
  contribution: {
    source: 'pr-8',
    contributor: PR8_CONTRIBUTOR,
    sourcePath: 'apps/web/components/simulations/SolubleInsolubleViewer.tsx',
  },
};
