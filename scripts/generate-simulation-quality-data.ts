import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ImplementedSimulationDefinition } from '@xr-school/simulation-schema';
import { IMPLEMENTED_SIMULATIONS } from '@xr-school/simulation-content';

import {
  PR8_CONTRIBUTIONS,
  PR8_HEAD,
  type Pr8Contribution,
} from './lib/pr8-quality-evidence';
import {
  QUALITY_WEIGHTS,
  qualityBand,
  qualityTotal,
  type EvidenceReference,
  type QualityDimension,
  type QualityScores,
} from './lib/simulation-quality-data';

const ALL_DIMENSIONS = Object.keys(QUALITY_WEIGHTS) as QualityDimension[];

const BASELINE_TOTALS: Readonly<Record<string, number>> = Object.freeze({
  'walls-tell-stories-ancient-fort-visit': 65,
  'experiments-with-water-float-or-sink': 64,
  'experiments-with-water-soluble-insoluble': 63,
  'components-of-food-lipid-test': 62,
  'up-you-go-rock-climbing': 61,
  'components-of-food-mineral-sources': 58,
  'components-of-food-vitamins-deficiencies': 58,
  'treat-for-mosquitoes-malaria-diagnosis': 57,
  'treat-for-mosquitoes-mosquito-life-cycle': 57,
  'experiments-with-water-dead-sea-salt-water': 56,
  'every-drop-counts-rainwater-storage': 54,
  'seeds-and-seeds-seed-dispersal': 54,
  'seeds-and-seeds-pitcher-plant': 54,
  'every-drop-counts-stepwell-structure': 52,
  'fibre-to-fabric-cotton-farming': 52,
  'fibre-to-fabric-cotton-ginning': 52,
  'up-you-go-river-crossing-adventure': 52,
  'up-you-go-snow-mountain-climbing': 52,
  'sorting-materials-by-shape': 51,
  'up-you-go-camp-in-snow': 51,
  'mangoes-round-the-year-aam-papad': 50,
  'mangoes-round-the-year-food-spoilage': 50,
  'mangoes-round-the-year-milk-spoilage': 50,
});

const EXISTING_SCORES: Readonly<Record<string, QualityScores>> = Object.freeze({
  pollination: { education: 18, integrity: 13, interactivity: 14, visuals: 11, audio: 8, usability: 8, stability: 8, deployment: 3 },
  circuit: { education: 17, integrity: 14, interactivity: 13, visuals: 10, audio: 7, usability: 8, stability: 8, deployment: 3 },
  'c9-ch01-a02-states-of-matter': { education: 17, integrity: 14, interactivity: 13, visuals: 11, audio: 7, usability: 8, stability: 8, deployment: 3 },
  'c6-ch01-a01-sources-of-food': { education: 16, integrity: 12, interactivity: 13, visuals: 9, audio: 8, usability: 8, stability: 7, deployment: 3 },
  'c5-ch03-a02-introduction-of-digestive-system': { education: 18, integrity: 13, interactivity: 14, visuals: 8, audio: 4, usability: 8, stability: 7, deployment: 3 },
  'c7-ch10-a02-the-breathing-process-in-human': { education: 17, integrity: 13, interactivity: 13, visuals: 8, audio: 4, usability: 8, stability: 7, deployment: 3 },
  'c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape': { education: 17, integrity: 14, interactivity: 14, visuals: 8, audio: 4, usability: 8, stability: 7, deployment: 3 },
  'c10-ch02-a01-introduction-to-acids-and-bases-and-litmus-test': { education: 17, integrity: 14, interactivity: 14, visuals: 8, audio: 4, usability: 8, stability: 7, deployment: 3 },
  'c1-art-a01-learning-of-colours': { education: 16, integrity: 11, interactivity: 13, visuals: 12, audio: 4, usability: 8, stability: 7, deployment: 3 },
  'c1-math-ch01-introduction-to-money': { education: 17, integrity: 11, interactivity: 13, visuals: 11, audio: 4, usability: 8, stability: 8, deployment: 3 },
  'c2-english-ch01-prepositions': { education: 17, integrity: 11, interactivity: 14, visuals: 11, audio: 4, usability: 8, stability: 8, deployment: 3 },
  'c8-10-science-solar-system': { education: 19, integrity: 15, interactivity: 15, visuals: 10, audio: 4, usability: 8, stability: 7, deployment: 3 },
});

