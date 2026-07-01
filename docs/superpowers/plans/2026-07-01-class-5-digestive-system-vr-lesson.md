# Class 5 Digestive System VR Lesson Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, course-link, verify, and deploy the ten-stage Class 5 digestive-system WebXR lesson described in the approved design.

**Architecture:** A pure TypeScript lesson model defines stages, task evidence, quiz scoring, and completion. A dedicated client-side Three.js viewer renders one stationary body-lab world and maps desktop, touch, keyboard, and WebXR controller selections to that model. Existing module, curriculum, catalog-generation, and release-policy paths promote the current catalog-only slug into an Internal QA course activity.

**Tech Stack:** TypeScript, React 19, Next.js 15, Three.js/WebXR, Vitest, Vercel

---

## File Map

- Create `apps/web/lib/digestiveLesson.ts`: pure lesson content, progress reducer, quiz scoring, and badge rules.
- Create `apps/web/components/simulations/DigestiveSystemViewer.tsx`: Three.js scene, WebXR controls, accessible lesson UI, subtitles, comfort mode, and badge presentation.
- Create `apps/web/app/simulations/c5-ch03-a02-introduction-of-digestive-system/page.tsx`: no-SSR simulation route.
- Create `tests/unit/digestive-lesson.test.ts`: behavioral tests for progression and assessment.
- Create `tests/unit/digestive-viewer-feedback.test.ts`: headset, accessibility, and content regressions.
- Modify `packages/simulation-content/src/modules.ts`: add the canonical launchable simulation module.
- Modify `packages/simulation-content/src/curriculum.ts`: add concepts and Chapter 3 links to the existing Class 5 course.
- Modify `scripts/validate-simulations.mjs`: map the new slug to `DigestiveSystemViewer`.
- Modify `tests/unit/simulation-modules.test.ts`: assert the new module contract.
- Modify `tests/unit/curriculum-content.test.ts`: update graph counts and Class 5 chapter linkage.
- Modify `tests/unit/web-catalog-generator.test.ts`: assert search promotion from catalog candidate to working simulation.
- Modify `apps/web/components/catalog/SimulationCatalog.tsx`: derive headline counts instead of retaining hard-coded “5”.
- Regenerate `apps/web/lib/scienceCatalog.generated.ts` and `apps/web/lib/curriculumSearch.generated.ts`.

### Task 1: Lesson Model

**Files:**
- Create: `tests/unit/digestive-lesson.test.ts`
- Create: `apps/web/lib/digestiveLesson.ts`

- [ ] **Step 1: Write failing stage and pathway tests**

```ts
import {
  DIGESTIVE_PATHWAY,
  DIGESTIVE_STAGES,
  createDigestiveProgress,
  isStageComplete,
  recordStageAction,
} from '../../apps/web/lib/digestiveLesson';

expect(DIGESTIVE_STAGES).toHaveLength(10);
expect(DIGESTIVE_PATHWAY).toEqual([
  'Mouth', 'Esophagus', 'Stomach', 'Small Intestine',
  'Large Intestine', 'Rectum', 'Anus',
]);

let progress = createDigestiveProgress();
progress = recordStageAction(progress, 'esophagus', 'peristalsis-wave-1');
progress = recordStageAction(progress, 'esophagus', 'peristalsis-wave-2');
expect(isStageComplete(progress, 'esophagus')).toBe(false);
progress = recordStageAction(progress, 'esophagus', 'peristalsis-wave-3');
expect(isStageComplete(progress, 'esophagus')).toBe(true);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npx vitest run tests/unit/digestive-lesson.test.ts`

Expected: FAIL because `apps/web/lib/digestiveLesson.ts` does not exist.

- [ ] **Step 3: Implement the stage model**

Define `DigestiveStage`, `DigestiveProgress`, `DIGESTIVE_PATHWAY`, and ten `DIGESTIVE_STAGES`. Each stage includes `id`, `title`, `subtitle`, `instruction`, and `requiredActionIds`. Implement immutable `createDigestiveProgress`, `recordStageAction`, and `isStageComplete`; reject unknown stage/action IDs.

- [ ] **Step 4: Add failing assessment and badge tests**

```ts
for (const [questionId, answerId] of [
  ['digestion-begins', 'mouth'],
  ['mixes-food', 'stomach'],
  ['absorbs-nutrients', 'small-intestine'],
  ['absorbs-water', 'large-intestine'],
  ['produces-bile', 'liver'],
] as const) {
  progress = answerQuizQuestion(progress, questionId, answerId);
}
expect(getQuizScore(progress)).toEqual({ correct: 5, total: 5 });
expect(hasDigestiveExplorerBadge(progress)).toBe(true);
```

- [ ] **Step 5: Run the focused test and confirm RED**

Run: `npx vitest run tests/unit/digestive-lesson.test.ts`

Expected: FAIL because assessment functions are not implemented.

