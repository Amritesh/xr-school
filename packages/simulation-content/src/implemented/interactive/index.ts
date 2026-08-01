export { FLOAT_OR_SINK } from './floatOrSink.js';
export { SOLUBILITY } from './solubility.js';
export { LIPID_TEST } from './lipidTest.js';
export { MINERAL_SOURCES } from './mineralSources.js';
export { VITAMIN_DEFICIENCIES } from './vitaminDeficiencies.js';
export { SHAPE_SORTING } from './shapeSorting.js';
export {
  INTERACTIVE_CLASS6_CHAPTER_IDS,
  INTERACTIVE_CLASS6_CONCEPT_IDS,
  INTERACTIVE_CLASS6_SIMULATION_IDS,
  INTERACTIVE_CURRICULUM_CHAPTERS,
  INTERACTIVE_LEARNING_CONCEPTS,
} from './curriculum.js';

import { FLOAT_OR_SINK } from './floatOrSink.js';
import { SOLUBILITY } from './solubility.js';
import { LIPID_TEST } from './lipidTest.js';
import { MINERAL_SOURCES } from './mineralSources.js';
import { VITAMIN_DEFICIENCIES } from './vitaminDeficiencies.js';
import { SHAPE_SORTING } from './shapeSorting.js';

export const INTERACTIVE_SIMULATIONS = [
  FLOAT_OR_SINK,
  SOLUBILITY,
  LIPID_TEST,
  VITAMIN_DEFICIENCIES,
  MINERAL_SOURCES,
  SHAPE_SORTING,
] as const;
