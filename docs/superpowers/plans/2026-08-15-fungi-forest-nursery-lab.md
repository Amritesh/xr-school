# Forest Nursery Outbreak Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fungi click-tour with a persistent, adjustable, camera-directed forest nursery investigation in which learner manipulations produce continuous biological consequences and honest evidence.

**Architecture:** Keep the canonical route/content/assessment, but split the experience into pure scientific calculations, an immutable experiment session, a declarative mission director, a bounded camera controller, a persistent procedural world, normalized manipulation tools, and a thin React composition. The browser and XR paths dispatch the same action IDs; the world only projects validated state and never awards evidence.

**Tech Stack:** TypeScript, React/Next.js, Three.js/WebXR, Vitest, Playwright, existing simulation-runtime/content/schema packages.

---

## File map

- `packages/simulation-runtime/src/models/fungalGrowthExperiment.ts` — pure continuous fungal-development and yeast/decomposition calculations.
- `packages/simulation-runtime/src/models/fungiExperimentSession.ts` — immutable trial, observation, prediction, comparison, and reset state.
- `packages/simulation-runtime/src/index.ts` — public runtime exports.
- `apps/web/lib/fungi/fungiExperienceDirector.ts` — declarative seven-mission journey, gates, hints, and action normalization.
- `apps/web/lib/fungi/fungiCameraController.ts` — responsive framing, constrained orbit/zoom, focus/reset, transition ownership.
- `apps/web/lib/fungi/fungiInteractionTools.ts` — pointer/touch/keyboard/XR manipulation state machines.
- `apps/web/lib/world-builder/fungiNurseryWorld.ts` — persistent five-landmark clearing and continuous biological projection.
- `apps/web/components/simulations/FungiDevelopmentViewer.tsx` — thin shared-runtime owner and experience composition.
- `apps/web/components/simulations/fungi-nursery-lab.css` — protected visual space and responsive tool/assessment surfaces.
- `tests/unit/fungal-growth-experiment.test.ts` — scientific reference and validation tests.
- `tests/unit/fungi-experiment-session.test.ts` — trial honesty/reset tests.
- `tests/unit/fungi-experience-director.test.ts` — mission/gate/action parity tests.
- `tests/unit/fungi-camera-controller.test.ts` — safe-frame/input/transition tests.
- `tests/unit/fungi-interaction-tools.test.ts` — real drag/slider/tool behavior tests.
- `tests/unit/fungi-nursery-world.test.ts` — landmark, causal projection, budget, and disposal tests.
- `tests/unit/fungi-development-viewer.test.ts` — composition and accessible fallback contract.
- `tests/e2e/fungi-nursery-journey.spec.ts` — full adjustable desktop/phone/keyboard journey.

### Task 1: Continuous fungal-development model

**Files:**
- Create: `packages/simulation-runtime/src/models/fungalGrowthExperiment.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/fungal-growth-experiment.test.ts`

- [ ] **Step 1: Write failing scientific reference tests**

```ts
import { describe, expect, it } from 'vitest';
import { evaluateFungalExperiment } from '@xr-school/simulation-runtime';

describe('evaluateFungalExperiment', () => {
  it('makes a warm moist bread trial outgrow a cold dry control', () => {
    const control = evaluateFungalExperiment({
      temperatureC: 8, moisturePercent: 20, substrate: 'bread',
      elapsedHours: 96, inoculumViability: 0.9,
    });
    const treatment = evaluateFungalExperiment({
      temperatureC: 27, moisturePercent: 82, substrate: 'bread',
      elapsedHours: 96, inoculumViability: 0.9,
    });
    expect(treatment.surfaceCoverage).toBeGreaterThan(control.surfaceCoverage + 0.5);
    expect(treatment.sporulationReadiness).toBeGreaterThan(control.sporulationReadiness);
  });

  it('suppresses growth above the viable temperature range', () => {
    const optimum = evaluateFungalExperiment({
      temperatureC: 27, moisturePercent: 85, substrate: 'fruit',
      elapsedHours: 120, inoculumViability: 1,
    });
    const hot = evaluateFungalExperiment({
      temperatureC: 40, moisturePercent: 85, substrate: 'fruit',
      elapsedHours: 120, inoculumViability: 1,
    });
    expect(hot.hyphalExtensionRate).toBeLessThan(optimum.hyphalExtensionRate * 0.3);
  });

  it('advances continuously without decreasing colony coverage', () => {
    const samples = [0, 12, 36, 72, 120].map(elapsedHours =>
      evaluateFungalExperiment({
        temperatureC: 25, moisturePercent: 80, substrate: 'bread',
        elapsedHours, inoculumViability: 0.95,
      }).surfaceCoverage,
    );
    expect(samples).toEqual([...samples].sort((a, b) => a - b));
    expect(new Set(samples).size).toBeGreaterThan(3);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/fungal-growth-experiment.test.ts`

