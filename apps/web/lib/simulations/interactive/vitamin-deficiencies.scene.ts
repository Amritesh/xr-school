import { VITAMIN_CASES } from '@xr-school/simulation-runtime';
import { createNutritionMatchSceneAdapter } from './nutrition-match.scene';

const slug = 'c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies';

export function createVitaminDeficienciesSceneAdapter() {
  return createNutritionMatchSceneAdapter({
    id: 'interactive-vitamin-deficiencies-scene',
    slug,
    accent: '#a855f7',
    cases: VITAMIN_CASES,
    kind: 'vitamin',
  });
}

export default createVitaminDeficienciesSceneAdapter();
