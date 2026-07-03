import { describe, expect, it } from 'vitest';
import {
  POLLINATION_WORLD,
} from '../../apps/web/lib/world-builder/pollinationWorld';
import {
  createPollinationModel,
  createScientificModelRegistry,
  pollinationSnapshotForStage,
} from '../../packages/simulation-runtime/src/index';
import {
  validateWorldBundle,
} from '../../packages/simulation-schema/src/index';

describe('pollination reference world', () => {
  it('defines a valid mapped-PBR world and complete mastery sequence', () => {
    expect(validateWorldBundle(POLLINATION_WORLD)).toEqual([]);
    expect(POLLINATION_WORLD.materials.some(
      material => material.baseColorMap && material.normalMap
        && material.roughnessMap,
    )).toBe(true);
    expect(POLLINATION_WORLD.assessments[0].masteryRule.requiredKinds)
      .toEqual(['observation', 'misconception', 'transfer']);
  });

  it('declares the eight performed stages and literal garden scale', () => {
    expect(POLLINATION_WORLD.world.experienceId)
      .toBe('experience-pollination-cycle');
    expect(POLLINATION_WORLD.world.spatialLayoutId)
      .toBe('spatial-pollination-garden');
    expect(POLLINATION_WORLD.experienceDefinitions?.[0].stages)
      .toHaveLength(8);
    expect(POLLINATION_WORLD.experienceDefinitions?.[0].stages.map(
      stage => stage.requiredActionIds[0],
    )).toEqual([
      'inspect-flower',
      'release-pollen',
      'observe-pollinator',
      'transfer-pollen',
      'trace-pollen-tube',
      'inspect-seed-fruit',
      'water-seed',
      'inspect-mature-plant',
    ]);
    expect(POLLINATION_WORLD.spatialLayouts?.[0]).toMatchObject({
      metersPerWorldUnit: 1,
      scaleRepresentation: 'literal',
      reachMeters: { min: 0.25, max: 0.85 },
    });
  });

  it('enforces pollination before fertilisation and germination', () => {
    const model = createPollinationModel();

    expect(() => model.apply('fertilise')).toThrow(/pollen transfer/i);
    model.apply('producePollen');
    model.apply('arrivePollinator');
    model.apply('transferPollen');
    model.apply('fertilise');
    model.apply('formSeed');
    model.apply('germinate');

    expect(model.snapshot()).toMatchObject({
      pollenTransferred: true,
      fertilised: true,
      germinated: true,
    });
  });

  it('verifies the hidden model against the authored reference vectors', () => {
    const registry = createScientificModelRegistry();
    registry.register({
      manifest: POLLINATION_WORLD.scientificModels[0],
      evaluate: input => pollinationSnapshotForStage(
        Number(input.completedStage),
      ),
    });

    expect(registry.verify('pollination-event-graph')).toEqual([]);
  });

  it('rejects duplicate biological events and resets deterministically', () => {
    const model = createPollinationModel();
    model.apply('producePollen');

    expect(() => model.apply('producePollen'))
      .toThrow(/Expected arrivePollinator/);
    model.reset();
    expect(model.snapshot()).toEqual({
      pollenProduced: false,
      pollinatorArrived: false,
      pollenTransferred: false,
      fertilised: false,
      seedFormed: false,
      germinated: false,
      plantMatured: false,
    });
  });
});
