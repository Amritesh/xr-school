export type PrepositionId =
  | 'on'
  | 'under'
  | 'in'
  | 'inside'
  | 'outside'
  | 'above'
  | 'below'
  | 'behind'
  | 'in-front-of'
  | 'next-to'
  | 'near'
  | 'between'
  | 'over';

export type PrepositionStageId =
  | 'intro'
  | 'learn-prepositions'
  | 'preposition-practice'
  | 'memory-check'
  | 'celebration';

export type PrepositionDefinition = {
  id: PrepositionId;
  label: string;
  scene: string;
  objectName: string;
  anchorName: string;
  teacherLine: string;
  actionId: string;
};

export type PrepositionStage = {
  id: PrepositionStageId;
  title: string;
  durationSeconds: number;
  teacherNarration: string;
  environment: string;
  interactionPrompt: string;
  transition: string;
  reward: string;
  requiredActionIds: readonly string[];
};

export type PrepositionPracticeChallenge = {
  id: string;
  prompt: string;
  correctPrepositionId: PrepositionId;
  objectName: string;
  anchorName: string;
};

export type PrepositionMemoryQuestion = {
  id: string;
  prompt: string;
  sceneDescription: string;
  correctPrepositionId: PrepositionId;
  optionIds: readonly PrepositionId[];
};

export type PrepositionProgress = {
  completedActions: Partial<Record<PrepositionStageId, string[]>>;
  practiceAnswers: Record<string, PrepositionId>;
  memoryAnswers: Record<string, PrepositionId>;
};

export const PREPOSITION_DEFINITIONS: readonly PrepositionDefinition[] = [
  {
    id: 'on',
    label: 'On',
    scene: 'Toy Room',
    objectName: 'Ball',
    anchorName: 'Table',
    teacherLine: 'The ball is ON the table.',
    actionId: 'place-ball-on-table',
  },
  {
    id: 'under',
    label: 'Under',
    scene: 'Toy Room',
    objectName: 'Ball',
    anchorName: 'Table',
    teacherLine: 'The ball is UNDER the table.',
    actionId: 'move-ball-under-table',
  },
  {
    id: 'in',
    label: 'In',
    scene: 'Reading Corner',
    objectName: 'Book',
    anchorName: 'Bag',
    teacherLine: 'The book is IN the bag.',
    actionId: 'put-book-in-bag',
  },
  {
    id: 'inside',
    label: 'Inside',
    scene: 'Toy Room',
    objectName: 'Teddy Bear',
    anchorName: 'Toy Box',
    teacherLine: 'The teddy bear is INSIDE the box.',
    actionId: 'place-teddy-inside-box',
  },
  {
    id: 'outside',
    label: 'Outside',
    scene: 'Toy Room',
    objectName: 'Teddy Bear',
    anchorName: 'Toy Box',
    teacherLine: 'The teddy bear is OUTSIDE the box.',
    actionId: 'move-teddy-outside-box',
  },
  {
    id: 'above',
    label: 'Above',
    scene: 'Garden',
    objectName: 'Bird',
    anchorName: 'Tree',
    teacherLine: 'The bird is ABOVE the tree.',
    actionId: 'fly-bird-above-tree',
  },
  {
    id: 'below',
    label: 'Below',
    scene: 'Garden',
    objectName: 'Fish',
    anchorName: 'Bridge',
    teacherLine: 'The fish is BELOW the bridge.',
    actionId: 'swim-fish-below-bridge',
  },
  {
    id: 'behind',
    label: 'Behind',
    scene: 'Reading Corner',
    objectName: 'Cat',
    anchorName: 'Chair',
    teacherLine: 'The cat is BEHIND the chair.',
    actionId: 'hide-cat-behind-chair',
  },
  {
    id: 'in-front-of',
    label: 'In Front Of',
    scene: 'Magic Castle',
    objectName: 'Puppy',
    anchorName: 'House',
    teacherLine: 'The puppy is IN FRONT OF the house.',
    actionId: 'stand-puppy-in-front-of-house',
  },
  {
    id: 'next-to',
    label: 'Next To',
    scene: 'Reading Corner',
    objectName: 'Book',
    anchorName: 'Pencil',
    teacherLine: 'The book is NEXT TO the pencil.',
    actionId: 'place-book-next-to-pencil',
  },
  {
    id: 'near',
    label: 'Near',
    scene: 'Animal Park',
    objectName: 'Rabbit',
    anchorName: 'Carrot',
    teacherLine: 'The rabbit is NEAR the carrot.',
    actionId: 'move-rabbit-near-carrot',
  },
  {
    id: 'between',
    label: 'Between',
    scene: 'Playground',
    objectName: 'Football',
    anchorName: 'Two Boxes',
    teacherLine: 'The football is BETWEEN two boxes.',
    actionId: 'place-football-between-boxes',
  },
  {
    id: 'over',
    label: 'Over',
    scene: 'Tree House',
    objectName: 'Airplane',
    anchorName: 'House',
    teacherLine: 'The airplane flies OVER the house.',
    actionId: 'fly-airplane-over-house',
  },
] as const;

