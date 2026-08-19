import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import type {
  NormalizedAction,
  NormalizedInputSource,
} from '@xr-school/simulation-schema';
import { createWebInputRouter } from '../../packages/simulation-web/src/input/createWebInputRouter';

type PointerLikeEvent = {
  button: number;
  clientX: number;
  clientY: number;
  pointerId: number;
  pointerType: string;
};

function createFakeDomElement() {
  const listeners = new Map<string, Set<(event: PointerLikeEvent) => void>>();
  const element = {
    style: { cursor: '' },
    addEventListener(type: string, listener: (event: PointerLikeEvent) => void) {
      const group = listeners.get(type) ?? new Set();
      group.add(listener);
      listeners.set(type, group);
    },
    removeEventListener(type: string, listener: (event: PointerLikeEvent) => void) {
      listeners.get(type)?.delete(listener);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100 };
    },
    dispatch(type: string, event: Partial<PointerLikeEvent> = {}) {
      const complete = {
        button: 0,
        clientX: 50,
        clientY: 50,
        pointerId: 1,
        pointerType: 'mouse',
        ...event,
      };
      for (const listener of listeners.get(type) ?? []) listener(complete);
    },
    listenerCount() {
      return Array.from(listeners.values()).reduce((total, group) => total + group.size, 0);
    },
  };
  return element;
}

function createLookingCamera() {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

function createMesh(size = 2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size));
  mesh.updateMatrixWorld(true);
  return mesh;
}

function createHarness(options: {
  controllers?: THREE.XRTargetRaySpace[];
  onDispatch?: (action: NormalizedAction) => void;
} = {}) {
  const dom = createFakeDomElement();
  const actions: NormalizedAction[] = [];
  let stageId = 'stage-observe';
  const router = createWebInputRouter({
    camera: createLookingCamera(),
    domElement: dom,
    xrControllers: options.controllers,
    currentSnapshot: () => ({ stageId }),
    dispatch(action) {
      actions.push(action);
      options.onDispatch?.(action);
    },
    now: () => 321,
  });
  return {
    actions,
    dom,
    router,
    setStage(next: string) {
      stageId = next;
    },
  };
}

function registerTarget(
  harness: ReturnType<typeof createHarness>,
  object: THREE.Object3D,
  options: {
    id?: string;
    actionId?: string;
    accessibilityLabel?: string;
    inputSources?: NormalizedInputSource[];
    onCommit?: (action: NormalizedAction) => void;
  } = {},
) {
  return harness.router.interactions.register({
    id: options.id ?? 'target-switch',
    object,
    actionId: options.actionId ?? 'toggle-switch',
    accessibilityLabel: options.accessibilityLabel ?? 'Toggle the switch',
    inputSources: options.inputSources,
    onCommit: options.onCommit,
  });
}

