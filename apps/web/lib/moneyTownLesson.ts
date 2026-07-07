export type MoneyKind = 'coin' | 'note';

export type MoneyId =
  | 'coin-rs-1'
  | 'coin-rs-2'
  | 'coin-rs-5'
  | 'coin-rs-10'
  | 'note-rs-10'
  | 'note-rs-20'
  | 'note-rs-50'
  | 'note-rs-100'
  | 'note-rs-200'
  | 'note-rs-500';

export type MoneyTownStageId =
  | 'intro'
  | 'learn-coins'
  | 'learn-notes'
  | 'coins-vs-notes'
  | 'identify-money'
  | 'shopping-challenge'
  | 'memory-check'
  | 'celebration';

export type MoneyDefinition = {
  id: MoneyId;
  kind: MoneyKind;
  value: number;
  label: string;
  shape: string;
  material: string;
  teacherLine: string;
};

export type MoneyTownStage = {
  id: MoneyTownStageId;
  title: string;
  durationSeconds: number;
  teacherNarration: string;
  environment: string;
  interactionPrompt: string;
  transition: string;
  reward: string;
  requiredActionIds: readonly string[];
};

export type MoneyIdentificationRound = {
  id: string;
  prompt: string;
  correctMoneyId: MoneyId;
  optionIds: readonly MoneyId[];
};

export type MoneyShopItem = {
  id: string;
  name: string;
  shop: string;
  price: number;
  correctMoneyId: MoneyId;
};

export type MoneyMemoryQuestion = {
  id: string;
  prompt: string;
  correctAnswer: string;
  options: readonly string[];
};

export type MoneyTownProgress = {
  completedActions: Partial<Record<MoneyTownStageId, string[]>>;
  identificationAnswers: Record<string, MoneyId>;
  memoryAnswers: Record<string, string>;
};

export const MONEY_TOWN_MONEY: readonly MoneyDefinition[] = [
  {
    id: 'coin-rs-1',
    kind: 'coin',
    value: 1,
    label: 'Rs 1 Coin',
    shape: 'Round',
    material: 'Metal',
    teacherLine: 'This is a One Rupee Coin. It has the number 1 on it. This is called a coin.',
  },
  {
    id: 'coin-rs-2',
    kind: 'coin',
    value: 2,
    label: 'Rs 2 Coin',
    shape: 'Round',
    material: 'Metal',
    teacherLine: 'This is a Two Rupee Coin. Can you say two rupees?',
  },
  {
    id: 'coin-rs-5',
    kind: 'coin',
    value: 5,
    label: 'Rs 5 Coin',
    shape: 'Round',
    material: 'Metal',
    teacherLine: 'This is a Five Rupee Coin. You can use it to buy small things.',
  },
  {
    id: 'coin-rs-10',
    kind: 'coin',
    value: 10,
    label: 'Rs 10 Coin',
    shape: 'Round',
    material: 'Metal',
    teacherLine: 'This is a Ten Rupee Coin. It is worth more than the Five Rupee Coin.',
  },
  {
    id: 'note-rs-10',
    kind: 'note',
    value: 10,
    label: 'Rs 10 Note',
    shape: 'Rectangle',
    material: 'Paper',
    teacherLine: 'This is a Ten Rupee Note. It is made of paper. It is called a currency note.',
  },
  {
    id: 'note-rs-20',
    kind: 'note',
    value: 20,
    label: 'Rs 20 Note',
    shape: 'Rectangle',
    material: 'Paper',
    teacherLine: 'This is a Twenty Rupee Note. It is a paper note.',
  },
  {
    id: 'note-rs-50',
    kind: 'note',
    value: 50,
    label: 'Rs 50 Note',
    shape: 'Rectangle',
    material: 'Paper',
    teacherLine: 'This is a Fifty Rupee Note. It is bigger in value than twenty rupees.',
  },
  {
    id: 'note-rs-100',
    kind: 'note',
    value: 100,
    label: 'Rs 100 Note',
    shape: 'Rectangle',
    material: 'Paper',
    teacherLine: 'This is a One Hundred Rupee Note. We use notes for bigger values.',
  },
  {
    id: 'note-rs-200',
    kind: 'note',
    value: 200,
    label: 'Rs 200 Note',
    shape: 'Rectangle',
    material: 'Paper',
    teacherLine: 'This is a Two Hundred Rupee Note. It is a currency note.',
  },
  {
    id: 'note-rs-500',
    kind: 'note',
    value: 500,
    label: 'Rs 500 Note',
    shape: 'Rectangle',
    material: 'Paper',
    teacherLine: 'This is a Five Hundred Rupee Note. It is worth much more than the smaller notes.',
  },
] as const;

