import { FORCE_LAB } from './forceLabPhysics';

export const FORCE_LAB_SCENES = ['store', 'playground', 'friction', 'wall', 'quiz'] as const;
export type ForceLabSceneId = (typeof FORCE_LAB_SCENES)[number];

export type DoorOption = 'push' | 'pull';
export type KickOption = 'gentle' | 'strong';
export type FrictionOption = 'smooth' | 'rough' | 'same';
export type BounceOption = 'back' | 'through' | 'stop';
export type Surface = 'tile' | 'carpet';

/** A real change of direction, not a wobble. */
const TAP_MIN_DEGREES = 15;
const BOUNCE_MIN_DEGREES = 90;
const RACKET_MIN_DEGREES = 20;

export const QUIZ = [
  {
    question: 'Riya moves the shopping trolley away from her. Is that a push or a pull?',
    options: ['Push', 'Pull'],
    correct: 0,
    hint: 'Moving something away from you is a push.',
  },
  {
    question: 'The same toy car is released from the same height. Where does it stop sooner?',
    options: ['Smooth tiles', 'Rough carpet', 'Both the same'],
    correct: 1,
    hint: 'Rough carpet has more friction, so the car slows down faster.',
  },
  {
    question: 'A rolling ball hits a wall and bounces back. What did the force from the wall change?',
    options: ['Its colour', 'Its direction', 'Its size'],
    correct: 1,
    hint: 'The wall pushed on the ball and sent it the other way.',
  },
] as const;

export type ForceLabAction =
  | { type: 'continue' }
  | { type: 'back' }
  | { type: 'push-trolley' }
  | { type: 'pull-wagon' }
  | { type: 'predict-door'; option: DoorOption }
  | { type: 'open-door' }
  | { type: 'close-door' }
  | { type: 'predict-kick'; option: KickOption }
  | { type: 'kick'; ballSpeed: number }
  | { type: 'side-tap'; directionChange: number }
  | { type: 'predict-friction'; option: FrictionOption }
  | { type: 'release-car'; surface: Surface; distance: number }
  | { type: 'predict-bounce'; option: BounceOption }
  | { type: 'wall-bounce'; directionChange: number }
  | { type: 'racket-hit'; directionChange: number }
  | { type: 'answer'; option: number };

export interface ForceLabState {
  readonly scene: ForceLabSceneId;
  readonly store: {
    trolleyPushed: boolean;
    wagonPulled: boolean;
    doorPrediction: DoorOption | null;
    doorOpened: boolean;
    doorClosed: boolean;
  };
  readonly playground: {
    prediction: KickOption | null;
    gentleSpeed: number | null;
    strongSpeed: number | null;
    directionChanged: boolean;
  };
  readonly friction: {
    prediction: FrictionOption | null;
    smoothDistance: number | null;
    roughDistance: number | null;
  };
  readonly wall: { prediction: BounceOption | null; bounced: boolean; hit: boolean };
  readonly quiz: { current: number; complete: boolean };
  readonly feedback: string | null;
}

export function createForceLabState(): ForceLabState {
  return {
    scene: 'store',
    store: { trolleyPushed: false, wagonPulled: false, doorPrediction: null, doorOpened: false, doorClosed: false },
    playground: { prediction: null, gentleSpeed: null, strongSpeed: null, directionChanged: false },
    friction: { prediction: null, smoothDistance: null, roughDistance: null },
    wall: { prediction: null, bounced: false, hit: false },
    quiz: { current: 0, complete: false },
    feedback: null,
  };
}

export function forceLabCanContinue(state: ForceLabState): boolean {
  switch (state.scene) {
    case 'store': {
      const s = state.store;
      return s.trolleyPushed && s.wagonPulled && s.doorOpened && s.doorClosed;
    }
    case 'playground': {
      const p = state.playground;
      return p.gentleSpeed !== null && p.strongSpeed !== null && p.directionChanged;
    }
    case 'friction':
      return state.friction.smoothDistance !== null && state.friction.roughDistance !== null;
    case 'wall':
      return state.wall.bounced && state.wall.hit;
    case 'quiz':
      return false;
  }
}

const valid = (value: number) => Number.isFinite(value) && value >= 0;

