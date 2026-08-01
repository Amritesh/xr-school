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

const slug = 'c6-ch02-a03-test-the-presence-of-lipids';

const experience: ExperienceDefinition = {
  id: 'experience-lipid-paper-test',
  gradeTone: 'class6To8',
  objective:
    'Perform a fair paper test and use a persistent translucent patch as evidence for lipids.',
  stages: [
    {
      id: 'predict',
      title: 'Predict the samples',
      cue: 'Predict which samples will leave a lasting translucent patch.',
      requiredActionIds: ['lipid.predict'],
      completionEvidenceIds: [
        'prediction-peanut',
        'prediction-coconut',
        'prediction-rice',
      ],
    },
    {
      id: 'procedure',
      title: 'Run the paper test',
      cue: 'Place, fold, crush, remove, dry, and hold each paper against light in that order.',
      requiredActionIds: ['lipid.advance-procedure'],
      completionEvidenceIds: [
        'procedure-peanut-complete',
        'procedure-coconut-complete',
        'procedure-rice-complete',
      ],
    },
    {
      id: 'observe',
      title: 'Compare dry papers',
      cue: 'Identify the samples whose translucent patches persist after drying.',
      requiredActionIds: ['lipid.answer-observation'],
      completionEvidenceIds: ['lipid-observation-explained'],
    },
    {
      id: 'misconception',
      title: 'Separate water from lipid evidence',
      cue: 'Decide why drying is essential before reading the paper.',
      requiredActionIds: ['lipid.answer-misconception'],
      completionEvidenceIds: ['lipid-misconception-resolved'],
    },
    {
      id: 'transfer',
      title: 'Predict sesame seed evidence',
      cue: 'Apply the procedure to an untested oil-rich seed.',
      requiredActionIds: ['lipid.answer-transfer'],
      completionEvidenceIds: ['lipid-transfer-solved'],
    },
  ],
};

