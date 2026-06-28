import type {
  CurriculumSearchDocument,
  ReleaseMaturity,
  Subject,
} from '../../../packages/simulation-schema/src/index';

export type CurriculumSearchFilters = {
  classLevel?: number;
  subject?: Subject;
  releaseMaturity?: ReleaseMaturity;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchesFilters(
  document: CurriculumSearchDocument,
  filters: CurriculumSearchFilters,
) {
  if (filters.classLevel && !document.classLevels.includes(filters.classLevel)) return false;
  if (filters.subject && !document.subjects.includes(filters.subject)) return false;
  if (filters.releaseMaturity && document.releaseMaturity !== filters.releaseMaturity) return false;
  return true;
}

function scoreDocument(document: CurriculumSearchDocument, query: string) {
  if (!query) return document.kind === 'simulation' ? 20 : 10;

  const title = normalize(document.title);
  const summary = normalize(document.summary);
  const queryTokens = query.split(' ').filter(Boolean);
  const documentTokens = new Set(document.tokens.map(normalize));

  if (title === query) return 1_000;
  if (title.startsWith(query)) return 800;
  if (queryTokens.every(token => documentTokens.has(token))) return 600;
  if (title.includes(query)) return 500;
  if (summary.includes(query)) return 350;

  const matchingTokens = queryTokens.filter(token =>
    documentTokens.has(token)
    || [...documentTokens].some(candidate => candidate.startsWith(token)),
  ).length;

  if (matchingTokens === queryTokens.length) return 250 + matchingTokens;
  if (matchingTokens > 0) return 100 + matchingTokens;
  return 0;
}

const KIND_PRIORITY: Record<CurriculumSearchDocument['kind'], number> = {
  concept: 4,
  simulation: 3,
  chapter: 2,
  course: 1,
};

export function searchCurriculum(
  documents: readonly CurriculumSearchDocument[],
  rawQuery: string,
  filters: CurriculumSearchFilters = {},
) {
  const query = normalize(rawQuery);

  return documents
    .filter(document => matchesFilters(document, filters))
    .map(document => ({ document, score: scoreDocument(document, query) }))
    .filter(result => !query || result.score > 0)
    .sort((left, right) =>
      right.score - left.score
      || KIND_PRIORITY[right.document.kind] - KIND_PRIORITY[left.document.kind]
      || left.document.title.localeCompare(right.document.title),
    )
    .map(result => result.document);
}
