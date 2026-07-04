import { describe, expect, it } from 'vitest';
import {
  checkClearance,
  createAnchor,
  isWithinFootprint,
  placeOnSurface,
} from '../../apps/web/lib/world-builder/anchoredPlacement';

describe('anchored placement design language', () => {
  it('places an object on a physical surface using its contact height', () => {
    const table = createAnchor({
      id: 'field-table-top',
      position: [2.9, 0.905, 1.7],
      footprint: { width: 1.7, depth: 0.78 },
    });

    const pose = placeOnSurface(table, {
      contactHeight: 0.06,
      localOffset: [-0.45, 0, 0.03],
    });

    expect(pose.position).toEqual([2.45, 0.965, 1.73]);
    expect(pose.anchorId).toBe('field-table-top');
  });

  it('checks whether a placement stays inside the anchor footprint', () => {
    const bed = createAnchor({
      id: 'treatment-bed-soil',
      position: [-2.35, 0.31, -1.05],
      footprint: { width: 2.8, depth: 4.6 },
    });

    expect(isWithinFootprint(bed, [-2.35, 0.31, -1.05], 0.4)).toBe(true);
    expect(isWithinFootprint(bed, [0, 0.31, -1.05], 0.4)).toBe(false);
  });

  it('reports overlapping authored placements with a named clearance failure', () => {
    const failures = checkClearance([
      { id: 'fruit', position: [-2.35, 1.25, -1.05], radius: 0.18 },
      { id: 'seed', position: [-2.29, 1.25, -1.03], radius: 0.08 },
      { id: 'soil-window', position: [-2.7, 0.38, 2.9], radius: 0.45 },
    ], 0.04);

    expect(failures).toEqual([
      {
        a: 'fruit',
        b: 'seed',
        distance: expect.any(Number),
        minimumDistance: 0.3,
      },
    ]);
  });
});
