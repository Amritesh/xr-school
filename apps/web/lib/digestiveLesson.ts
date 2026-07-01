export type DigestiveStageId =
  | 'welcome'
  | 'mouth'
  | 'esophagus'
  | 'stomach'
  | 'supporting-organs'
  | 'small-intestine'
  | 'large-intestine'
  | 'rectum-anus'
  | 'healthy-habits'
  | 'recap';

export type DigestiveStage = {
  id: DigestiveStageId;
  title: string;
  subtitle: string;
  instruction: string;
  requiredActionIds: readonly string[];
};

export type DigestiveQuizQuestion = {
  id: string;
  prompt: string;
  options: readonly { id: string; label: string }[];
  correctAnswerId: string;
  explanation: string;
};

export type DigestiveProgress = {
  completedActions: Partial<Record<DigestiveStageId, string[]>>;
  quizAnswers: Record<string, string>;
};

export const DIGESTIVE_PATHWAY = [
  'Mouth',
  'Esophagus',
  'Stomach',
  'Small Intestine',
  'Large Intestine',
  'Rectum',
  'Anus',
] as const;

export const DIGESTIVE_STAGES: readonly DigestiveStage[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Human Body',
    subtitle: 'Meet the digestive system—the body team that turns food into fuel.',
    instruction: 'Select Start Journey to reveal the path food follows.',
    requiredActionIds: ['start-journey'],
  },
  {
    id: 'mouth',
    title: 'The Mouth',
    subtitle: 'Teeth break food down, the tongue moves it, and saliva helps form a soft bolus.',
    instruction: 'Place a food piece into the mouth and watch chewing begin.',
    requiredActionIds: ['place-food'],
  },
  {
    id: 'esophagus',
    title: 'Food Pipe (Esophagus)',
    subtitle: 'Wave-like muscle squeezes called peristalsis push the bolus downward.',
    instruction: 'Trigger the three muscle waves from top to bottom.',
    requiredActionIds: [
      'peristalsis-wave-1',
      'peristalsis-wave-2',
      'peristalsis-wave-3',
    ],
  },
  {
    id: 'stomach',
    title: 'The Stomach',
    subtitle: 'The stomach stores food and churns it with digestive juices to make chyme.',
    instruction: 'Turn the virtual mixer three times to churn the food.',
    requiredActionIds: ['mixer-turn-1', 'mixer-turn-2', 'mixer-turn-3'],
  },
  {
    id: 'supporting-organs',
    title: 'Liver, Gallbladder & Pancreas',
    subtitle: 'These helper organs add bile and digestive juices to the food journey.',
    instruction: 'Inspect all three glowing organs to discover their jobs.',
    requiredActionIds: ['inspect-liver', 'inspect-gallbladder', 'inspect-pancreas'],
  },
  {
    id: 'small-intestine',
    title: 'The Small Intestine',
    subtitle: 'Digestion finishes here. Tiny villi move nutrients into the blood.',
    instruction: 'Move all three glowing nutrients into the blood vessel.',
    requiredActionIds: ['absorb-nutrient-1', 'absorb-nutrient-2', 'absorb-nutrient-3'],
  },
  {
    id: 'large-intestine',
    title: 'The Large Intestine',
    subtitle: 'The large intestine absorbs water and the remaining material becomes solid waste.',
    instruction: 'Move all three water droplets back into the body.',
    requiredActionIds: ['absorb-water-1', 'absorb-water-2', 'absorb-water-3'],
  },
  {
    id: 'rectum-anus',
    title: 'Rectum & Anus',
    subtitle: 'Waste is stored briefly in the rectum, then leaves the body through the anus.',
    instruction: 'Follow the final glowing pathway to complete digestion.',
    requiredActionIds: [],
  },
  {
    id: 'healthy-habits',
    title: 'Healthy Digestion Habits',
    subtitle: 'Varied food, water, clean hands, chewing, and movement help digestion.',
    instruction: 'Choose each healthy food and habit for the green basket.',
    requiredActionIds: [
      'healthy-fruit',
      'healthy-vegetables',
      'healthy-water',
      'healthy-wash-hands',
      'healthy-chew-well',
      'healthy-exercise',
    ],
  },
  {
    id: 'recap',
    title: 'Recap Quiz',
    subtitle: 'Show what you know, then collect your Digestive Explorer badge.',
    instruction: 'Answer all five questions to finish your journey.',
    requiredActionIds: [],
  },
] as const;

