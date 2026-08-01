import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  COURSES,
  CURRICULUM_CHAPTERS,
  IMPLEMENTED_SIMULATIONS,
  LEARNING_CONCEPTS,
} from '@xr-school/simulation-content';
import { DEMO_ACTIVITIES } from '../../packages/classroom-sync/src/index';
import { CURRICULUM_SEARCH_DOCUMENTS } from '../../apps/web/lib/curriculumSearch.generated';
import { RELEASED_SIMULATION_CATALOG } from '../../apps/web/lib/scienceCatalog.generated';
import {
  buildCurriculumSearchDocuments,
  buildReleasedSimulationCatalog,
  toWebCatalogRows,
} from '../../scripts/generate-web-catalog.mjs';
import { parseCatalogCsv } from '../../scripts/validate-simulation-catalog.mjs';

const ROOT = process.cwd();
const released = IMPLEMENTED_SIMULATIONS.filter(
  definition => definition.module.publicationStatus === 'released',
);
const releasedIds = released.map(({ module }) => module.id).sort();
const releasedSlugs = released.map(({ module }) => module.slug).sort();

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
}

function productionFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (['.next', 'dist', 'node_modules'].includes(entry)) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...productionFiles(path));
    } else if (['.js', '.mjs', '.ts', '.tsx'].includes(extname(path))) {
      files.push(path);
    }
  }
  return files;
}

