import { describe, expect, it } from 'vitest';
import {
  createForceMotionExperience,
} from '../../apps/web/lib/world-builder/forceMotionExperience';

describe('force and motion experience', () => {
  it('requires performed action and observed evidence before advancing', () => {
    const experience = createForceMotionExperience();
    expect(experience.snapshot().stageId).toBe('stage-push');
    expect(() => experience.perform('apply-brake')).toThrow(/current stage/i);

    experience.perform('apply-push');
    experience.observe('motion-started');
    expect(experience.snapshot().stageComplete).toBe(true);
    experience.next();
    expect(experience.snapshot().stageId).toBe('stage-brake');
  });

  it('requires both squeeze and release before the shape stage completes', () => {
    const experience = createForceMotionExperience();
    const completeStage = (actions: string[], evidenceId: string) => {
      for (const action of actions) experience.perform(action);
      experience.observe(evidenceId);
      experience.next();
    };
    completeStage(['apply-push'], 'motion-started');
    completeStage(['apply-brake'], 'motion-stopped');
    completeStage(['apply-accelerate'], 'speed-increased');
    completeStage(['apply-deflect'], 'direction-changed');

    expect(experience.snapshot().stageId).toBe('stage-shape');
    experience.perform('squeeze-ball');
    expect(experience.snapshot().stageComplete).toBe(false);
    experience.perform('release-ball');
    expect(experience.snapshot().stageComplete).toBe(false);
    experience.observe('shape-changed');
    expect(experience.snapshot().stageComplete).toBe(true);
  });

  it('walks the full push/brake/accelerate/deflect/shape/compare sequence to lesson completion', () => {
    const experience = createForceMotionExperience();
    const completeStage = (actions: string[], evidenceId: string) => {
      for (const action of actions) experience.perform(action);
      experience.observe(evidenceId);
      experience.next();
    };

    completeStage(['apply-push'], 'motion-started');
    completeStage(['apply-brake'], 'motion-stopped');
    completeStage(['apply-accelerate'], 'speed-increased');
    completeStage(['apply-deflect'], 'direction-changed');
    completeStage(['squeeze-ball', 'release-ball'], 'shape-changed');

    experience.perform('compare-motion-effects');
    experience.observe('effects-compared');
    expect(experience.snapshot().lessonComplete).toBe(true);
  });

  it('restarts back to the first stage with no performed actions', () => {
    const experience = createForceMotionExperience();
    experience.perform('apply-push');
    experience.observe('motion-started');
    experience.next();

    experience.restart();
    expect(experience.snapshot().stageId).toBe('stage-push');
    expect(experience.snapshot().performedActionIds).toHaveLength(0);
  });
});
