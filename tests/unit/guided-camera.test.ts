import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  computeFocusFrame,
  createGuidedCamera,
} from '../../apps/web/lib/world-builder/guidedCamera';

function createFakeDomElement() {
  const listeners = new Map<string, (event: unknown) => void>();
  const self = {
    style: {} as Record<string, string>,
    clientHeight: 400,
    clientWidth: 400,
    addEventListener(type: string, handler: (event: unknown) => void) {
      listeners.set(type, handler);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
    getRootNode() {
      return self;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 };
    },
    setPointerCapture() {},
    releasePointerCapture() {},
  };
  return self as unknown as HTMLElement;
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
  it('snaps immediately to a frame when animate is disabled', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    const guided = createGuidedCamera(camera, createFakeDomElement());

    guided.focusOn(
      { position: new THREE.Vector3(1, 2, 3), target: new THREE.Vector3(0, 1, 0) },
      { animate: false },
    );

    expect(camera.position.equals(new THREE.Vector3(1, 2, 3))).toBe(true);
    expect(guided.isTransitioning()).toBe(false);
    guided.dispose();
  });

  it('eases toward a new frame across update() calls instead of jumping', () => {
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

  it('tightens the orbit window around the active shot once arrived', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    const guided = createGuidedCamera(camera, createFakeDomElement(), {
      transitionSeconds: 0.5,
    });

    guided.focusOn({
      position: new THREE.Vector3(0, 0, 2),
      target: new THREE.Vector3(0, 0, 0),
    });
    guided.update(0.5);

    expect(guided.controls.maxDistance).toBeLessThan(10);
    expect(Number.isFinite(guided.controls.minAzimuthAngle)).toBe(true);
    guided.dispose();
  });
});
