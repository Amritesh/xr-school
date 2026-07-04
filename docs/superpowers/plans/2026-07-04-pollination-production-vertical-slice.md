# Pollination Production Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Pollination prototype with a direct-manipulation school-garden experiment and extract reusable scene, interaction, scale-transition, and unobstructed-HUD systems.

**Architecture:** Keep the shared WebXR runtime and lesson-session contracts. Move scientific experiment state, authored geometry, garden dressing, tools, scene composition, and interaction/choreography into focused modules; reduce `PollinationViewer.tsx` to React and device-adapter wiring. Use deterministic Three.js geometry and locally bundled compact PBR assets so the experience remains offline-first and Quest-safe.

**Tech Stack:** TypeScript, React 19, Next.js 15, Three.js/WebXR, Vitest, existing XR School simulation runtime and schema.

---

## File Map

- Create `apps/web/lib/world-builder/pollinationExperiment.ts` — deterministic treatment/control experiment state and action/evidence effects.
- Create `apps/web/lib/world-builder/pollinationBotany.ts` — flower, bee, fruit, seed, root, and germination geometry.
- Create `apps/web/lib/world-builder/pollinationGarden.ts` — beds, paths, enclosure, vegetation instances, landmarks, and wind updates.
- Create `apps/web/lib/world-builder/pollinationTools.ts` — brush, lens, tags, fruit tool, seed tray, trowel, and watering can.
- Create `apps/web/lib/world-builder/pollinationScene.ts` — scene composition, stable interactable references, stage visibility, and disposal.
- Create `apps/web/lib/world-builder/scaleTransition.ts` — reusable literal/enlarged scale-transition state.
- Create `apps/web/lib/world-builder/toolInteraction.ts` — reusable hover, select, drag, valid-target, and release behavior.
- Create `apps/web/components/simulation-experience/ExperimentMissionHud.tsx` — compact edge mission chip and field notebook.
- Rewrite `apps/web/components/simulations/PollinationViewer.tsx` — adapter wiring only.
- Modify `apps/web/lib/world-builder/pollinationWorld.ts` — richer experiment actions, evidence, scale declarations, and asset metadata.
- Modify `apps/web/lib/world-builder/pollinationExperience.ts` — consume the experiment model.
- Modify `apps/web/components/simulation-experience/simulation-experience.css` — central-clear responsive layout.
- Modify `tests/unit/pollination-experience.test.ts` — direct experiment causality.
- Modify `tests/unit/pollination-viewer-feedback.test.ts` — production composition and anti-slideshow contract.
- Create `tests/unit/pollination-experiment.test.ts` — deterministic experiment state.
- Create `tests/unit/scale-transition.test.ts` — scale semantics and reduced-motion behavior.
- Create `tests/unit/tool-interaction.test.ts` — input-independent tool state.

### Task 1: Deterministic treatment/control experiment

**Files:**
- Create: `tests/unit/pollination-experiment.test.ts`
- Create: `apps/web/lib/world-builder/pollinationExperiment.ts`
- Modify: `apps/web/lib/world-builder/pollinationExperience.ts`

- [ ] **Step 1: Write the failing experiment tests**

```ts
import { describe, expect, it } from 'vitest';
import { createPollinationExperiment } from '../../apps/web/lib/world-builder/pollinationExperiment';

describe('pollination treatment/control experiment', () => {
  it('requires collection before valid stigma transfer', () => {
    const experiment = createPollinationExperiment();
    expect(() => experiment.apply('transfer-pollen')).toThrow(/collect pollen/i);
    experiment.apply('collect-pollen');
    expect(experiment.apply('transfer-pollen').treatmentPollen).toBeGreaterThan(0);
  });

  it('forms fruit only on the pollinated treatment flower', () => {
    const experiment = createPollinationExperiment();
    experiment.apply('collect-pollen');
    experiment.apply('transfer-pollen');
    experiment.apply('trace-pollen-tube');
    const result = experiment.apply('advance-time-lapse');
    expect(result.treatmentFruitFormed).toBe(true);
    expect(result.controlFruitFormed).toBe(false);
  });

  it('requires planting, covering, and water before germination', () => {
    const experiment = createPollinationExperiment();
    for (const action of ['collect-pollen', 'transfer-pollen', 'trace-pollen-tube', 'advance-time-lapse', 'open-fruit', 'plant-seed', 'cover-seed'] as const) {
      experiment.apply(action);
    }
    expect(experiment.snapshot().germinated).toBe(false);
    expect(experiment.apply('water-seed').germinated).toBe(true);
  });

  it('replays deterministically after reset', () => {
    const experiment = createPollinationExperiment();
    experiment.apply('collect-pollen');
    const first = experiment.snapshot();
    experiment.reset();
    experiment.apply('collect-pollen');
    expect(experiment.snapshot()).toEqual(first);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/pollination-experiment.test.ts`  
