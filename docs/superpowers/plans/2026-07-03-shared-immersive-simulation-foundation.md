# Shared Immersive Simulation Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and prove the reusable experience, input, spatial-layout, browser-HUD, and diagnostic foundations required before retouching Pollination, Circuit, and States of Matter.

**Architecture:** Typed schema contracts describe authored lesson stages, normalized input, spatial layout, and interaction affordances. A framework-agnostic lesson session and action router own progression and equivalent input behavior; browser and Quest presentation layers consume snapshots without owning scientific truth. Pure scale and occlusion diagnostics make viewport and Quest ergonomics testable, and the W0 diagnostic world proves the complete foundation before production-world migration.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 15, Three.js/WebXR, Vitest

---

## File Map

- Create `packages/simulation-schema/src/experience.ts`: experience-stage and age-tone contracts plus validation.
- Create `packages/simulation-schema/src/interaction.ts`: normalized-action and interaction-affordance contracts plus validation.
- Create `packages/simulation-schema/src/spatial.ts`: authored scale, reach, clear-view, and cue-bay contracts plus validation.
- Modify `packages/simulation-schema/src/world.ts`: optionally link a migrating world to experience and spatial definitions.
- Modify `packages/simulation-schema/src/index.ts`: export the new contracts and validators.
- Create `packages/simulation-runtime/src/experience/lessonSession.ts`: headless stage/action/evidence state.
- Create `packages/simulation-runtime/src/input/actionRouter.ts`: route equivalent input sources through normalized actions.
- Modify `packages/simulation-runtime/src/index.ts`: export the new runtime APIs.
- Create `apps/web/lib/world-builder/scaleDiagnostics.ts`: pure reach, dimension, and label checks.
- Create `apps/web/lib/world-builder/occlusionDiagnostics.ts`: pure browser-projection occlusion checks.
- Create `apps/web/lib/world-builder/spatialCueSystem.ts`: stable off-axis cue placement and visibility state.
- Create `apps/web/components/simulation-experience/SimulationExperienceShell.tsx`: reusable full-viewport shell.
- Create `apps/web/components/simulation-experience/LaunchPortal.tsx`: shared launch and comfort controls.
- Create `apps/web/components/simulation-experience/BrowserExperienceHud.tsx`: progress, mission, evidence, and utility UI.
- Create `apps/web/components/simulation-experience/simulation-experience.css`: cinematic, unobtrusive, responsive browser styling.
- Modify `apps/web/lib/world-builder/diagnosticWorld.ts`: add the W0 experience and spatial definitions.
- Modify `apps/web/components/simulations/WorldBuilderDiagnosticViewer.tsx`: prove lesson session, shell, cue placement, and diagnostics.
- Create `tests/unit/experience-schema.test.ts`: contract validation.
- Create `tests/unit/lesson-session.test.ts`: stage and evidence behavior.
- Create `tests/unit/action-router.test.ts`: equivalent input and cancellation behavior.
- Create `tests/unit/spatial-experience-diagnostics.test.ts`: reach, label, cue, and occlusion behavior.
- Create `tests/unit/simulation-experience-shell.test.ts`: shared UI and accessibility contract.
- Modify `tests/unit/world-schema.test.ts`: optional graph-link validation.
- Modify `tests/unit/world-diagnostic-viewer.test.ts`: foundation integration contract.

### Task 1: Experience, Interaction, and Spatial Contracts

**Files:**
- Create: `packages/simulation-schema/src/experience.ts`
- Create: `packages/simulation-schema/src/interaction.ts`
- Create: `packages/simulation-schema/src/spatial.ts`
- Modify: `packages/simulation-schema/src/world.ts`
- Modify: `packages/simulation-schema/src/index.ts`
- Create: `tests/unit/experience-schema.test.ts`
- Modify: `tests/unit/world-schema.test.ts`

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  validateExperienceDefinition,
  validateInteractionAffordance,
  validateSpatialLayoutDefinition,
  type ExperienceDefinition,
  type InteractionAffordanceDefinition,
  type SpatialLayoutDefinition,
} from '../../packages/simulation-schema/src/index';