export const PREPOSITION_PRACTICE_CHALLENGES: readonly PrepositionPracticeChallenge[] = [
  { id: 'practice-on', prompt: 'Place the ball ON the table.', correctPrepositionId: 'on', objectName: 'Ball', anchorName: 'Table' },
  { id: 'practice-inside', prompt: 'Move the teddy INSIDE the box.', correctPrepositionId: 'inside', objectName: 'Teddy', anchorName: 'Box' },
  { id: 'practice-under', prompt: 'Put the apple UNDER the chair.', correctPrepositionId: 'under', objectName: 'Apple', anchorName: 'Chair' },
  { id: 'practice-behind', prompt: 'Move the cat BEHIND the tree.', correctPrepositionId: 'behind', objectName: 'Cat', anchorName: 'Tree' },
  { id: 'practice-next-to', prompt: 'Place the rabbit NEXT TO the carrot.', correctPrepositionId: 'next-to', objectName: 'Rabbit', anchorName: 'Carrot' },
  { id: 'practice-over', prompt: 'Move the airplane OVER the house.', correctPrepositionId: 'over', objectName: 'Airplane', anchorName: 'House' },
  { id: 'practice-between', prompt: 'Place the football BETWEEN the boxes.', correctPrepositionId: 'between', objectName: 'Football', anchorName: 'Boxes' },
  { id: 'practice-above', prompt: 'Put the bird ABOVE the tree.', correctPrepositionId: 'above', objectName: 'Bird', anchorName: 'Tree' },
] as const;

export const PREPOSITION_MEMORY_QUESTIONS: readonly PrepositionMemoryQuestion[] = [
  { id: 'ball-on-table', prompt: 'Where is the ball?', sceneDescription: 'A ball is on a table.', correctPrepositionId: 'on', optionIds: ['on', 'under', 'behind', 'inside'] },
  { id: 'cat-behind-chair', prompt: 'Where is the cat?', sceneDescription: 'A cat is behind a chair.', correctPrepositionId: 'behind', optionIds: ['near', 'behind', 'above', 'over'] },
  { id: 'bird-above-tree', prompt: 'Which preposition is correct?', sceneDescription: 'A bird is above a tree.', correctPrepositionId: 'above', optionIds: ['below', 'above', 'between', 'outside'] },
  { id: 'football-between-boxes', prompt: 'Where is the football?', sceneDescription: 'A football is between two boxes.', correctPrepositionId: 'between', optionIds: ['between', 'next-to', 'under', 'in'] },
  { id: 'rabbit-near-carrot', prompt: 'Where is the rabbit?', sceneDescription: 'A rabbit is near a carrot.', correctPrepositionId: 'near', optionIds: ['over', 'near', 'inside', 'below'] },
  { id: 'teddy-inside-box', prompt: 'Where is the teddy bear?', sceneDescription: 'A teddy bear is inside a toy box.', correctPrepositionId: 'inside', optionIds: ['outside', 'inside', 'above', 'on'] },
] as const;

export const PREPOSITION_STAGES: readonly PrepositionStage[] = [
  {
    id: 'intro',
    title: 'English Adventure Begins',
    durationSeconds: 60,
    teacherNarration: 'Hello, little explorer! Welcome to our English Adventure. Today we are going to discover prepositions. Prepositions tell us where people, animals, and objects are. Let us learn together!',
    environment: 'A magical classroom transforms with floating books, butterflies, rainbow lights, sparkles, clouds, flowers, balloons, happy birds, and one friendly teacher guide. No students appear inside the simulation.',
    interactionPrompt: 'Touch the rainbow book to begin.',
    transition: 'Books float open, butterflies circle the smartboard, and a rainbow portal appears.',
    reward: 'Teacher wave, sparkles, happy birds, and magic bell.',
    requiredActionIds: ['start-preposition-adventure'],
  },
  {
    id: 'learn-prepositions',
    title: 'Learn Prepositions',
    durationSeconds: 300,
    teacherNarration: 'Let us learn one preposition at a time. Watch the object, listen carefully, and place it in the correct position.',
    environment: 'The classroom transforms into a toy room, garden, playground, reading corner, tree house, animal park, and magic castle as each preposition appears.',
    interactionPrompt: 'Complete each glowing object placement.',
    transition: 'Rainbow transitions move between playful English worlds.',
    reward: 'Stars, object glow, teacher praise, and soft fireworks after each correct placement.',
    requiredActionIds: PREPOSITION_DEFINITIONS.map(preposition => preposition.actionId),
  },
  {
    id: 'preposition-practice',
    title: 'Preposition Practice',
    durationSeconds: 90,
    teacherNarration: 'Let us play a game. I will tell you where to place the object. Try your best. If you miss, we will try again.',
    environment: 'Objects and anchors appear in random positions around a playful practice meadow.',
    interactionPrompt: 'Answer all practice challenges.',
    transition: 'Magic portal gathers objects into a practice circle.',
    reward: 'Stars, gold coins, sparkles, fireworks, teacher applause, and happy music.',
    requiredActionIds: PREPOSITION_PRACTICE_CHALLENGES.map(challenge => `complete-${challenge.id}`),
  },
  {
    id: 'memory-check',
    title: 'Memory Check in Prepositions',
    durationSeconds: 90,
    teacherNarration: 'Let us see how much you remember. Look at the scene and choose the correct preposition.',
    environment: 'A calm magic castle quiz garden shows one scene at a time with four large answer cards.',
    interactionPrompt: 'Answer six memory questions.',
    transition: 'The adventure world becomes a quiet quiz garden.',
    reward: 'Correct card glow, stars, sparkles, and teacher claps.',
    requiredActionIds: ['complete-preposition-memory-check'],
  },
  {
    id: 'celebration',
    title: 'English Champion Celebration',
    durationSeconds: 60,
    teacherNarration: 'Amazing! Today you learned many prepositions. Now you know how to tell where objects are. Keep looking around you and find more prepositions every day. See you in our next English Adventure!',
    environment: 'The classroom becomes a celebration with rainbow sky, butterflies, confetti, floating stars, flowers, balloons, and cheerful music.',
    interactionPrompt: 'Collect your Preposition Explorer badge.',
    transition: 'Rainbow slowly fades as the teacher waves goodbye.',
    reward: 'Preposition Explorer, Grammar Star, and English Champion badges.',
    requiredActionIds: [],
  },
] as const;

