import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseScienceCatalogCsv } from './catalog.js';

const catalogFileName = 'class-5-to-10-science-virtual-tours-catalog.csv';
const here = dirname(fileURLToPath(import.meta.url));
const bundledCatalogPath = resolve(here, 'data', catalogFileName);
const workspaceCatalogPath = resolve(
  here,
  '../../../docs/catalog',
  catalogFileName,
);

export const SCIENCE_CATALOG_CSV_PATH = existsSync(bundledCatalogPath)
  ? bundledCatalogPath
  : workspaceCatalogPath;

export function loadScienceCatalog(path = SCIENCE_CATALOG_CSV_PATH) {
  return parseScienceCatalogCsv(readFileSync(path, 'utf8'));
}
