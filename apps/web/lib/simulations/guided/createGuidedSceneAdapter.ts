import * as THREE from 'three';
import type {
  GuidedSimulationDefinition,
} from '@xr-school/simulation-schema';
import type {
  SimulationSceneAdapter,
  SimulationSceneHandle,
} from '@xr-school/simulation-web';
import type {
  CreateGuidedSceneWorld,
  GuidedSceneWorld,
} from './sceneWorld';

function sameCueSet(
  expected: readonly string[],
  actual: readonly string[],
): boolean {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return expectedSet.size === expected.length
    && actualSet.size === actual.length
    && expectedSet.size === actualSet.size
    && [...expectedSet].every(cueId => actualSet.has(cueId));
}

function validateWorld(
  definition: GuidedSimulationDefinition,
  world: GuidedSceneWorld,
): void {
  if (!(world.root instanceof THREE.Group)) {
    throw new Error(`${definition.id}: guided scene world requires a THREE.Group root`);
  }
  const expectedCueIds = definition.stages.map(stage => stage.sceneCueId);
  if (!sameCueSet(expectedCueIds, world.cueIds)) {
    throw new Error(`${definition.id}: world cue set differs from the definition`);
  }
  for (const cueId of world.cueIds) {
    const duration = world.cueDurationSeconds(cueId);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`${definition.id}: ${cueId} has a non-finite or non-positive duration`);
    }
  }
}

export function createGuidedSceneAdapter(
  definition: GuidedSimulationDefinition,
  createWorld: CreateGuidedSceneWorld,
): SimulationSceneAdapter {
  return {
    id: `guided:${definition.moduleId}`,
    async create(context): Promise<SimulationSceneHandle> {
      const world = await createWorld(context);
      const releases: (() => void)[] = [];
      let releaseResource = () => {};
      let disposed = false;
      let currentStage = definition.stages[0];
      let currentCueId = currentStage.sceneCueId;
      let durationSeconds = 1;
      let elapsedSeconds = 0;
      let projecting = false;
      let projectedStageId: string | undefined;
      let previousActionCount = 0;
      let previousEvidenceCount = 0;
      const recordedEvidence = new Set<string>();

      const disposeOwnedWorld = () => {
        if (disposed) return;
        disposed = true;
        for (const release of releases.reverse()) release();
        context.scene.remove(world.root);
        world.dispose();
      };

      try {
        validateWorld(definition, world);
        context.scene.add(world.root);
        for (const target of world.interactionTargets) {
          releases.push(context.interactions.register({
            ...target,
            inputSources: target.inputSources,
          }));
        }
        releaseResource = context.resources.register(
          `guided-scene:${definition.moduleId}`,
          disposeOwnedWorld,
        );
      } catch (error) {
        disposeOwnedWorld();
        throw error;
      }

      const handle: SimulationSceneHandle = {
        applySnapshot(snapshot) {
          if (disposed) throw new Error(`${definition.id}: scene is disposed`);
          const stage = definition.stages.find(item => item.id === snapshot.stageId);
          if (!stage) {
            throw new Error(`${definition.id}: unknown stage ID ${snapshot.stageId}`);
          }
          if (!world.cueIds.includes(stage.sceneCueId)) {
            throw new Error(`${definition.id}: unknown cue ID ${stage.sceneCueId}`);
          }

          const restarted = snapshot.performedActionIds.length < previousActionCount
            || snapshot.recordedEvidenceIds.length < previousEvidenceCount;
          if (restarted) {
            recordedEvidence.clear();
            projectedStageId = undefined;
            projecting = false;
          }
          previousActionCount = snapshot.performedActionIds.length;
          previousEvidenceCount = snapshot.recordedEvidenceIds.length;

          const changedStage = currentStage.id !== stage.id;
          currentStage = stage;
          currentCueId = stage.sceneCueId;
          durationSeconds = world.cueDurationSeconds(currentCueId);
          const actionId = stage.requiredActionIds[0];
          const evidenceId = stage.completionEvidenceIds[0];
          const actionPerformed = snapshot.performedActionIds.includes(actionId);
          const evidenceAlreadyRecorded = snapshot.recordedEvidenceIds.includes(evidenceId);

          if (changedStage || restarted) {
            elapsedSeconds = 0;
            projecting = false;
            projectedStageId = undefined;
          }
          if (evidenceAlreadyRecorded) {
            recordedEvidence.add(evidenceId);
            elapsedSeconds = durationSeconds;
            projecting = false;
            projectedStageId = stage.id;
            world.applyCue(currentCueId, 1, context.preferences);
            return;
          }
          if (!actionPerformed) {
            elapsedSeconds = 0;
            projecting = false;
            projectedStageId = undefined;
            world.applyCue(currentCueId, 0, context.preferences);
            return;
          }
          if (projectedStageId !== stage.id) {
            projectedStageId = stage.id;
            elapsedSeconds = context.preferences.reducedMotion
              ? durationSeconds
              : 0;
            projecting = true;
            world.applyCue(
              currentCueId,
              context.preferences.reducedMotion ? 1 : 0,
              context.preferences,
            );
          }
        },

        fixedUpdate(update) {
          if (!projecting || disposed) return;
          elapsedSeconds = Math.min(
            durationSeconds,
            elapsedSeconds + Math.max(0, update.deltaSeconds),
          );
          const progress = Math.min(1, elapsedSeconds / durationSeconds);
          world.applyCue(currentCueId, progress, context.preferences);
          if (progress < 1) return;
          projecting = false;
          const evidenceId = currentStage.completionEvidenceIds[0];
          if (
            currentStage.evidenceMode === 'scene'
            && !recordedEvidence.has(evidenceId)
          ) {
            recordedEvidence.add(evidenceId);
            context.recordEvidence(evidenceId);
          }
        },

        focusTarget() {
          return world.focusTarget(currentCueId);
        },

        dispose() {
          if (disposed) return;
          disposeOwnedWorld();
          releaseResource();
        },
      };
      return handle;
    },
  };
}
