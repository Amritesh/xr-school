#!/usr/bin/env node
/**
 * validate-simulations.mjs
 *
 * Validates that:
 * 1. Every simulation slug in apps/api/src/index.ts has a matching Next.js page
 * 2. Every simulation page imports a viewer component that exists
 * 3. The OpenAPI spec covers simulation-modules routes
 * 4. No simulation uses a forbidden xrFitType
 *
 * Runs offline — no server needed.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = process.cwd();
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let errors = 0;
let warnings = 0;

function fail(msg) { console.error(`  ${RED}✗${RESET} ${msg}`); errors++; }
function warn(msg) { console.warn(`  ${YELLOW}!${RESET} ${msg}`); warnings++; }
function pass(msg) { console.log(`  ${GREEN}✓${RESET} ${msg}`); }

// ── 1. Read simulation slugs from API seed data ────────────────────────
const apiSrc = resolve(ROOT, 'apps/api/src/index.ts');
if (!existsSync(apiSrc)) {
  fail(`apps/api/src/index.ts not found`);
  process.exit(1);
}

const apiCode = readFileSync(apiSrc, 'utf8');
const slugMatches = [...apiCode.matchAll(/slug:\s*['"]([a-z0-9-]+)['"]/g)];
const slugs = slugMatches.map(m => m[1]);

if (slugs.length === 0) {
  fail('No simulation slugs found in apps/api/src/index.ts');
  process.exit(1);
}

pass(`Found ${slugs.length} simulation slug(s): ${slugs.join(', ')}`);

// ── 2. Each slug must have a Next.js page ──────────────────────────────
for (const slug of slugs) {
  const pagePath = resolve(ROOT, `apps/web/app/simulations/${slug}/page.tsx`);
  if (!existsSync(pagePath)) {
    fail(`Missing page for slug "${slug}": apps/web/app/simulations/${slug}/page.tsx`);
  } else {
    pass(`Page exists: /simulations/${slug}`);
  }
}

// ── 3. Each slug must have a viewer component ──────────────────────────
const viewerNameMap = {
  pollination: 'PollinationViewer',
  circuit: 'CircuitViewer',
};

for (const slug of slugs) {
  const viewerName = viewerNameMap[slug] || `${slug.charAt(0).toUpperCase() + slug.slice(1)}Viewer`;
  const viewerPath = resolve(ROOT, `apps/web/components/simulations/${viewerName}.tsx`);
  if (!existsSync(viewerPath)) {
    fail(`Missing viewer component for slug "${slug}": components/simulations/${viewerName}.tsx`);
  } else {
    pass(`Viewer component exists: ${viewerName}.tsx`);
  }
}

// ── 4. Pages must use 'use client' (required for ssr:false) ───────────
for (const slug of slugs) {
  const pagePath = resolve(ROOT, `apps/web/app/simulations/${slug}/page.tsx`);
  if (!existsSync(pagePath)) continue;
  const pageCode = readFileSync(pagePath, 'utf8');
  if (!pageCode.startsWith("'use client'") && !pageCode.startsWith('"use client"')) {
    fail(`apps/web/app/simulations/${slug}/page.tsx must start with 'use client' (required for dynamic SSR:false)`);
  } else {
    pass(`${slug}/page.tsx has 'use client'`);
  }
}

// ── 5. OpenAPI spec must have simulation-modules routes ─────────────────
const openapiPath = resolve(ROOT, 'generated/openapi/openapi.json');
if (!existsSync(openapiPath)) {
  fail('generated/openapi/openapi.json not found. Run: npm run contract:compile');
} else {
  const spec = JSON.parse(readFileSync(openapiPath, 'utf8'));
  const paths = spec.paths || {};

  const requiredRoutes = [
    '/v1/simulation-modules',
    '/v1/simulation-modules/{moduleId}',
    '/v1/evaluation-records',
    '/v1/batch-sessions',
    '/v1/curriculum-maps',
    '/v1/learning-concepts',
    '/v1/offline-content-packs',
    '/v1/sync-jobs',
  ];

  requiredRoutes.forEach(route => {
    if (!paths[route]) {
      fail(`OpenAPI missing route: ${route}`);
    } else {
      pass(`OpenAPI has route: ${route}`);
    }
  });

  // simulation-modules must have both GET and POST
  const simRoute = paths['/v1/simulation-modules'];
  if (simRoute) {
    if (!simRoute.get) fail('/v1/simulation-modules is missing GET operation');
    else pass('/v1/simulation-modules has GET');
    if (!simRoute.post) fail('/v1/simulation-modules is missing POST operation');
    else pass('/v1/simulation-modules has POST');
  }
}

// ── 6. No simulation uses a forbidden xrFitType ────────────────────────
const FORBIDDEN_FIT = ['normalClassroomBetter', 'physicalLabBetter', 'notWorthXr'];
const fitMatches = [...apiCode.matchAll(/xrFitType:\s*['"]([a-zA-Z]+)['"]/g)];
fitMatches.forEach(m => {
  if (FORBIDDEN_FIT.includes(m[1])) {
    fail(`Simulation uses forbidden xrFitType "${m[1]}". Only strongVrFit or arTabletFit may be built.`);
  } else {
    pass(`xrFitType "${m[1]}" is allowed`);
  }
});

// ── Summary ────────────────────────────────────────────────────────────
console.log('');
if (errors > 0) {
  console.error(`${RED}${BOLD}  Simulation validation FAILED — ${errors} error(s)${RESET}`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`${YELLOW}  Simulation validation passed with ${warnings} warning(s)${RESET}`);
} else {
  console.log(`${GREEN}  All simulation contracts valid${RESET}`);
}
