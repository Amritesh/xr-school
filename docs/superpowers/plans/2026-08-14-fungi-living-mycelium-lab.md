# Living Mycelium Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release the catalogued Class 8 fungi lesson as a visually rich, evidence-gated browser and WebXR simulation at `/simulations/c8-ch02-a03-fungi-and-its-development`.

**Architecture:** A pure runtime model owns fungal facts, deterministic growth, learner state, validation, and mastery. A canonical implemented definition declares the seven-stage lesson and metadata. A focused procedural Three.js world projects domain state through the shared renderer lifecycle, while a React viewer coordinates the lesson, normalized input, accessible controls, narration, WebXR, and post-mission sandbox.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 15, Three.js, shared XR School simulation runtime/schema/web packages, Vitest, Playwright.

---

## File map

- Create `packages/simulation-runtime/src/models/fungiDevelopmentModel.ts`: pure fungal classification, growth, ordering, safety, and reducer logic.
- Modify `packages/simulation-runtime/src/index.ts`: export the fungi model through the public package entry.
- Create `packages/simulation-content/src/implemented/fungiDevelopment.ts`: canonical module, experience, assessment, narration, and asset definition.
- Modify `packages/simulation-content/src/implemented/registry.ts`: add the definition to the single canonical registry.
- Modify `packages/simulation-content/src/index.ts`: export the fungi definition.
- Create `apps/web/lib/world-builder/fungiWorld.ts`: procedural forest and stage visual projection with complete disposal.
- Create `apps/web/components/simulations/FungiDevelopmentViewer.tsx`: shared-shell viewer, interactions, accessibility, WebXR, and sandbox.
- Modify `apps/web/lib/simulations/viewerRegistry.ts`: dynamically register `fungi-development` without disturbing existing buoyancy edits.
- Modify `apps/web/lib/simulationAvailability.ts`: mark the canonical class launchable at honest internal-QA maturity.
- Create `apps/web/app/simulations/c8-ch02-a03-fungi-and-its-development/page.tsx`: canonical route delegate.
- Create focused unit and Playwright tests listed below.

### Task 1: Pure fungi development model

**Files:**
- Create: `tests/unit/fungi-development-model.test.ts`
- Create: `packages/simulation-runtime/src/models/fungiDevelopmentModel.ts`
- Modify: `packages/simulation-runtime/src/index.ts`

- [ ] **Step 1: Write failing reference-vector tests**

Cover these public contracts in `tests/unit/fungi-development-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  FUNGAL_OBJECTS,
  FUNGAL_GROWTH_STAGES,
  evaluateFungalGrowth,
  initialFungiDevelopmentState,
  reduceFungiDevelopment,
} from '@xr-school/simulation-runtime';

describe('fungi development model', () => {
  it('distinguishes fungi from a green plant', () => {
    expect(FUNGAL_OBJECTS.mushroom.kingdom).toBe('fungus');
    expect(FUNGAL_OBJECTS['bread-mould'].kingdom).toBe('fungus');
    expect(FUNGAL_OBJECTS['green-plant'].kingdom).toBe('plant');
  });

  it('maps warm moist bread across the supplied five-day sequence', () => {
    expect([1, 2, 3, 4, 5].map(day =>
      evaluateFungalGrowth({ day, temperatureC: 27, moisturePercent: 82 }).stage,
    )).toEqual(FUNGAL_GROWTH_STAGES);
  });

  it('rejects non-finite and out-of-range growth inputs', () => {
    expect(() => evaluateFungalGrowth({ day: Number.NaN, temperatureC: 27, moisturePercent: 82 })).toThrow();
    expect(() => evaluateFungalGrowth({ day: 3, temperatureC: 90, moisturePercent: 82 })).toThrow();
    expect(() => evaluateFungalGrowth({ day: 3, temperatureC: 27, moisturePercent: 120 })).toThrow();
  });

  it('preserves first predictions and awards mastery only after transfer', () => {
    let state = reduceFungiDevelopment(initialFungiDevelopmentState, { type: 'choose-growth-condition', condition: 'dry-cold' });
    state = reduceFungiDevelopment(state, { type: 'choose-growth-condition', condition: 'warm-moist' });
    expect(state.firstGrowthPrediction).toBe('dry-cold');
    expect(state.mastery).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- tests/unit/fungi-development-model.test.ts`

Expected: FAIL because the fungi exports do not exist.

- [ ] **Step 3: Implement the deterministic model and reducer**

