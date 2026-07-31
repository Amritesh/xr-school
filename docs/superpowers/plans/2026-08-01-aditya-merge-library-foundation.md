# Aditya PR Merge and Simulation Library Foundation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to execute this plan task by task, `superpowers:test-driven-development` for every behavior change, and `superpowers:verification-before-completion` before each commit or release claim.

**Goal:** Preserve Aditya's PR #8 ancestry in a real two-parent merge, then replace its duplicated simulation plumbing with versioned workspace packages, one canonical implemented-simulation registry, and a reusable browser/WebXR host that supports the full 35-class portfolio.

**Architecture:** The merge commit records contribution history without making the PR branch the architectural source of truth. `@xr-school/simulation-schema` defines the contracts; `@xr-school/simulation-runtime` implements deterministic learning/domain behavior; `@xr-school/simulation-content` owns canonical released-class metadata; `@xr-school/simulation-web` owns Three/WebXR lifecycle, input, environment, narration, and disposal. The API, website, search, classroom sync, validators, and reports consume the same registry instead of maintaining parallel arrays.

**Tech Stack:** TypeScript 5.9, npm workspaces, Vitest, Next.js, Three.js/WebXR, Playwright, Node.js ESM, Git/GitHub.

---

### Task 1: Create the auditable two-parent PR merge

**Files:**

- Modify through merge: files changed by PR #8
- Preserve: `docs/superpowers/specs/2026-08-01-aditya-simulation-suite-integration-design.md`
- Test: existing `tests/unit/**/*.test.ts`

**Step 1: Record the exact starting state and PR object**

Run:

```bash
git status --short --branch
git rev-parse HEAD
git fetch https://github.com/Adityakrpand/xr-school.git 621dfb61b39a4c49e8abb46ce60c54ea3d044479:refs/remotes/aditya/pr-8
git rev-parse refs/remotes/aditya/pr-8
git merge-base HEAD refs/remotes/aditya/pr-8
```

Expected: the integration branch starts at the approved design commit and the fetched PR ref resolves exactly to `621dfb61b39a4c49e8abb46ce60c54ea3d044479`.

**Step 2: Start a no-commit, no-fast-forward merge**

Run:

```bash
git merge --no-ff --no-commit refs/remotes/aditya/pr-8
git status --short
```

Expected: conflicts are visible for explicit resolution; Git does not create a commit yet.

**Step 3: Resolve conflicts using the approved ownership rules**

For every conflict:

- keep current `main` architecture, package scripts, design system, existing canonical Pollination/Circuit/Solubility implementations, and current tests;
- retain all 23 contributed class routes/content/assets/narration files so the contribution remains inspectable;
- do not retain PR build-time `pip install`, `edge-tts`, duplicated runtime helpers, or older generated catalog state when they conflict;
- retain the PR Soluble/Insoluble content as input to the current canonical Solubility class rather than creating a 36th class;
- never resolve with a blanket `--ours` or `--theirs`.

After each file is resolved, stage it explicitly:

```bash
git add <resolved-file>
git diff --check --cached
git status --short
```

**Step 4: Prove the merge contains all contribution commits and a buildable baseline**

Run:

```bash
git diff --cached --stat
git merge-base --is-ancestor 621dfb61b39a4c49e8abb46ce60c54ea3d044479 MERGE_HEAD
npm test
```

Expected: the contribution tip is the pending second parent and tests pass after conflict resolution. If missing narration causes an inherited PR test to fail, change that test to validate the manifest/fallback contract before committing; never weaken it to a source-text assertion.

**Step 5: Commit the merge with both parents**

Run:

```bash
git commit -m "merge: integrate Aditya class simulations"
git show --no-patch --pretty='%H%n%P%n%s' HEAD
```

Expected: the merge commit has exactly two parents: the approved integration tip and PR tip `621dfb61...`.

---

### Task 2: Establish real workspace package boundaries

**Files:**

