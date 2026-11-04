# Rainwater Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the rainwater simulation into a mission where the child's actions earn every litre, in a consistent 3D village, inside the Quest budget, and leave reusable systems for the next pilots.

**Architecture:** Follow the Colour Picnic pattern: a pure lesson reducer (`apps/web/lib/rainwaterLesson.ts`), a Three.js scene that renders state (`apps/web/lib/rainwaterScene.ts`), and a thin React viewer. Reusable parts go in `packages/simulation-runtime` (pure logic) and `apps/web/lib/world-builder` (Three.js). Models are GLB files with meshopt compression, stored locally, each with a licence record.

**Tech Stack:** Three.js 0.170, WebXR, Next.js 15, TypeScript, Vitest, Playwright, `@gltf-transform/cli` 4.5.1 (new dev dependency), Blender.

**Spec:** `docs/superpowers/specs/2026-11-04-simulation-visual-upgrade-design.md`

## Global Constraints

- Quest Baseline: at least 72 FPS, at most 120 draw calls, at most 250,000 visible triangles.
- Quest rendering: one 1024 px shadow map, 1024 px standard textures, one key light, no full-screen post-processing.
- Class 5: package under 300 MB, session at most 8 minutes. The module record's `duration: 8` stays.
- Offline: no third-party network requests at runtime. Decoders and models are local.
- Every model records source, author, licence, size, hash and fallback. Unknown provenance is a release blocker.
- This pilot uses only Kenney, Poly Haven, ambientCG and original Blender work. No Quaternius, and no NC or ND assets.
- Safety: stored rainwater is for non-drinking uses. Filtering is never shown as making water drinkable.
- Keyboard path, captions and reduced motion run the same lesson logic, never a skip button.
- `RainwaterStorageViewer.tsx` must keep the strings `OrbitControls` and `createQuestVrControls`, because `tests/unit/school-release-readiness.test.ts` checks for them.
- The narration generator only reads `const NARRATIONS = [...]` (double-quoted strings) or `const X_NARRATION = "..."` from `apps/web/components/simulations/*Viewer.tsx`. Narration text stays in the viewer file.
- Do not edit quality scores by hand in `scripts/generate-simulation-quality-data.ts` to reflect this work. A score changes only with new evidence and the owner's agreement.
- Do not change `packages/simulation-content/src/implemented/guided/definitions.generated.ts`. The viewer is bespoke and already differs from those stages.
- All commit messages end with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

- **Interrupted storm** (tab hidden, or VR session ended): the storm pauses and resumes with no lost water and no time jump. Test in Task 3 and Task 8.
- **Double input** (trigger and A button in one frame, or repeat clicks): litres are counted once. Test in Task 2.
- **A model fails to load** (missing or corrupt file in a school with no internet): the mission stays playable using fallback shapes. Test in Task 6.
- **Finishing below 10,000 L or running short in summer:** words are honest, with no "every drop saved" and no failure screen. Test in Task 2 and Task 10.
- **Keyboard only with reduced motion:** the whole mission can be finished, including the storm at the slower pace. Test in Task 11.

---

### Task 0: Isolate existing work and create the branch

**Files:** none new. Modifies `.gitattributes`.

- [ ] **Step 1: Commit the Windows fix alone on `fix/windows-npm-spawn`.**

```bash
git add scripts/build-packages.mjs scripts/type-check-packages.mjs tests/unit/narration-command-contract.test.ts tests/unit/simulation-content-package.test.ts
git commit -m "fix: run npm through the shell on Windows"
```

- [ ] **Step 2: Create the working branch and commit the design and plan.** `git switch -c feature/rainwater-pilot`, then add `docs/superpowers/specs/2026-11-04-*` and this plan. Add `*.glb binary` and `*.ktx2 binary` to `.gitattributes` in the same commit.

Expected: `git status --short` is empty.

### Task 1: Render budget gate and baseline

**Files:**
- Create: `apps/web/lib/world-builder/renderBudget.ts`, `tests/unit/render-budget.test.ts`, `tests/e2e/rainwater-mission.spec.ts`, `docs/releases/rainwater-pilot.md`
- Modify: `apps/web/components/simulations/RainwaterStorageViewer.tsx`

