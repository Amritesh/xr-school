import { describe, expect, it } from 'vitest';
import {
  createBreathingExperience,
} from '../../apps/web/lib/world-builder/breathingExperience';

describe('breathing process experience', () => {
  it('requires performed action and observed evidence before advancing', () => {
    const experience = createBreathingExperience();
    expect(experience.snapshot().stageId).toBe('stage-airway');
    expect(() => experience.perform('trigger-inhale')).toThrow(/current stage/i);

    experience.perform('inspect-airway');
    experience.observe('airway-path-identified');
    expect(experience.snapshot().stageComplete).toBe(true);
    experience.next();
    expect(experience.snapshot().stageId).toBe('stage-lungs-diaphragm');
  });

  it('requires both lungs and diaphragm to be inspected before that stage completes', () => {
    const experience = createBreathingExperience();
    experience.perform('inspect-airway');
    experience.observe('airway-path-identified');
    experience.next();

    experience.perform('inspect-lungs');
    expect(experience.snapshot().stageComplete).toBe(false);
    experience.perform('inspect-diaphragm');
    expect(experience.snapshot().stageComplete).toBe(false);
    experience.observe('lungs-diaphragm-identified');
    expect(experience.snapshot().stageComplete).toBe(true);
  });

  it('walks the full inhale/exhale/alveoli/compare sequence to lesson completion', () => {
    const experience = createBreathingExperience();
    const completeStage = (actions: string[], evidenceId: string) => {
      for (const action of actions) experience.perform(action);
      experience.observe(evidenceId);
      experience.next();
    };

    completeStage(['inspect-airway'], 'airway-path-identified');
    completeStage(['inspect-lungs', 'inspect-diaphragm'], 'lungs-diaphragm-identified');
    completeStage(['trigger-inhale'], 'inhale-mechanics-observed');
    completeStage(['trigger-exhale'], 'exhale-mechanics-observed');
    completeStage(['inspect-alveoli'], 'gas-exchange-observed');

    experience.perform('compare-breathing-cycle');
    experience.observe('breathing-cycle-compared');
    expect(experience.snapshot().lessonComplete).toBe(true);
  });

  it('restarts back to the first stage with no performed actions', () => {
    const experience = createBreathingExperience();
    experience.perform('inspect-airway');
    experience.observe('airway-path-identified');
    experience.next();

    experience.restart();
    expect(experience.snapshot().stageId).toBe('stage-airway');
    expect(experience.snapshot().performedActionIds).toHaveLength(0);
  });
});
