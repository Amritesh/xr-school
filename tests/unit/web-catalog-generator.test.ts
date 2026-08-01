import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCatalogCsv } from '../../scripts/validate-simulation-catalog.mjs';
import {
  buildCurriculumSearchDocuments,
  buildReleasedSimulationCatalog,
  renderWebCatalogSource,
  toWebCatalogRows,
} from '../../scripts/generate-web-catalog.mjs';
import {
  COURSES,
  CURRICULUM_CHAPTERS,
  IMPLEMENTED_SIMULATIONS,
  LEARNING_CONCEPTS,
} from '@xr-school/simulation-content';

const csv = readFileSync(resolve(process.cwd(), 'docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv'), 'utf8');
const rows = toWebCatalogRows(parseCatalogCsv(csv));

describe('web catalog generator', () => {
  it('creates a deployable row for every PDF catalog simulation', () => {
    expect(rows).toHaveLength(497);
    expect(new Set(rows.map(row => row.slug)).size).toBe(497);
  });

  it('keeps key catalog fields for generic simulation routes', () => {
    const row = rows.find(item => item.slug === 'c5-ch07-a03-soluble-and-insoluble-substances');

    expect(row).toMatchObject({
      slug: 'c5-ch07-a03-soluble-and-insoluble-substances',
      title: 'Soluble and Insoluble substances',
      classLevel: 5,
      primaryArchetype: 'experimentBench',
      simulationFormat: 'practicalLabSimulation',
      releaseMaturity: 'catalogued',
    });
  });

  it('keeps the promoted digestive activity aligned with the ten-minute lesson', () => {
    const row = rows.find(
      item => item.slug === 'c5-ch03-a02-introduction-of-digestive-system',
    );

    expect(row).toMatchObject({
      title: 'Introduction to the Digestive System',
      expectedDurationMinutes: 10,
      primaryArchetype: 'modelInspection',
      secondaryArchetypes: ['processTimeline'],
      simulationFormat: 'immersiveVr',
    });
  });

  it('renders a TypeScript source module with readonly catalog data', () => {
    const releasedRows = buildReleasedSimulationCatalog(IMPLEMENTED_SIMULATIONS);
    const source = renderWebCatalogSource(rows.slice(0, 2), releasedRows);

    expect(source).toContain('export const SCIENCE_SIMULATION_CATALOG');
    expect(source).toContain('export const RELEASED_SIMULATION_CATALOG');
    expect(source).toContain('as const');
    expect(source).toContain('c5-ch01-a01-supersense-of-smell');
  });

  it('builds a deterministic curriculum index across courses, concepts, and simulations', () => {
    const documents = buildCurriculumSearchDocuments({
      catalogRows: rows,
      courses: COURSES,
      chapters: CURRICULUM_CHAPTERS,
      concepts: LEARNING_CONCEPTS,
      definitions: IMPLEMENTED_SIMULATIONS,
    });

    expect(documents.length).toBeGreaterThan(500);
    expect(new Set(documents.map(document => document.id)).size).toBe(documents.length);
    expect(documents.find(document => document.id === 'simulation:pollination')).toMatchObject({
      kind: 'simulation',
      moduleId: 'sim-pollination-001',
      publicationStatus: 'released',
      evidenceMaturity: 'internalQA',
      releaseMaturity: 'internalQA',
      href: '/simulations/pollination',
    });
    expect(documents.filter(
      document => document.id === 'simulation:c5-ch03-a02-introduction-of-digestive-system',
    )).toEqual([
      expect.objectContaining({
        kind: 'simulation',
        releaseMaturity: 'internalQA',
        href: '/simulations/c5-ch03-a02-introduction-of-digestive-system',
        classLevels: [5],
      }),
    ]);
    for (const slug of [
      'c1-math-ch01-introduction-to-money',
      'c2-english-ch01-prepositions',
      'c8-10-science-solar-system',
    ]) {
      expect(documents.find(document => document.id === `simulation:${slug}`)).toMatchObject({
        kind: 'simulation',
        releaseMaturity: 'internalQA',
        href: `/simulations/${slug}`,
      });
    }
  });

  it('derives the exact class for a released definition without a course link', () => {
    const template = IMPLEMENTED_SIMULATIONS.find(
      definition => definition.module.slug === 'c5-ch07-a03-soluble-and-insoluble-substances',
    )!;
    const unlinkedDefinition = {
      ...template,
      module: {
        ...template.module,
        id: 'sim-c05-ch99-a01-unlinked-search-projection',
        slug: 'c5-ch99-a01-unlinked-search-projection',
      },
    };
    const documents = buildCurriculumSearchDocuments({
      catalogRows: [],
      courses: COURSES,
      chapters: CURRICULUM_CHAPTERS,
      concepts: LEARNING_CONCEPTS,
      definitions: [unlinkedDefinition],
    });

    expect(documents.find(document => document.kind === 'simulation')).toMatchObject({
      moduleId: unlinkedDefinition.module.id,
      classLevels: [5],
    });
  });
});
