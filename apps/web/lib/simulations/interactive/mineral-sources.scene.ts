import { MINERAL_CASES } from '@xr-school/simulation-runtime';
import { createNutritionMatchSceneAdapter } from './nutrition-match.scene';

const slug = 'c6-ch02-a05-the-sources-of-minerals-in-food';

export function createMineralSourcesSceneAdapter() {
  return createNutritionMatchSceneAdapter({
    id: 'interactive-mineral-sources-scene',
    slug,
    accent: '#0ea5e9',
    cases: MINERAL_CASES,
    kind: 'mineral',
  });
}

export default createMineralSourcesSceneAdapter();
