import {
  MONEY_IDENTIFICATION_ROUNDS,
  MONEY_MEMORY_QUESTIONS,
  MONEY_SHOP_ITEMS,
  MONEY_TOWN_MONEY,
  MONEY_TOWN_STAGES,
  answerMoneyIdentificationRound,
  answerMoneyMemoryQuestion,
  createMoneyTownProgress,
  getMoneyDefinition,
  isMoneyMemoryReady,
  isMoneyTownStageComplete,
  payForMoneyShopItem,
  recordMoneyTownAction,
  type MoneyId,
  type MoneyTownProgress,
} from './moneyTownLesson';

export interface MoneyTownState {
  stage: number;
  progress: MoneyTownProgress;
  shop?: string;
  feedback: string;
}
export interface MoneyOption {
  id: string;
  label: string;
  moneyId?: MoneyId;
}
export interface MoneyActivity {
  prompt: string;
  options: MoneyOption[];
  specimen?: MoneyId;
  cue: string;
  ready: boolean;
}
export const initialMoneyTownState = (): MoneyTownState => ({
  stage: 0,
  progress: createMoneyTownProgress(),
  feedback: '',
});

/** One authored set of choices feeds both accessible DOM and XR ray targets. */
export function moneyActivity(state: MoneyTownState): MoneyActivity {
  const stage = MONEY_TOWN_STAGES[state.stage];
  const progress = state.progress;
  const ready = isMoneyTownStageComplete(progress, stage.id);
  const base = {
    prompt: stage.interactionPrompt,
    cue: `stage-${stage.id}`,
    ready,
    options: [] as MoneyOption[],
  };
  if (ready)
    return {
      ...base,
      prompt:
        stage.id === 'celebration'
          ? 'You are a Money Explorer!'
          : 'Well done! Select Next to continue.',
    };
  if (stage.id === 'learn-coins' || stage.id === 'learn-notes') {
    const kind = stage.id === 'learn-coins' ? 'coin' : 'note';
    const money = MONEY_TOWN_MONEY.find(
      (item) =>
        item.kind === kind &&
        !(progress.completedActions[stage.id] ?? []).includes(
          `${kind === 'coin' ? 'grab' : 'touch'}-${item.id}`,
        ),
    )!;
    return {
      ...base,
      specimen: money.id,
      cue: money.id,
      prompt: money.teacherLine,
      options: [
        {
          id: `${kind === 'coin' ? 'grab' : 'touch'}-${money.id}`,
          label: `Inspect ${money.label}`,
        },
      ],
    };
  }
  if (stage.id === 'identify-money') {
    const round = MONEY_IDENTIFICATION_ROUNDS.find(
      (item) => progress.identificationAnswers[item.id] !== item.correctMoneyId,
    )!;
    return {
      ...base,
      cue: round.id,
      prompt: round.prompt,
      options: round.optionIds.map((id) => ({
        id: `identify:${round.id}:${id}`,
        label: getMoneyDefinition(id).label,
        moneyId: id,
      })),
    };
  }
  if (stage.id === 'shopping-challenge') {
    const item = MONEY_SHOP_ITEMS.find(
      (candidate) =>
        candidate.id === state.shop && !progress.payments[candidate.id],
    );
    if (!item)
      return {
        ...base,
        cue: 'choose-item',
        prompt: 'Choose an item. Then pay its exact price.',
        options: MONEY_SHOP_ITEMS.filter(
          (candidate) => !progress.payments[candidate.id],
        ).map((candidate) => ({
          id: `shop:${candidate.id}`,
          label: `${candidate.name} · Rs ${candidate.price}`,
        })),
      };
    return {
      ...base,
      cue: item.id,
      prompt: `${item.name} costs Rs ${item.price}. Choose one matching coin or note.`,
      options: (
        ['coin-rs-2', 'coin-rs-5', 'coin-rs-10', 'note-rs-10'] as MoneyId[]
      ).map((id) => ({
        id: `pay:${item.id}:${id}`,
        label: getMoneyDefinition(id).label,
        moneyId: id,
      })),
    };
  }
  if (stage.id === 'memory-check') {
    const question = MONEY_MEMORY_QUESTIONS.find(
      (item) => progress.memoryAnswers[item.id] !== item.correctAnswer,
    );
    if (!question)
      return {
        ...base,
        cue: 'finish-ready',
        prompt: 'All eight answers are correct. Finish your memory check.',
        options: [
          { id: 'complete-money-memory-check', label: 'Finish Memory Check' },
        ],
      };
    return {
      ...base,
      specimen: question.specimen,
      cue: question.id,
      prompt: question.prompt,
      options: question.options.map((label, index) => ({
        id: `memory:${question.id}:${index}`,
        label,
      })),
    };
  }
  return {
    ...base,
    options: stage.requiredActionIds
      .filter((id) => !(progress.completedActions[stage.id] ?? []).includes(id))
      .map((id) => ({
        id,
        moneyId:
          id === 'select-coin-side'
            ? ('coin-rs-5' as const)
            : id === 'select-note-side'
              ? ('note-rs-20' as const)
              : undefined,
        label:
          id === 'enter-money-town'
            ? 'Enter'
            : id === 'select-coin-side'
              ? 'Coin side'
              : 'Note side',
      })),
  };
}