const coinActions = MONEY_TOWN_MONEY
  .filter(money => money.kind === 'coin')
  .map(money => `grab-${money.id}`);

const noteActions = MONEY_TOWN_MONEY
  .filter(money => money.kind === 'note')
  .map(money => `touch-${money.id}`);

export const MONEY_IDENTIFICATION_ROUNDS: readonly MoneyIdentificationRound[] = [
  { id: 'find-rs-1-coin', prompt: 'Find the Rs 1 Coin.', correctMoneyId: 'coin-rs-1', optionIds: ['coin-rs-1', 'note-rs-20', 'coin-rs-5', 'note-rs-100'] },
  { id: 'find-rs-10-coin', prompt: 'Find the Rs 10 Coin.', correctMoneyId: 'coin-rs-10', optionIds: ['coin-rs-2', 'coin-rs-10', 'note-rs-10', 'note-rs-50'] },
  { id: 'find-rs-20-note', prompt: 'Find the Rs 20 Note.', correctMoneyId: 'note-rs-20', optionIds: ['note-rs-20', 'coin-rs-5', 'note-rs-200', 'coin-rs-1'] },
  { id: 'find-rs-100-note', prompt: 'Find the Rs 100 Note.', correctMoneyId: 'note-rs-100', optionIds: ['note-rs-50', 'coin-rs-10', 'note-rs-100', 'note-rs-500'] },
  { id: 'find-rs-500-note', prompt: 'Find the Rs 500 Note.', correctMoneyId: 'note-rs-500', optionIds: ['note-rs-10', 'note-rs-500', 'note-rs-100', 'coin-rs-10'] },
] as const;

export const MONEY_SHOP_ITEMS: readonly MoneyShopItem[] = [
  { id: 'fruit-apple', name: 'Apple', shop: 'Fruit Stall', price: 10, correctMoneyId: 'coin-rs-10' },
  { id: 'balloon', name: 'Balloon', shop: 'Balloon Shop', price: 5, correctMoneyId: 'coin-rs-5' },
  { id: 'candy', name: 'Candy', shop: 'Candy Shop', price: 2, correctMoneyId: 'coin-rs-2' },
] as const;

export const MONEY_MEMORY_QUESTIONS: readonly MoneyMemoryQuestion[] = [
  { id: 'what-rs-5', prompt: 'What is this?', correctAnswer: 'Rs 5 Coin', options: ['Rs 1 Coin', 'Rs 5 Coin', 'Rs 20 Note', 'Rs 100 Note'] },
  { id: 'what-rs-100', prompt: 'What is this Rs 100 object?', correctAnswer: 'Rs 100 Note', options: ['Rs 10 Coin', 'Rs 100 Note', 'Rs 5 Coin', 'Money Town'] },
  { id: 'which-coin', prompt: 'Which one is a coin?', correctAnswer: 'Rs 5 Coin', options: ['Rs 5 Coin', 'Rs 20 Note', 'Rs 50 Note', 'Rs 100 Note'] },
  { id: 'which-note', prompt: 'Which one is a currency note?', correctAnswer: 'Rs 20 Note', options: ['Rs 10 Coin', 'Rs 5 Coin', 'Rs 20 Note', 'Rs 2 Coin'] },
  { id: 'worth-ten', prompt: 'Which money is worth ten rupees?', correctAnswer: 'Rs 10 Coin', options: ['Rs 1 Coin', 'Rs 2 Coin', 'Rs 10 Coin', 'Rs 20 Note'] },
  { id: 'biggest-note', prompt: 'Find the biggest note among these.', correctAnswer: 'Rs 500 Note', options: ['Rs 20 Note', 'Rs 50 Note', 'Rs 100 Note', 'Rs 500 Note'] },
  { id: 'buy-things', prompt: 'What do we use to buy things?', correctAnswer: 'Money', options: ['Money', 'Ball', 'Pencil', 'Toy'] },
  { id: 'coin-or-note', prompt: 'Is this a coin or a note?', correctAnswer: 'Coin', options: ['Coin', 'Note', 'Shop', 'Balloon'] },
] as const;

