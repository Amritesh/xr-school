import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createInteractionSystem } from '../../apps/web/lib/world-builder/interactionSystem';

function createFakeDomElement() {
  const listeners = new Map<string, (event: unknown) => void>();
  return {
    style: { cursor: '' },
    addEventListener(type: string, handler: (event: unknown) => void) {
      listeners.set(type, handler);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100 };
    },
    dispatch(type: string, event: { clientX: number; clientY: number }) {
      listeners.get(type)?.(event);
    },
  } as unknown as HTMLElement & { dispatch(type: string, event: { clientX: number; clientY: number }): void };
}

function createLookingCamera() {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

describe('createInteractionSystem', () => {
  it('resolves hits to the registered ancestor, not the raw mesh', () => {
    const camera = createLookingCamera();
    const dom = createFakeDomElement();
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    group.add(mesh);
    group.updateMatrixWorld(true);

    let hovered: string | undefined;
    const system = createInteractionSystem({
      camera,
      domElement: dom,
      onHoverChange: id => { hovered = id; },
    });
    system.register('switch', group);

    dom.dispatch('pointermove', { clientX: 50, clientY: 50 });

    expect(hovered).toBe('switch');
    expect(system.hoveredId).toBe('switch');
    system.dispose();
  });

  it('clears hover and resets the cursor when the ray misses everything', () => {
    const camera = createLookingCamera();
    const dom = createFakeDomElement();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    mesh.updateMatrixWorld(true);

    const system = createInteractionSystem({ camera, domElement: dom });
    system.register('bulb', mesh);

    dom.dispatch('pointermove', { clientX: 50, clientY: 50 });
    expect(dom.style.cursor).toBe('pointer');

    dom.dispatch('pointermove', { clientX: 1, clientY: 1 });
    expect(system.hoveredId).toBeUndefined();
    expect(dom.style.cursor).toBe('grab');
    system.dispose();
  });

  it('fires onSelect with the registered id on pointerdown', () => {
    const camera = createLookingCamera();
    const dom = createFakeDomElement();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    mesh.updateMatrixWorld(true);

    const selections: string[] = [];
    const system = createInteractionSystem({
      camera,
      domElement: dom,
      onSelect: id => selections.push(id),
    });
    system.register('resistor', mesh);

    dom.dispatch('pointerdown', { clientX: 50, clientY: 50 });

    expect(selections).toEqual(['resistor']);
    system.dispose();
  });

  it('keeps a selected object highlighted after the pointer moves away', () => {
    const camera = createLookingCamera();
    const dom = createFakeDomElement();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    mesh.updateMatrixWorld(true);

    const system = createInteractionSystem({ camera, domElement: dom });
    system.register('bulb', mesh, { highlightColor: '#ffffff' });

    dom.dispatch('pointerdown', { clientX: 50, clientY: 50 });
    system.setSelected('bulb');
    dom.dispatch('pointermove', { clientX: 1, clientY: 1 });

    const outline = mesh.children.find(child => child.name.endsWith('-outline')) as THREE.Mesh;
    expect(outline.visible).toBe(true);
    expect((outline.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0.5);
    system.dispose();
  });

  it('disposes highlight shells and removes all listeners', () => {
    const camera = createLookingCamera();
    const dom = createFakeDomElement();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    mesh.updateMatrixWorld(true);

    const system = createInteractionSystem({ camera, domElement: dom });
    system.register('bulb', mesh, { highlightColor: '#ffffff' });
    expect(mesh.children.length).toBe(1);

    system.dispose();

    expect(mesh.children.length).toBe(0);
    dom.dispatch('pointermove', { clientX: 50, clientY: 50 });
    expect(system.hoveredId).toBeUndefined();
  });
});
