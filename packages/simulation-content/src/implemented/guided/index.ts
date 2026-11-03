export * from './builders.js';
export * from './curriculum.js';
export * from './super-senses-smell.js';
export * from './super-senses-sight.js';
export * from './super-senses-danger.js';
export * from './food-spoilage.js';
export * from './milk-spoilage.js';
export * from './aam-papad.js';
export * from './pitcher-plant.js';
export * from './seed-dispersal.js';
export * from './rainwater-storage.js';
export * from './stepwell-structure.js';
export * from './dead-sea-salt-water.js';
export * from './malaria-diagnosis.js';
export * from './mosquito-life-cycle.js';
export * from './river-crossing.js';
export * from './rock-climbing.js';
export * from './camp-in-snow.js';
export * from './snow-mountain-climbing.js';
export * from './ancient-fort.js';
export * from './cotton-farming.js';
export * from './cotton-ginning.js';
export * from './shearing-scouring.js';
export * from './virus-invasion.js';
export * from './irrigation-methods.js';
export * from './harvesting-threshing-storage.js';
export * from './yarn-maker-mission.js';
export type { GuidedSceneMetadata } from './definitions.generated.js';

import {
  GUIDED_IMPLEMENTED_SIMULATIONS as GENERATED_GUIDED_IMPLEMENTED_SIMULATIONS,
  GUIDED_SCENE_METADATA_BY_MODULE_ID as GENERATED_GUIDED_SCENE_METADATA_BY_MODULE_ID,
  GUIDED_SIMULATION_DEFINITIONS as GENERATED_GUIDED_SIMULATION_DEFINITIONS,
} from './definitions.generated.js';
import {
  SHEARING_SCOURING_WOOL_GUIDANCE,
  SHEARING_SCOURING_WOOL_SCENE_METADATA,
  SHEARING_SCOURING_WOOL_SIMULATION,
} from './shearing-scouring.js';
import {
  VIRUS_INVASION_GUIDANCE,
  VIRUS_INVASION_SCENE_METADATA,
  VIRUS_INVASION_SIMULATION,
} from './virus-invasion.js';
import {
  IRRIGATION_METHODS_GUIDANCE,
  IRRIGATION_METHODS_SCENE_METADATA,
  IRRIGATION_METHODS_SIMULATION,
} from './irrigation-methods.js';
import {
  HARVESTING_THRESHING_STORAGE_GUIDANCE,
  HARVESTING_THRESHING_STORAGE_SCENE_METADATA,
  HARVESTING_THRESHING_STORAGE_SIMULATION,
} from './harvesting-threshing-storage.js';
import {
  YARN_MAKER_GUIDANCE,
  YARN_MAKER_SCENE_METADATA,
  YARN_MAKER_SIMULATION,
} from './yarn-maker-mission.js';
import {
  SUPER_SENSES_SMELL_GUIDANCE,
  SUPER_SENSES_SMELL_SCENE_METADATA,
  SUPER_SENSES_SMELL_SIMULATION,
} from './super-senses-smell.js';
import {
  SUPER_SENSES_SIGHT_GUIDANCE,
  SUPER_SENSES_SIGHT_SCENE_METADATA,
  SUPER_SENSES_SIGHT_SIMULATION,
} from './super-senses-sight.js';
import {
  SUPER_SENSES_DANGER_GUIDANCE,
  SUPER_SENSES_DANGER_SCENE_METADATA,
  SUPER_SENSES_DANGER_SIMULATION,
} from './super-senses-danger.js';

export const GUIDED_SIMULATION_DEFINITIONS = [
  ...GENERATED_GUIDED_SIMULATION_DEFINITIONS,
  SHEARING_SCOURING_WOOL_GUIDANCE,
  VIRUS_INVASION_GUIDANCE,
  IRRIGATION_METHODS_GUIDANCE,
  HARVESTING_THRESHING_STORAGE_GUIDANCE,
  YARN_MAKER_GUIDANCE,
  SUPER_SENSES_SMELL_GUIDANCE,
  SUPER_SENSES_SIGHT_GUIDANCE,
  SUPER_SENSES_DANGER_GUIDANCE,
] as const;

export const GUIDED_IMPLEMENTED_SIMULATIONS = [
  ...GENERATED_GUIDED_IMPLEMENTED_SIMULATIONS,
  SHEARING_SCOURING_WOOL_SIMULATION,
  VIRUS_INVASION_SIMULATION,
  IRRIGATION_METHODS_SIMULATION,
  HARVESTING_THRESHING_STORAGE_SIMULATION,
  YARN_MAKER_SIMULATION,
  SUPER_SENSES_SMELL_SIMULATION,
  SUPER_SENSES_SIGHT_SIMULATION,
  SUPER_SENSES_DANGER_SIMULATION,
] as const;

export const GUIDED_SCENE_METADATA_BY_MODULE_ID = Object.freeze({
  ...GENERATED_GUIDED_SCENE_METADATA_BY_MODULE_ID,
  [SHEARING_SCOURING_WOOL_SIMULATION.module.id]: SHEARING_SCOURING_WOOL_SCENE_METADATA,
  [VIRUS_INVASION_SIMULATION.module.id]: VIRUS_INVASION_SCENE_METADATA,
  [IRRIGATION_METHODS_SIMULATION.module.id]: IRRIGATION_METHODS_SCENE_METADATA,
  [HARVESTING_THRESHING_STORAGE_SIMULATION.module.id]: HARVESTING_THRESHING_STORAGE_SCENE_METADATA,
  [YARN_MAKER_SIMULATION.module.id]: YARN_MAKER_SCENE_METADATA,
  [SUPER_SENSES_SMELL_SIMULATION.module.id]: SUPER_SENSES_SMELL_SCENE_METADATA,
  [SUPER_SENSES_SIGHT_SIMULATION.module.id]: SUPER_SENSES_SIGHT_SCENE_METADATA,
  [SUPER_SENSES_DANGER_SIMULATION.module.id]: SUPER_SENSES_DANGER_SCENE_METADATA,
});
