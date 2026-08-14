import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { IMPLEMENTED_SIMULATIONS } from '../../packages/simulation-content/src/implemented/registry';
import {
  EXPECTED_RELEASED_SIMULATION_COUNT,
  QUALITY_WEIGHTS,
  qualityBand,
  qualityTotal,
  validateBeforeAfterScorecard,
  validatePortfolioData,
} from '../../scripts/lib/simulation-quality-data';

const json = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));

describe('simulation quality report data', () => {
  it('owns one release-count invariant for TypeScript report consumers', () => {
    const released = IMPLEMENTED_SIMULATIONS.filter(
      definition => definition.module.publicationStatus === 'released',
    );

    expect(EXPECTED_RELEASED_SIMULATION_COUNT).toBe(released.length);
  });

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

  it('records code-native fungi visuals without inventing asset validation', () => {
    const evidence = json(
      'reports/data/implemented-simulation-quality-evidence.json',
    ) as {
      simulations: Array<{
        slug: string;
        assets: Record<string, unknown>;
        references: Array<Record<string, unknown>>;
      }>;
    };
    const cards = json(
      'reports/data/implemented-simulation-quality-cards.json',
    ) as Array<{
      slug: string;
      dimensionEvidence: { visuals: string[] };
      risks: string[];
      scores: { visuals: number };
    }>;
    const fungi = evidence.simulations.find(
      item => item.slug === 'c8-ch02-a03-fungi-and-its-development',
    );
    const card = cards.find(
      item => item.slug === 'c8-ch02-a03-fungi-and-its-development',
    );

    expect(fungi?.assets).toMatchObject({
      count: 0,
      visualSource: 'code-native',
      provenanceComplete: false,
      pathValidated: false,
      hashValidated: false,
    });
    expect(fungi?.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'c8-ch02-a03-fungi-and-its-development:visual-source',
        kind: 'code-native-visual',
        ref: 'apps/web/lib/world-builder/fungiWorld.ts',
      }),
      expect.objectContaining({
        id: 'c8-ch02-a03-fungi-and-its-development:visual-behavior',
        kind: 'test',
        ref: 'tests/unit/fungi-world.test.ts',
      }),
    ]));
    expect(JSON.stringify(fungi)).not.toMatch(/shared procedural scene/i);
    expect(JSON.stringify(fungi)).not.toMatch(/0 declared assets; path and digest validation passes/i);
    expect(card?.dimensionEvidence.visuals).toEqual([
      'c8-ch02-a03-fungi-and-its-development:visual-source',
      'c8-ch02-a03-fungi-and-its-development:visual-behavior',
    ]);
    expect(card?.scores.visuals).toBe(11);
    expect(card?.risks.join(' ')).toMatch(/code-native/i);
  });

  it('rejects invented path, hash, or provenance validation for an empty manifest', () => {
    const evidence = structuredClone(json(
      'reports/data/implemented-simulation-quality-evidence.json',
    )) as {
      simulations: Array<{
        slug: string;
        assets: Record<string, unknown>;
      }>;
    };
    const fungi = evidence.simulations.find(
      item => item.slug === 'c8-ch02-a03-fungi-and-its-development',
    );
    if (!fungi) throw new Error('Missing fungi evidence fixture');
    Object.assign(fungi.assets, {
      provenanceComplete: true,
      pathValidated: true,
      hashValidated: true,
    });

    expect(validatePortfolioData({
      definitions: IMPLEMENTED_SIMULATIONS,
      cards: json('reports/data/implemented-simulation-quality-cards.json'),
      evidence,
    })).toEqual(expect.arrayContaining([
      expect.stringMatching(/provenanceComplete: expected false/i),
      expect.stringMatching(/pathValidated: expected false/i),
      expect.stringMatching(/hashValidated: expected false/i),
    ]));
  });
});
