import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FUNGI_MISSIONS } from '../../apps/web/lib/fungi/fungiExperienceDirector';
import { SPECIMEN_LENS_TARGETS } from '../../apps/web/lib/fungi/fungiInteractionTools';
import {
  createFungiViewerController,
  type FungiViewerController,
} from '../../apps/web/lib/fungi/fungiViewerController';

const viewerPath = resolve(
  process.cwd(),
  'apps/web/components/simulations/FungiDevelopmentViewer.tsx',
);

function createFakeDomElement() {
  const listeners = new Map<string, Array<(event: any) => void>>();
  return {
    style: {} as Record<string, string>,
    addEventListener(type: string, handler: (event: any) => void) {
      const existing = listeners.get(type) ?? [];
      existing.push(handler);
      listeners.set(type, existing);
    },
    removeEventListener(type: string, handler: (event: any) => void) {
      const existing = listeners.get(type) ?? [];
      const index = existing.indexOf(handler);
      if (index >= 0) existing.splice(index, 1);
    },
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture() {
      return false;
    },
    listenerCount() {
      let total = 0;
      for (const handlers of listeners.values()) total += handlers.length;
      return total;
    },
  } as unknown as HTMLElement & { listenerCount(): number };
}

const INSETS = { top: 72, right: 24, bottom: 132, left: 24 };

function createController(options: { reducedMotion?: boolean } = {}) {
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 200);
  const domElement = createFakeDomElement();
  const controller = createFungiViewerController({
    camera,
    domElement,
    ...options,
  });
  controller.setViewport(1280, 720, INSETS);
  return { camera, domElement, controller };
}

/** Drives the diagnose mission to completion through real manipulations. */
function completeDiagnose(controller: FungiViewerController) {
  controller.act({
    actionId: 'diagnose.classify',
    source: 'mouse',
    value: 'only-the-green-plant',
  });
  for (const specimen of ['mushroom', 'bread-mould', 'green-plant'] as const) {
    controller.manipulate({ type: 'lens-move', normalizedX: 0.5, normalizedY: 0.98 }, 'mouse');
    const [normalizedX, normalizedY] = SPECIMEN_LENS_TARGETS[specimen];
    controller.manipulate({ type: 'lens-move', normalizedX, normalizedY }, 'mouse');
  }
  controller.act({
    actionId: 'diagnose.classify',
    source: 'mouse',
    value: 'mushroom-and-bread-mould',
  });
}

