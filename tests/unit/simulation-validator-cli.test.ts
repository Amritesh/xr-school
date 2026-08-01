import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  REQUIRED_OPENAPI_ROUTES,
  extractSimulationSlugs,
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

  it('reports missing pages, the shared viewer registry, OpenAPI routes, and forbidden XR fit types', () => {
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
      definitions: [{ module: { slug: 'pollination', xrFitType: 'normalClassroomBetter' } }],
    });

    expect(result.errors).toContain(
      'Missing page for slug "pollination": apps/web/app/simulations/pollination/page.tsx',
    );
    expect(result.errors).toContain(
      'Missing shared viewer registry: apps/web/lib/simulations/viewerRegistry.ts',
    );
    expect(result.errors).toContain('OpenAPI missing route: /v1/evaluation-records');
    expect(result.errors).toContain('/v1/simulation-modules is missing POST operation');
    expect(result.errors).toContain(
      'Simulation uses forbidden xrFitType "normalClassroomBetter". Only strongVrFit or arTabletFit may be built.',
    );
  });

  it('accepts a thin server route whose client boundary lives in the shared viewer registry', () => {
    const files = new Map<string, string>([
      [
        pathFromRoot('packages/simulation-content/src/modules.ts'),
        "{ slug: 'pollination', xrFitType: 'strongVrFit' }",
      ],
      [
        pathFromRoot('apps/web/app/simulations/pollination/page.tsx'),
        [
          "import SimulationRoutePage from '@/components/simulations/shared/SimulationRoutePage';",
          '',
          'export default function Page() {',
          '  return <SimulationRoutePage slug="pollination" />;',
          '}',
        ].join('\n'),
      ],
      [
        pathFromRoot('apps/web/components/simulations/PollinationViewer.tsx'),
        "'use client'; export default function PollinationViewer() { return null; }",
      ],
      [
        pathFromRoot('apps/web/lib/simulations/viewerRegistry.ts'),
        "'use client'; export const registry = { pollination: () => import('./PollinationViewer') };",
      ],
      [
        pathFromRoot('generated/openapi/openapi.json'),
        JSON.stringify({
          paths: Object.fromEntries(
            REQUIRED_OPENAPI_ROUTES.map(route => [
              route,
              route === '/v1/simulation-modules' ? { get: {}, post: {} } : {},
            ]),
          ),
        }),
      ],
    ]);

    const result = validateSimulationWorkspace({
      root,
      exists: candidate => files.has(candidate),
      readFile: candidate => files.get(candidate) ?? '',
      definitions: [{ module: { slug: 'pollination', xrFitType: 'strongVrFit' } }],
    });

    expect(result.errors).toEqual([]);
    expect(result.passes).toContain('pollination/page.tsx delegates to SimulationRoutePage');
  });
});
