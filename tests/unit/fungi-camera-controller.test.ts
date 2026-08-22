import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FUNGI_MISSIONS } from '../../apps/web/lib/fungi/fungiExperienceDirector';
import {
  createFungiCameraController,
  type CameraSafeInsets,
} from '../../apps/web/lib/fungi/fungiCameraController';

function createFakeDomElement() {
  const listeners = new Map<string, Array<(event: any) => void>>();
  const self = {
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
    dispatch(type: string, event: Record<string, unknown> = {}) {
      for (const handler of [...(listeners.get(type) ?? [])]) {
        handler({ preventDefault() {}, pointerId: 1, ...event });
      }
    },
  };
  return self as unknown as HTMLElement & {
    listenerCount(): number;
    dispatch(type: string, event?: Record<string, unknown>): void;
  };
}

function boxFor(bounds: {
  minimum: readonly [number, number, number];
  maximum: readonly [number, number, number];
}) {
  return new THREE.Box3(
    new THREE.Vector3(...bounds.minimum),
    new THREE.Vector3(...bounds.maximum),
  );
}

function mutablePose(pose: {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}) {
  return {
    position: [...pose.position] as [number, number, number],
    target: [...pose.target] as [number, number, number],
  };
}

/**
 * Every corner of the apparatus must land inside the region of the canvas
 * that no interface surface covers, expressed in normalized device space.
 */
