import * as THREE from 'three';

export type HighlightState = 'none' | 'hover' | 'selected';

export interface SelectionHighlightOptions {
  color?: THREE.ColorRepresentation;
  hoverOpacity?: number;
  selectedOpacity?: number;
  /** Scale of the outline shell relative to the source mesh. */
  scale?: number;
}

/**
 * Cheap inverse-hull outline glow: for every mesh in the object's hierarchy,
 * adds a slightly-scaled backface-only sibling that renders as a rim glow.
 * Unlike a post-processing outline pass, this has no EffectComposer
 * dependency, so it renders identically on the Quest baseline profile and
 * in the browser-enhanced profile.
 */
export function createSelectionHighlight(
  object: THREE.Object3D,
  options: SelectionHighlightOptions = {},
) {
  const color = new THREE.Color(options.color ?? '#ffcf5c');
  const scale = options.scale ?? 1.035;
  const hoverOpacity = options.hoverOpacity ?? 0.55;
  const selectedOpacity = options.selectedOpacity ?? 0.95;

  const shells: THREE.Mesh[] = [];
  const targets: THREE.Mesh[] = [];
  object.traverse(child => {
    if (child instanceof THREE.Mesh) targets.push(child);
  });
  for (const child of targets) {
    const shell = new THREE.Mesh(
      child.geometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    shell.name = `${child.name || 'highlight-target'}-outline`;
    shell.scale.setScalar(scale);
    shell.renderOrder = 10;
    shell.visible = false;
    shell.raycast = () => {};
    child.add(shell);
    shells.push(shell);
  }

  let state: HighlightState = 'none';

  function setState(next: HighlightState) {
    state = next;
    const opacity = next === 'selected'
      ? selectedOpacity
      : next === 'hover'
        ? hoverOpacity
        : 0;
    for (const shell of shells) {
      shell.visible = next !== 'none';
      (shell.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  }

  function dispose() {
    for (const shell of shells) {
      shell.parent?.remove(shell);
      (shell.material as THREE.MeshBasicMaterial).dispose();
    }
  }

  return {
    setState,
    dispose,
    get state() {
      return state;
    },
  };
}

export type SelectionHighlight = ReturnType<typeof createSelectionHighlight>;
