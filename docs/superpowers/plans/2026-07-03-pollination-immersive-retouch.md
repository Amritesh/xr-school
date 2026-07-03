# Pollination Immersive Retouch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Pollination into the first detailed, directly performed reference experiment on the shared immersive foundation.

**Architecture:** Pollination retains its verified causal biology model and world-specific scene composition. It adds an eight-stage `ExperienceDefinition`, explicit spatial scale, normalized experiment actions, the shared browser shell, and off-axis Quest cues. World detail is improved procedurally within the existing Quest budgets rather than introducing unlicensed or oversized assets.

**Tech Stack:** TypeScript, React 19, Next.js 15, Three.js/WebXR, Vitest

---

### Task 1: Pollination Experience and Spatial Contract

**Files:**
- Modify: `apps/web/lib/world-builder/pollinationWorld.ts`
- Modify: `tests/unit/pollination-world.test.ts`

- [ ] **Step 1: Write failing world-contract assertions**

```ts
expect(POLLINATION_WORLD.world.experienceId).toBe('experience-pollination-cycle');
expect(POLLINATION_WORLD.world.spatialLayoutId).toBe('spatial-pollination-garden');
expect(POLLINATION_WORLD.experienceDefinitions?.[0].stages).toHaveLength(8);
expect(POLLINATION_WORLD.spatialLayouts?.[0]).toMatchObject({
  metersPerWorldUnit: 1,
  scaleRepresentation: 'literal',
  reachMeters: { min: 0.25, max: 0.85 },
});
```

Assert required action IDs exactly equal:

```ts
[
  'inspect-flower',
  'release-pollen',
  'observe-pollinator',
  'transfer-pollen',
  'trace-pollen-tube',
  'inspect-seed-fruit',
  'water-seed',
  'inspect-mature-plant',
]
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/unit/pollination-world.test.ts`

Expected: FAIL because Pollination has no experience or spatial definitions.

- [ ] **Step 3: Add the validated definitions**

Add one stage per existing biological event. Each stage requires its action and a distinct observable evidence ID. Declare literal garden scale, 1.6 m standing and 1.2 m seated eye heights, 2.5 m bounded movement, 0.25–0.85 m reach, an off-axis cue bay, a 60% × 64% browser clear-view region, and 1.4° minimum label size.

- [ ] **Step 4: Run GREEN and commit**

```bash
npx vitest run tests/unit/pollination-world.test.ts tests/unit/world-schema.test.ts
git add apps/web/lib/world-builder/pollinationWorld.ts tests/unit/pollination-world.test.ts
git commit -m "feat: define pollination immersive experience"
```

### Task 2: Direct Experiment Action Adapter

**Files:**
- Create: `apps/web/lib/world-builder/pollinationExperience.ts`
- Create: `tests/unit/pollination-experience.test.ts`

- [ ] **Step 1: Write failing adapter tests**

```ts
const experience = createPollinationExperience();
expect(experience.snapshot().stageId).toBe('stage-flower-garden');
expect(() => experience.perform('transfer-pollen')).toThrow(/current stage/i);

experience.perform('inspect-flower');
experience.observe('flower-parts-identified');
expect(experience.snapshot().stageComplete).toBe(true);
experience.next();
expect(experience.snapshot().stageId).toBe('stage-pollen-production');
```

Also prove that `perform('release-pollen')` applies `producePollen` to the causal biology model only once and that restart resets both lesson and biology.

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/unit/pollination-experience.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the adapter**

Compose `createLessonSession`, `createActionRouter`, and `createPollinationModel`. Map stage actions to biology events; `inspect-flower` has no biology mutation. Expose `perform`, `observe`, `next`, `previous`, `restart`, `snapshot`, and `biologySnapshot`.

- [ ] **Step 4: Run GREEN and commit**

```bash
npx vitest run tests/unit/pollination-experience.test.ts
git add apps/web/lib/world-builder/pollinationExperience.ts tests/unit/pollination-experience.test.ts
git commit -m "feat: add pollination experiment action adapter"
```

### Task 3: Shared Shell and Unobstructed Browser HUD

**Files:**
- Modify: `apps/web/components/simulations/PollinationViewer.tsx`
- Modify: `tests/unit/pollination-viewer-feedback.test.ts`

- [ ] **Step 1: Add failing integration assertions**

Require the viewer source to contain:

```ts
SimulationExperienceShell
createPollinationExperience
verifyClearView
resolveCuePlacement
performExperimentAction
```

