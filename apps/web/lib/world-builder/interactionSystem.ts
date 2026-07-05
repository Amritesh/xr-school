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

  // Highlight state is resolved by priority (selected > hover > suggested)
  // from these three independently-tracked ids, so e.g. hovering the
  // passively-pulsing "click next" target correctly promotes it to the
  // brighter hover look instead of fighting the pulse.
  let hoveredId: string | undefined;
  let selectedId: string | undefined;
  let suggestedId: string | undefined;

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

  function effectiveState(id: string) {
    if (id === selectedId) return 'selected' as const;
    if (id === hoveredId) return 'hover' as const;
    if (id === suggestedId) return 'suggested' as const;
    return 'none' as const;
  }

  function refreshHighlight(id: string | undefined) {
    if (!id) return;
    entries.get(id)?.highlight?.setState(effectiveState(id));
  }

  function setHover(next: { id: string; entry: Entry } | undefined) {
    if (next?.id === hoveredId) return;
    const previousId = hoveredId;
    hoveredId = next?.id;
    refreshHighlight(previousId);
    refreshHighlight(hoveredId);
    config.onHoverChange?.(hoveredId);
  }

  function setSelected(id: string | undefined) {
    if (id === selectedId) return;
    const previousId = selectedId;
    selectedId = id;
    refreshHighlight(previousId);
    refreshHighlight(selectedId);
  }

  /** Marks the object the learner should click next with a passive pulse —
   * not tied to hover/click, so it reads even before anyone touches it. */
  function setSuggested(id: string | undefined) {
    if (id === suggestedId) return;
    const previousId = suggestedId;
    suggestedId = id;
    refreshHighlight(previousId);
    refreshHighlight(suggestedId);
  }

  /** Advances the suggested-target pulse. Cheap: only the one entry (if
   * any) currently in the 'suggested' state does any work per frame. */
  function update(elapsedSeconds: number) {
    if (suggestedId) entries.get(suggestedId)?.highlight?.update(elapsedSeconds);
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

  // three.js raycasting ignores the `.visible` flag entirely (neither the
  // traversal nor Mesh.raycast checks it), so a hidden stage's objects are
  // otherwise still clickable. Walk the full ancestor chain, not just up to
  // the registered id, since a toggled group can sit above where the id
  // was resolved.
  function isEffectivelyVisible(object: THREE.Object3D | null) {
    let node: THREE.Object3D | null = object;
    while (node) {
      if (!node.visible) return false;
      node = node.parent;
    }
    return true;
  }

  function hitFromRay() {
    const hits = raycaster.intersectObjects(intersectableObjects(), true);
    for (const hit of hits) {
      if (!isEffectivelyVisible(hit.object)) continue;
      const resolved = resolve(hit.object);
      if (resolved) return resolved;
    }
    return undefined;
  }

  // A click selects; a drag (used to look around) must not. Track the
  // down position and only treat it as a click if the pointer barely moved.
  const DRAG_THRESHOLD_PX = 6;
  let pointerDownAt: { x: number; y: number } | undefined;

  const onPointerMove = (event: PointerEvent) => {
    pointerRay(event);
    const hit = hitFromRay();
    setHover(hit);
    config.domElement.style.cursor = hit ? cursor.hover : cursor.idle;
  };
  const onPointerDown = (event: PointerEvent) => {
    pointerDownAt = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = pointerDownAt;
    pointerDownAt = undefined;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) return;
    pointerRay(event);
    const hit = hitFromRay();
    if (hit) config.onSelect?.(hit.id, hit.entry.object, 'mouse');
  };
  config.domElement.addEventListener('pointermove', onPointerMove);
  config.domElement.addEventListener('pointerdown', onPointerDown);
  config.domElement.addEventListener('pointerup', onPointerUp);

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
    config.domElement.removeEventListener('pointerup', onPointerUp);
    for (const { controller, onSelectStart } of controllerListeners) {
      controller.removeEventListener('selectstart', onSelectStart);
    }
    for (const entry of entries.values()) entry.highlight?.dispose();
    entries.clear();
  }

  return {
    register,
    setSelected,
    setSuggested,
    update,
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
