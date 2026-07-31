import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');

const libraryPackages = [
  'simulation-schema',
  'simulation-runtime',
  'simulation-content',
  'classroom-sync',
  'evaluation-engine',
] as const;

interface PackageManifest {
  name?: string;
  private?: boolean;
  type?: string;
  main?: string;
  files?: string[];
  exports?: Record<string, unknown>;
  scripts?: Record<string, string>;
  version?: string;
  dependencies?: Record<string, string>;
}

function readManifest(
  packageName: (typeof libraryPackages)[number],
): PackageManifest {
  const manifestPath = join(
    repositoryRoot,
    'packages',
    packageName,
    'package.json',
  );
  expect(
    existsSync(manifestPath),
    `${packageName} must have a package manifest`,
  ).toBe(true);
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

describe('workspace package boundaries', () => {
  it.each(libraryPackages)(
    'publishes @xr-school/%s from compiled ESM output',
    (packageName) => {
      const manifest = readManifest(packageName);

      expect(manifest).toMatchObject({
        name: `@xr-school/${packageName}`,
        private: false,
        type: 'module',
        files: ['dist'],
        exports: {
          '.': {
            types: './dist/index.d.ts',
            import: './dist/index.js',
          },
        },
        scripts: {
          build: 'tsc -p tsconfig.build.json',
          'type-check': 'tsc -p tsconfig.json --noEmit',
        },
      });
      expect(manifest.main?.startsWith('src/')).not.toBe(true);
      expect(
        existsSync(
          join(repositoryRoot, 'packages', packageName, 'tsconfig.build.json'),
        ),
        `${packageName} must define a build config`,
      ).toBe(true);
    },
  );

  it('includes the evaluation engine through a public package entry point', () => {
    const publicEntryPath = join(
      repositoryRoot,
      'packages/evaluation-engine/src/index.ts',
    );
    expect(
      existsSync(publicEntryPath),
      'evaluation-engine must expose src/index.ts',
    ).toBe(true);
    const publicEntry = readFileSync(publicEntryPath, 'utf8');

    expect(publicEntry).toMatch(/export\s+\*\s+from\s+['"]\.\/scoring\.js['"]/);
  });

  it('keeps production package source behind public workspace imports', () => {
    const packageSources = libraryPackages.flatMap((packageName) =>
      sourceFiles(join(repositoryRoot, 'packages', packageName, 'src')),
    );
    const siblingSourceImport =
      /(?:\.\.\/)+simulation-[^/'"\s]+\/src(?:\/[^'"\s]*)?/;
    const violations = packageSources.flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return siblingSourceImport.test(source)
        ? [filePath.slice(repositoryRoot.length + 1)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it('defines deterministic root package build and type-check entry points', () => {
    const rootManifest = JSON.parse(
      readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
    ) as PackageManifest;

    expect(rootManifest.scripts).toMatchObject({
      'build:packages': 'node scripts/build-packages.mjs',
      'type-check:packages': 'node scripts/type-check-packages.mjs',
      build: 'npm run build:packages && npm --workspace apps/web run build',
    });
  });

  it('uses npm-compatible local versions and links every library workspace', () => {
    for (const packageName of libraryPackages) {
      const manifest = readManifest(packageName);
      for (const [dependencyName, dependencyVersion] of Object.entries(
        manifest.dependencies ?? {},
      )) {
        if (!dependencyName.startsWith('@xr-school/')) continue;
        const dependencyPackageName = dependencyName.slice(
          '@xr-school/'.length,
        ) as (typeof libraryPackages)[number];
        expect(dependencyVersion).toBe(
          readManifest(dependencyPackageName).version,
        );
      }

      const installedPath = join(
        repositoryRoot,
        'node_modules/@xr-school',
        packageName,
      );
      expect(
        existsSync(installedPath),
        `${packageName} must be installed as a workspace link`,
      ).toBe(true);
      expect(realpathSync(installedPath)).toBe(
        realpathSync(join(repositoryRoot, 'packages', packageName)),
      );
    }
  });
});