export const PREPOSITION_VR_REQUIREMENTS = [
  'Class 2 English',
  'Meta Quest 3S ready WebXR',
  '8-10 minute adventure',
  'One friendly teacher guide',
  'No student NPCs',
  'Interaction every 20-30 seconds',
  'Positive reinforcement only',
  'Bright child-friendly environments',
] as const;

const stagesById = new Map(PREPOSITION_STAGES.map(stage => [stage.id, stage]));
const definitionsById = new Map(PREPOSITION_DEFINITIONS.map(preposition => [preposition.id, preposition]));
const practiceById = new Map(PREPOSITION_PRACTICE_CHALLENGES.map(challenge => [challenge.id, challenge]));
const memoryById = new Map(PREPOSITION_MEMORY_QUESTIONS.map(question => [question.id, question]));

export function getPrepositionDefinition(id: PrepositionId): PrepositionDefinition {
  const definition = definitionsById.get(id);
  if (!definition) throw new Error(`Unknown preposition: ${id}`);
  return definition;
}

export function createPrepositionProgress(): PrepositionProgress {
  return {
    completedActions: {},
    practiceAnswers: {},
    memoryAnswers: {},
  };
}

export function recordPrepositionAction(
  progress: PrepositionProgress,
  stageId: PrepositionStageId,
  actionId: string,
): PrepositionProgress {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown preposition stage: ${stageId}`);
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

export function answerPrepositionPractice(
  progress: PrepositionProgress,
  challengeId: string,
  prepositionId: PrepositionId,
): PrepositionProgress {
  const challenge = practiceById.get(challengeId);
  if (!challenge) throw new Error(`Unknown practice challenge: ${challengeId}`);

  const nextProgress = {
    ...progress,
    practiceAnswers: {
      ...progress.practiceAnswers,
      [challengeId]: prepositionId,
    },
  };

  if (prepositionId !== challenge.correctPrepositionId) return nextProgress;
  return recordPrepositionAction(nextProgress, 'preposition-practice', `complete-${challenge.id}`);
}

export function answerPrepositionMemoryQuestion(
  progress: PrepositionProgress,
  questionId: string,
  prepositionId: PrepositionId,
): PrepositionProgress {
  const question = memoryById.get(questionId);
  if (!question) throw new Error(`Unknown memory question: ${questionId}`);
  if (!question.optionIds.includes(prepositionId)) {
    throw new Error(`Preposition "${prepositionId}" is not valid for question "${questionId}"`);
  }

  const nextProgress = {
    ...progress,
    memoryAnswers: {
      ...progress.memoryAnswers,
      [questionId]: prepositionId,
    },
  };

  if (Object.keys(nextProgress.memoryAnswers).length < PREPOSITION_MEMORY_QUESTIONS.length) {
    return nextProgress;
  }

  return recordPrepositionAction(nextProgress, 'memory-check', 'complete-preposition-memory-check');
}

export function isPrepositionStageComplete(
  progress: PrepositionProgress,
  stageId: PrepositionStageId,
): boolean {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown preposition stage: ${stageId}`);
  const completed = progress.completedActions[stageId] ?? [];
  return stage.requiredActionIds.every(actionId => completed.includes(actionId));
}

export function getPrepositionMemoryScore(progress: PrepositionProgress) {
  return {
    correct: PREPOSITION_MEMORY_QUESTIONS.filter(
      question => progress.memoryAnswers[question.id] === question.correctPrepositionId,
    ).length,
    total: PREPOSITION_MEMORY_QUESTIONS.length,
  };
}
