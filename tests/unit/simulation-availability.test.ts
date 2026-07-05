import { describe, expect, it } from 'vitest';
import { SCIENCE_SIMULATION_CATALOG } from '../../apps/web/lib/scienceCatalog.generated';
import {
  IMPLEMENTED_SIMULATION_SLUGS,
  getSimulationCatalogSections,
  matchesCatalogFilters,
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

    // Of IMPLEMENTED_SIMULATION_SLUGS, only the ones backed by a real catalog
    // CSV row get removed from `catalogued` here — Pollination and Circuit
    // are bespoke builds with no matching row, so they don't count.
    expect(sections.catalogued).toHaveLength(
      SCIENCE_SIMULATION_CATALOG.length - 5,
    );
    expect(sections.catalogued.every(item => item.releaseMaturity === 'catalogued')).toBe(true);
    expect(sections.catalogued.every(item => item.href === undefined)).toBe(true);
    expect(sections.launchable.every(item => item.href === `/simulations/${item.slug}`)).toBe(true);
  });

  it('tags every card with the class levels and subjects it actually applies to', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

    for (const card of [...sections.launchable, ...sections.catalogued]) {
      expect(card.classLevels.length).toBeGreaterThan(0);
      expect(card.subjectTags.length).toBeGreaterThan(0);
    }

    // Pollination and Circuit are authored as broadly-applicable Class 6-10
    // builds, not tied to one grade like the catalogued rows.
    const pollination = sections.launchable.find(item => item.slug === 'pollination');
    expect(pollination?.classLevels).toEqual([6, 7, 8, 9, 10]);
  });

  it('matches a card only when every provided filter agrees', () => {
    const card = {
      slug: 'sample',
      title: 'Sample',
      topic: 'Sample topic',
      subject: 'physics',
      subjectTags: ['physics'],
      grade: 'Class 8',
      classLevels: [8],
      archetype: 'interactive3d',
      minutes: 5,
      color: '#000',
      releaseMaturity: 'internalQA' as const,
    };

    expect(matchesCatalogFilters(card, {})).toBe(true);
    expect(matchesCatalogFilters(card, { classLevel: 8 })).toBe(true);
    expect(matchesCatalogFilters(card, { classLevel: 5 })).toBe(false);
    expect(matchesCatalogFilters(card, { subject: 'physics' })).toBe(true);
    expect(matchesCatalogFilters(card, { subject: 'biology' })).toBe(false);
    expect(matchesCatalogFilters(card, { releaseMaturity: 'internalQA' })).toBe(true);
    expect(matchesCatalogFilters(card, { releaseMaturity: 'catalogued' })).toBe(false);
    expect(matchesCatalogFilters(card, { classLevel: 8, subject: 'physics' })).toBe(true);
    expect(matchesCatalogFilters(card, { classLevel: 8, subject: 'biology' })).toBe(false);
  });
});
