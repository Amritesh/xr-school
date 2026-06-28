import { describe, expect, it } from 'vitest';
import { summarizeCatalog } from '../../scripts/validate-simulation-catalog.mjs';

describe('catalog validation CLI helpers', () => {
  it('summarizes catalog rows by class, subject, and archetype', () => {
    const summary = summarizeCatalog([
      { class: 5, subject: 'biology', primaryArchetype: 'modelInspection' },
      { class: 5, subject: 'biology', primaryArchetype: 'processTimeline' },
      { class: 6, subject: 'physics', primaryArchetype: 'modelInspection' },
    ]);

    expect(summary.byClass).toEqual({ 5: 2, 6: 1 });
    expect(summary.bySubject).toEqual({ biology: 2, physics: 1 });
    expect(summary.byArchetype).toEqual({ modelInspection: 2, processTimeline: 1 });
  });
});