export function reduceForceLab(state: ForceLabState, action: ForceLabAction): ForceLabState {
  const base = { ...state, feedback: null };
  const index = FORCE_LAB_SCENES.indexOf(state.scene);
  const at = (scene: ForceLabSceneId) => state.scene === scene;

  switch (action.type) {
    case 'continue': {
      const next = FORCE_LAB_SCENES[index + 1];
      if (!next) return base;
      if (!forceLabCanContinue(state)) return { ...state, feedback: 'Try the activity first.' };
      return { ...base, scene: next };
    }
    case 'back':
      return { ...base, scene: FORCE_LAB_SCENES[Math.max(0, index - 1)]! };

    case 'push-trolley':
      return at('store') ? { ...base, store: { ...state.store, trolleyPushed: true } } : state;
    case 'pull-wagon':
      return at('store') ? { ...base, store: { ...state.store, wagonPulled: true } } : state;
    case 'predict-door':
      return at('store') ? { ...base, store: { ...state.store, doorPrediction: action.option } } : state;
    case 'open-door': {
      if (!at('store')) return state;
      const guessedWrong = state.store.doorPrediction === 'push';
      return {
        ...base,
        store: { ...state.store, doorOpened: true },
        feedback: guessedWrong
          ? 'This door opens towards you, so opening it was a pull.'
          : 'Yes, you pulled the door open.',
      };
    }
    case 'close-door':
      if (!at('store') || !state.store.doorOpened) return state;
      return { ...base, store: { ...state.store, doorClosed: true }, feedback: 'And you pushed it shut.' };

    case 'predict-kick':
      return at('playground') ? { ...base, playground: { ...state.playground, prediction: action.option } } : state;
    case 'kick': {
      if (!at('playground') || !valid(action.ballSpeed)) return state;
      const strong = action.ballSpeed >= FORCE_LAB.kick.strongBallSpeed;
      return {
        ...base,
        playground: strong
          ? { ...state.playground, strongSpeed: action.ballSpeed }
          : { ...state.playground, gentleSpeed: action.ballSpeed },
      };
    }
    case 'side-tap': {
      if (!at('playground')) return state;
      const moving = state.playground.gentleSpeed !== null || state.playground.strongSpeed !== null;
      if (!moving) return { ...base, feedback: 'Kick the ball first, then tap it as it rolls.' };
      if (!(action.directionChange >= TAP_MIN_DEGREES)) {
        return { ...base, feedback: 'Tap it from the side to change its direction.' };
      }
      return { ...base, playground: { ...state.playground, directionChanged: true } };
    }

    case 'predict-friction':
      return at('friction') ? { ...base, friction: { ...state.friction, prediction: action.option } } : state;
    case 'release-car': {
      if (!at('friction') || !valid(action.distance)) return state;
      if (!state.friction.prediction) return { ...base, feedback: 'Make your guess first.' };
      return {
        ...base,
        friction:
          action.surface === 'tile'
            ? { ...state.friction, smoothDistance: action.distance }
            : { ...state.friction, roughDistance: action.distance },
      };
    }

    case 'predict-bounce':
      return at('wall') ? { ...base, wall: { ...state.wall, prediction: action.option } } : state;
    case 'wall-bounce':
      if (!at('wall')) return state;
      return action.directionChange >= BOUNCE_MIN_DEGREES
        ? { ...base, wall: { ...state.wall, bounced: true } }
        : { ...base, feedback: 'Roll the ball straight at the wall.' };
    case 'racket-hit':
      if (!at('wall')) return state;
      return action.directionChange >= RACKET_MIN_DEGREES
        ? { ...base, wall: { ...state.wall, hit: true } }
        : { ...base, feedback: 'Swing to send the ball somewhere new.' };

    case 'answer': {
      if (!at('quiz') || state.quiz.complete) return state;
      const question = QUIZ[state.quiz.current]!;
      if (action.option !== question.correct) return { ...base, feedback: question.hint };
      const next = state.quiz.current + 1;
      return {
        ...base,
        quiz: { current: Math.min(next, QUIZ.length - 1), complete: next >= QUIZ.length },
        feedback: 'Correct!',
      };
    }
  }
}

const metres = (value: number) => `${value.toFixed(1)} m`;

export function forceLabPrompt(state: ForceLabState): string {
  switch (state.scene) {
    case 'store': {
      const s = state.store;
      if (!s.trolleyPushed) return 'Grab the trolley handle and push it to the counter.';
      if (!s.wagonPulled) return 'Now grab the wagon handle and pull it to the bread shelf.';
      if (!s.doorPrediction) return 'To open this door, will you push it or pull it?';
      if (!s.doorOpened) return 'Try it: open the door.';
      if (!s.doorClosed) return 'Now close the door.';
      return 'Every push and every pull is a force, and every force acts in a direction.';
    }
    case 'playground': {
      const p = state.playground;
      if (!p.prediction) return 'Which kick will make the ball go faster: a gentle kick or a strong kick?';
      if (p.gentleSpeed === null) return 'Swing your hand gently through the ball.';
      if (p.strongSpeed === null) return 'Now swing hard!';
      if (!p.directionChanged) {
        return `The strong kick was faster: ${p.strongSpeed.toFixed(1)} m/s against ${p.gentleSpeed.toFixed(1)} m/s. Now tap the rolling ball from the side.`;
      }
      return 'A force can start motion, change speed and change direction.';
    }
    case 'friction': {
      const f = state.friction;
      if (!f.prediction) return 'Will the car stop sooner on the smooth tiles, on the rough carpet, or the same?';
      if (f.smoothDistance === null && f.roughDistance === null) {
        return 'Place the car on the line and let go, without pushing. Try both lanes.';
      }
      if (f.smoothDistance === null || f.roughDistance === null) return 'Now try the other lane.';
      const right = f.prediction === 'rough';
      return `Smooth tiles: ${metres(f.smoothDistance)}. Rough carpet: ${metres(f.roughDistance)}. ${
        right ? 'Your guess was right!' : 'It stopped sooner on the rough carpet.'
      } Friction acts where surfaces touch and works against motion. Rough surfaces have more friction.`;
    }
    case 'wall': {
      const w = state.wall;
      if (!w.prediction) return 'Where will the ball go after it hits the wall?';
      if (!w.bounced) return 'Roll the ball at the wall.';
      if (!w.hit) return 'The wall pushed back and changed the ball’s direction. Now hit the rolling ball with the racket.';
      return 'A force can change the direction of a moving object.';
    }
    case 'quiz':
      return state.quiz.complete
        ? 'Well done! You know what forces do.'
        : QUIZ[state.quiz.current]!.question;
  }
}
