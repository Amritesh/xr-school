import * as THREE from 'three';
import type { NormalizedInputSource } from '../../../../packages/simulation-schema/src/index';
import {
  createSelectionHighlight,
  type SelectionHighlight,
} from './selectionHighlight';

export type InteractionSource = Extract<NormalizedInputSource, 'mouse' | 'xr-controller'>;

export interface RegisterOptions {
  /** Enables the shared inverse-hull outline glow for this object. */
  highlightColor?: THREE.ColorRepresentation;
}

export interface InteractionSystemConfig {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  /** XR controller spaces already parented into the scene by the caller. */
  xrControllers?: THREE.XRTargetRaySpace[];
  onHoverChange?(id: string | undefined): void;
  onSelect?(id: string, object: THREE.Object3D, source: InteractionSource): void;
  cursor?: { hover: string; idle: string };
}

interface Entry {
  object: THREE.Object3D;
  highlight?: SelectionHighlight;
}

/**
 * Central raycasting + hover/select registry shared by simulation viewers,
 * replacing the near-identical raycaster-per-viewer blocks that previously
 * existed in every simulation component.
 */
export function createInteractionSystem(config: InteractionSystemConfig) {
  const entries = new Map<string, Entry>();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const controllerDirection = new THREE.Vector3();
  const cursor = config.cursor ?? { hover: 'pointer', idle: 'grab' };

  let hoveredId: string | undefined;
  let selectedId: string | undefined;

  function register(id: string, object: THREE.Object3D, options: RegisterOptions = {}) {
    object.userData.interactionId = id;
    const entry: Entry = { object };
    if (options.highlightColor !== undefined) {
      entry.highlight = createSelectionHighlight(object, { color: options.highlightColor });
    }
    entries.set(id, entry);
  }

  function resolve(object?: THREE.Object3D | null) {
    let candidate: THREE.Object3D | null | undefined = object;
    while (candidate) {
      const id = candidate.userData.interactionId as string | undefined;
      if (id && entries.has(id)) return { id, entry: entries.get(id)! };
      candidate = candidate.parent;
    }
    return undefined;
  }

  function refreshHighlight(id: string | undefined, entry: Entry | undefined) {
    if (!entry?.highlight) return;
    entry.highlight.setState(id === selectedId ? 'selected' : 'hover');
  }

  function setHover(next: { id: string; entry: Entry } | undefined) {
    if (next?.id === hoveredId) return;
    if (hoveredId) {
      const previous = entries.get(hoveredId);
      previous?.highlight?.setState(hoveredId === selectedId ? 'selected' : 'none');
    }
    hoveredId = next?.id;
    if (next) refreshHighlight(next.id, next.entry);
    config.onHoverChange?.(hoveredId);
  }

  function setSelected(id: string | undefined) {
    if (selectedId && selectedId !== id) {
      entries.get(selectedId)?.highlight?.setState(selectedId === hoveredId ? 'hover' : 'none');
    }
    selectedId = id;
    if (id) refreshHighlight(id, entries.get(id));
  }

  function intersectableObjects() {
    return Array.from(entries.values(), entry => entry.object);
  }

  function pointerRay(event: PointerEvent) {
    const bounds = config.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, config.camera);
  }

  function hitFromRay() {
    const hit = raycaster.intersectObjects(intersectableObjects(), true)[0]?.object;
    return resolve(hit);
  }

  const onPointerMove = (event: PointerEvent) => {
    pointerRay(event);
    const hit = hitFromRay();
    setHover(hit);
    config.domElement.style.cursor = hit ? cursor.hover : cursor.idle;
  };
  const onPointerDown = (event: PointerEvent) => {
    pointerRay(event);
    const hit = hitFromRay();
    if (hit) config.onSelect?.(hit.id, hit.entry.object, 'mouse');
  };
  config.domElement.addEventListener('pointermove', onPointerMove);
  config.domElement.addEventListener('pointerdown', onPointerDown);

  const controllerListeners = (config.xrControllers ?? []).map(controller => {
    const onSelectStart = () => {
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      controllerDirection.set(0, 0, -1).applyQuaternion(controller.quaternion);
      raycaster.ray.direction.copy(controllerDirection);
      const hit = hitFromRay();
      if (hit) config.onSelect?.(hit.id, hit.entry.object, 'xr-controller');
    };
    controller.addEventListener('selectstart', onSelectStart);
    return { controller, onSelectStart };
  });

  function dispose() {
    config.domElement.removeEventListener('pointermove', onPointerMove);
    config.domElement.removeEventListener('pointerdown', onPointerDown);
    for (const { controller, onSelectStart } of controllerListeners) {
      controller.removeEventListener('selectstart', onSelectStart);
    }
    for (const entry of entries.values()) entry.highlight?.dispose();
    entries.clear();
  }

  return {
    register,
    setSelected,
    get hoveredId() {
      return hoveredId;
    },
    get selectedId() {
      return selectedId;
    },
    dispose,
  };
}

export type InteractionSystem = ReturnType<typeof createInteractionSystem>;
