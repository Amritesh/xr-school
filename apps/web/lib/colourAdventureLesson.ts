export type ColourAdventureStageId =
  | 'intro'
  | 'learn-red'
  | 'learn-blue'
  | 'learn-yellow'
  | 'learn-green'
  | 'learn-orange'
  | 'learn-purple'
  | 'learn-pink'
  | 'learn-brown'
  | 'learn-black'
  | 'learn-white'
  | 'find-colours'
  | 'memory-check'
  | 'celebration';

export type ColourId =
  | 'red'
  | 'blue'
  | 'yellow'
  | 'green'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'black'
  | 'white';

export type ColourDefinition = {
  id: ColourId;
  name: string;
  hex: string;
  objects: readonly string[];
  teacherLine: string;
};

export type ColourAdventureStage = {
  id: ColourAdventureStageId;
  title: string;
  durationSeconds: number;
  teacherNarration: string;
  environment: string;
  interactionPrompt: string;
  transition: string;
  reward: string;
  requiredActionIds: readonly string[];
};

export type ColourMemoryQuestion = {
  id: string;
  prompt: string;
  objectName: string;
  correctColourId: ColourId;
  optionIds: readonly ColourId[];
};

export type ColourAdventureProgress = {
  completedActions: Partial<Record<ColourAdventureStageId, string[]>>;
  memoryAnswers: Record<string, ColourId>;
};

export const COLOUR_ADVENTURE_COLOURS: readonly ColourDefinition[] = [
  {
    id: 'red',
    name: 'Red',
    hex: '#ef4444',
    objects: ['Apple', 'Rose', 'Fire truck', 'Balloon'],
    teacherLine: 'This is RED. Red is the colour of apples. Can you say RED?',
  },
  {
    id: 'blue',
    name: 'Blue',
    hex: '#3b82f6',
    objects: ['Sky', 'Bird', 'Fish', 'Car'],
    teacherLine: 'This is BLUE. Blue is the colour of the sky.',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    hex: '#facc15',
    objects: ['Sun', 'Banana', 'Duck', 'Sunflower'],
    teacherLine: 'This is YELLOW. Yellow is bright like the sun.',
  },
  {
    id: 'green',
    name: 'Green',
    hex: '#22c55e',
    objects: ['Tree', 'Leaves', 'Frog', 'Grass'],
    teacherLine: 'This is GREEN. Green is the colour of leaves and grass.',
  },
  {
    id: 'orange',
    name: 'Orange',
    hex: '#f97316',
    objects: ['Orange fruit', 'Tiger', 'Pumpkin', 'Basketball'],
    teacherLine: 'This is ORANGE. Orange is the colour of pumpkins.',
  },
  {
    id: 'purple',
    name: 'Purple',
    hex: '#a855f7',
    objects: ['Grapes', 'Butterfly', 'Flowers', 'Magic stars'],
    teacherLine: 'This is PURPLE. Purple can be found in grapes and flowers.',
  },
  {
    id: 'pink',
    name: 'Pink',
    hex: '#ec4899',
    objects: ['Flowers', 'Cupcake', 'Balloon', 'Ribbon'],
    teacherLine: 'This is PINK. Pink is soft and cheerful.',
  },
  {
    id: 'brown',
    name: 'Brown',
    hex: '#92400e',
    objects: ['Tree trunk', 'Bear', 'Chocolate', 'Wooden chair'],
    teacherLine: 'This is BROWN. Brown is the colour of chocolate and wood.',
  },
  {
    id: 'black',
    name: 'Black',
    hex: '#111827',
    objects: ['Cat', 'Night sky', 'Hat', 'Piano'],
    teacherLine: 'This is BLACK. Black is the colour of the night sky.',
  },
  {
    id: 'white',
    name: 'White',
    hex: '#f8fafc',
    objects: ['Cloud', 'Milk', 'Rabbit', 'Snowman'],
    teacherLine: 'This is WHITE. White is the colour of clouds and snow.',
  },
] as const;