describe('released simulation registry consumers', () => {
  it('serves exactly the released canonical module records from the API', async () => {
    const { buildApp } = await import('../../apps/api/src/app');
    const app = await buildApp({ logger: false });

    try {
      const response = await app.inject({ method: 'GET', url: '/v1/simulation-modules' });
      expect(response.statusCode).toBe(200);
      const payload = response.json<{
        items: Array<{
          id: string;
          slug: string;
          publicationStatus: string;
          evidenceMaturity: string;
        }>;
        page: { totalItems: number };
      }>();

      expect(payload.items.map(item => item.id).sort()).toEqual(releasedIds);
      expect(payload.page.totalItems).toBe(releasedIds.length);
      expect(payload.items.every(item => item.publicationStatus === 'released')).toBe(true);
      expect(payload.items.map(item => item.slug).sort()).toEqual(releasedSlugs);
      expect(payload.items.every(item => item.evidenceMaturity === 'internalQA')).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('derives every classroom launch from the released registry', () => {
    expect(DEMO_ACTIVITIES.map(activity => activity.id).sort()).toEqual(releasedSlugs);
    expect(DEMO_ACTIVITIES.map(activity => activity.moduleId).sort()).toEqual(releasedIds);
    expect(DEMO_ACTIVITIES.every(activity => activity.publicationStatus === 'released')).toBe(true);
    expect(DEMO_ACTIVITIES.every(activity => activity.evidenceMaturity === 'internalQA')).toBe(true);
  });

  it('indexes and publishes exactly the released registry definitions', () => {
    const csv = readFileSync(
      resolve(ROOT, 'docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv'),
      'utf8',
    );
    const catalogRows = toWebCatalogRows(parseCatalogCsv(csv));
    const searchDocuments = buildCurriculumSearchDocuments({
      catalogRows,
      courses: COURSES,
      chapters: CURRICULUM_CHAPTERS,
      concepts: LEARNING_CONCEPTS,
      definitions: released,
    });
    const releasedSearchDocuments = searchDocuments.filter(
      document => document.kind === 'simulation' && document.publicationStatus === 'released',
    );
    const releasedCatalog = buildReleasedSimulationCatalog(released);
    const generatedSearchDocuments = CURRICULUM_SEARCH_DOCUMENTS.filter(
      document => document.kind === 'simulation' && document.publicationStatus === 'released',
    );

    expect(releasedSearchDocuments.map(document => document.moduleId).sort()).toEqual(releasedIds);
    expect(releasedSearchDocuments.map(document => document.href.replace('/simulations/', '')).sort())
      .toEqual(releasedSlugs);
    expect(releasedSearchDocuments.every(document => document.evidenceMaturity === 'internalQA'))
      .toBe(true);
    expect(releasedCatalog.map(item => item.id).sort()).toEqual(releasedIds);
    expect(releasedCatalog.map(item => item.slug).sort()).toEqual(releasedSlugs);
    expect(releasedCatalog.every(item => item.publicationStatus === 'released')).toBe(true);
    expect(generatedSearchDocuments.map(document => document.moduleId).sort()).toEqual(releasedIds);
    expect(RELEASED_SIMULATION_CATALOG.map(item => item.id).sort()).toEqual(releasedIds);
  });

  it('keeps both quality-report inputs aligned with released launch slugs', () => {
    const cards = readJson('reports/data/implemented-simulation-quality-cards.json') as Array<{
      slug: string;
    }>;
    const evidence = readJson('reports/data/implemented-simulation-quality-evidence.json') as {
      simulations: Array<{ slug: string }>;
    };

    expect(cards.map(item => item.slug).sort()).toEqual(releasedSlugs);
    expect(evidence.simulations.map(item => item.slug).sort()).toEqual(releasedSlugs);
  });

  it('uses package public APIs for every production cross-package import', () => {
    const offenders: string[] = [];
    const crossPackageSourceImport =
      /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"][^'"]*(?:packages\/[^'"]+\/src|@xr-school\/[^/'"]+\/src)[^'"]*['"]/g;

    for (const root of ['apps', 'packages', 'scripts']) {
      for (const file of productionFiles(resolve(ROOT, root))) {
        const source = readFileSync(file, 'utf8');
        if (crossPackageSourceImport.test(source)) {
          offenders.push(file.replace(`${ROOT}/`, ''));
        }
        crossPackageSourceImport.lastIndex = 0;
      }
    }

    expect(offenders).toEqual([]);
  });

  it('builds public packages before registry-backed verification consumers', () => {
    const packageJson = readJson('package.json') as {
      scripts: Record<string, string>;
    };
    const commands = packageJson.scripts.verify.split(' && ');
    const position = (command: string) => commands.indexOf(command);

    expect(position('npm run build:packages')).toBeGreaterThan(
      position('npm run contract:compile'),
    );
    for (const command of [
      'npm run catalog:validate',
      'npm run narration:validate:manifests',
      'npm run web-catalog:generate',
    ]) {
      expect(position(command), `${command} missing from verify`).toBeGreaterThan(
        position('npm run build:packages'),
      );
    }
    expect(position('npm run type-check:packages')).toBeGreaterThan(position('npm run test'));
    expect(position('npm --workspace apps/api run build')).toBeGreaterThan(
      position('npm run type-check:packages'),
    );
    expect(position('npm --workspace apps/web run type-check')).toBeGreaterThan(
      position('npm --workspace apps/api run build'),
    );
    expect(position('npm --workspace apps/web run build')).toBeGreaterThan(
      position('npm --workspace apps/web run type-check'),
    );
  });

  it('declares every public registry dependency at its consuming package boundary', () => {
    const dependencies = (path: string) => (
      readJson(path) as { dependencies?: Record<string, string> }
    ).dependencies;

    expect(dependencies('apps/api/package.json')).toMatchObject({
      '@xr-school/classroom-sync': '0.1.0',
      '@xr-school/simulation-content': '0.1.0',
    });
    expect(dependencies('packages/classroom-sync/package.json')).toMatchObject({
      '@xr-school/simulation-content': '0.1.0',
      '@xr-school/simulation-schema': '0.1.0',
    });
    expect(dependencies('apps/web/package.json')).toMatchObject({
      '@xr-school/classroom-sync': '0.1.0',
      '@xr-school/simulation-runtime': '0.1.0',
    });
  });
});
