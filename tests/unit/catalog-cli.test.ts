import { describe, expect, it } from 'vitest';
import {
  summarizeCatalog,
  validateReleasedReportInputs,
} from '../../scripts/validate-simulation-catalog.mjs';

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

  it('detects missing, unexpected, and duplicate report simulation inputs', () => {
    const errors = validateReleasedReportInputs({
      definitions: [
        { module: { slug: 'released-a', publicationStatus: 'released' } },
        { module: { slug: 'released-b', publicationStatus: 'released' } },
        { module: { slug: 'preview-c', publicationStatus: 'preview' } },
      ],
      qualityCards: [
        { slug: 'released-a' },
        { slug: 'released-a' },
      ],
      qualityEvidence: {
        simulations: [{ slug: 'released-a' }, { slug: 'unexpected-c' }],
      },
    });

    expect(errors).toEqual([
      'quality cards: duplicate released simulation released-a',
      'quality cards: missing released-b',
      'quality evidence: missing released-b',
      'quality evidence: unexpected unexpected-c',
    ]);
  });
});