const colourLearningStages = COLOUR_ADVENTURE_COLOURS.map(colour => ({
  id: `learn-${colour.id}` as ColourAdventureStageId,
  title: `${colour.name} World`,
  durationSeconds: 24,
  teacherNarration: `${colour.teacherLine} Touch the glowing ${colour.name} balloon to fill the room with ${colour.name}.`,
  environment: `The classroom transforms into a ${colour.name.toLowerCase()} adventure world with ${colour.objects.join(', ')}.`,
  interactionPrompt: `Touch the ${colour.name} balloon and watch the ${colour.name} objects glow.`,
  transition: `Rainbow whoosh into the ${colour.name.toLowerCase()} colour world.`,
  reward: 'Stars, sparkle bell, glowing objects, and teacher praise.',
  requiredActionIds: [`touch-${colour.id}-balloon`],
})) satisfies readonly ColourAdventureStage[];

export const COLOUR_ADVENTURE_STAGES: readonly ColourAdventureStage[] = [
  {
    id: 'intro',
    title: 'Magical Colour Classroom',
    durationSeconds: 60,
    teacherNarration: "Hello, my little friend! Welcome to our colourful classroom. Today we are going to learn about colours. Colours are everywhere around us. Can you find them? Let's begin our colourful adventure!",
    environment: 'A circular magical classroom with rainbow ceiling lights, smart board, open rainbow-sky windows, balloons, butterflies, moving clouds, and floating colour particles.',
    interactionPrompt: 'Touch the rainbow star to begin.',
    transition: 'Rainbow appears, colour particles explode, and the classroom becomes magical.',
    reward: 'Rainbow sparkle, teacher wave, and happy music.',
    requiredActionIds: ['start-colour-adventure'],
  },
  ...colourLearningStages,
  {
    id: 'find-colours',
    title: 'Find the Colour',
    durationSeconds: 120,
    teacherNarration: "Now let's play a game! Find the colour I ask. Touch each correct object and earn rainbow stars.",
    environment: 'Five large floating objects appear at child-friendly distance and reshuffle after each answer.',
    interactionPrompt: 'Find red, blue, yellow, green, orange, purple, pink, brown, black, and white.',
    transition: 'Magic dust gathers the objects into a game circle.',
    reward: 'Stars, coins, rainbow arc, fireworks, and magic sound.',
    requiredActionIds: COLOUR_ADVENTURE_COLOURS.map(colour => `find-${colour.id}`),
  },
  {
    id: 'memory-check',
    title: 'Colour Memory Game',
    durationSeconds: 120,
    teacherNarration: "Let's see how well you remember colours. Look at the object and choose the matching colour. If you miss, that's okay. Let's try again.",
    environment: 'A holographic quiz garden with one object at a time and four large colour pads.',
    interactionPrompt: 'Answer ten simple colour questions.',
    transition: 'The colour worlds fold into a calm memory-check garden.',
    reward: 'Smiling objects, stars, happy sound, and teacher claps.',
    requiredActionIds: ['complete-memory-check'],
  },
  {
    id: 'celebration',
    title: 'Rainbow Celebration',
    durationSeconds: 60,
    teacherNarration: 'Amazing! You have learned many beautiful colours today. Now you can find colours all around you. Keep looking, keep learning, and keep smiling. See you in the next adventure. Goodbye!',
    environment: 'Rainbow opens, all colours dance, balloons fly, butterflies appear, and confetti falls.',
    interactionPrompt: 'Wave goodbye and collect your Colour Explorer star.',
    transition: 'Rainbow finale with soft fade out.',
    reward: 'Colour Explorer star, applause, balloons, butterflies, and confetti.',
    requiredActionIds: [],
  },
] as const;

