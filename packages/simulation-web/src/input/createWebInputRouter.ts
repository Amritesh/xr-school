import * as THREE from 'three';
import type { LessonSnapshot } from '@xr-school/simulation-runtime';
import {
  NORMALIZED_INPUT_SOURCES,
  type NormalizedAction,
  type NormalizedInputSource,
} from '@xr-school/simulation-schema';
import type {
  SimulationInteractionRegistry,
  SimulationInteractionTarget,
} from '../scene/types.js';

const DRAG_THRESHOLD_PX = 6;

export interface WebInputRouterConfig {
  domElement: HTMLElement;
  camera: THREE.Camera;
  currentSnapshot(): Pick<LessonSnapshot, 'stageId'>;
  dispatch(action: NormalizedAction): void;
  xrControllers?: readonly THREE.XRTargetRaySpace[];
  raycaster?: THREE.Raycaster;
  now?(): number;
}

export interface WebInputRouter {
  interactions: SimulationInteractionRegistry;
  dispose(): void;
}

interface RegisteredTarget extends SimulationInteractionTarget {
  inputSources?: NormalizedInputSource[];
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function isSupportedSource(value: NormalizedInputSource) {
  return NORMALIZED_INPUT_SOURCES.includes(value);
}

function acceptsSource(target: RegisteredTarget, source: NormalizedInputSource) {
  return target.inputSources === undefined || target.inputSources.includes(source);
}

function isEffectivelyVisible(object: THREE.Object3D) {
  let candidate: THREE.Object3D | null = object;
  while (candidate) {
    if (!candidate.visible) return false;
    candidate = candidate.parent;
  }
  return true;
}

export function createWebInputRouter(config: WebInputRouterConfig): WebInputRouter {
  const targetsById = new Map<string, RegisteredTarget>();
  const targetIdsByObject = new Map<THREE.Object3D, string>();
  const raycaster = config.raycaster ?? new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const controllerDirection = new THREE.Vector3();
  const pointerStarts = new Map<number, {
    x: number;
    y: number;
    source: Extract<NormalizedInputSource, 'mouse' | 'touch'>;
  }>();
  const controllers = [...(config.xrControllers ?? [])];
  const now = config.now ?? (() => globalThis.performance?.now() ?? Date.now());
  let disposed = false;

  function assertActive() {
    if (disposed) throw new Error('Web input router is disposed');
  }

  function validateSource(source: NormalizedInputSource) {
    if (!isSupportedSource(source)) {
      throw new Error(`Unsupported input source: ${String(source)}`);
    }
  }

  function resolveTarget(
    object: THREE.Object3D,
    source: NormalizedInputSource,
  ): RegisteredTarget | undefined {
    let candidate: THREE.Object3D | null = object;
    while (candidate) {
      const id = targetIdsByObject.get(candidate);
      const target = id === undefined ? undefined : targetsById.get(id);
      if (target && acceptsSource(target, source)) return target;
      candidate = candidate.parent;
    }
    return undefined;
  }

  function intersectableObjects(source: NormalizedInputSource) {
    return Array.from(targetsById.values())
      .filter(target => acceptsSource(target, source))
      .map(target => target.object);
  }

  function targetFromRay(source: NormalizedInputSource) {
    const hits = raycaster.intersectObjects(intersectableObjects(source), true);
    for (const hit of hits) {
      if (!isEffectivelyVisible(hit.object)) continue;
      const target = resolveTarget(hit.object, source);
      if (target) return target;
    }
    return undefined;
  }

  function pointerRay(event: PointerEvent) {
    const bounds = config.domElement.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return false;
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, config.camera);
    return true;
  }

  function commit(target: RegisteredTarget, source: NormalizedInputSource) {
    if (!acceptsSource(target, source)) return;
    if (!isEffectivelyVisible(target.object)) return;
    const stageId = config.currentSnapshot().stageId;
    if (!hasText(stageId)) throw new Error('Current simulation stage id is required');
    const timestampMs = now();
    if (!Number.isFinite(timestampMs) || timestampMs < 0) {
      throw new Error('Input action timestamp must be a non-negative finite number');
    }
    const action: NormalizedAction = {
      actionId: target.actionId,
      targetEntityId: target.id,
      source,
      phase: 'commit',
      stageId,
      timestampMs,
    };
    config.dispatch(action);
    target.onCommit?.(action);
  }