export function moveMoneyTown(
  state: MoneyTownState,
  direction: number,
): MoneyTownState {
  if (
    direction > 0 &&
    !isMoneyTownStageComplete(state.progress, MONEY_TOWN_STAGES[state.stage].id)
  )
    return { ...state, feedback: 'Complete this activity before moving on.' };
  return {
    ...state,
    stage: Math.max(
      0,
      Math.min(MONEY_TOWN_STAGES.length - 1, state.stage + direction),
    ),
    shop: undefined,
    feedback: '',
  };
}

/** Reject stale/hidden targets and raw completion actions identically for all inputs. */
export function actInMoneyTown(
  state: MoneyTownState,
  id: string,
): { state: MoneyTownState; cues: string[] } {
  const activity = moneyActivity(state);
  if (!activity.options.some((option) => option.id === id))
    return { state, cues: [] };
  const stage = MONEY_TOWN_STAGES[state.stage];
  let progress = state.progress;
  let feedback = 'Well done!';
  let cue = 'correct';
  let shop = state.shop;
  if (id.startsWith('identify:')) {
    const [, round, money] = id.split(':');
    progress = answerMoneyIdentificationRound(
      progress,
      round,
      money as MoneyId,
    );
    const correct =
      MONEY_IDENTIFICATION_ROUNDS.find((item) => item.id === round)!
        .correctMoneyId === money;
    feedback = correct
      ? `Correct: ${getMoneyDefinition(money as MoneyId).label}.`
      : 'Not quite. Read the value and try again.';
    if (!correct) cue = 'retry';
  } else if (id.startsWith('shop:')) {
    shop = id.slice(5);
    cue = '';
    feedback = '';
  } else if (id.startsWith('pay:')) {
    const [, item, money] = id.split(':');
    progress = payForMoneyShopItem(progress, item, money as MoneyId);
    if (progress === state.progress) {
      cue = 'retry';
      feedback =
        'That amount does not match the price. Try another coin or note.';
    } else {
      cue = 'paid';
      feedback = `${MONEY_SHOP_ITEMS.find((candidate) => candidate.id === item)!.name} paid for!`;
      shop = undefined;
    }
  } else if (id.startsWith('memory:')) {
    const [, questionId, index] = id.split(':');
    const question = MONEY_MEMORY_QUESTIONS.find(
      (item) => item.id === questionId,
    )!;
    const answer = question.options[Number(index)];
    progress = answerMoneyMemoryQuestion(progress, questionId, answer);
    if (answer !== question.correctAnswer) {
      cue = 'retry';
      feedback = 'Not quite. Look again and try another answer.';
    } else feedback = `Correct: ${answer}.`;
  } else {
    if (id === 'complete-money-memory-check' && !isMoneyMemoryReady(progress))
      return { state, cues: [] };
    progress = recordMoneyTownAction(progress, stage.id, id);
    if (id === 'select-coin-side') cue = 'coin-side';
    if (id === 'select-note-side') cue = 'note-side';
  }
  const next = { ...state, progress, feedback, shop };
  const nextActivity = moneyActivity(next);
  const cues = cue ? [cue] : [];
  if (nextActivity.cue !== activity.cue && !nextActivity.ready)
    cues.push(nextActivity.cue);
  return { state: next, cues };
}