describe('createWebInputRouter', () => {
  it('normalizes a keyboard proxy activation with the current stage snapshot', () => {
    const order: string[] = [];
    const harness = createHarness({ onDispatch: () => order.push('dispatch') });
    const mesh = createMesh();
    registerTarget(harness, mesh, {
      onCommit: () => order.push('commit'),
    });
    harness.setStage('stage-test');

    harness.router.interactions.activate('target-switch', 'keyboard');

    expect(harness.actions).toEqual([{
      actionId: 'toggle-switch',
      targetEntityId: 'target-switch',
      source: 'keyboard',
      phase: 'commit',
      stageId: 'stage-test',
      timestampMs: 321,
    }]);
    expect(order).toEqual(['dispatch', 'commit']);
    harness.router.dispose();
  });

  it.each([
    { pointerType: 'mouse', source: 'mouse' },
    { pointerType: 'touch', source: 'touch' },
  ] as const)('routes a $source pointer commit through a registered ancestor', ({ pointerType, source }) => {
    const harness = createHarness();
    const target = new THREE.Group();
    target.add(createMesh());
    target.updateMatrixWorld(true);
    registerTarget(harness, target);

    harness.dom.dispatch('pointerdown', { pointerType });
    harness.dom.dispatch('pointerup', { pointerType });

    expect(harness.actions).toHaveLength(1);
    expect(harness.actions[0]).toMatchObject({
      targetEntityId: 'target-switch',
      source,
      phase: 'commit',
    });
    harness.router.dispose();
  });

  it('ignores a ray hit when any ancestor is hidden', () => {
    const harness = createHarness();
    const hiddenStage = new THREE.Group();
    const mesh = createMesh();
    hiddenStage.add(mesh);
    hiddenStage.updateMatrixWorld(true);
    hiddenStage.visible = false;
    registerTarget(harness, mesh);

    harness.dom.dispatch('pointerdown');
    harness.dom.dispatch('pointerup');

    expect(harness.actions).toEqual([]);
    harness.router.dispose();
  });

  it('ignores keyboard or DOM proxy activation when the target has a hidden ancestor', () => {
    const onCommit = vi.fn();
    const harness = createHarness();
    const hiddenStage = new THREE.Group();
    const mesh = createMesh();
    hiddenStage.add(mesh);
    hiddenStage.updateMatrixWorld(true);
    hiddenStage.visible = false;
    registerTarget(harness, mesh, { onCommit });

    harness.router.interactions.activate('target-switch', 'keyboard');

    expect(harness.actions).toEqual([]);
    expect(onCommit).not.toHaveBeenCalled();
    harness.router.dispose();
  });

  it('treats six pixels as a click and movement beyond six pixels as a drag', () => {
    const harness = createHarness();
    registerTarget(harness, createMesh());

    harness.dom.dispatch('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 });
    harness.dom.dispatch('pointerup', { clientX: 56, clientY: 50, pointerId: 1 });
    harness.dom.dispatch('pointerdown', { clientX: 50, clientY: 50, pointerId: 2 });
    harness.dom.dispatch('pointerup', { clientX: 57, clientY: 50, pointerId: 2 });

    expect(harness.actions).toHaveLength(1);
    harness.router.dispose();
  });

  it('reserves non-primary mouse buttons for OrbitControls panning', () => {
    const harness = createHarness();
    registerTarget(harness, createMesh());

    harness.dom.dispatch('pointerdown', { button: 2 });
    harness.dom.dispatch('pointerup', { button: 2 });

    expect(harness.actions).toEqual([]);
    harness.router.dispose();
  });

  it('casts XR controller selection rays in world space after the player rig turns', () => {
    const rig = new THREE.Group();
    const controller = new THREE.Group() as unknown as THREE.XRTargetRaySpace;
    rig.add(controller);
    rig.rotation.y = Math.PI / 2;
    rig.updateMatrixWorld(true);
    const harness = createHarness({ controllers: [controller] });
    const mesh = createMesh(1);
    mesh.position.set(-3, 0, 0);
    mesh.updateMatrixWorld(true);
    registerTarget(harness, mesh, { inputSources: ['xr-controller'] });

    controller.dispatchEvent({ type: 'select' } as never);

    expect(harness.actions).toHaveLength(1);
    expect(harness.actions[0]).toMatchObject({
      source: 'xr-controller',
      targetEntityId: 'target-switch',
    });
    harness.router.dispose();
  });

  it('filters disallowed input sources without dispatching or committing', () => {
    const onCommit = vi.fn();
    const harness = createHarness();
    registerTarget(harness, createMesh(), {
      inputSources: ['keyboard'],
      onCommit,
    });

    harness.dom.dispatch('pointerdown');
    harness.dom.dispatch('pointerup');
    harness.router.interactions.activate('target-switch', 'mouse');

    expect(harness.actions).toEqual([]);
    expect(onCommit).not.toHaveBeenCalled();
    harness.router.interactions.activate('target-switch', 'keyboard');
    expect(harness.actions).toHaveLength(1);
    expect(onCommit).toHaveBeenCalledOnce();
    harness.router.dispose();
  });

  it('rejects blank, duplicate, and unknown registrations or activations', () => {
    const harness = createHarness();
    const mesh = createMesh();

    expect(() => registerTarget(harness, mesh, { id: ' ' })).toThrow(/target id.*required/i);
    expect(() => registerTarget(harness, mesh, { actionId: ' ' })).toThrow(/action id.*required/i);
    expect(() => registerTarget(harness, mesh, { accessibilityLabel: ' ' })).toThrow(/accessibility label.*required/i);
    registerTarget(harness, mesh);
    expect(() => registerTarget(harness, createMesh())).toThrow(/already registered/i);
    expect(() => harness.router.interactions.activate('missing', 'keyboard')).toThrow(/unknown interaction target/i);
    expect(() => harness.router.interactions.activate(
      'target-switch',
      'gamepad' as NormalizedInputSource,
    )).toThrow(/unsupported input source/i);
    harness.router.dispose();
  });

  it('supports unregister and clear without stale cleanup removing a replacement', () => {
    const harness = createHarness();
    const unregisterFirst = registerTarget(harness, createMesh());
    unregisterFirst();
    const unregisterReplacement = registerTarget(harness, createMesh(), { actionId: 'replace' });
    unregisterFirst();

    harness.router.interactions.activate('target-switch', 'keyboard');
    expect(harness.actions[0]?.actionId).toBe('replace');

    unregisterReplacement();
    expect(() => harness.router.interactions.activate('target-switch', 'keyboard')).toThrow(/unknown interaction target/i);
    registerTarget(harness, createMesh());
    harness.router.interactions.clear();
    expect(() => harness.router.interactions.activate('target-switch', 'keyboard')).toThrow(/unknown interaction target/i);
    harness.router.dispose();
  });

  it('removes DOM and XR listeners on idempotent disposal', () => {
    const controller = new THREE.Group() as unknown as THREE.XRTargetRaySpace;
    const harness = createHarness({ controllers: [controller] });
    registerTarget(harness, createMesh());
    expect(harness.dom.listenerCount()).toBeGreaterThan(0);

    harness.router.dispose();
    harness.router.dispose();
    harness.dom.dispatch('pointerdown');
    harness.dom.dispatch('pointerup');
    controller.dispatchEvent({ type: 'select' } as never);

    expect(harness.dom.listenerCount()).toBe(0);
    expect(harness.actions).toEqual([]);
  });
});