Define explicit literal unions for fungal object IDs, condition IDs, growth stages, life-cycle labels, useful roles, and safety outcomes. Implement `evaluateFungalGrowth()` with strict finite/range validation and deterministic day-based output. Implement an immutable reducer that records selected fungi, touched hyphae, first and latest condition predictions, visited days, ordered labels, useful-role matches, safety decisions, quiz answers, evidence IDs, completion, and mastery. Unknown actions must throw.

- [ ] **Step 4: Run focused tests and public-package type checking**

Run: `npm test -- tests/unit/fungi-development-model.test.ts && npm run type-check:packages`

Expected: PASS.

- [ ] **Step 5: Commit the model slice**

```bash
git add packages/simulation-runtime/src/models/fungiDevelopmentModel.ts packages/simulation-runtime/src/index.ts tests/unit/fungi-development-model.test.ts
git commit -m "feat: add fungi development model"
```

### Task 2: Canonical implemented definition and lesson gates

**Files:**
- Create: `packages/simulation-content/src/implemented/fungiDevelopment.ts`
- Modify: `packages/simulation-content/src/implemented/registry.ts`
- Modify: `packages/simulation-content/src/index.ts`
- Create: `tests/unit/fungi-development-content.test.ts`
- Create: `tests/unit/fungi-development-experience.test.ts`

- [ ] **Step 1: Write failing canonical-content tests**

Assert that `findImplementedSimulation('c8-ch02-a03-fungi-and-its-development')` returns one released, internal-QA, immersive-VR definition with viewer key `fungi-development`, seven stages, exact narration cues, pre/post/misconception assessments, no remote assets, and a classroom companion prompt.

- [ ] **Step 2: Write failing lesson-gate tests**

Use `createLessonSession()` with the new experience to prove that an action without its observable evidence cannot advance, an unknown action is rejected, the first condition prediction survives a retry, completion differs from mastery, and the final transfer answer supplies the mastery evidence.

- [ ] **Step 3: Run the two test files and confirm RED**

Run: `npm test -- tests/unit/fungi-development-content.test.ts tests/unit/fungi-development-experience.test.ts`

Expected: FAIL because the canonical definition is absent.

- [ ] **Step 4: Implement the definition**

Create seven stages named `fungal-forensics`, `under-the-cap`, `spore-flight`, `five-day-time-lens`, `fungi-at-work`, `food-safety-scan`, and `forest-circle`. Each stage declares authored actions and evidence, with caption-length narration derived from the supplied script. Define module metadata with `sim-c08-ch02-a03-fungi-and-its-development`, the canonical slug, `fungi-development`, Class 6–8, biology/science, `immersiveVr`, 9 minutes, low comfort risk, released publication, internal-QA evidence, instructor script sections, safety notes, and provenance `user-story` / `new-class`.

- [ ] **Step 5: Add it once to the canonical registry and exports**

Import `FUNGI_DEVELOPMENT` into `registry.ts` and append it to the source definitions. Export it from the package entry. Do not edit generated catalogs by hand.

- [ ] **Step 6: Run content, experience, registry, module, and package tests**

Run: `npm test -- tests/unit/fungi-development-content.test.ts tests/unit/fungi-development-experience.test.ts tests/unit/implemented-simulation-registry.test.ts tests/unit/simulation-modules.test.ts && npm run build:packages`

Expected: PASS with the implemented count increased by one.

- [ ] **Step 7: Commit the canonical content slice**

```bash
git add packages/simulation-content/src/implemented/fungiDevelopment.ts packages/simulation-content/src/implemented/registry.ts packages/simulation-content/src/index.ts tests/unit/fungi-development-content.test.ts tests/unit/fungi-development-experience.test.ts tests/unit/implemented-simulation-registry.test.ts
git commit -m "feat: define living mycelium lesson"
```

### Task 3: Procedural forest world

**Files:**
- Create: `apps/web/lib/world-builder/fungiWorld.ts`
- Create: `tests/unit/fungi-world.test.ts`

- [ ] **Step 1: Write failing world-contract tests**

Assert that `createFungiWorld()` exposes `root`, `targets`, `setStage`, `setState`, `update`, `pause`, `resume`, `setReducedMotion`, and `dispose`; registers fungus, three hypha tips, spore landing, five-day dial, yeast, safety items, and final mushrooms; projects all seven stages; uses deterministic seeded layout; and disposes every owned geometry and material exactly once.

- [ ] **Step 2: Run the world test and confirm RED**

Run: `npm test -- tests/unit/fungi-world.test.ts`

Expected: FAIL because `fungiWorld.ts` does not exist.

- [ ] **Step 3: Build the persistent low-cost forest**