- [ ] **Step 6: Implement quiz scoring and badge eligibility**

Add five `DIGESTIVE_QUIZ_QUESTIONS`, immutable `answerQuizQuestion`, `getQuizScore`, and `hasDigestiveExplorerBadge`. Badge eligibility requires every stage task and all five quiz answers, but does not require a perfect score.

- [ ] **Step 7: Run the focused test and confirm GREEN**

Run: `npx vitest run tests/unit/digestive-lesson.test.ts`

Expected: PASS.

### Task 2: Curriculum and Release Promotion

**Files:**
- Modify: `tests/unit/simulation-modules.test.ts`
- Modify: `tests/unit/curriculum-content.test.ts`
- Modify: `tests/unit/web-catalog-generator.test.ts`
- Modify: `packages/simulation-content/src/modules.ts`
- Modify: `packages/simulation-content/src/curriculum.ts`

- [ ] **Step 1: Write failing module and curriculum assertions**

```ts
const module = SIMULATION_MODULES.find(
  item => item.slug === 'c5-ch03-a02-introduction-of-digestive-system',
);
expect(module?.stages).toBe(10);
expect(module?.expectedDurationMinutes).toBe(10);
expect(module?.conceptIds).toContain('concept-digestive-system');

const class5 = COURSES.find(course => course.id === 'course-cbse-c5-environmental-science');
expect(class5?.chapterIds).toContain('chapter-cbse-c5-from-tasting-to-digesting');
expect(class5?.simulationIds).toContain('sim-c05-ch03-a02-introduction-of-digestive-system');
```

- [ ] **Step 2: Run the three tests and confirm RED**

Run: `npx vitest run tests/unit/simulation-modules.test.ts tests/unit/curriculum-content.test.ts tests/unit/web-catalog-generator.test.ts`

Expected: FAIL because the working module, concepts, and chapter do not yet exist.

- [ ] **Step 3: Add the module record**

Add `DIGESTIVE_SYSTEM_MODULE` with the existing stable ID/slug, `internalQA`, `strongVrFit`, 10 stages, a 10-minute expected duration, Class 3–5 grade band, CBSE/ICSE boards, low comfort risk, complete teaching script, and the four learning objectives from the design.

- [ ] **Step 4: Add curriculum concepts and Chapter 3**

Add canonical concepts for digestive-system organs, food journey, nutrient absorption, and digestive health. Add `chapter-cbse-c5-from-tasting-to-digesting` as Chapter 3 and append its IDs to the existing Class 5 course.

- [ ] **Step 5: Run the three tests and confirm GREEN**

Run: `npx vitest run tests/unit/simulation-modules.test.ts tests/unit/curriculum-content.test.ts tests/unit/web-catalog-generator.test.ts`

Expected: PASS with a valid curriculum graph and a unique simulation search document.

### Task 3: Dedicated Viewer Contract

**Files:**
- Create: `tests/unit/digestive-viewer-feedback.test.ts`
- Create: `apps/web/components/simulations/DigestiveSystemViewer.tsx`

- [ ] **Step 1: Write the failing viewer contract**

Assert the source contains:

```ts
expect(source).toContain("renderer.xr.setReferenceSpaceType('local-floor')");
expect(source).toContain('renderer.xr.getController(0)');
expect(source).toContain('intersectObjects(interactiveTargets');
expect(source).toContain('playSimulationNarration');
expect(source).toContain('aria-live="polite"');
expect(source).toContain('Comfort mode');
expect(source).toContain('Digestive Explorer');
expect(source).toContain('DIGESTIVE_QUIZ_QUESTIONS');
```

Also assert identifiers for the mouth, esophagus, stomach, liver, gallbladder, pancreas, small intestine, large intestine, rectum, organ hotspots, nutrients, water droplets, and healthy-choice tokens.

- [ ] **Step 2: Run the viewer test and confirm RED**

Run: `npx vitest run tests/unit/digestive-viewer-feedback.test.ts`

Expected: FAIL because `DigestiveSystemViewer.tsx` does not exist.

- [ ] **Step 3: Build the stationary body-lab scene**

Create a single Three.js scene with a lab floor, lights, guide orb, translucent torso, schematic digestive organs, labels, food/bolus, muscle rings, mixer handle, nutrients, blood vessel, water droplets, and sorting tokens. Group stage-specific objects and toggle visibility per stage. Keep interactive meshes in `interactiveTargets` with action IDs in `userData`.

- [ ] **Step 4: Wire WebXR and accessible controls**

Enable `local-floor`, add two controller rays, use raycasting on `select`, and call the same `performAction(actionId)` function used by HTML buttons. Add desktop orbit controls, keyboard-operable buttons, `aria-live` subtitles, mute, comfort mode, restart, previous/next controls, and the Enter VR button when supported.

- [ ] **Step 5: Wire lesson progression and visual feedback**