**Interfaces:**
- Produces: `QUEST_BASELINE: { maxDrawCalls: 120; maxTriangles: 250000; minFps: 72 }`, `readRenderStats(info: THREE.WebGLInfo): { drawCalls: number; triangles: number }`, `budgetViolations(stats): string[]`, `publishRenderStats(element: HTMLElement, stats): void` (sets `data-render-draw-calls` and `data-render-triangles`).

- [ ] **Step 1: Write failing tests.** `budgetViolations({drawCalls:120,triangles:250000})` returns `[]`; `{drawCalls:121,triangles:250001}` returns two messages naming each limit.
- [ ] **Step 2: Run and confirm failure.** `npx vitest run tests/unit/render-budget.test.ts`
- [ ] **Step 3: Implement.** Publish stats on the viewer's root element at most once per second from the frame loop, with no `window` globals. In VR, `renderer.info` reflects stereo rendering.
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Record the baseline.** Add a Playwright test that walks the current 13 stages and logs the stats, and write the per-stage table to `docs/releases/rainwater-pilot.md`. Add a blank row for Quest FPS, measured with OVR Metrics Tool by whoever has a headset. If no headset is available, write "not measured".
- [ ] **Step 6: Commit** with message `test: add render budget gate and rainwater baseline`.

### Task 2: Lesson model

**Files:**
- Create: `packages/simulation-runtime/src/experience/socketAssembly.ts`, `apps/web/lib/rainwaterLesson.ts`, `tests/unit/socket-assembly.test.ts`, `tests/unit/rainwater-lesson.test.ts`
- Modify: `packages/simulation-runtime/src/index.ts`

**Interfaces:**
- Produces, from `@xr-school/simulation-runtime`:
  - `createSocketAssembly({ pieces: Record<string,string>; sockets: { id: string; solutionKind?: string }[] }): AssemblyState`, where `pieces` maps piece id to kind
  - `pickPiece(state, pieceId)`, `placePiece(state, socketId)`, `removePiece(state, socketId)`
  - `emptySockets(state): string[]`, `isAssemblyFull(state): boolean`, `isAssemblySolved(state): boolean`
- Produces, from the lesson file:
  - `RAINWATER_STAGES = ['rainy-day','drought','rooftop','filter','school','recharge','storm','summer','finale'] as const`
  - `RAINWATER_GOAL_LITRES = 10000`, `STAGE_LITRES = { rooftop: 1250, filter: 1250, school: 2500, recharge: 1500 }`
  - `SUMMER_NEEDS = { garden: 2500, animals: 2000, cleaning: 1500 }`, `SUMMER_STEP_LITRES = 500`
  - `createRainwaterState(): RainwaterState`
  - `reduceRainwater(state, action: RainwaterAction): RainwaterState`
  - `rainwaterCanContinue(state): boolean`, `rainwaterPrompt(state): string`
  - `savedLitres(state): number` (all earned), `storedLitres(state): number` (saved minus recharge, because recharged water is in the ground and not in a tank)

Stage merge (my call, within the 8-minute limit): Welcome goes into `rainy-day`; "Make the Right Choice" goes into `drought`; the map becomes an on-screen progress strip; Final Choice and Celebration become `finale`. The learning order is unchanged.

