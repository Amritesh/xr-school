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

    expect(sections.catalogued).toHaveLength(
      SCIENCE_SIMULATION_CATALOG.length - 3,
    );
    expect(sections.catalogued.every(item => item.releaseMaturity === 'catalogued')).toBe(true);
    expect(sections.catalogued.every(item => item.href === undefined)).toBe(true);
    expect(sections.launchable.every(item => item.href === `/simulations/${item.slug}`)).toBe(true);
  });
});
