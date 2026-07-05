import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  computeFocusFrame,
  createGuidedCamera,
} from '../../apps/web/lib/world-builder/guidedCamera';

function createFakeDomElement() {
  const listeners = new Map<string, (event: any) => void>();
  const self = {
    style: {} as Record<string, string>,
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

  it('rotates around the camera eye, not a distant point, and is never blocked', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const dom = createFakeDomElement();
    const guided = createGuidedCamera(camera, dom, { transitionSeconds: 0.4 });

    // Mid-transition: dragging should still rotate the view immediately.
    guided.focusOn({
      position: new THREE.Vector3(5, 0, 0),
      target: new THREE.Vector3(5, 0, -1),
    });
    guided.update(0.1); // partway through the move

    const positionBeforeDrag = camera.position.clone();
    dom.dispatch('pointerdown', { clientX: 100, clientY: 100 });
    dom.dispatch('pointermove', { clientX: 200, clientY: 100 });

    // Rotation must not relocate the eye — only orientation changes.
    expect(camera.position.distanceTo(positionBeforeDrag)).toBeLessThan(1e-6);
    const directionAfterDrag = camera.getWorldDirection(new THREE.Vector3());

    // Finish the transition; since the learner took over rotation, the
    // automatic look-at-target orientation must not silently override it.
    guided.update(1);
    const directionAfterSettle = camera.getWorldDirection(new THREE.Vector3());
    expect(directionAfterSettle.angleTo(directionAfterDrag)).toBeLessThan(1e-6);
    guided.dispose();
  });

  it('clamps the scroll zoom to the configured field-of-view range', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const dom = createFakeDomElement();
    const guided = createGuidedCamera(camera, dom, { minFov: 40, maxFov: 80 });

    dom.dispatch('wheel', { deltaY: 100000 });
    expect(camera.fov).toBeLessThanOrEqual(80);

    dom.dispatch('wheel', { deltaY: -100000 });
    expect(camera.fov).toBeGreaterThanOrEqual(40);
    guided.dispose();
  });
});
