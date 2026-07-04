import { describe, expect, it } from 'vitest';
import {
  POLLINATION_ANCHORS,
  POLLINATION_LAYOUT,
  pollinationLayoutDiagnostics,
} from '../../apps/web/lib/world-builder/pollinationLayout';

describe('pollination anchored layout', () => {
  it('places treatment and control flowers inside their raised soil beds', () => {
    const diagnostics = pollinationLayoutDiagnostics();

    expect(diagnostics.flowers).toEqual([
      {
        id: 'treatment-flower',
        anchorId: POLLINATION_ANCHORS.treatmentBed.id,
        withinFootprint: true,
      },
      {
        id: 'control-flower',
        anchorId: POLLINATION_ANCHORS.controlBed.id,
        withinFootprint: true,
      },
    ]);
  });

  it('rests all field tools on the table surface', () => {
    const diagnostics = pollinationLayoutDiagnostics();

    expect(diagnostics.tools).toEqual([
      { id: 'brush', anchorId: 'field-table-top', onSurface: true },
      { id: 'lens', anchorId: 'field-table-top', onSurface: true },
      { id: 'watering-can', anchorId: 'field-table-top', onSurface: true },
      { id: 'trowel', anchorId: 'field-table-top', onSurface: true },
      { id: 'time-lapse-dial', anchorId: 'field-table-top', onSurface: true },
    ]);
  });

  it('keeps fruit, seed, and germination cutaway from colliding', () => {
    const diagnostics = pollinationLayoutDiagnostics();

    expect(diagnostics.clearanceFailures).toEqual([]);
    expect(POLLINATION_LAYOUT.fruit.position[0]).toBe(
      POLLINATION_LAYOUT.treatmentFlower.position[0],
    );
    expect(POLLINATION_LAYOUT.germinationCutaway.position[1]).toBeGreaterThan(0.8);
  });
});
