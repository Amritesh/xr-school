import { describe, expect, it } from 'vitest';
import {
  createPollinationExperiment,
  type PollinationExperimentAction,
} from '../../apps/web/lib/world-builder/pollinationExperiment';

describe('pollination treatment/control experiment', () => {
  it('requires collection before valid stigma transfer', () => {
    const experiment = createPollinationExperiment();

    expect(() => experiment.apply('transfer-pollen')).toThrow(/collect pollen/i);
    expect(experiment.apply('collect-pollen').brushPollen).toBe(24);
    expect(experiment.apply('transfer-pollen').treatmentPollen).toBe(12);
  });

  it('forms fruit only on the pollinated treatment flower', () => {
    const experiment = createPollinationExperiment();
    const actions: PollinationExperimentAction[] = [
      'collect-pollen',
      'transfer-pollen',
      'trace-pollen-tube',
    ];
    for (const action of actions) experiment.apply(action);

    const result = experiment.apply('advance-time-lapse');

    expect(result.treatmentFruitFormed).toBe(true);
    expect(result.controlFruitFormed).toBe(false);
  });

  it('requires planting, covering, and water before germination', () => {
    const experiment = createPollinationExperiment();
    const actions: PollinationExperimentAction[] = [
      'collect-pollen',
      'transfer-pollen',
      'trace-pollen-tube',
      'advance-time-lapse',
      'open-fruit',
      'plant-seed',
      'cover-seed',
    ];
    for (const action of actions) experiment.apply(action);

    expect(experiment.snapshot().germinated).toBe(false);
    expect(experiment.apply('water-seed').germinated).toBe(true);
  });

  it('rejects actions that violate biological causality', () => {
    const experiment = createPollinationExperiment();

    expect(() => experiment.apply('trace-pollen-tube')).toThrow(/transfer pollen/i);
    expect(() => experiment.apply('advance-time-lapse')).toThrow(/pollen tube/i);
    expect(() => experiment.apply('open-fruit')).toThrow(/fruit/i);
    expect(() => experiment.apply('plant-seed')).toThrow(/open fruit/i);
    expect(() => experiment.apply('cover-seed')).toThrow(/plant the seed/i);
    expect(() => experiment.apply('water-seed')).toThrow(/cover the seed/i);
  });

  it('replays deterministically after reset', () => {
    const experiment = createPollinationExperiment();
    experiment.apply('collect-pollen');
    const first = experiment.snapshot();

    experiment.reset();
    experiment.apply('collect-pollen');

    expect(experiment.snapshot()).toEqual(first);
  });
});
