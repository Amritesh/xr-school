import { describe, expect, it } from 'vitest';
import { createExperimentBench } from '../../packages/simulation-runtime/src/index';

const bench = createExperimentBench({
  trials: [
    {
      id: 'salt',
      label: 'Salt in water',
      expectedOutcomeId: 'dissolves',
      explanation: 'Salt particles spread through water and form a clear solution.',
    },
    {
      id: 'sand',
      label: 'Sand in water',
      expectedOutcomeId: 'settles',
      explanation: 'Sand does not dissolve and settles at the bottom.',
    },
  ],
});

describe('experiment bench runtime', () => {
  it('checks predictions and returns the scientific explanation', () => {
    const result = bench.observe('salt', 'dissolves');

    expect(result.correct).toBe(true);
    expect(result.expectedOutcomeId).toBe('dissolves');
    expect(result.explanation).toContain('clear solution');
  });

  it('flags incorrect predictions without hiding the observed result', () => {
    const result = bench.observe('sand', 'dissolves');

    expect(result.correct).toBe(false);
    expect(result.expectedOutcomeId).toBe('settles');
    expect(result.predictedOutcomeId).toBe('dissolves');
  });

  it('rejects unknown trial ids', () => {
    expect(() => bench.observe('sugar', 'dissolves')).toThrow(/Unknown trial/);
  });
});