describe('createFungiViewerController', () => {
  it('owns exactly one runtime, world, director, camera, and tool set', () => {
    const { controller } = createController();
    const snapshot = controller.snapshot();

    expect(controller.root.name).toBe('fungi-forest-nursery');
    expect(snapshot.director.missionId).toBe('diagnose');
    expect(snapshot.mission.id).toBe('diagnose');
    expect(snapshot.world.missionId).toBe('diagnose');
    expect(snapshot.tools.growthInput.substrate).toBe('bread');
    expect(snapshot.camera.transitioning).toBe(false);
    controller.dispose();
  });

  it('frames the new mission when the journey actually advances', () => {
    const { controller } = createController();
    const before = controller.snapshot().camera;

    completeDiagnose(controller);
    controller.update(5, 5);
    const after = controller.snapshot();

    expect(after.director.missionId).toBe('mycelium');
    expect(after.world.missionId).toBe('mycelium');
    const authored = FUNGI_MISSIONS[1]!.cameraPose.target;
    expect(after.camera.target[0]).toBeCloseTo(authored[0], 5);
    expect(after.camera.target[1]).toBeCloseTo(authored[1], 5);
    expect(after.camera.target[2]).toBeCloseTo(authored[2], 5);
    expect(after.camera.target).not.toEqual(before.target);
    controller.dispose();
  });

  it('routes manipulations into both the director and the rendered world', () => {
    const { controller } = createController();
    completeDiagnose(controller);
    controller.act({
      actionId: 'mycelium.interpret',
      source: 'mouse',
      value: 'connected-feeding-network',
    });

    // Three traced branches were required to leave the mycelium mission.
    expect(controller.snapshot().director.missionId).toBe('mycelium');
    for (const [depth, normalizedX] of [
      [0.2, 0.15],
      [0.5, 0.5],
      [0.8, 0.85],
    ] as const) {
      controller.manipulate({ type: 'focus-set', depth }, 'mouse');
      controller.manipulate({ type: 'lens-move', normalizedX, normalizedY: 0.5 }, 'mouse');
    }
    // The interpretation already stood; the third trace completes the gate.
    expect(controller.snapshot().director.missionId).toBe('spore-flight');

    const settings = controller.tools.findLandingSettings('germinating')!;
    controller.manipulate({ type: 'fan-set', ...settings }, 'mouse');
    controller.manipulate({ type: 'spore-release' }, 'mouse');

    const snapshot = controller.snapshot();
    expect(snapshot.world.spore.released).toBe(true);
    expect(snapshot.world.spore.outcome).toBe('germinating');
    expect(snapshot.world.airflow.strength).toBeCloseTo(settings.strength, 6);
    controller.dispose();
  });

  it('keeps the camera reset independent of experiment state', () => {
    const { controller } = createController();
    completeDiagnose(controller);
    const before = controller.snapshot();

    controller.resetCamera();
    controller.update(5, 5);
    const after = controller.snapshot();

    expect(after.director.cameraRequestId).toBe(before.director.cameraRequestId + 1);
    expect(after.director.experiment).toEqual(before.director.experiment);
    expect(after.director.evidence).toEqual(before.director.evidence);
    expect(after.director.missionId).toBe(before.director.missionId);
    expect(after.tools).toEqual(before.tools);
    controller.dispose();
  });

  it('keeps mission evidence when only the experiment is reset', () => {
    const { controller } = createController();
    completeDiagnose(controller);
    controller.manipulate({ type: 'focus-set', depth: 0.2 }, 'mouse');
    controller.manipulate({ type: 'lens-move', normalizedX: 0.15, normalizedY: 0.5 }, 'mouse');
    const before = controller.snapshot();
    expect(before.director.evidence.mycelium.branchTraces).toHaveLength(1);

    controller.resetExperiment();
    const after = controller.snapshot();

    expect(after.director.missionId).toBe(before.director.missionId);
    expect(after.director.evidence.diagnose).toEqual(before.director.evidence.diagnose);
    expect(after.director.evidence.mycelium).toEqual(before.director.evidence.mycelium);
    expect(after.tools.spore.released).toBe(false);
    controller.dispose();
  });

  it('clears the whole journey on restart', () => {
    const { controller } = createController();
    completeDiagnose(controller);
    controller.manipulate({ type: 'scanner-set', depth: 0.6 }, 'mouse');
    expect(controller.snapshot().director.missionId).toBe('mycelium');

    controller.restartJourney();
    controller.update(5, 5);
    const after = controller.snapshot();

    expect(after.director.missionId).toBe('diagnose');
    expect(after.director.evidence.diagnose.lensCrossings).toEqual([]);
    expect(after.director.observationHistory).toEqual([]);
    expect(after.tools.scannerDepth).toBe(0);
    expect(after.tools.tracedBranchIds).toEqual([]);
    expect(after.world.missionId).toBe('diagnose');
    controller.dispose();
  });

  it('reaches the same framing with reduced motion, without tweening', () => {
    const animated = createController();
    const reduced = createController({ reducedMotion: true });

    for (const { controller } of [animated, reduced]) completeDiagnose(controller);
    expect(reduced.controller.snapshot().camera.transitioning).toBe(false);

    animated.controller.update(5, 5);
    const animatedCamera = animated.controller.snapshot().camera;
    const reducedCamera = reduced.controller.snapshot().camera;

    expect(reducedCamera.distance).toBeCloseTo(animatedCamera.distance, 6);
    expect(reducedCamera.azimuth).toBeCloseTo(animatedCamera.azimuth, 6);
    expect(reducedCamera.polar).toBeCloseTo(animatedCamera.polar, 6);
    animated.controller.dispose();
    reduced.controller.dispose();
  });

  it('disposes every owner idempotently and refuses further work', () => {
    const { domElement, controller } = createController();
    expect(domElement.listenerCount()).toBeGreaterThan(0);

    controller.dispose();
    controller.dispose();

    expect(domElement.listenerCount()).toBe(0);
    expect(controller.root.children).toHaveLength(0);
    expect(() =>
      controller.manipulate({ type: 'scanner-set', depth: 0.4 }, 'mouse'),
    ).toThrow(/disposed/i);
  });

  it('re-frames the apparatus when the interface takes more of the canvas', () => {
    const { controller } = createController();
    const roomy = controller.snapshot().camera.distance;

    controller.setViewport(390, 844, { top: 64, right: 12, bottom: 320, left: 12 });
    const cramped = controller.snapshot().camera.distance;

    expect(cramped).toBeGreaterThan(roomy);
    controller.dispose();
  });
});

describe('FungiDevelopmentViewer composition', () => {
  const source = readFileSync(viewerPath, 'utf8');

  it('composes the controller instead of re-implementing the journey', () => {
    expect(source).toContain('createFungiViewerController');
    expect(source).toContain('fungi-nursery-lab.css');
    // The seven-stage switch, duplicated rail, and click-to-complete world
    // actions the rewrite removed must not come back.
    expect(source).not.toContain('coordinateFungiAction');
    expect(source).not.toContain('createFungiWorld');
    expect(source).not.toContain('vrPromptForStage');
  });

  it('presents a single control panel rather than competing floating surfaces', () => {
    // Four overlapping surfaces were the problem; there is now one panel.
    expect(source).toContain('data-testid="fungi-tool-drawer"');
    expect(source).toContain('data-testid="fungi-current-mission"');
    expect(source).toContain('data-testid="fungi-next-step"');
    expect(source).toContain('data-testid="fungi-caption"');
    expect(source).toContain('data-testid="fungi-evidence-notebook"');
    expect(source).toContain('data-testid="fungi-reset-experiment"');
    expect(source).toContain('data-testid="fungi-reset-camera"');
    expect(source).toContain('data-testid="fungi-restart-journey"');
    expect(source).toContain('aria-live');
  });
});
