import { describe, expect, it } from 'vitest';
import {
  createSolubilityExperience,
  SOLUBILITY_EXPERIENCE_DEFINITION,
} from '../../apps/web/lib/world-builder/solubilityExperience';

describe('solubility lesson experience', () => {
  it('requires both an action and observed evidence before a stage completes', () => {
    const experience = createSolubilityExperience();
    expect(experience.perform('record-prediction').stageComplete).toBe(false);
    expect(experience.observe('prediction-recorded').stageComplete).toBe(true);
  });

  it('rejects actions that skip the authored investigation', () => {
    const experience = createSolubilityExperience();
    expect(() => experience.perform('classify-unknown')).toThrow(/not permitted/i);
  });

  it('ends with an independent transfer classification', () => {
    const experience = createSolubilityExperience();
    for (const stage of SOLUBILITY_EXPERIENCE_DEFINITION.stages) {
      for (const action of stage.requiredActionIds) experience.perform(action);
      for (const evidence of stage.completionEvidenceIds) experience.observe(evidence);
      if (!experience.snapshot().lessonComplete) experience.next();
    }
    expect(experience.snapshot()).toMatchObject({ lessonComplete: true, stageComplete: true });
    expect(SOLUBILITY_EXPERIENCE_DEFINITION.stages.at(-1)?.requiredActionIds).toContain('classify-unknown');
  });
});