  function register(target: SimulationInteractionTarget) {
    assertActive();
    if (!hasText(target.id)) throw new Error('Interaction target id is required');
    if (!hasText(target.actionId)) throw new Error(`${target.id}: action id is required`);
    if (!hasText(target.accessibilityLabel)) {
      throw new Error(`${target.id}: accessibility label is required`);
    }
    if (!target.object) throw new Error(`${target.id}: interaction object is required`);
    if (targetsById.has(target.id)) {
      throw new Error(`Interaction target ${target.id} is already registered`);
    }
    const existingObjectId = targetIdsByObject.get(target.object);
    if (existingObjectId !== undefined) {
      throw new Error(`Interaction object is already registered as ${existingObjectId}`);
    }
    if (target.inputSources !== undefined) {
      if (target.inputSources.length === 0) {
        throw new Error(`${target.id}: at least one input source is required`);
      }
      const seen = new Set<NormalizedInputSource>();
      for (const source of target.inputSources) {
        validateSource(source);
        if (seen.has(source)) {
          throw new Error(`${target.id}: duplicate input source ${source}`);
        }
        seen.add(source);
      }
    }

    const registered: RegisteredTarget = {
      ...target,
      inputSources: target.inputSources === undefined
        ? undefined
        : [...target.inputSources],
    };
    targetsById.set(registered.id, registered);
    targetIdsByObject.set(registered.object, registered.id);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      if (targetsById.get(registered.id) !== registered) return;
      targetsById.delete(registered.id);
      if (targetIdsByObject.get(registered.object) === registered.id) {
        targetIdsByObject.delete(registered.object);
      }
    };
  }

  function activate(targetId: string, source: NormalizedInputSource) {
    assertActive();
    validateSource(source);
    const target = targetsById.get(targetId);
    if (!target) throw new Error(`Unknown interaction target: ${targetId}`);
    commit(target, source);
  }

  function clear() {
    targetsById.clear();
    targetIdsByObject.clear();
  }

  const sourceForPointer = (
    event: PointerEvent,
  ): Extract<NormalizedInputSource, 'mouse' | 'touch'> => (
    event.pointerType === 'touch' ? 'touch' : 'mouse'
  );

  const onPointerDown = (event: PointerEvent) => {
    if (disposed) return;
    pointerStarts.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      source: sourceForPointer(event),
    });
  };
  const onPointerCancel = (event: PointerEvent) => {
    pointerStarts.delete(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent) => {
    if (disposed) return;
    const start = pointerStarts.get(event.pointerId);
    pointerStarts.delete(event.pointerId);
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_THRESHOLD_PX) {
      return;
    }
    if (!pointerRay(event)) return;
    const target = targetFromRay(start.source);
    if (target) commit(target, start.source);
  };

  config.domElement.addEventListener('pointerdown', onPointerDown);
  config.domElement.addEventListener('pointerup', onPointerUp);
  config.domElement.addEventListener('pointercancel', onPointerCancel);

  const controllerListeners = controllers.map(controller => {
    const onSelect = () => {
      if (disposed) return;
      controller.updateWorldMatrix(true, false);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction
        .copy(controllerDirection.set(0, 0, -1))
        .transformDirection(controller.matrixWorld);
      const target = targetFromRay('xr-controller');
      if (target) commit(target, 'xr-controller');
    };
    controller.addEventListener('select', onSelect);
    return { controller, onSelect };
  });

  return {
    interactions: { register, activate, clear },
    dispose() {
      if (disposed) return;
      disposed = true;
      config.domElement.removeEventListener('pointerdown', onPointerDown);
      config.domElement.removeEventListener('pointerup', onPointerUp);
      config.domElement.removeEventListener('pointercancel', onPointerCancel);
      for (const { controller, onSelect } of controllerListeners) {
        controller.removeEventListener('select', onSelect);
      }
      pointerStarts.clear();
      clear();
    },
  };
}
