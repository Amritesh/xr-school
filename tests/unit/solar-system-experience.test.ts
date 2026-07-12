import { describe, expect, it } from 'vitest';
import {
  validateExperienceDefinition,
} from '../../packages/simulation-schema/src/index';
import {
  CORRECT_PREDICTIONS,
  SOLAR_MISCONCEPTIONS,
  SOLAR_SYSTEM_EXPERIENCE_DEFINITION,
  createSolarSystemExperience,
} from '../../apps/web/lib/world-builder/solarSystemExperience';

function completeStage(
  experience: ReturnType<typeof createSolarSystemExperience>,
  actions: string[],
  evidenceId: string,
) {
  for (const action of actions) experience.perform(action);
  experience.observe(evidenceId);
  experience.next();
}

describe('solar system experience', () => {
  it('is a valid experience definition with 8 stages', () => {
    expect(validateExperienceDefinition(SOLAR_SYSTEM_EXPERIENCE_DEFINITION)).toEqual([]);
    expect(SOLAR_SYSTEM_EXPERIENCE_DEFINITION.stages).toHaveLength(8);
  });

  it('rejects actions from other stages', () => {
    const experience = createSolarSystemExperience();
    expect(() => experience.perform('ride-comet')).toThrow(/not permitted/i);
  });

  it('gates each stage on its required action and evidence', () => {
    const experience = createSolarSystemExperience();
    expect(experience.snapshot().stageId).toBe('stage-arrival');
    experience.perform('inspect-sun');
    expect(experience.snapshot().stageComplete).toBe(false);
    experience.observe('system-observed');
    expect(experience.snapshot().stageComplete).toBe(true);
    experience.next();
    expect(experience.snapshot().stageId).toBe('stage-gravity');
  });

  it('walks the full mission to completion', () => {
    const experience = createSolarSystemExperience();
    completeStage(experience, ['inspect-sun'], 'system-observed');
    completeStage(experience, ['toggle-gravity-lens'], 'gravity-visualised');
    completeStage(experience, ['predict-race-winner', 'confirm-race-winner'], 'closer-is-faster');
    completeStage(experience, ['predict-hottest', 'probe-mercury', 'probe-venus'], 'greenhouse-resolved');
    completeStage(experience, ['scan-jupiter', 'scan-saturn', 'scan-uranus', 'scan-neptune'], 'giants-compared');
    completeStage(experience, ['pull-scale-lever', 'find-earth'], 'scale-confronted');
    completeStage(experience, ['predict-comet-tail', 'ride-comet'], 'comet-tail-observed');
    experience.perform('answer-orbit-transfer');
    experience.perform('collect-badge');
    experience.observe('transfer-proved');
    expect(experience.snapshot().lessonComplete).toBe(true);
  });

  it('keeps the first prediction so a wrong guess gets confronted', () => {
    const experience = createSolarSystemExperience();
    const first = experience.recordPrediction('hottest-planet', 'mercury');
    expect(first.correct).toBe(false);
    const second = experience.recordPrediction('hottest-planet', 'venus');
    expect(second.choice).toBe('mercury');
    expect(experience.prediction('hottest-planet')?.correct).toBe(false);
  });

  it('grades predictions against the scientific model', () => {
    expect(CORRECT_PREDICTIONS['race-winner']).toBe('mercury');
    expect(CORRECT_PREDICTIONS['hottest-planet']).toBe('venus');
    expect(CORRECT_PREDICTIONS['comet-tail']).toBe('away-from-sun');
    expect(CORRECT_PREDICTIONS['orbit-transfer']).toBe('longer');
  });

  it('awards mastery only with evidence, a misconception, and a transfer', () => {
    const experience = createSolarSystemExperience();
    expect(experience.summary().masteryMet).toBe(false);

    experience.perform('inspect-sun');
    experience.observe('system-observed');
    experience.next();
    experience.perform('toggle-gravity-lens');
    experience.observe('gravity-visualised');
    expect(experience.summary().masteryMet).toBe(false);
    expect(experience.summary().evidenceCount).toBe(2);

    experience.next();
    experience.perform('predict-race-winner');
    experience.perform('confirm-race-winner');
    experience.observe('closer-is-faster');
    const withMisconception = experience.summary();
    expect(withMisconception.misconceptionsResolved).toContain('closer-is-faster');
    expect(withMisconception.masteryMet).toBe(false);

    // Jump the remaining stages to reach the transfer evidence.
    experience.next();
    completeStage(experience, ['predict-hottest', 'probe-mercury', 'probe-venus'], 'greenhouse-resolved');
    completeStage(experience, ['scan-jupiter', 'scan-saturn', 'scan-uranus', 'scan-neptune'], 'giants-compared');
    completeStage(experience, ['pull-scale-lever', 'find-earth'], 'scale-confronted');
    completeStage(experience, ['predict-comet-tail', 'ride-comet'], 'comet-tail-observed');
    experience.perform('answer-orbit-transfer');
    experience.perform('collect-badge');
    experience.observe('transfer-proved');
    expect(experience.summary().masteryMet).toBe(true);
    expect(experience.summary().transferProved).toBe(true);
  });

  it('resets predictions on restart', () => {
    const experience = createSolarSystemExperience();
    experience.recordPrediction('race-winner', 'mars');
    experience.restart();
    expect(experience.prediction('race-winner')).toBeUndefined();
  });

  it('names every misconception as evidence in a stage', () => {
    const allEvidence = SOLAR_SYSTEM_EXPERIENCE_DEFINITION.stages
      .flatMap(stage => stage.completionEvidenceIds);
    for (const misconceptionId of Object.keys(SOLAR_MISCONCEPTIONS)) {
      expect(allEvidence).toContain(misconceptionId);
    }
  });
});
