#!/usr/bin/env node
/**
 * validate-simulations.mjs
 *
 * Validates that:
 * 1. Every simulation slug in shared content data has a matching Next.js page
 * 2. Every simulation page delegates through the shared viewer registry
 * 3. The OpenAPI spec covers simulation-modules routes
 * 4. No implemented simulation uses a forbidden xrFitType
 *
 * Runs offline; no server needed.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

export const REQUIRED_OPENAPI_ROUTES = [
  '/v1/simulation-modules',
  '/v1/simulation-modules/{moduleId}',
  '/v1/evaluation-records',
  '/v1/batch-sessions',
  '/v1/curriculum-maps',
  '/v1/learning-concepts',
  '/v1/offline-content-packs',
  '/v1/sync-jobs',
];

export const FORBIDDEN_XR_FIT_TYPES = [
  'normalClassroomBetter',
  'physicalLabBetter',
  'notWorthXr',
];

export function extractSimulationSlugs(modulesCode) {
  return [...String(modulesCode).matchAll(/slug:\s*['"]([a-z0-9-]+)['"]/g)].map(match => match[1]);
}

export function extractXrFitTypes(modulesCode) {
  return [...String(modulesCode).matchAll(/xrFitType:\s*['"]([a-zA-Z]+)['"]/g)].map(match => match[1]);
}

function createResult() {
  const result = {
    errors: [],
    warnings: [],
    passes: [],
  };

  return {
    result,
    fail(message) {
      result.errors.push(message);
    },
    warn(message) {
      result.warnings.push(message);
    },
    pass(message) {
      result.passes.push(message);
    },
  };
}

export function validateSimulationWorkspace({
  root = process.cwd(),
  exists = existsSync,
  readFile = readFileSync,
} = {}) {
  const { result, fail, pass } = createResult();
  const fromRoot = path => resolve(root, path);
  const modulesPath = fromRoot('packages/simulation-content/src/modules.ts');

  if (!exists(modulesPath)) {
    fail('packages/simulation-content/src/modules.ts not found');
    return result;
  }

  const modulesCode = readFile(modulesPath, 'utf8');
  const slugs = extractSimulationSlugs(modulesCode);

  if (slugs.length === 0) {
    fail('No simulation slugs found in packages/simulation-content/src/modules.ts');
    return result;
  }

  pass(`Found ${slugs.length} simulation slug(s): ${slugs.join(', ')}`);

  for (const slug of slugs) {
    const pagePath = fromRoot(`apps/web/app/simulations/${slug}/page.tsx`);
    if (!exists(pagePath)) {
      fail(`Missing page for slug "${slug}": apps/web/app/simulations/${slug}/page.tsx`);
    } else {
      pass(`Page exists: /simulations/${slug}`);
    }
  }

  const viewerRegistryPath = fromRoot('apps/web/lib/simulations/viewerRegistry.ts');
  if (!exists(viewerRegistryPath)) {
    fail('Missing shared viewer registry: apps/web/lib/simulations/viewerRegistry.ts');
  } else {
    pass('Shared viewer registry exists');
  }

  for (const slug of slugs) {
    const pagePath = fromRoot(`apps/web/app/simulations/${slug}/page.tsx`);
    if (!exists(pagePath)) continue;

    const pageCode = readFile(pagePath, 'utf8');
    const slugPattern = new RegExp(`slug=["']${slug}["']`);
    if (!pageCode.includes('SimulationRoutePage') || !slugPattern.test(pageCode)) {
      fail(`apps/web/app/simulations/${slug}/page.tsx must delegate its exact slug to SimulationRoutePage`);
    } else {
      pass(`${slug}/page.tsx delegates to SimulationRoutePage`);
    }
  }

  const openapiPath = fromRoot('generated/openapi/openapi.json');
  if (!exists(openapiPath)) {
    fail('generated/openapi/openapi.json not found. Run: npm run contract:compile');
  } else {
    try {
      const spec = JSON.parse(readFile(openapiPath, 'utf8'));
      const paths = spec.paths || {};

      for (const route of REQUIRED_OPENAPI_ROUTES) {
        if (!paths[route]) {
          fail(`OpenAPI missing route: ${route}`);
        } else {
          pass(`OpenAPI has route: ${route}`);
        }
      }

      const simulationRoute = paths['/v1/simulation-modules'];
      if (simulationRoute) {
        if (!simulationRoute.get) fail('/v1/simulation-modules is missing GET operation');
        else pass('/v1/simulation-modules has GET');

        if (!simulationRoute.post) fail('/v1/simulation-modules is missing POST operation');
        else pass('/v1/simulation-modules has POST');
      }
    } catch (error) {
      fail(`generated/openapi/openapi.json is not valid JSON: ${error.message}`);
    }
  }

  for (const fitType of extractXrFitTypes(modulesCode)) {
    if (FORBIDDEN_XR_FIT_TYPES.includes(fitType)) {
      fail(`Simulation uses forbidden xrFitType "${fitType}". Only strongVrFit or arTabletFit may be built.`);
    } else {
      pass(`xrFitType "${fitType}" is allowed`);
    }
  }

  return result;
}

function printValidationResult(result) {
  for (const message of result.passes) console.log(`  ${GREEN}OK${RESET} ${message}`);
  for (const message of result.warnings) console.warn(`  ${YELLOW}!${RESET} ${message}`);
  for (const message of result.errors) console.error(`  ${RED}X${RESET} ${message}`);

  console.log('');
  if (result.errors.length > 0) {
    console.error(`${RED}${BOLD}  Simulation validation FAILED - ${result.errors.length} error(s)${RESET}`);
    return 1;
  }

  if (result.warnings.length > 0) {
    console.warn(`${YELLOW}  Simulation validation passed with ${result.warnings.length} warning(s)${RESET}`);
    return 0;
  }

  console.log(`${GREEN}  All simulation contracts valid${RESET}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = printValidationResult(validateSimulationWorkspace());
}
