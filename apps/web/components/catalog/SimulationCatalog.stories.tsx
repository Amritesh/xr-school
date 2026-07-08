import type { CurriculumSearchDocument } from '../../../../packages/simulation-schema/src/index';
import SimulationCatalog from './SimulationCatalog';
import type { CatalogCard } from '@/lib/simulationAvailability';

const MOCK_DOCUMENTS: CurriculumSearchDocument[] = [
  {
    id: 'course:mock-science',
    kind: 'course',
    title: 'CBSE Class 7 Science',
    summary: 'A representative course used only for component documentation.',
    href: '#mock-course',
    classLevels: [7],
    subjects: ['science'],
    conceptIds: ['concept-mock'],
    tokens: ['cbse', 'class', '7', 'science'],
  },
  {
    id: 'simulation:mock-pollination',
    kind: 'simulation',
    title: 'Pollination Learning Journey',
    summary: 'A static mock simulation record for the interactive search story.',
    href: '#mock-simulation',
    classLevels: [7],
    subjects: ['biology'],
    conceptIds: ['concept-mock'],
    releaseMaturity: 'internalQA',
    tokens: ['pollination', 'pollen', 'flower'],
  },
  {
    id: 'simulation:mock-digestive-system',
    kind: 'simulation',
    title: 'Introduction to the Digestive System',
    summary: 'A ten-stage Class 5 body journey used to document multiple launchable cards.',
    href: '#mock-digestive-system',
    classLevels: [5],
    subjects: ['environmentalScience', 'biology'],
    conceptIds: ['concept-mock-digestion'],
    releaseMaturity: 'internalQA',
    tokens: ['digestion', 'stomach', 'intestine'],
  },
];

const MOCK_LAUNCHABLE: CatalogCard[] = [
  {
    slug: 'mock-pollination',
    title: 'Pollination Learning Journey',
    topic: 'Reproduction in Plants',
    subject: 'biology',
    subjectTags: ['biology'],
    grade: 'Class 7',
    classLevels: [7],
    archetype: 'immersiveVr',
    minutes: 9,
    color: '#93dc9e',
    releaseMaturity: 'internalQA',
    href: '#mock-simulation',
  },
  {
    slug: 'mock-digestive-system',
    title: 'Introduction to the Digestive System',
    topic: 'From Tasting to Digesting',
    subject: 'environmentalScience, biology',
    subjectTags: ['environmentalScience', 'biology'],
    grade: 'Class 5',
    classLevels: [5],
    archetype: 'immersiveVr',
    minutes: 10,
    color: '#fb7185',
    releaseMaturity: 'internalQA',
    href: '#mock-digestive-system',
  },
];

const meta = {
  title: 'Catalog/SimulationCatalog',
  component: SimulationCatalog,
  parameters: {
    layout: 'fullscreen',
    a11y: {
      notes: 'Search has a programmatic label; filters use native labelled selects; release state is never communicated by colour alone. Header includes teacher setup and student join room links.',
    },
  },
};

export default meta;

export const Default = {
  args: {
    documents: MOCK_DOCUMENTS,
    launchableCards: MOCK_LAUNCHABLE,
    cataloguedCards: [],
  },
};

export const EmptyState = {
  args: {
    documents: [],
    launchableCards: [],
    cataloguedCards: [],
  },
};

export const LoadingState = {
  args: {
    documents: [],
    launchableCards: [],
    cataloguedCards: [],
    isLoading: true,
  },
};

export const ErrorState = {
  args: {
    documents: [],
    launchableCards: [],
    cataloguedCards: [],
    errorMessage: 'The static curriculum index could not be loaded.',
  },
};

export const Mobile = {
  ...Default,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const SearchInteraction = {
  ...Default,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) throw new Error('Search input is missing');
    input.focus();
    input.value = 'pollination';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  },
};