Expected: FAIL because `evaluateFungalExperiment` is not exported.

- [ ] **Step 3: Implement validated deterministic outputs**

```ts
export type FungalSubstrate = 'bread' | 'fruit' | 'dry-paper';

export interface FungalExperimentInput {
  temperatureC: number;
  moisturePercent: number;
  substrate: FungalSubstrate;
  elapsedHours: number;
  inoculumViability: number;
}

export interface FungalExperimentOutput {
  germinationDelayHours: number;
  hyphalExtensionRate: number;
  branchingDensity: number;
  colonyRadiusMm: number;
  surfaceCoverage: number;
  sporulationReadiness: number;
  sporeReleaseIntensity: number;
  phase: 'dormant' | 'germinating' | 'extending' | 'colonising' | 'sporulating';
}
```

Use a smooth temperature response with low/optimum/high anchors, separate moisture and substrate factors, a non-negative post-germination age, and clamped sigmoid coverage. Reject non-finite/out-of-range inputs and unknown substrates before calculating. Export the types and function from `packages/simulation-runtime/src/index.ts`.

- [ ] **Step 4: Add boundary, substrate, determinism, and yeast/decomposition cases**

Add tests proving identical inputs are referentially deterministic, dry paper remains a weak control, invalid values throw precise errors, yeast gas is temperature/time dependent, and decomposition releases nutrients as litter mass falls.

- [ ] **Step 5: Run GREEN and type-check packages**

Run: `npm test -- tests/unit/fungal-growth-experiment.test.ts && npm run type-check:packages`

Expected: all focused tests and all package type-checks pass.

- [ ] **Step 6: Commit**

```bash
git add packages/simulation-runtime/src/models/fungalGrowthExperiment.ts \
  packages/simulation-runtime/src/index.ts tests/unit/fungal-growth-experiment.test.ts
git commit -m "feat: model continuous fungal growth"
```

### Task 2: Honest experiment session and fair comparisons

**Files:**
- Create: `packages/simulation-runtime/src/models/fungiExperimentSession.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/fungi-experiment-session.test.ts`

- [ ] **Step 1: Write failing immutable-session tests**

```ts
const predicted = reduceFungiExperiment(createFungiExperimentSession(), {
  type: 'predict-trial', prediction: 'rapid-growth',
});
const run = reduceFungiExperiment(predicted, {
  type: 'run-trial', input: warmMoistBread,
});
const saved = reduceFungiExperiment(run, { type: 'save-current-trial' });
expect(predicted.firstPrediction).toBe('rapid-growth');
expect(saved.savedTrials).toHaveLength(1);
expect(predicted.savedTrials).toHaveLength(0);
```

Add separate failing tests proving a multiple-variable comparison is `confounded`, one-variable comparison is `fair`, `reset-experiment` preserves mission evidence, `reset-camera` does not change experiment state, and `restart-journey` returns the initial session.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/fungi-experiment-session.test.ts`

Expected: FAIL because the experiment session API does not exist.

- [ ] **Step 3: Implement the reducer**

```ts
export interface SavedFungalTrial {
  id: string;
  input: FungalExperimentInput;
  output: FungalExperimentOutput;
  prediction?: FungalTrialPrediction;
}

export interface FungiExperimentSession {
  firstPrediction?: FungalTrialPrediction;
  latestPrediction?: FungalTrialPrediction;
  currentInput: FungalExperimentInput;
  currentOutput: FungalExperimentOutput;
  savedTrials: SavedFungalTrial[];
  comparison?: { trialIds: [string, string]; quality: 'fair' | 'confounded'; changedVariables: string[] };
  observations: string[];
}
```

Validate actions before mutation, clone nested state, generate stable trial IDs from the next index, and compute outputs through `evaluateFungalExperiment` only.

- [ ] **Step 4: Run GREEN and public API checks**

Run: `npm test -- tests/unit/fungi-experiment-session.test.ts tests/unit/fungal-growth-experiment.test.ts && npm run type-check:packages`

Expected: both suites pass.

- [ ] **Step 5: Commit**

```bash
git add packages/simulation-runtime/src/models/fungiExperimentSession.ts \
  packages/simulation-runtime/src/index.ts tests/unit/fungi-experiment-session.test.ts
