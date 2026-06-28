#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const CATALOG_PATH = resolve(ROOT, 'docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv');

const VALID_GRADE_BANDS = new Set(['class3To5', 'class6To8', 'class9To10']);
const VALID_FORMATS = new Set(['immersiveVr', 'threeSixtyVr', 'interactive3d', 'guidedVisualization', 'practicalLabSimulation', 'virtualFieldVisit', 'revisionMode']);
const VALID_RISKS = new Set(['low', 'medium', 'high']);
const FORBIDDEN_FITS = new Set(['normalClassroomBetter', 'physicalLabBetter', 'notWorthXr']);

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

export function parseCatalogCsv(csvText) {
  const [headerLine, ...lines] = csvText.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.map(line => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

export function summarizeCatalog(rows) {
  const summary = {
    byClass: {},
    bySubject: {},
    byArchetype: {},
  };

  for (const row of rows) {
    summary.byClass[row.class] = (summary.byClass[row.class] ?? 0) + 1;
    summary.bySubject[row.subject] = (summary.bySubject[row.subject] ?? 0) + 1;
    summary.byArchetype[row.primaryArchetype] = (summary.byArchetype[row.primaryArchetype] ?? 0) + 1;
  }

  return summary;
}

export function validateRows(rows) {
  const errors = [];
  const slugs = new Set();
  const ids = new Set();

  rows.forEach((row, index) => {
    const label = row.slug || `row-${index + 1}`;
    const duration = Number(row.expectedDurationMinutes);

    if (!row.simulationId?.startsWith('sim-')) errors.push(`${label}: simulationId must start with sim-`);
    if (!/^[a-z0-9-]+$/.test(row.slug ?? '')) errors.push(`${label}: slug must be kebab-case`);
    if (slugs.has(row.slug)) errors.push(`${label}: duplicate slug`);
    slugs.add(row.slug);
    if (ids.has(row.simulationId)) errors.push(`${label}: duplicate simulationId`);
    ids.add(row.simulationId);
    if (!VALID_GRADE_BANDS.has(row.gradeBand)) errors.push(`${label}: invalid gradeBand ${row.gradeBand}`);
    if (!VALID_FORMATS.has(row.simulationFormat)) errors.push(`${label}: invalid simulationFormat ${row.simulationFormat}`);
    if (!VALID_RISKS.has(row.comfortRiskLevel)) errors.push(`${label}: invalid comfortRiskLevel ${row.comfortRiskLevel}`);
    if (FORBIDDEN_FITS.has(row.xrFitType)) errors.push(`${label}: forbidden xrFitType ${row.xrFitType}`);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 12) errors.push(`${label}: expectedDurationMinutes must be 1-12`);
  });

  if (rows.length !== 497) errors.push(`Expected 497 catalog rows, found ${rows.length}`);
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = parseCatalogCsv(readFileSync(CATALOG_PATH, 'utf8'));
  const errors = validateRows(rows);
  const summary = summarizeCatalog(rows);

  console.log(`Science catalog rows: ${rows.length}`);
  console.log(`By class: ${JSON.stringify(summary.byClass)}`);
  console.log(`By subject: ${JSON.stringify(summary.bySubject)}`);
  console.log(`By archetype: ${JSON.stringify(summary.byArchetype)}`);

  if (errors.length > 0) {
    console.error('\nCatalog validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log('\nScience catalog validation passed.');
}
