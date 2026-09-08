import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  computeFocusFrame,
  createGuidedCamera,
} from '../../apps/web/lib/world-builder/guidedCamera';

function createFakeDomElement() {
  const listeners = new Map<string, (event: any) => void>();
  const rootListeners = new Map<string, (event: any) => void>();
  const root = {
    addEventListener(type: string, handler: (event: any) => void) {
      rootListeners.set(type, handler);
    },
    removeEventListener(type: string) {
      rootListeners.delete(type);
    },
  };
  const self = {
    style: {} as Record<string, string>,
    clientWidth: 800,
    clientHeight: 600,
    addEventListener(type: string, handler: (event: any) => void) {
      listeners.set(type, handler);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture() {
      return false;
    },
    getRootNode() {
      return root;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600 };
    },
    dispatch(type: string, event: Record<string, unknown> = {}) {
      listeners.get(type)?.({ preventDefault() {}, ...event });
    },
  };
  return self as unknown as HTMLElement & {
    dispatch(type: string, event?: Record<string, unknown>): void;
  };
}

describe('computeFocusFrame', () => {
  it('targets the object world center regardless of nesting or scale', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const group = new THREE.Group();
    group.position.set(2, 1, -3);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh.position.set(0, 0.5, 0);
    group.add(mesh);
    group.updateMatrixWorld(true);

    const frame = computeFocusFrame(mesh, camera);

    expect(frame.target.x).toBeCloseTo(2, 5);
    expect(frame.target.y).toBeCloseTo(1.5, 5);
    expect(frame.target.z).toBeCloseTo(-3, 5);
  });

  it('frames several objects together when given an array', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3));
    left.position.set(-2, 0, 0);
    left.updateMatrixWorld(true);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3));
    right.position.set(2, 0, 0);
    right.updateMatrixWorld(true);

    const soloFrame = computeFocusFrame(left, camera);
    const pairFrame = computeFocusFrame([left, right], camera);

    // The pair's target sits between both objects, not on either one, and
    // the camera must back off further to fit both in frame.
    expect(pairFrame.target.x).toBeCloseTo(0, 5);
    expect(pairFrame.position.distanceTo(pairFrame.target))
      .toBeGreaterThan(soloFrame.position.distanceTo(soloFrame.target));
  });

  it('dollies closer for a smaller object than a larger one', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const small = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
    small.updateMatrixWorld(true);
    const large = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4));
    large.updateMatrixWorld(true);

    const smallFrame = computeFocusFrame(small, camera);
    const largeFrame = computeFocusFrame(large, camera);

    const smallDistance = smallFrame.position.distanceTo(smallFrame.target);
    const largeDistance = largeFrame.position.distanceTo(largeFrame.target);
    expect(smallDistance).toBeLessThan(largeDistance);
  });

  it('never dollies in closer than the configured minimum distance', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    const tiny = new THREE.Mesh(new THREE.SphereGeometry(0.001, 4, 4));
    tiny.updateMatrixWorld(true);

    const frame = computeFocusFrame(tiny, camera, { minDistance: 0.4 });

    expect(frame.position.distanceTo(frame.target)).toBeGreaterThanOrEqual(0.4);
  });

  it('is idempotent — re-focusing the same object from the last result does not creep upward', () => {
    // Reproduces the reported bug: clicking the same object repeatedly (the
    // camera having already moved to the previous focus result) must not
    // tilt the camera progressively higher each time.
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1.5, 3);
    const target = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3));
    target.position.set(0, 0.9, -1);
    target.updateMatrixWorld(true);

    const first = computeFocusFrame(target, camera);
    camera.position.copy(first.position);
    const second = computeFocusFrame(target, camera);
    camera.position.copy(second.position);
    const third = computeFocusFrame(target, camera);

    expect(second.position.y).toBeCloseTo(first.position.y, 5);
    expect(third.position.y).toBeCloseTo(first.position.y, 5);
  });
});

describe('createGuidedCamera', () => {
  it('snaps immediately to a frame and faces its target when animate is disabled', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const guided = createGuidedCamera(camera, createFakeDomElement());

    guided.focusOn(
      { position: new THREE.Vector3(1, 2, 3), target: new THREE.Vector3(1, 2, 0) },
      { animate: false },
    );

    expect(camera.position.equals(new THREE.Vector3(1, 2, 3))).toBe(true);
    const direction = camera.getWorldDirection(new THREE.Vector3());
    expect(direction.z).toBeLessThan(0);
    expect(guided.isTransitioning()).toBe(false);
    guided.dispose();
  });

  it('eases the eye position toward a new shot across update() calls instead of jumping', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    const guided = createGuidedCamera(camera, createFakeDomElement(), {
      transitionSeconds: 1,
    });

    guided.focusOn({
      position: new THREE.Vector3(0, 0, 1),
      target: new THREE.Vector3(0, 0, 0),
    });

    expect(guided.isTransitioning()).toBe(true);
    guided.update(0.5);
    const midDistance = camera.position.distanceTo(new THREE.Vector3(0, 0, 1));
    expect(midDistance).toBeGreaterThan(0);
    expect(guided.isTransitioning()).toBe(true);

    guided.update(0.5);
    expect(camera.position.distanceTo(new THREE.Vector3(0, 0, 1))).toBeCloseTo(0, 5);
    expect(guided.isTransitioning()).toBe(false);
    guided.dispose();
  });

  it('enables browser orbit, pan, and dolly controls around the guided target', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1, 5);
    const dom = createFakeDomElement();
    const guided = createGuidedCamera(camera, dom);

    expect(guided.controls.enableRotate).toBe(true);
    expect(guided.controls.enablePan).toBe(true);
    expect(guided.controls.screenSpacePanning).toBe(true);
    expect(guided.controls.enableZoom).toBe(true);
    expect(guided.controls.enableDamping).toBe(true);
    guided.dispose();
  });

  it('orbits the camera around the focus target while preserving its radius', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1, 5);
    const dom = createFakeDomElement();
    const guided = createGuidedCamera(camera, dom);
    guided.focusOn(
      { position: new THREE.Vector3(0, 1, 5), target: new THREE.Vector3(0, 1, 0) },
      { animate: false },
    );
    const before = camera.position.clone();
    const radius = camera.position.distanceTo(guided.controls.target);

    guided.controls.autoRotate = true;
    guided.update(1);

    expect(camera.position.distanceTo(before)).toBeGreaterThan(0.01);
    expect(camera.position.distanceTo(guided.controls.target)).toBeCloseTo(radius, 5);
    guided.dispose();
  });

  it('pans the camera target with a right-button drag', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1, 5);
    const dom = createFakeDomElement();
    const guided = createGuidedCamera(camera, dom);
    const targetBefore = guided.controls.target.clone();

    dom.dispatch('pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 2,
      clientX: 300,
      clientY: 300,
    });
    dom.dispatch('pointermove', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 2,
      clientX: 360,
      clientY: 325,
    });
    dom.dispatch('pointerup', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 2,
      clientX: 360,
      clientY: 325,
    });
    guided.update(1 / 60);

    expect(guided.controls.target.distanceTo(targetBefore)).toBeGreaterThan(0.01);
    guided.dispose();
  });
});
