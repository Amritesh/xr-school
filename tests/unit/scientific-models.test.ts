import { describe, expect, it } from 'vitest';
import {
  createScientificModelRegistry,
} from '../../packages/simulation-runtime/src/index';

function createIdentityRegistry() {
  const registry = createScientificModelRegistry();
  registry.register({
    manifest: {
      id: 'identity',
      version: '1.0.0',
      domain: 'classification',
      internalUnits: {},
      validInputRanges: {
        value: { min: 0, max: 10, unit: '1' },
      },
      assumptions: ['Identity model'],
      limitations: ['Diagnostic use'],
      referenceSources: ['W0 spec'],
      referenceVectors: [{
        id: 'five',
        inputs: { value: 5 },
        expectedOutputs: { value: 5 },
      }],
      numericalTolerance: 1e-9,
    },
    evaluate: input => ({ value: Number(input.value) }),
  });
  return registry;
}

describe('hidden scientific model registry', () => {
  it('verifies outputs against reference vectors and tolerance', () => {
    const registry = createIdentityRegistry();

    expect(registry.verify('identity')).toEqual([]);
  });

  it('rejects out-of-range and non-finite inputs before evaluation', () => {
    const registry = createIdentityRegistry();

    expect(() => registry.evaluate('identity', { value: 11 })).toThrow(/valid range/);
    expect(() => registry.evaluate('identity', { value: Number.NaN })).toThrow(/finite/);
  });
});
