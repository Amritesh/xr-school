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
    experience.perform('collect-pollen');
    expect(experience.biologySnapshot().pollenProduced).toBe(true);
    expect(experience.experimentSnapshot().brushPollen).toBe(24);
    expect(() => experience.perform('collect-pollen')).toThrow(/already|current stage|expected/i);

    experience.restart();
    expect(experience.snapshot().stageId).toBe('stage-flower-garden');
    expect(experience.biologySnapshot().pollenProduced).toBe(false);
    expect(experience.experimentSnapshot().brushPollen).toBe(0);
  });

  it('requires the complete treatment/control and planting action sequence', () => {
    const experience = createPollinationExperience();
    const completeStage = (actions: string[], evidenceId: string) => {
      for (const action of actions) experience.perform(action);
      experience.observe(evidenceId);
      experience.next();
    };

    completeStage(['inspect-flower'], 'flower-parts-identified');
    completeStage(['collect-pollen'], 'pollen-collected-on-brush');
    completeStage(['observe-pollinator'], 'bee-flower-visit-observed');
    completeStage(['transfer-pollen'], 'pollen-on-stigma-observed');
    completeStage(['trace-pollen-tube'], 'fertilisation-route-observed');
    completeStage(
      ['advance-time-lapse', 'compare-control'],
      'treatment-control-difference-observed',
    );
    completeStage(
      ['open-fruit', 'plant-seed', 'cover-seed', 'water-seed'],
      'germination-conditions-provided',
    );

    expect(experience.experimentSnapshot()).toMatchObject({
      treatmentFruitFormed: true,
      controlFruitFormed: false,
      germinated: true,
    });
  });
});