- Create: `tsconfig.base.json`
- Modify: `package.json`
- Modify: `packages/simulation-schema/package.json`
- Modify: `packages/simulation-schema/tsconfig.json`
- Modify: `packages/simulation-runtime/package.json`
- Modify: `packages/simulation-runtime/tsconfig.json`
- Modify: `packages/simulation-content/package.json`
- Modify: `packages/simulation-content/tsconfig.json`
- Modify: `packages/classroom-sync/package.json`
- Modify: `packages/classroom-sync/tsconfig.json`
- Create: `packages/evaluation-engine/package.json`
- Create: `packages/evaluation-engine/tsconfig.json`
- Create: `packages/evaluation-engine/src/index.ts`
- Test: `tests/unit/package-boundaries.test.ts`

**Step 1: Write the failing package-boundary test**

Create a test that reads every library `package.json` and asserts:

```ts
expect(manifest.private).toBe(false);
expect(manifest.exports["."].types).toBe("./dist/index.d.ts");
expect(manifest.exports["."].import).toBe("./dist/index.js");
expect(manifest.files).toContain("dist");
expect(manifest.scripts.build).toContain("tsconfig.build.json");
```

Also assert that each package source imports sibling libraries by `@xr-school/*`, not with `../../simulation-*/src` deep paths.

Run:

```bash
npx vitest run tests/unit/package-boundaries.test.ts
```

Expected: FAIL because the current package manifests expose source files and evaluation-engine is not a workspace package.

**Step 2: Add the shared compiler baseline and build configurations**

Create `tsconfig.base.json` with strict ES2022 settings. Each package gets a build config that emits ESM JavaScript and declarations into `dist`, excludes tests, and uses Node-compatible explicit `.js` relative imports internally.

Each package manifest must use this public shape:

```json
{
  "name": "@xr-school/<name>",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "type-check": "tsc -p tsconfig.json --noEmit"
  }
}
```

Add explicit workspace dependencies. Required dependency order is schema -> runtime/evaluation -> content/classroom-sync -> simulation-web.

**Step 3: Give evaluation-engine a public entry point**

Export the existing scoring API from `packages/evaluation-engine/src/index.ts` and replace tests' direct `src/scoring` imports with `@xr-school/evaluation-engine`.

**Step 4: Add root library scripts**

Add:

```json
"build:packages": "npm -ws --if-present run build",
"type-check:packages": "npm -ws --if-present run type-check",
"build": "npm run build:packages && npm --workspace apps/web run build"
```

Ensure the workspace package order is deterministic; if npm ordering is insufficient, create an explicit `scripts/build-packages.mjs` that invokes the dependency order and fails on the first package failure.

**Step 5: Install and verify the package graph**

Run:

```bash
npm install
npx vitest run tests/unit/package-boundaries.test.ts tests/unit/evaluation-scoring.test.ts
npm run type-check:packages
npm run build:packages
```

Expected: PASS and every library has a generated `dist/index.js` plus `dist/index.d.ts`. Do not commit `dist` unless the repository's package publication policy explicitly requires it.

**Step 6: Commit**

```bash
git add tsconfig.base.json package.json package-lock.json packages tests/unit/package-boundaries.test.ts tests/unit/evaluation-scoring.test.ts
git commit -m "build: establish simulation library packages"
```

---

### Task 3: Add standardized implemented-class contracts

**Files:**

- Create: `packages/simulation-schema/src/guided.ts`
- Create: `packages/simulation-schema/src/implemented.ts`
- Modify: `packages/simulation-schema/src/world.ts`
- Modify: `packages/simulation-schema/src/index.ts`
- Modify: `packages/simulation-content/src/index.ts`
- Test: `tests/unit/implemented-simulation-schema.test.ts`

**Step 1: Write failing schema tests**

Cover:

- guided stages require scene or answer evidence mode;
- conversion to `ExperienceDefinition` has no duplicate authored source;
- canonical records distinguish `publicationStatus` from `evidenceMaturity`;
- a `released/internalQA` browser class is allowed;
- `deviceVerified` requires a recorded device acceptance reference;
- released assets require URL, dimensions, byte size, SHA-256, license, source, and author;
- duplicate stage/narration/asset IDs fail;
- every narration cue references a stage.

Run:

```bash
npx vitest run tests/unit/implemented-simulation-schema.test.ts
```

Expected: FAIL because the new contracts do not exist.

**Step 2: Implement the exact guided contract**