Actions: `continue`, `back`, `observe`, `choose-collect`, `assembly` (forwarded to the stage's assembly), `open-first-flush`, `storm-finished` (carries routed litres), `retry-storm`, `allocate` (target and step), `try-drinking`.

- [ ] **Step 1: Write failing tests** with these names and assertions:
  - Assembly: a socket accepts one piece, and placing in an occupied socket is rejected without losing the picked piece
  - Assembly: a wrong kind gives `isAssemblyFull` true and `isAssemblySolved` false; removing and replacing it solves it; sockets without `solutionKind` count as solved when filled
  - `starts at rainy-day with 0 saved`
  - `rooftop earns 1250 only when all 4 gutters are placed`; with 3 placed: `savedLitres` is 0 and the empty socket is reported as spilling
  - `filter stays cloudy if first flush is closed or order is wrong, and can be retried`; solved earns 1250 more
  - `recharge order is large stones, small stones, sand from the bottom`; solved earns 1500
  - `storm adds routed litres, and retry keeps the best`; routed 2000 then 1000 keeps 2000
  - `totals`: no storm gives saved 6500 and stored 5000; a full storm gives 10000 and 8500
  - `summer cannot allocate past stored water`; with stored 5000 the shortage is 1000 of `SUMMER_NEEDS`
  - `try-drinking spends nothing` and the prompt contains `treatment and testing`
  - `completing a stage twice does not double count` (Review Focus)
  - `back keeps progress` and re-entering a stage does not reset it
  - `continue is blocked until the stage is done`
  - `finale wording`: at 6500 the prompt does not contain `10,000` as an achievement or `every drop`; it states the real number and invites a storm replay (Review Focus)
- [ ] **Step 2: Run and confirm failure.** `npx vitest run tests/unit/socket-assembly.test.ts tests/unit/rainwater-lesson.test.ts`
- [ ] **Step 3: Implement** as immutable reducers. Invalid actions return the same state with a feedback message, never a throw. `storm-finished` carries a plain number, so this task doesn't depend on Task 3.
- [ ] **Step 4: Run and confirm pass**, after `npm run build:packages`.
- [ ] **Step 5: Commit** with message `feat: add earned-water rainwater lesson model`.

### Task 3: Storm simulation

**Files:** Create `apps/web/lib/rainwaterStorm.ts`, `tests/unit/rainwater-storm.test.ts`

**Interfaces:**
- Produces:
  - `STORM = { durationSeconds: 75, totalLitres: 3500, capacities: { houseTank: 800, schoolTank: 1400, rechargePit: 700, pond: 1000 }, blockGraceSeconds: 2, maxStepSeconds: 0.1 }`
  - `createStorm({ seed?: number; pace?: 1 | 0.5 }): StormState`
  - `stepStorm(state, dtSeconds): StormState`, `routeStorm(state, target): StormState`, `clearBlock(state): StormState`, `setStormPaused(state, paused): StormState`
  - `stormResult(state): { routed: number; flooded: number; finished: boolean }`

Rules: inflow per second is `(totalLitres / durationSeconds) * (0.5 + elapsed / durationSeconds)`, which integrates to `totalLitres`. Water goes to the active target until it's full, then floods the road. Roughly every 15 seconds (seeded, at most 4 times) leaves block the channel: after `blockGraceSeconds` the flow floods until cleared. `pace: 0.5` makes simulated time run at half speed with the same totals. These are starting values; tuning is expected after playtesting, but the tests below must keep holding.

- [ ] **Step 1: Write failing tests:**
  - `conserves water`: at every step `routed + flooded` equals inflow so far, within 0.5 L
  - `ideal play routes all 3500`, using a scripted policy that switches before full and clears blocks within the grace period
  - `no play routes at most 800`, the house tank's capacity, and floods the rest
  - `same seed gives identical runs`
  - `dt spike is clamped`: `stepStorm(state, 10)` advances at most `0.1 * pace`
  - `paused storm does not advance` (Review Focus)
  - `half pace reaches the same total and takes twice as long`
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement** with no Three.js imports and a small seeded generator.
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit** with message `feat: add storm routing simulation`.

### Task 4: Model pipeline and licence register

**Files:**
- Create: `scripts/optimize-model.mjs`, `apps/web/lib/world-builder/glbAssets.ts`, `apps/web/public/models/rainwater/SOURCES.json`, `apps/web/public/vendor/basis/` (copied from `node_modules/three/examples/jsm/libs/basis/`), `tests/unit/model-sources.test.ts`, `tests/unit/glb-assets.test.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces:
  - `createGlbAssetLoader(renderer, { transcoderPath?: string }): GlbAssetLoader`, where `GlbAssetLoader` is `{ load(url: string): Promise<THREE.Group>; loadOrFallback(url: string, fallback: () => THREE.Group, onDiagnostic?: (message: string) => void): Promise<THREE.Group>; dispose(): void }`
  - CLI: `node scripts/optimize-model.mjs <source.glb> <outName> --group rainwater --source <url> --author <name> --license <id>`
  - `SOURCES.json` entries: `{ file, source, author, license, modifications, bytes, sha256, triangles }`

- [ ] **Step 1: Write failing tests.**
  - `model-sources`: for each group's `SOURCES.json`, every `.glb` on disk has an entry and vice versa; `bytes` and `sha256` match the file; `license` is one of `CC0-1.0`, `CC-BY-4.0`, `XR-School-original`; no field is empty.
  - `model-sources`: the group's `triangles` total is at most 180,000, leaving room in the 250,000 budget for water, UI and fallbacks.
  - `glb-assets`: `loadOrFallback` returns the fallback and reports a diagnostic when `load` rejects.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.**
  - Add `@gltf-transform/cli@4.5.1` as a dev dependency.
  - The script runs meshopt compression, counts triangles, writes the output and updates `SOURCES.json`. It exits non-zero if a licence field is missing.
  - The loader uses `GLTFLoader`, `MeshoptDecoder` and `KTX2Loader` with `detectSupport`, and disposes geometry, materials and textures.
  - Textures: one shared palette atlas of at most 512 px per kit. Use KTX2 if `toktx` is installed, otherwise WebP, and state which in `docs/releases/rainwater-pilot.md`.
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Confirm offline.** `grep -r "gstatic\|unpkg\|jsdelivr" apps/web/lib/world-builder/glbAssets.ts` prints nothing.
- [ ] **Step 6: Commit** with message `feat: add model pipeline and licence register`.

### Task 5: Shared interaction and water effects

**Files:** Create `apps/web/lib/world-builder/socketAssemblyInput.ts`, `apps/web/lib/world-builder/waterEffects.ts`, `tests/unit/socket-assembly-input.test.ts`, `tests/unit/water-effects.test.ts`

**Interfaces:**
- Consumes: Task 2's assembly functions.
- Produces, from `world-builder`:
  - `createSocketInput({ interaction: InteractionSystem; pieces: Map<string,THREE.Object3D>; sockets: Map<string,THREE.Object3D>; getState; dispatch }): { update(dt): void; dispose(): void }`. Uses the existing `createInteractionSystem`; a picked piece follows the pointer or controller ray and is placed by selecting a socket.
  - `createFlowRibbon(curve, { width, color }): { object; setFlow(0..1); setClarity(0..1); update(dt); dispose() }`, using a scrolling texture offset and no custom shader
  - `createDropletPool({ max }): { mesh: THREE.InstancedMesh; emit(position, velocity); update(dt); dispose() }`
  - `createFillVolume({ radius, height, color }): { object; setFill(0..1); setClarity(0..1); dispose() }`

- [ ] **Step 1: Write failing tests:**
  - With a fake interaction system: selecting a piece then a socket dispatches pick then place; a second selection of the same socket in one frame dispatches nothing more.
  - `createDropletPool({max:200})` emits 500 and stays at 200 live, using one `InstancedMesh` (one draw call).
  - `setFill(2)` clamps to 1, and `setFill(-1)` to 0.
  - `dispose()` disposes geometry and material on all three effects.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.** In reduced motion, ribbons and droplets are replaced by static flow and fill states. Expose this as a `reducedMotion` option on each effect.
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit** with message `feat: add socket input and water effects kits`.

### Task 6: Rooftop vertical slice (owner checkpoint)

**Files:**
- Create: `apps/web/lib/rainwaterScene.ts`, `apps/web/lib/world-builder/stylizedKit.ts` (shared palette, `applyStylizedLighting(scene, mood)` and a scale guide for later kits), GLBs in `apps/web/public/models/rainwater/` (`sundargram-house.glb`, `gutter-piece.glb`, `downpipe.glb`, `courtyard-ground.glb`, `village-backdrop.glb`), `tests/unit/rainwater-scene.test.ts`
- Modify: `apps/web/components/simulations/RainwaterStorageViewer.tsx`, `apps/web/public/models/rainwater/SOURCES.json`, `tests/e2e/rainwater-mission.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: `createRainwaterScene(scene: THREE.Scene, assets: GlbAssetLoader, options: { reducedMotion: boolean }): Promise<{ apply(state: RainwaterState): void; update(dt: number): void; targets: Map<string, THREE.Object3D>; dispose(): void }>`. Every required prop has a coded fallback, and the GLB house has named nodes `Socket_Gutter_1` to `Socket_Gutter_4`.

Art direction: stylised low-poly, shared palette, single key light with baked or vertex-colour shading, soft hemisphere fill. Replace the 360° PNG backdrop with a gradient sky and `village-backdrop.glb` hills. Keep the PNGs until the checkpoint, and delete them only if the new look is approved and nothing references them.

Assets: start from Kenney and Poly Haven where they fit. Model the Sundargram house and gutter in Blender, using the installed Blender tools, because community kits don't cover Indian village houses.

- [ ] **Step 1: Write failing tests.**
  - Unit: `apply()` shows only the current stage's group, and `dispose()` releases all resources.
  - E2E: on the rooftop stage, place 3 gutters and the meter stays at 0 and the flow ribbon spills; place the fourth and the meter reads 1,250 L.
  - E2E: there is no button that completes the stage without placing pieces (the keyboard path places pieces via DOM controls for each socket).
  - E2E (Review Focus): with `**/models/rainwater/*.glb` blocked by `page.route`, the stage still completes with fallbacks and there are no uncaught errors.
  - E2E: draw calls and triangles on this stage are inside `QUEST_BASELINE`.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Create, optimise and register the models.** Each passes through `scripts/optimize-model.mjs`. `tests/unit/model-sources.test.ts` must pass.
- [ ] **Step 4: Implement the scene and rewire the viewer** to the reducer, for the `rooftop` stage. Other stages may use placeholders that advance. Keep `OrbitControls`, `createQuestVrControls`, the action keyboard path and the single clean instruction panel (remove the floating duplicate board).
- [ ] **Step 5: Run unit tests, E2E and `npm --workspace apps/web run type-check`.** Expected: all pass.
- [ ] **Step 6: Commit** with message `feat: add playable rooftop slice with 3D village`.
- [ ] **Step 7: Owner checkpoint: stop here.** Show the owner the rooftop in the browser, and in a headset if one is available, with a Quest FPS reading in `docs/releases/rainwater-pilot.md`. Do not continue until they approve the look and feel. Their feedback may change the art direction or the mechanic, and is cheapest to act on now.

### Task 7: Filter, school and recharge stages

**Files:**
- Create: `school.glb`, `filter-unit.glb`, `storage-tank.glb`, `recharge-pit.glb`, `layer-pieces.glb` in `apps/web/public/models/rainwater/`
- Modify: `apps/web/lib/rainwaterScene.ts`, `tests/e2e/rainwater-mission.spec.ts`, `SOURCES.json`

- [ ] **Step 1: Write failing E2E tests:**
  - Filter: placing pieces with first flush closed gives cloudy water and no litres. Open first flush, place stones, sand and charcoal in the correct order, and it runs clear with 2,500 L total.
  - School: connecting the roof fills the tank visibly faster than the house tank (fill rate at least 2 times) and reaches 5,000 L total.
  - Recharge: wrong layer order is rejected with the reason. Correct order shows the cutaway groundwater rising, and reaches 6,500 L total.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Science check before building the filter.** The existing text passes water "through stones, sand and charcoal". Confirm that order against the Class 5 NCERT chapter and common filter diagrams, record the result in `docs/releases/rainwater-pilot.md`, and change `solutionKind` if needed. Ask the owner if sources disagree.
- [ ] **Step 4: Implement.** Reuse `createSocketInput`, `createFillVolume` and `createFlowRibbon`. Show the safety line from Global Constraints on the filter stage.
- [ ] **Step 5: Run tests.** Expected: pass, and each stage stays inside `QUEST_BASELINE`.
- [ ] **Step 6: Commit** with message `feat: add filter, school and recharge stages`.

### Task 8: Heavy rain game

**Files:** Modify `apps/web/lib/rainwaterScene.ts`, `apps/web/components/simulations/RainwaterStorageViewer.tsx`, `tests/e2e/rainwater-mission.spec.ts`

**Interfaces:** Consumes the Task 3 API. Four valve targets are registered as `valve-houseTank`, `valve-schoolTank`, `valve-rechargePit` and `valve-pond`, plus `leaf-block`.

- [ ] **Step 1: Write failing E2E tests,** using a test seed and a fast clock if needed:
  - Selecting a valve changes the active channel. Full tanks flood the road.
  - Keys 1–4 route and B clears a block.
  - The result screen shows real routed litres and offers a replay.
  - Hiding the page pauses the storm, and returning resumes it with no time jump (Review Focus).
  - Ending the XR session has the same effect, tested by calling the viewer's session-end handler.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.** Visual storm intensity follows the inflow rate. The road floods via a `createFillVolume` plane. Offer the slower pace on the start of this stage. With reduced motion there is no shaking or flashing. Rain uses one droplet pool of at most 200.
- [ ] **Step 4: Run tests.** Expected: pass, and the storm's peak stays inside `QUEST_BASELINE`.
- [ ] **Step 5: Commit** with message `feat: add heavy rain routing game`.

### Task 9: Story stages and the look of the whole village

**Files:** Create `pond.glb`, `crops.glb`, `droppy.glb` in `apps/web/public/models/rainwater/`. Modify `apps/web/lib/rainwaterScene.ts`, `RainwaterStorageViewer.tsx`, `tests/e2e/rainwater-mission.spec.ts`

- [ ] **Step 1: Write failing E2E tests:**
  - `rainy-day`: following the drop raises the "lost" counter to 10,000 L while the saved meter stays at 0.
  - `drought`: the choice accepts only collect-and-store, and wrong answers explain why.
  - `summer`: allocations follow the earned amount, a low storm shows a shortage, and choosing drinking shows the treatment-and-testing message and spends nothing.
  - `finale`: the comparison reflects the child's own totals.
  - A full playthrough with default inputs stays within 8 minutes of narrated time (sum of narration durations plus the storm's 75 seconds).
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.**
  - Three environment moods (monsoon, drought, restored) come from sky colours, fog, and pond and crop state, sharing one set of models.
  - Droppy gets idle, cheer and worried reactions from lesson events. Use simple rigid or shape-key animation exported in the GLB.
  - Delete the old primitive-building code and now-unused helpers from the viewer.
- [ ] **Step 4: Run tests.** Expected: pass, inside budget at every stage.
- [ ] **Step 5: Commit** with message `feat: complete rainwater story stages and village art`.

### Task 10: Narration

**Files:** Modify `RainwaterStorageViewer.tsx` (`const NARRATIONS`), add MP3s in `apps/web/public/narration/`, `tests/unit/rainwater-lesson.test.ts`

- [ ] **Step 1: Write failing tests.** Reading the viewer source: no narration line contains `ten thousand litres` as an achievement, or `You saved every possible drop`, outside a variant used only at 10,000 L. Every line used for a stage exists in `NARRATIONS`.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Rewrite the narration.** One line per stage, with `finale` and `summer` variants for full, partial and short outcomes, and short feedback lines for gaps and wrong order. Keep it friendly, as Droppy, and short enough for the time limit.
- [ ] **Step 4: Run tests.** Expected: pass.
- [ ] **Step 5: Author the audio: a person must run or approve this.** This uses a network voice provider, and the standard makes it an explicit human action.

```bash
NARRATION_PYTHON=python node scripts/generate-narration-assets.mjs RainwaterStorageViewer.tsx
```

  Confirm the voice matches the existing storyteller. Delete only MP3s that no other viewer uses. If audio can't be authored yet, say so: the runtime falls back to speech synthesis, but this blocks release.
- [ ] **Step 6: Commit** with message `feat: rewrite rainwater narration for earned outcomes`.

### Task 11: Full mission acceptance and handover

**Files:** Modify `tests/e2e/rainwater-mission.spec.ts`, `docs/releases/rainwater-pilot.md`, and `apps/web/public/models/rainwater/` only if budgets require it.

- [ ] **Step 1: Write the failing keyboard test (Review Focus).** With `reducedMotion: 'reduce'` and only keyboard input, finish the whole mission including the storm at half pace. Assert the final saved total is above 6,500 L and captions were present at every stage.
- [ ] **Step 2: Implement any gaps it finds,** then confirm it passes.
- [ ] **Step 3: Run the repo checks.**

```bash
npm run quality
```

```bash
npm --workspace apps/web run build
```

```bash
npx playwright test tests/e2e/rainwater-mission.spec.ts tests/e2e/guided-simulation-routes.spec.ts tests/e2e/browser-camera-control.spec.ts
```

  Expected: all pass. Report honestly if `npm run reports:check` or `verify` can't run because `python3` is missing on this machine.
- [ ] **Step 4: Check evidence tooling.** `scripts/lib/pr8-quality-evidence.ts` and `scripts/generate-simulation-quality-data.ts` track this viewer (including a value of `54` for it). Find out what that value measures, then update it through the normal evidence path, and run `npm run reports:validate`. Don't change scores (Global Constraints).
- [ ] **Step 5: Complete `docs/releases/rainwater-pilot.md`:** before and after stats per stage, Quest device and FPS, package size change, asset list with licences, what wasn't tested.
- [ ] **Step 6: Commit** with message `test: add rainwater mission acceptance and release notes`.
- [ ] **Step 7: Owner sign-off and playtest.** The definition of done in the spec requires sign-off in a headset. Try it with a few children if possible, using the fun standard as the checklist, and note what they did. Do not open a PR or start other pilots until the owner agrees. Pushing to `main` deploys without running tests, so use a PR.
