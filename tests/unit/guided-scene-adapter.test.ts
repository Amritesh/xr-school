import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  createLessonSession,
  createResourceRegistry,
} from '@xr-school/simulation-runtime';
import type {
  SimulationInteractionRegistry,
  SimulationSceneContext,
} from '@xr-school/simulation-web';
import { createGuidedLesson } from '../../packages/simulation-content/src/implemented/guided/builders';
import { createGuidedSceneAdapter } from '../../apps/web/lib/simulations/guided/createGuidedSceneAdapter';
import type { GuidedSceneWorld } from '../../apps/web/lib/simulations/guided/sceneWorld';

function fixture() {
  return createGuidedLesson({
    id: 'guided-adapter-fixture',
    moduleId: 'sim-adapter-fixture',
    viewerKey: 'guided-adapter-fixture',
    classContext: 'Class 5',
    gradeTone: 'class3To5',
    objective: 'Observe then answer.',
    stages: [
      {
        id: 'observe', title: 'Observe', cue: 'Observe.', detail: 'Observe the change.',
        actionId: 'observe-action', actionLabel: 'Observe', evidenceId: 'observed',
        evidenceMode: 'scene', narrationText: 'Observe.',
      },
      {
        id: 'answer', title: 'Answer', cue: 'Answer.', detail: 'Use evidence.',
        actionId: 'answer-action', actionLabel: 'Answer', evidenceId: 'answered',
        evidenceMode: 'answer', narrationText: 'Answer.', transferPromptId: 'fixture-transfer',
      },
    ],
    completion: { eyebrow: 'Done', headline: 'Done', body: 'Evidence used.', actionLabel: 'Review' },
  }).guidance;
}

function harness(reducedMotion = false) {
  const scene = new THREE.Scene();
  const resources = createResourceRegistry();
  const registrations = new Map<string, () => void>();
  const interactions: SimulationInteractionRegistry = {
    register(target) {
      registrations.set(target.id, () => registrations.delete(target.id));
      return registrations.get(target.id)!;
    },
    activate() {},
    clear() { registrations.clear(); },
  };
  const evidence: string[] = [];
  const context: SimulationSceneContext = {
    renderer: {} as THREE.WebGLRenderer,
    scene,
    camera: new THREE.PerspectiveCamera(),
    resources,
    profile: () => 'desktopHigh',
    preferences: {
      reducedMotion,
      seatedMode: false,
      locomotion: 'stationary',
      turnMode: 'snap',
    },
    interactions,
    dispatch() {},
    recordEvidence(id) { evidence.push(id); },
  };
  return { context, scene, resources, registrations, evidence };
}

describe('guided scene adapter bridge', () => {
  it('projects declared cues, records scene evidence once, and never fabricates answer evidence', async () => {
    const definition = fixture();
    const state = harness();
    const applyCalls: [string, number][] = [];
    const root = new THREE.Group();
    const targets = definition.stages.map(stage => ({
      id: `target:${stage.id}`,
      object: new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()),
      actionId: stage.requiredActionIds[0],
      accessibilityLabel: stage.actionLabel,
    }));
    targets.forEach(target => root.add(target.object));
    let worldDisposed = false;
    const world: GuidedSceneWorld = {
      root,
      cueIds: definition.stages.map(stage => stage.sceneCueId),
      interactionTargets: targets,
      cueDurationSeconds: () => 0.5,
      applyCue(cueId, progress) { applyCalls.push([cueId, progress]); },
      focusTarget(cueId) {
        const index = definition.stages.findIndex(stage => stage.sceneCueId === cueId);
        return targets[index]?.object;
      },
      dispose() {
        worldDisposed = true;
        targets.forEach(target => {
          target.object.geometry.dispose();
          (target.object.material as THREE.Material).dispose();
        });
      },
    };
    const handle = await createGuidedSceneAdapter(
      definition,
      () => world,
    ).create(state.context);
    const lesson = createLessonSession({
      id: definition.id,
      gradeTone: definition.gradeTone,
      objective: definition.objective,
      stages: definition.stages,
    });

    expect(state.scene.children).toContain(root);
    expect(state.registrations.size).toBe(2);
    handle.applySnapshot(lesson.snapshot());
    expect(state.evidence).toEqual([]);
    expect(handle.focusTarget()).toBe(targets[0].object);

    handle.applySnapshot(lesson.performAction('observe-action'));
    handle.fixedUpdate?.({
      resources: state.resources,
      elapsedSeconds: 0.25,
      deltaSeconds: 0.25,
      stepNumber: 1,
    });
    expect(state.evidence).toEqual([]);
    handle.fixedUpdate?.({
      resources: state.resources,
      elapsedSeconds: 0.5,
      deltaSeconds: 0.25,
      stepNumber: 2,
    });
    expect(state.evidence).toEqual(['observed']);
    handle.fixedUpdate?.({
      resources: state.resources,
      elapsedSeconds: 1,
      deltaSeconds: 0.5,
      stepNumber: 3,
    });
    expect(state.evidence).toEqual(['observed']);

    lesson.recordEvidence('observed');
    handle.applySnapshot(lesson.next());
    handle.applySnapshot(lesson.performAction('answer-action'));
    handle.fixedUpdate?.({
      resources: state.resources,
      elapsedSeconds: 2,
      deltaSeconds: 1,
      stepNumber: 4,
    });
    expect(state.evidence).toEqual(['observed']);
    expect(handle.focusTarget()).toBe(targets[1].object);
    expect(applyCalls.some(([, progress]) => progress === 1)).toBe(true);

    await handle.dispose();
    expect(state.scene.children).not.toContain(root);
    expect(state.registrations.size).toBe(0);
    expect(state.resources.size()).toBe(0);
    expect(worldDisposed).toBe(true);
  });

  it('applies the final projection for reduced motion only after the action', async () => {
    const definition = fixture();
    const state = harness(true);
    const root = new THREE.Group();
    const progress: number[] = [];
    const handle = await createGuidedSceneAdapter(definition, () => ({
      root,
      cueIds: definition.stages.map(stage => stage.sceneCueId),
      interactionTargets: [],
      cueDurationSeconds: () => 1,
      applyCue(_cueId, value) { progress.push(value); },
      focusTarget: () => undefined,
      dispose() {},
    })).create(state.context);
    const lesson = createLessonSession({
      id: definition.id,
      gradeTone: definition.gradeTone,
      objective: definition.objective,
      stages: definition.stages,
    });

    handle.applySnapshot(lesson.snapshot());
    expect(progress.at(-1)).toBe(0);
    handle.applySnapshot(lesson.performAction('observe-action'));
    expect(progress.at(-1)).toBe(1);
    expect(state.evidence).toEqual([]);
    handle.fixedUpdate?.({
      resources: state.resources,
      elapsedSeconds: 0.01,
      deltaSeconds: 0.01,
      stepNumber: 1,
    });
    expect(state.evidence).toEqual(['observed']);
    await handle.dispose();
  });
});
