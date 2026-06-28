# Showcase Release Governance and VR Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a professional XR School showcase with reliable Quest navigation, strict simulation release levels, and a searchable curriculum/concept catalog.

**Architecture:** Quest input behavior is isolated behind pure navigation helpers and wired into the existing Three.js pollination viewer. Release maturity and curriculum entities live in the shared schema/content packages; deterministic web index generation feeds a client-side searchable catalog. Every task is an independently tested commit pushed to `main`, followed by GitHub Actions/Vercel production verification.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 15, Three.js/WebXR, Vitest, TypeSpec, GitHub Actions, Vercel

---

## File Structure

- `apps/web/lib/xrNavigation.ts` — pure controller selection, snap-turn, and Back-action state transitions.
- `apps/web/components/simulations/PollinationViewer.tsx` — Three.js/WebXR controller and left-panel wiring.
- `packages/simulation-schema/src/index.ts` — release maturity, course, chapter, concept, and search-document contracts and validators.
- `packages/simulation-content/src/modules.ts` — implemented module maturity classifications.
- `packages/simulation-content/src/curriculum.ts` — canonical courses, chapters, and learning concepts for implemented modules.
- `packages/simulation-content/src/index.ts` — content exports.
- `scripts/generate-web-catalog.mjs` — deterministic catalog and curriculum search-index generator.
- `apps/web/lib/scienceCatalog.generated.ts` — generated browser catalog.
- `apps/web/lib/curriculumSearch.generated.ts` — generated searchable curriculum data.
- `apps/web/lib/simulationAvailability.ts` — maturity labels and launch gating.
- `apps/web/lib/curriculumSearch.ts` — pure search ranking and filtering.
- `apps/web/components/catalog/SimulationCatalog.tsx` — interactive hybrid showcase/catalog.
- `apps/web/app/simulations/page.tsx` — catalog route shell.
- `apps/web/app/page.tsx` — professional product entry page.
- `apps/web/app/globals.css` — shared responsive visual system.
- `tests/unit/xr-navigation.test.ts` — Quest input behavior.
- `tests/unit/pollination-viewer-feedback.test.ts` — viewer integration regressions.
- `tests/unit/simulation-release-policy.test.ts` — maturity/evidence policy.
- `tests/unit/curriculum-content.test.ts` — curriculum reference integrity.
- `tests/unit/curriculum-search.test.ts` — search ranking and filters.
- `tests/unit/web-catalog-generator.test.ts` — generated index contract.
- `tests/unit/simulation-availability.test.ts` — public launch gating.
- `tests/unit/showcase-catalog.test.ts` — showcase rendering contract.

## Release 0: Baseline

### Task 1: Merge and deploy the existing product baseline

**Files:**
- Commit: all currently modified and untracked product files
- Exclude: `.DS_Store`, `**/.DS_Store`, `.superpowers/`

- [ ] **Step 1: Confirm ignored transient files are absent from status**

Run:

```bash
git status --short
git check-ignore .DS_Store docs/.DS_Store .superpowers/
```

Expected: all three transient paths are ignored; only product files are shown by `git status`.

- [ ] **Step 2: Run the full local quality gate**

Run:

```bash
npm run quality
npm --workspace apps/web run type-check
npm --workspace apps/web run build
```

Expected: catalog validation reports 497 rows, 176 existing tests pass, TypeScript passes, and Next.js produces a production build.

- [ ] **Step 3: Commit the baseline**

Run:

```bash
git add .github .speckit apps contracts docs generated package.json package-lock.json packages scripts tests vitest.config.ts
git commit -m "release: establish simulation catalog baseline"
```

Expected: one baseline commit; no product file remains untracked.

- [ ] **Step 4: Push and verify production**

Run:

```bash
git push origin main
gh run list --branch main --limit 5
gh run watch --exit-status
```

Expected: Quality and Deploy to Vercel complete successfully. Open the production deployment and verify `/`, `/simulations`, and `/simulations/pollination`.

## Release 1: Intentional VR Button Selection

### Task 2: Require a controller-ray hit before stage navigation

**Files:**
- Create: `apps/web/lib/xrNavigation.ts`
- Modify: `apps/web/components/simulations/PollinationViewer.tsx`
- Test: `tests/unit/xr-navigation.test.ts`
- Test: `tests/unit/pollination-viewer-feedback.test.ts`

- [ ] **Step 1: Write failing selection tests**

