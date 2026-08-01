import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { IMPLEMENTED_SIMULATIONS } from '@xr-school/simulation-content';

import {
  validateBeforeAfterScorecard,
  validatePortfolioData,
} from './lib/simulation-quality-data';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
}

export function validateSimulationQualityReports(): {
  cards: number;
  evidence: number;
  comparisons: number;
} {
  const cards = readJson(
    'reports/data/implemented-simulation-quality-cards.json',
  );
  const evidence = readJson(
    'reports/data/implemented-simulation-quality-evidence.json',
  );
  const scorecard = readJson(
    'reports/data/new-simulation-before-after-scorecard.json',
  );
  const errors = [
    ...validatePortfolioData({
      definitions: IMPLEMENTED_SIMULATIONS,
      cards,
      evidence,
    }),
    ...validateBeforeAfterScorecard({
      definitions: IMPLEMENTED_SIMULATIONS,
      scorecard,
    }),
  ];
  if (errors.length > 0) {
    throw new Error(
      `Simulation quality report validation failed (${errors.length} errors):\n${errors
        .map(error => `- ${error}`)
        .join('\n')}`,
    );
  }
  const cardRecords = cards as unknown[];
  const evidenceRoot = evidence as { simulations: unknown[] };
  const scorecardRoot = scorecard as { comparisons: unknown[] };
  return {
    cards: cardRecords.length,
    evidence: evidenceRoot.simulations.length,
    comparisons: scorecardRoot.comparisons.length,
  };
}

function main(): void {
  const result = validateSimulationQualityReports();
  process.stdout.write(
    `${result.cards} portfolio cards; ${result.evidence} evidence records; ${result.comparisons} contribution comparisons; 0 validation errors\n`,
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';
if (import.meta.url === invokedPath) main();