git commit -m "feat: track honest fungi experiments"
```

### Task 3: Declarative journey director

**Files:**
- Create: `apps/web/lib/fungi/fungiExperienceDirector.ts`
- Test: `tests/unit/fungi-experience-director.test.ts`

- [ ] **Step 1: Write failing descriptor and gate tests**

```ts
expect(FUNGI_MISSIONS.map(mission => mission.id)).toEqual([
  'diagnose', 'mycelium', 'spore-flight', 'growth-chamber',
  'useful-fungi', 'safety', 'recommendation',
]);
for (const mission of FUNGI_MISSIONS) {
  expect(mission.landmark).toBeTruthy();
  expect(mission.cameraPose.position).toHaveLength(3);
  expect(mission.tools.length).toBeGreaterThan(0);
  expect(mission.resetBoundary).toBeTruthy();
}
```

Add behavior tests proving lens evidence requires crossing specimen bounds, mycelium requires three unique branches, growth requires a fair two-trial comparison, safety requires revealing hidden hyphae, and no pre-labelled answer action advances a mission.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/fungi-experience-director.test.ts`

Expected: FAIL because the director module is absent.

- [ ] **Step 3: Implement mission descriptors and director state**

```ts
export interface FungiMissionDescriptor {
  id: FungiMissionId;
  objective: string;
  landmark: FungiLandmarkId;
  cameraPose: { position: [number, number, number]; target: [number, number, number] };
  tools: readonly FungiToolId[];
  resetBoundary: 'observation' | 'experiment' | 'mission';
  evidenceSatisfied(snapshot: FungiDirectorSnapshot): boolean;
}
```

Expose `createFungiExperienceDirector`, `dispatch`, `snapshot`, `availableActions`, `resetExperiment`, `resetCameraRequest`, and `restartJourney`. Keep feedback model-first: report the biological outcome before hint escalation.

- [ ] **Step 4: Verify action-source parity and atomic rejection**

Test every normalized action through `mouse`, `touch`, `keyboard`, and `xr-controller`; assert equal director snapshots. Test unknown/prototype-key action IDs leave the snapshot unchanged.

- [ ] **Step 5: Run GREEN and app type-check**

Run: `npm test -- tests/unit/fungi-experience-director.test.ts && npm --workspace apps/web run type-check`

Expected: focused tests and web type-check pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/fungi/fungiExperienceDirector.ts tests/unit/fungi-experience-director.test.ts
git commit -m "feat: direct the fungi nursery journey"
```

### Task 4: Bounded responsive camera controller

**Files:**
- Create: `apps/web/lib/fungi/fungiCameraController.ts`
- Test: `tests/unit/fungi-camera-controller.test.ts`

- [ ] **Step 1: Write failing camera behavior tests**

Create a fake DOM target and real `THREE.PerspectiveCamera`. Test that `focusBounds` places the apparatus inside a safe normalized viewport, pointer drag constrains polar/azimuth angles, wheel/pinch clamps distance, `beginManipulation` suspends authored transitions, `resetView` returns to the mission pose, and reduced motion changes pose without tweening.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/fungi-camera-controller.test.ts`

Expected: FAIL because the controller module is absent.

- [ ] **Step 3: Implement camera ownership**

```ts
export interface FungiCameraController {
  focusBounds(bounds: THREE.Box3, pose: FungiCameraPose, options?: { animate?: boolean }): void;
  setViewport(width: number, height: number, safeInsets: CameraSafeInsets): void;
  beginManipulation(): void;
  endManipulation(): void;
  focusSpecimen(): void;
  resetView(): void;
  update(deltaSeconds: number): void;
  snapshot(): FungiCameraSnapshot;
  dispose(): void;
}
```

Use spherical orbit around the authored target, finite min/max distance, collision radius, safe-inset-aware framing, listener ownership, and allocation-free updates.

- [ ] **Step 4: Run GREEN, legacy camera regression, and type-check**

Run: `npm test -- tests/unit/fungi-camera-controller.test.ts tests/unit/guided-camera.test.ts && npm --workspace apps/web run type-check`