Create an anchored world with fog, calibrated key/fill lights, instanced trunks and foliage, forest floor, log, three object-classification stations, authored focus targets, and generous invisible hit areas. Use `MeshStandardMaterial` for teaching meshes, reuse geometries/materials, and keep the Quest budget below 120 draw calls and 250,000 visible triangles.

- [ ] **Step 4: Add progressive scientific layers**

Add seeded `CatmullRomCurve3` hypha branches, spore instancing, day-based bread coverage and sporangia, bakery/lab/compost portals, rising-dough comparison, safety basket symbols, quiz mushrooms, badge, and sandbox instruments. `setReducedMotion(true)` must replace continuous ambient motion and growth with static/stepped states without removing evidence.

- [ ] **Step 5: Implement lifecycle and disposal**

Use the shared resource conventions, suspend updates while paused, avoid per-frame allocation, reject invalid stage/state input, and dispose geometries, materials, textures, canvas labels, and attachments in an idempotent `dispose()`.

- [ ] **Step 6: Run world and quality tests**

Run: `npm test -- tests/unit/fungi-world.test.ts tests/unit/world-quality.test.ts tests/unit/realistic-environments.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the world slice**

```bash
git add apps/web/lib/world-builder/fungiWorld.ts tests/unit/fungi-world.test.ts
git commit -m "feat: build procedural fungi forest"
```

### Task 4: Rich accessible viewer and WebXR controls

**Files:**
- Create: `apps/web/components/simulations/FungiDevelopmentViewer.tsx`
- Create: `tests/unit/fungi-development-viewer.test.ts`

- [ ] **Step 1: Write failing viewer integration tests**

Verify the component uses `SimulationExperienceShell`, `SimulationCanvasHost`, shared narration, `createWebSimulationRuntime`, interaction system, VR player rig, VR HUD, and normalized action sources; exposes keyboard/touch/mouse equivalent controls; provides captions and feedback; wires reduced motion; shows evidence rather than generic advancement; and reveals sandbox controls only after completion.

- [ ] **Step 2: Run the viewer test and confirm RED**

Run: `npm test -- tests/unit/fungi-development-viewer.test.ts`

Expected: FAIL because the viewer does not exist.

- [ ] **Step 3: Implement lesson coordination and controls**

Instantiate the lesson session and fungi reducer, route every world or accessible-control action through one normalized handler, record world evidence only after its observable state completes, preserve first answers, show specific corrective feedback, auto-advance only after action plus evidence, and implement previous/replay/restart/pause semantics.

- [ ] **Step 4: Implement browser and WebXR presentation**

Mount the world through `SimulationCanvasHost` and shared runtime. Add ray/controller selection, hover focus, VR HUD content, stationary player rig, conservative snap turning or no-turn policy, stage-aware focus frames for browser only, a recoverable WebXR fallback, and complete teardown. Never force camera motion during immersive XR.

- [ ] **Step 5: Implement final summary, field guide, and growth sandbox**

After completion, show observed evidence, misconceptions, final transfer result, and honest mastery. Expose temperature and moisture controls inside model ranges, a five-day scrubber, side-by-side growth interpretation, replay-stage actions, and full restart. Ensure unsafe food text says never taste or open a mould culture.

- [ ] **Step 6: Run viewer, audio, input, and type checks**

Run: `npm test -- tests/unit/fungi-development-viewer.test.ts tests/unit/action-router.test.ts tests/unit/simulation-audio-contract.test.ts && npm --workspace apps/web run type-check`

Expected: PASS.

- [ ] **Step 7: Commit the viewer slice**

```bash
git add apps/web/components/simulations/FungiDevelopmentViewer.tsx tests/unit/fungi-development-viewer.test.ts
git commit -m "feat: add living mycelium viewer"
```

### Task 5: Canonical route, availability, registry, and generated catalog integration

**Files:**
- Modify: `apps/web/lib/simulations/viewerRegistry.ts`
- Modify: `apps/web/lib/simulationAvailability.ts`
- Create: `apps/web/app/simulations/c8-ch02-a03-fungi-and-its-development/page.tsx`
- Modify: `tests/unit/simulation-viewer-registry.test.ts`
- Modify: `tests/unit/simulation-availability.test.ts`
- Create: `tests/unit/fungi-development-route.test.ts`

- [ ] **Step 1: Write failing integration tests**

Assert the canonical route delegates with `slug="c8-ch02-a03-fungi-and-its-development"`, the availability map resolves it as released/internal-QA, viewer coverage contains `fungi-development`, and no duplicate simulation identity is introduced.

- [ ] **Step 2: Run the integration tests and confirm RED**

Run: `npm test -- tests/unit/fungi-development-route.test.ts tests/unit/simulation-viewer-registry.test.ts tests/unit/simulation-availability.test.ts`

Expected: FAIL because the route and viewer registration are missing.

- [ ] **Step 3: Add the dynamic viewer registration and route**

Add `fungi-development` to `VIEWER_INPUTS`, loading `FungiDevelopmentViewer`. Add the minimal canonical route using `SimulationRoutePage`. Merge around the existing uncommitted buoyancy entries rather than replacing or reformatting them.

- [ ] **Step 4: Add availability and regenerate derived web catalogs**

Add the canonical module to `simulationAvailability.ts` using the existing shape, then run `npm run web-catalog:generate`. Review generated diffs to ensure only the fungi record changes from catalogued to launchable and no unrelated generated data is lost.

- [ ] **Step 5: Run registry, availability, catalog, and build checks**

Run: `npm test -- tests/unit/fungi-development-route.test.ts tests/unit/simulation-viewer-registry.test.ts tests/unit/simulation-availability.test.ts tests/unit/web-catalog-generator.test.ts && npm run catalog:validate && npm run simulations:validate && npm --workspace apps/web run build`

Expected: PASS and the Next build lists the canonical fungi route.

- [ ] **Step 6: Commit only fungi integration files**

Stage exact paths and inspect `git diff --cached` before committing so unrelated buoyancy work remains outside this commit.

```bash
git add apps/web/components/simulations/FungiDevelopmentViewer.tsx apps/web/lib/simulations/viewerRegistry.ts apps/web/lib/simulationAvailability.ts apps/web/app/simulations/c8-ch02-a03-fungi-and-its-development/page.tsx apps/web/lib/curriculumSearch.generated.ts tests/unit/fungi-development-route.test.ts tests/unit/simulation-viewer-registry.test.ts tests/unit/simulation-availability.test.ts
git commit -m "feat: launch fungi development class"
```

### Task 6: Browser acceptance, visual QA, and final verification

**Files:**
- Create: `tests/e2e/fungi-development.spec.ts`
- Create: `reports/visual-audit/screenshots/c8-ch02-a03-fungi-and-its-development.png`
- Modify generated quality artifacts only if the repository’s report command requires them.

- [ ] **Step 1: Write failing Playwright acceptance**

The test launches the canonical route, starts browser mode, completes representative classification, condition, timeline, yeast, safety, and final-quiz actions through semantic controls, verifies corrective feedback and captions, reaches `Mission Complete: Fungi Explorer`, opens the sandbox, restarts, and checks for console/page errors.

- [ ] **Step 2: Run the test and confirm RED before final wiring**

Run: `npx playwright test tests/e2e/fungi-development.spec.ts --project=chromium`

Expected: FAIL on the first missing or incomplete acceptance hook.

- [ ] **Step 3: Add only the acceptance hooks needed by real behavior**

Use accessible roles, names, `data-simulation-id`, and `data-stage-id`. Do not add test-only progression shortcuts or controls that fabricate evidence.

- [ ] **Step 4: Run browser and narrow-viewport visual QA**

Start the production or development server, capture the launched forest at a desktop classroom viewport and a narrow tablet viewport, inspect for overlapping HUD, clipped assessment text, unreadable evidence, centre obstruction, missing focus, and console/network errors. Save the representative desktop screenshot to the visual-audit path.

- [ ] **Step 5: Run focused verification**

Run:

```bash
npm test -- tests/unit/fungi-development-model.test.ts tests/unit/fungi-development-content.test.ts tests/unit/fungi-development-experience.test.ts tests/unit/fungi-world.test.ts tests/unit/fungi-development-viewer.test.ts tests/unit/fungi-development-route.test.ts
npm run type-check:packages
npm --workspace apps/web run type-check
npm run narration:validate
npm run catalog:validate
npm run simulations:validate
npx playwright test tests/e2e/fungi-development.spec.ts --project=chromium
```

Expected: all commands PASS.

- [ ] **Step 6: Run the root gate and inspect final diff**

Run: `npm run verify`

Expected: PASS. If an unrelated dirty-worktree failure remains, record its exact command and evidence separately; do not weaken the fungi tests. Then run `git diff --check`, `git status --short`, and inspect every fungi diff.

- [ ] **Step 7: Request two-stage review and address verified findings**

Dispatch one spec-compliance reviewer and one code-quality reviewer. Apply only findings confirmed against the code and rerun the smallest affected test plus the focused verification set.

- [ ] **Step 8: Commit acceptance evidence**

```bash
git add tests/e2e/fungi-development.spec.ts reports/visual-audit/screenshots/c8-ch02-a03-fungi-and-its-development.png
git commit -m "test: verify fungi development experience"
```
