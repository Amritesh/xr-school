import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractSimulationSlugs,
  resolveViewerName,
  validateSimulationWorkspace,
} from '../../scripts/validate-simulations.mjs';

const root = '/repo';
const pathFromRoot = (path: string) => resolve(root, path);

describe('simulation validation CLI helpers', () => {
  it('extracts implemented simulation slugs from module source', () => {
    const slugs = extractSimulationSlugs(`
      { slug: 'pollination', xrFitType: 'strongVrFit' },
      { slug: "c9-ch01-a02-states-of-matter", xrFitType: "strongVrFit" },
    `);

    expect(slugs).toEqual(['pollination', 'c9-ch01-a02-states-of-matter']);
  });

  it('resolves known viewer component names from slugs', () => {
    expect(resolveViewerName('pollination')).toBe('PollinationViewer');
    expect(resolveViewerName('c6-ch01-a01-sources-of-food')).toBe('FoodSourcesSortingViewer');
  });

  it('reports missing pages, viewers, OpenAPI routes, and forbidden XR fit types', () => {
    const files = new Map<string, string>([
      [
        pathFromRoot('packages/simulation-content/src/modules.ts'),
        "{ slug: 'pollination', xrFitType: 'normalClassroomBetter' }",
      ],
      [
        pathFromRoot('generated/openapi/openapi.json'),
        JSON.stringify({
          paths: {
            '/v1/simulation-modules': { get: {} },
          },
        }),
      ],
    ]);

    const result = validateSimulationWorkspace({
      root,
      exists: candidate => files.has(candidate),
      readFile: candidate => files.get(candidate) ?? '',
    });

    expect(result.errors).toContain(
      'Missing page for slug "pollination": apps/web/app/simulations/pollination/page.tsx',
    );
    expect(result.errors).toContain(
      'Missing viewer component for slug "pollination": components/simulations/PollinationViewer.tsx',
    );
    expect(result.errors).toContain('OpenAPI missing route: /v1/evaluation-records');
    expect(result.errors).toContain('/v1/simulation-modules is missing POST operation');
    expect(result.errors).toContain(
      'Simulation uses forbidden xrFitType "normalClassroomBetter". Only strongVrFit or arTabletFit may be built.',
    );
  });
});
