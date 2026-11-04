import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createStylizedLighting } from '../../apps/web/lib/world-builder/stylizedKit';

describe('stylized kit lighting', () => {
  it('adds one shadow-casting key light with a 1024 shadow map', () => {
    const scene = new THREE.Scene();
    const lighting = createStylizedLighting(scene, new THREE.Group());
    const keys = lighting.group.children.filter(
      child => (child as THREE.DirectionalLight).isDirectionalLight,
    ) as THREE.DirectionalLight[];
    expect(keys).toHaveLength(1);
    expect(keys[0]!.castShadow).toBe(true);
    expect(keys[0]!.shadow.mapSize.x).toBe(1024);
  });

  it('changes fog and sky between moods', () => {
    const scene = new THREE.Scene();
    const lighting = createStylizedLighting(scene, new THREE.Group());
    lighting.setMood('monsoon');
    const monsoon = (scene.fog as THREE.Fog).color.clone();
    lighting.setMood('drought');
    expect((scene.fog as THREE.Fog).color.equals(monsoon)).toBe(false);
    lighting.setMood('restored');
    expect(lighting.mood()).toBe('restored');
  });

  it('clears fog on dispose', () => {
    const scene = new THREE.Scene();
    const lighting = createStylizedLighting(scene, new THREE.Group());
    lighting.dispose();
    expect(scene.fog).toBeNull();
  });
});
