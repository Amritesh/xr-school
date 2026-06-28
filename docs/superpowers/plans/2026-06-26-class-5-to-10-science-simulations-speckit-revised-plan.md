# Class 5-10 Science Simulations Spec Kit Revised Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the 497-activity Class 5-10 science simulation catalog with the existing Spec Kit vertical slice and make implementation proceed through typed catalog, validation, runtime archetypes, API/admin integration, and offline content packs.

**Architecture:** Keep Spec Kit's ontology-first vertical slice as the authority, but add a catalog-normalization phase before API expansion. The source PDF becomes typed content data; reusable simulation archetypes render most activities; bespoke Three.js viewers are reserved for flagship modules and gradually migrated into the shared runtime.

**Tech Stack:** Node 23, TypeScript, TypeSpec, Fastify, Next.js App Router, React, Three.js/WebXR, Vitest, OpenAPI, CSV-to-typed catalog tooling, offline content pack manifests.

---

## Flow Validation

The existing Spec Kit flow is directionally correct:

1. `.speckit/constitution.md` defines non-negotiables: offline-first, instructor-led, batch-level evaluation, TypeSpec as source of truth, XR fit justification, frozen commerce domains.
2. `.speckit/specify.md` defines the active vertical slice: curriculum, simulation, packaging, operations, and evaluation.
3. `.speckit/clarify.md` captures unresolved product choices without blocking MVP assumptions.
4. `.speckit/checklist.md` gives acceptance gates.
5. `.speckit/plan.md` and `.speckit/tasks.md` define the original Phase 1 API-first implementation sequence.

The flow needs revision because the repo has moved beyond the original "empty apps/packages" assumption:

- `apps/api` and `apps/web` now exist with two runnable WebXR simulations.
- Simulation data is duplicated across API seed, web catalog, tests, and viewer-local stage arrays.
- The PDF adds 497 activity modules across 116 topic bundles, which is too large for one-viewer-per-module implementation.
- The current API seed is not a complete `SimulationModule` according to TypeSpec.
- `apps/api/src/index.ts` uses `class8To10`, which is not a valid TypeSpec `GradeBand`.
- Local validation depends on Node 22+; the active shell may expose Node 14 and make TypeSpec/Vitest fail incorrectly.

## Validated Commands

Use the Node 23 preflight form until the local shell/npm setup is normalized:

```bash
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" node -v
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" ./node_modules/.bin/tsp compile contracts/typespec
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" ./node_modules/.bin/vitest run --reporter=basic
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" node scripts/spec-drift-check.mjs
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" node scripts/validate-simulations.mjs
```

Observed validation on 2026-06-26:

- TypeSpec compiler v1.13.0 compiled successfully and generated `generated/openapi/`.
- Vitest passed 3 files and 79 tests.
- Spec drift check passed with no changed files detected.
- `scripts/validate-simulations.mjs` passed for `pollination` and `circuit`.

## Revised Phase Order

### Phase 0A: Toolchain and Spec Kit Reality Sync

**Purpose:** Make every agent and developer run the same checks before touching implementation.

**Files:**
- Modify: `.speckit/analyze.md`
- Modify: `.speckit/checklist.md`
- Modify: `.speckit/plan.md`
- Create: `scripts/dev-env-check.mjs`
- Modify: `package.json`

- [ ] Add a `scripts/dev-env-check.mjs` script that verifies Node major version is at least 22, `/bin/sh` exists, `contracts/typespec/main.tsp` exists, and `docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv` exists.
- [ ] Add a `prequality` or `env:check` npm script that runs `node scripts/dev-env-check.mjs`.
- [ ] Update `.speckit/analyze.md` so it no longer says `apps/api`, `apps/web`, and `packages/evaluation-engine` are empty.
- [ ] Update `.speckit/checklist.md` with a new Phase 0A gate: Node 22+ active, TypeSpec compiles, Vitest passes, drift check passes, catalog row count is 497.
- [ ] Update `.speckit/plan.md` to state that the old Phase 1 API-first plan is superseded by catalog normalization before API expansion.
- [ ] Verify with:

```bash
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" node scripts/dev-env-check.mjs
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" ./node_modules/.bin/vitest run --reporter=basic
```

### Phase 1: Canonical Catalog and Schema Package

