import { describe, expect, it } from 'vitest';
import { STATES_WORLD } from '../../apps/web/lib/world-builder/statesWorld';
import {
  createScientificModelRegistry,
  evaluateMatterState,
} from '../../packages/simulation-runtime/src/index';
import { validateWorldBundle } from '../../packages/simulation-schema/src/index';

describe('states of matter reference world', () => {
  it('defines a valid mapped-PBR world and mastery sequence', () => {
    expect(validateWorldBundle(STATES_WORLD)).toEqual([]);
    expect(STATES_WORLD.materials.some(material =>
      material.baseColorMap && material.normalMap && material.roughnessMap,
    )).toBe(true);
    expect(STATES_WORLD.assessments[0].masteryRule.requiredKinds)
      .toEqual(['observation', 'misconception', 'transfer']);
  });

  it('maps normalized heat to the authored teaching states', () => {
    expect(evaluateMatterState(0.18)).toEqual({
      phase: 'solid',
      motionFactor: 0.18,
      spacingFactor: 0.12,
    });
    expect(evaluateMatterState(0.48).phase).toBe('liquid');
    expect(evaluateMatterState(0.82)).toEqual({
      phase: 'gas',
      motionFactor: 0.82,
      spacingFactor: 1,
    });
  });

  it('rejects heat outside the normalized model range', () => {
    expect(() => evaluateMatterState(-0.1)).toThrow(/heat/i);
    expect(() => evaluateMatterState(Number.NaN)).toThrow(/heat/i);
  });

  it('verifies all authored matter-state reference vectors', () => {
    const registry = createScientificModelRegistry();
    registry.register({
      manifest: STATES_WORLD.scientificModels[0],
      evaluate: input => evaluateMatterState(Number(input.heat)),
    });
    expect(registry.verify('matter-state-from-heat')).toEqual([]);
  });
});