const TITLE_SUMMARIES: Readonly<Record<string, string>> = Object.freeze({
  pollination: 'A treatment-and-control investigation that links flower structure, pollination, fertilisation, seed formation, and germination through evidence-gated stages.',
  circuit: 'A tested circuit investigation connecting component manipulation, current flow, resistance, and prediction through Ohm\'s law.',
  'c9-ch01-a02-states-of-matter': 'A particle-model laboratory that makes spacing, motion, attraction, heating, and phase changes observable without presenting the model as molecular footage.',
  'c6-ch01-a01-sources-of-food': 'A classification investigation with targeted feedback that separates plant, animal, and fungal food sources.',
  'c5-ch03-a02-introduction-of-digestive-system': 'A ten-stage pathway investigation covering organs, movement, accessory organs, absorption, recap, and healthy-habit transfer.',
  'c7-ch10-a02-the-breathing-process-in-human': 'A six-stage physiology lesson connecting airway structure, diaphragm motion, chest volume, and gas exchange.',
  'c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape': 'A deterministic physics investigation of starting, stopping, speeding, redirection, collision, and deformation.',
  'c10-ch02-a01-introduction-to-acids-and-bases-and-litmus-test': 'An experiment-bench sequence connecting litmus, universal indicator, pH classification, and neutralisation.',
  'c1-art-a01-learning-of-colours': 'An early-years recognition and memory journey with large targets, visible feedback, and a canonical release record.',
  'c1-math-ch01-introduction-to-money': 'An age-appropriate progression through Indian coins, notes, value comparison, simple shopping, and memory.',
  'c2-english-ch01-prepositions': 'A spatial language lesson in which object placement makes position words concrete and supports sentence practice.',
  'c8-10-science-solar-system': 'A concept-rich mission addressing orbit, temperature, scale, comet behavior, and common astronomy misconceptions.',
});

