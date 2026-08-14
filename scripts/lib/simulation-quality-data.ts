import type { ImplementedSimulationDefinition } from '@xr-school/simulation-schema';

import { PR8_CONTRIBUTIONS, PR8_HEAD } from './pr8-quality-evidence';

export const QUALITY_WEIGHTS = Object.freeze({
  education: 20,
  integrity: 15,
  interactivity: 15,
  visuals: 15,
  audio: 10,
  usability: 10,
  stability: 10,
  deployment: 5,
} as const);

export type QualityDimension = keyof typeof QUALITY_WEIGHTS;
export type QualityScores = Record<QualityDimension, number>;

export interface EvidenceReference {
  id: string;
  kind:
    | 'git'
    | 'source'
    | 'test'
    | 'build'
    | 'browser'
    | 'asset'
    | 'narration'
    | 'deployment';
  ref: string;
  finding: string;
  dimensions?: QualityDimension[];
}

export function qualityTotal(scores: QualityScores): number {
  return Object.values(scores).reduce((sum, value) => sum + value, 0);
}

export function qualityBand(total: number): string {
  if (total >= 85) return 'Pilot candidate';
  if (total >= 70) return 'Promising internal QA';
  if (total >= 55) return 'Needs focused improvement';
  return 'Rebuild before pilot';
}

const DIMENSIONS = Object.keys(QUALITY_WEIGHTS) as QualityDimension[];
const UNSUPPORTED_INTERNAL_QA_CLAIMS =
  /quest verified|classroom validated|school proven|learning outcomes improved/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(hasText);
}

function stableUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function validateExactSet(
  label: string,
  actual: readonly string[],
  expected: readonly string[],
  errors: string[],
): void {
  const duplicates = actual.filter((value, index) => actual.indexOf(value) !== index);
  if (duplicates.length > 0) {
    errors.push(`${label}: duplicate values ${stableUnique(duplicates).join(', ')}`);
  }
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter(value => !actualSet.has(value));
  const extra = actual.filter(value => !expectedSet.has(value));
  if (missing.length > 0) errors.push(`${label}: missing ${stableUnique(missing).join(', ')}`);
  if (extra.length > 0) errors.push(`${label}: unexpected ${stableUnique(extra).join(', ')}`);
}

function validateScores(value: unknown, path: string, errors: string[]): QualityScores | undefined {
  if (!isRecord(value)) {
    errors.push(`${path}: required`);
    return undefined;
  }
  const keys = Object.keys(value);
  validateExactSet(`${path} dimensions`, keys, DIMENSIONS, errors);
  for (const dimension of DIMENSIONS) {
    const score = value[dimension];
    if (!Number.isInteger(score) || (score as number) < 0 || (score as number) > QUALITY_WEIGHTS[dimension]) {
      errors.push(
        `${path}.${dimension}: expected an integer from 0 to ${QUALITY_WEIGHTS[dimension]}`,
      );
    }
  }
  return value as QualityScores;
}

function validateReferences(
  value: unknown,
  path: string,
  errors: string[],
): EvidenceReference[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path}: at least one evidence reference is required`);
    return [];
  }
  const references: EvidenceReference[] = [];
  const ids: string[] = [];
  const validKinds = new Set([
    'git', 'source', 'test', 'build', 'browser', 'asset', 'narration', 'deployment',
  ]);
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${itemPath}: expected an object`);
      return;
    }
    for (const field of ['id', 'ref', 'finding'] as const) {
      if (!hasText(item[field])) errors.push(`${itemPath}.${field}: required`);
    }
    if (!validKinds.has(String(item.kind))) {
      errors.push(`${itemPath}.kind: unsupported evidence kind`);
    }
    if (item.dimensions !== undefined) {
      if (!Array.isArray(item.dimensions) || item.dimensions.length === 0) {
        errors.push(`${itemPath}.dimensions: expected at least one dimension`);
      } else {
        for (const dimension of item.dimensions) {
          if (!DIMENSIONS.includes(dimension as QualityDimension)) {
            errors.push(`${itemPath}.dimensions: unsupported dimension ${String(dimension)}`);
          }
        }
      }
    }
    if (hasText(item.id)) ids.push(item.id);
    references.push(item as unknown as EvidenceReference);
  });
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    errors.push(`${path}: duplicate evidence IDs ${stableUnique(duplicates).join(', ')}`);
  }
  return references;
}