Expected: both camera suites pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/fungi/fungiCameraController.ts tests/unit/fungi-camera-controller.test.ts
git commit -m "feat: add bounded fungi lab camera"
```

### Task 5: Persistent nursery world and causal apparatus

**Files:**
- Create: `apps/web/lib/world-builder/fungiNurseryWorld.ts`
- Test: `tests/unit/fungi-nursery-world.test.ts`

- [ ] **Step 1: Write failing persistent-world tests**

Instantiate the world and assert all five named landmarks are simultaneously present, spatially separated, and never removed during mission changes. Project dormant and growing outputs and assert rendered colony radius/branch/sporangia/spore counts change. Assert warm yeast increases dough volume relative to its control and decomposition decreases litter mass while increasing nutrient markers.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/fungi-nursery-world.test.ts`

Expected: FAIL because `createFungiNurseryWorld` is absent.

- [ ] **Step 3: Build the persistent procedural clearing**

```ts
export interface FungiNurseryWorldProjection {
  missionId: FungiMissionId;
  growth: FungalExperimentOutput;
  airflow: { directionRadians: number; strength: number };
  spore: { released: boolean; position: [number, number, number]; outcome: string };
  yeast: { temperatureC: number; elapsedHours: number; inoculated: boolean };
  safetyScanDepth: number;
  highlightedEvidenceIds: readonly string[];
}
```

Author triage, log/microscope, chamber, useful-fungi bench, and safety/gate landmarks in one root. Use instancing for hyphae, colony structures, spores, bubbles, and nutrients. Render labels as canvas textures or reusable text geometry rather than `userData` metadata.

- [ ] **Step 4: Add projection atomicity, metrics, and disposal tests**

Reject invalid projections before mutation, verify no per-frame resource creation, keep baseline under 120 draw calls/250k triangles at maximum projection, and prove every owned geometry/material/listener disposes exactly once across dispose/remount.

- [ ] **Step 5: Run GREEN and world regressions**

Run: `npm test -- tests/unit/fungi-nursery-world.test.ts tests/unit/fungi-world.test.ts tests/unit/world-quality.test.ts && npm --workspace apps/web run type-check`

Expected: all world suites and type-check pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/world-builder/fungiNurseryWorld.ts tests/unit/fungi-nursery-world.test.ts
git commit -m "feat: build persistent fungi nursery world"
```

### Task 6: Direct-manipulation tools

**Files:**
- Create: `apps/web/lib/fungi/fungiInteractionTools.ts`
- Test: `tests/unit/fungi-interaction-tools.test.ts`

- [ ] **Step 1: Write failing tool-state tests**

Test lens intersection accumulation, focus-depth observation layers, fan direction/strength and spore integration, continuous temperature/moisture/time inputs, pipette transfer, organism-token routing including wrong destinations, scanner depth, pointer cancellation, and keyboard/XR equivalents.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/fungi-interaction-tools.test.ts`

Expected: FAIL because the tool controller is absent.

- [ ] **Step 3: Implement normalized tools**

```ts
export type FungiManipulation =
  | { type: 'lens-move'; normalizedX: number; normalizedY: number }
  | { type: 'focus-set'; depth: number }
  | { type: 'fan-set'; directionRadians: number; strength: number }
  | { type: 'spore-release' }
  | { type: 'growth-input-set'; field: 'temperatureC' | 'moisturePercent' | 'elapsedHours'; value: number }
  | { type: 'pipette-drop'; vesselId: 'yeast' | 'control' }
  | { type: 'role-drop'; actorId: FungalUsefulActorId; role: FungalUsefulRole }
  | { type: 'scanner-set'; depth: number };
```

All sources produce these normalized payloads. The tool controller integrates spore motion deterministically and dispatches observations to the director only when geometric/model predicates are satisfied.

- [ ] **Step 4: Run GREEN and director regression**

Run: `npm test -- tests/unit/fungi-interaction-tools.test.ts tests/unit/fungi-experience-director.test.ts && npm --workspace apps/web run type-check`

Expected: both suites pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/fungi/fungiInteractionTools.ts tests/unit/fungi-interaction-tools.test.ts
git commit -m "feat: add fungi lab manipulation tools"
```

### Task 7: Thin viewer and protected responsive interface

**Files:**
- Modify: `apps/web/components/simulations/FungiDevelopmentViewer.tsx`
- Create: `apps/web/components/simulations/fungi-nursery-lab.css`
- Modify: `tests/unit/fungi-development-viewer.test.ts`
- Test: `tests/e2e/fungi-nursery-journey.spec.ts`

- [ ] **Step 1: Replace source-token tests with failing behavior contracts**

Add tests for a viewer controller factory that owns one runtime/world/director/camera/tools set; restart clears journey state, reset experiment preserves mission state, reset camera preserves experiment state, reduced motion reaches the same pose, and disposal is idempotent. Add accessible UI assertions for one mission strip, one tool drawer, one caption region, and no legacy full-height rail.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/unit/fungi-development-viewer.test.ts`

