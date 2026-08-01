import {
  classLevelsForSimulation,
  IMPLEMENTED_SIMULATIONS,
  routeForSimulation,
} from '@xr-school/simulation-content';
import type {
  ImplementedSimulationDefinition,
  SimulationFormat,
} from '@xr-school/simulation-schema';
import type { ScienceSimulationCatalogItem } from './scienceCatalog.generated';

const RELEASED_SIMULATIONS = IMPLEMENTED_SIMULATIONS.filter(
  definition => definition.module.publicationStatus === 'released',
);

export const IMPLEMENTED_SIMULATION_SLUGS = Object.freeze(
  RELEASED_SIMULATIONS.map(({ module }) => module.slug),
);

type ImplementedSlug = (typeof IMPLEMENTED_SIMULATION_SLUGS)[number];

export type CatalogCard = {
  slug: string;
  title: string;
  topic: string;
  subject: string;
  /** Canonical subject values this card matches against the subject filter. */
  subjectTags: string[];
  grade: string;
  /** Class levels this card matches against the class-level filter. */
  classLevels: number[];
  archetype: string;
  minutes: number;
  color: string;
  releaseMaturity: 'catalogued' | 'inDevelopment' | 'internalQA' | 'pilotReady' | 'schoolValidated';
  href?: string;
};