function routeFor(definition: ImplementedSimulationDefinition): string {
  return `/simulations/${definition.module.slug}`;
}

function validateRegistry(
  definitions: readonly ImplementedSimulationDefinition[],
  errors: string[],
): ImplementedSimulationDefinition[] {
  const released = definitions.filter(
    definition => definition.module.publicationStatus === 'released',
  );
  if (released.length !== 36) {
    errors.push(`registry: expected exactly 36 released simulations, received ${released.length}`);
  }
  const slugs = released.map(definition => definition.module.slug);
  const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
  if (duplicates.length > 0) {
    errors.push(`registry: duplicate canonical slugs ${stableUnique(duplicates).join(', ')}`);
  }
  return released;
}

function validateIdentity(
  value: Record<string, unknown>,
  definition: ImplementedSimulationDefinition,
  path: string,
  errors: string[],
): void {
  const expected: Record<string, unknown> = {
    title: definition.module.title,
    route: routeFor(definition),
    publicationStatus: definition.module.publicationStatus,
    evidenceMaturity: definition.module.evidenceMaturity,
  };
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (value[field] !== expectedValue) {
      errors.push(
        `${path}.${field}: expected ${JSON.stringify(expectedValue)}, received ${JSON.stringify(value[field])}`,
      );
    }
  }
  const expectedLegacy = [...new Set([
    ...(definition.module.legacyAliases ?? []).map(alias => `/simulations/${alias}`),
    ...definition.legacyPaths,
  ])].sort();
  const actualLegacy = isStringArray(value.legacyPaths) ? [...value.legacyPaths].sort() : [];
  if (!isStringArray(value.legacyPaths)) {
    errors.push(`${path}.legacyPaths: expected a string array`);
  } else if (JSON.stringify(actualLegacy) !== JSON.stringify(expectedLegacy)) {
    errors.push(`${path}.legacyPaths: expected ${JSON.stringify(expectedLegacy)}`);
  }
}