Expected: FAIL because `pollinationExperiment.ts` does not exist.

- [ ] **Step 3: Implement the minimal deterministic model**

```ts
export type PollinationExperimentAction =
  | 'collect-pollen' | 'transfer-pollen' | 'trace-pollen-tube'
  | 'advance-time-lapse' | 'open-fruit' | 'plant-seed'
  | 'cover-seed' | 'water-seed';

export interface PollinationExperimentSnapshot {
  brushPollen: number;
  treatmentPollen: number;
  pollenTubeComplete: boolean;
  treatmentFruitFormed: boolean;
  controlFruitFormed: boolean;
  fruitOpened: boolean;
  seedPlanted: boolean;
  seedCovered: boolean;
  waterMl: number;
  germinated: boolean;
}

export function createPollinationExperiment() {
  const initial = (): PollinationExperimentSnapshot => ({
    brushPollen: 0, treatmentPollen: 0, pollenTubeComplete: false,
    treatmentFruitFormed: false, controlFruitFormed: false,
    fruitOpened: false, seedPlanted: false, seedCovered: false,
    waterMl: 0, germinated: false,
  });
  let state = initial();
  const require = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };
  return {
    snapshot: () => ({ ...state }),
    reset: () => { state = initial(); return { ...state }; },
    apply(action: PollinationExperimentAction) {
      if (action === 'collect-pollen') state.brushPollen = 24;
      if (action === 'transfer-pollen') {
        require(state.brushPollen > 0, 'Collect pollen before transfer');
        state.treatmentPollen = 12; state.brushPollen -= 12;
      }
      if (action === 'trace-pollen-tube') {
        require(state.treatmentPollen > 0, 'Transfer pollen before fertilisation');
        state.pollenTubeComplete = true;
      }
      if (action === 'advance-time-lapse') {
        require(state.pollenTubeComplete, 'Trace the pollen tube first');
        state.treatmentFruitFormed = true;
      }
      if (action === 'open-fruit') {
        require(state.treatmentFruitFormed, 'Form fruit before opening it');
        state.fruitOpened = true;
      }
      if (action === 'plant-seed') {
        require(state.fruitOpened, 'Open fruit before planting a seed');
        state.seedPlanted = true;
      }
      if (action === 'cover-seed') {
        require(state.seedPlanted, 'Plant the seed before covering it');
        state.seedCovered = true;
      }
      if (action === 'water-seed') {
        require(state.seedCovered, 'Cover the seed before watering');
        state.waterMl = 35; state.germinated = true;
      }
      return { ...state };
    },
  };
}
```

- [ ] **Step 4: Run focused and related tests**

Run: `npm test -- tests/unit/pollination-experiment.test.ts tests/unit/pollination-experience.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/world-builder/pollinationExperiment.ts apps/web/lib/world-builder/pollinationExperience.ts tests/unit/pollination-experiment.test.ts
git commit -m "feat: model pollination field experiment"
```

### Task 2: Reusable interaction and scale-transition systems

**Files:**
- Create: `tests/unit/tool-interaction.test.ts`
- Create: `tests/unit/scale-transition.test.ts`
- Create: `apps/web/lib/world-builder/toolInteraction.ts`
- Create: `apps/web/lib/world-builder/scaleTransition.ts`

- [ ] **Step 1: Write failing behavior tests**

```ts
import { expect, it } from 'vitest';
import { createToolInteraction } from '../../apps/web/lib/world-builder/toolInteraction';

it('returns a released tool to its tray when no valid target accepted it', () => {
  const tool = createToolInteraction({ toolId: 'pollen-brush', home: [1, 1, 1], validTargets: ['anther', 'stigma'] });
  tool.pickUp('mouse');
  expect(tool.release(undefined).pose).toEqual([1, 1, 1]);
});

it('emits a committed normalized action only for a valid target', () => {
  const tool = createToolInteraction({ toolId: 'pollen-brush', home: [0, 0, 0], validTargets: ['stigma'] });
  tool.pickUp('xr-controller');
  expect(tool.release('leaf').action).toBeUndefined();
  tool.pickUp('xr-controller');
  expect(tool.release('stigma').action?.phase).toBe('commit');
});
```

