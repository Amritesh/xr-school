import { describe, expect, it } from 'vitest';
import {
  actInMoneyTown,
  initialMoneyTownState,
  moneyActivity,
  moveMoneyTown,
} from '../../apps/web/lib/moneyTownActivity';

function act(state: ReturnType<typeof initialMoneyTownState>, id: string) {
  return actInMoneyTown(state, id).state;
}

describe('Money Town shared browser and VR activity state', () => {
  it('rejects hidden or stale actions and gates forward navigation', () => {
    const state = initialMoneyTownState();
    expect(moveMoneyTown(state, 1).stage).toBe(0);
    expect(act(state, 'complete-money-memory-check')).toBe(state);
    const entered = act(state, 'enter-money-town');
    expect(moveMoneyTown(entered, 1).stage).toBe(1);
  });

  it('shows one denomination at a time in learning and at most four quiz choices', () => {
    let state = act(initialMoneyTownState(), 'enter-money-town');
    state = moveMoneyTown(state, 1);
    let activity = moneyActivity(state);
    expect(activity.specimen).toBe('coin-rs-1');
    expect(activity.options).toHaveLength(1);
    state = act(state, activity.options[0].id);
    expect(moneyActivity(state).specimen).toBe('coin-rs-2');
  });

  it('requires an item and exact payment before recording a purchase', () => {
    let state = initialMoneyTownState();
    state = { ...state, stage: 5 };
    expect(act(state, 'pay:fruit-apple:coin-rs-10')).toBe(state);
    state = act(state, 'shop:fruit-apple');
    const wrong = act(state, 'pay:fruit-apple:coin-rs-5');
    expect(
      wrong.progress.completedActions['shopping-challenge'],
    ).toBeUndefined();
    const paid = act(wrong, 'pay:fruit-apple:note-rs-10');
    expect(paid.progress.completedActions['shopping-challenge']).toEqual([
      'buy-fruit-apple',
    ]);
  });

  it('keeps a wrong memory question active and never exposes Finish early', () => {
    let state = { ...initialMoneyTownState(), stage: 6 };
    const before = moneyActivity(state);
    expect(
      before.options.some(
        (option) => option.id === 'complete-money-memory-check',
      ),
    ).toBe(false);
    state = act(state, 'memory:what-rs-5:0');
    expect(moneyActivity(state).cue).toBe('what-rs-5');
    expect(state.progress.memoryAnswers['what-rs-5']).toBe('Rs 1 Coin');
    expect(moveMoneyTown(state, 1).stage).toBe(6);
  });
});