**Purpose:** Replace duplicated simulation metadata with one typed source of truth.

**Files:**
- Create: `packages/simulation-schema/package.json`
- Create: `packages/simulation-schema/tsconfig.json`
- Create: `packages/simulation-schema/src/types.ts`
- Create: `packages/simulation-schema/src/catalogValidation.ts`
- Create: `packages/simulation-schema/src/normalization.ts`
- Create: `packages/simulation-schema/src/archetypes.ts`
- Create: `packages/simulation-content/package.json`
- Create: `packages/simulation-content/tsconfig.json`
- Create: `packages/simulation-content/src/catalog/class-5-to-10-science.ts`
- Create: `tests/unit/simulation-catalog.test.ts`
- Modify: `package.json`

- [ ] Define TypeScript enums and interfaces matching TypeSpec values for `GradeBand`, `Subject`, `SimulationFormat`, `XrFitType`, `ComfortRiskLevel`, `SimulationArchetype`, and `ScienceCatalogRow`.
- [ ] Implement `slugifyActivity`, `buildSimulationId`, `inferGradeBand`, `mapArchetypeToSimulationFormat`, `validateCatalogRow`, and `validateCatalog`.
- [ ] Convert `docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv` into typed `SCIENCE_CLASS_5_TO_10_CATALOG` data.
- [ ] Write tests that assert 497 rows, unique slugs, unique ids, valid enums, no duration above 12 minutes, no forbidden release fit type, and no `class8To10`.
- [ ] Verify with:

```bash
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" ./node_modules/.bin/vitest run tests/unit/simulation-catalog.test.ts --reporter=basic
```

### Phase 2: Normalize Existing Pollination and Circuit Modules