Use `recordStageAction`, `isStageComplete`, `answerQuizQuestion`, `getQuizScore`, and `hasDigestiveExplorerBadge`. Animate chewing, peristalsis, churning, organ highlighting, nutrient/water transfer, and guide orb motion; reduce amplitudes in comfort mode.

- [ ] **Step 6: Run the focused model and viewer tests and confirm GREEN**

Run: `npx vitest run tests/unit/digestive-lesson.test.ts tests/unit/digestive-viewer-feedback.test.ts`

Expected: PASS.

### Task 4: Route, Validator, Catalog UI, and Generated Search Data

**Files:**
- Create: `apps/web/app/simulations/c5-ch03-a02-introduction-of-digestive-system/page.tsx`
- Modify: `scripts/validate-simulations.mjs`
- Modify: `apps/web/components/catalog/SimulationCatalog.tsx`
- Regenerate: `apps/web/lib/scienceCatalog.generated.ts`
- Regenerate: `apps/web/lib/curriculumSearch.generated.ts`

- [ ] **Step 1: Add a no-SSR route**

```tsx
'use client';

import dynamic from 'next/dynamic';

const DigestiveSystemViewer = dynamic(
  () => import('../../../components/simulations/DigestiveSystemViewer'),
  { ssr: false },
);

export default function DigestiveSystemPage() {
  return <DigestiveSystemViewer />;
}
```

- [ ] **Step 2: Register the viewer mapping**

Add:

```js
'c5-ch03-a02-introduction-of-digestive-system': 'DigestiveSystemViewer',
```

to `viewerNameMap` in `scripts/validate-simulations.mjs`.

- [ ] **Step 3: Remove hard-coded launch metrics**

Render `launchableCards.length` for the Internal QA count and use a derived canonical concept count so the catalog accurately shows the sixth working build.

- [ ] **Step 4: Regenerate catalog artifacts**

Run: `npm run web-catalog:generate`

Expected: 497 catalog rows and updated curriculum search documents. The digestive lesson appears once as an Internal QA route, not again as a catalog-only candidate.

- [ ] **Step 5: Run contract and routing tests**

Run: `node scripts/validate-simulations.mjs && npx vitest run tests/unit/simulation-availability.test.ts tests/unit/web-catalog-generator.test.ts tests/unit/showcase-catalog.test.ts`

Expected: PASS and six valid simulation pages/viewers.

### Task 5: Full Verification and Visual QA

**Files:**
- Modify only files implicated by verified failures.

- [ ] **Step 1: Run type-check and all tests**

Run: `npm --workspace apps/web run type-check && npm test`

Expected: TypeScript exit 0 and all Vitest files pass.

- [ ] **Step 2: Run production quality checks**

Run: `npm run catalog:validate && node scripts/validate-simulations.mjs && npm run build`

Expected: valid 497-row catalog, valid six-simulation contract, and successful Next.js production build.

- [ ] **Step 3: Browser smoke-test the lesson**

Start the production app and inspect:

- catalog shows the sixth launchable build;
- direct route loads without console errors;
- all ten stages are reachable;
- task gating, quiz score, restart, subtitles, and badge work;
- responsive layout remains readable at desktop and Quest-like viewport sizes.

- [ ] **Step 4: Review the implementation diff**

Compare the finished diff against the design’s curriculum, interaction, accessibility, comfort, assessment, and cleanup requirements. Fix every critical or important discrepancy and rerun Steps 1–3.

### Task 6: Commit, Integrate, and Deploy

**Files:**
- No new files unless deployment verification finds a scoped defect.

- [ ] **Step 1: Commit only lesson files**

```bash
git add apps/web/app/simulations/c5-ch03-a02-introduction-of-digestive-system \
  apps/web/components/simulations/DigestiveSystemViewer.tsx \
  apps/web/components/catalog/SimulationCatalog.tsx \
  apps/web/lib/digestiveLesson.ts \
  apps/web/lib/curriculumSearch.generated.ts \
  packages/simulation-content/src/modules.ts \
  packages/simulation-content/src/curriculum.ts \
  scripts/validate-simulations.mjs \
  tests/unit/digestive-lesson.test.ts \
  tests/unit/digestive-viewer-feedback.test.ts \
  tests/unit/simulation-modules.test.ts \
  tests/unit/curriculum-content.test.ts \
  tests/unit/web-catalog-generator.test.ts
git commit -m "feat: add class 5 digestive system VR lesson"
```

- [ ] **Step 2: Integrate without disturbing the original dirty workspace**

Fast-forward the original `main` worktree only after confirming its unrelated changes do not overlap lesson files. If they overlap, deploy the verified feature branch and leave integration unforced.

- [ ] **Step 3: Deploy the verified production build**

Use the repository’s configured Vercel production workflow or CLI from the isolated feature worktree. Record the resulting production URL.

- [ ] **Step 4: Verify production**

Open the deployed catalog and direct lesson URL, confirm HTTP success and interactive rendering, and report the exact verification evidence.