```ts
export interface GuidedStageDefinition extends ExperienceStageDefinition {
  detail: string;
  actionLabel: string;
  narrationId: string;
  sceneCueId: string;
  evidenceMode: "scene" | "answer";
  scaleNote?: string;
  misconceptionId?: string;
  transferPromptId?: string;
}

export interface GuidedSimulationDefinition {
  id: string;
  moduleId: string;
  viewerKey: string;
  classContext: string;
  gradeTone: GradeToneProfile;
  objective: string;
  stages: GuidedStageDefinition[];
  completion: {
    eyebrow: string;
    headline: string;
    body: string;
    actionLabel: string;
  };
}
```

Implement `toExperienceDefinition(definition)` so `experience` is derived, not separately authored.

**Step 3: Implement narration and registry record contracts**

```ts
export type PublicationStatus = "released" | "preview" | "retired";
export type EvidenceMaturity =
  | "internalQA"
  | "deviceVerified"
  | "classroomVerified";

export interface NarrationCueDefinition {
  id: string;
  stageId: string;
  text: string;
  caption: string;
  audioUrl?: string;
}

export interface SimulationNarrationManifest {
  id: string;
  cues: NarrationCueDefinition[];
  fallback: "browserTts" | "none";
}

export interface ImplementedSimulationDefinition {
  module: SimulationModuleRecord;
  kind: "guided" | "interactive";
  experience: ExperienceDefinition;
  assessment: AssessmentSequence;
  narration: SimulationNarrationManifest;
  assets: AssetManifest;
  legacyPaths: string[];
  contribution: {
    source: "existing" | "pr-8";
    contributor?: string;
    sourcePath?: string;
  };
}
```

Add required `viewerKey`, `publicationStatus`, and `evidenceMaturity` plus optional `legacyAliases` and acceptance evidence references to `SimulationModuleRecord`. Extend `AssetDefinition` with optional `sha256` and `byteSize` for source compatibility, then make the released-record validator enforce them.

**Step 4: Implement validators and builders**

Export:

- `validateGuidedSimulationDefinition`
- `toExperienceDefinition`
- `validateNarrationManifest`
- `validateImplementedSimulationDefinition`
- `defineImplementedSimulation`
- `defineGuidedImplementedSimulation`

Validators return stable, path-qualified errors and never silently repair content.

**Step 5: Run tests and package builds**

```bash
npx vitest run tests/unit/implemented-simulation-schema.test.ts tests/unit/experience-schema.test.ts tests/unit/world-schema.test.ts tests/unit/simulation-modules.test.ts
npm run type-check:packages
npm run build:packages
```

Expected: PASS.

**Step 6: Commit**

```bash
git add packages/simulation-schema packages/simulation-content tests/unit/implemented-simulation-schema.test.ts
git commit -m "feat: define released simulation contracts"
```

---

### Task 4: Create the canonical implemented-simulation registry

**Files:**

- Create: `packages/simulation-content/src/implemented/registry.ts`
- Create: `packages/simulation-content/src/implemented/existing.ts`
- Modify: `packages/simulation-content/src/modules.ts`
- Modify: `packages/simulation-content/src/index.ts`
- Modify: `apps/web/lib/simulationAvailability.ts`
- Test: `tests/unit/implemented-simulation-registry.test.ts`
- Test: `tests/unit/simulation-availability.test.ts`

**Step 1: Write the failing registry test**

At the foundation stage, assert exactly the 13 current canonical records, unique IDs/slugs/routes, full validation, and lookup by ID, slug, canonical path, and each existing legacy path. Add the 35-class/23-contribution assertion as a new RED test in Task 8 only after guided and interactive exports are ready to integrate; never commit a skipped release-count test.

Run:

```bash
npx vitest run tests/unit/implemented-simulation-registry.test.ts
```

Expected: FAIL because no registry exists.

**Step 2: Implement the registry APIs**

Export:

```ts
export const IMPLEMENTED_SIMULATIONS: readonly ImplementedSimulationDefinition[];
export function routeForSimulation(
  definition: ImplementedSimulationDefinition,
): string;
export function findImplementedSimulation(
  value: string,
): ImplementedSimulationDefinition | undefined;
export function resolveSimulationPath(path: string):
  | {
      definition: ImplementedSimulationDefinition;
      canonicalPath: string;
      redirect: boolean;
    }
  | undefined;
```

