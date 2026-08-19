import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createImplementedSimulationRegistry,
  routeForSimulation,
} from '../../packages/simulation-content/src/implemented/registry';
import { INTERACTIVE_SIMULATIONS } from '../../packages/simulation-content/src/implemented/interactive/index';

const expected = [
  {
    slug: 'c5-ch07-a01-a-concept-about-what-floats-what-sinks',
    legacyPath: '/simulations/experiments-with-water-float-or-sink',
  },
  {
    slug: 'c5-ch07-a03-soluble-and-insoluble-substances',
    legacyPath: '/simulations/experiments-with-water-soluble-insoluble',
  },
  {
    slug: 'c6-ch02-a03-test-the-presence-of-lipids',
    legacyPath: '/simulations/components-of-food-lipid-test',
  },
  {
    slug: 'c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies',
    legacyPath: '/simulations/components-of-food-vitamins-deficiencies',
  },
  {
    slug: 'c6-ch02-a05-the-sources-of-minerals-in-food',
    legacyPath: '/simulations/components-of-food-mineral-sources',
  },
  {
    slug: 'c6-ch04-a01-sorting-materials-according-to-their-shape',
    legacyPath: '/simulations/sorting-materials-by-shape',
  },
] as const;

describe('interactive simulation definitions', () => {
  it('defines every canonical identity and PR compatibility path exactly once', () => {
    expect(INTERACTIVE_SIMULATIONS.map(item => item.module.slug).sort()).toEqual(
      expected.map(item => item.slug).sort(),
    );
    expect(
      new Set(INTERACTIVE_SIMULATIONS.map(item => item.module.id)).size,
    ).toBe(6);
    expect(
      new Set(INTERACTIVE_SIMULATIONS.flatMap(item => item.legacyPaths)).size,
    ).toBe(6);
    for (const item of expected) {
      const definition = INTERACTIVE_SIMULATIONS.find(
        candidate => candidate.module.slug === item.slug,
      );
      expect(definition?.legacyPaths).toContain(item.legacyPath);
    }
  });

  it('separates public release from evidence maturity', () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(definition.kind).toBe('interactive');
      expect(definition.module.publicationStatus).toBe('released');
      expect(definition.module.evidenceMaturity).toBe('internalQA');
      expect(definition.module.status).toBe('released');
      expect(definition.module.releaseMaturity).toBe('internalQA');
    }
  });

  it('requires action plus domain evidence at every lesson stage', () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(definition.experience.stages.length).toBeGreaterThanOrEqual(4);
      for (const stage of definition.experience.stages) {
        expect(stage.requiredActionIds.length).toBeGreaterThan(0);
        expect(stage.completionEvidenceIds.length).toBeGreaterThan(0);
      }
    }
  });

  it('requires observation, misconception, and transfer for mastery', () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(definition.assessment.prompts.map(prompt => prompt.kind)).toEqual(
        expect.arrayContaining(['observation', 'misconception', 'transfer']),
      );
      expect(definition.assessment.masteryRule.requiredKinds).toEqual([
        'observation',
        'misconception',
        'transfer',
      ]);
      expect(definition.assessment.masteryRule.allowHintedMastery).toBe(false);
    }
  });

  it('uses captioned shared narration with packaged MP3 files', () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(definition.narration.fallback).toBe('browserTts');
      expect(definition.narration.cues.map(cue => cue.stageId).sort()).toEqual(
        definition.experience.stages.map(stage => stage.id).sort(),
      );
      for (const cue of definition.narration.cues) {
        expect(cue.caption).toBe(cue.text);
        expect(cue.audioUrl).toMatch(/^\/narration\/[a-z0-9]+\.mp3$/u);
      }
    }
  });

  it('records exact PR provenance and explicit visual fallbacks', () => {
    for (const definition of INTERACTIVE_SIMULATIONS) {
      expect(definition.contribution).toMatchObject({
        source: 'pr-8',
        contributor: 'Aditya Kumar Pandey',
      });
      expect(definition.contribution.sourcePath).toMatch(/Viewer\.tsx$/);
      const assetIds = definition.assets.assets.map(asset => asset.id);
      expect(assetIds).toContain(
        `${definition.module.slug}-environment-browser`,
      );
      expect(assetIds).toContain(`${definition.module.slug}-environment-quest`);
      expect(assetIds).toContain(
        `${definition.module.slug}-environment-fallback`,
      );
      expect(
        definition.assets.assets.every(asset => asset.source.trim().length > 0),
      ).toBe(true);
      expect(
        definition.assets.assets.every(asset => asset.license.trim().length > 0),
      ).toBe(true);
      for (const asset of definition.assets.assets) {
        const bytes = readFileSync(resolve(
          process.cwd(),
          'apps/web/public',
          asset.url.replace(/^\//, ''),
        ));
        expect(bytes.byteLength, asset.url).toBe(asset.byteSize);
        expect(
          createHash('sha256').update(bytes).digest('hex'),
          asset.url,
        ).toBe(asset.sha256);
      }
    }
  });

  it('resolves IDs, slugs, canonical paths, and legacy paths through one registry', () => {
    const registry = createImplementedSimulationRegistry(INTERACTIVE_SIMULATIONS);
    for (const definition of registry.definitions) {
      const canonicalPath = `/simulations/${definition.module.slug}`;
      expect(routeForSimulation(definition)).toBe(canonicalPath);
      expect(registry.find(definition.module.id)).toBe(definition);
      expect(registry.find(definition.module.slug)).toBe(definition);
      expect(registry.find(canonicalPath)).toBe(definition);
      expect(registry.resolvePath(canonicalPath)).toEqual({
        definition,
        canonicalPath,
        redirect: false,
      });
      for (const legacyPath of definition.legacyPaths) {
        expect(registry.find(legacyPath)).toBe(definition);
        expect(registry.resolvePath(legacyPath)).toEqual({
          definition,
          canonicalPath,
          redirect: true,
        });
      }
    }
  });
});
