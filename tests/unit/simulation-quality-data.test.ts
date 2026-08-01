import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { IMPLEMENTED_SIMULATIONS } from '../../packages/simulation-content/src/implemented/registry';
import {
  QUALITY_WEIGHTS,
  qualityBand,
  qualityTotal,
  validateBeforeAfterScorecard,
  validatePortfolioData,
} from '../../scripts/lib/simulation-quality-data';

const json = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));

describe('simulation quality report data', () => {
  it('uses the approved weighted rubric and bands', () => {
    expect(QUALITY_WEIGHTS).toEqual({
      education: 20,
      integrity: 15,
      interactivity: 15,
      visuals: 15,
      audio: 10,
      usability: 10,
      stability: 10,
      deployment: 5,
    });
    expect(qualityTotal({
      education: 17,
      integrity: 12,
      interactivity: 12,
      visuals: 9,
      audio: 4,
      usability: 8,
      stability: 8,
      deployment: 3,
    })).toBe(73);
    expect(qualityBand(85)).toBe('Pilot candidate');
    expect(qualityBand(70)).toBe('Promising internal QA');
    expect(qualityBand(55)).toBe('Needs focused improvement');
    expect(qualityBand(54)).toBe('Rebuild before pilot');
  });

  it('covers every released canonical simulation exactly once', () => {
    const errors = validatePortfolioData({
      definitions: IMPLEMENTED_SIMULATIONS,
      cards: json('reports/data/implemented-simulation-quality-cards.json'),
      evidence: json(
        'reports/data/implemented-simulation-quality-evidence.json',
      ),
    });
    expect(errors).toEqual([]);
  });

  it('covers all 23 contributions at the immutable PR head', () => {
    const errors = validateBeforeAfterScorecard({
      definitions: IMPLEMENTED_SIMULATIONS,
      scorecard: json(
        'reports/data/new-simulation-before-after-scorecard.json',
      ),
    });
    expect(errors).toEqual([]);
  });
});