**Purpose:** Bring existing demos under the same catalog and ontology rules before adding hundreds more.

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/web/app/simulations/page.tsx`
- Modify: `tests/unit/simulation-modules.test.ts`
- Create: `packages/simulation-content/src/modules/pollination.ts`
- Create: `packages/simulation-content/src/modules/circuit.ts`

- [ ] Move `pollination` and `circuit` metadata into `packages/simulation-content`.
- [ ] Expand both records toward complete TypeSpec `SimulationModule` shape: concept ids, curriculum map ids, scientific explanation, misconceptions, strategies, instructor script, cue card ids, revision card ids, assessment hook ids, max duration, package size, FPS target, and storage target.
- [ ] Fix `circuit` grade bands to valid values: `class6To8` and/or `class9To10`; remove `class8To10`.
- [ ] Make API and web catalog import module metadata from the shared content package instead of hardcoded duplicate arrays.
- [ ] Make `tests/unit/simulation-modules.test.ts` validate the imported records, not a copied fixture.
- [ ] Verify with:

```bash
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" ./node_modules/.bin/vitest run tests/unit/simulation-modules.test.ts --reporter=basic
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" node scripts/validate-simulations.mjs
```

### Phase 3: Catalog Validation CLI and Spec Drift Integration

**Purpose:** Make the 497-row catalog a first-class CI gate.

**Files:**
- Create: `scripts/validate-simulation-catalog.mjs`
- Modify: `scripts/validate-simulations.mjs`
- Modify: `scripts/spec-drift-check.mjs`
- Modify: `.github/workflows/quality.yml`
- Modify: `package.json`

- [ ] Add `scripts/validate-simulation-catalog.mjs` that imports or reads the typed catalog and prints counts by class, subject, and archetype.
- [ ] Extend `scripts/validate-simulations.mjs` so it validates dynamic runtime mapping instead of only hardcoded viewer component names.
- [ ] Extend `scripts/spec-drift-check.mjs` so catalog changes require either simulation ontology/spec updates or an explicit `[catalog-only]` marker in the commit/PR notes.
- [ ] Add `catalog:validate` to `package.json`.
- [ ] Add catalog validation to CI after TypeSpec compile and before tests.
- [ ] Verify with:

```bash
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" node scripts/validate-simulation-catalog.mjs
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" node scripts/spec-drift-check.mjs
```

### Phase 4: Shared WebXR Runtime Shell

**Purpose:** Stop repeating renderer, cue-card, narration, controller, and stage-machine logic per viewer.

**Files:**
- Create: `packages/simulation-runtime/package.json`
- Create: `packages/simulation-runtime/tsconfig.json`
- Create: `packages/simulation-runtime/src/core/stageMachine.ts`
- Create: `packages/simulation-runtime/src/core/webxr.ts`
- Create: `packages/simulation-runtime/src/core/cueCardTexture.ts`
- Create: `packages/simulation-runtime/src/core/controllerRaycast.ts`
- Create: `packages/simulation-runtime/src/core/audioNarration.ts`
- Create: `packages/simulation-runtime/src/core/performanceMonitor.ts`
- Create: `packages/simulation-runtime/src/react/SimulationShell.tsx`
- Create: `tests/unit/stage-machine.test.ts`

- [ ] Implement `createStageMachine` with `next`, `previous`, `reset`, `goTo`, and bounded stage indexes.
- [ ] Implement `safeSpeak` with cancellation and caption fallback.
- [ ] Implement `createCueCardTexture` with predictable canvas size and text wrapping.
- [ ] Implement `createWebXrRenderer` with XR enabled, local-floor reference space, resize handling, and cleanup.
- [ ] Implement `createControllerRaycaster` for Quest controller interaction with named interactables.
- [ ] Write unit tests for stage-machine boundaries and reset behavior.
- [ ] Verify with:

```bash
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" ./node_modules/.bin/vitest run tests/unit/stage-machine.test.ts --reporter=basic
```

### Phase 5: Migrate Existing Viewers to Runtime Shell

**Purpose:** Prove the shared runtime can support real simulations without changing visible behavior.

**Files:**
- Modify: `apps/web/components/simulations/PollinationViewer.tsx`
- Modify: `apps/web/components/simulations/CircuitViewer.tsx`
- Modify: `apps/web/app/simulations/pollination/page.tsx`
- Modify: `apps/web/app/simulations/circuit/page.tsx`
- Create: `apps/web/components/simulations/runtime/RuntimeHost.tsx`

- [ ] Extract duplicated speech synthesis to `safeSpeak`.
- [ ] Extract cue-card canvas rendering to `createCueCardTexture`.
- [ ] Extract next/previous stage state to `createStageMachine`.
- [ ] Keep current Three.js scene construction inside each viewer for now; do not force archetype migration in this phase.
- [ ] Verify both pages still launch in browser mode.
- [ ] Verify with:

```bash
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" ./node_modules/.bin/vitest run --reporter=basic
PATH="/Users/amritesh/.nvm/versions/node/v23.11.0/bin:/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin:$PATH" node scripts/validate-simulations.mjs
```

### Phase 6: First Four Archetype Runtimes

**Purpose:** Unlock the bulk of catalog implementation without bespoke viewers.

**Files:**
- Create: `packages/simulation-runtime/src/archetypes/ModelInspectionRuntime.tsx`
- Create: `packages/simulation-runtime/src/archetypes/ProcessTimelineRuntime.tsx`
- Create: `packages/simulation-runtime/src/archetypes/ExperimentBenchRuntime.tsx`
- Create: `packages/simulation-runtime/src/archetypes/SortingBoardRuntime.tsx`
- Create: `packages/simulation-content/src/archetypeFixtures/*.ts`
- Create: `tests/unit/archetype-contracts.test.ts`

- [ ] Implement `modelInspection` with labels, isolate, zoom target, compare, and vocabulary toggle.
- [ ] Implement `processTimeline` with stage scrubber, replay, progressive reveal, and recap card.
- [ ] Implement `experimentBench` with variable controls, reset, predict-observe-explain prompt, and measured output.
- [ ] Implement `sortingBoard` with drag/classify, reveal rule, misconception trap, and instructor review state.
- [ ] Add one fixture module per archetype.
- [ ] Verify every fixture has cue cards, assessment hooks, companion activity, duration, comfort risk, and package estimate.

### Phase 7: Remaining Archetype Runtimes

**Purpose:** Cover field visits, systems, graph/data tools, and safety-sensitive scenarios.

**Files:**
- Create: `packages/simulation-runtime/src/archetypes/GuidedTourRuntime.tsx`
- Create: `packages/simulation-runtime/src/archetypes/SystemMapRuntime.tsx`
- Create: `packages/simulation-runtime/src/archetypes/MeasurementGraphRuntime.tsx`
- Create: `packages/simulation-runtime/src/archetypes/ScenarioRuntime.tsx`
- Create: `tests/unit/comfort-risk.test.ts`

- [ ] Implement guided tours as seated or teleport-only experiences with hotspots.
- [ ] Implement system maps with nodes, flows, inputs, outputs, and disturbance toggles.
- [ ] Implement measurement graphs with instruments, data table, plotted graph, and interpretation question.
- [ ] Implement scenarios with decision point, consequence preview, retry, and instructor debrief.
- [ ] Add medium-risk safety validation for space, heights, disasters, disease, and sensitive biology topics.

### Phase 8: API Core Catches Up To Spec Kit

**Purpose:** Resume the original Spec Kit vertical slice after canonical content exists.

**Files:**
- Create: `apps/api/src/routes/learning-concepts.ts`
- Create: `apps/api/src/routes/curriculum-maps.ts`
- Create: `apps/api/src/routes/cue-cards.ts`
- Create: `apps/api/src/routes/revision-cards.ts`
- Create: `apps/api/src/routes/assessment-hooks.ts`
- Create: `apps/api/src/routes/simulation-modules.ts`
- Create: `apps/api/src/routes/offline-content-packs.ts`
- Create: `apps/api/src/routes/batch-sessions.ts`
- Create: `apps/api/src/routes/evaluation-records.ts`
- Modify: `apps/api/src/index.ts`

- [ ] Split the current single-file Fastify API into route modules.
- [ ] Implement list/create/get routes already defined in TypeSpec.
- [ ] Use in-memory repositories or SQLite/Prisma only after deciding persistence scope for this sprint.
- [ ] Ensure API module responses use shared content data and TypeSpec-compatible shapes.
- [ ] Verify with contract tests and integration tests.

### Phase 9: Minimal Web Admin and Dynamic Simulation Routes

**Purpose:** Make the catalog browsable and manageable without adding frozen product surfaces.

**Files:**
- Create: `apps/web/app/simulations/[slug]/page.tsx`
- Modify: `apps/web/app/simulations/page.tsx`
- Create: `apps/web/components/simulations/catalog/SimulationCatalogGrid.tsx`
- Create: `apps/web/components/simulations/catalog/SimulationModuleDetail.tsx`
- Create: `apps/web/components/simulations/runtime/ArchetypeRuntimeHost.tsx`

- [ ] Replace static per-simulation route duplication with dynamic `[slug]` routing.
- [ ] Render catalog cards from shared content data.
- [ ] Route `pollination` and `circuit` to bespoke viewers until fully archetyped.
- [ ] Route catalog/archetype fixtures to `ArchetypeRuntimeHost`.
- [ ] Keep individual student login, CRM, billing, proposals, and marketplace out of scope.

### Phase 10: Offline Content Pack Planning

**Purpose:** Convert catalog modules into installable, storage-aware packs.

**Files:**
- Create: `scripts/build-offline-content-pack.mjs`
- Create: `packages/simulation-schema/src/packagePlanning.ts`
- Create: `tests/unit/content-pack-planning.test.ts`
- Create: `docs/catalog/offline-pack-plan.md`

- [ ] Group modules by class, subject, chapter, and shared asset bundle.
- [ ] Enforce grade-band package targets: Class 5 under 300 MB, Classes 6-8 under 500 MB, Classes 9-10 under 800 MB per activity target.
- [ ] Deduplicate shared topic assets across repeated concepts.
- [ ] Generate manifest skeletons compatible with `docs/offline-quest/offline-deployment.md`.
- [ ] Verify with package-planning tests.

## Revised Priority Recommendation

Do not start by implementing all TypeSpec API routes or all 497 simulations. Start with this order:

1. Toolchain preflight and Spec Kit reality sync.
2. Typed catalog/schema package.
3. Existing module metadata normalization.
4. Catalog validation in CI.
5. Shared runtime shell.
6. Existing viewer migration.
7. Archetype runtimes.
8. API route expansion.
9. Web admin/dynamic routing.
10. Offline pack generation.

This preserves Spec Kit's architecture while preventing the PDF catalog from becoming a second, ungoverned source of truth.