export const COLOUR_MEMORY_QUESTIONS: readonly ColourMemoryQuestion[] = [
  { id: 'apple-red', prompt: 'What colour is this Apple?', objectName: 'Apple', correctColourId: 'red', optionIds: ['red', 'blue', 'green', 'yellow'] },
  { id: 'banana-yellow', prompt: 'What colour is the Banana?', objectName: 'Banana', correctColourId: 'yellow', optionIds: ['yellow', 'red', 'purple', 'black'] },
  { id: 'grass-green', prompt: 'What colour is the Grass?', objectName: 'Grass', correctColourId: 'green', optionIds: ['green', 'pink', 'white', 'orange'] },
  { id: 'sun-yellow', prompt: 'What colour is the Sun?', objectName: 'Sun', correctColourId: 'yellow', optionIds: ['yellow', 'brown', 'blue', 'black'] },
  { id: 'cloud-white', prompt: 'What colour are Clouds?', objectName: 'Cloud', correctColourId: 'white', optionIds: ['white', 'green', 'orange', 'red'] },
  { id: 'grapes-purple', prompt: 'What colour are Grapes?', objectName: 'Grapes', correctColourId: 'purple', optionIds: ['purple', 'yellow', 'brown', 'blue'] },
  { id: 'chocolate-brown', prompt: 'What colour is Chocolate?', objectName: 'Chocolate', correctColourId: 'brown', optionIds: ['brown', 'pink', 'white', 'green'] },
  { id: 'sky-blue', prompt: 'What colour is the Sky?', objectName: 'Sky', correctColourId: 'blue', optionIds: ['blue', 'red', 'black', 'orange'] },
  { id: 'pumpkin-orange', prompt: 'What colour is the Pumpkin?', objectName: 'Pumpkin', correctColourId: 'orange', optionIds: ['orange', 'purple', 'green', 'white'] },
  { id: 'snow-white', prompt: 'What colour is Snow?', objectName: 'Snow', correctColourId: 'white', optionIds: ['white', 'black', 'yellow', 'pink'] },
] as const;

export const COLOUR_ADVENTURE_VR_REQUIREMENTS = [
  'Meta Quest 3S',
  'Large high-contrast visuals instead of long text',
  'One new colour at a time',
  'Interaction every 20-30 seconds',
  'Trigger selects answers, grabs objects, and touches balloons',
  'A button moves next, B button goes back or pauses narration',
  'Optional hand tracking for touching, picking, and popping balloons',
  'Smooth rainbow transitions only',
  'No student NPCs',
] as const;

export function createColourAdventureProgress(): ColourAdventureProgress {
  return {
    completedActions: {},
    memoryAnswers: {},
  };
}

const stagesById = new Map(COLOUR_ADVENTURE_STAGES.map(stage => [stage.id, stage]));
const memoryQuestionsById = new Map(COLOUR_MEMORY_QUESTIONS.map(question => [question.id, question]));

export function recordColourAdventureAction(
  progress: ColourAdventureProgress,
  stageId: ColourAdventureStageId,
  actionId: string,
): ColourAdventureProgress {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown colour adventure stage: ${stageId}`);
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

export function isColourAdventureStageComplete(
  progress: ColourAdventureProgress,
  stageId: ColourAdventureStageId,
): boolean {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown colour adventure stage: ${stageId}`);
  const completed = progress.completedActions[stageId] ?? [];
  return stage.requiredActionIds.every(actionId => completed.includes(actionId));
}

export function answerColourMemoryQuestion(
  progress: ColourAdventureProgress,
  questionId: string,
  colourId: ColourId,
): ColourAdventureProgress {
  const question = memoryQuestionsById.get(questionId);
  if (!question) throw new Error(`Unknown colour memory question: ${questionId}`);
  if (!question.optionIds.includes(colourId)) {
    throw new Error(`Unknown colour "${colourId}" for question "${questionId}"`);
  }

  return {
    ...progress,
    memoryAnswers: {
      ...progress.memoryAnswers,
      [questionId]: colourId,
    },
  };
}

export function getColourMemoryScore(progress: ColourAdventureProgress) {
  return {
    correct: COLOUR_MEMORY_QUESTIONS.filter(
      question => progress.memoryAnswers[question.id] === question.correctColourId,
    ).length,
    total: COLOUR_MEMORY_QUESTIONS.length,
  };
}
