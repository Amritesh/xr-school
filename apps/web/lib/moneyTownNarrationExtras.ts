import {
  MONEY_TOWN_MONEY,
  MONEY_IDENTIFICATION_ROUNDS,
  MONEY_MEMORY_QUESTIONS,
  MONEY_SHOP_ITEMS,
} from './moneyTownLesson';

export interface MoneyNarrationCue {
  id: string;
  text: string;
  audioUrl: string;
}

function cue(id: string, text: string): MoneyNarrationCue {
  let hash = 2166136261;
  for (const letter of text)
    hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return {
    id,
    text,
    audioUrl: `/narration/money-town/${id}-${(hash >>> 0).toString(36)}.mp3`,
  };
}

/** These clips use the same #9 Indian story-teacher profile as the stage audio. */
export const MONEY_NARRATION_EXTRAS = [
  ...MONEY_TOWN_MONEY.map((money) => cue(money.id, money.teacherLine)),
  ...MONEY_IDENTIFICATION_ROUNDS.map((round) => cue(round.id, round.prompt)),
  ...MONEY_MEMORY_QUESTIONS.map((question) =>
    cue(question.id, `${question.prompt} ${question.options.join('. ')}.`),
  ),
  ...MONEY_SHOP_ITEMS.map((item) =>
    cue(
      item.id,
      `${item.name} costs ${item.price} rupees. Select one coin or note with the same value.`,
    ),
  ),
  cue('correct', 'Correct! Well done.'),
  cue('retry', 'Look carefully and try again. You can do it.'),
  cue('paid', 'That is the right amount. Your item is paid for!'),
  cue(
    'choose-item',
    'Choose something to buy. Then read its price and select the matching money.',
  ),
  cue(
    'finish-ready',
    'You answered all eight questions correctly. Select Finish Memory Check.',
  ),
  cue('not-ready', 'Complete the activity before moving on.'),
  cue(
    'coin-side',
    'A coin is made of metal. Read its number to find its value.',
  ),
  cue(
    'note-side',
    'A currency note is rectangular. Read its number to find its value.',
  ),
];