function cornersInsideSafeFrame(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  insets: CameraSafeInsets,
) {
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const safeMinX = (insets.left / width) * 2 - 1;
  const safeMaxX = ((width - insets.right) / width) * 2 - 1;
  const safeMaxY = 1 - (insets.top / height) * 2;
  const safeMinY = -1 + (insets.bottom / height) * 2;

  const corner = new THREE.Vector3();
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        corner.set(x, y, z).project(camera);
        if (
          corner.x < safeMinX ||
          corner.x > safeMaxX ||
          corner.y < safeMinY ||
          corner.y > safeMaxY
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

const DESKTOP_INSETS: CameraSafeInsets = {
  top: 72,
  right: 24,
  bottom: 132,
  left: 24,
};

function createController(overrides: Parameters<typeof createFungiCameraController>[2] = {}) {
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 200);
  const dom = createFakeDomElement();
  const controller = createFungiCameraController(camera, dom, overrides);
  return { camera, dom, controller };
}

describe('createFungiCameraController', () => {
  it('frames every mission apparatus inside the unobstructed viewport', () => {
    const { camera, controller } = createController();
    controller.setViewport(1280, 720, DESKTOP_INSETS);

    for (const mission of FUNGI_MISSIONS) {
      const box = boxFor(mission.focusBounds);
      controller.focusBounds(box, mutablePose(mission.cameraPose), { animate: false });

      expect(
        cornersInsideSafeFrame(box, camera, 1280, 720, DESKTOP_INSETS),
      ).toBe(true);
    }
    controller.dispose();
  });

  it('retreats further when interface surfaces shrink the safe frame', () => {
    const mission = FUNGI_MISSIONS[0]!;
    const box = boxFor(mission.focusBounds);

    const { controller } = createController();
    controller.setViewport(1280, 720, { top: 8, right: 8, bottom: 8, left: 8 });
    controller.focusBounds(box, mutablePose(mission.cameraPose), { animate: false });
    const openDistance = controller.snapshot().distance;

    controller.setViewport(1280, 720, { top: 120, right: 24, bottom: 320, left: 24 });
    const crowdedDistance = controller.snapshot().distance;

    expect(crowdedDistance).toBeGreaterThan(openDistance);
    controller.dispose();
  });

  it('keeps a phone viewport framed after a resize without re-authoring the pose', () => {
    const mission = FUNGI_MISSIONS[3]!;
    const box = boxFor(mission.focusBounds);
    const phoneInsets: CameraSafeInsets = { top: 64, right: 12, bottom: 300, left: 12 };

    const { camera, controller } = createController();
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    controller.focusBounds(box, mutablePose(mission.cameraPose), { animate: false });
    controller.setViewport(390, 844, phoneInsets);

    expect(camera.aspect).toBeCloseTo(390 / 844, 6);
    expect(cornersInsideSafeFrame(box, camera, 390, 844, phoneInsets)).toBe(true);
    controller.dispose();
  });

  it('constrains orbit drag to bounded azimuth and polar angles', () => {
    const mission = FUNGI_MISSIONS[0]!;
    const { dom, controller } = createController({
      azimuthRange: 0.5,
      minPolar: 0.35,
      maxPolar: 1.3,
    });
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    controller.focusBounds(boxFor(mission.focusBounds), mutablePose(mission.cameraPose), {
      animate: false,
    });
    const authored = controller.snapshot();

    dom.dispatch('pointerdown', { clientX: 0, clientY: 0 });
    dom.dispatch('pointermove', { clientX: 100000, clientY: 100000 });
    dom.dispatch('pointerup', {});
    const dragged = controller.snapshot();

    expect(Math.abs(dragged.azimuth - authored.azimuth)).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(dragged.polar).toBeGreaterThanOrEqual(0.35 - 1e-9);
    expect(dragged.polar).toBeLessThanOrEqual(1.3 + 1e-9);

    dom.dispatch('pointerdown', { clientX: 0, clientY: 0 });
    dom.dispatch('pointermove', { clientX: -100000, clientY: -100000 });
    dom.dispatch('pointerup', {});
    const reversed = controller.snapshot();

    expect(Math.abs(reversed.azimuth - authored.azimuth)).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(reversed.polar).toBeGreaterThanOrEqual(0.35 - 1e-9);
    expect(reversed.polar).toBeLessThanOrEqual(1.3 + 1e-9);

    // A real drag must actually turn the view, not merely stay legal.
    expect(Math.abs(dragged.azimuth - reversed.azimuth)).toBeGreaterThan(0.1);
    controller.dispose();
  });

  it('rotates around the apparatus rather than relocating the target', () => {
    const mission = FUNGI_MISSIONS[1]!;
    const { dom, controller } = createController();
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    controller.focusBounds(boxFor(mission.focusBounds), mutablePose(mission.cameraPose), {
      animate: false,
    });
    const before = controller.snapshot();

    dom.dispatch('pointerdown', { clientX: 200, clientY: 200 });
    dom.dispatch('pointermove', { clientX: 260, clientY: 210 });
    dom.dispatch('pointerup', {});
    const after = controller.snapshot();

    expect(after.target).toEqual(before.target);
    expect(after.distance).toBeCloseTo(before.distance, 6);
    expect(after.azimuth).not.toBeCloseTo(before.azimuth, 6);
    controller.dispose();
  });

  it('clamps wheel and pinch zoom between the collision radius and the framed distance', () => {
    const mission = FUNGI_MISSIONS[3]!;
    const box = boxFor(mission.focusBounds);
    const { controller } = createController();
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    controller.focusBounds(box, mutablePose(mission.cameraPose), { animate: false });
    const framed = controller.snapshot().distance;

    controller.zoomBy(-100000);
    const nearest = controller.snapshot().distance;
    const collisionRadius = box.getBoundingSphere(new THREE.Sphere()).radius;
    expect(nearest).toBeGreaterThan(0);
    expect(nearest).toBeLessThan(framed);
    expect(nearest).toBeGreaterThanOrEqual(collisionRadius);

    controller.zoomBy(100000);
    const furthest = controller.snapshot().distance;
    expect(furthest).toBeGreaterThan(nearest);
    expect(Number.isFinite(furthest)).toBe(true);
    controller.dispose();
  });

  it('suspends an authored transition the moment the learner takes hold', () => {
    const mission = FUNGI_MISSIONS[2]!;
    const { camera, controller } = createController({ transitionSeconds: 1 });
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    controller.focusBounds(boxFor(FUNGI_MISSIONS[0]!.focusBounds), mutablePose(FUNGI_MISSIONS[0]!.cameraPose), {
      animate: false,
    });

    controller.focusBounds(boxFor(mission.focusBounds), mutablePose(mission.cameraPose));
    expect(controller.snapshot().transitioning).toBe(true);
    controller.update(0.2);

    controller.beginManipulation();
    expect(controller.snapshot().transitioning).toBe(false);
    expect(controller.snapshot().manipulating).toBe(true);

    const held = camera.position.clone();
    controller.update(5);
    expect(camera.position.distanceTo(held)).toBeLessThan(1e-9);

    controller.endManipulation();
    expect(controller.snapshot().manipulating).toBe(false);
    controller.dispose();
  });

  it('returns to the authored mission pose on resetView after orbiting away', () => {
    const mission = FUNGI_MISSIONS[4]!;
    const { dom, controller } = createController({ transitionSeconds: 0.5 });
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    controller.focusBounds(boxFor(mission.focusBounds), mutablePose(mission.cameraPose), {
      animate: false,
    });
    const authored = controller.snapshot();

    dom.dispatch('pointerdown', { clientX: 0, clientY: 0 });
    dom.dispatch('pointermove', { clientX: 90, clientY: 40 });
    dom.dispatch('pointerup', {});
    controller.zoomBy(-400);
    expect(controller.snapshot().azimuth).not.toBeCloseTo(authored.azimuth, 6);

    controller.resetView();
    controller.update(5);
    const restored = controller.snapshot();

    expect(restored.azimuth).toBeCloseTo(authored.azimuth, 5);
    expect(restored.polar).toBeCloseTo(authored.polar, 5);
    expect(restored.distance).toBeCloseTo(authored.distance, 5);
    controller.dispose();
  });

  it('dollies to the apparatus on focusSpecimen without changing the orbit angles', () => {
    const mission = FUNGI_MISSIONS[0]!;
    const { controller } = createController();
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    controller.focusBounds(boxFor(mission.focusBounds), mutablePose(mission.cameraPose), {
      animate: false,
    });
    const framed = controller.snapshot();

    controller.focusSpecimen();
    controller.update(5);
    const focused = controller.snapshot();

    expect(focused.distance).toBeLessThan(framed.distance);
    expect(focused.azimuth).toBeCloseTo(framed.azimuth, 6);
    expect(focused.polar).toBeCloseTo(framed.polar, 6);
    controller.dispose();
  });

  it('reaches the identical pose without tweening when reduced motion is requested', () => {
    const mission = FUNGI_MISSIONS[5]!;
    const box = boxFor(mission.focusBounds);
    const pose = mutablePose(mission.cameraPose);

    const animated = createController({ transitionSeconds: 0.6 });
    animated.controller.setViewport(1280, 720, DESKTOP_INSETS);
    animated.controller.focusBounds(box, pose, { animate: false });

    const reduced = createController({ transitionSeconds: 0.6, reducedMotion: true });
    reduced.controller.setViewport(1280, 720, DESKTOP_INSETS);
    reduced.controller.focusBounds(box, pose, { animate: true });

    expect(reduced.controller.snapshot().transitioning).toBe(false);
    expect(reduced.camera.position.distanceTo(animated.camera.position)).toBeLessThan(1e-9);

    animated.controller.dispose();
    reduced.controller.dispose();
  });

  it('lets a click through instead of swallowing it as an orbit', () => {
    // Capturing the pointer on press stole every click on a specimen: the
    // canvas never saw the pointerup, so selection never completed.
    const captured: number[] = [];
    const { dom, controller } = createController();
    (dom as unknown as { setPointerCapture(id: number): void }).setPointerCapture = (id) =>
      captured.push(id);
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    controller.focusBounds(
      boxFor(FUNGI_MISSIONS[0]!.focusBounds),
      mutablePose(FUNGI_MISSIONS[0]!.cameraPose),
      { animate: false },
    );
    const before = controller.snapshot();

    // A click: press, a pixel of jitter, release.
    dom.dispatch('pointerdown', { clientX: 100, clientY: 100 });
    dom.dispatch('pointermove', { clientX: 101, clientY: 100 });
    dom.dispatch('pointerup', {});

    expect(captured).toHaveLength(0);
    expect(controller.snapshot().azimuth).toBeCloseTo(before.azimuth, 9);

    // A drag: past the threshold, the camera takes the pointer and orbits.
    dom.dispatch('pointerdown', { clientX: 100, clientY: 100 });
    dom.dispatch('pointermove', { clientX: 160, clientY: 108 });
    dom.dispatch('pointerup', {});

    expect(captured).toHaveLength(1);
    expect(controller.snapshot().azimuth).not.toBeCloseTo(before.azimuth, 6);
    controller.dispose();
  });

  it('rejects invalid framing requests before touching the camera', () => {
    const { camera, controller } = createController();
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    controller.focusBounds(
      boxFor(FUNGI_MISSIONS[0]!.focusBounds),
      mutablePose(FUNGI_MISSIONS[0]!.cameraPose),
      { animate: false },
    );
    const before = camera.position.clone();

    expect(() =>
      controller.focusBounds(new THREE.Box3(), mutablePose(FUNGI_MISSIONS[0]!.cameraPose)),
    ).toThrow(/bounds/i);
    expect(() =>
      controller.setViewport(0, 720, DESKTOP_INSETS),
    ).toThrow(/viewport/i);
    expect(() =>
      controller.focusBounds(boxFor(FUNGI_MISSIONS[0]!.focusBounds), {
        position: [Number.NaN, 1, 1],
        target: [0, 0, 0],
      }),
    ).toThrow(/finite/i);

    expect(camera.position.distanceTo(before)).toBeLessThan(1e-9);
    controller.dispose();
  });

  it('allocates nothing per frame and releases every listener exactly once', () => {
    const mission = FUNGI_MISSIONS[0]!;
    const { dom, controller } = createController({ transitionSeconds: 1 });
    controller.setViewport(1280, 720, DESKTOP_INSETS);
    expect(dom.listenerCount()).toBeGreaterThan(0);

    controller.focusBounds(boxFor(mission.focusBounds), mutablePose(mission.cameraPose));
    for (let frame = 0; frame < 240; frame += 1) controller.update(1 / 60);
    expect(controller.snapshot().transitioning).toBe(false);

    controller.dispose();
    controller.dispose();
    expect(dom.listenerCount()).toBe(0);
  });
});