const experience: ExperienceDefinition = {
  id: 'experience-diagnostic',
  gradeTone: 'class6To8',
  objective: 'Compare appearance with physical evidence.',
  stages: [{
    id: 'stage-observe',
    title: 'Observe the sphere',
    cue: 'Watch where the sphere settles.',
    requiredActionIds: ['release-sphere'],
    completionEvidenceIds: ['sphere-settled'],
  }],
};

const affordance: InteractionAffordanceDefinition = {
  id: 'affordance-release-sphere',
  entityId: 'entity-painted-sphere',
  actionId: 'release-sphere',
  supportedActions: ['press'],
  inputSources: ['mouse', 'touch', 'keyboard', 'xr-controller'],
  accessibilityLabel: 'Release the sphere',
};

const spatial: SpatialLayoutDefinition = {
  id: 'spatial-diagnostic',
  metersPerWorldUnit: 1,
  scaleRepresentation: 'literal',
  intendedEyeHeightMeters: 1.6,
  seatedEyeHeightMeters: 1.2,
  movementBoundsMeters: { width: 2, depth: 2 },
  reachMeters: { min: 0.25, max: 0.8 },
  cueBay: { position: [1.1, 1.45, -1.8], fallbackPositions: [[-1.1, 1.45, -1.8]] },
  browserClearView: { x: 0.2, y: 0.12, width: 0.6, height: 0.68 },
  minLabelAngularSizeDegrees: 1.4,
};

