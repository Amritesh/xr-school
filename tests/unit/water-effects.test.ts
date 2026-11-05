import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  createDropletPool,
  createFillVolume,
  createFlowRibbon,
} from '../../apps/web/lib/world-builder/waterEffects';

const curve = () =>
  new THREE.LineCurve3(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));

function trackDisposal(object: THREE.Object3D) {
  const disposed: string[] = [];
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.addEventListener('dispose', () => disposed.push('geometry'));
    (mesh.material as THREE.Material).addEventListener('dispose', () =>
      disposed.push('material'),
    );
  });
  return disposed;
}

describe('water effects', () => {
  it('keeps droplets in one instanced mesh, at most max live', () => {
    const pool = createDropletPool({ max: 200 });
    expect(pool.mesh).toBeInstanceOf(THREE.InstancedMesh);
    for (let i = 0; i < 500; i += 1) {
      pool.emit(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0));
    }
    expect(pool.liveCount()).toBe(200);
    expect(pool.mesh.count).toBe(200);
  });

  it('retires droplets after they fall below the ground', () => {
    const pool = createDropletPool({ max: 10 });
    pool.emit(new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0, -1, 0));
    pool.update(1);
    expect(pool.liveCount()).toBe(0);
  });

  it('clamps the fill level', () => {
    const volume = createFillVolume({ radius: 1, height: 2, color: 0x3399ff });
    volume.setFill(2);
    expect(volume.fill()).toBe(1);
    volume.setFill(-1);
    expect(volume.fill()).toBe(0);
    expect(volume.object.visible).toBe(false);
    volume.setFill(0.5);
    expect(volume.object.visible).toBe(true);
  });

  it('can fill a box as well as a cylinder', () => {
    const volume = createFillVolume({ box: { x: 3, z: 1 }, height: 0.5, color: 0x3399ff });
    volume.setFill(1);
    volume.object.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(volume.object).getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(3);
    expect(size.y).toBeCloseTo(0.5);
  });

  it('makes dirty water darker and more opaque than clear water', () => {
    const volume = createFillVolume({ radius: 1, height: 2, color: 0x3399ff });
    volume.setClarity(1);
    const clear = volume.material.color.clone();
    const clearOpacity = volume.material.opacity;
    volume.setClarity(0);
    expect(volume.material.color.equals(clear)).toBe(false);
    expect(volume.material.opacity).toBeGreaterThan(clearOpacity);
  });

  it('scrolls ribbon flow only while water is flowing', () => {
    const ribbon = createFlowRibbon(curve(), { width: 0.1, color: 0x3399ff });
    ribbon.setFlow(0);
    expect(ribbon.object.visible).toBe(false);
    ribbon.setFlow(1);
    expect(ribbon.object.visible).toBe(true);
    const before = ribbon.scrollOffset();
    ribbon.update(0.5);
    expect(ribbon.scrollOffset()).not.toBe(before);
  });

  it('keeps reduced-motion ribbons still and pools empty', () => {
    const ribbon = createFlowRibbon(curve(), {
      width: 0.1,
      color: 0x3399ff,
      reducedMotion: true,
    });
    ribbon.setFlow(1);
    const before = ribbon.scrollOffset();
    ribbon.update(0.5);
    expect(ribbon.scrollOffset()).toBe(before);
    expect(ribbon.object.visible).toBe(true);
    const pool = createDropletPool({ max: 10, reducedMotion: true });
    pool.emit(new THREE.Vector3(), new THREE.Vector3());
    expect(pool.liveCount()).toBe(0);
  });

  it('disposes geometry and material on all effects', () => {
    const ribbon = createFlowRibbon(curve(), { width: 0.1, color: 0x3399ff });
    const volume = createFillVolume({ radius: 1, height: 2, color: 0x3399ff });
    const pool = createDropletPool({ max: 10 });
    const logs = [ribbon.object, volume.object, pool.mesh].map(trackDisposal);
    ribbon.dispose();
    volume.dispose();
    pool.dispose();
    for (const log of logs) expect(log.sort()).toEqual(['geometry', 'material']);
  });
});