```ts
import { describe, expect, it } from 'vitest';
import { resolveControllerSelection } from '../../apps/web/lib/xrNavigation';

describe('resolveControllerSelection', () => {
  it('does nothing when the controller ray hits no navigation button', () => {
    expect(resolveControllerSelection(undefined)).toBe('none');
  });

  it('maps only named navigation buttons to stage actions', () => {
    expect(resolveControllerSelection('btn-next')).toBe('next');
    expect(resolveControllerSelection('btn-prev')).toBe('previous');
    expect(resolveControllerSelection('cue-card')).toBe('none');
  });
});
```

Add a source regression asserting `PollinationViewer.tsx` no longer contains an `else { advanceStage(); }` fallback and does contain target hover feedback.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npx vitest run tests/unit/xr-navigation.test.ts tests/unit/pollination-viewer-feedback.test.ts
```

Expected: FAIL because `xrNavigation.ts` and `resolveControllerSelection` do not exist.

- [ ] **Step 3: Implement minimal selection behavior**

```ts
export type ControllerSelection = 'next' | 'previous' | 'none';

export function resolveControllerSelection(objectName?: string): ControllerSelection {
  if (objectName === 'btn-next') return 'next';
  if (objectName === 'btn-prev') return 'previous';
  return 'none';
}
```

In `onCtrlSelect`, pass the nearest hit name to the helper and invoke a stage action only for `next` or `previous`. In the animation loop, raycast both controllers and set the hit button emissive intensity to `0.8`; reset non-hit buttons to `0.25`.

- [ ] **Step 4: Verify GREEN and the full gate**

Run:

```bash
npx vitest run tests/unit/xr-navigation.test.ts tests/unit/pollination-viewer-feedback.test.ts
npm run quality
npm --workspace apps/web run build
```

Expected: focused tests and full quality/build pass.

- [ ] **Step 5: Commit, push, deploy, and report Release 1**

Run:

```bash
git add apps/web/lib/xrNavigation.ts apps/web/components/simulations/PollinationViewer.tsx tests/unit/xr-navigation.test.ts tests/unit/pollination-viewer-feedback.test.ts
git commit -m "fix: require intentional VR navigation selection"
git push origin main
gh run watch --exit-status
```

Expected: production deployment succeeds; browser smoke check confirms pollination still loads. Report the commit and deployment before Task 3.

## Release 2: Joystick View Control

### Task 3: Add comfort-safe snap rotation

**Files:**
- Modify: `apps/web/lib/xrNavigation.ts`
- Modify: `apps/web/components/simulations/PollinationViewer.tsx`
- Modify: `tests/unit/xr-navigation.test.ts`
- Modify: `tests/unit/pollination-viewer-feedback.test.ts`

- [ ] **Step 1: Write failing snap-turn tests**

```ts
import { updateSnapTurn } from '../../apps/web/lib/xrNavigation';