const assessment: AssessmentSequence = {
  id: 'assessment-lipid-paper-test',
  objectiveId: experience.id,
  prompts: [
    {
      id: 'lipid-observation',
      kind: 'observation',
      stageId: 'observe',
      question: 'Which dry papers provide positive lipid evidence?',
      options: [
        { id: 'peanut-coconut', label: 'Peanut and dry coconut' },
        { id: 'rice-only', label: 'Rice only' },
      ],
      acceptedEvidenceIds: ['peanut-coconut'],
      hint: 'Look for a patch that remains translucent after drying.',
      explanation:
        'Peanut and dry coconut leave persistent translucent patches; rice leaves little or no lasting patch.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'lipid-misconception',
      kind: 'misconception',
      stageId: 'misconception',
      question: 'Why must the paper dry before the result is read?',
      options: [
        { id: 'all-wet-marks-prove-fat', label: 'Every wet mark proves lipid' },
        {
          id: 'water-fades-lipid-persists',
          label: 'A water mark fades while a lipid patch persists',
        },
      ],
      acceptedEvidenceIds: ['water-fades-lipid-persists'],
      hint: 'Compare the mark before and after drying.',
      explanation:
        'Drying removes transient moisture evidence; a lasting translucent patch supports the lipid conclusion.',
      retryPolicy: 'immediateWithHint',
    },
    {
      id: 'lipid-transfer',
      kind: 'transfer',
      stageId: 'transfer',
      question:
        'What result should oil-rich sesame seeds produce after the same complete paper test?',
      options: [
        { id: 'persistent-patch', label: 'A persistent translucent patch' },
        { id: 'blue-paper', label: 'The paper turns blue' },
      ],
      acceptedEvidenceIds: ['persistent-patch'],
      hint: 'Transfer the evidence pattern from peanut and coconut.',
      explanation:
        'Oil-rich seeds should leave a persistent translucent patch when the same fair procedure is followed.',
      retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ['observation', 'misconception', 'transfer'],
    allowHintedMastery: false,
  },
};

export const LIPID_TEST: ImplementedSimulationDefinition = {
  module: releasedInteractiveModule({
    id: 'sim-c06-ch02-a03-test-the-presence-of-lipids',
    slug,
    viewerKey: 'interactive-lipid-test',
    legacyAliases: ['components-of-food-lipid-test'],
    title: 'Test the Presence of Lipids',
    summary:
      'Crush peanut, dry coconut, and rice on clean paper, dry each sheet, and compare persistent translucent patches.',
    gradeBands: ['class6To8'],
    subjects: ['science', 'biology'],
    curriculumMapIds: ['cm-cbse-c6-ch02-components-of-food'],
    conceptIds: ['concept-lipids', 'concept-food-tests', 'concept-fair-comparison'],
    simulationFormat: 'practicalLabSimulation',
    xrFitType: 'strongVrFit',
    xrFitJustification:
      'The virtual bench makes the complete comparison repeatable, keeps paper state visible, and supports side-by-side evidence inspection.',
    learningObjective: experience.objective,
    scientificConceptExplanation:
      'Lipids soak into paper and can leave a translucent patch that persists after moisture dries. The result is comparative evidence, not a quantitative measure of fat content.',
    misconceptionsAddressed: [
      'Any wet mark proves fat.',
      'A darker patch means an exact lipid quantity.',
      'The drying step can be skipped.',
    ],
    visualizationStrategy:
      'Show clean paper, crushed sample, drying state, back-light transmission, and side-by-side result cards.',
    interactionStrategy:
      'Learners predict, follow the ordered procedure for all samples, and compare only fully dried papers.',
    imaginationHelperStrategy:
      'A light-transmission meter makes translucency visible while stating that it is a qualitative indicator.',
    practicalUseCase:
      'Connects school food tests to ingredient comparison and balanced-diet discussions.',
    cueCardIds: experience.stages.map(stage => `cue-${stage.id}`),
    revisionCardIds: ['rev-lipid-sesame-transfer'],
    assessmentHookIds: assessment.prompts.map(prompt => prompt.id),
    instructorScript:
      'Use equal sample amounts and fresh paper. Require the full place-fold-crush-remove-dry-light sequence for all three foods. Debrief why the test is qualitative.',
    batchActivityPrompt:
      'Make a three-row evidence table with prediction, dry-paper observation, and lipid conclusion.',
    expectedDurationMinutes: 10,
    maxSessionDurationMinutes: 12,
    comfortRiskLevel: 'low',
    safetyNotes: [
      'Use stationary bench mode.',
      'Real food tests require allergy-aware teacher supervision and no tasting of test samples.',
    ],
    offlineContentPackId: 'pack-science-components-food-class6-v1',
    estimatedPackageSizeMb: 225,
    stages: experience.stages.length,
  }),
  kind: 'interactive',
  experience,
  assessment,
  narration: captionedNarration(slug, [
    {
      id: 'lipid-predict',
      stageId: 'predict',
      text: 'Predict which foods will leave a lasting translucent patch after the paper is completely dry.',
      caption: '',
    },
    {
      id: 'lipid-procedure',
      stageId: 'procedure',
      text: 'Use a fresh paper and equal sample. Place, fold, crush, remove, dry, then inspect against light.',
      caption: '',
    },
    {
      id: 'lipid-observe',
      stageId: 'observe',
      text: 'Compare only dry papers. Peanut and dry coconut leave persistent translucent patches; rice leaves little or none.',
      caption: '',
    },
    {
      id: 'lipid-misconception',
      stageId: 'misconception',
      text: 'A temporary water mark is not lipid evidence. Drying separates moisture from a persistent lipid patch.',
      caption: '',
    },
    {
      id: 'lipid-transfer',
      stageId: 'transfer',
      text: 'Apply the same fair procedure to sesame seeds and predict the persistent-patch evidence.',
      caption: '',
    },
  ]),
  assets: contributedEnvironmentAssets({
    slug,
    sourcePath: 'apps/web/public/environments/nutrition-lab-360.png',
    sourceSha256:
      'e095c37072c713d778e8a9c80088ec017439947e7aaecafb5c614844aab591ee',
  }),
  legacyPaths: ['/simulations/components-of-food-lipid-test'],
  contribution: {
    source: 'pr-8',
    contributor: PR8_CONTRIBUTOR,
    sourcePath: 'apps/web/components/simulations/LipidTestViewer.tsx',
  },
};
