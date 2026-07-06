import { describe, expect, it } from 'vitest';
import { createAcidBaseExperience } from '../../apps/web/lib/world-builder/acidBaseExperience';

describe('acids and bases experience', () => {
  it('gates each stage on its action and evidence', () => {
    const experience = createAcidBaseExperience();
    expect(experience.snapshot().stageId).toBe('stage-test-acid');
    expect(() => experience.perform('add-base')).toThrow(/current stage/i);

    experience.perform('test-acid-litmus');
    experience.observe('acid-identified');
    expect(experience.snapshot().stageComplete).toBe(true);
    experience.next();
    expect(experience.snapshot().stageId).toBe('stage-test-base');
  });

  it('walks the full test/indicator/neutralise/compare sequence to completion', () => {
    const experience = createAcidBaseExperience();
    const complete = (action: string, evidence: string) => {
      experience.perform(action);
      experience.observe(evidence);
      experience.next();
    };
    complete('test-acid-litmus', 'acid-identified');
    complete('test-base-litmus', 'base-identified');
    complete('add-indicator', 'ph-colour-observed');
    complete('add-base', 'neutralisation-observed');

    experience.perform('compare-solutions');
    experience.observe('comparison-recorded');
    expect(experience.snapshot().lessonComplete).toBe(true);
  });

  it('restarts to the first stage', () => {
    const experience = createAcidBaseExperience();
    experience.perform('test-acid-litmus');
    experience.observe('acid-identified');
    experience.next();
    experience.restart();
    expect(experience.snapshot().stageId).toBe('stage-test-acid');
    expect(experience.snapshot().performedActionIds).toHaveLength(0);
  });
});