it('emits one 30 degree turn per intentional thumbstick deflection', () => {
  expect(updateSnapTurn(0.8, false)).toEqual({ radians: -Math.PI / 6, latched: true });
  expect(updateSnapTurn(0.8, true)).toEqual({ radians: 0, latched: true });
  expect(updateSnapTurn(0.1, true)).toEqual({ radians: 0, latched: false });
  expect(updateSnapTurn(-0.8, false)).toEqual({ radians: Math.PI / 6, latched: true });
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/xr-navigation.test.ts
```

Expected: FAIL because `updateSnapTurn` is missing.

- [ ] **Step 3: Implement snap-turn state and WebXR wiring**

```ts
const SNAP_TURN_DEAD_ZONE = 0.65;
const SNAP_TURN_RESET_ZONE = 0.25;
const SNAP_TURN_RADIANS = Math.PI / 6;

export function updateSnapTurn(axisX: number, latched: boolean) {
  if (Math.abs(axisX) <= SNAP_TURN_RESET_ZONE) return { radians: 0, latched: false };
  if (latched || Math.abs(axisX) < SNAP_TURN_DEAD_ZONE) return { radians: 0, latched };
  return {
    radians: axisX > 0 ? -SNAP_TURN_RADIANS : SNAP_TURN_RADIANS,
    latched: true,
  };
}
```

Create a `playerRig` group, parent the camera and XR controllers to it, read `session.inputSources[*].gamepad.axes`, and apply emitted rotation to `playerRig.rotation.y`.

- [ ] **Step 4: Verify and release**

Run:

```bash
npx vitest run tests/unit/xr-navigation.test.ts tests/unit/pollination-viewer-feedback.test.ts
npm run quality
npm --workspace apps/web run build
git add apps/web/lib/xrNavigation.ts apps/web/components/simulations/PollinationViewer.tsx tests/unit/xr-navigation.test.ts tests/unit/pollination-viewer-feedback.test.ts
git commit -m "feat: add Quest snap-turn navigation"
git push origin main
gh run watch --exit-status
```

Expected: production succeeds; report Release 2 before Task 4.

## Release 3: B/X Back Navigation

### Task 4: Map Quest secondary buttons to deterministic Back behavior

**Files:**
- Modify: `apps/web/lib/xrNavigation.ts`
- Modify: `apps/web/components/simulations/PollinationViewer.tsx`
- Modify: `tests/unit/xr-navigation.test.ts`

- [ ] **Step 1: Write failing Back tests**

```ts
import { resolveBackAction, updateButtonLatch } from '../../apps/web/lib/xrNavigation';

it('returns to the previous stage or exits from stage zero', () => {
  expect(resolveBackAction(3)).toBe('previous');
  expect(resolveBackAction(0)).toBe('exit');
});

it('fires a held secondary button only once', () => {
  expect(updateButtonLatch(true, false)).toEqual({ pressed: true, latched: true });
  expect(updateButtonLatch(true, true)).toEqual({ pressed: false, latched: true });
  expect(updateButtonLatch(false, true)).toEqual({ pressed: false, latched: false });
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/xr-navigation.test.ts
```

Expected: FAIL because Back helpers are missing.

- [ ] **Step 3: Implement and wire Back**

```ts
export function resolveBackAction(stageIndex: number) {
  return stageIndex > 0 ? 'previous' as const : 'exit' as const;
}

export function updateButtonLatch(isDown: boolean, latched: boolean) {
  if (!isDown) return { pressed: false, latched: false };
  return { pressed: !latched, latched: true };
}
```

Read gamepad buttons 1 and 4 when present to cover Quest B/X mappings. For `previous`, call `retreatStage`. For `exit`, end the XR session and assign `window.location.href = '/simulations'`.

- [ ] **Step 4: Verify and release**

Run:

```bash
npx vitest run tests/unit/xr-navigation.test.ts tests/unit/pollination-viewer-feedback.test.ts
npm run quality
npm --workspace apps/web run build
git add apps/web/lib/xrNavigation.ts apps/web/components/simulations/PollinationViewer.tsx tests/unit/xr-navigation.test.ts tests/unit/pollination-viewer-feedback.test.ts
git commit -m "feat: add Quest back-button navigation"
git push origin main
gh run watch --exit-status
```

Expected: production succeeds; report Release 3 before Task 5.

## Release 4: Left-Side VR Navigation

### Task 5: Move stage controls to a readable left-side panel

**Files:**
- Modify: `apps/web/components/simulations/PollinationViewer.tsx`
- Modify: `tests/unit/pollination-viewer-feedback.test.ts`

- [ ] **Step 1: Write a failing layout regression**

Assert the viewer contains a named `navigationPanel`, positions it with a negative X coordinate, adds both buttons to the panel, and rotates the panel toward the XR camera.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/pollination-viewer-feedback.test.ts
```

Expected: FAIL because `navigationPanel` does not exist.

- [ ] **Step 3: Implement the panel**

Create a `THREE.Group` named `navigationPanel`, position it at `(-1.15, 1.35, -1.65)`, stack Previous above Next, add a subtle backing plane, and add the group to the scene. Keep `interactables` as the button meshes and orient the group—not each button—toward the active camera.

- [ ] **Step 4: Verify and release**

Run:

```bash
npx vitest run tests/unit/pollination-viewer-feedback.test.ts tests/unit/xr-navigation.test.ts
npm run quality
npm --workspace apps/web run build
git add apps/web/components/simulations/PollinationViewer.tsx tests/unit/pollination-viewer-feedback.test.ts
git commit -m "feat: move VR navigation to left panel"
git push origin main
gh run watch --exit-status
```

Expected: production succeeds; browser visual smoke check confirms the page remains usable. Report Release 4 before Task 6.

## Release 5: Release Governance

### Task 6: Enforce simulation maturity and honest launch gating

**Files:**
- Modify: `packages/simulation-schema/src/index.ts`
- Modify: `packages/simulation-content/src/modules.ts`
- Modify: `scripts/generate-web-catalog.mjs`
- Modify: `apps/web/lib/simulationAvailability.ts`
- Modify: `tests/unit/simulation-modules.test.ts`
- Create: `tests/unit/simulation-release-policy.test.ts`
- Modify: `tests/unit/simulation-availability.test.ts`
- Modify: `tests/unit/web-catalog-generator.test.ts`

- [ ] **Step 1: Write failing maturity-policy tests**

```ts
import {
  canLaunchSimulation,
  isSchoolStable,
  validateSimulationRelease,
} from '../../packages/simulation-schema/src/index';

it('gates unfinished simulations and reserves school stable for validated evidence', () => {
  expect(canLaunchSimulation('catalogued')).toBe(false);
  expect(canLaunchSimulation('inDevelopment')).toBe(false);
  expect(canLaunchSimulation('internalQA')).toBe(true);
  expect(isSchoolStable('pilotReady', 'schoolValidated')).toBe(false);
  expect(isSchoolStable('schoolValidated', 'schoolValidated')).toBe(true);
  expect(validateSimulationRelease('schoolValidated', 'expertDesigned')).toContain(
    'schoolValidated maturity requires schoolValidated or researchBacked evidence',
  );
});
```

Update availability tests to expect only canonical implemented modules as launchable and generated PDF rows as `catalogued`.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/simulation-release-policy.test.ts tests/unit/simulation-availability.test.ts tests/unit/web-catalog-generator.test.ts
```

Expected: FAIL because maturity types and gating do not exist.

- [ ] **Step 3: Implement release contracts**

```ts
export const VALID_SIMULATION_RELEASE_MATURITIES = [
  'catalogued',
  'inDevelopment',
  'internalQA',
  'pilotReady',
  'schoolValidated',
] as const;

export type SimulationReleaseMaturity =
  (typeof VALID_SIMULATION_RELEASE_MATURITIES)[number];

export function canLaunchSimulation(maturity: SimulationReleaseMaturity) {
  return maturity === 'internalQA' || maturity === 'pilotReady' || maturity === 'schoolValidated';
}

export function isSchoolStable(
  maturity: SimulationReleaseMaturity,
  evidence: SimulationModuleRecord['evidenceConfidenceLevel'],
) {
  return maturity === 'schoolValidated'
    && (evidence === 'schoolValidated' || evidence === 'researchBacked');
}
```

Add `releaseMaturity` to catalog and module records. Classify the five bespoke modules as `internalQA`; classify all generated PDF rows as `catalogued`. Replace the current “every row launchable” availability logic with gated sections.

- [ ] **Step 4: Verify and release**

Run:

```bash
npm run web-catalog:generate
npx vitest run tests/unit/simulation-release-policy.test.ts tests/unit/simulation-availability.test.ts tests/unit/web-catalog-generator.test.ts tests/unit/simulation-modules.test.ts
npm run quality
npm --workspace apps/web run build
git add packages/simulation-schema/src/index.ts packages/simulation-content/src/modules.ts scripts/generate-web-catalog.mjs apps/web/lib/scienceCatalog.generated.ts apps/web/lib/simulationAvailability.ts tests/unit
git commit -m "feat: enforce simulation release maturity"
git push origin main
gh run watch --exit-status
```

Expected: production succeeds and unfinished rows no longer appear launch-ready. Report Release 5 before Task 7.

## Release 6: Curriculum Intelligence and Professional Catalog

### Task 7: Build validated curriculum content and search

**Files:**
- Modify: `packages/simulation-schema/src/index.ts`
- Create: `packages/simulation-content/src/curriculum.ts`
- Modify: `packages/simulation-content/src/index.ts`
- Modify: `scripts/generate-web-catalog.mjs`
- Create: `apps/web/lib/curriculumSearch.generated.ts`
- Create: `apps/web/lib/curriculumSearch.ts`
- Create: `tests/unit/curriculum-content.test.ts`
- Create: `tests/unit/curriculum-search.test.ts`
- Modify: `tests/unit/web-catalog-generator.test.ts`

- [ ] **Step 1: Write failing schema, integrity, and ranking tests**

Create fixtures for pollination, circuits, matter, food sources, and solubility. Assert:

```ts
expect(searchCurriculum(index, { query: 'fertilisation' })[0].title)
  .toBe('Plant Pollination & Growth Cycle');
expect(searchCurriculum(index, { query: 'current', subject: 'physics' })[0].href)
  .toBe('/simulations/circuit');
expect(validateCurriculumContent(content)).toEqual([]);
```

Also assert exact-title results rank above alias and keyword matches, and class/subject/maturity filters are combined.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/curriculum-content.test.ts tests/unit/curriculum-search.test.ts tests/unit/web-catalog-generator.test.ts
```

Expected: FAIL because curriculum records, validation, generation, and search do not exist.

- [ ] **Step 3: Implement contracts and canonical records**

Add the approved `CourseRecord`, `CurriculumChapterRecord`, `LearningConceptRecord`, and `CurriculumSearchDocument` interfaces. Implement reference-integrity validation. Add canonical records for the concepts linked by the five implemented modules and generate course/chapter containers for Classes 5, 6, and 9 plus shared Class 6–10 showcase modules.

- [ ] **Step 4: Generate and search the index**

Export `renderCurriculumSearchSource` from `scripts/generate-web-catalog.mjs`. Tokenize normalized titles, aliases, descriptions, subjects, chapters, and keywords. Implement:

```ts
export function searchCurriculum(
  documents: readonly CurriculumSearchDocument[],
  filters: CurriculumSearchFilters,
) {
  const query = normalize(filters.query ?? '');
  return documents
    .filter(document => matchesFilters(document, filters))
    .map(document => ({ document, score: scoreDocument(document, query) }))
    .filter(result => !query || result.score > 0)
    .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title))
    .map(result => result.document);
}
```

- [ ] **Step 5: Verify curriculum/search GREEN**

Run:

```bash
npm run web-catalog:generate
npx vitest run tests/unit/curriculum-content.test.ts tests/unit/curriculum-search.test.ts tests/unit/web-catalog-generator.test.ts
```

Expected: all curriculum and search tests pass.

### Task 8: Build the hybrid showcase/catalog UI

**Files:**
- Create: `apps/web/components/catalog/SimulationCatalog.tsx`
- Modify: `apps/web/app/simulations/page.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/globals.css`
- Create: `tests/unit/showcase-catalog.test.ts`

- [ ] **Step 1: Write failing showcase source-contract tests**

Assert the catalog contains a concept search input, class/subject/maturity filters, release/evidence badges, disabled launch reasons, course groupings, and the approved headline “Explore the science curriculum”.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/showcase-catalog.test.ts
```

Expected: FAIL because `SimulationCatalog.tsx` does not exist.

- [ ] **Step 3: Implement the client catalog**

Build a controlled search/filter component using `searchCurriculum`. Use semantic buttons, labels, status text, and links. Render featured `internalQA` or higher simulations separately from catalogued concepts. Never wrap disabled items in a launch link.

- [ ] **Step 4: Implement the professional visual system**

Replace inline page styling with responsive classes in `globals.css`: deep navy surfaces, emerald evidence accents, strong typographic hierarchy, 44px minimum controls, visible focus rings, and a two-column desktop/one-column Quest Browser layout. Use existing product content and CSS gradients; add no external asset dependency.

- [ ] **Step 5: Verify the final UI**

Run:

```bash
npx vitest run tests/unit/showcase-catalog.test.ts tests/unit/curriculum-search.test.ts tests/unit/simulation-availability.test.ts
npm run quality
npm --workspace apps/web run type-check
npm --workspace apps/web run build
```

Expected: all tests, type checks, and production build pass.

- [ ] **Step 6: Run browser acceptance**

Start the production build locally and verify:

- `/` has the new product hero and one primary library action.
- `/simulations` searches “fertilisation”, “current”, “matter”, and “solubility”.
- Class, subject, and maturity filters narrow results.
- Catalogued rows have no launch link.
- Pollination remains launchable with `Internal QA` labeling.
- Mobile/Quest Browser width has no horizontal overflow.

- [ ] **Step 7: Commit, push, deploy, and report Release 6**

Run:

```bash
git add packages/simulation-schema packages/simulation-content scripts/generate-web-catalog.mjs apps/web/app apps/web/components/catalog apps/web/lib tests/unit
git commit -m "feat: launch searchable curriculum showcase"
git push origin main
gh run watch --exit-status
```

Expected: Quality and Deploy to Vercel pass. Verify the production URL with the same search and filtering smoke tests, then report the final commit, deployment URL, live behaviors, and the remaining headset acceptance checklist.

## Final Verification

- [ ] Run `git status --short` and confirm the product worktree is clean.
- [ ] Run `npm run quality`, `npm --workspace apps/web run type-check`, and `npm --workspace apps/web run build`.
- [ ] Confirm all seven release commits are on `origin/main`.
- [ ] Confirm the latest production deployment serves the final commit.
- [ ] Record Quest-only acceptance checks: off-target trigger, snap rotation, B/X Back, left-side panel, frame rate, and comfort.
