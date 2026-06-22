import { describe, it, expect } from 'vitest';
import {
  calculateImprovement,
  isValidScore,
  expectedBatchCount,
  completionRate,
  engagementScore,
  nextSyncState,
} from '../../packages/evaluation-engine/src/scoring.js';

describe('isValidScore', () => {
  it('accepts 0 and 1', () => {
    expect(isValidScore(0)).toBe(true);
    expect(isValidScore(1)).toBe(true);
  });
  it('accepts values between 0 and 1', () => {
    expect(isValidScore(0.5)).toBe(true);
    expect(isValidScore(0.999)).toBe(true);
  });
  it('rejects negative values', () => {
    expect(isValidScore(-0.1)).toBe(false);
  });
  it('rejects values above 1', () => {
    expect(isValidScore(1.1)).toBe(false);
  });
  it('rejects NaN and Infinity', () => {
    expect(isValidScore(NaN)).toBe(false);
    expect(isValidScore(Infinity)).toBe(false);
  });
});

describe('calculateImprovement (normalised gain)', () => {
  it('returns 1 for full improvement (0 → 1)', () => {
    expect(calculateImprovement(0, 1)).toBe(1);
  });
  it('returns 0 for no improvement', () => {
    expect(calculateImprovement(0.5, 0.5)).toBe(0);
  });
  it('returns 0 when pre is already perfect', () => {
    expect(calculateImprovement(1, 1)).toBe(0);
  });
  it('calculates standard normalised gain correctly', () => {
    // (0.8 - 0.4) / (1 - 0.4) = 0.4 / 0.6 ≈ 0.6667
    expect(calculateImprovement(0.4, 0.8)).toBeCloseTo(0.6667, 3);
  });
  it('returns negative for regression', () => {
    expect(calculateImprovement(0.8, 0.4)).toBeLessThan(0);
  });
  it('throws on invalid score', () => {
    expect(() => calculateImprovement(-1, 0.5)).toThrow();
    expect(() => calculateImprovement(0.5, 1.5)).toThrow();
  });
});

describe('expectedBatchCount', () => {
  it('40 students / 10 per batch = 4 batches', () => {
    expect(expectedBatchCount(40, 10)).toBe(4);
  });
  it('rounds up for uneven classes', () => {
    expect(expectedBatchCount(35, 10)).toBe(4);
  });
  it('handles exact division', () => {
    expect(expectedBatchCount(30, 10)).toBe(3);
  });
  it('throws on zero class size', () => {
    expect(() => expectedBatchCount(0, 10)).toThrow();
  });
  it('throws on zero batch size', () => {
    expect(() => expectedBatchCount(40, 0)).toThrow();
  });
});

describe('completionRate', () => {
  it('returns 1 for fully completed simulation', () => {
    expect(completionRate(8, 8)).toBe(1);
  });
  it('returns 0.5 for halfway through', () => {
    expect(completionRate(4, 8)).toBe(0.5);
  });
  it('clamps to 1 if stages exceeded', () => {
    expect(completionRate(10, 8)).toBe(1);
  });
  it('throws on zero total stages', () => {
    expect(() => completionRate(0, 0)).toThrow();
  });
});

describe('engagementScore', () => {
  it('returns 1 for maximum engagement', () => {
    expect(engagementScore(10, 10, 10)).toBe(1);
  });
  it('returns 0 for zero engagement', () => {
    expect(engagementScore(0, 0, 10)).toBe(0);
  });
  it('returns 0 for zero participants', () => {
    expect(engagementScore(5, 5, 0)).toBe(0);
  });
  it('clamps at 1', () => {
    expect(engagementScore(20, 20, 10)).toBe(1);
  });
});

describe('nextSyncState (state machine)', () => {
  it('localOnly → queued on trigger', () => {
    expect(nextSyncState('localOnly', 'trigger')).toBe('queued');
  });
  it('queued → syncing on start', () => {
    expect(nextSyncState('queued', 'start')).toBe('syncing');
  });
  it('syncing → synced on success', () => {
    expect(nextSyncState('syncing', 'success')).toBe('synced');
  });
  it('syncing → failed on error', () => {
    expect(nextSyncState('syncing', 'error')).toBe('failed');
  });
  it('failed → queued on trigger (retry)', () => {
    expect(nextSyncState('failed', 'trigger')).toBe('queued');
  });
  it('conflict → synced on resolve', () => {
    expect(nextSyncState('conflict', 'resolve')).toBe('synced');
  });
  it('throws on invalid transition', () => {
    expect(() => nextSyncState('synced', 'trigger')).toThrow();
  });
});
