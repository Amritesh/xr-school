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

const slug = 'c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies';

const experience: ExperienceDefinition = {
  id: 'experience-vitamin-deficiencies',
  gradeTone: 'class6To8',
  objective:
    'Match vitamins A, B1, C, and D to representative sources, body roles, and characteristic long-term deficiency conditions.',
  stages: [
    {
      id: 'match',
      title: 'Build four vitamin cases',
      cue: 'Match each vitamin to one source and one characteristic deficiency condition.',
      requiredActionIds: ['nutrition.submit-match'],
      completionEvidenceIds: [
        'vitamin-a-matched',
        'vitamin-b1-matched',
        'vitamin-c-matched',
        'vitamin-d-matched',
      ],
    },
    {
      id: 'observe',
      title: 'Read the symptom evidence',
      cue: 'Identify the case involving bleeding gums and slow wound healing.',
      requiredActionIds: ['vitamin.answer-observation'],
      completionEvidenceIds: ['vitamin-observation-explained'],
    },
    {
      id: 'misconception',
      title: 'Resolve the instant-deficiency idea',
      cue: 'Decide whether missing one serving immediately causes a deficiency disease.',
      requiredActionIds: ['vitamin.answer-misconception'],
      completionEvidenceIds: ['vitamin-misconception-resolved'],
    },
    {
      id: 'transfer',
      title: 'Transfer to a new case',
      cue: 'Choose a source linked to vitamin D for a growing child.',
      requiredActionIds: ['vitamin.answer-transfer'],
      completionEvidenceIds: ['vitamin-transfer-solved'],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: 'assessment-vitamin-deficiencies',
  objectiveId: experience.id,
  prompts: [
    {
      id: 'vitamin-observation',
      kind: 'observation',
      stageId: 'observe',
      question: 'Which deficiency case includes bleeding gums and slow wound healing?',
      options: [
        { id: 'vitamin-c-scurvy', label: 'Vitamin C deficiency and scurvy' },
        { id: 'vitamin-d-rickets', label: 'Vitamin D deficiency and rickets' },
      ],
      acceptedEvidenceIds: ['vitamin-c-scurvy'],
      hint: 'Review the vitamin C case.',
      explanation:
        'Long-term vitamin C deficiency can cause scurvy, including bleeding gums and poor wound healing.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'vitamin-misconception',
      kind: 'misconception',
      stageId: 'misconception',
      question: 'Does missing one serving immediately cause a deficiency disease?',
      options: [
        { id: 'instant-disease', label: 'Yes, immediately' },
        {
          id: 'long-term-lack',
          label: 'No, deficiency disease follows sustained inadequate intake or availability',
        },
      ],
      acceptedEvidenceIds: ['long-term-lack'],
      hint: 'Focus on the phrase long-term deficiency.',
      explanation:
        'Deficiency diseases are associated with sustained inadequate nutrient intake or availability, not one missed serving.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'vitamin-transfer',
      kind: 'transfer',
      stageId: 'transfer',
      question: 'Which is a representative vitamin D source or exposure in this lesson?',
      options: [
        { id: 'safe-sunlight', label: 'Safe sunlight exposure' },
        { id: 'plain-rice', label: 'Plain rice' },
      ],
      acceptedEvidenceIds: ['safe-sunlight'],
      hint: 'Transfer the vitamin D source link.',
      explanation:
        'Safe sunlight exposure supports vitamin D production; food sources can also contribute.',
      retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ['observation', 'misconception', 'transfer'],
    allowHintedMastery: false,
  },
};

export const VITAMIN_DEFICIENCIES: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: 'sim-c06-ch02-a04-the-sources-of-vitamins-and-their-deficiencies',
    slug,
    viewerKey: 'interactive-vitamin-deficiencies',
    legacyAliases: ['components-of-food-vitamins-deficiencies'],
    title: 'Sources of Vitamins and Their Deficiencies',
    summary:
      'Match vitamins A, B1, C, and D to sources and characteristic deficiency evidence.',
    gradeBands: ['class6To8'],
    subjects: ['science', 'biology'],
    curriculumMapIds: ['cm-cbse-c6-ch02-components-of-food'],
    conceptIds: [
      'concept-vitamins',
      'concept-deficiency-diseases',
      'concept-balanced-diet',
    ],
    simulationFormat: 'interactive3d',
    xrFitType: 'strongVrFit',
    xrFitJustification:
      'A spatial case board keeps source, role, and deficiency evidence visible together while allowing repeated classification.',
    learningObjective: experience.objective,
    scientificConceptExplanation:
      'Vitamins support different functions; sustained deficiency can cause characteristic conditions such as night blindness, beriberi, scurvy, or rickets.',
    misconceptionsAddressed: [
      'All vitamins have the same role.',
      'One missed serving immediately causes disease.',
      'Sunlight is a vitamin food.',
    ],
    visualizationStrategy:
      'Use source tokens, body-role panels, symptom evidence cards, and explicit long-term deficiency labels.',
    interactionStrategy:
      'Learners submit a source and deficiency match for all four vitamins, then solve evidence and transfer questions.',
    imaginationHelperStrategy:
      'Body highlights show the affected function without depicting a diagnosis or guaranteeing a single cause.',
    practicalUseCase:
      'Supports balanced-diet reasoning and recognition of textbook deficiency examples.',
    cueCardIds: experience.stages.map(stage => `cue-${stage.id}`),
    revisionCardIds: ['rev-vitamins-new-case'],
    assessmentHookIds: assessment.prompts.map(prompt => prompt.id),
    instructorScript:
      'Require all four matches, distinguish sources from body production, and explain that symptoms need professional assessment and can have multiple causes.',
    batchActivityPrompt:
      'Complete a vitamin-source-role-deficiency table, then mark which claims describe long-term deficiency rather than instant effects.',
    expectedDurationMinutes: 10,
    maxSessionDurationMinutes: 12,
    comfortRiskLevel: 'low',
    safetyNotes: [
      'Use stationary case-board mode.',
      'The activity is educational and must not be used for diagnosis or supplement dosing.',
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
      id: 'vitamin-match',
      stageId: 'match',
      text: 'Match vitamins A, B one, C, and D to a representative source and characteristic long-term deficiency condition.',
      caption: '',
    },
    {
      id: 'vitamin-observe',
      stageId: 'observe',
      text: 'Use symptom evidence to identify the case involving bleeding gums and slow wound healing.',
      caption: '',
    },
    {
      id: 'vitamin-misconception',
      stageId: 'misconception',
      text: 'A deficiency disease does not appear after one missed serving. The lesson concerns sustained inadequate intake or availability.',
      caption: '',
    },
    {
      id: 'vitamin-transfer',
      stageId: 'transfer',
      text: 'Apply the vitamin D source link to a new growing-child case without turning the lesson into medical advice.',
      caption: '',
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: 'apps/web/public/environments/nutrition-lab-360.png',
    sourceSha256:
      'e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee',
  }),
  legacyPaths: ['/simulations/components-of-food-vitamins-deficiencies'],
  contribution: {
    source: 'pr-8',
    contributor: PR8_CONTRIBUTOR,
    sourcePath: 'apps/web/components/simulations/VitaminDeficiencyViewer.tsx',
  },
};
