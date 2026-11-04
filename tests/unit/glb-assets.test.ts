import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  disposeObjectTree,
  loadOrFallback,
} from '../../apps/web/lib/world-builder/glbAssets';

describe('GLB assets', () => {
  it('returns the fallback and reports a diagnostic when loading fails', async () => {
    const fallback = new THREE.Group();
    const messages: string[] = [];
    const result = await loadOrFallback(
      () => Promise.reject(new Error('missing file')),
      '/models/rainwater/house.glb',
      () => fallback,
      message => messages.push(message),
    );
    expect(result).toBe(fallback);
    expect(messages[0]).toContain('/models/rainwater/house.glb');
    expect(messages[0]).toContain('missing file');
  });

  it('returns the model when loading works, without building the fallback', async () => {
    const model = new THREE.Group();
    let built = false;
    const result = await loadOrFallback(
      () => Promise.resolve(model),
      '/ok.glb',
      () => {
        built = true;
        return new THREE.Group();
      },
    );
    expect(result).toBe(model);
    expect(built).toBe(false);
  });

  it('disposes geometry, materials and textures in a model tree', () => {
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const geometry = new THREE.BoxGeometry();
    const disposed: string[] = [];
    texture.addEventListener('dispose', () => disposed.push('texture'));
    material.addEventListener('dispose', () => disposed.push('material'));
    geometry.addEventListener('dispose', () => disposed.push('geometry'));
    const root = new THREE.Group();
    root.add(new THREE.Mesh(geometry, material));
    disposeObjectTree(root);
    expect(disposed.sort()).toEqual(['geometry', 'material', 'texture']);
  });

  it('never loads decoders from a third-party host', () => {
    const source = readSource();
    expect(source).not.toMatch(/gstatic|unpkg|jsdelivr|https?:\/\//);
  });
});

function readSource() {
  return readFileSync(
    resolve(process.cwd(), 'apps/web/lib/world-builder/glbAssets.ts'),
    'utf8',
  );
}