```ts
import { expect, it } from 'vitest';
import { createScaleTransition } from '../../apps/web/lib/world-builder/scaleTransition';

it('declares literal and enlarged representations during a transition', () => {
  const transition = createScaleTransition();
  expect(transition.begin('flower', 'pistil-cutaway').from.representation).toBe('literal');
  expect(transition.snapshot().to.representation).toBe('enlarged');
});

it('uses a cross-fade instead of rig travel in reduced motion', () => {
  const transition = createScaleTransition({ reducedMotion: true });
  transition.begin('flower', 'pistil-cutaway');
  expect(transition.snapshot().mode).toBe('cross-fade');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/tool-interaction.test.ts tests/unit/scale-transition.test.ts`  
Expected: FAIL because both modules are missing.

- [ ] **Step 3: Implement focused state machines**

Implement `createToolInteraction()` with `idle`, `held`, `valid`, and `returning`
states and normalized `commit` output. Implement `createScaleTransition()` with
literal/enlarged endpoint metadata, `curve` or `cross-fade` mode, clamped
progress, and deterministic reset.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- tests/unit/tool-interaction.test.ts tests/unit/scale-transition.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/world-builder/toolInteraction.ts apps/web/lib/world-builder/scaleTransition.ts tests/unit/tool-interaction.test.ts tests/unit/scale-transition.test.ts
git commit -m "feat: add reusable experiment interaction systems"
```

### Task 3: Authored botany, tools, and garden scene

**Files:**
- Create: `apps/web/lib/world-builder/pollinationBotany.ts`
- Create: `apps/web/lib/world-builder/pollinationGarden.ts`
- Create: `apps/web/lib/world-builder/pollinationTools.ts`
- Create: `apps/web/lib/world-builder/pollinationScene.ts`
- Modify: `tests/unit/pollination-viewer-feedback.test.ts`

- [ ] **Step 1: Replace prototype-source assertions with failing production composition assertions**

Assert that the scene exposes treatment/control flowers, anther and stigma
targets, pollen brush, hand lens, field tags, fruit, seed tray, trowel, watering
can, soil observation window, instanced vegetation, animated bee wings, and a
single `dispose()` boundary. Assert that `PollinationViewer.tsx` imports the
scene rather than defining `buildFlower` or `buildBee`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/pollination-viewer-feedback.test.ts`  
Expected: FAIL on missing production modules.

- [ ] **Step 3: Build authored geometry modules**

Use reusable tapered stem segments, curved leaf shapes with midrib detail,
layered petals with thickness, separate filament/anther/stigma/style/ovary
targets, an animated segmented bee, fruit halves with seeds, and staged root and
shoot curves. Use instanced grass, ground cover, and peripheral flowers. Build
tools at plausible metre scale and name every interactable mesh.

- [ ] **Step 4: Compose and dispose the scene**

`createPollinationScene({ scene, materials, profileId })` must return stable
references:

```ts
{
  root, treatmentFlower, controlFlower, antherTarget, stigmaTarget,
  bee, brush, lens, timeLapseDial, fruit, seed, trowel, wateringCan,
  soilWindow, setStage(stage), update(deltaSeconds, elapsedSeconds), dispose()
}
```

Use shared materials only, register geometry/material ownership explicitly, and
keep repeated vegetation instanced.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- tests/unit/pollination-viewer-feedback.test.ts tests/unit/pollination-world.test.ts`  
Expected: PASS.

```bash
git add apps/web/lib/world-builder/pollinationBotany.ts apps/web/lib/world-builder/pollinationGarden.ts apps/web/lib/world-builder/pollinationTools.ts apps/web/lib/world-builder/pollinationScene.ts tests/unit/pollination-viewer-feedback.test.ts
git commit -m "feat: author the pollination garden and field tools"
```

### Task 4: Experiment-first lesson contract

**Files:**
- Modify: `apps/web/lib/world-builder/pollinationWorld.ts`
- Modify: `apps/web/lib/world-builder/pollinationExperience.ts`
- Modify: `tests/unit/pollination-world.test.ts`
- Modify: `tests/unit/pollination-experience.test.ts`

- [ ] **Step 1: Write failing sequence tests**

Test that the treatment/control lesson requires: inspect, collect, observe bee,
transfer, trace, compare, plant/water, inspect germination. Confirm transfer is
impossible before collection, fruit comparison is impossible before
fertilisation, and the final stage includes misconception and transfer evidence.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/pollination-world.test.ts tests/unit/pollination-experience.test.ts`  
Expected: FAIL against the old release/advance stage actions.

- [ ] **Step 3: Update world and experience contracts**