describe('immersive experience schema', () => {
  it('accepts complete experience, interaction, and spatial contracts', () => {
    expect(validateExperienceDefinition(experience)).toEqual([]);
    expect(validateInteractionAffordance(affordance)).toEqual([]);
    expect(validateSpatialLayoutDefinition(spatial)).toEqual([]);
  });

  it('rejects stages that can complete without action or evidence', () => {
    expect(validateExperienceDefinition({
      ...experience,
      stages: [{ ...experience.stages[0], requiredActionIds: [], completionEvidenceIds: [] }],
    }).join('\n')).toMatch(/required action.*completion evidence/i);
  });

  it('rejects unreachable or view-blocking spatial definitions', () => {
    expect(validateSpatialLayoutDefinition({
      ...spatial,
      reachMeters: { min: 0.9, max: 0.4 },
      browserClearView: { x: 0, y: 0, width: 1.2, height: 1 },
    }).join('\n')).toMatch(/reach.*clear view/i);
  });
});
```

Add to `tests/unit/world-schema.test.ts`:

```ts
it('validates optional experience and spatial graph links', () => {
  const bundle = validBundle();
  bundle.world.experienceId = 'missing-experience';
  bundle.world.spatialLayoutId = 'missing-spatial';
  expect(validateWorldBundle(bundle)).toEqual(expect.arrayContaining([
    'world-diagnostic: missing experience missing-experience',
    'world-diagnostic: missing spatial layout missing-spatial',
  ]));
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```bash
npx vitest run tests/unit/experience-schema.test.ts tests/unit/world-schema.test.ts
```

Expected: FAIL because the contracts and exports do not exist.

- [ ] **Step 3: Implement focused schema contracts**

Implement the types and validators exactly as exercised above. Validation must also reject duplicate stage IDs, duplicate required actions, unsupported action/source enums, non-finite spatial values, non-positive eye heights, a clear-view rectangle outside normalized `0..1` coordinates, and cue positions containing non-finite coordinates.

Extend `WorldDefinition` with optional `experienceId` and `spatialLayoutId`. Extend `WorldBundle` with optional `experienceDefinitions` and `spatialLayouts`. In `validateWorldBundle`, resolve those references only when the IDs are present so existing worlds remain valid during phased migration.

Export all new values and types from `packages/simulation-schema/src/index.ts`.

- [ ] **Step 4: Run contract tests and confirm GREEN**

Run:

```bash
npx vitest run tests/unit/experience-schema.test.ts tests/unit/world-schema.test.ts
```

Expected: both files PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/simulation-schema/src tests/unit/experience-schema.test.ts tests/unit/world-schema.test.ts
git commit -m "feat: add immersive experience schema contracts"
```

### Task 2: Headless Lesson Session

**Files:**
- Create: `packages/simulation-runtime/src/experience/lessonSession.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Create: `tests/unit/lesson-session.test.ts`

- [ ] **Step 1: Write failing lesson-session tests**

```ts
import { describe, expect, it } from 'vitest';
import { createLessonSession } from '../../packages/simulation-runtime/src/index';
import type { ExperienceDefinition } from '../../packages/simulation-schema/src/index';

const definition: ExperienceDefinition = {
  id: 'experience-test',
  gradeTone: 'class6To8',
  objective: 'Observe two valid results.',
  stages: [
    {
      id: 'stage-one',
      title: 'First',
      cue: 'Perform the first action.',
      requiredActionIds: ['first-action'],
      completionEvidenceIds: ['first-observed'],
    },
    {
      id: 'stage-two',
      title: 'Second',
      cue: 'Transfer the observation.',
      requiredActionIds: ['second-action'],
      completionEvidenceIds: ['transfer-observed'],
    },
  ],
};

describe('lesson session', () => {
  it('requires both meaningful action and observable evidence', () => {
    const session = createLessonSession(definition);
    session.performAction('first-action');
    expect(session.snapshot().stageComplete).toBe(false);
    session.recordEvidence('first-observed');
    expect(session.snapshot().stageComplete).toBe(true);
  });

  it('blocks skipping and rejects actions from another stage', () => {
    const session = createLessonSession(definition);
    expect(() => session.next()).toThrow(/complete/i);
    expect(() => session.performAction('second-action')).toThrow(/current stage/i);
  });

  it('advances, preserves evidence, and restarts deterministically', () => {
    const session = createLessonSession(definition);
    session.performAction('first-action');
    session.recordEvidence('first-observed');
    session.next();
    expect(session.snapshot()).toMatchObject({ stageIndex: 1, stageId: 'stage-two' });
    session.restart();
    expect(session.snapshot()).toMatchObject({
      stageIndex: 0,
      performedActionIds: [],
      recordedEvidenceIds: [],
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npx vitest run tests/unit/lesson-session.test.ts`

Expected: FAIL because `createLessonSession` is not exported.

- [ ] **Step 3: Implement the lesson session**

Expose:

```ts
export interface LessonSnapshot {
  experienceId: string;
  objective: string;
  stageIndex: number;
  stageCount: number;
  stageId: string;
  stageTitle: string;
  cue: string;
  performedActionIds: string[];
  recordedEvidenceIds: string[];
  stageComplete: boolean;
  lessonComplete: boolean;
}

export interface LessonSession {
  snapshot(): LessonSnapshot;
  performAction(actionId: string): LessonSnapshot;
  recordEvidence(evidenceId: string): LessonSnapshot;
  previous(): LessonSnapshot;
  next(): LessonSnapshot;
  restart(): LessonSnapshot;
}
```

Use private `Set<string>` collections, return copied arrays, reject unknown action/evidence IDs, prevent advancing before completion, and mark `lessonComplete` only when the final stage is complete.

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `npx vitest run tests/unit/lesson-session.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/simulation-runtime/src/experience/lessonSession.ts packages/simulation-runtime/src/index.ts tests/unit/lesson-session.test.ts
git commit -m "feat: add headless immersive lesson session"
```

### Task 3: Normalized Action Router

**Files:**
- Create: `packages/simulation-runtime/src/input/actionRouter.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Create: `tests/unit/action-router.test.ts`

- [ ] **Step 1: Write failing router tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createActionRouter } from '../../packages/simulation-runtime/src/index';

describe('normalized action router', () => {
  it.each(['mouse', 'touch', 'keyboard', 'xr-controller'] as const)(
    'routes %s commits through one action handler',
    source => {
      const handler = vi.fn();
      const router = createActionRouter();
      router.register('toggle-switch', handler);
      router.route({
        actionId: 'toggle-switch',
        targetEntityId: 'entity-switch',
        source,
        phase: 'commit',
        stageId: 'stage-circuit',
        timestampMs: 100,
      });
      expect(handler).toHaveBeenCalledOnce();
    },
  );

  it('restores the last valid pose on cancellation', () => {
    const cancel = vi.fn();
    const router = createActionRouter();
    router.register('place-resistor', vi.fn(), cancel);
    router.route({
      actionId: 'place-resistor',
      targetEntityId: 'entity-resistor',
      source: 'xr-controller',
      phase: 'cancel',
      stageId: 'stage-circuit',
      timestampMs: 120,
    });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects unknown actions instead of silently progressing', () => {
    const router = createActionRouter();
    expect(() => router.route({
      actionId: 'unknown',
      targetEntityId: 'entity',
      source: 'mouse',
      phase: 'commit',
      stageId: 'stage',
      timestampMs: 0,
    })).toThrow(/unknown action/i);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npx vitest run tests/unit/action-router.test.ts`

Expected: FAIL because the router does not exist.

- [ ] **Step 3: Implement the router**

Implement `register(actionId, onAction, onCancel?)`, `route(action)`, `unregister(actionId)`, and `clear()`. Reject duplicate registrations, invalid timestamps, and unsupported phases or sources by calling `validateNormalizedAction`. A cancel routes only to `onCancel`; other phases route only to `onAction`.

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `npx vitest run tests/unit/action-router.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/simulation-runtime/src/input/actionRouter.ts packages/simulation-runtime/src/index.ts tests/unit/action-router.test.ts
git commit -m "feat: route equivalent simulation input actions"
```

### Task 4: Scale, Occlusion, and Spatial Cue Diagnostics

**Files:**
- Create: `apps/web/lib/world-builder/scaleDiagnostics.ts`
- Create: `apps/web/lib/world-builder/occlusionDiagnostics.ts`
- Create: `apps/web/lib/world-builder/spatialCueSystem.ts`
- Create: `tests/unit/spatial-experience-diagnostics.test.ts`

- [ ] **Step 1: Write failing diagnostics tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  evaluateReach,
  evaluateLabelAngularSize,
} from '../../apps/web/lib/world-builder/scaleDiagnostics';
import {
  occlusionRatio,
  verifyClearView,
} from '../../apps/web/lib/world-builder/occlusionDiagnostics';
import {
  resolveCuePlacement,
} from '../../apps/web/lib/world-builder/spatialCueSystem';

describe('spatial experience diagnostics', () => {
  it('accepts reachable tools and rejects unreachable ones', () => {
    expect(evaluateReach([0, 1.35, -0.6], [0, 1.35, 0], { min: 0.25, max: 0.8 })).toEqual([]);
    expect(evaluateReach([0, 1.35, -1.2], [0, 1.35, 0], { min: 0.25, max: 0.8 })).toEqual([
      'target distance 1.20m exceeds maximum reach 0.80m',
    ]);
  });

  it('checks readable angular label size', () => {
    expect(evaluateLabelAngularSize(0.08, 1.8, 1.4)).toEqual([]);
    expect(evaluateLabelAngularSize(0.02, 2.5, 1.4).join('')).toMatch(/angular size/);
  });

  it('measures viewport overlap and preserves the clear view', () => {
    const focus = { x: 0.3, y: 0.2, width: 0.4, height: 0.5 };
    expect(occlusionRatio(focus, { x: 0, y: 0.82, width: 1, height: 0.18 })).toBe(0);
    expect(verifyClearView(focus, [{ x: 0.35, y: 0.3, width: 0.2, height: 0.2 }], 0.08)).toHaveLength(1);
  });

  it('chooses the first cue position that does not cover the focus direction', () => {
    expect(resolveCuePlacement({
      primary: [0, 1.4, -1.5],
      fallbacks: [[1.1, 1.4, -1.5], [-1.1, 1.4, -1.5]],
      focusDirection: [0, 0, -1],
      minimumSeparationDegrees: 25,
    })).toEqual([1.1, 1.4, -1.5]);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npx vitest run tests/unit/spatial-experience-diagnostics.test.ts`

Expected: FAIL because the diagnostics do not exist.

- [ ] **Step 3: Implement pure diagnostics**

Use Euclidean distance for reach, `2 * atan(labelHeight / (2 * distance))` for angular size, intersection area divided by focus area for occlusion, and vector-angle separation for cue placement. Reject non-finite or non-positive dimensions rather than returning a plausible result.

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `npx vitest run tests/unit/spatial-experience-diagnostics.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/world-builder/scaleDiagnostics.ts apps/web/lib/world-builder/occlusionDiagnostics.ts apps/web/lib/world-builder/spatialCueSystem.ts tests/unit/spatial-experience-diagnostics.test.ts
git commit -m "feat: add scale and occlusion diagnostics"
```

### Task 5: Shared Browser Experience Shell

**Files:**
- Create: `apps/web/components/simulation-experience/SimulationExperienceShell.tsx`
- Create: `apps/web/components/simulation-experience/LaunchPortal.tsx`
- Create: `apps/web/components/simulation-experience/BrowserExperienceHud.tsx`
- Create: `apps/web/components/simulation-experience/simulation-experience.css`
- Create: `tests/unit/simulation-experience-shell.test.ts`

- [ ] **Step 1: Write the failing source contract**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(resolve(
  process.cwd(),
  `apps/web/components/simulation-experience/${name}`,
), 'utf8');

describe('shared simulation experience shell', () => {
  it('keeps the world central and exposes launch, mission, and evidence regions', () => {
    const source = read('SimulationExperienceShell.tsx');
    expect(source).toContain('simulation-experience__world');
    expect(source).toContain('LaunchPortal');
    expect(source).toContain('BrowserExperienceHud');
    expect(source).toContain('aria-live="polite"');
  });

  it('offers audio, subtitles, comfort, seated, and reduced-motion controls', () => {
    const source = read('LaunchPortal.tsx');
    for (const label of ['Audio', 'Subtitles', 'Comfort', 'Seated', 'Reduced motion']) {
      expect(source).toContain(label);
    }
  });

  it('uses collapsible edge UI instead of a permanent central card', () => {
    const source = read('BrowserExperienceHud.tsx');
    expect(source).toContain('simulation-experience__mission-dock');
    expect(source).toContain('simulation-experience__evidence-drawer');
    expect(source).toContain('aria-expanded');
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npx vitest run tests/unit/simulation-experience-shell.test.ts`

Expected: FAIL because the shared components do not exist.

- [ ] **Step 3: Implement the shell components**

`SimulationExperienceShell` accepts `title`, `classContext`, `objective`, `snapshot`, `started`, `onStartBrowser`, optional `onEnterVr`, `preferences`, `onPreferencesChange`, `onPrevious`, `onNext`, `evidence`, `children`, and `error`. It renders children in the world region, a launch portal before start, a polite live region for the current cue, and the HUD after start.

`BrowserExperienceHud` keeps progress in the top edge, the current cue and one primary action in a bottom mission dock, and evidence in a right drawer that defaults closed. Disable Next until `snapshot.stageComplete`.

The CSS must:

- reserve the center `60%` width and `64%` height for the world;
- use translucent edge surfaces with selective violet/cyan emphasis;
- collapse utility labels below `760px`;
- stack the mission dock below `520px`;
- increase type in `[data-projector='true']`;
- remove blur and non-essential transitions under `prefers-reduced-motion`;
- keep every interactive target at least `44px` high.

- [ ] **Step 4: Run the source contract and web type-check**

Run:

```bash
npx vitest run tests/unit/simulation-experience-shell.test.ts
npm --workspace apps/web run type-check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/simulation-experience tests/unit/simulation-experience-shell.test.ts
git commit -m "feat: add shared cinematic simulation shell"
```

### Task 6: Prove the Foundation in the Diagnostic World

**Files:**
- Modify: `apps/web/lib/world-builder/diagnosticWorld.ts`
- Modify: `apps/web/components/simulations/WorldBuilderDiagnosticViewer.tsx`
- Modify: `tests/unit/world-diagnostic-viewer.test.ts`

- [ ] **Step 1: Write failing diagnostic integration assertions**

Add:

```ts
it('proves the shared experience, spatial, and unobstructed-HUD foundation', () => {
  expect(DIAGNOSTIC_WORLD.world.experienceId).toBe('experience-material-evidence');
  expect(DIAGNOSTIC_WORLD.world.spatialLayoutId).toBe('spatial-diagnostic-studio');
  expect(DIAGNOSTIC_WORLD.experienceDefinitions).toHaveLength(1);
  expect(DIAGNOSTIC_WORLD.spatialLayouts).toHaveLength(1);

  const source = readFileSync(resolve(
    process.cwd(),
    'apps/web/components/simulations/WorldBuilderDiagnosticViewer.tsx',
  ), 'utf8');
  expect(source).toContain('createLessonSession');
  expect(source).toContain('SimulationExperienceShell');
  expect(source).toContain('resolveCuePlacement');
  expect(source).toContain('verifyClearView');
});
```

- [ ] **Step 2: Run the diagnostic tests and confirm RED**

Run:

```bash
npx vitest run tests/unit/world-diagnostic-viewer.test.ts tests/unit/world-schema.test.ts
```

Expected: FAIL because W0 has no experience/spatial graph and uses its older page shell.

- [ ] **Step 3: Add W0 experience and spatial definitions**

Add `experience-material-evidence` with one stage, required action `release-sphere`, and completion evidence `sphere-settled`. Add `spatial-diagnostic-studio` using literal scale, `1.6m` standing eye height, `1.2m` seated eye height, `0.25–0.8m` reach, an off-axis cue bay, and a normalized browser clear-view rectangle.

- [ ] **Step 4: Integrate the diagnostic viewer**

Create one lesson session in a ref. Mark `release-sphere` when the run begins and record `sphere-settled` only after the rigid body is resting on the floor. Wrap the world viewport in `SimulationExperienceShell`; preserve the engineering metrics as a diagnostic drawer rather than student evidence. Compute the cue position through `resolveCuePlacement` and run `verifyClearView` against the HUD rectangles when the viewport changes.

Keep the existing assessment session for observation, misconception, and transfer evidence. Do not merge diagnostic performance metrics into mastery.

- [ ] **Step 5: Run focused verification**

Run:

```bash
npx vitest run tests/unit/world-diagnostic-viewer.test.ts tests/unit/world-schema.test.ts tests/unit/lesson-session.test.ts tests/unit/spatial-experience-diagnostics.test.ts
npm --workspace apps/web run type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/world-builder/diagnosticWorld.ts apps/web/components/simulations/WorldBuilderDiagnosticViewer.tsx tests/unit/world-diagnostic-viewer.test.ts
git commit -m "feat: prove immersive foundation in diagnostic world"
```

### Task 7: Full Foundation Verification and Documentation

**Files:**
- Modify: `docs/architecture/world-builder.md`
- Modify: `docs/simulation-design/simulation-design-system.md`
- Modify: `tests/unit/world-builder-documentation.test.ts`

- [ ] **Step 1: Add failing documentation assertions**

Require the documentation sources to contain:

```ts
expect(worldBuilder).toContain('normalized action');
expect(worldBuilder).toContain('headless lesson session');
expect(worldBuilder).toContain('off-axis cue bay');
expect(designSystem).toContain('unblocked discovery view');
expect(designSystem).toContain('direct manipulation');
expect(designSystem).toContain('representational scale');
```

- [ ] **Step 2: Run the documentation test and confirm RED**

Run: `npx vitest run tests/unit/world-builder-documentation.test.ts`

Expected: FAIL until the approved foundation is documented.

- [ ] **Step 3: Document the implemented foundation**

Add the exact contract boundaries, data flow, browser/Quest adapter responsibilities, cue placement rules, scale declarations, direct-manipulation requirement, and phased-migration rule. Preserve the existing warning that browser automation cannot sign direct Quest acceptance.

- [ ] **Step 4: Run complete verification**

Run:

```bash
npm run verify
npm run spec:drift
git diff --check
```

Expected: 0 test failures, successful TypeSpec compile, successful web type-check and production build, no drift errors, and no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/world-builder.md docs/simulation-design/simulation-design-system.md tests/unit/world-builder-documentation.test.ts
git commit -m "docs: define immersive world-builder foundation"
```

