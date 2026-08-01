import { describe, expect, it, vi } from 'vitest';

import type { NormalizedAction } from '@xr-school/simulation-schema';
import {
  FOOD_SPOILAGE_GUIDANCE,
  FOOD_SPOILAGE_SIMULATION,
} from '../../packages/simulation-content/src/implemented/guided';
import { createGuidedSimulationController } from '../../apps/web/lib/simulations/guided/createGuidedSimulationController';

function actionFrom(
  source: NormalizedAction['source'],
  actionId: string,
  stageId: string,
): NormalizedAction {
  return {
    actionId,
    targetEntityId: `target:${actionId}`,
    source,
    phase: 'commit',
    stageId,
    timestampMs: 1,
  };
}

function fakeHost() {
  const applied: unknown[] = [];
  const narration = {
    currentCueId: undefined as string | undefined,
    play: vi.fn(async (cueId: string) => {
      narration.currentCueId = cueId;
      return 'silent' as const;
    }),
    replay: vi.fn(async () => 'silent' as const),
    stop: vi.fn(() => { narration.currentCueId = undefined; }),
    dispose: vi.fn(),
  };
  return {
    applied,
    narration,
    applySnapshot: vi.fn(snapshot => applied.push(snapshot)),
    dispatch: vi.fn(),
    dispose: vi.fn(async () => {}),
  };
}

describe('guided simulation controller', () => {
  it('requires the normalized action and declared evidence before progression', () => {
    const host = fakeHost();
    const controller = createGuidedSimulationController({
      record: FOOD_SPOILAGE_SIMULATION,
      guidance: FOOD_SPOILAGE_GUIDANCE,
      host,
      onChange() {},
    });
    const first = FOOD_SPOILAGE_GUIDANCE.stages[0];

    controller.dispatch(actionFrom('mouse', first.requiredActionIds[0], first.id));
    expect(controller.view().snapshot.stageComplete).toBe(false);
    controller.recordEvidence(first.completionEvidenceIds[0]);
    expect(controller.view().snapshot.stageComplete).toBe(true);

    controller.next();
    const beforeStaleAction = controller.view().snapshot;
    const staleAction = actionFrom('xr-controller', first.requiredActionIds[0], first.id);
    controller.dispatch(staleAction);
    expect(controller.view().snapshot.stageId).toBe(FOOD_SPOILAGE_GUIDANCE.stages[1].id);
    expect(controller.view().snapshot).toEqual(beforeStaleAction);
  });

  it('uses assessment answers as the only answer-stage evidence path', () => {
    const host = fakeHost();
    const controller = createGuidedSimulationController({
      record: FOOD_SPOILAGE_SIMULATION,
      guidance: FOOD_SPOILAGE_GUIDANCE,
      host,
      onChange() {},
    });

    for (const stage of FOOD_SPOILAGE_GUIDANCE.stages.slice(0, 4)) {
      controller.dispatch(actionFrom('keyboard', stage.requiredActionIds[0], stage.id));
      controller.recordEvidence(stage.completionEvidenceIds[0]);
      controller.next();
    }
    const answerStage = FOOD_SPOILAGE_GUIDANCE.stages[4];
    controller.dispatch(actionFrom(
      'xr-controller',
      answerStage.requiredActionIds[0],
      answerStage.id,
    ));
    expect(controller.view().snapshot.stageComplete).toBe(false);
    controller.recordEvidence(answerStage.completionEvidenceIds[0]);
    expect(controller.view().snapshot.stageComplete).toBe(false);

    const prompt = controller.view().assessment!;
    const accepted = FOOD_SPOILAGE_SIMULATION.assessment.prompts[0]
      .acceptedEvidenceIds[0];
    const distractor = prompt.options.find(option => option.id !== accepted)!;
    expect(controller.answer(distractor.id).correct).toBe(false);
    expect(controller.view().feedback).toMatch(/compare|evidence/i);
    expect(controller.answer(accepted).correct).toBe(true);
    expect(controller.view().snapshot.stageComplete).toBe(true);
  });

  it('replays without changing evidence, restarts deterministically, and disposes once', async () => {
    const host = fakeHost();
    const changes: unknown[] = [];
    const controller = createGuidedSimulationController({
      record: FOOD_SPOILAGE_SIMULATION,
      guidance: FOOD_SPOILAGE_GUIDANCE,
      host,
      onChange: view => changes.push(view),
    });
    const first = FOOD_SPOILAGE_GUIDANCE.stages[0];
    controller.dispatch(actionFrom('touch', first.requiredActionIds[0], first.id));
    controller.recordEvidence(first.completionEvidenceIds[0]);
    const beforeReplay = controller.view().snapshot;
    await controller.replayNarration();
    expect(controller.view().snapshot).toEqual(beforeReplay);
    expect(host.narration.play).toHaveBeenLastCalledWith(first.narrationId);

    controller.restart();
    expect(host.narration.stop).toHaveBeenCalled();
    expect(controller.view().snapshot).toMatchObject({
      stageIndex: 0,
      performedActionIds: [],
      recordedEvidenceIds: [],
    });
    expect(host.narration.play).toHaveBeenLastCalledWith(first.narrationId);
    expect(changes.length).toBeGreaterThan(0);

    await controller.dispose();
    await controller.dispose();
    expect(host.dispose).toHaveBeenCalledTimes(1);
  });
});