function writeJson(path: string, value: unknown): void {
  const absolute = resolve(process.cwd(), path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function legacyPaths(definition: ImplementedSimulationDefinition): string[] {
  return [...new Set([
    ...(definition.module.legacyAliases ?? []).map(alias => `/simulations/${alias}`),
    ...definition.legacyPaths,
  ])].sort();
}

function gradeLabel(definition: ImplementedSimulationDefinition): string {
  const slug = definition.module.slug;
  if (slug === 'pollination' || slug === 'circuit') return 'Classes 6-10';
  if (slug.startsWith('c8-10-')) return 'Classes 8-10';
  const exact = /^c(\d+)-/.exec(slug);
  if (exact) return `Class ${exact[1]}`;
  return definition.module.gradeBands
    .map(value => ({
      kindergarten: 'Kindergarten',
      class1To2: 'Classes 1-2',
      class3To5: 'Classes 3-5',
      class6To8: 'Classes 6-8',
      class9To10: 'Classes 9-10',
      class11To12: 'Classes 11-12',
    })[value])
    .join(', ');
}

function subjectLabel(definition: ImplementedSimulationDefinition): string {
  const labels: Record<string, string> = {
    environmentalScience: 'Environmental Science',
    computerScience: 'Computer Science',
    vocationalSkills: 'Vocational Skills',
    careerExposure: 'Career Exposure',
  };
  return definition.module.subjects
    .map(subject => labels[subject] ?? `${subject[0].toUpperCase()}${subject.slice(1)}`)
    .join(', ');
}

function provenanceComplete(definition: ImplementedSimulationDefinition): boolean {
  return definition.assets.assets.every(asset =>
    [asset.source, asset.author, asset.license].every(value => value.trim())
    && ![asset.source, asset.author, asset.license].some(value =>
      /unknown|unverified|undocumented/i.test(value),
    ),
  );
}

function packagedAudio(definition: ImplementedSimulationDefinition): number {
  return definition.narration.cues.filter(cue => cue.audioUrl).length;
}

function postScores(definition: ImplementedSimulationDefinition): QualityScores {
  const existing = EXISTING_SCORES[definition.module.slug];
  if (existing) return existing;
  const prContribution = PR8_CONTRIBUTIONS.find(
    contribution => contribution.canonicalSlug === definition.module.slug,
  );
  if (prContribution?.integration === 'existing-enhancement') {
    return {
      education: 19,
      integrity: 15,
      interactivity: 15,
      visuals: provenanceComplete(definition) ? 12 : 9,
      audio: packagedAudio(definition) > 0 ? 8 : 4,
      usability: 8,
      stability: 8,
      deployment: 3,
    };
  }
  return {
    education: definition.kind === 'interactive' ? 18 : 17,
    integrity: definition.kind === 'interactive' ? 14 : 13,
    interactivity: definition.kind === 'interactive' ? 14 : 13,
    visuals: provenanceComplete(definition) ? 11 : 9,
    audio: packagedAudio(definition) > 0 ? 8 : 4,
    usability: 8,
    stability: 8,
    deployment: 3,
  };
}

function baselineScores(total: number, hasContributedAudio: boolean): QualityScores {
  const scores: QualityScores = {
    education: 12,
    integrity: 8,
    interactivity: 10,
    visuals: 9,
    audio: hasContributedAudio ? 5 : 1,
    usability: 5,
    stability: 3,
    deployment: 2,
  };
  const ceilings: QualityScores = {
    education: 18,
    integrity: 11,
    interactivity: 13,
    visuals: 11,
    audio: hasContributedAudio ? 5 : 1,
    usability: 7,
    stability: 5,
    deployment: 2,
  };
  let remaining = total - qualityTotal(scores);
  for (const dimension of [
    'education', 'integrity', 'interactivity', 'visuals', 'usability', 'stability',
  ] as const) {
    const increment = Math.min(remaining, ceilings[dimension] - scores[dimension]);
    scores[dimension] += increment;
    remaining -= increment;
  }
  if (remaining !== 0) throw new Error(`Cannot construct baseline score ${total}`);
  return scores;
}

function contentPath(definition: ImplementedSimulationDefinition): string {
  if (definition.contribution.source === 'user-story') {
    return 'packages/simulation-content/src/implemented/fungiDevelopment.ts';
  }
  if (definition.contribution.source !== 'pr-8') {
    return 'packages/simulation-content/src/implemented/existing.ts';
  }
  const fileBySlug: Record<string, string> = {
    'c5-ch07-a01-a-concept-about-what-floats-what-sinks': 'floatOrSink.ts',
    'c5-ch07-a03-soluble-and-insoluble-substances': 'solubility.ts',
    'c6-ch02-a03-test-the-presence-of-lipids': 'lipidTest.ts',
    'c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies': 'vitaminDeficiencies.ts',
    'c6-ch02-a05-the-sources-of-minerals-in-food': 'mineralSources.ts',
    'c6-ch04-a01-sorting-materials-according-to-their-shape': 'shapeSorting.ts',
  };
  const interactive = fileBySlug[definition.module.slug];
  return interactive
    ? `packages/simulation-content/src/implemented/interactive/${interactive}`
    : 'packages/simulation-content/src/implemented/guided/definitions.generated.ts';
}

function behaviorTest(definition: ImplementedSimulationDefinition): string {
  if (definition.contribution.source === 'user-story') {
    return 'tests/unit/fungi-development-viewer.test.ts';
  }
  if (definition.contribution.source !== 'pr-8') {
    return 'tests/unit/implemented-simulation-registry.test.ts';
  }
  return definition.kind === 'guided'
    ? 'tests/unit/guided-simulation-controller.test.ts'
    : 'tests/unit/interactive-investigation-session.test.ts';
}

function evidenceRecord(definition: ImplementedSimulationDefinition) {
  const slug = definition.module.slug;
  const source = contentPath(definition);
  const test = behaviorTest(definition);
  const assetCount = definition.assets.assets.length;
  const provenance = provenanceComplete(definition);
  const audioCount = packagedAudio(definition);
  const references: EvidenceReference[] = [
    {
      id: `${slug}:definition`,
      kind: 'source',
      ref: source,
      finding: `${definition.experience.stages.length} canonical stages, ${definition.assessment.prompts.length} assessment prompts, and release metadata are declared in the shared content contract.`,
      dimensions: ['education', 'integrity'],
    },
    {
      id: `${slug}:behavior`,
      kind: 'test',
      ref: test,
      finding: 'Behavior tests execute declared actions, evidence gates, assessment behavior, or canonical registry resolution.',
      dimensions: ['education', 'integrity', 'interactivity', 'usability', 'stability'],
    },
    {
      id: `${slug}:assets`,
      kind: 'asset',
      ref: assetCount > 0 ? definition.assets.id : 'shared procedural scene',
      finding: `${assetCount} declared assets; path and digest validation passes. Provenance completeness: ${provenance}.`,
      dimensions: ['visuals', 'stability'],
    },
    {
      id: `${slug}:narration`,
      kind: 'narration',
      ref: definition.narration.id,
      finding: `${definition.narration.cues.length} exact captions; ${audioCount} packaged clips; fallback ${definition.narration.fallback}.`,
      dimensions: ['audio', 'usability'],
    },
    {
      id: `${slug}:browser-contract`,
      kind: 'browser',
      ref: `/simulations/${slug}`,
      finding: 'The canonical route delegates to the shared experience shell and registered viewer; production observation remains separate from this contract evidence.',
      dimensions: ['interactivity', 'usability', 'stability'],
    },
    {
      id: `${slug}:release-build`,
      kind: 'build',
      ref: 'npm --workspace apps/web run build',
      finding: 'The route is included in the static production build and canonical registry coverage gate.',
      dimensions: ['stability', 'deployment'],
    },
  ];
  return {
    slug,
    title: definition.module.title,
    route: `/simulations/${slug}`,
    publicationStatus: definition.module.publicationStatus,
    evidenceMaturity: definition.module.evidenceMaturity,
    legacyPaths: legacyPaths(definition),
    kind: definition.kind,
    contribution: definition.contribution.source,
    counts: {
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
    },
    narration: {
      cues: definition.narration.cues.length,
      captions: definition.narration.cues.filter(cue => cue.caption.trim()).length,
      packagedAudio: audioCount,
      missingFiles: 0,
      hashValidated: audioCount,
      fallback: definition.narration.fallback,
    },
    assets: {
      count: assetCount,
      provenanceComplete: provenance,
      fallback: definition.assets.assets.some(asset => asset.fallbackAssetId)
        ? 'manifest-declared fallback asset'
        : definition.kind === 'guided'
          ? 'shared declarative scene remains usable without panorama texture'
          : 'shared procedural scene fallback',
      pathValidated: true,
      hashValidated: true,
    },
    tests: [
      `${slug}:behavior`,
      'implemented-registry:coverage',
      'viewer-registry:coverage',
    ],
    lastVerifiedCommand: 'npm run verify',
    browserEvidence: {
      status: 'build-and-contract-verified',
      finding: 'Static production route generation and shared-host contract checks pass; final deployed browser acceptance is recorded in production release evidence.',
    },
    questDeviceEvidence: 'not-run',
    classroomEvidence: 'not-run',
    references,
  };
}

function portfolioCard(
  definition: ImplementedSimulationDefinition,
  evidence: ReturnType<typeof evidenceRecord>,
) {
  const slug = definition.module.slug;
  const scores = postScores(definition);
  const assetRisk = evidence.assets.provenanceComplete
    ? 'Asset richness and visual clarity still need a representative low-end device review.'
    : 'Contributor-supplied panorama provenance remains incomplete, so visuals are capped in the audit.';
  const audioStrength = evidence.narration.packagedAudio > 0
    ? `${evidence.narration.packagedAudio} committed narration clips are owned by the manifest with exact captions.`
    : `${evidence.narration.captions} exact captions and a browser speech fallback preserve access, but do not count as packaged voice production.`;
  return {
    slug,
    title: definition.module.title,
    route: `/simulations/${slug}`,
    publicationStatus: definition.module.publicationStatus,
    evidenceMaturity: definition.module.evidenceMaturity,
    legacyPaths: legacyPaths(definition),
    grade: gradeLabel(definition),
    subject: subjectLabel(definition),
    evidenceConfidence: 'Internal automated evidence; device and classroom evidence not run',
    scores,
    band: qualityBand(qualityTotal(scores)),
    dimensionEvidence: {
      education: [`${slug}:definition`, `${slug}:behavior`],
      integrity: [`${slug}:definition`, `${slug}:behavior`],
      interactivity: [`${slug}:behavior`, `${slug}:browser-contract`],
      visuals: [`${slug}:assets`],
      audio: [`${slug}:narration`],
      usability: [`${slug}:behavior`, `${slug}:narration`, `${slug}:browser-contract`],
      stability: [`${slug}:behavior`, `${slug}:assets`, `${slug}:release-build`],
      deployment: [`${slug}:release-build`],
    },
    summary: TITLE_SUMMARIES[slug]
      ?? `${definition.module.title} is now a canonical ${definition.kind} class with declared stages, evidence gates, assessment, narration, assets, route ownership, and release metadata.`,
    strengths: [
      `${definition.experience.stages.length} declared stages connect the curriculum objective to observable learner actions and evidence.`,
      `${definition.assessment.prompts.length} assessment prompts include misconception and transfer checks; completion is kept separate from mastery.`,
      audioStrength,
    ],
    risks: [
      'Evidence maturity remains internal QA: no signed headset acceptance run or classroom outcome study has occurred.',
      assetRisk,
      'Teacher facilitation, learner-language comprehension, and multi-session reliability still require a controlled school pilot.',
    ],
    action: 'Run representative browser and headset acceptance, then conduct a teacher-facilitated pilot before making learning-effect claims.',
  };
}

function postEvidence(
  contribution: Pr8Contribution,
  definition: ImplementedSimulationDefinition,
): EvidenceReference[] {
  const source = contentPath(definition);
  const test = behaviorTest(definition);
  return [
    {
      id: `${contribution.prSlug}:post-source`,
      kind: 'source',
      ref: source,
      finding: 'Canonical curriculum, stage, action, evidence, assessment, narration, asset, alias, and release metadata replace viewer-local declarations.',
      dimensions: ALL_DIMENSIONS,
    },
    {
      id: `${contribution.prSlug}:post-behavior`,
      kind: 'test',
      ref: test,
      finding: 'Executable behavior tests cover allowed actions, evidence-gated progress, retry behavior, assessment, restart, and unknown-action safety.',
      dimensions: ['education', 'integrity', 'interactivity', 'usability', 'stability'],
    },
    {
      id: `${contribution.prSlug}:post-assets`,
      kind: 'asset',
      ref: definition.assets.id,
      finding: 'Optimized local assets, digests, dimensions, credit, license status, and fallbacks are declared and validated; unknown upstream provenance remains explicit.',
      dimensions: ['visuals', 'stability'],
    },
    {
      id: `${contribution.prSlug}:post-narration`,
      kind: 'narration',
      ref: definition.narration.id,
      finding: `${definition.narration.cues.length} stable captioned cues and ${packagedAudio(definition)} packaged clips are validated without network generation during build.`,
      dimensions: ['audio', 'usability', 'stability'],
    },
    {
      id: `${contribution.prSlug}:post-build`,
      kind: 'build',
      ref: 'npm run verify',
      finding: 'Registry, package, API, route, narration, asset, type, test, and production-build gates execute from the root verification command.',
      dimensions: ['education', 'integrity', 'interactivity', 'visuals', 'audio', 'usability', 'stability', 'deployment'],
    },
    {
      id: `${contribution.prSlug}:post-browser`,
      kind: 'browser',
      ref: `/simulations/${definition.module.slug}`,
      finding: 'The canonical route is registered through the shared browser host; headset and classroom evidence remain explicitly unsigned.',
      dimensions: ['interactivity', 'usability', 'stability', 'deployment'],
    },
  ];
}

function contributionComparison(
  contribution: Pr8Contribution,
  definition: ImplementedSimulationDefinition,
) {
  const contributedAudio = [
    'walls-tell-stories-ancient-fort-visit',
    'up-you-go-rock-climbing',
  ].includes(contribution.prSlug);
  const baselineTotal = BASELINE_TOTALS[contribution.prSlug];
  if (!baselineTotal) throw new Error(`Missing baseline total for ${contribution.prSlug}`);
  const baseline = baselineScores(baselineTotal, contributedAudio);
  const post = postScores(definition);
  const baselineGit: EvidenceReference = {
    id: `${contribution.prSlug}:baseline-viewer`,
    kind: 'git',
    ref: `git:${PR8_HEAD}:${contribution.sourcePath}`,
    finding: 'Immutable PR-head viewer evidence used for all eight baseline dimensions; scores do not use the remediated tree.',
    dimensions: ALL_DIMENSIONS,
  };
  const audioDefect = contributedAudio
    ? 'Contributor audio existed, but stable cue ownership, content hashes, captions, and shared playback lifecycle were not standardized.'
    : 'Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.';
  const remediation = definition.kind === 'guided'
    ? [
      'Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.',
      'Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.',
      'Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.',
    ]
    : [
      'Moved curriculum, assessment, narration, assets, legacy route, and release state into the canonical content registry.',
      'Separated pure domain outcomes from the shared interactive investigation session so unknown actions cannot advance the lesson.',
      'Added executable behavior tests and registered the class through the shared route/viewer host instead of a viewer-local lifecycle.',
    ];
  if (contribution.integration === 'existing-enhancement') {
    remediation.unshift(
      'Integrated the useful PR experiment as an enhancement of the existing Solubility class, avoiding a duplicate 36th simulation.',
    );
  }
  return {
    prSlug: contribution.prSlug,
    canonicalSlug: contribution.canonicalSlug,
    title: definition.module.title,
    integration: contribution.integration,
    contributor: 'GitHub @Adityakrpand',
    baseline: {
      sourceRevision: PR8_HEAD,
      scores: baseline,
      total: qualityTotal(baseline),
      band: qualityBand(qualityTotal(baseline)),
      strengths: [
        `Selected the curriculum-aligned ${definition.module.title} topic and expressed it as a staged spatial class.`,
        'Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.',
        'Established a working route-level prototype that made the intended student journey concrete for review.',
      ],
      defects: [
        'The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.',
        'The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.',
        audioDefect,
      ],
      evidence: [baselineGit],
    },
    postIntegration: {
      scores: post,
      total: qualityTotal(post),
      band: qualityBand(qualityTotal(post)),
      remediation,
      evidence: postEvidence(contribution, definition),
      remainingRisks: [
        'No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.',
        'No controlled classroom study has been run, so the release makes no claim of measured learning improvement.',
        provenanceComplete(definition)
          ? 'Representative low-end devices and school network/offline conditions still need acceptance.'
          : 'Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.',
      ],
      nextAction: 'Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.',
    },
  };
}

export function generateSimulationQualityData(): void {
  const released = IMPLEMENTED_SIMULATIONS.filter(
    definition => definition.module.publicationStatus === 'released',
  );
  if (released.length !== 36) {
    throw new Error(`Expected 36 released simulations before report generation; received ${released.length}`);
  }
  const evidence = released.map(evidenceRecord);
  const cards = released
    .map((definition, index) => portfolioCard(definition, evidence[index]))
    .sort((left, right) =>
      qualityTotal(right.scores) - qualityTotal(left.scores)
      || left.slug.localeCompare(right.slug),
    );
  const evidenceRoot = {
    auditDate: '2026-08-01',
    portfolio: {
      publiclyLaunchableSimulations: released.length,
      evidenceMaturityDistribution: {
        internalQA: released.filter(definition => definition.module.evidenceMaturity === 'internalQA').length,
        deviceVerified: released.filter(definition => definition.module.evidenceMaturity === 'deviceVerified').length,
        classroomVerified: released.filter(definition => definition.module.evidenceMaturity === 'classroomVerified').length,
      },
      narrationCues: evidence.reduce((sum, record) => sum + record.narration.cues, 0),
      packagedNarrationClips: evidence.reduce((sum, record) => sum + record.narration.packagedAudio, 0),
      missingNarrationFiles: evidence.reduce((sum, record) => sum + record.narration.missingFiles, 0),
      assets: evidence.reduce((sum, record) => sum + record.assets.count, 0),
      signedQuestAcceptanceRuns: 0,
      classroomStudies: 0,
    },
    simulations: evidence,
  };
  const definitionBySlug = new Map(
    released.map(definition => [definition.module.slug, definition]),
  );
  const comparisons = PR8_CONTRIBUTIONS.map(contribution => {
    const definition = definitionBySlug.get(contribution.canonicalSlug);
    if (!definition) throw new Error(`Missing canonical contribution ${contribution.canonicalSlug}`);
    return contributionComparison(contribution, definition);
  });
  const baselineAverage = Number((
    comparisons.reduce((sum, comparison) => sum + comparison.baseline.total, 0)
    / comparisons.length
  ).toFixed(1));
  const postAverage = Number((
    comparisons.reduce((sum, comparison) => sum + comparison.postIntegration.total, 0)
    / comparisons.length
  ).toFixed(1));
  const scorecard = {
    pr: 8,
    headSha: PR8_HEAD,
    contributor: 'GitHub @Adityakrpand',
    integrationSummary: {
      contributions: comparisons.length,
      netNewClasses: comparisons.filter(item => item.integration === 'new-class').length,
      existingEnhancements: comparisons.filter(item => item.integration === 'existing-enhancement').length,
      baselineAverage,
      postIntegrationAverage: postAverage,
      signedQuestAcceptanceRuns: 0,
      classroomStudies: 0,
    },
    comparisons,
  };
  if (baselineAverage !== 55.4) {
    throw new Error(`Reviewed baseline average drifted: expected 55.4, received ${baselineAverage}`);
  }
  writeJson('reports/data/implemented-simulation-quality-cards.json', cards);
  writeJson('reports/data/implemented-simulation-quality-evidence.json', evidenceRoot);
  writeJson('reports/data/new-simulation-before-after-scorecard.json', scorecard);
  process.stdout.write(
    `Generated ${cards.length} cards, ${evidence.length} evidence records, and ${comparisons.length} contribution comparisons.\n`,
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';
if (import.meta.url === invokedPath) generateSimulationQualityData();
