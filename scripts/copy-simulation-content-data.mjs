import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogFileName = 'class-5-to-10-science-virtual-tours-catalog.csv';
const sourcePath = resolve(repositoryRoot, 'docs/catalog', catalogFileName);
const outputDirectory = resolve(
  repositoryRoot,
  'packages/simulation-content/dist/data',
);

mkdirSync(outputDirectory, { recursive: true });
copyFileSync(sourcePath, resolve(outputDirectory, catalogFileName));
