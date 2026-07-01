import { describe, expect, it } from 'vitest';
import { CIRCUIT_WORLD } from '../../apps/web/lib/world-builder/circuitWorld';
import {
  createScientificModelRegistry,
  evaluateCircuit,
} from '../../packages/simulation-runtime/src/index';
import { validateWorldBundle } from '../../packages/simulation-schema/src/index';

describe('circuit reference world', () => {
  it('defines a valid mapped-PBR world and complete mastery sequence', () => {
    expect(validateWorldBundle(CIRCUIT_WORLD)).toEqual([]);
    expect(CIRCUIT_WORLD.materials.some(material =>
      material.baseColorMap && material.normalMap && material.roughnessMap,
    )).toBe(true);
    expect(CIRCUIT_WORLD.assessments[0].masteryRule.requiredKinds)
      .toEqual(['observation', 'misconception', 'transfer']);
  });

  it('uses Ohm’s law for open and closed circuits', () => {
    expect(evaluateCircuit({
      voltage: 9,
      resistance: 10,
      closed: false,
    })).toEqual({
      current: 0,
      power: 0,
      brightness: 0,
    });

    expect(evaluateCircuit({
      voltage: 9,
      resistance: 10,
      closed: true,
    })).toEqual({
      current: 0.9,
      power: 8.1,
      brightness: 1,
    });

    expect(evaluateCircuit({
      voltage: 9,
      resistance: 50,
      closed: true,
    })).toEqual({
      current: 0.18,
      power: 1.62,
      brightness: 0.2,
    });
  });

  it('rejects non-physical resistance and invalid numerical input', () => {
    expect(() => evaluateCircuit({
      voltage: 9,
      resistance: 0,
      closed: true,
    })).toThrow(/resistance/i);
    expect(() => evaluateCircuit({
      voltage: Number.NaN,
      resistance: 10,
      closed: true,
    })).toThrow(/voltage/i);
  });

  it('verifies the hidden electrical model against authored references', () => {
    const registry = createScientificModelRegistry();
    registry.register({
      manifest: CIRCUIT_WORLD.scientificModels[0],
      evaluate: input => evaluateCircuit({
        voltage: Number(input.voltage),
        resistance: Number(input.resistance),
        closed: Boolean(input.closed),
      }),
    });
    expect(registry.verify('ohms-law')).toEqual([]);
  });
});
