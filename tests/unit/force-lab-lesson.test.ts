import { describe, expect, it } from 'vitest';
import {
  FORCE_LAB_SCENES,
  QUIZ,
  createForceLabState,
  forceLabCanContinue,
  forceLabPrompt,
  reduceForceLab,
  type ForceLabAction,
  type ForceLabState,
} from '../../apps/web/lib/forceLabLesson';

const apply = (state: ForceLabState, ...actions: ForceLabAction[]) =>
  actions.reduce(reduceForceLab, state);
const go: ForceLabAction = { type: 'continue' };

const storeDone = () =>
  apply(
    createForceLabState(),
    { type: 'push-trolley' },
    { type: 'pull-wagon' },
    { type: 'predict-door', option: 'pull' },
    { type: 'open-door' },
    { type: 'close-door' },
  );
const atPlayground = () => apply(storeDone(), go);
const playgroundDone = () =>
  apply(
    atPlayground(),
    { type: 'predict-kick', option: 'strong' },
    { type: 'kick', ballSpeed: 1.2 },
    { type: 'kick', ballSpeed: 3.6 },
    { type: 'side-tap', directionChange: 35 },
  );
const atFriction = () => apply(playgroundDone(), go);
const frictionDone = () =>
  apply(
    atFriction(),
    { type: 'predict-friction', option: 'rough' },
    { type: 'release-car', surface: 'tile', distance: 2.4 },
    { type: 'release-car', surface: 'carpet', distance: 0.9 },
  );
const atWall = () => apply(frictionDone(), go);
const wallDone = () =>
  apply(
    atWall(),
    { type: 'predict-bounce', option: 'back' },
    { type: 'wall-bounce', directionChange: 160 },
    { type: 'racket-hit', directionChange: 90 },
  );

describe('force lab lesson', () => {
  it('runs four scenes then a quiz', () => {
    expect(FORCE_LAB_SCENES).toEqual(['store', 'playground', 'friction', 'wall', 'quiz']);
    expect(createForceLabState().scene).toBe('store');
  });

  it('needs every store action before continuing, and the door must be opened before it is closed', () => {
    const partial = apply(createForceLabState(), { type: 'push-trolley' });
    expect(forceLabCanContinue(partial)).toBe(false);
    expect(reduceForceLab(partial, go).scene).toBe('store');
    const earlyClose = apply(partial, { type: 'close-door' });
    expect(earlyClose.store.doorClosed).toBe(false);
    expect(forceLabCanContinue(storeDone())).toBe(true);
  });

  it('records the door prediction and says which force opened it', () => {
    const wrong = apply(createForceLabState(), { type: 'predict-door', option: 'push' }, { type: 'open-door' });
    expect(wrong.feedback).toMatch(/pull/i);
  });

  it('sorts kicks into gentle and strong by ball speed', () => {
    const state = apply(atPlayground(), { type: 'predict-kick', option: 'gentle' }, { type: 'kick', ballSpeed: 1.2 });
    expect(state.playground.gentleSpeed).toBe(1.2);
    expect(state.playground.strongSpeed).toBeNull();
    expect(forceLabCanContinue(state)).toBe(false);
    expect(forceLabPrompt(apply(state, { type: 'kick', ballSpeed: 3.6 }))).toMatch(/strong/i);
  });

  it('only counts a side tap once the ball is moving, and only if the direction changed', () => {
    const still = apply(atPlayground(), { type: 'side-tap', directionChange: 40 });
    expect(still.playground.directionChanged).toBe(false);
    const tiny = apply(atPlayground(), { type: 'kick', ballSpeed: 2 }, { type: 'side-tap', directionChange: 3 });
    expect(tiny.playground.directionChanged).toBe(false);
    expect(forceLabCanContinue(playgroundDone())).toBe(true);
  });

  it('asks for a friction prediction before any release', () => {
    const early = apply(atFriction(), { type: 'release-car', surface: 'tile', distance: 2.4 });
    expect(early.friction.smoothDistance).toBeNull();
    expect(early.feedback).toMatch(/guess/i);
  });

  it('compares both lanes and tells the truth about the guess', () => {
    const state = frictionDone();
    expect(forceLabCanContinue(state)).toBe(true);
    expect(forceLabPrompt(state)).toMatch(/friction/i);
    const wrongGuess = apply(
      atFriction(),
      { type: 'predict-friction', option: 'smooth' },
      { type: 'release-car', surface: 'tile', distance: 2.4 },
      { type: 'release-car', surface: 'carpet', distance: 0.9 },
    );
    expect(forceLabPrompt(wrongGuess)).toMatch(/rough carpet/i);
  });

  it('needs a real change of direction at the wall and with the racket', () => {
    const glance = apply(atWall(), { type: 'predict-bounce', option: 'back' }, { type: 'wall-bounce', directionChange: 40 });
    expect(glance.wall.bounced).toBe(false);
    expect(forceLabCanContinue(wallDone())).toBe(true);
  });

  it('keeps progress when going back', () => {
    const back = apply(atFriction(), { type: 'back' });
    expect(back.scene).toBe('playground');
    expect(back.playground.strongSpeed).toBe(3.6);
  });

  it('runs a three-question quiz that retries wrong answers with a hint', () => {
    expect(QUIZ).toHaveLength(3);
    let state = apply(wallDone(), go);
    expect(state.scene).toBe('quiz');
    const wrong = (QUIZ[0]!.correct + 1) % QUIZ[0]!.options.length;
    state = reduceForceLab(state, { type: 'answer', option: wrong });
    expect(state.quiz.current).toBe(0);
    expect(state.feedback).toBeTruthy();
    for (const question of QUIZ) state = reduceForceLab(state, { type: 'answer', option: question.correct });
    expect(state.quiz.complete).toBe(true);
    expect(QUIZ.map(q => q.options[q.correct])).toEqual(['Push', 'Rough carpet', 'Its direction']);
  });

  it('ignores actions that belong to another scene', () => {
    const state = apply(createForceLabState(), { type: 'kick', ballSpeed: 3 });
    expect(state.playground.strongSpeed).toBeNull();
  });
});
