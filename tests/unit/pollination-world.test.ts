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
