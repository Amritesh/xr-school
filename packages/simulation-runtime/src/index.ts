export { createStageMachine } from './core/stageMachine';
export type { StageMachine } from './core/stageMachine';
export { createSortingBoard } from './core/sortingBoard';
export type {
  SortingAssignments,
  SortingBoard,
  SortingBoardConfig,
  SortingCategory,
  SortingItem,
  SortingMisplacement,
  SortingScore,
} from './core/sortingBoard';
export { createExperimentBench } from './core/experimentBench';
export type {
  ExperimentBench,
  ExperimentBenchConfig,
  ExperimentObservation,
  ExperimentTrial,
} from './core/experimentBench';
export { createParticleCloud, createPhysicsWorld } from './core/physics';
export type {
  ParticleCloudConfig,
  PhysicsBody,
  PhysicsBounds,
  PhysicsWorld,
  PhysicsWorldConfig,
  Vector3,
} from './core/physics';
