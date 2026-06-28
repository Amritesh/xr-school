# Runtime Physics And Catalog Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared base physics engine and make all Class 5-10 catalog rows launchable through reusable simulation archetypes.

**Architecture:** Physics lives in `packages/simulation-runtime` as a renderer-agnostic deterministic engine. Web simulations import it through the workspace package, while dynamic catalog routes render archetype scenes for rows without bespoke viewers.

**Tech Stack:** TypeScript, Vitest, Next.js App Router, Three.js, Vercel.

---

### Task 1: Runtime Physics Engine

**Files:**
- Create: `packages/simulation-runtime/src/core/physics.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/physics-engine.test.ts`

- [x] Write failing tests for force integration, bounds response, seeded particle clouds, and invalid body rejection.
- [x] Run the focused test and confirm missing API failure.
- [x] Implement `createPhysicsWorld` and `createParticleCloud`.
- [x] Export runtime types and functions.
- [x] Run focused tests and confirm pass.

### Task 2: Use Physics In Existing Particle Simulation

**Files:**
- Modify: `apps/web/components/simulations/StatesOfMatterViewer.tsx`
- Modify: `apps/web/next.config.mjs`
- Modify: `apps/web/package.json`
- Test: `tests/unit/states-viewer-feedback.test.ts`

- [x] Add a failing test that States imports the shared runtime engine.
- [x] Add workspace package dependency and transpilation config.
- [x] Replace local particle velocity arrays with runtime physics world and seeded particle cloud.
- [x] Run focused tests and production build.

### Task 3: Launchable Catalog Runtime

**Files:**
- Create: `apps/web/components/simulations/GenericCatalogSimulationViewer.tsx`
- Create: `apps/web/app/simulations/[slug]/page.tsx`
- Modify: `apps/web/lib/simulationAvailability.ts`
- Modify: `apps/web/app/simulations/page.tsx`
- Test: `tests/unit/catalog-runtime-viewer.test.ts`
- Test: `tests/unit/simulation-availability.test.ts`

- [x] Write failing tests for dynamic route, launchable catalog rows, and generic viewer physics usage.
- [x] Add generic archetype viewer with stages, narration, VR stage buttons, and archetype-specific Three.js scenes.
- [x] Add dynamic `[slug]` route with `generateStaticParams` over all 497 catalog rows.
- [x] Update simulation catalog availability from queued to launchable.
- [x] Run focused tests and production build.

### Task 4: Verification And Deployment

**Files:**
- No planned source edits.

- [x] Run full unit tests.
- [x] Run TypeSpec compile.
- [x] Run simulation validation.
- [x] Run spec drift check.
- [x] Run production build.
- [x] Smoke-test local production routes and audio.
- [x] Deploy to Vercel production.
- [x] Smoke-test live production routes.