export const DIGESTIVE_QUIZ_QUESTIONS: readonly DigestiveQuizQuestion[] = [
  {
    id: 'digestion-begins',
    prompt: 'Where does digestion begin?',
    options: [
      { id: 'mouth', label: 'Mouth' },
      { id: 'stomach', label: 'Stomach' },
      { id: 'small-intestine', label: 'Small intestine' },
    ],
    correctAnswerId: 'mouth',
    explanation: 'Digestion begins in the mouth when chewing and saliva start breaking food down.',
  },
  {
    id: 'mixes-food',
    prompt: 'Which organ stores and mixes food with digestive juices?',
    options: [
      { id: 'liver', label: 'Liver' },
      { id: 'stomach', label: 'Stomach' },
      { id: 'large-intestine', label: 'Large intestine' },
    ],
    correctAnswerId: 'stomach',
    explanation: 'The stomach churns food with digestive juices to form chyme.',
  },
  {
    id: 'absorbs-nutrients',
    prompt: 'Which organ absorbs most nutrients?',
    options: [
      { id: 'esophagus', label: 'Esophagus' },
      { id: 'small-intestine', label: 'Small intestine' },
      { id: 'rectum', label: 'Rectum' },
    ],
    correctAnswerId: 'small-intestine',
    explanation: 'Villi in the small intestine absorb nutrients and move them into the blood.',
  },
  {
    id: 'absorbs-water',
    prompt: 'Which organ absorbs water from the remaining food?',
    options: [
      { id: 'large-intestine', label: 'Large intestine' },
      { id: 'mouth', label: 'Mouth' },
      { id: 'pancreas', label: 'Pancreas' },
    ],
    correctAnswerId: 'large-intestine',
    explanation: 'The large intestine absorbs water before the remaining material becomes waste.',
  },
  {
    id: 'produces-bile',
    prompt: 'Which organ produces bile?',
    options: [
      { id: 'gallbladder', label: 'Gallbladder' },
      { id: 'liver', label: 'Liver' },
      { id: 'stomach', label: 'Stomach' },
    ],
    correctAnswerId: 'liver',
    explanation: 'The liver produces bile. The gallbladder stores and releases it.',
  },
] as const;

const stagesById = new Map(DIGESTIVE_STAGES.map(stage => [stage.id, stage]));
const questionsById = new Map(DIGESTIVE_QUIZ_QUESTIONS.map(question => [question.id, question]));

export function createDigestiveProgress(): DigestiveProgress {
  return {
    completedActions: {},
    quizAnswers: {},
  };
}

export function recordStageAction(
  progress: DigestiveProgress,
  stageId: DigestiveStageId,
  actionId: string,
): DigestiveProgress {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown digestive lesson stage: ${stageId}`);
  if (!stage.requiredActionIds.includes(actionId)) {
    throw new Error(`Action "${actionId}" is not valid for stage "${stageId}"`);
  }

  const completed = progress.completedActions[stageId] ?? [];
  if (completed.includes(actionId)) return progress;

  return {
    ...progress,
    completedActions: {
      ...progress.completedActions,
      [stageId]: [...completed, actionId],
    },
  };
}

export function isStageComplete(
  progress: DigestiveProgress,
  stageId: DigestiveStageId,
): boolean {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown digestive lesson stage: ${stageId}`);
  const completed = progress.completedActions[stageId] ?? [];
  return stage.requiredActionIds.every(actionId => completed.includes(actionId));
}

export function answerQuizQuestion(
  progress: DigestiveProgress,
  questionId: string,
  answerId: string,
): DigestiveProgress {
  const question = questionsById.get(questionId);
  if (!question) throw new Error(`Unknown digestive quiz question: ${questionId}`);
  if (!question.options.some(option => option.id === answerId)) {
    throw new Error(`Unknown answer "${answerId}" for question "${questionId}"`);
  }

  return {
    ...progress,
    quizAnswers: {
      ...progress.quizAnswers,
      [questionId]: answerId,
    },
  };
}

export function getQuizScore(progress: DigestiveProgress) {
  return {
    correct: DIGESTIVE_QUIZ_QUESTIONS.filter(
      question => progress.quizAnswers[question.id] === question.correctAnswerId,
    ).length,
    total: DIGESTIVE_QUIZ_QUESTIONS.length,
  };
}

export function hasDigestiveExplorerBadge(progress: DigestiveProgress): boolean {
  const stagesComplete = DIGESTIVE_STAGES.every(stage => isStageComplete(progress, stage.id));
  const quizComplete = DIGESTIVE_QUIZ_QUESTIONS.every(
    question => Boolean(progress.quizAnswers[question.id]),
  );
  return stagesComplete && quizComplete;
}