Build indexed maps once, throw during module initialization on duplicate IDs/slugs/paths, and keep arrays readonly.

**Step 3: Wrap the 13 existing released classes**

Create definitions for the 13 currently implemented classes using their real experience/assessment/asset data. Where an older class lacks one contract, add the smallest honest manifest and internal-QA evidence record rather than claiming device/classroom validation. Existing viewers remain authoritative.

**Step 4: Derive web availability from the registry**

Replace the separately authored card array in `apps/web/lib/simulationAvailability.ts` with a mapper over released registry records. Preserve presentation-only copy as an explicit optional web overlay keyed by module ID; reject overlay keys not present in the registry.

**Step 5: Run focused tests**

```bash
npx vitest run tests/unit/implemented-simulation-registry.test.ts tests/unit/simulation-availability.test.ts tests/unit/simulation-release-policy.test.ts tests/unit/curriculum-search.test.ts
```

Expected: PASS for the 13-class foundation fixture and no duplicate metadata source.

**Step 6: Commit**

```bash
git add packages/simulation-content apps/web/lib/simulationAvailability.ts tests/unit/implemented-simulation-registry.test.ts tests/unit/simulation-availability.test.ts
git commit -m "refactor: centralize implemented simulation registry"
```

---

### Task 5: Build `@xr-school/simulation-web`

**Files:**

- Create: `packages/simulation-web/package.json`
- Create: `packages/simulation-web/tsconfig.json`
- Create: `packages/simulation-web/tsconfig.build.json`
- Create: `packages/simulation-web/src/scene/types.ts`
- Create: `packages/simulation-web/src/host/createSimulationHost.ts`
- Create: `packages/simulation-web/src/input/createWebInputRouter.ts`
- Create: `packages/simulation-web/src/audio/createNarrationController.ts`
- Create: `packages/simulation-web/src/environment/createEnvironment.ts`
- Create: `packages/simulation-web/src/assets/loadManifestAsset.ts`
- Create: `packages/simulation-web/src/index.ts`
- Refactor: `apps/web/lib/world-builder/webSimulationRuntime.ts`
- Refactor: `apps/web/lib/simulationAudio.ts`
- Refactor: `apps/web/lib/vr/vrPlayerRig.ts`
- Refactor: `apps/web/lib/vr/vrLocomotion.ts`
- Create: `apps/web/components/simulation-experience/SimulationCanvasHost.tsx`
- Modify: `apps/web/components/simulation-experience/SimulationExperienceShell.tsx`
- Test: `tests/unit/simulation-web-host.test.ts`
- Test: `tests/unit/simulation-web-input.test.ts`
- Test: `tests/unit/simulation-web-narration.test.ts`

**Step 1: Write failing host lifecycle tests**

Use a fake renderer/adapter/browser platform. Assert initialize-once, fixed/render update forwarding, snapshot projection, normalized action forwarding, evidence forwarding, profile changes, bounded locomotion, snap/reduced-motion preferences, VR entry, reverse-order disposal, and rollback after initialization failure.

Also assert narration preference order: committed audio -> browser TTS fallback -> silent/captions, with replay and stop; no network or Python process is invoked.

Run:

```bash
npx vitest run tests/unit/simulation-web-host.test.ts tests/unit/simulation-web-input.test.ts tests/unit/simulation-web-narration.test.ts
```

Expected: FAIL because the package does not exist.

**Step 2: Implement the exact scene contracts**

```ts
export interface SimulationLaunchPreferences {
  reducedMotion: boolean;
  seatedMode: boolean;
  locomotion: "stationary" | "boundedTeleport";
  turnMode: "snap" | "smooth" | "none";
}

export interface SimulationSceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  resources: ResourceRegistry;
  profile(): QualityProfileId;
  preferences: SimulationLaunchPreferences;
  interactions: SimulationInteractionRegistry;
  dispatch(action: NormalizedAction): void;
  recordEvidence(evidenceId: string): void;
}

export interface SimulationSceneHandle {
  applySnapshot(snapshot: LessonSnapshot): void;
  fixedUpdate?(context: FixedUpdateContext): void;
  renderUpdate?(context: RenderUpdateContext): void;
  focusTarget?(): THREE.Object3D | undefined;
  dispose(): void | Promise<void>;
}

export interface SimulationSceneAdapter {
  id: string;
  create(
    context: SimulationSceneContext,
  ): SimulationSceneHandle | Promise<SimulationSceneHandle>;
}
```