Expected: FAIL because the new composition API and interface are absent.

- [ ] **Step 3: Rewrite the viewer as composition**

The component creates the shared web runtime, `createFungiNurseryWorld`, director, camera, and tools once. It projects immutable snapshots in one effect/update callback, routes all sources through normalized actions, and disposes every owner on unmount. Remove the old seven-stage switch, duplicated full-height rail, auto-labelled answers, and click-to-complete world actions.

- [ ] **Step 4: Implement protected UI**

Create semantic mission strip, collapsible tools, contextual assessment tray, caption/feedback region, evidence notebook, and separate reset experiment/reset camera/replay/restart controls. CSS must leave at least 75% of desktop/tablet canvas unobstructed and use a collapsible bottom sheet at 390px without hiding the active apparatus.

- [ ] **Step 5: Write the end-to-end journey before satisfying it**

In `tests/e2e/fungi-nursery-journey.spec.ts`, visit the canonical slug at 1280×720, 1024×768, and 390×844. Drive lens observation, microscope focus, a failed spore landing, a successful landing, two growth trials with temperature/moisture/substrate/time changes, fair comparison, yeast/control observation, safety scan, and final recommendation. Assert active apparatus bounds do not intersect blocking UI, camera and experiment resets are independent, and progress crosses each mission boundary. Add a keyboard-only fast path.

- [ ] **Step 6: Run focused GREEN checks**

Run: `npm test -- tests/unit/fungi-development-viewer.test.ts tests/unit/fungi-experience-director.test.ts tests/unit/fungi-interaction-tools.test.ts tests/unit/fungi-camera-controller.test.ts tests/unit/fungi-nursery-world.test.ts`

Expected: all focused suites pass.

Run: `npm --workspace apps/web run type-check && npm --workspace apps/web run build`

Expected: web type-check and production build pass.

Run: `npx playwright test tests/e2e/fungi-nursery-journey.spec.ts --project=chromium`

Expected: desktop, tablet, phone, and keyboard cases pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/simulations/FungiDevelopmentViewer.tsx \
  apps/web/components/simulations/fungi-nursery-lab.css \
  tests/unit/fungi-development-viewer.test.ts tests/e2e/fungi-nursery-journey.spec.ts
git commit -m "feat: deliver the fungi nursery investigation"
```

### Task 8: Release validation, independent review, and deployment

**Files:**
- Modify generated catalog/report files only if deterministic generators require it.
- No route, curriculum, or contribution-provenance change is expected.

- [ ] **Step 1: Run the complete verification matrix**

```bash
npm run env:check
npm run contract:compile
npm run spec:drift
npm run build:packages
npm run catalog:validate
npm run web-catalog:generate
npm run simulations:validate
npm run narration:validate:manifests
npm run reports:validate
npm test
npm run type-check:packages
npm run api:test
npm run api:build
npm --workspace apps/web run type-check
npm --workspace apps/web run build
npm run reports:test
npm run reports:check
```

Expected: every command exits 0 and generation leaves no unexplained diff.

- [ ] **Step 2: Run independent spec and quality review loops**

Give reviewers the design spec, this plan, base SHA, and head SHA. Fix every Critical/Important issue, rerun the affected RED/GREEN tests, and obtain re-review approval before continuing.

- [ ] **Step 3: Perform live visual inspection**

Start the production build on port 58211. Inspect the canonical URL at desktop, tablet, and phone widths; exercise orbit/zoom/focus/reset, sliders, failed/successful trials, saved comparison, and the full mission. Capture screenshots for mission 1, growth chamber comparison, safety scan, and final report. Confirm no overlay blocks the active target.

- [ ] **Step 4: Merge without disturbing the user's buoyancy work**

Record main status, stash all main tracked/untracked buoyancy work with a named stash, fast-forward merge `codex/fungi-living-mycelium`, apply the stash, inspect every overlapping file, and verify both fungi and buoyancy registry entries remain. Drop the stash only after the restored dirty state is confirmed.

- [ ] **Step 5: Verify main and deploy locally**

Run the focused fungi suites and web type-check from the integrated main worktree, then serve the verified production build at `http://localhost:58211/simulations/c8-ch02-a03-fungi-and-its-development`. Do not push origin without explicit authorization.

