export * from './sceneWorld';
export * from './createGuidedSceneAdapter';
export * from './createDeclarativeGuidedSceneWorld';
export * from './c5-ch04-a01-food-spoilage.scene';
export * from './c5-ch04-a02-milk-spoilage.scene';
export * from './c5-ch04-a03-the-making-of-aam-papad.scene';
export * from './c5-ch05-a01-pitcher-plant-the-insect-hunter.scene';
export * from './c5-ch05-a02-seed-dispersal.scene';
export * from './c5-ch06-a01-the-storage-of-rainwater.scene';
export * from './c5-ch06-a02-a-step-well-structure.scene';
export * from './c5-ch07-a02-dead-sea-salt-water-and-its-effects.scene';
export * from './c5-ch08-a01-diagnosis-of-malaria.scene';
export * from './c5-ch08-a02-life-cycle-of-the-mosquito.scene';
export * from './c5-ch09-a01-river-crossing-adventure.scene';
export * from './c5-ch09-a02-rock-climbing.scene';
export * from './c5-ch09-a03-camp-in-the-snow.scene';
export * from './c5-ch09-a04-snow-mountain-climbing.scene';
export * from './c5-ch10-a01-a-visit-of-ancient-fort.scene';
export * from './c6-ch03-a01-cotton-farming.scene';
export * from './c6-ch03-a02-the-process-of-cotton-ginning.scene';

import { FOOD_SPOILAGE_SCENE_ENTRY } from './c5-ch04-a01-food-spoilage.scene';
import { MILK_SPOILAGE_SCENE_ENTRY } from './c5-ch04-a02-milk-spoilage.scene';
import { AAM_PAPAD_SCENE_ENTRY } from './c5-ch04-a03-the-making-of-aam-papad.scene';
import { PITCHER_PLANT_SCENE_ENTRY } from './c5-ch05-a01-pitcher-plant-the-insect-hunter.scene';
import { SEED_DISPERSAL_SCENE_ENTRY } from './c5-ch05-a02-seed-dispersal.scene';
import { RAINWATER_STORAGE_SCENE_ENTRY } from './c5-ch06-a01-the-storage-of-rainwater.scene';
import { STEPWELL_STRUCTURE_SCENE_ENTRY } from './c5-ch06-a02-a-step-well-structure.scene';
import { DEAD_SEA_SALT_WATER_SCENE_ENTRY } from './c5-ch07-a02-dead-sea-salt-water-and-its-effects.scene';
import { MALARIA_DIAGNOSIS_SCENE_ENTRY } from './c5-ch08-a01-diagnosis-of-malaria.scene';
import { MOSQUITO_LIFE_CYCLE_SCENE_ENTRY } from './c5-ch08-a02-life-cycle-of-the-mosquito.scene';
import { RIVER_CROSSING_SCENE_ENTRY } from './c5-ch09-a01-river-crossing-adventure.scene';
import { ROCK_CLIMBING_SCENE_ENTRY } from './c5-ch09-a02-rock-climbing.scene';
import { CAMP_IN_SNOW_SCENE_ENTRY } from './c5-ch09-a03-camp-in-the-snow.scene';
import { SNOW_MOUNTAIN_CLIMBING_SCENE_ENTRY } from './c5-ch09-a04-snow-mountain-climbing.scene';
import { ANCIENT_FORT_SCENE_ENTRY } from './c5-ch10-a01-a-visit-of-ancient-fort.scene';
import { COTTON_FARMING_SCENE_ENTRY } from './c6-ch03-a01-cotton-farming.scene';
import { COTTON_GINNING_SCENE_ENTRY } from './c6-ch03-a02-the-process-of-cotton-ginning.scene';

export const GUIDED_SCENE_ENTRIES = [
  FOOD_SPOILAGE_SCENE_ENTRY,
  MILK_SPOILAGE_SCENE_ENTRY,
  AAM_PAPAD_SCENE_ENTRY,
  PITCHER_PLANT_SCENE_ENTRY,
  SEED_DISPERSAL_SCENE_ENTRY,
  RAINWATER_STORAGE_SCENE_ENTRY,
  STEPWELL_STRUCTURE_SCENE_ENTRY,
  DEAD_SEA_SALT_WATER_SCENE_ENTRY,
  MALARIA_DIAGNOSIS_SCENE_ENTRY,
  MOSQUITO_LIFE_CYCLE_SCENE_ENTRY,
  RIVER_CROSSING_SCENE_ENTRY,
  ROCK_CLIMBING_SCENE_ENTRY,
  CAMP_IN_SNOW_SCENE_ENTRY,
  SNOW_MOUNTAIN_CLIMBING_SCENE_ENTRY,
  ANCIENT_FORT_SCENE_ENTRY,
  COTTON_FARMING_SCENE_ENTRY,
  COTTON_GINNING_SCENE_ENTRY,
] as const;
