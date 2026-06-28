export const VALID_GRADE_BANDS = [
  'kindergarten',
  'class1To2',
  'class3To5',
  'class6To8',
  'class9To10',
  'class11To12',
] as const;

export const VALID_SUBJECTS = [
  'science',
  'physics',
  'chemistry',
  'biology',
  'mathematics',
  'geography',
  'history',
  'environmentalScience',
  'computerScience',
  'vocationalSkills',
  'careerExposure',
] as const;

export const VALID_SIMULATION_FORMATS = [
  'immersiveVr',
  'threeSixtyVr',
  'interactive3d',
  'guidedVisualization',
  'practicalLabSimulation',
  'virtualFieldVisit',
  'revisionMode',
] as const;

export const VALID_XR_FIT_TYPES = [
  'strongVrFit',
  'arTabletFit',
  'normalClassroomBetter',
  'physicalLabBetter',
  'notWorthXr',
] as const;

export const FORBIDDEN_RELEASE_XR_FIT_TYPES = [
  'normalClassroomBetter',
  'physicalLabBetter',
  'notWorthXr',
] as const;

export const VALID_COMFORT_RISK_LEVELS = ['low', 'medium', 'high'] as const;

export const VALID_SIMULATION_ARCHETYPES = [
  'guidedTour',
  'modelInspection',
  'processTimeline',
  'experimentBench',
  'sortingBoard',
  'measurementGraph',
  'systemMap',
  'scenario',
] as const;

export type GradeBand = (typeof VALID_GRADE_BANDS)[number];
export type Subject = (typeof VALID_SUBJECTS)[number];
export type SimulationFormat = (typeof VALID_SIMULATION_FORMATS)[number];
export type XrFitType = (typeof VALID_XR_FIT_TYPES)[number];
export type ComfortRiskLevel = (typeof VALID_COMFORT_RISK_LEVELS)[number];
export type SimulationArchetype = (typeof VALID_SIMULATION_ARCHETYPES)[number];

export interface ScienceCatalogRow {
  simulationId: string;
  slug: string;
  class: number;
  gradeBand: GradeBand;
  chapter: number;
  topic: string;
  activityNumber: number;
  activityTitle: string;
  subject: Subject;
  primaryArchetype: SimulationArchetype;
  secondaryArchetypes: SimulationArchetype[];
  simulationFormat: SimulationFormat;
  xrFitType: XrFitType;
  comfortRiskLevel: ComfortRiskLevel;
  expectedDurationMinutes: number;
  packageSizeTargetMb: number;
  reuseGroup: string;
  implementationNotes: string;
}

export interface SimulationModuleRecord {
  id: string;
  title: string;
  slug: string;
  summary: string;
  gradeBands: GradeBand[];
  subjects: Subject[];
  applicableBoards: ('cbse' | 'icse' | 'stateBoard')[];
  stateBoardStates?: string[];
  curriculumMapIds: string[];
  conceptIds: string[];
  simulationFormat: SimulationFormat;
  evidenceConfidenceLevel: 'experimental' | 'expertDesigned' | 'internallyPiloted' | 'schoolValidated' | 'researchBacked';
  xrFitType: XrFitType;
  xrFitJustification: string;
  learningObjective: string;
  scientificConceptExplanation: string;
  prerequisiteConceptIds?: string[];
  misconceptionsAddressed: string[];
  visualizationStrategy: string;
  interactionStrategy: string;
  imaginationHelperStrategy?: string;
  practicalUseCase?: string;
  cueCardIds: string[];
  revisionCardIds: string[];
  assessmentHookIds: string[];
  instructorScript: string;
  batchActivityPrompt: string;
  expectedDurationMinutes: number;
  maxSessionDurationMinutes: number;
  comfortRiskLevel: ComfortRiskLevel;
  safetyNotes: string[];
  offlineContentPackId?: string;
  estimatedPackageSizeMb: number;
  targetFrameRateFps: number;
  minQuestStorageGb: number;
  stages: number;
  status: 'draft' | 'approved' | 'released' | 'deprecated' | 'archived';
}