export const MONEY_TOWN_STAGES: readonly MoneyTownStage[] = [
  {
    id: 'intro',
    title: 'Welcome to Money Town',
    durationSeconds: 60,
    teacherNarration: 'Hello, my little friend! Welcome to Money Town. We use money to buy toys, fruits, chocolates, and books. Today we will learn about coins and currency notes. Are you ready? Let us begin!',
    environment: 'A colorful Magic Money Town with a giant piggy bank, coin fountain, floating golden coins, toy market, fruit stall, candy shop, balloon shop, mini bank counter, animated birds, rainbow pathways, and happy music. No students are present.',
    interactionPrompt: 'Touch the glowing piggy bank button to enter Money Town.',
    transition: 'Rainbow swipe, coin spin, sparkles, and the classroom opens into the market.',
    reward: 'Piggy bank smile, fireworks, coin jingle, and teacher wave.',
    requiredActionIds: ['enter-money-town'],
  },
  {
    id: 'learn-coins',
    title: 'Learning Coins',
    durationSeconds: 95,
    teacherNarration: 'Coins are round and made of metal. Let us pick up the One Rupee, Two Rupee, Five Rupee, and Ten Rupee coins one by one.',
    environment: 'Large 3D Indian coin models rise from the coin fountain, rotate slowly, sparkle, and show their front, back, edge, and value.',
    interactionPrompt: 'Pick up each glowing coin.',
    transition: 'Coin fountain opens and metal coin sounds play.',
    reward: 'Coin sparkle, glow outline, stars, and teacher praise.',
    requiredActionIds: coinActions,
  },
  {
    id: 'learn-notes',
    title: 'Learning Currency Notes',
    durationSeconds: 95,
    teacherNarration: 'Currency notes are made of paper. They are rectangular and foldable. Let us touch the Ten, Twenty, Fifty, One Hundred, Two Hundred, and Five Hundred Rupee notes.',
    environment: 'Floating currency notes appear as large readable cards that flutter, rotate, and bend gently on the smartboard.',
    interactionPrompt: 'Touch each floating note.',
    transition: 'Soft paper flutter and rainbow card trail.',
    reward: 'Sparkles, star burst, and teacher claps.',
    requiredActionIds: noteActions,
  },
  {
    id: 'coins-vs-notes',
    title: 'Coins vs Notes',
    durationSeconds: 50,
    teacherNarration: 'Coins are round, metal, and small. Notes are paper, rectangular, and foldable. Coins and notes are both money.',
    environment: 'The smartboard splits into a coin side and note side with animated comparison props.',
    interactionPrompt: 'Select the coin side and then the note side.',
    transition: 'Coin drops with a metal sound and a note flutters gently.',
    reward: 'Two glowing check marks and a coin-note rainbow bridge.',
    requiredActionIds: ['select-coin-side', 'select-note-side'],
  },
  {
    id: 'identify-money',
    title: 'Coins and Currency Identification',
    durationSeconds: 80,
    teacherNarration: 'Now let us play a fun game. I will ask you to find a coin or note. Look carefully and select the correct money.',
    environment: 'Four large floating money objects appear at comfortable distance and reshuffle after each answer.',
    interactionPrompt: 'Answer all five identification rounds.',
    transition: 'Magic dust gathers the money objects into a quiz circle.',
    reward: 'Correct answers glow, stars appear, and wrong answers get gentle encouragement.',
    requiredActionIds: MONEY_IDENTIFICATION_ROUNDS.map(round => `identify-${round.id}`),
  },
  {
    id: 'shopping-challenge',
    title: 'Shopping Challenge',
    durationSeconds: 40,
    teacherNarration: 'Now we will use money at the shops. Look at the price sign, choose the matching money, and buy the item.',
    environment: 'Fruit stall, balloon shop, and candy shop open with smiling shopkeepers, price boards, cash boxes, and glowing baskets.',
    interactionPrompt: 'Buy the apple, balloon, and candy with the correct money.',
    transition: 'Market lights turn on and shop bells ring.',
    reward: 'Stars, coins, fireworks, cash box sound, receipt pop, and teacher applause.',
    requiredActionIds: MONEY_SHOP_ITEMS.map(item => `buy-${item.id}`),
  },
  {
    id: 'memory-check',
    title: 'Memory Check on Coins and Currency',
    durationSeconds: 120,
    teacherNarration: 'Let us see how much you remember. Choose the answer that matches the money or the question. If you miss, that is okay. We will try again.',
    environment: 'A calm mini bank counter shows one question at a time with four large answer cards.',
    interactionPrompt: 'Answer eight simple money questions.',
    transition: 'Money Town becomes a quiet quiz bank.',
    reward: 'Coin sparkle, teacher clap, stars, and a glowing correct answer outline.',
    requiredActionIds: ['complete-money-memory-check'],
  },
  {
    id: 'celebration',
    title: 'Money Explorer Celebration',
    durationSeconds: 60,
    teacherNarration: 'Fantastic! You have learned about coins and currency. Now you know that money helps us buy the things we need. Keep practicing when you visit a shop with your family. See you in our next adventure!',
    environment: 'The marketplace fills with balloons, golden coins rain gently, the giant piggy bank releases sparkling stars, confetti falls, and a rainbow appears.',
    interactionPrompt: 'Collect your Money Explorer star.',
    transition: 'Rainbow finale and teacher goodbye wave.',
    reward: 'Money Explorer badge, applause, confetti, fireworks, and happy music.',
    requiredActionIds: [],
  },
] as const;

