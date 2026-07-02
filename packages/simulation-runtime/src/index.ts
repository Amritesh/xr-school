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
export { createFixedClock } from './world/fixedClock';
export type {
  FixedClock,
  FixedClockAdvance,
  FixedClockConfig,
} from './world/fixedClock';
export { createResourceRegistry } from './world/resourceRegistry';
export type {
  ResourceDisposer,
  ResourceRegistry,
} from './world/resourceRegistry';
export { createWorldRuntime } from './world/runtime';
export type {
  FixedUpdateContext,
  RenderUpdateContext,
  WorldContext,
  WorldRuntime,
  WorldRuntimeConfig,
  WorldRuntimeState,
  WorldSystem,
} from './world/runtime';
export {
  chooseQualityProfile,
  nextLowerQualityProfile,
} from './world/quality';
export type { DeviceQualityCapabilities } from './world/quality';
export { createRapierWorld } from './physics/rapierWorld';
export type {
  RapierBodySnapshot,
  RapierCuboidDefinition,
  RapierSphereDefinition,
  RapierVector3,
  RapierWorld,
  RapierWorldConfig,
} from './physics/rapierWorld';
export { createScientificModelRegistry } from './world/scientificModels';
export type {
  ScientificInput,
  ScientificModelDefinition,
  ScientificModelRegistry,
  ScientificOutput,
} from './world/scientificModels';
export { createAssessmentSession } from './world/assessment';
export type {
  AssessmentAnswerResult,
  AssessmentEvidence,
  AssessmentSession,
} from './world/assessment';
export {
  createPollinationModel,
  pollinationSnapshotForStage,
} from './models/pollinationModel';
export type {
  PollinationEvent,
  PollinationModel,
  PollinationSnapshot,
} from './models/pollinationModel';
export { evaluateCircuit } from './models/circuitModel';
export type {
  CircuitInput,
  CircuitOutput,
} from './models/circuitModel';
export { evaluateMatterState } from './models/matterStateModel';
export type {
  MatterPhase,
  MatterStateOutput,
} from './models/matterStateModel';
export { createLessonSession } from './experience/lessonSession';
export type {
  LessonSession,
  LessonSnapshot,
} from './experience/lessonSession';
