import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';

import { createOrbitCameraControls } from '@xr-school/simulation-web';

/** Minimal stand-in for the renderer canvas, recording its own listeners. */
function createElementStub() {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const element = {
    style: { touchAction: '' } as CSSStyleDeclaration,
    addEventListener(type: string, handler: (event: unknown) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: (event: unknown) => void) {
      listeners.get(type)?.delete(handler);
    },
    setPointerCapture() {},
    releasePointerCapture() {},
  } as unknown as HTMLElement;
  const emit = (type: string, event: Record<string, unknown>) => {
    for (const handler of listeners.get(type) ?? []) handler(event);
  };
  return { element, emit, listeners };
}

function drag(
  emit: (type: string, event: Record<string, unknown>) => void,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  emit('pointerdown', { pointerId: 1, clientX: from.x, clientY: from.y });
  emit('pointermove', { pointerId: 1, clientX: to.x, clientY: to.y });
  emit('pointerup', { pointerId: 1, clientX: to.x, clientY: to.y });
}

describe('browser orbit camera controls', () => {
  let camera: THREE.PerspectiveCamera;
  let presenting: boolean;
  let stub: ReturnType<typeof createElementStub>;

  const build = (overrides: Record<string, unknown> = {}) =>
    createOrbitCameraControls({
      domElement: stub.element,
      camera,
      isPresenting: () => presenting,
      ...overrides,
    });

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(58, 1, 0.04, 80);
    camera.position.set(0, 0, 0);
    presenting = false;
    stub = createElementStub();
  });

  it('backs the camera off a pivot it is sitting exactly on', () => {
    const controls = build();
    controls.setTarget(new THREE.Vector3(0, 0, -3));

    // Camera started at the origin, i.e. 3m from the pivot along -Z.
    expect(camera.position.distanceTo(new THREE.Vector3(0, 0, -3))).toBeCloseTo(3, 3);

    // A pivot on top of the camera has no orbit to infer, so it must still
    // produce a usable distance rather than a zero-radius sphere.
    controls.setTarget(camera.position.clone());
    const radius = camera.position.distanceTo(controls.target());
    expect(radius).toBeGreaterThan(0.1);
    expect(Number.isFinite(radius)).toBe(true);
    controls.dispose();
  });

  it('keeps the pivot distance constant while dragging', () => {
    const controls = build();
    const pivot = new THREE.Vector3(0, 0, -3);
    controls.setTarget(pivot);
    const before = camera.position.distanceTo(pivot);

    drag(stub.emit, { x: 100, y: 100 }, { x: 220, y: 140 });

    expect(camera.position.distanceTo(pivot)).toBeCloseTo(before, 3);
    controls.dispose();
  });

  it('turns the camera when dragged horizontally', () => {
    const controls = build();
    controls.setTarget(new THREE.Vector3(0, 0, -3));
    const before = camera.position.clone();

    drag(stub.emit, { x: 100, y: 100 }, { x: 260, y: 100 });

    expect(camera.position.distanceTo(before)).toBeGreaterThan(0.1);
    controls.dispose();
  });

  it('clamps the polar angle so the camera never flips over the pole', () => {
    const controls = build();
    const pivot = new THREE.Vector3(0, 0, -3);
    controls.setTarget(pivot);

    // Far more vertical drag than the polar range allows.
    drag(stub.emit, { x: 100, y: 100 }, { x: 100, y: -4000 });
    const high = camera.position.clone().sub(pivot).normalize();
    expect(high.y).toBeLessThan(1);
    expect(Number.isNaN(high.y)).toBe(false);

    drag(stub.emit, { x: 100, y: 100 }, { x: 100, y: 4000 });
    const low = camera.position.clone().sub(pivot).normalize();
    expect(low.y).toBeGreaterThan(-1);
    expect(Number.isNaN(low.y)).toBe(false);
    controls.dispose();
  });

  it('zooms on wheel within the configured distance limits', () => {
    const controls = build({ minDistance: 1, maxDistance: 6 });
    const pivot = new THREE.Vector3(0, 0, -3);
    controls.setTarget(pivot);

    for (let i = 0; i < 80; i += 1) {
      stub.emit('wheel', { deltaY: -120, preventDefault() {} });
    }
    expect(camera.position.distanceTo(pivot)).toBeGreaterThanOrEqual(1 - 1e-6);

    for (let i = 0; i < 200; i += 1) {
      stub.emit('wheel', { deltaY: 120, preventDefault() {} });
    }
    expect(camera.position.distanceTo(pivot)).toBeLessThanOrEqual(6 + 1e-6);
    controls.dispose();
  });

  it('yields the camera to the player rig during an immersive session', () => {
    const controls = build();
    controls.setTarget(new THREE.Vector3(0, 0, -3));
    presenting = true;
    const before = camera.position.clone();

    drag(stub.emit, { x: 100, y: 100 }, { x: 400, y: 300 });
    stub.emit('wheel', { deltaY: -120, preventDefault() {} });

    expect(camera.position.equals(before)).toBe(true);
    controls.dispose();
  });

  it('stops responding once disabled, and again once disposed', () => {
    const controls = build();
    controls.setTarget(new THREE.Vector3(0, 0, -3));

    controls.setEnabled(false);
    const whileDisabled = camera.position.clone();
    drag(stub.emit, { x: 100, y: 100 }, { x: 400, y: 300 });
    expect(camera.position.equals(whileDisabled)).toBe(true);

    controls.setEnabled(true);
    drag(stub.emit, { x: 100, y: 100 }, { x: 400, y: 300 });
    expect(camera.position.equals(whileDisabled)).toBe(false);

    const afterDispose = camera.position.clone();
    controls.dispose();
    drag(stub.emit, { x: 100, y: 100 }, { x: 500, y: 400 });
    expect(camera.position.equals(afterDispose)).toBe(true);
  });

  it('orbits in the rig space when the camera is parented', () => {
    const rig = new THREE.Group();
    rig.position.set(4, 0, 9);
    rig.add(camera);
    new THREE.Scene().add(rig);

    const controls = build();
    const pivotWorld = new THREE.Vector3(4, 0, 6);
    controls.setTarget(pivotWorld);

    // Distance is measured in world space, so the rig offset must not leak in.
    camera.updateWorldMatrix(true, false);
    const worldPosition = camera.getWorldPosition(new THREE.Vector3());
    expect(worldPosition.distanceTo(pivotWorld)).toBeCloseTo(3, 3);

    drag(stub.emit, { x: 100, y: 100 }, { x: 200, y: 130 });
    camera.updateWorldMatrix(true, false);
    expect(
      camera.getWorldPosition(new THREE.Vector3()).distanceTo(pivotWorld),
    ).toBeCloseTo(3, 3);
    controls.dispose();
  });

  it('reports learner control so an automatic reframe can stand down', () => {
    const controls = build();
    controls.setTarget(new THREE.Vector3(0, 0, -3));
    // Re-aiming the pivot is the lesson's doing, not the learner's.
    expect(controls.interacted()).toBe(false);

    drag(stub.emit, { x: 100, y: 100 }, { x: 180, y: 120 });
    expect(controls.interacted()).toBe(true);
    controls.dispose();
  });

  it('counts a wheel zoom as learner control', () => {
    const controls = build();
    controls.setTarget(new THREE.Vector3(0, 0, -3));
    expect(controls.interacted()).toBe(false);

    stub.emit('wheel', { deltaY: -120, preventDefault() {} });
    expect(controls.interacted()).toBe(true);
    controls.dispose();
  });

  it('does not count a blocked immersive drag as learner control', () => {
    const controls = build();
    controls.setTarget(new THREE.Vector3(0, 0, -3));
    presenting = true;

    drag(stub.emit, { x: 100, y: 100 }, { x: 400, y: 300 });
    expect(controls.interacted()).toBe(false);
    controls.dispose();
  });

  it('restores the previous touch-action so the page scrolls again', () => {
    stub.element.style.touchAction = 'pan-y';
    const controls = build();
    expect(stub.element.style.touchAction).toBe('none');
    controls.dispose();
    expect(stub.element.style.touchAction).toBe('pan-y');
  });
});