export const MONEY_TOWN_VR_REQUIREMENTS = [
  'Meta Quest 3S',
  'Large realistic 3D Indian coins and currency notes',
  'One denomination at a time',
  'Interaction every 20-30 seconds',
  'Trigger picks up coins, grabs notes, and selects answers',
  'A button moves next and confirms answers',
  'B button goes back or pauses narration',
  'Soft glowing laser pointer for floating money objects',
  'Optional hand tracking for picking, touching, and dropping money into the piggy bank',
  'No student NPCs',
] as const;

const stagesById = new Map(MONEY_TOWN_STAGES.map(stage => [stage.id, stage]));
const moneyById = new Map(MONEY_TOWN_MONEY.map(money => [money.id, money]));
const identificationById = new Map(MONEY_IDENTIFICATION_ROUNDS.map(round => [round.id, round]));
const memoryById = new Map(MONEY_MEMORY_QUESTIONS.map(question => [question.id, question]));

export function getMoneyDefinition(moneyId: MoneyId): MoneyDefinition {
  const money = moneyById.get(moneyId);
  if (!money) throw new Error(`Unknown money denomination: ${moneyId}`);
  return money;
}

export function createMoneyTownProgress(): MoneyTownProgress {
  return {
    completedActions: {},
    identificationAnswers: {},
    memoryAnswers: {},
  };
}

export function recordMoneyTownAction(
  progress: MoneyTownProgress,
  stageId: MoneyTownStageId,
  actionId: string,
): MoneyTownProgress {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown Money Town stage: ${stageId}`);
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

export function isMoneyTownStageComplete(
  progress: MoneyTownProgress,
  stageId: MoneyTownStageId,
): boolean {
  const stage = stagesById.get(stageId);
  if (!stage) throw new Error(`Unknown Money Town stage: ${stageId}`);
  const completed = progress.completedActions[stageId] ?? [];
  return stage.requiredActionIds.every(actionId => completed.includes(actionId));
}

export function answerMoneyIdentificationRound(
  progress: MoneyTownProgress,
  roundId: string,
  moneyId: MoneyId,
): MoneyTownProgress {
  const round = identificationById.get(roundId);
  if (!round) throw new Error(`Unknown identification round: ${roundId}`);
  if (!round.optionIds.includes(moneyId)) {
    throw new Error(`Money "${moneyId}" is not an option for round "${roundId}"`);
  }

  const nextProgress = {
    ...progress,
    identificationAnswers: {
      ...progress.identificationAnswers,
      [roundId]: moneyId,
    },
  };

  if (moneyId !== round.correctMoneyId) return nextProgress;
  return recordMoneyTownAction(nextProgress, 'identify-money', `identify-${round.id}`);
}

export function answerMoneyMemoryQuestion(
  progress: MoneyTownProgress,
  questionId: string,
  answer: string,
): MoneyTownProgress {
  const question = memoryById.get(questionId);
  if (!question) throw new Error(`Unknown memory question: ${questionId}`);
  if (!question.options.includes(answer)) {
    throw new Error(`Answer "${answer}" is not valid for question "${questionId}"`);
  }

  const nextProgress = {
    ...progress,
    memoryAnswers: {
      ...progress.memoryAnswers,
      [questionId]: answer,
    },
  };

  if (Object.keys(nextProgress.memoryAnswers).length < MONEY_MEMORY_QUESTIONS.length) {
    return nextProgress;
  }

  return recordMoneyTownAction(nextProgress, 'memory-check', 'complete-money-memory-check');
}

export function getMoneyMemoryScore(progress: MoneyTownProgress) {
  return {
    correct: MONEY_MEMORY_QUESTIONS.filter(
      question => progress.memoryAnswers[question.id] === question.correctAnswer,
    ).length,
    total: MONEY_MEMORY_QUESTIONS.length,
  };
}
