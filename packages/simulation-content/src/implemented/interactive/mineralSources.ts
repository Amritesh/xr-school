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

const slug = 'c6-ch02-a05-the-sources-of-minerals-in-food';

const experience: ExperienceDefinition = {
  id: 'experience-mineral-sources',
  gradeTone: 'class6To8',
  objective:
    'Match calcium, iodine, and iron to representative sources and evidence-based body functions.',
  stages: [
    {
      id: 'match',
      title: 'Build three mineral links',
      cue: 'Match each mineral to one source and its body function.',
      requiredActionIds: ['nutrition.submit-match'],
      completionEvidenceIds: [
        'mineral-calcium-matched',
        'mineral-iodine-matched',
        'mineral-iron-matched',
      ],
    },
    {
      id: 'observe',
      title: 'Read the body evidence',
      cue: 'Identify the mineral whose body job involves haemoglobin and oxygen transport.',
      requiredActionIds: ['mineral.answer-observation'],
      completionEvidenceIds: ['mineral-observation-explained'],
    },
    {
      id: 'misconception',
      title: 'Resolve the single-food idea',
      cue: 'Decide whether one food supplies every needed mineral.',
      requiredActionIds: ['mineral.answer-misconception'],
      completionEvidenceIds: ['mineral-misconception-resolved'],
    },
    {
      id: 'transfer',
      title: 'Transfer to a meal',
      cue: 'Choose a meal change that adds an iron source.',
      requiredActionIds: ['mineral.answer-transfer'],
      completionEvidenceIds: ['mineral-transfer-solved'],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: 'assessment-mineral-sources',
  objectiveId: experience.id,
  prompts: [
    {
      id: 'mineral-observation',
      kind: 'observation',
      stageId: 'observe',
      question: 'Which mineral supports haemoglobin and oxygen transport?',
      options: [
        { id: 'iron', label: 'Iron' },
        { id: 'calcium', label: 'Calcium' },
      ],
      acceptedEvidenceIds: ['iron'],
      hint: 'Use the red-blood-cell link.',
      explanation:
        'Iron is needed to make haemoglobin, which carries oxygen in blood.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'mineral-misconception',
      kind: 'misconception',
      stageId: 'misconception',
      question: 'Can one representative source supply every mineral the body needs?',
      options: [
        { id: 'one-source-enough', label: 'Yes, one source is enough' },
        {
          id: 'varied-diet',
          label: 'No, a varied diet supplies different minerals',
        },
      ],
      acceptedEvidenceIds: ['varied-diet'],
      hint: 'Compare the calcium, iodine, and iron source sets.',
      explanation:
        'Different foods contribute different minerals, so variety matters.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'mineral-transfer',
      kind: 'transfer',
      stageId: 'transfer',
      question: 'Which addition supplies a representative plant source of iron?',
      options: [
        { id: 'leafy-greens', label: 'Green leafy vegetables' },
        { id: 'plain-sugar', label: 'Plain sugar' },
      ],
      acceptedEvidenceIds: ['leafy-greens'],
      hint: 'Transfer the iron-source match.',
      explanation:
        'Green leafy vegetables are a representative iron source in this lesson.',
      retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ['observation', 'misconception', 'transfer'],
    allowHintedMastery: false,
  },
};

export const MINERAL_SOURCES: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: 'sim-c06-ch02-a05-the-sources-of-minerals-in-food',
    slug,
    viewerKey: 'interactive-mineral-sources',
    legacyAliases: ['components-of-food-mineral-sources'],
    title: 'The Sources of Minerals in Food',
    summary:
      'Link calcium, iodine, and iron to representative sources and distinct body functions.',
    gradeBands: ['class6To8'],
    subjects: ['science', 'biology'],
    curriculumMapIds: ['cm-cbse-c6-ch02-components-of-food'],
    conceptIds: ['concept-minerals', 'concept-balanced-diet', 'concept-haemoglobin'],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification:
      'A spatial link board makes source-to-function relationships inspectable and lets learners revise incorrect links without being shown the answer.',
    learningObjective: experience.objective,
    scientificConceptExplanation:
      'Calcium supports bones and teeth, iodine supports thyroid function and growth, and iron supports haemoglobin and oxygen transport. Each has multiple dietary sources.',
    misconceptionsAddressed: [
      'All minerals do the same job.',
      'One food supplies every mineral.',
      'Minerals are needed only for bones.',
    ],
    visualizationStrategy:
      'Use three mineral nodes, food-source tokens, body-system targets, and visible connection lines.',
    interactionStrategy:
      'Learners submit both a source and a body function; a case completes only when both links are correct.',
    imaginationHelperStrategy:
      'Body targets highlight the organ or system role while avoiding literal claims that minerals travel as glowing crystals.',
    practicalUseCase:
      'Supports meal planning and interpretation of iodized salt, dairy, pulses, greens, and other source examples.',
    cueCardIds: experience.stages.map(stage => `cue-${stage.id}`),
    revisionCardIds: ['rev-minerals-balanced-meal'],
    assessmentHookIds: assessment.prompts.map(prompt => prompt.id),
    instructorScript:
      'Require both links for each mineral and ask learners to name a second source during debrief. State that examples are representative, not exhaustive.',
    batchActivityPrompt:
      'Draw three source-to-mineral-to-body-function chains and add one different source to each.',
    expectedDurationMinutes: 10,
    maxSessionDurationMinutes: 12,
    comfortRiskLevel: 'low',
    safetyNotes: [
      'Use stationary discovery-wall mode.',
      'Do not turn nutrient information into diagnosis or supplement advice.',
    ],
    offlineContentPackId: 'pack-science-components-food-class6-v1',
    estimatedPackageSizeMb: 250,
    stages: experience.stages.length,
  }),
  kind: 'interactive',
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: 'mineral-match',
      stageId: 'match',
      text: 'Match calcium, iodine, and iron to one representative source and the correct body function.',
      caption: '',
    },
    {
      id: 'mineral-observe',
      stageId: 'observe',
      text: 'Use the completed links to identify the mineral needed for haemoglobin and oxygen transport.',
      caption: '',
    },
    {
      id: 'mineral-misconception',
      stageId: 'misconception',
      text: 'No single source supplies every mineral in the required pattern. A varied diet matters.',
      caption: '',
    },
    {
      id: 'mineral-transfer',
      stageId: 'transfer',
      text: 'Apply the source evidence to improve a new meal with a representative iron source.',
      caption: '',
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: 'apps/web/public/environments/nutrition-lab-360.png',
    sourceSha256:
      'e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee',
  }),
  legacyPaths: ['/simulations/components-of-food-mineral-sources'],
  contribution: {
    source: 'pr-8',
    contributor: PR8_CONTRIBUTOR,
    sourcePath: 'apps/web/components/simulations/MineralSourcesViewer.tsx',
  },
};
