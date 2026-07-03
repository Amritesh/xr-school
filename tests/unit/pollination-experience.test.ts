import { describe, expect, it } from 'vitest';
import {
  createPollinationExperience,
} from '../../apps/web/lib/world-builder/pollinationExperience';

describe('pollination immersive experience', () => {
  it('requires performed action and observed evidence before advancing', () => {
    const experience = createPollinationExperience();
    expect(experience.snapshot().stageId).toBe('stage-flower-garden');
    expect(() => experience.perform('transfer-pollen')).toThrow(/current stage/i);

    experience.perform('inspect-flower');
    experience.observe('flower-parts-identified');
    expect(experience.snapshot().stageComplete).toBe(true);
    experience.next();
    expect(experience.snapshot().stageId).toBe('stage-pollen-production');
  });

  it('applies causal biology once and restarts both state machines', () => {
    const experience = createPollinationExperience();
    experience.perform('inspect-flower');
    experience.observe('flower-parts-identified');
    experience.next();
    experience.perform('release-pollen');
    expect(experience.biologySnapshot().pollenProduced).toBe(true);
    expect(() => experience.perform('release-pollen')).toThrow(/already|expected/i);

    experience.restart();
    expect(experience.snapshot().stageId).toBe('stage-flower-garden');
    expect(experience.biologySnapshot().pollenProduced).toBe(false);
  });
});
