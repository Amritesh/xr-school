import { describe, expect, it } from 'vitest';
import {
  DIGESTIVE_AUDIO_REQUIREMENTS,
  DIGESTIVE_CLASSROOM_FEATURES,
  DIGESTIVE_EDUCATIONAL_OBJECTIVES,
  DIGESTIVE_HEALTHY_SORT_ACTIONS,
  DIGESTIVE_IMMERSION_REQUIREMENTS,
  DIGESTIVE_PATHWAY,
  DIGESTIVE_PERFORMANCE_TARGETS,
  DIGESTIVE_QUIZ_QUESTIONS,
  DIGESTIVE_STAGES,
  DIGESTIVE_VR_FEATURES,
  answerQuizQuestion,
  createDigestiveProgress,
  getQuizScore,
  hasDigestiveExplorerBadge,
  isStageComplete,
  recordStageAction,
} from '../../apps/web/lib/digestiveLesson';

describe('digestive system lesson model', () => {
  it('defines the complete ten-stage lesson and canonical food pathway', () => {
    expect(DIGESTIVE_STAGES.map(stage => stage.id)).toEqual([
      'welcome',
      'mouth',
      'esophagus',
      'stomach',
      'supporting-organs',
      'small-intestine',
      'large-intestine',
      'rectum-anus',
      'healthy-habits',
      'recap',
    ]);
    expect(DIGESTIVE_PATHWAY).toEqual([
      'Mouth',
      'Esophagus',
      'Stomach',
      'Small Intestine',
      'Large Intestine',
      'Rectum',
      'Anus',
    ]);
  });

  it('captures the attached Class 5 Quest 3S simulation brief', () => {
    expect(DIGESTIVE_CLASSROOM_FEATURES).toContain('Large interactive smart board');
    expect(DIGESTIVE_CLASSROOM_FEATURES).toContain('Digestive system hologram');
    expect(DIGESTIVE_CLASSROOM_FEATURES).toContain('Glowing shrink portal for the journey into the mouth');
    expect(DIGESTIVE_CLASSROOM_FEATURES).toContain('Spatial science-room ambience without student NPCs');
    expect(DIGESTIVE_CLASSROOM_FEATURES).not.toContain('20 student desks with animated students');
    expect(DIGESTIVE_AUDIO_REQUIREMENTS).toContain('Slow clear Class 5 English voice');
    expect(DIGESTIVE_AUDIO_REQUIREMENTS).toContain('Applause on correct quiz answers');
    expect(DIGESTIVE_VR_FEATURES).toContain('Meta Quest 3S controller support');
    expect(DIGESTIVE_VR_FEATURES).toContain('Hand tracking for grab, point, and interact');
    expect(DIGESTIVE_EDUCATIONAL_OBJECTIVES).toContain('Understand nutrient and water absorption');
  });

  it('captures the professional immersive redesign feedback', () => {
    expect(DIGESTIVE_IMMERSION_REQUIREMENTS).toContain(
      'No student NPCs are present; only the user, AI teacher guide, digestive system, and interactive objects',
    );
    expect(DIGESTIVE_IMMERSION_REQUIREMENTS).toContain(
      'The user travels inside the digestive system instead of watching floating models',
    );
    expect(DIGESTIVE_IMMERSION_REQUIREMENTS).toContain(
      'Quiz uses floating holographic cards with green success, particles, applause, explanation, and retry',
    );
    expect(DIGESTIVE_PERFORMANCE_TARGETS).toContain('Target Meta Quest 3S at 72-90 FPS');
  });

  it('keeps each level scripted for an 8-10 minute teacher-led journey', () => {
    const totalDuration = DIGESTIVE_STAGES.reduce(
      (seconds, stage) => seconds + stage.durationSeconds,
      0,
    );

    expect(totalDuration).toBeGreaterThanOrEqual(480);
    expect(totalDuration).toBeLessThanOrEqual(600);
    for (const stage of DIGESTIVE_STAGES) {
      expect(stage.teacherNarration.length).toBeGreaterThan(60);
      expect(stage.interactionPrompt.length).toBeGreaterThan(20);
      expect(stage.cinematicTransition.length).toBeGreaterThan(35);
      expect(stage.visualTreatment.length).toBeGreaterThan(35);
      expect(stage.spatialAudioProfile.length).toBeGreaterThan(30);
      expect(stage.soundCues.length).toBeGreaterThan(0);
    }
    expect(DIGESTIVE_STAGES[0].teacherNarration).toContain('Hello students!');
    expect(DIGESTIVE_STAGES.find(stage => stage.id === 'mouth')?.visualTreatment).toContain('Inside-mouth environment');
    expect(DIGESTIVE_STAGES.find(stage => stage.id === 'small-intestine')?.visualTreatment).toContain('largest');
  });

  it('uses the requested healthy and unhealthy food sorting table', () => {
    const healthyHabits = DIGESTIVE_STAGES.find(stage => stage.id === 'healthy-habits');

    expect(healthyHabits?.requiredActionIds).toEqual(DIGESTIVE_HEALTHY_SORT_ACTIONS);
    expect(DIGESTIVE_HEALTHY_SORT_ACTIONS).toEqual([
      'sort-apple-healthy',
      'sort-pizza-unhealthy',
      'sort-milk-healthy',
      'sort-chips-unhealthy',
      'sort-banana-healthy',
      'sort-burger-unhealthy',
      'sort-water-healthy',
      'sort-soft-drink-unhealthy',
    ]);
  });

  it('requires every distinct peristalsis wave before completing the esophagus stage', () => {
    let progress = createDigestiveProgress();
    progress = recordStageAction(progress, 'esophagus', 'peristalsis-wave-1');
    progress = recordStageAction(progress, 'esophagus', 'peristalsis-wave-2');

    expect(isStageComplete(progress, 'esophagus')).toBe(false);

    progress = recordStageAction(progress, 'esophagus', 'peristalsis-wave-3');
    expect(isStageComplete(progress, 'esophagus')).toBe(true);
  });

  it('does not count a repeated action as new evidence', () => {
    let progress = createDigestiveProgress();
    progress = recordStageAction(progress, 'small-intestine', 'absorb-nutrient-1');
    progress = recordStageAction(progress, 'small-intestine', 'absorb-nutrient-1');

    expect(progress.completedActions['small-intestine']).toEqual(['absorb-nutrient-1']);
    expect(isStageComplete(progress, 'small-intestine')).toBe(false);
  });

  it('requires inspecting the liver, gallbladder, and pancreas', () => {
    let progress = createDigestiveProgress();
    progress = recordStageAction(progress, 'supporting-organs', 'inspect-liver');
    progress = recordStageAction(progress, 'supporting-organs', 'inspect-gallbladder');
    expect(isStageComplete(progress, 'supporting-organs')).toBe(false);

    progress = recordStageAction(progress, 'supporting-organs', 'inspect-pancreas');
    expect(isStageComplete(progress, 'supporting-organs')).toBe(true);
  });

  it('rejects actions that do not belong to the selected stage', () => {
    expect(() => recordStageAction(
      createDigestiveProgress(),
      'mouth',
      'inspect-liver',
    )).toThrow(/not valid for stage/);
  });

  it('scores all five recap questions', () => {
    expect(DIGESTIVE_QUIZ_QUESTIONS).toHaveLength(5);
    let progress = createDigestiveProgress();
    for (const [questionId, answerId] of [
      ['digestion-begins', 'mouth'],
      ['mixes-food', 'stomach'],
      ['absorbs-nutrients', 'small-intestine'],
      ['absorbs-water', 'large-intestine'],
      ['produces-bile', 'liver'],
    ] as const) {
      progress = answerQuizQuestion(progress, questionId, answerId);
    }

    expect(getQuizScore(progress)).toEqual({ correct: 5, total: 5 });
  });

  it('awards the badge for complete participation even with a quiz mistake', () => {
    let progress = createDigestiveProgress();
    for (const stage of DIGESTIVE_STAGES) {
      for (const actionId of stage.requiredActionIds) {
        progress = recordStageAction(progress, stage.id, actionId);
      }
    }
    for (const question of DIGESTIVE_QUIZ_QUESTIONS) {
      const answer = question.id === 'produces-bile'
        ? 'gallbladder'
        : question.correctAnswerId;
      progress = answerQuizQuestion(progress, question.id, answer);
    }

    expect(getQuizScore(progress)).toEqual({ correct: 4, total: 5 });
    expect(hasDigestiveExplorerBadge(progress)).toBe(true);
  });

  it('withholds the badge until every quiz question is attempted', () => {
    let progress = createDigestiveProgress();
    for (const stage of DIGESTIVE_STAGES) {
      for (const actionId of stage.requiredActionIds) {
        progress = recordStageAction(progress, stage.id, actionId);
      }
    }
    for (const question of DIGESTIVE_QUIZ_QUESTIONS.slice(0, 4)) {
      progress = answerQuizQuestion(progress, question.id, question.correctAnswerId);
    }

    expect(hasDigestiveExplorerBadge(progress)).toBe(false);
  });
});
