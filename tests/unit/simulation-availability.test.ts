import { describe, expect, it } from 'vitest';
import { SCIENCE_SIMULATION_CATALOG } from '../../apps/web/lib/scienceCatalog.generated';
import { IMPLEMENTED_SIMULATIONS } from '../../packages/simulation-content/src/index';
import {
  IMPLEMENTED_SIMULATION_SLUGS,
  SIMULATION_PRESENTATION_OVERLAYS,
  assertSimulationPresentationOverlayIntegrity,
  deriveSimulationPresentationOverlay,
  isImplementedSimulationSlug,
  getSimulationCatalogSections,
  matchesCatalogFilters,
} from '../../apps/web/lib/simulationAvailability';

describe('simulation availability routing', () => {
  it('launches only bespoke simulations that have reached internal QA', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

    expect(sections.launchable.map(item => item.slug)).toEqual([...IMPLEMENTED_SIMULATION_SLUGS]);
    expect(sections.launchable).toHaveLength(IMPLEMENTED_SIMULATION_SLUGS.length);
    expect(sections.launchable.every(item => item.releaseMaturity === 'internalQA')).toBe(true);
    expect(sections.launchable.map(item => item.slug)).toEqual(
      IMPLEMENTED_SIMULATIONS.map(({ module }) => module.slug),
    );
  });

  it('derives launchable identity and release fields from the canonical registry', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

    for (const definition of IMPLEMENTED_SIMULATIONS) {
      const card = sections.launchable.find(
        item => item.slug === definition.module.slug,
      );
      expect(card).toMatchObject({
        slug: definition.module.slug,
        title: definition.module.title,
        subjectTags: definition.module.subjects,
        minutes: definition.module.expectedDurationMinutes,
        releaseMaturity: definition.module.releaseMaturity,
        href: `/simulations/${definition.module.slug}`,
      });
    }
  });

  it('keeps one recognized presentation overlay per released module ID', () => {
    const releasedIds = IMPLEMENTED_SIMULATIONS.map(({ module }) => module.id).sort();

    expect(Object.keys(SIMULATION_PRESENTATION_OVERLAYS).sort()).toEqual(
      releasedIds,
    );
    expect(() =>
      assertSimulationPresentationOverlayIntegrity(
        SIMULATION_PRESENTATION_OVERLAYS,
      ),
    ).not.toThrow();

    const firstId = releasedIds[0];
    const { [firstId]: _missing, ...missingOverlay } =
      SIMULATION_PRESENTATION_OVERLAYS;
    expect(() =>
      assertSimulationPresentationOverlayIntegrity(missingOverlay),
    ).toThrow(/missing overlay/i);

    expect(() =>
      assertSimulationPresentationOverlayIntegrity({
        ...SIMULATION_PRESENTATION_OVERLAYS,
        'sim-not-implemented': {
          color: '#000000',
          topic: 'Unknown',
          archetype: 'unknown',
          classLevels: [1],
        },
      }),
    ).toThrow(/unrecognized overlay/i);

    expect(() =>
      assertSimulationPresentationOverlayIntegrity({
        ...SIMULATION_PRESENTATION_OVERLAYS,
        [firstId]: {
          ...SIMULATION_PRESENTATION_OVERLAYS[firstId],
          classLevels: [],
        },
      }),
    ).toThrow(/class levels/i);

    expect(Object.isFrozen(SIMULATION_PRESENTATION_OVERLAYS)).toBe(true);
    expect(
      Object.values(SIMULATION_PRESENTATION_OVERLAYS).every(
        overlay => Object.isFrozen(overlay) && Object.isFrozen(overlay.classLevels),
      ),
    ).toBe(true);
    expect(() => {
      (SIMULATION_PRESENTATION_OVERLAYS[firstId].classLevels as number[]).push(99);
    }).toThrow(TypeError);
  });

  it('derives complete presentation metadata for a newly released class', () => {
    const foodSpoilage = IMPLEMENTED_SIMULATIONS.find(
      ({ module }) => module.id === 'sim-c05-ch04-a01-food-spoilage',
    );
    expect(foodSpoilage).toBeDefined();

    const overlay = deriveSimulationPresentationOverlay(foodSpoilage!);
    expect(overlay).toEqual({
      color: '#38bdf8',
      topic: foodSpoilage!.module.title,
      archetype: 'interactive 3D',
      classLevels: [5],
    });
    expect(SIMULATION_PRESENTATION_OVERLAYS[foodSpoilage!.module.id]).toEqual(overlay);
  });

  it('exposes a route guard for exactly the implemented demos', () => {
    expect(isImplementedSimulationSlug('pollination')).toBe(true);
    expect(isImplementedSimulationSlug('c5-ch01-a01-supersense-of-smell')).toBe(false);
  });

  it('keeps unfinished catalog rows visible but non-launchable', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);
    const implementedCatalogRows = SCIENCE_SIMULATION_CATALOG.filter(item => (
      IMPLEMENTED_SIMULATION_SLUGS.includes(item.slug as (typeof IMPLEMENTED_SIMULATION_SLUGS)[number])
    ));

    // Of IMPLEMENTED_SIMULATION_SLUGS, only the ones backed by a real catalog
    // CSV row get removed from `catalogued` here — Pollination and Circuit
    // are bespoke builds with no matching row, so they don't count.
    expect(sections.catalogued).toHaveLength(
      SCIENCE_SIMULATION_CATALOG.length - implementedCatalogRows.length,
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

  it('launches the newly authored simulations through the same managed list', () => {
    const sections = getSimulationCatalogSections(SCIENCE_SIMULATION_CATALOG);

    expect(sections.launchable.map(item => item.slug)).toEqual(
      expect.arrayContaining([
        'c1-art-a01-learning-of-colours',
        'c1-math-ch01-introduction-to-money',
        'c2-english-ch01-prepositions',
        'c8-10-science-solar-system',
        'c8-ch02-a03-fungi-and-its-development',
      ]),
    );
  });
});
