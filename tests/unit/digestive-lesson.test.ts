import { describe, expect, it } from 'vitest';
import {
  DIGESTIVE_PATHWAY,
  DIGESTIVE_QUIZ_QUESTIONS,
  DIGESTIVE_STAGES,
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
