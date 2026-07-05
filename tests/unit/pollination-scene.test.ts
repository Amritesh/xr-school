import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { clearGroundObstacles } from '../../apps/web/lib/world-builder/pollinationScene';

describe('pollination ambient bee obstacle avoidance', () => {
  it('lifts a position above a known garden fixture it would otherwise fly through', () => {
    // Inside the treatment bed footprint, well below the flower's height.
    const position = new THREE.Vector3(-2.35, 1.0, -1.05);

    const cleared = clearGroundObstacles(position);

    expect(cleared.y).toBeGreaterThan(2.0);
  });

  it('leaves a position alone when it is already clear of every obstacle', () => {
    const position = new THREE.Vector3(0, 1.4, 4.5);

    const cleared = clearGroundObstacles(position);

    expect(cleared.y).toBeCloseTo(1.4, 5);
  });

  it('leaves a position alone when it is already above the obstacle it is over', () => {
    const position = new THREE.Vector3(2.35, 2.2, -1.05);

    const cleared = clearGroundObstacles(position);

    expect(cleared.y).toBeCloseTo(2.2, 5);
  });
});
