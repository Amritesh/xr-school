import { describe, expect, it } from 'vitest';
import {
  chooseQualityProfile,
  nextLowerQualityProfile,
} from '../../packages/simulation-runtime/src/index';
import {
  presentationBudgetForProfile,
  evaluatePresentationBudget,
} from '../../apps/web/lib/world-builder/diagnostics';

describe('world presentation quality', () => {
  it('selects Quest baseline for immersive XR', () => {
    expect(chooseQualityProfile({
      isImmersiveXr: true,
      deviceMemoryGb: 8,
      maxTextureSize: 8192,
    })).toBe('questBaseline');
  });

  it('downgrades enhanced browser quality in declared order', () => {
    expect(nextLowerQualityProfile('browserEnhanced')).toBe('browserBalanced');
    expect(nextLowerQualityProfile('browserBalanced')).toBe('questBaseline');
    expect(nextLowerQualityProfile('questBaseline')).toBeUndefined();
  });

  it('reports draw call, triangle, and frame-rate budget failures', () => {
    expect(evaluatePresentationBudget(
      { fps: 68, drawCalls: 130, triangles: 260_000 },
      { minSteadyFps: 72, maxDrawCalls: 120, maxVisibleTriangles: 250_000 },
    )).toEqual([
      'fps 68 is below 72',
      'draw calls 130 exceed 120',
      'triangles 260000 exceed 250000',
    ]);
  });

  it('uses the active browser profile instead of Quest acceptance thresholds', () => {
    expect(presentationBudgetForProfile('browserEnhanced')).toMatchObject({
      minSteadyFps: 60,
      maxDrawCalls: 300,
      maxVisibleTriangles: 750_000,
    });
    expect(evaluatePresentationBudget(
      { fps: 60, drawCalls: 1, triangles: 1 },
      presentationBudgetForProfile('browserEnhanced'),
    )).toEqual([]);
  });
});
