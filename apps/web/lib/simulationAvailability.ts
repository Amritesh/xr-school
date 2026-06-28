import type { ScienceSimulationCatalogItem } from './scienceCatalog.generated';

export const IMPLEMENTED_SIMULATION_SLUGS = [
  'pollination',
  'circuit',
  'c9-ch01-a02-states-of-matter',
  'c6-ch01-a01-sources-of-food',
  'c5-ch07-a03-soluble-and-insoluble-substances',
] as const;

type ImplementedSlug = (typeof IMPLEMENTED_SIMULATION_SLUGS)[number];

export type CatalogCard = {
  slug: string;
  title: string;
  topic: string;
  subject: string;
  grade: string;
  archetype: string;
  minutes: number;
  color: string;
  releaseMaturity: 'catalogued' | 'inDevelopment' | 'internalQA' | 'pilotReady' | 'schoolValidated';
  href?: string;
};

const EXTRA_IMPLEMENTED: Record<ImplementedSlug, Omit<CatalogCard, 'releaseMaturity' | 'href'>> = {
  pollination: {
    slug: 'pollination',
    color: '#34d399',
    subject: 'biology, environmental science',
    grade: 'Class 6-10',
    title: 'Plant Pollination & Growth Cycle',
    topic: 'Plant reproduction',
    archetype: 'immersive VR',
    minutes: 10,
  },
  circuit: {
    slug: 'circuit',
    color: '#fbbf24',
    subject: 'physics',
    grade: 'Class 6-10',
    title: "Electric Circuits & Resistance (Ohm's Law)",
    topic: 'Electricity',
    archetype: 'interactive 3D',
    minutes: 8,
  },
  'c9-ch01-a02-states-of-matter': {
    slug: 'c9-ch01-a02-states-of-matter',
    color: '#38bdf8',
    subject: 'chemistry, physics',
    grade: 'Class 9',
    title: 'States of Matter Particle Lab',
    topic: 'Matter in Our Surroundings',
    archetype: 'interactive3d',
    minutes: 10,
  },
  'c6-ch01-a01-sources-of-food': {
    slug: 'c6-ch01-a01-sources-of-food',
    color: '#4ade80',
    subject: 'science, biology',
    grade: 'Class 6',
    title: 'Sources of Food Sorting Lab',
    topic: 'Food: Where does It come from?',
    archetype: 'sortingBoard',
    minutes: 9,
  },
  'c5-ch07-a03-soluble-and-insoluble-substances': {
    slug: 'c5-ch07-a03-soluble-and-insoluble-substances',
    color: '#67e8f9',
    subject: 'environmentalScience, science',
    grade: 'Class 5',
    title: 'Soluble and Insoluble Substances Lab',
    topic: 'Experiments with Water',
    archetype: 'experimentBench',
    minutes: 8,
  },
};

const COLORS: Record<string, string> = {
  modelInspection: '#38bdf8',
  scenario: '#fb7185',
  sortingBoard: '#4ade80',
  guidedTour: '#a78bfa',
  experimentBench: '#67e8f9',
  processTimeline: '#fb923c',
  measurementGraph: '#f472b6',
  systemMap: '#2dd4bf',
};

const implementedSet = new Set<string>(IMPLEMENTED_SIMULATION_SLUGS);

function toCataloguedCard(item: ScienceSimulationCatalogItem): CatalogCard {
  return {
    slug: item.slug,
    color: COLORS[item.primaryArchetype] ?? '#38bdf8',
    subject: item.subject,
    grade: `Class ${item.classLevel}`,
    title: item.title,
    topic: item.topic,
    archetype: item.primaryArchetype,
    minutes: item.expectedDurationMinutes,
    releaseMaturity: item.releaseMaturity,
  };
}

export function getSimulationCatalogSections(catalog: readonly ScienceSimulationCatalogItem[]) {
  const launchable = IMPLEMENTED_SIMULATION_SLUGS.map(slug => ({
    ...EXTRA_IMPLEMENTED[slug],
    releaseMaturity: 'internalQA' as const,
    href: `/simulations/${slug}`,
  }));
  const catalogued = catalog
    .filter(item => !implementedSet.has(item.slug))
    .map(toCataloguedCard);

  return {
    launchable,
    catalogued,
  };
}