Require the old inline intro overlay, bottom-centered cue card, and `Next Stage →` button text to be absent.

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/unit/pollination-viewer-feedback.test.ts`

Expected: FAIL on the new shared-foundation assertions.

- [ ] **Step 3: Migrate browser presentation**

Wrap the full-bleed canvas with `SimulationExperienceShell`. Derive the shell snapshot from the Pollination experience adapter. The primary browser action performs the current experiment action; Continue remains disabled until action plus evidence complete. Move assessment into the collapsible evidence region. Preserve narration, subtitles, browser orbit, comfort, and direct Enter VR.

- [ ] **Step 4: Verify clear view**

Run `verifyClearView` after resize against the top bar, mission dock, and any open evidence drawer. Treat an occlusion violation as a diagnostic error in development, not as student evidence.

- [ ] **Step 5: Run GREEN and commit**

```bash
npx vitest run tests/unit/pollination-viewer-feedback.test.ts tests/unit/pollination-experience.test.ts
npm --workspace apps/web run type-check
git add apps/web/components/simulations/PollinationViewer.tsx tests/unit/pollination-viewer-feedback.test.ts
git commit -m "feat: migrate pollination to immersive experience shell"
```

### Task 4: Quest Experiment Targets and Off-Axis Cues

**Files:**
- Modify: `apps/web/components/simulations/PollinationViewer.tsx`
- Modify: `tests/unit/pollination-viewer-feedback.test.ts`

- [ ] **Step 1: Add failing Quest-action assertions**

Require named targets for flower center, pollen release, bee observation, stigma transfer, pollen tube, fruit/seed, watering point, and mature plant. Require controller selection to route `userData.actionId` through `performExperimentAction`. Require the cue mesh position to come from `resolveCuePlacement`.

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/unit/pollination-viewer-feedback.test.ts`

Expected: FAIL because controllers currently select only Previous and Next.

- [ ] **Step 3: Add world targets**

Use visible world objects as targets where scientifically honest. Add a subtle interaction ring only when the current target would otherwise be ambiguous. Controller hover changes emissive emphasis without recoloring evidence. Triggering the target performs the same normalized action used by browser controls.

- [ ] **Step 4: Remove permanent central cards**

Place the Quest cue mesh in the spatial cue bay. It appears at stage rest points, can be dismissed and repeated, and never follows the camera. Keep the navigation panel off-axis and make Continue unavailable until the experiment action is complete.

- [ ] **Step 5: Run GREEN and commit**

```bash
npx vitest run tests/unit/pollination-viewer-feedback.test.ts tests/unit/xr-navigation.test.ts
npm --workspace apps/web run type-check
git add apps/web/components/simulations/PollinationViewer.tsx tests/unit/pollination-viewer-feedback.test.ts
git commit -m "feat: add direct Quest pollination actions"
```

### Task 5: Detailed Garden Art and Stage Choreography

**Files:**
- Modify: `apps/web/components/simulations/PollinationViewer.tsx`
- Modify: `apps/web/lib/world-builder/pollinationWorld.ts`
- Create: `tests/unit/pollination-world-detail.test.ts`

- [ ] **Step 1: Write failing world-detail tests**

Assert named scene groups for layered canopy, ground-cover instances, flower anatomy, nectar guides, pollen contact, garden depth props, and environmental animation. Assert `questBaseline` remains capped at 120 draw calls, 250,000 visible triangles, one shadow light, and 1024 px textures.

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/unit/pollination-world-detail.test.ts`

Expected: FAIL because the detail groups are not yet declared.

- [ ] **Step 3: Add Quest-safe detail**

Add instanced grass and ground cover, layered low-poly canopy silhouettes, fallen leaves, small rocks, flower-center anatomy, nectar guides, stigma contact emphasis, and localized stage particles. Reuse existing mapped PBR families and instancing; do not add a second shadow light or full-screen post-processing.

- [ ] **Step 4: Add cinematic choreography**

Use the existing fixed-step lifecycle for wind, bee wings, pollen drift, fertilisation trace, fruit reveal, germination, and plant growth. Use focus light and localized sound to direct attention. Reduced motion lowers amplitude and disables non-essential drift without changing stage evidence.

- [ ] **Step 5: Run GREEN and commit**

```bash
npx vitest run tests/unit/pollination-world-detail.test.ts tests/unit/pollination-world.test.ts
npm --workspace apps/web run type-check
git add apps/web/components/simulations/PollinationViewer.tsx apps/web/lib/world-builder/pollinationWorld.ts tests/unit/pollination-world-detail.test.ts
git commit -m "feat: enrich pollination garden detail"
```

### Task 6: Pollination Verification

- [ ] **Step 1: Run complete verification**

```bash
npm run verify
npm run spec:drift
git diff --check
```

Expected: all tests, type-check, production build, catalog generation, and drift checks pass.

- [ ] **Step 2: Record browser acceptance**

Update `docs/releases/w1-pollination.md` with the new shared-shell, action, scale, occlusion, material, audio, and browser-flow evidence. Keep direct Quest acceptance explicitly unsigned until tested on device.

- [ ] **Step 3: Commit**

```bash
git add docs/releases/w1-pollination.md
git commit -m "docs: record pollination immersive retouch evidence"
```