Interaction targets use an explicit registry rather than mesh `userData` conventions:

```ts
export interface SimulationInteractionTarget {
  id: string;
  object: THREE.Object3D;
  actionId: string;
  accessibilityLabel: string;
  inputSources?: NormalizedInputSource[];
  onCommit?(action: NormalizedAction): void;
}

export interface SimulationInteractionRegistry {
  register(target: SimulationInteractionTarget): () => void;
  activate(targetId: string, source: NormalizedInputSource): void;
  clear(): void;
}
```

The host raycasts only registered targets for pointer, touch, and XR-select input. It uses the current snapshot's `stageId` to create the normalized action, dispatches the action, and then invokes `onCommit`; keyboard/DOM proxies call `activate`.

**Step 3: Implement the host and narration APIs**

The host must expose:

```ts
export interface SimulationHost {
  renderer: THREE.WebGLRenderer;
  resources: ResourceRegistry;
  initialize(): Promise<void>;
  profile(): QualityProfileId;
  dispatch(action: NormalizedAction): void;
  applySnapshot(snapshot: LessonSnapshot): void;
  enterVr(): Promise<void>;
  focusTarget(): THREE.Object3D | undefined;
  narration: SimulationNarrationController;
  dispose(): Promise<void>;
}
```

`SimulationHostConfig` takes the mount, adapter, launch preferences, narration manifest, and optional `onAction`, `onEvidence`, and `onProfileChange` callbacks. The host owns renderer/session/resize/input/animation-loop lifecycle; scene adapters own only class-specific projection and scene resources.

Add `npm run narration:validate` to verification. Add the explicit author-only command `npm run narration:author -- --manifest <path> --provider edge-tts`; it may use network/provider tooling only when a maintainer invokes it directly and must never run during install, build, test, verify, or deploy. Omit `audioUrl` when no committed file exists so captions and browser TTS are the honest fallback.

**Step 4: Move reusable app utilities into the package**

Port and improve the existing web runtime, narration, environment, player rig, and locomotion behavior. Leave deprecated app-level forwarding exports for one commit so current classes continue compiling, then migrate imports and remove them after all viewer plans land.

Enforce:

- no primary controller button advances learning without the required action/evidence;
- bounded movement only;
- head-relative direction;
- no fast locomotion default;
- captions always available;
- resize/session listeners removed on dispose;
- asset loads registered for disposal and failures surfaced to the shell.

`SimulationCanvasHost.tsx` is `forwardRef<HTMLDivElement, { ariaLabel: string; className?: string; busy?: boolean }>` and owns the one reusable React mount node, `data-testid="simulation-canvas"`, `role="img"`, its accessible label, and `aria-busy`. `SimulationExperienceShell.tsx` owns the stable root `data-simulation-id`/`data-stage-id` attributes and the `simulation-launch`, `stage-title`, `stage-cue`, `primary-action`, `feedback`, `narration-replay`, `restart`, and `completion` test hooks. Package code remains framework-neutral.

Extend the shell/HUD with these common props while retaining the current API during migration:

```ts
simulationId: string;
primaryAction?: {
  label: string;
  disabled?: boolean;
  onActivate(): void;
};
assessment?: {
  promptId: string;
  question: string;
  options: readonly { id: string; label: string }[];
  selectedId?: string;
  feedback?: string;
  onAnswer(optionId: string): void;
};
caption?: string;
onReplayNarration?(): void;
onRestart?(): void;
helpText?: string;
```

The primary action is the accessible DOM equivalent of the active scene interaction, not a skip/advance control. Answer-mode stages expose the assessment control. `Continue` remains unavailable until the lesson session reports the required action and evidence.

**Step 5: Verify package and compatibility**

