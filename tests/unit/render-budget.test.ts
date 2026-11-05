import { describe, expect, it } from 'vitest';
import {
  QUEST_BASELINE,
  budgetViolations,
  publishRenderStats,
  readRenderStats,
} from '../../apps/web/lib/world-builder/renderBudget';

describe('Quest render budget', () => {
  it('declares the authoring standard Quest Baseline limits', () => {
    expect(QUEST_BASELINE).toEqual({
      maxDrawCalls: 120,
      maxTriangles: 250_000,
      minFps: 72,
    });
  });

  it('accepts a frame exactly on the limits', () => {
    expect(budgetViolations({ drawCalls: 120, triangles: 250_000 })).toEqual([]);
  });

  it('names each exceeded limit', () => {
    const violations = budgetViolations({ drawCalls: 121, triangles: 250_001 });
    expect(violations).toHaveLength(2);
    expect(violations[0]).toContain('121');
    expect(violations[0]).toContain('draw calls');
    expect(violations[1]).toContain('250001');
    expect(violations[1]).toContain('triangles');
  });

  it('reads the last frame from renderer info', () => {
    expect(
      readRenderStats({ render: { calls: 7, triangles: 900 } }),
    ).toEqual({ drawCalls: 7, triangles: 900 });
  });

  it('publishes stats as data attributes for browser acceptance tests', () => {
    const attributes = new Map<string, string>();
    publishRenderStats(
      { setAttribute: (name, value) => attributes.set(name, value) },
      { drawCalls: 7, triangles: 900 },
    );
    expect(attributes.get('data-render-draw-calls')).toBe('7');
    expect(attributes.get('data-render-triangles')).toBe('900');
  });
});
