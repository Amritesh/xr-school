import { describe, expect, it } from 'vitest';
import { SCIENCE_SIMULATION_CATALOG } from '../../apps/web/lib/scienceCatalog.generated';
import {
  IMPLEMENTED_SIMULATION_SLUGS,
  getSimulationCatalogSections,
} from '../../apps/web/lib/simulationAvailability';

describe('simulation availability routing', () => {
  it('marks extra custom demos and every PDF catalog row as launchable', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

    expect(sections.implemented.map(item => item.slug).slice(0, IMPLEMENTED_SIMULATION_SLUGS.length)).toEqual([...IMPLEMENTED_SIMULATION_SLUGS]);
    expect(sections.implemented).toHaveLength(IMPLEMENTED_SIMULATION_SLUGS.length + SCIENCE_SIMULATION_CATALOG.length);
    expect(sections.queuedPdf).toHaveLength(0);
  });

  it('marks only real simulations as launchable', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

    expect(sections.implemented.every(item => item.status === 'implemented')).toBe(true);
    expect(sections.implemented.every(item => item.href === `/simulations/${item.slug}`)).toBe(true);
  });
});