Replace `release-pollen` and passive fruit inspection with `collect-pollen`,
`advance-time-lapse`, `compare-control`, `open-fruit`, `plant-seed`,
`cover-seed`, and `water-seed`. Declare enlarged cutaway representation in the
scientific limitations and keep the garden spatial layout literal.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm test -- tests/unit/pollination-world.test.ts tests/unit/pollination-experience.test.ts tests/unit/experience-schema.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/world-builder/pollinationWorld.ts apps/web/lib/world-builder/pollinationExperience.ts tests/unit/pollination-world.test.ts tests/unit/pollination-experience.test.ts
git commit -m "feat: require direct pollination experiment evidence"
```

### Task 5: Clear-view HUD and viewer integration

**Files:**
- Create: `apps/web/components/simulation-experience/ExperimentMissionHud.tsx`
- Modify: `apps/web/components/simulation-experience/SimulationExperienceShell.tsx`
- Modify: `apps/web/components/simulation-experience/simulation-experience.css`
- Rewrite: `apps/web/components/simulations/PollinationViewer.tsx`
- Modify: `tests/unit/pollination-viewer-feedback.test.ts`

- [ ] **Step 1: Write failing source and DOM-contract assertions**

Assert that the viewer uses `SimulationExperienceShell`,
`createPollinationScene`, `createPollinationExperience`,
`createToolInteraction`, and `createScaleTransition`; has no generic stage
advance before `snapshot.stageComplete`; has accessible action equivalents; and
contains no persistent centre card or private renderer loop.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/pollination-viewer-feedback.test.ts`  
Expected: FAIL against the legacy monolithic viewer.

- [ ] **Step 3: Implement the edge HUD**

The HUD renders a top-left utility cluster, lower-left one-line mission chip,
right-edge collapsible field notebook, tool status beside the world tool tray,
and Continue only after valid evidence. At widths below 560px, the notebook
becomes a bottom sheet while the centre remains clear.

- [ ] **Step 4: Rewrite the viewer as adapter wiring**

Mount the shared runtime and environment, create the authored scene, use pointer
raycasting and XR controllers to map named targets to normalized actions, apply
experiment state, record evidence only after visible scene consequences, run
stage choreography, and expose equivalent HTML controls. Narration, audio,
subtitles, reduced motion, Quest back buttons, snap turn, and deterministic
disposal remain supported.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/unit/pollination-viewer-feedback.test.ts tests/unit/pollination-experience.test.ts tests/unit/web-simulation-runtime.test.ts tests/unit/simulation-audio-contract.test.ts`  
Expected: PASS.

```bash
git add apps/web/components/simulation-experience/ExperimentMissionHud.tsx apps/web/components/simulation-experience/SimulationExperienceShell.tsx apps/web/components/simulation-experience/simulation-experience.css apps/web/components/simulations/PollinationViewer.tsx tests/unit/pollination-viewer-feedback.test.ts
git commit -m "feat: deliver the pollination field experience"
```

### Task 6: Verification, visual acceptance, and release

**Files:**
- Modify: `docs/releases/w1-pollination.md`

- [ ] **Step 1: Run strict verification**

Run: `npm run verify`  
Expected: all Vitest tests, TypeScript, Next production build, catalog
generation, and contract checks pass.

- [ ] **Step 2: Run generated-source and diff checks**

Run: `npm run spec:drift && git diff --check && git status --short`  
Expected: no drift, whitespace errors, or uncommitted generated files.

- [ ] **Step 3: Perform browser visual acceptance**

Verify the production build at:

- 1440×900 desktop browser;
- 1024×768 classroom/projector;
- 390×844 narrow touch layout;
- Quest Baseline emulation/device profile.

Complete the full action path. Capture launch, garden, pollen transfer, cutaway,
treatment/control comparison, and germination screenshots. Check console errors,
central-view occlusion, target reach, reduced motion, keyboard flow, restart,
and resource disposal.

- [ ] **Step 4: Record measured acceptance**

Update `docs/releases/w1-pollination.md` with commit, test count, routes,
interaction path, screenshots, device/profile evidence, known limitations, and
production URL.

- [ ] **Step 5: Commit**

```bash
git add docs/releases/w1-pollination.md
git commit -m "release: document pollination production acceptance"
```

- [ ] **Step 6: Merge, push, and deploy**

Fast-forward the verified branch into `main`, rerun strict verification on the
merged result, push `main`, watch both quality and Vercel workflows to success,
and verify `https://xr-school.vercel.app/simulations/pollination` returns HTTP
200 with the new production experience.