export interface SimulationPresentationOverlay {
  readonly color: string;
  readonly topic: string;
  readonly archetype: string;
  readonly classLevels: readonly number[];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const AUTHORED_SIMULATION_PRESENTATION_OVERRIDES: Readonly<Record<
  string,
  Readonly<SimulationPresentationOverlay>
>> = {
  'sim-pollination-001': {
    color: '#34d399',
    classLevels: [6, 7, 8, 9, 10],
    topic: 'Plant reproduction',
    archetype: 'immersive VR',
  },
  'sim-circuit-001': {
    color: '#fbbf24',
    classLevels: [6, 7, 8, 9, 10],
    topic: 'Electricity',
    archetype: 'interactive 3D',
  },
  'sim-c09-ch01-a02-states-of-matter': {
    color: '#38bdf8',
    classLevels: [9],
    topic: 'Matter in Our Surroundings',
    archetype: 'interactive3d',
  },
  'sim-c06-ch01-a01-sources-of-food': {
    color: '#4ade80',
    classLevels: [6],
    topic: 'Food: Where does It come from?',
    archetype: 'sortingBoard',
  },
  'sim-c05-ch07-a03-soluble-and-insoluble-substances': {
    color: '#67e8f9',
    classLevels: [5],
    topic: 'Experiments with Water',
    archetype: 'experimentBench',
  },
  'sim-c05-ch03-a02-introduction-of-digestive-system': {
    color: '#fb7185',
    classLevels: [5],
    topic: 'From Tasting to Digesting',
    archetype: 'immersive VR',
  },
  'sim-c07-ch10-a02-the-breathing-process-in-human': {
    color: '#38bdf8',
    classLevels: [7],
    topic: 'Respiration in Organisms',
    archetype: 'interactive 3D',
  },
  'sim-c08-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape': {
    color: '#4ade80',
    classLevels: [8],
    topic: 'Force and Pressure',
    archetype: 'interactive 3D',
  },
  'sim-c10-ch02-a01-introduction-to-acids-and-bases-and-litmus-test': {
    color: '#22c55e',
    classLevels: [10],
    topic: 'Acids, Bases and Salts',
    archetype: 'experiment bench',
  },
  'sim-c1-art-a01-learning-of-colours': {
    color: '#f472b6',
    classLevels: [1],
    topic: 'Learning of colours',
    archetype: 'immersive VR',
  },
  'sim-c1-math-ch01-introduction-to-money': {
    color: '#f59e0b',
    classLevels: [1],
    topic: 'Money values and shopping',
    archetype: 'interactive 3D',
  },
  'sim-c2-english-ch01-prepositions': {
    color: '#22c55e',
    classLevels: [2],
    topic: 'Position words',
    archetype: 'immersive VR',
  },
  'sim-c8-10-science-solar-system': {
    color: '#60a5fa',
    classLevels: [8, 9, 10],
    topic: 'Stars and the Solar System',
    archetype: 'immersive VR',
  },
};

const DEFAULT_PRESENTATION_BY_FORMAT: Readonly<Record<
  SimulationFormat,
  Readonly<Pick<SimulationPresentationOverlay, 'color' | 'archetype'>>
>> = deepFreeze({
  immersiveVr: { color: '#a78bfa', archetype: 'immersive VR' },
  threeSixtyVr: { color: '#818cf8', archetype: '360-degree VR' },
  interactive3d: { color: '#38bdf8', archetype: 'interactive 3D' },
  guidedVisualization: { color: '#2dd4bf', archetype: 'guided visualization' },
  practicalLabSimulation: { color: '#67e8f9', archetype: 'practical lab simulation' },
  virtualFieldVisit: { color: '#34d399', archetype: 'virtual field visit' },
  revisionMode: { color: '#fbbf24', archetype: 'revision mode' },
});

/**
 * Supplies a complete, deterministic presentation layer for every canonical
 * simulation definition. Product-specific overrides remain possible, while a
 * newly released class no longer requires a second hand-maintained allowlist
 * before it can appear in the catalogue.
 */
export function deriveSimulationPresentationOverlay(
  definition: ImplementedSimulationDefinition,
): SimulationPresentationOverlay {
  const { module } = definition;
  const formatPresentation = DEFAULT_PRESENTATION_BY_FORMAT[module.simulationFormat];
  return {
    color: formatPresentation.color,
    topic: module.title,
    archetype: formatPresentation.archetype,
    classLevels: classLevelsForSimulation(module),
  };
}

export const SIMULATION_PRESENTATION_OVERLAYS: Readonly<Record<
  string,
  Readonly<SimulationPresentationOverlay>
>> = deepFreeze(Object.fromEntries(
  RELEASED_SIMULATIONS.map(definition => [
    definition.module.id,
    AUTHORED_SIMULATION_PRESENTATION_OVERRIDES[definition.module.id]
      ?? deriveSimulationPresentationOverlay(definition),
  ]),
));

export function assertSimulationPresentationOverlayIntegrity(
  overlays: Readonly<Record<string, SimulationPresentationOverlay>>,
  definitions: readonly ImplementedSimulationDefinition[] = RELEASED_SIMULATIONS,
): void {
  const releasedIds = new Set(definitions.map(({ module }) => module.id));
  for (const id of releasedIds) {
    if (!overlays[id]) throw new Error(`Missing overlay for released simulation "${id}"`);
  }
  for (const [id, overlay] of Object.entries(overlays)) {
    if (!releasedIds.has(id)) throw new Error(`Unrecognized overlay for simulation "${id}"`);
    if (
      !overlay.color.trim()
      || !overlay.topic.trim()
      || !overlay.archetype.trim()
    ) {
      throw new Error(`Overlay "${id}" requires color, topic, and archetype`);
    }
    if (
      overlay.classLevels.length === 0
      || overlay.classLevels.some(
        classLevel => !Number.isInteger(classLevel) || classLevel < 1 || classLevel > 12,
      )
    ) {
      throw new Error(`Overlay "${id}" requires valid class levels`);
    }
  }
}

assertSimulationPresentationOverlayIntegrity(SIMULATION_PRESENTATION_OVERLAYS);

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

export function isImplementedSimulationSlug(slug: string): slug is ImplementedSlug {
  return implementedSet.has(slug);
}

function toCataloguedCard(item: ScienceSimulationCatalogItem): CatalogCard {
  return {
    slug: item.slug,
    color: COLORS[item.primaryArchetype] ?? '#38bdf8',
    subject: item.subject,
    subjectTags: [item.subject],
    grade: `Class ${item.classLevel}`,
    classLevels: [item.classLevel],
    title: item.title,
    topic: item.topic,
    archetype: item.primaryArchetype,
    minutes: item.expectedDurationMinutes,
    releaseMaturity: item.releaseMaturity,
  };
}

function gradeLabel(classLevels: readonly number[]): string {
  const ordered = [...classLevels].sort((a, b) => a - b);
  if (ordered.length === 1) return `Class ${ordered[0]}`;
  return `Class ${ordered[0]}-${ordered[ordered.length - 1]}`;
}

function toImplementedCard(
  definition: ImplementedSimulationDefinition,
): CatalogCard {
  const { module } = definition;
  const overlay = SIMULATION_PRESENTATION_OVERLAYS[module.id];
  return {
    slug: module.slug,
    title: module.title,
    topic: overlay.topic,
    subject: module.subjects.join(', '),
    subjectTags: [...module.subjects],
    grade: gradeLabel(overlay.classLevels),
    classLevels: [...overlay.classLevels],
    archetype: overlay.archetype,
    minutes: module.expectedDurationMinutes,
    color: overlay.color,
    releaseMaturity: module.releaseMaturity,
    href: routeForSimulation(definition),
  };
}

export function getSimulationCatalogSections(catalog: readonly ScienceSimulationCatalogItem[]) {
  const launchable = RELEASED_SIMULATIONS.map(toImplementedCard);
  const catalogued = catalog
    .filter(item => !implementedSet.has(item.slug))
    .map(toCataloguedCard);

  return {
    launchable,
    catalogued,
  };
}

export interface CatalogCardFilters {
  classLevel?: number;
  subject?: string;
  releaseMaturity?: string;
}

/** Matches a card against the class/subject/release-maturity filter controls
 * without falling back to free-text curriculum search. */
export function matchesCatalogFilters(card: CatalogCard, filters: CatalogCardFilters): boolean {
  if (filters.classLevel !== undefined && !card.classLevels.includes(filters.classLevel)) return false;
  if (filters.subject !== undefined && !card.subjectTags.includes(filters.subject)) return false;
  if (filters.releaseMaturity !== undefined && card.releaseMaturity !== filters.releaseMaturity) return false;
  return true;
}