function numberAt(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export interface ValidatePortfolioDataInput {
  definitions: readonly ImplementedSimulationDefinition[];
  cards: unknown;
  evidence: unknown;
}

export function validatePortfolioData({
  definitions,
  cards,
  evidence,
}: ValidatePortfolioDataInput): string[] {
  const errors: string[] = [];
  const released = validateRegistry(definitions, errors);
  const expectedSlugs = released.map(definition => definition.module.slug);
  const definitionBySlug = new Map(
    released.map(definition => [definition.module.slug, definition]),
  );

  const cardRecords = Array.isArray(cards) ? cards : [];
  if (!Array.isArray(cards)) errors.push('cards: expected an array');
  const cardSlugs = cardRecords.map(card => isRecord(card) && hasText(card.slug) ? card.slug : '');
  if (cardRecords.length !== 36) {
    errors.push(`cards: expected exactly 36 records, received ${cardRecords.length}`);
  }
  validateExactSet('cards canonical slugs', cardSlugs, expectedSlugs, errors);

  const evidenceRoot = isRecord(evidence) ? evidence : {};
  if (!isRecord(evidence)) errors.push('evidence: expected an object');
  if (evidenceRoot.auditDate !== '2026-08-01') {
    errors.push('evidence.auditDate: expected 2026-08-01');
  }
  const portfolio = isRecord(evidenceRoot.portfolio) ? evidenceRoot.portfolio : {};
  if (!isRecord(evidenceRoot.portfolio)) errors.push('evidence.portfolio: required');
  const evidenceRecords = Array.isArray(evidenceRoot.simulations)
    ? evidenceRoot.simulations
    : [];
  if (!Array.isArray(evidenceRoot.simulations)) {
    errors.push('evidence.simulations: expected an array');
  }
  const evidenceSlugs = evidenceRecords.map(record => isRecord(record) && hasText(record.slug) ? record.slug : '');
  if (evidenceRecords.length !== 36) {
    errors.push(`evidence.simulations: expected exactly 36 records, received ${evidenceRecords.length}`);
  }
  validateExactSet('evidence canonical slugs', evidenceSlugs, expectedSlugs, errors);

  const evidenceBySlug = new Map<string, Record<string, unknown>>();
  evidenceRecords.forEach((record, index) => {
    const path = `evidence.simulations[${index}]`;
    if (!isRecord(record) || !hasText(record.slug)) {
      errors.push(`${path}.slug: required`);
      return;
    }
    evidenceBySlug.set(record.slug, record);
    const definition = definitionBySlug.get(record.slug);
    if (!definition) return;
    validateIdentity(record, definition, path, errors);
    if (record.kind !== definition.kind) {
      errors.push(`${path}.kind: expected ${definition.kind}`);
    }
    if (record.contribution !== definition.contribution.source) {
      errors.push(`${path}.contribution: expected ${definition.contribution.source}`);
    }
    const counts = isRecord(record.counts) ? record.counts : {};
    if (!isRecord(record.counts)) errors.push(`${path}.counts: required`);
    const expectedCounts = {
      stages: definition.experience.stages.length,
      actions: definition.experience.stages.reduce(
        (sum, stage) => sum + stage.requiredActionIds.length,
        0,
      ),
      evidence: definition.experience.stages.reduce(
        (sum, stage) => sum + stage.completionEvidenceIds.length,
        0,
      ),
      assessmentPrompts: definition.assessment.prompts.length,
    };
    for (const [field, expected] of Object.entries(expectedCounts)) {
      if (counts[field] !== expected) {
        errors.push(`${path}.counts.${field}: expected ${expected}`);
      }
    }
    const narration = isRecord(record.narration) ? record.narration : {};
    if (!isRecord(record.narration)) errors.push(`${path}.narration: required`);
    const packagedCues = definition.narration.cues.filter(cue => cue.audioUrl).length;
    const expectedNarration = {
      cues: definition.narration.cues.length,
      captions: definition.narration.cues.filter(cue => cue.caption.trim()).length,
      packagedAudio: packagedCues,
      missingFiles: 0,
      hashValidated: packagedCues,
      fallback: definition.narration.fallback,
    };
    for (const [field, expected] of Object.entries(expectedNarration)) {
      if (narration[field] !== expected) {
        errors.push(`${path}.narration.${field}: expected ${JSON.stringify(expected)}`);
      }
    }
    const assets = isRecord(record.assets) ? record.assets : {};
    if (!isRecord(record.assets)) errors.push(`${path}.assets: required`);
    if (assets.count !== definition.assets.assets.length) {
      errors.push(`${path}.assets.count: expected ${definition.assets.assets.length}`);
    }
    const provenanceComplete = definition.assets.assets.every(asset =>
      [asset.source, asset.author, asset.license].every(hasText)
      && ![asset.source, asset.author, asset.license].some(value =>
        /unknown|unverified|undocumented/i.test(value),
      ),
    );
    if (assets.provenanceComplete !== provenanceComplete) {
      errors.push(`${path}.assets.provenanceComplete: expected ${provenanceComplete}`);
    }
    if (assets.pathValidated !== true || assets.hashValidated !== true) {
      errors.push(`${path}.assets: pathValidated and hashValidated must be true`);
    }
    if (!hasText(assets.fallback)) errors.push(`${path}.assets.fallback: required`);
    if (!Array.isArray(record.tests) || record.tests.length === 0 || !record.tests.every(hasText)) {
      errors.push(`${path}.tests: at least one test evidence ID is required`);
    }
    if (!hasText(record.lastVerifiedCommand)) {
      errors.push(`${path}.lastVerifiedCommand: required`);
    }
    if (!isRecord(record.browserEvidence) || !hasText(record.browserEvidence.status) || !hasText(record.browserEvidence.finding)) {
      errors.push(`${path}.browserEvidence: status and finding are required`);
    }
    if (record.questDeviceEvidence !== 'not-run') {
      errors.push(`${path}.questDeviceEvidence: expected not-run`);
    }
    if (record.classroomEvidence !== 'not-run') {
      errors.push(`${path}.classroomEvidence: expected not-run`);
    }
    validateReferences(record.references, `${path}.references`, errors);
  });

  cardRecords.forEach((card, index) => {
    const path = `cards[${index}]`;
    if (!isRecord(card) || !hasText(card.slug)) {
      errors.push(`${path}.slug: required`);
      return;
    }
    const definition = definitionBySlug.get(card.slug);
    if (!definition) return;
    validateIdentity(card, definition, path, errors);
    const scores = validateScores(card.scores, `${path}.scores`, errors);
    if ('total' in card) errors.push(`${path}.total: totals must be computed, not stored`);
    for (const field of ['summary', 'action', 'grade', 'subject', 'evidenceConfidence'] as const) {
      if (!hasText(card[field])) errors.push(`${path}.${field}: required`);
    }
    for (const field of ['strengths', 'risks'] as const) {
      if (!isStringArray(card[field]) || card[field].length !== 3) {
        errors.push(`${path}.${field}: expected exactly three non-empty entries`);
      }
    }
    if (
      definition.module.evidenceMaturity === 'internalQA'
      && UNSUPPORTED_INTERNAL_QA_CLAIMS.test(JSON.stringify(card))
    ) {
      errors.push(`${path}: contains an unsupported internal-QA evidence claim`);
    }
    const dimensionEvidence = isRecord(card.dimensionEvidence)
      ? card.dimensionEvidence
      : {};
    if (!isRecord(card.dimensionEvidence)) {
      errors.push(`${path}.dimensionEvidence: required`);
    }
    const evidenceRecord = evidenceBySlug.get(card.slug);
    const referenceIds = new Set(
      Array.isArray(evidenceRecord?.references)
        ? evidenceRecord.references
          .filter(isRecord)
          .map(reference => reference.id)
          .filter(hasText)
        : [],
    );
    if (scores) {
      for (const dimension of DIMENSIONS) {
        const ids = dimensionEvidence[dimension];
        if (scores[dimension] > 0 && (!isStringArray(ids) || ids.length === 0)) {
          errors.push(`${path}.dimensionEvidence.${dimension}: required for a non-zero score`);
          continue;
        }
        if (isStringArray(ids)) {
          for (const id of ids) {
            if (!referenceIds.has(id)) {
              errors.push(`${path}.dimensionEvidence.${dimension}: unknown evidence ID ${id}`);
            }
          }
        }
      }
    }
  });

  const narrationCues = evidenceRecords.reduce((sum, record) =>
    sum + (isRecord(record) && isRecord(record.narration) ? numberAt(record.narration.cues) : 0), 0);
  const packagedNarrationClips = evidenceRecords.reduce((sum, record) =>
    sum + (isRecord(record) && isRecord(record.narration) ? numberAt(record.narration.packagedAudio) : 0), 0);
  const missingNarrationFiles = evidenceRecords.reduce((sum, record) =>
    sum + (isRecord(record) && isRecord(record.narration) ? numberAt(record.narration.missingFiles) : 0), 0);
  const assets = evidenceRecords.reduce((sum, record) =>
    sum + (isRecord(record) && isRecord(record.assets) ? numberAt(record.assets.count) : 0), 0);
  const expectedPortfolio: Record<string, unknown> = {
    publiclyLaunchableSimulations: 36,
    evidenceMaturityDistribution: {
      internalQA: 36,
      deviceVerified: 0,
      classroomVerified: 0,
    },
    narrationCues,
    packagedNarrationClips,
    missingNarrationFiles,
    assets,
    signedQuestAcceptanceRuns: 0,
    classroomStudies: 0,
  };
  for (const [field, expected] of Object.entries(expectedPortfolio)) {
    if (JSON.stringify(portfolio[field]) !== JSON.stringify(expected)) {
      errors.push(`evidence.portfolio.${field}: expected ${JSON.stringify(expected)}`);
    }
  }

  return errors;
}

export interface ValidateBeforeAfterScorecardInput {
  definitions: readonly ImplementedSimulationDefinition[];
  scorecard: unknown;
}

function dimensionsFor(reference: EvidenceReference): QualityDimension[] {
  return Array.isArray(reference.dimensions)
    ? reference.dimensions.filter(dimension => DIMENSIONS.includes(dimension))
    : [];
}

export function validateBeforeAfterScorecard({
  definitions,
  scorecard,
}: ValidateBeforeAfterScorecardInput): string[] {
  const errors: string[] = [];
  const released = validateRegistry(definitions, errors);
  const definitionBySlug = new Map(
    released.map(definition => [definition.module.slug, definition]),
  );
  const root = isRecord(scorecard) ? scorecard : {};
  if (!isRecord(scorecard)) errors.push('scorecard: expected an object');
  if (root.pr !== 8) errors.push('scorecard.pr: expected 8');
  if (root.headSha !== PR8_HEAD) errors.push(`scorecard.headSha: expected ${PR8_HEAD}`);
  if (root.contributor !== 'GitHub @Adityakrpand') {
    errors.push('scorecard.contributor: expected GitHub @Adityakrpand');
  }
  const comparisons = Array.isArray(root.comparisons) ? root.comparisons : [];
  if (!Array.isArray(root.comparisons)) errors.push('scorecard.comparisons: expected an array');
  if (comparisons.length !== 23) {
    errors.push(`scorecard.comparisons: expected exactly 23 records, received ${comparisons.length}`);
  }
  const comparisonSlugs = comparisons.map(comparison =>
    isRecord(comparison) && hasText(comparison.prSlug) ? comparison.prSlug : '',
  );
  validateExactSet(
    'scorecard PR slugs',
    comparisonSlugs,
    PR8_CONTRIBUTIONS.map(contribution => contribution.prSlug),
    errors,
  );

  comparisons.forEach((comparison, index) => {
    const path = `scorecard.comparisons[${index}]`;
    if (!isRecord(comparison) || !hasText(comparison.prSlug)) {
      errors.push(`${path}.prSlug: required`);
      return;
    }
    const expected = PR8_CONTRIBUTIONS.find(item => item.prSlug === comparison.prSlug);
    if (!expected) return;
    if (comparison.canonicalSlug !== expected.canonicalSlug) {
      errors.push(`${path}.canonicalSlug: expected ${expected.canonicalSlug}`);
    }
    if (comparison.integration !== expected.integration) {
      errors.push(`${path}.integration: expected ${expected.integration}`);
    }
    if (comparison.contributor !== 'GitHub @Adityakrpand') {
      errors.push(`${path}.contributor: expected GitHub @Adityakrpand`);
    }
    const definition = definitionBySlug.get(expected.canonicalSlug);
    if (!definition) {
      errors.push(`${path}.canonicalSlug: not found in the 36-class registry`);
      return;
    }
    if (definition.contribution.source !== 'pr-8') {
      errors.push(`${path}.canonicalSlug: registry contribution must be pr-8`);
    }
    const baseline = isRecord(comparison.baseline) ? comparison.baseline : {};
    const post = isRecord(comparison.postIntegration) ? comparison.postIntegration : {};
    if (!isRecord(comparison.baseline)) errors.push(`${path}.baseline: required`);
    if (!isRecord(comparison.postIntegration)) errors.push(`${path}.postIntegration: required`);
    if (baseline.sourceRevision !== PR8_HEAD) {
      errors.push(`${path}.baseline.sourceRevision: expected ${PR8_HEAD}`);
    }
    const baselineScores = validateScores(baseline.scores, `${path}.baseline.scores`, errors);
    const postScores = validateScores(post.scores, `${path}.postIntegration.scores`, errors);
    for (const field of ['strengths'] as const) {
      if (!isStringArray(baseline[field]) || baseline[field].length !== 3) {
        errors.push(`${path}.baseline.${field}: expected exactly three entries`);
      }
    }
    if (!isStringArray(baseline.defects) || baseline.defects.length === 0) {
      errors.push(`${path}.baseline.defects: at least one defect is required`);
    }
    if (!isStringArray(post.remediation) || post.remediation.length === 0) {
      errors.push(`${path}.postIntegration.remediation: required`);
    }
    if (!isStringArray(post.remainingRisks) || post.remainingRisks.length === 0) {
      errors.push(`${path}.postIntegration.remainingRisks: required`);
    }
    if (!hasText(post.nextAction)) errors.push(`${path}.postIntegration.nextAction: required`);

    const baselineRefs = validateReferences(
      baseline.evidence,
      `${path}.baseline.evidence`,
      errors,
    );
    const postRefs = validateReferences(
      post.evidence,
      `${path}.postIntegration.evidence`,
      errors,
    );
    for (const dimension of DIMENSIONS) {
      const gitEvidence = baselineRefs.some(reference =>
        reference.kind === 'git'
        && reference.ref.startsWith(`git:${PR8_HEAD}:`)
        && dimensionsFor(reference).includes(dimension),
      );
      if (!gitEvidence) {
        errors.push(`${path}.baseline.evidence: missing immutable git evidence for ${dimension}`);
      }
    }
    if (baselineScores && postScores) {
      for (const dimension of DIMENSIONS) {
        if (postScores[dimension] <= baselineScores[dimension]) continue;
        const dimensionRefs = postRefs.filter(reference =>
          dimensionsFor(reference).includes(dimension),
        );
        if (!dimensionRefs.some(reference => reference.kind === 'source')) {
          errors.push(`${path}.postIntegration.evidence: ${dimension} increase needs remediated source evidence`);
        }
        if (!dimensionRefs.some(reference =>
          ['test', 'build', 'asset', 'narration', 'browser', 'deployment'].includes(reference.kind),
        )) {
          errors.push(`${path}.postIntegration.evidence: ${dimension} increase needs passing corroboration`);
        }
      }
      if (postScores.deployment > 3) {
        errors.push(`${path}.postIntegration.scores.deployment: capped at 3 without direct Quest acceptance`);
      }
      if (postScores.usability > 8) {
        errors.push(`${path}.postIntegration.scores.usability: capped at 8 without direct Quest acceptance`);
      }
      if (postScores.stability > 8) {
        errors.push(`${path}.postIntegration.scores.stability: capped at 8 without direct Quest acceptance`);
      }
      const packagedAudio = definition.narration.cues.filter(cue => cue.audioUrl).length;
      if (packagedAudio === 0 && postScores.audio > 4) {
        errors.push(`${path}.postIntegration.scores.audio: browser TTS is capped at 4`);
      }
      if (packagedAudio > 0 && postScores.audio > 8) {
        errors.push(`${path}.postIntegration.scores.audio: packaged audio is capped at 8 without listener/device evidence`);
      }
      const completeProvenance = definition.assets.assets.every(asset =>
        [asset.source, asset.author, asset.license].every(hasText)
        && ![asset.source, asset.author, asset.license].some(value =>
          /unknown|unverified|undocumented/i.test(value),
        ),
      );
      if (!completeProvenance && postScores.visuals > 9) {
        errors.push(`${path}.postIntegration.scores.visuals: incomplete provenance is capped at 9`);
      }
      if (postScores.visuals === QUALITY_WEIGHTS.visuals) {
        errors.push(`${path}.postIntegration.scores.visuals: full marks require device acceptance`);
      }
    }
  });

  const newClasses = comparisons.filter(
    comparison => isRecord(comparison) && comparison.integration === 'new-class',
  ).length;
  const enhancements = comparisons.filter(
    comparison => isRecord(comparison) && comparison.integration === 'existing-enhancement',
  ).length;
  if (newClasses !== 22 || enhancements !== 1) {
    errors.push(`scorecard: expected 22 new classes and 1 enhancement, received ${newClasses} and ${enhancements}`);
  }
  const solubility = comparisons.filter(comparison =>
    isRecord(comparison)
    && comparison.canonicalSlug === 'c5-ch07-a03-soluble-and-insoluble-substances',
  );
  if (solubility.length !== 1 || !isRecord(solubility[0]) || solubility[0].integration !== 'existing-enhancement') {
    errors.push('scorecard: Solubility must appear exactly once as an existing enhancement');
  }

  return errors;
}