```bash
npx vitest run tests/unit/simulation-web-host.test.ts tests/unit/simulation-web-input.test.ts tests/unit/simulation-web-narration.test.ts tests/unit/web-simulation-runtime.test.ts tests/unit/vr-framework.test.ts tests/unit/simulation-audio-contract.test.ts
npm run type-check:packages
npm run build:packages
```

Expected: PASS.

**Step 6: Commit**

```bash
git add packages/simulation-web apps/web/lib tests/unit/simulation-web-*.test.ts tests/unit/web-simulation-runtime.test.ts tests/unit/vr-framework.test.ts
git commit -m "feat: add reusable browser XR simulation host"
```

---

### Task 6: Make registry-driven routing the only launch path

**Files:**

- Create: `apps/web/lib/simulations/viewerRegistry.ts`
- Create: `apps/web/components/simulations/shared/SimulationRoutePage.tsx`
- Modify: `apps/web/app/simulations/**/page.tsx`
- Test: `tests/unit/simulation-viewer-registry.test.ts`
- Test: `tests/unit/simulation-route-resolution.test.ts`

**Step 1: Write failing route tests**

Assert every released definition has one viewer factory, its canonical path resolves, every PR legacy path resolves to the canonical path, unknown slugs return not-found, and no viewer key exists outside the content registry.

Run:

```bash
npx vitest run tests/unit/simulation-viewer-registry.test.ts tests/unit/simulation-route-resolution.test.ts
```

Expected: FAIL because routing is still distributed over static files.

**Step 2: Implement a typed viewer registry**

Use dynamic imports keyed by `module.viewerKey`. The registry must validate exhaustiveness against `IMPLEMENTED_SIMULATIONS` at module load and expose no default catch-all viewer for released classes.

**Step 3: Implement canonical and legacy routes**

Keep the repository's thin dedicated-page convention. `SimulationRoutePage` resolves a supplied canonical slug through `findImplementedSimulation`, loads its viewer key, and renders the registered component. Every canonical `page.tsx` is a two-line composition around `SimulationRoutePage`; every legacy PR `page.tsx` is a server `redirect()` to the canonical path. Existing static pages become the same thin composition only after their parity tests pass. Do not duplicate lesson/viewer logic in route files and do not add an unvalidated catch-all viewer.

**Step 4: Verify routes**

```bash
npx vitest run tests/unit/simulation-viewer-registry.test.ts tests/unit/simulation-route-resolution.test.ts tests/unit/catalog-runtime-viewer.test.ts tests/unit/simulation-availability.test.ts
npm --workspace apps/web run type-check
npm --workspace apps/web run build
```

Expected: PASS; build output includes every canonical class route.

**Step 5: Commit**

```bash
git add apps/web tests/unit/simulation-viewer-registry.test.ts tests/unit/simulation-route-resolution.test.ts
git commit -m "refactor: drive simulation routes from registry"
```

---

### Task 7: Move API, classroom, search, and generated data onto the registry

**Files:**

- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/package.json`
- Modify: `apps/api/tsconfig.json`
- Modify: `packages/classroom-sync/src/**/*.ts`
- Modify: `packages/simulation-content/src/curriculum.ts`
- Modify: `scripts/generate-web-catalog.mjs`
- Modify: `scripts/validate-simulation-catalog.mjs`
- Modify: `package.json`
- Test: `tests/unit/registry-consumers.test.ts`
- Test: `tests/unit/openapi-contract.test.ts`
- Test: `tests/unit/robotree-session-manager.test.ts`

**Step 1: Write a failing consumer-drift test**

Assert API simulation responses, classroom launch IDs, curriculum search documents, web catalog availability, and report input IDs equal the released registry IDs exactly. Assert no production source imports `packages/*/src` across package boundaries.

Run:

```bash
npx vitest run tests/unit/registry-consumers.test.ts
```

Expected: FAIL because current consumers maintain separate lists/deep imports.

**Step 2: Replace deep imports and duplicate arrays**

Use public `@xr-school/*` exports. Fix API Node ESM extensions and request-body typing while touching the build. Do not change API semantics beyond using canonical records and adding honest publication/evidence fields.

**Step 3: Add API and all-package checks to verification**

Root verification must run:

```json
"verify": "npm run env:check && npm run contract:compile && npm run catalog:validate && npm run web-catalog:generate && npm run test && npm run type-check:packages && npm run build:packages && npm --workspace apps/api run build && npm --workspace apps/web run type-check && npm --workspace apps/web run build"
```

**Step 4: Run focused and full checks**

```bash
npx vitest run tests/unit/registry-consumers.test.ts tests/unit/openapi-contract.test.ts tests/unit/robotree-session-manager.test.ts tests/unit/curriculum-search.test.ts tests/unit/web-catalog-generator.test.ts
npm run verify
```

Expected: PASS, including API build.

**Step 5: Commit**

```bash
git add apps/api packages/classroom-sync packages/simulation-content scripts package.json tests/unit/registry-consumers.test.ts
git commit -m "refactor: unify simulation registry consumers"
```

---

### Task 8: Complete the suite and remove transitional duplication

**Files:**

- Integrate outputs of:
  - `docs/superpowers/plans/2026-08-01-aditya-guided-classes.md`
  - `docs/superpowers/plans/2026-08-01-aditya-interactive-investigations.md`
- Remove: superseded PR viewer/helper clones and deprecated app forwarding exports
- Modify: `tests/unit/implemented-simulation-registry.test.ts`
- Test: all `tests/unit/**/*.test.ts`

**Step 1: Land all guided and interactive definitions/viewers**

Execute the two class plans. They must populate the canonical registry with all 22 net-new classes and attach the 23rd Soluble/Insoluble contribution to existing Solubility provenance/content.

**Step 2: Write the final-count RED test, integrate both arrays, and assert the final counts**

The test must prove:

```ts
expect(IMPLEMENTED_SIMULATIONS).toHaveLength(35);
expect(
  new Set(IMPLEMENTED_SIMULATIONS.map((item) => item.module.slug)),
).toHaveLength(35);
expect(
  IMPLEMENTED_SIMULATIONS.filter((item) => item.contribution.source === "pr-8"),
).toHaveLength(23);
```

If Solubility has contribution provenance as an array rather than one object, assert 23 contribution records separately; never falsify the unique class count.

**Step 3: Detect and remove duplicated PR infrastructure**

Delete superseded copies only after `rg` confirms no imports. The deny-list test must reject production definitions of duplicate runtime/narration/environment/controller helpers outside their owning packages.

Run:

```bash
rg -n "questVrControls|narrationAudio|realisticEnvironment|function createWebSimulationRuntime|class .*Narration" apps packages
npx vitest run tests/unit/implemented-simulation-registry.test.ts tests/unit/package-boundaries.test.ts tests/unit/registry-consumers.test.ts
npm run verify
```

Expected: only canonical package implementations/intentional compatibility references remain; all 35 records validate and all checks pass.

**Step 4: Commit**

```bash
git add apps packages tests
git commit -m "refactor: complete standardized simulation suite"
```

---

### Task 9: Hand off to reporting and release

**Files:**

- Execute: `docs/superpowers/plans/2026-08-01-simulation-quality-reports-and-release.md`

**Step 1: Run the report/release plan only after suite verification**

The release plan owns final scorecard generation, the portfolio quality report, top-ten mistakes report, Aditya contribution improvement report, PDFs, browser smoke checks, push to `origin/main`, deployment polling, and live route verification.

**Step 2: Preserve push safety**

Before push:

```bash
git fetch origin main
git merge-base --is-ancestor origin/main HEAD
git status --short
git log --oneline --decorate origin/main..HEAD
```

If `origin/main` advanced, rebase only the post-merge work while preserving the two-parent merge commit, or merge current `origin/main` into the integration branch; never force-push and never rewrite Aditya's ancestry.

**Step 3: Final evidence requirement**

Do not claim completion until the release plan has recorded:

- final test/build command outputs;
- GitHub `main` SHA matching the pushed local SHA;
- deployment SHA/version matching that commit;
- HTTP and browser checks for the homepage, catalog, all 35 canonical routes, representative assets, and legacy redirects;
- absolute paths to all shareable Markdown/PDF reports.
