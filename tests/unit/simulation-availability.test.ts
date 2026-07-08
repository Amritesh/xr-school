import { describe, expect, it } from 'vitest';
import { SCIENCE_SIMULATION_CATALOG } from '../../apps/web/lib/scienceCatalog.generated';
import {
  IMPLEMENTED_SIMULATION_SLUGS,
  getSimulationCatalogSections,
} from '../../apps/web/lib/simulationAvailability';

describe('simulation availability routing', () => {
  it('launches only bespoke simulations that have reached internal QA', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

    expect(sections.launchable.map(item => item.slug)).toEqual([...IMPLEMENTED_SIMULATION_SLUGS]);
    expect(sections.launchable).toHaveLength(IMPLEMENTED_SIMULATION_SLUGS.length);
    expect(sections.launchable.every(item => item.releaseMaturity === 'internalQA')).toBe(true);
  });

  it('keeps unfinished catalog rows visible but non-launchable', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);
    const implementedCatalogRows = SCIENCE_SIMULATION_CATALOG.filter(item => (
      IMPLEMENTED_SIMULATION_SLUGS.includes(item.slug as (typeof IMPLEMENTED_SIMULATION_SLUGS)[number])
    ));

    expect(sections.catalogued).toHaveLength(
      SCIENCE_SIMULATION_CATALOG.length - implementedCatalogRows.length,
    );
    expect(sections.catalogued.every(item => item.releaseMaturity === 'catalogued')).toBe(true);
    expect(sections.catalogued.every(item => item.href === undefined)).toBe(true);
    expect(sections.launchable.every(item => item.href === `/simulations/${item.slug}`)).toBe(true);
  });

  it('launches the newly authored simulations through the same managed list', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

    expect(sections.launchable.map(item => item.slug)).toEqual(
      expect.arrayContaining([
        'c1-math-ch01-introduction-to-money',
        'c2-english-ch01-prepositions',
        'c8-10-science-solar-system',
      ]),
    );
  });
});
