import { describe, expect, it } from 'vitest';

import { ACCEPTANCE_HOOKS } from '../../apps/web/components/simulation-experience/acceptanceHooks';

describe('simulation acceptance hooks', () => {
  it('keeps one unique cross-class browser contract', () => {
    expect(ACCEPTANCE_HOOKS).toEqual({
      launch: 'simulation-launch',
      canvas: 'simulation-canvas',
      stageTitle: 'stage-title',
      stageCue: 'stage-cue',
      primaryAction: 'primary-action',
      feedback: 'feedback',
      narrationReplay: 'narration-replay',
      restart: 'restart',
      completion: 'completion',
    });
    expect(new Set(Object.values(ACCEPTANCE_HOOKS)).size).toBe(9);
  });
});
