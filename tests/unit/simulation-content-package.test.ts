import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const contentPackageRoot = join(repositoryRoot, 'packages/simulation-content');
const catalogFileName = 'class-5-to-10-science-virtual-tours-catalog.csv';
const canonicalCatalogPath = join(
  repositoryRoot,
  'docs/catalog',
  catalogFileName,
);
const bundledCatalogPath = join(
  contentPackageRoot,
  'dist/data',
  catalogFileName,
);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let npmCacheDirectory = '';

interface PackageManifest {
  exports?: Record<string, unknown>;
}

interface PackResult {
  files?: Array<{ path: string }>;
}

beforeAll(() => {
  rmSync(join(contentPackageRoot, 'dist'), { recursive: true, force: true });
  npmCacheDirectory = mkdtempSync(join(tmpdir(), 'xr-school-pack-'));

  const build = spawnSync(
    npmCommand,
    ['--workspace', '@xr-school/simulation-content', 'run', 'build'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  expect(build.status, build.stderr || build.stdout).toBe(0);
});

afterAll(() => {
  if (npmCacheDirectory) {
    rmSync(npmCacheDirectory, { recursive: true, force: true });
  }
});

describe('simulation-content package artifact', () => {
  it.each([
    ['source', join(contentPackageRoot, 'src/index.ts')],
    ['compiled', join(contentPackageRoot, 'dist/index.js')],
  ])('keeps the %s main entry free of Node built-ins', (_label, entryPath) => {
    expect(readFileSync(entryPath, 'utf8')).not.toMatch(
      /(?:from|import\()\s*['"]node:/,
    );
  });

  it('exports the Node-only loader through an explicit package subpath', () => {
    const manifest = JSON.parse(
      readFileSync(join(contentPackageRoot, 'package.json'), 'utf8'),
    ) as PackageManifest;

    expect(manifest.exports).toMatchObject({
      './node': {
        types: './dist/node.d.ts',
        import: './dist/node.js',
      },
    });
  });

  it('loads all catalog rows from the bundled package data', () => {
    const loader = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        [
          "import { loadScienceCatalog, SCIENCE_CATALOG_CSV_PATH } from '@xr-school/simulation-content/node';",
          'console.log(JSON.stringify({ count: loadScienceCatalog().length, path: SCIENCE_CATALOG_CSV_PATH }));',
        ].join('\n'),
      ],
      { cwd: repositoryRoot, encoding: 'utf8' },
    );

    expect(loader.status, loader.stderr || loader.stdout).toBe(0);
    const result = JSON.parse(loader.stdout.trim()) as {
      count: number;
      path: string;
    };
    expect(result).toEqual({ count: 497, path: bundledCatalogPath });
  });

  it('packs an exact copy of the canonical catalog in dist data', () => {
    const pack = spawnSync(
      npmCommand,
      [
        'pack',
        '--dry-run',
        '--json',
        '--workspace',
        '@xr-school/simulation-content',
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: { ...process.env, npm_config_cache: npmCacheDirectory },
      },
    );

    expect(pack.status, pack.stderr || pack.stdout).toBe(0);
    const [artifact] = JSON.parse(pack.stdout) as PackResult[];
    expect(artifact.files?.map((file) => file.path)).toContain(
      `dist/data/${catalogFileName}`,
    );
    expect(existsSync(bundledCatalogPath)).toBe(true);
    expect(readFileSync(bundledCatalogPath)).toEqual(
      readFileSync(canonicalCatalogPath),
    );
  });
});
