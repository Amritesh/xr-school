export const ACCEPTANCE_HOOKS = Object.freeze({
  launch: 'simulation-launch',
  canvas: 'simulation-canvas',
  stageTitle: 'stage-title',
  stageCue: 'stage-cue',
  primaryAction: 'primary-action',
  feedback: 'feedback',
  narrationReplay: 'narration-replay',
  restart: 'restart',
  completion: 'completion',
} as const);

export type AcceptanceHook =
  (typeof ACCEPTANCE_HOOKS)[keyof typeof ACCEPTANCE_HOOKS];
