import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCatalogCsv } from '../../scripts/validate-simulation-catalog.mjs';
import { renderWebCatalogSource, toWebCatalogRows } from '../../scripts/generate-web-catalog.mjs';

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
    });
  });

  it('renders a TypeScript source module with readonly catalog data', () => {
    const source = renderWebCatalogSource(rows.slice(0, 2));

    expect(source).toContain('export const SCIENCE_SIMULATION_CATALOG');
    expect(source).toContain('as const');
    expect(source).toContain('c5-ch01-a01-supersense-of-smell');
  });
});