export function slugifyActivity(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSimulationId(classNumber: number, chapter: number, activityNumber: number, title: string) {
  return `sim-c${String(classNumber).padStart(2, '0')}-ch${String(chapter).padStart(2, '0')}-a${String(activityNumber).padStart(2, '0')}-${slugifyActivity(title)}`;
}

export function inferGradeBand(classNumber: number): GradeBand {
  if (classNumber <= 5) return 'class3To5';
  if (classNumber <= 8) return 'class6To8';
  return 'class9To10';
}

export function mapArchetypeToSimulationFormat(archetype: SimulationArchetype): SimulationFormat {
  switch (archetype) {
    case 'guidedTour':
      return 'virtualFieldVisit';
    case 'experimentBench':
      return 'practicalLabSimulation';
    case 'processTimeline':
    case 'systemMap':
    case 'scenario':
      return 'guidedVisualization';
    case 'modelInspection':
    case 'sortingBoard':
    case 'measurementGraph':
      return 'interactive3d';
  }
}

function isOneOf<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value);
}

export function validateCatalogRow(row: ScienceCatalogRow, index = 0) {
  const errors: string[] = [];
  const prefix = `${row.slug || `row-${index}`}:`;

  if (!row.simulationId.startsWith('sim-')) errors.push(`${prefix} simulationId must start with sim-`);
  if (!/^[a-z0-9-]+$/.test(row.slug)) errors.push(`${prefix} slug must be kebab-case`);
  if (row.class < 5 || row.class > 10) errors.push(`${prefix} class must be between 5 and 10`);
  if (!isOneOf(VALID_GRADE_BANDS, row.gradeBand)) errors.push(`${prefix} invalid gradeBand ${row.gradeBand}`);
  if (!isOneOf(VALID_SUBJECTS, row.subject)) errors.push(`${prefix} invalid subject ${row.subject}`);
  if (!isOneOf(VALID_SIMULATION_ARCHETYPES, row.primaryArchetype)) errors.push(`${prefix} invalid primaryArchetype ${row.primaryArchetype}`);
  if (!isOneOf(VALID_SIMULATION_FORMATS, row.simulationFormat)) errors.push(`${prefix} invalid simulationFormat ${row.simulationFormat}`);
  if (!isOneOf(VALID_XR_FIT_TYPES, row.xrFitType)) errors.push(`${prefix} invalid xrFitType ${row.xrFitType}`);
  if (FORBIDDEN_RELEASE_XR_FIT_TYPES.includes(row.xrFitType as (typeof FORBIDDEN_RELEASE_XR_FIT_TYPES)[number])) {
    errors.push(`${prefix} forbidden release xrFitType ${row.xrFitType}`);
  }
  if (!isOneOf(VALID_COMFORT_RISK_LEVELS, row.comfortRiskLevel)) errors.push(`${prefix} invalid comfortRiskLevel ${row.comfortRiskLevel}`);
  if (row.expectedDurationMinutes <= 0 || row.expectedDurationMinutes > 12) errors.push(`${prefix} expectedDurationMinutes must be 1-12`);
  if (row.packageSizeTargetMb <= 0) errors.push(`${prefix} packageSizeTargetMb must be positive`);

  return errors;
}

export function validateCatalog(catalog: ScienceCatalogRow[]) {
  const errors = catalog.flatMap((row, index) => validateCatalogRow(row, index));
  const slugs = new Set<string>();
  const ids = new Set<string>();

  for (const row of catalog) {
    if (slugs.has(row.slug)) errors.push(`${row.slug}: duplicate slug`);
    slugs.add(row.slug);
    if (ids.has(row.simulationId)) errors.push(`${row.simulationId}: duplicate simulationId`);
    ids.add(row.simulationId);
  }

  return errors;
}
