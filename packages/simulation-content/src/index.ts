import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { ScienceCatalogRow, SimulationArchetype } from '../../simulation-schema/src/index';

const here = dirname(fileURLToPath(import.meta.url));
export const SCIENCE_CATALOG_CSV_PATH = resolve(here, '../../../docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv');

function parseCsvLine(line: string) {
  const cells: string[] = [];
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

function parseSecondaryArchetypes(value: string): SimulationArchetype[] {
  if (!value) return [];
  return value.split('|').filter(Boolean) as SimulationArchetype[];
}

export function parseScienceCatalogCsv(csvText: string): ScienceCatalogRow[] {
  const [headerLine, ...dataLines] = csvText.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return dataLines.map(line => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));

    return {
      simulationId: record.simulationId,
      slug: record.slug,
      class: Number(record.class),
      gradeBand: record.gradeBand,
      chapter: Number(record.chapter),
      topic: record.topic,
      activityNumber: Number(record.activityNumber),
      activityTitle: record.activityTitle,
      subject: record.subject,
      primaryArchetype: record.primaryArchetype,
      secondaryArchetypes: parseSecondaryArchetypes(record.secondaryArchetypes),
      simulationFormat: record.simulationFormat,
      xrFitType: record.xrFitType,
      comfortRiskLevel: record.comfortRiskLevel,
      expectedDurationMinutes: Number(record.expectedDurationMinutes),
      packageSizeTargetMb: Number(record.packageSizeTargetMb),
      reuseGroup: record.reuseGroup,
      implementationNotes: record.implementationNotes,
      releaseMaturity: 'catalogued',
    } as ScienceCatalogRow;
  });
}

export function loadScienceCatalog(path = SCIENCE_CATALOG_CSV_PATH) {
  return parseScienceCatalogCsv(readFileSync(path, 'utf8'));
}
