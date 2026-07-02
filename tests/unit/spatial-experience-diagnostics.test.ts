import { describe, expect, it } from 'vitest';
import {
  evaluateLabelAngularSize,
  evaluateReach,
} from '../../apps/web/lib/world-builder/scaleDiagnostics';
import {
  occlusionRatio,
  verifyClearView,
} from '../../apps/web/lib/world-builder/occlusionDiagnostics';
import {
  resolveCuePlacement,
} from '../../apps/web/lib/world-builder/spatialCueSystem';

describe('spatial experience diagnostics', () => {
  it('accepts reachable tools and rejects unreachable ones', () => {
    expect(evaluateReach(
      [0, 1.35, -0.6],
      [0, 1.35, 0],
      { min: 0.25, max: 0.8 },
    )).toEqual([]);
    expect(evaluateReach(
      [0, 1.35, -1.2],
      [0, 1.35, 0],
      { min: 0.25, max: 0.8 },
    )).toEqual(['target distance 1.20m exceeds maximum reach 0.80m']);
  });

  it('checks readable angular label size', () => {
    expect(evaluateLabelAngularSize(0.08, 1.8, 1.4)).toEqual([]);
    expect(evaluateLabelAngularSize(0.02, 2.5, 1.4).join('')).toMatch(/angular size/);
  });

  it('measures viewport overlap and preserves the clear view', () => {
    const focus = { x: 0.3, y: 0.2, width: 0.4, height: 0.5 };
    expect(occlusionRatio(
      focus,
      { x: 0, y: 0.82, width: 1, height: 0.18 },
    )).toBe(0);
    expect(verifyClearView(
      focus,
      [{ x: 0.35, y: 0.3, width: 0.2, height: 0.2 }],
      0.08,
    )).toHaveLength(1);
  });

  it('chooses the first cue position outside the focus direction', () => {
    expect(resolveCuePlacement({
      primary: [0, 1.4, -1.5],
      fallbacks: [[1.1, 1.4, -1.5], [-1.1, 1.4, -1.5]],
      focusDirection: [0, 0, -1],
      minimumSeparationDegrees: 25,
    })).toEqual([1.1, 1.4, -1.5]);
  });
});
