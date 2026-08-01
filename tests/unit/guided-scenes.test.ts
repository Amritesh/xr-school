import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { createResourceRegistry } from '@xr-school/simulation-runtime';
import type { SimulationSceneContext } from '@xr-school/simulation-web';
import {
  GUIDED_SCENE_ENTRIES,
} from '../../apps/web/lib/simulations/guided';
import {
  GUIDED_IMPLEMENTED_SIMULATIONS,
  GUIDED_SIMULATION_DEFINITIONS,
} from '../../packages/simulation-content/src/implemented/guided';

function context(): SimulationSceneContext {
  return {
    renderer: {} as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    resources: createResourceRegistry(),
    profile: () => 'desktopHigh',
    preferences: {
      reducedMotion: false,
      seatedMode: false,
      locomotion: 'stationary',
      turnMode: 'snap',
    },
    interactions: { register: () => () => {}, activate() {}, clear() {} },
    dispatch() {},
    recordEvidence() {},
  };
}

describe('guided declarative scene worlds', () => {
  it('binds one unique adapter and testable evidence world to every guided class', async () => {
    expect(GUIDED_SCENE_ENTRIES).toHaveLength(17);
    expect(new Set(GUIDED_SCENE_ENTRIES.map(entry => entry.adapter.id)).size).toBe(17);

    for (const [index, entry] of GUIDED_SCENE_ENTRIES.entries()) {
      const definition = GUIDED_SIMULATION_DEFINITIONS[index];
      const record = GUIDED_IMPLEMENTED_SIMULATIONS[index];
      expect(entry.moduleId).toBe(definition.moduleId);
      expect(entry.adapter.id).toBe(`guided:${definition.moduleId}`);
      const testContext = context();
      testContext.camera.position.set(1, 2, 3);
      const cameraBefore = testContext.camera.position.clone();
      const world = await entry.createWorld(testContext);

      expect(world.cueIds).toEqual(definition.stages.map(stage => stage.sceneCueId));
      expect(world.interactionTargets).toHaveLength(definition.stages.length);
      expect(world.root.userData.environmentUrl).toBe(
        `/simulations/${record.module.slug}/environment.webp`,
      );
      for (const stage of definition.stages) {
        const target = world.interactionTargets.find(
          item => item.actionId === stage.requiredActionIds[0],
        );
        expect(target?.accessibilityLabel).toBe(stage.actionLabel);
        expect(world.focusTarget(stage.sceneCueId)).toBeDefined();
        world.applyCue(stage.sceneCueId, 0, testContext.preferences);
        world.applyCue(stage.sceneCueId, 1, testContext.preferences);
        expect(world.root.userData.currentCueId).toBe(stage.sceneCueId);
        expect(world.root.userData.progress).toBe(1);
        expect(world.root.userData.outcome).toBe(stage.detail);
      }
      expect(testContext.camera.position).toEqual(cameraBefore);
      world.dispose();
      expect(world.root.children).toHaveLength(0);
    }
  });

  it('retains quantitative condition evidence and specific scientific outcomes', async () => {
    const food = GUIDED_SCENE_ENTRIES.find(
      entry => entry.moduleId === 'sim-c05-ch04-a01-food-spoilage',
    )!;
    const milk = GUIDED_SCENE_ENTRIES.find(
      entry => entry.moduleId === 'sim-c05-ch04-a02-milk-spoilage',
    )!;
    const foodWorld = await food.createWorld(context());
    const milkWorld = await milk.createWorld(context());
    foodWorld.applyCue('scene:day-five', 1, context().preferences);
    milkWorld.applyCue('scene:hour-twenty-four', 1, context().preferences);

    expect(foodWorld.root.userData.numericEvidence).toEqual([1, 0.72, 0.25, 0.16]);
    expect(milkWorld.root.userData.numericEvidence).toEqual([1, 0.55, 0.16]);
    expect(
      GUIDED_SIMULATION_DEFINITIONS.flatMap(definition =>
        definition.stages.map(stage => `${stage.cue} ${stage.detail}`.toLowerCase()),
      ).join(' '),
    ).toEqual(expect.stringContaining('density'));
    foodWorld.dispose();
    milkWorld.dispose();
  });
});
