# World Builder Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver W0, a tested and deployed world-builder foundation with deterministic lifecycle execution, adaptive rendering contracts, canonical physics, hidden scientific-model validation, reusable assessment logic, and strict release-pipeline gates.

**Architecture:** Shared schema contracts live in `packages/simulation-schema`; engine-agnostic lifecycle, science, assessment, and physics behavior live in `packages/simulation-runtime`; Three.js presentation adapters live in `apps/web/lib/world-builder`. Existing viewers remain operational while a diagnostic reference world proves the new runtime. Each task is committed independently, and W0 is pushed and deployed only after the complete foundation gate passes.

**Tech Stack:** TypeScript 5.9, Vitest, Three.js 0.170, WebXR, `@dimforge/rapier3d-compat` 0.19.3, React 19, Next.js 15, Playwright, GitHub Actions, Vercel

---

## Scope Boundary

This plan implements only W0 from the approved specification:

- schema and validation;
- deterministic lifecycle and resources;
- adaptive quality selection and frame diagnostics;
- PBR material, asset, and environment adapters;
- canonical Rapier integration and removal of the duplicate web physics engine;
- scientific-model registry;
- assessment sequence engine;
- diagnostic reference world;
- documentation and optimized verification/deployment gates.

Pollination migration begins in a separate W1 plan after W0 is deployed and production-verified.

## File Structure

### Shared schema

- `packages/simulation-schema/src/world.ts` — world, entity, quality, material, environment, asset, scientific-model, assessment, and acceptance types.
- `packages/simulation-schema/src/worldValidation.ts` — structural and reference validation.
- `packages/simulation-schema/src/index.ts` — public exports.

### Runtime

- `packages/simulation-runtime/src/world/fixedClock.ts` — accumulator with fixed `1 / 60` step and four-step cap.
- `packages/simulation-runtime/src/world/resourceRegistry.ts` — deterministic LIFO cleanup and leak reporting.
- `packages/simulation-runtime/src/world/runtime.ts` — dependency ordering and lifecycle orchestration.
- `packages/simulation-runtime/src/world/quality.ts` — pure quality-profile selection and downgrade logic.
- `packages/simulation-runtime/src/world/scientificModels.ts` — manifest registration and reference-vector verification.
- `packages/simulation-runtime/src/world/assessment.ts` — prompt, hint, retry, evidence, and mastery state machine.
- `packages/simulation-runtime/src/physics/rapierWorld.ts` — asynchronous Rapier world adapter.
- `packages/simulation-runtime/src/index.ts` — public exports.

### Web presentation

- `apps/web/lib/world-builder/deviceProfile.ts` — browser/Quest capability classification.
- `apps/web/lib/world-builder/materialFactory.ts` — map loading, color spaces, PBR construction, and fallback materials.
- `apps/web/lib/world-builder/environmentFactory.ts` — lighting, PMREM environment, fog, tone mapping, and fallback rig.
- `apps/web/lib/world-builder/presentationPipeline.ts` — direct XR renderer and optional browser composer.
- `apps/web/lib/world-builder/diagnostics.ts` — draw-call, triangle, frame-time, and quality-budget report.
- `apps/web/components/simulations/WorldBuilderDiagnosticViewer.tsx` — W0 reference world.
- `apps/web/app/simulations/world-builder-diagnostic/page.tsx` — non-catalogued diagnostic route.

### Documentation and CI

- `docs/ontology/simulation-ontology.md` — graph relationships.
- `docs/simulation-design/simulation-design-system.md` — PBR, hidden science, assessment, and performance rules.
- `docs/architecture/world-builder.md` — public runtime contract and lifecycle.
- `docs/releases/w0-world-builder-foundation.md` — acceptance evidence.
- `.github/workflows/quality.yml` — one strict verification job plus drift check.
- `.github/workflows/deploy.yml` — deployment after strict build validation.
- `package.json` — explicit verification scripts.

## Task 1: World-Builder Schema and Reference Validation

**Files:**
- Create: `packages/simulation-schema/src/world.ts`
- Create: `packages/simulation-schema/src/worldValidation.ts`
- Modify: `packages/simulation-schema/src/index.ts`
- Test: `tests/unit/world-schema.test.ts`
- Modify: `docs/ontology/simulation-ontology.md`

- [ ] **Step 1: Write the failing schema-validation tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  QUEST_BASELINE_PROFILE,
  validateWorldBundle,
  type WorldBundle,
} from '../../packages/simulation-schema/src/index';

function validBundle(): WorldBundle {
  return {
    world: {
      id: 'world-diagnostic',
      version: '1.0.0',
      title: 'Diagnostic World',
      metersPerWorldUnit: 1,
      environmentId: 'environment-diagnostic',
      qualityProfileIds: ['questBaseline', 'browserBalanced'],
      entityIds: ['entity-sphere'],
      systemIds: ['system-diagnostic'],
      scientificModelIds: ['model-diagnostic'],
      lessonSequenceId: 'lesson-diagnostic',
      assessmentSequenceId: 'assessment-diagnostic',
      assetManifestId: 'assets-diagnostic',
      acceptanceProfileId: 'acceptance-diagnostic',
    },
    entities: [{
      id: 'entity-sphere',
      visualId: 'visual-sphere',
      transform: { position: [0, 1, -2], rotation: [0, 0, 0], scale: [1, 1, 1] },
      materialId: 'material-diagnostic',
      interactionTags: ['selectable'],
    }],
    environments: [{
      id: 'environment-diagnostic',
      background: { kind: 'color', value: '#071014' },
      keyLight: { kind: 'directional', color: '#ffffff', intensity: 2, position: [2, 4, 1], castsShadow: true },
      accentLights: [],
      exposure: 1,
      toneMapping: 'AgX',
    }],
    materials: [{
      id: 'material-diagnostic',
      model: 'standard',
      baseColor: '#77d8d4',
      roughness: 0.45,
      metalness: 0,
    }],
    qualityProfiles: [QUEST_BASELINE_PROFILE],
    scientificModels: [{
      id: 'model-diagnostic',
      version: '1.0.0',
      domain: 'classification',
      internalUnits: {},
      validInputRanges: {},
      assumptions: ['Diagnostic identity model'],
      limitations: ['Not a curriculum model'],
      referenceSources: ['XR School W0 specification'],
      referenceVectors: [{ id: 'identity', inputs: { value: 1 }, expectedOutputs: { value: 1 } }],
      numericalTolerance: 0,
    }],
    assessments: [{
      id: 'assessment-diagnostic',
      objectiveId: 'objective-diagnostic',
      prompts: [
        { id: 'observe', kind: 'observation', stageId: 'stage-1', question: 'Which object changed?', acceptedEvidenceIds: ['sphere'], hint: 'Watch the sphere.', explanation: 'The sphere changed.', retryPolicy: 'immediateWithHint' },
        { id: 'misconception', kind: 'misconception', stageId: 'stage-1', question: 'Did color change mass?', acceptedEvidenceIds: ['no'], hint: 'Only appearance changed.', explanation: 'Color does not change mass.', retryPolicy: 'afterObservation' },
        { id: 'transfer', kind: 'transfer', stageId: 'stage-1', question: 'Would another color change mass?', acceptedEvidenceIds: ['no'], hint: 'Apply the same rule.', explanation: 'Material color does not set mass.', retryPolicy: 'immediateWithHint' },
      ],
      masteryRule: { requiredEvidenceCount: 2, requiredKinds: ['misconception', 'transfer'], allowHintedMastery: true },
    }],
    assetManifests: [{ id: 'assets-diagnostic', assets: [] }],
    acceptanceProfiles: [{
      id: 'acceptance-diagnostic',
      requiredQualityProfileId: 'questBaseline',
      minSteadyFps: 72,
      maxDrawCalls: 120,
      maxVisibleTriangles: 250_000,
      requiresQuestAcceptance: true,
    }],
    lessonSequenceIds: ['lesson-diagnostic'],
    systemIds: ['system-diagnostic'],
  };
}

describe('world schema', () => {
  it('accepts a complete reference graph', () => {
    expect(validateWorldBundle(validBundle())).toEqual([]);
  });

  it('rejects unresolved references and invalid PBR ranges', () => {
    const bundle = validBundle();
    bundle.world.environmentId = 'missing-environment';
    bundle.materials[0].roughness = 1.2;
    expect(validateWorldBundle(bundle)).toEqual(expect.arrayContaining([
      'world-diagnostic: missing environment missing-environment',
      'material-diagnostic: roughness must be between 0 and 1',
    ]));
  });

  it('rejects assessment sequences without misconception and transfer evidence', () => {
    const bundle = validBundle();
    bundle.assessments[0].prompts = bundle.assessments[0].prompts.filter(prompt => prompt.kind === 'observation');
    expect(validateWorldBundle(bundle).join('\n')).toMatch(/misconception.*transfer/);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx vitest run tests/unit/world-schema.test.ts
```

Expected: FAIL because `WorldBundle`, `QUEST_BASELINE_PROFILE`, and `validateWorldBundle` do not exist.

- [ ] **Step 3: Add the world contracts**

Create `world.ts` with the exact interfaces approved in the specification and these aggregate types:

```ts
export const QUALITY_PROFILE_IDS = ['questBaseline', 'browserBalanced', 'browserEnhanced'] as const;
export type QualityProfileId = (typeof QUALITY_PROFILE_IDS)[number];

export interface QualityProfile {
  id: QualityProfileId;
  minSteadyFps: number;
  maxVisibleTriangles: number;
  maxDrawCalls: number;
  maxTextureSize: number;
  maxShadowLights: number;
  maxShadowMapSize: number;
  maxPixelRatio: number;
  postProcessing: ('antialias' | 'ambientOcclusion' | 'selectiveBloom' | 'output')[];
}

export const QUEST_BASELINE_PROFILE: QualityProfile = {
  id: 'questBaseline',
  minSteadyFps: 72,
  maxVisibleTriangles: 250_000,
  maxDrawCalls: 120,
  maxTextureSize: 1024,
  maxShadowLights: 1,
  maxShadowMapSize: 1024,
  maxPixelRatio: 1,
  postProcessing: [],
};

export interface WorldBundle {
  world: WorldDefinition;
  entities: WorldEntityDefinition[];
  environments: EnvironmentDefinition[];
  materials: PbrMaterialDefinition[];
  qualityProfiles: QualityProfile[];
  scientificModels: ScientificModelManifest[];
  assessments: AssessmentSequence[];
  assetManifests: AssetManifest[];
  acceptanceProfiles: AcceptanceProfile[];
  lessonSequenceIds: string[];
  systemIds: string[];
}
```

Include every field from the approved specification. Define `AssetDefinition` with `id`, `url`, `kind`, `source`, `license`, `author`, `width`, `height`, `channels`, `compression`, and optional `fallbackAssetId`.

- [ ] **Step 4: Implement graph validation**

Create `worldValidation.ts` with:

```ts
export function validateWorldBundle(bundle: WorldBundle) {
  const errors: string[] = [];
  const environmentIds = new Set(bundle.environments.map(item => item.id));
  const entityIds = new Set(bundle.entities.map(item => item.id));
  const materialIds = new Set(bundle.materials.map(item => item.id));
  const qualityIds = new Set(bundle.qualityProfiles.map(item => item.id));
  const modelIds = new Set(bundle.scientificModels.map(item => item.id));
  const assessmentIds = new Set(bundle.assessments.map(item => item.id));
  const assetManifestIds = new Set(bundle.assetManifests.map(item => item.id));
  const acceptanceIds = new Set(bundle.acceptanceProfiles.map(item => item.id));

  if (!environmentIds.has(bundle.world.environmentId)) errors.push(`${bundle.world.id}: missing environment ${bundle.world.environmentId}`);
  for (const id of bundle.world.entityIds) if (!entityIds.has(id)) errors.push(`${bundle.world.id}: missing entity ${id}`);
  for (const id of bundle.world.qualityProfileIds) if (!qualityIds.has(id)) errors.push(`${bundle.world.id}: missing quality profile ${id}`);
  for (const id of bundle.world.scientificModelIds) if (!modelIds.has(id)) errors.push(`${bundle.world.id}: missing scientific model ${id}`);
  if (!assessmentIds.has(bundle.world.assessmentSequenceId)) errors.push(`${bundle.world.id}: missing assessment ${bundle.world.assessmentSequenceId}`);
  if (!assetManifestIds.has(bundle.world.assetManifestId)) errors.push(`${bundle.world.id}: missing asset manifest ${bundle.world.assetManifestId}`);
  if (!acceptanceIds.has(bundle.world.acceptanceProfileId)) errors.push(`${bundle.world.id}: missing acceptance profile ${bundle.world.acceptanceProfileId}`);

  for (const entity of bundle.entities) {
    if (entity.materialId && !materialIds.has(entity.materialId)) errors.push(`${entity.id}: missing material ${entity.materialId}`);
  }
  for (const material of bundle.materials) {
    if (material.roughness < 0 || material.roughness > 1) errors.push(`${material.id}: roughness must be between 0 and 1`);
    if (material.metalness < 0 || material.metalness > 1) errors.push(`${material.id}: metalness must be between 0 and 1`);
  }
  for (const sequence of bundle.assessments) {
    const kinds = new Set(sequence.prompts.map(prompt => prompt.kind));
    if (!kinds.has('misconception') || !kinds.has('transfer')) errors.push(`${sequence.id}: assessment requires misconception and transfer prompts`);
  }
  return errors;
}
```

Add duplicate-ID, finite-number, positive-scale, profile-budget, asset-license, reference-vector, and mastery-rule checks before exporting the validator through `index.ts`.

- [ ] **Step 5: Update the ontology**

Add `WorldDefinition`, `WorldEntityDefinition`, `EnvironmentDefinition`, `PbrMaterialDefinition`, `ScientificModelManifest`, `AssessmentSequence`, `AssetManifest`, and `AcceptanceProfile` to the ontology graph with their reference edges and fail-closed validation rules.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/world-schema.test.ts
npm run spec:drift
```

Expected: all world-schema tests pass and spec drift reports that schema changes include ontology documentation.

- [ ] **Step 7: Commit Task 1**

```bash
git add packages/simulation-schema/src/world.ts packages/simulation-schema/src/worldValidation.ts packages/simulation-schema/src/index.ts tests/unit/world-schema.test.ts docs/ontology/simulation-ontology.md
git commit -m "feat: define world builder contracts"
```

## Task 2: Fixed Clock and Resource Registry

**Files:**
- Create: `packages/simulation-runtime/src/world/fixedClock.ts`
- Create: `packages/simulation-runtime/src/world/resourceRegistry.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/world-runtime-foundation.test.ts`

- [ ] **Step 1: Write failing clock and registry tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  createFixedClock,
  createResourceRegistry,
} from '../../packages/simulation-runtime/src/index';

describe('world runtime foundation', () => {
  it('uses 1/60 fixed updates and caps catch-up at four steps', () => {
    const clock = createFixedClock({ fixedStepSeconds: 1 / 60, maxSubsteps: 4, maxFrameDeltaSeconds: 0.1 });
    expect(clock.advance(1 / 30)).toMatchObject({ steps: 2, fixedStepSeconds: 1 / 60 });
    expect(clock.advance(1)).toMatchObject({ steps: 4 });
  });

  it('disposes registered resources in reverse order exactly once', async () => {
    const order: string[] = [];
    const registry = createResourceRegistry();
    registry.register('texture', () => { order.push('texture'); });
    registry.register('renderer', async () => { order.push('renderer'); });
    await registry.disposeAll();
    await registry.disposeAll();
    expect(order).toEqual(['renderer', 'texture']);
    expect(registry.leaks()).toEqual([]);
  });

  it('reports leaked resource identifiers', () => {
    const registry = createResourceRegistry();
    registry.register('environment-map', vi.fn());
    expect(registry.leaks()).toEqual(['environment-map']);
  });
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/world-runtime-foundation.test.ts
```

Expected: FAIL because the two factories are missing.

- [ ] **Step 3: Implement the fixed clock**

```ts
export function createFixedClock(config: {
  fixedStepSeconds?: number;
  maxSubsteps?: number;
  maxFrameDeltaSeconds?: number;
} = {}) {
  const fixedStepSeconds = config.fixedStepSeconds ?? 1 / 60;
  const maxSubsteps = config.maxSubsteps ?? 4;
  const maxFrameDeltaSeconds = config.maxFrameDeltaSeconds ?? 0.1;
  let accumulatorSeconds = 0;

  return {
    advance(frameDeltaSeconds: number) {
      if (!Number.isFinite(frameDeltaSeconds) || frameDeltaSeconds < 0) throw new Error('Frame delta must be a non-negative finite number');
      accumulatorSeconds += Math.min(frameDeltaSeconds, maxFrameDeltaSeconds);
      const available = Math.floor(accumulatorSeconds / fixedStepSeconds);
      const steps = Math.min(available, maxSubsteps);
      accumulatorSeconds -= steps * fixedStepSeconds;
      if (available > maxSubsteps) accumulatorSeconds %= fixedStepSeconds;
      return { steps, fixedStepSeconds, alpha: accumulatorSeconds / fixedStepSeconds };
    },
    reset() { accumulatorSeconds = 0; },
  };
}
```

- [ ] **Step 4: Implement the resource registry**

Store unique IDs and disposer functions. `disposeAll` reverses insertion order, awaits every disposer, clears successful entries, collects failures, and throws one `AggregateError` after attempting every cleanup. A second successful disposal is a no-op.

- [ ] **Step 5: Verify GREEN and commit**

```bash
npx vitest run tests/unit/world-runtime-foundation.test.ts
git add packages/simulation-runtime/src/world/fixedClock.ts packages/simulation-runtime/src/world/resourceRegistry.ts packages/simulation-runtime/src/index.ts tests/unit/world-runtime-foundation.test.ts
git commit -m "feat: add deterministic world clock and resources"
```

## Task 3: World Lifecycle and Dependency Ordering

**Files:**
- Create: `packages/simulation-runtime/src/world/runtime.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Modify: `tests/unit/world-runtime-foundation.test.ts`

- [ ] **Step 1: Add failing lifecycle tests**

```ts
it('initializes dependencies first and updates each system once per step', async () => {
  const events: string[] = [];
  const runtime = createWorldRuntime({
    systems: [
      { id: 'presentation', dependencies: ['science'], initialize: () => { events.push('init:presentation'); }, fixedUpdate: () => { events.push('fixed:presentation'); }, dispose: () => { events.push('dispose:presentation'); } },
      { id: 'science', dependencies: [], initialize: () => { events.push('init:science'); }, fixedUpdate: () => { events.push('fixed:science'); }, dispose: () => { events.push('dispose:science'); } },
    ],
  });
  await runtime.initialize();
  runtime.advance(1 / 60);
  await runtime.dispose();
  expect(events).toEqual(['init:science', 'init:presentation', 'fixed:science', 'fixed:presentation', 'dispose:presentation', 'dispose:science']);
});

it('rejects system dependency cycles before initialization', () => {
  expect(() => createWorldRuntime({
    systems: [
      { id: 'a', dependencies: ['b'], initialize() {}, dispose() {} },
      { id: 'b', dependencies: ['a'], initialize() {}, dispose() {} },
    ],
  })).toThrow(/dependency cycle/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/world-runtime-foundation.test.ts
```

Expected: FAIL because `createWorldRuntime` is missing.

- [ ] **Step 3: Implement lifecycle orchestration**

`createWorldRuntime` topologically sorts systems, rejects missing dependencies/cycles/duplicate IDs, and exposes:

```ts
type WorldRuntime = {
  initialize(): Promise<void>;
  advance(frameDeltaSeconds: number): { fixedSteps: number; alpha: number };
  pause(): void;
  resume(): void;
  dispose(): Promise<void>;
  state(): 'created' | 'running' | 'paused' | 'disposed' | 'failed';
};
```

`advance` calls every `fixedUpdate` for each fixed step and calls every `renderUpdate` once with interpolation alpha. Calls outside valid lifecycle states throw descriptive errors.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx vitest run tests/unit/world-runtime-foundation.test.ts
git add packages/simulation-runtime/src/world/runtime.ts packages/simulation-runtime/src/index.ts tests/unit/world-runtime-foundation.test.ts
git commit -m "feat: orchestrate world system lifecycle"
```

## Task 4: Quality Profiles and Performance Diagnostics

**Files:**
- Create: `packages/simulation-runtime/src/world/quality.ts`
- Create: `apps/web/lib/world-builder/deviceProfile.ts`
- Create: `apps/web/lib/world-builder/diagnostics.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/world-quality.test.ts`

- [ ] **Step 1: Write failing quality tests**

```ts
import { describe, expect, it } from 'vitest';
import { chooseQualityProfile, nextLowerQualityProfile } from '../../packages/simulation-runtime/src/index';
import { evaluatePresentationBudget } from '../../apps/web/lib/world-builder/diagnostics';

it('selects Quest baseline for immersive XR', () => {
  expect(chooseQualityProfile({ isImmersiveXr: true, deviceMemoryGb: 8, maxTextureSize: 8192 })).toBe('questBaseline');
});

it('downgrades enhanced browser quality in declared order', () => {
  expect(nextLowerQualityProfile('browserEnhanced')).toBe('browserBalanced');
  expect(nextLowerQualityProfile('browserBalanced')).toBe('questBaseline');
  expect(nextLowerQualityProfile('questBaseline')).toBeUndefined();
});

it('reports draw call, triangle, and frame-rate budget failures', () => {
  expect(evaluatePresentationBudget(
    { fps: 68, drawCalls: 130, triangles: 260_000 },
    { minSteadyFps: 72, maxDrawCalls: 120, maxVisibleTriangles: 250_000 },
  )).toEqual([
    'fps 68 is below 72',
    'draw calls 130 exceed 120',
    'triangles 260000 exceed 250000',
  ]);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/world-quality.test.ts
```

Expected: FAIL because the quality functions do not exist.

- [ ] **Step 3: Implement pure selection and diagnostic functions**

Quest always selects `questBaseline`. A non-XR browser selects enhanced only when memory is at least 8 GB and max texture size is at least 8192; otherwise it selects balanced. Unknown capability values select balanced. Diagnostics compare finite counters against the selected profile and return deterministic strings.

- [ ] **Step 4: Add the device-profile adapter**

`detectDeviceProfile(renderer, xrSession)` reads renderer capabilities, `navigator.deviceMemory` when available, and XR presentation state. It passes the normalized record into `chooseQualityProfile`; it does not contain separate selection rules.

- [ ] **Step 5: Verify GREEN and commit**

```bash
npx vitest run tests/unit/world-quality.test.ts
git add packages/simulation-runtime/src/world/quality.ts packages/simulation-runtime/src/index.ts apps/web/lib/world-builder/deviceProfile.ts apps/web/lib/world-builder/diagnostics.ts tests/unit/world-quality.test.ts
git commit -m "feat: enforce adaptive presentation budgets"
```

## Task 5: PBR Materials, Assets, Environment, and Presentation Pipeline

**Files:**
- Create: `apps/web/lib/world-builder/materialFactory.ts`
- Create: `apps/web/lib/world-builder/environmentFactory.ts`
- Create: `apps/web/lib/world-builder/presentationPipeline.ts`
- Test: `tests/unit/world-presentation.test.ts`

- [ ] **Step 1: Write failing material and pipeline tests**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { textureColorSpaceForChannel, validateMaterialForProfile } from '../../apps/web/lib/world-builder/materialFactory';

it('uses sRGB only for color-bearing texture channels', () => {
  expect(textureColorSpaceForChannel('baseColor')).toBe('srgb');
  expect(textureColorSpaceForChannel('emissive')).toBe('srgb');
  expect(textureColorSpaceForChannel('normal')).toBe('none');
  expect(textureColorSpaceForChannel('roughness')).toBe('none');
  expect(textureColorSpaceForChannel('ambientOcclusion')).toBe('none');
});

it('rejects transmission-heavy materials on Quest baseline', () => {
  expect(validateMaterialForProfile(
    { id: 'glass', model: 'physical', baseColor: '#ffffff', roughness: 0.05, metalness: 0, transmission: 1 },
    'questBaseline',
  )).toContain('glass: transmission is not allowed by questBaseline');
});

it('keeps full-screen post-processing out of immersive XR', () => {
  const source = readFileSync(resolve(process.cwd(), 'apps/web/lib/world-builder/presentationPipeline.ts'), 'utf8');
  expect(source).toContain('renderer.xr.isPresenting');
  expect(source).toContain('renderer.render(scene, camera)');
  expect(source).toContain('composer.render()');
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/world-presentation.test.ts
```

Expected: FAIL because the presentation files do not exist.

- [ ] **Step 3: Implement the material factory**

Use `THREE.TextureLoader`, set base-color/emissive textures to `THREE.SRGBColorSpace`, keep data maps at `THREE.NoColorSpace`, apply profile-capped anisotropy, and create `MeshStandardMaterial` or `MeshPhysicalMaterial`.

For Quest, map physical glass definitions to the manifest’s declared standard-material fallback. A missing texture returns its declared fallback texture/material and emits an `AssetDiagnostic`; a missing fallback throws.

- [ ] **Step 4: Implement environment creation**

Create the declared background/fog, key/fill/accent lights, renderer tone mapping and exposure. When an environment map loads, pass it through `PMREMGenerator.fromEquirectangular`. If it fails, retain the declared light rig and emit a diagnostic.

- [ ] **Step 5: Implement adaptive presentation**

Create one renderer-facing object:

```ts
type PresentationPipeline = {
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  resize(width: number, height: number, pixelRatio: number): void;
  setQualityProfile(profile: QualityProfileId): void;
  dispose(): void;
};
```

Immersive XR calls `renderer.render`. Browser balanced uses RenderPass, OutputPass, and SMAA/FXAA. Browser enhanced may add GTAO and selective UnrealBloom. Dispose every pass and render target through the resource registry.

- [ ] **Step 6: Verify GREEN and commit**

```bash
npx vitest run tests/unit/world-presentation.test.ts
npm --workspace apps/web run type-check
git add apps/web/lib/world-builder/materialFactory.ts apps/web/lib/world-builder/environmentFactory.ts apps/web/lib/world-builder/presentationPipeline.ts tests/unit/world-presentation.test.ts
git commit -m "feat: add adaptive PBR presentation layer"
```

## Task 6: Canonical Rapier Physics

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`
- Create: `packages/simulation-runtime/src/physics/rapierWorld.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Modify: `apps/web/lib/runtimePhysics.ts`
- Test: `tests/unit/rapier-world.test.ts`
- Modify: `tests/unit/physics-engine.test.ts`

- [ ] **Step 1: Install the pinned physics dependency**

```bash
npm install @dimforge/rapier3d-compat@0.19.3 --workspace @xr-school/web
```

Expected: root lockfile records `0.19.3`.

- [ ] **Step 2: Write failing Rapier reference tests**

```ts
import { describe, expect, it } from 'vitest';
import { createRapierWorld } from '../../packages/simulation-runtime/src/index';

it('applies SI gravity with a fixed 1/60 integration step', async () => {
  const world = await createRapierWorld({ gravity: [0, -9.81, 0], fixedStepSeconds: 1 / 60 });
  world.addSphere({ id: 'ball', radiusMeters: 0.1, massKg: 1, positionMeters: [0, 1, 0], restitution: 0 });
  world.addCuboid({ id: 'ground', halfExtentsMeters: [2, 0.05, 2], positionMeters: [0, 0, 0], fixed: true });
  for (let index = 0; index < 120; index++) world.step();
  expect(world.body('ball').positionMeters[1]).toBeCloseTo(0.15, 2);
  await world.dispose();
});

it('returns identical snapshots for identical insertion order and steps', async () => {
  const first = await createRapierWorld();
  const second = await createRapierWorld();
  for (const world of [first, second]) {
    world.addSphere({ id: 'body', radiusMeters: 0.1, massKg: 1, positionMeters: [0, 1, 0], restitution: 0.2 });
    for (let index = 0; index < 30; index++) world.step();
  }
  expect(first.snapshot()).toEqual(second.snapshot());
});
```

- [ ] **Step 3: Run and verify RED**

```bash
npx vitest run tests/unit/rapier-world.test.ts
```

Expected: FAIL because `createRapierWorld` is missing.

- [ ] **Step 4: Implement the Rapier adapter**

Initialize the compatibility build once, set `world.timestep`, map stable string IDs to rigid-body handles, use fixed/dynamic descriptors, attach colliders, expose position/rotation snapshots, and free the Rapier world on disposal. Reject duplicate IDs, non-finite vectors, non-positive mass/radius, and calls after disposal.

- [ ] **Step 5: Remove the duplicate browser solver**

Replace `apps/web/lib/runtimePhysics.ts` with re-exports from `packages/simulation-runtime/src/index.ts` for the legacy semi-implicit world during migration. Existing States of Matter and generic viewer behavior remains unchanged in W0; W3 replaces it with Rapier/domain models.

- [ ] **Step 6: Verify GREEN and commit**

```bash
npx vitest run tests/unit/physics-engine.test.ts tests/unit/rapier-world.test.ts tests/unit/states-viewer-feedback.test.ts tests/unit/catalog-runtime-viewer.test.ts
npm --workspace apps/web run type-check
git add apps/web/package.json package-lock.json packages/simulation-runtime/src/physics/rapierWorld.ts packages/simulation-runtime/src/index.ts apps/web/lib/runtimePhysics.ts tests/unit/rapier-world.test.ts tests/unit/physics-engine.test.ts
git commit -m "feat: add canonical deterministic Rapier physics"
```

## Task 7: Scientific Model Registry

**Files:**
- Create: `packages/simulation-runtime/src/world/scientificModels.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/scientific-models.test.ts`

- [ ] **Step 1: Write failing registry tests**

```ts
import { describe, expect, it } from 'vitest';
import { createScientificModelRegistry } from '../../packages/simulation-runtime/src/index';

function createIdentityRegistry() {
  const registry = createScientificModelRegistry();
  registry.register({
    manifest: {
      id: 'identity',
      version: '1.0.0',
      domain: 'classification',
      internalUnits: {},
      validInputRanges: { value: { min: 0, max: 10, unit: '1' } },
      assumptions: ['Identity model'],
      limitations: ['Diagnostic use'],
      referenceSources: ['W0 spec'],
      referenceVectors: [{ id: 'five', inputs: { value: 5 }, expectedOutputs: { value: 5 } }],
      numericalTolerance: 1e-9,
    },
    evaluate: input => ({ value: Number(input.value) }),
  });
  return registry;
}

it('verifies outputs against reference vectors and tolerance', () => {
  const registry = createIdentityRegistry();
  expect(registry.verify('identity')).toEqual([]);
});

it('rejects out-of-range and non-finite inputs before evaluation', () => {
  const registry = createIdentityRegistry();
  expect(() => registry.evaluate('identity', { value: 11 })).toThrow(/valid range/);
  expect(() => registry.evaluate('identity', { value: Number.NaN })).toThrow(/finite/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/scientific-models.test.ts
```

Expected: FAIL because the registry does not exist.

- [ ] **Step 3: Implement registration, evaluation, and verification**

Reject duplicate model IDs, validate numeric inputs against manifest ranges, prevent evaluation after registry disposal, compare numeric outputs using manifest or per-output tolerances, compare categorical outputs exactly, and return reference failures as deterministic strings.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx vitest run tests/unit/scientific-models.test.ts
git add packages/simulation-runtime/src/world/scientificModels.ts packages/simulation-runtime/src/index.ts tests/unit/scientific-models.test.ts
git commit -m "feat: validate hidden scientific models"
```

## Task 8: Assessment Mastery Engine

**Files:**
- Create: `packages/simulation-runtime/src/world/assessment.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/assessment-sequence.test.ts`

- [ ] **Step 1: Write failing assessment tests**

```ts
import { describe, expect, it } from 'vitest';
import { createAssessmentSession } from '../../packages/simulation-runtime/src/index';

it('returns a hint after error and records evidence after retry', () => {
  const session = createAssessmentSession(TEST_SEQUENCE);
  expect(session.answer('misconception', 'yes')).toMatchObject({ correct: false, hint: 'Only appearance changed.' });
  expect(session.answer('misconception', 'no')).toMatchObject({ correct: true });
  expect(session.evidence()).toContainEqual(expect.objectContaining({ promptId: 'misconception', hinted: true }));
});

it('requires independent misconception and transfer evidence for mastery', () => {
  const session = createAssessmentSession(TEST_SEQUENCE);
  session.answer('observe', 'sphere');
  expect(session.mastery().mastered).toBe(false);
  session.answer('misconception', 'no');
  session.answer('transfer', 'no');
  expect(session.mastery()).toMatchObject({ mastered: true, evidenceCount: 3 });
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/assessment-sequence.test.ts
```

Expected: FAIL because `createAssessmentSession` is missing.

- [ ] **Step 3: Implement the assessment state machine**

Validate prompt IDs/options, track attempts and whether a hint was shown, record one evidence item per correctly resolved prompt, enforce retry policies, and compute mastery from evidence count plus required kinds. Do not expose formula/model data through assessment responses.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx vitest run tests/unit/assessment-sequence.test.ts
git add packages/simulation-runtime/src/world/assessment.ts packages/simulation-runtime/src/index.ts tests/unit/assessment-sequence.test.ts
git commit -m "feat: add misconception and transfer mastery"
```

## Task 9: Diagnostic Reference World

**Files:**
- Create: `apps/web/components/simulations/WorldBuilderDiagnosticViewer.tsx`
- Create: `apps/web/app/simulations/world-builder-diagnostic/page.tsx`
- Create: `apps/web/lib/world-builder/diagnosticWorld.ts`
- Test: `tests/unit/world-diagnostic-viewer.test.ts`

- [ ] **Step 1: Write failing integration/source tests**

```ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIAGNOSTIC_WORLD } from '../../apps/web/lib/world-builder/diagnosticWorld';
import { validateWorldBundle } from '../../packages/simulation-schema/src/index';

it('defines a valid W0 diagnostic world', () => {
  expect(validateWorldBundle(DIAGNOSTIC_WORLD)).toEqual([]);
});

it('mounts the shared runtime and adaptive presentation instead of a private loop', () => {
  const source = readFileSync(resolve(process.cwd(), 'apps/web/components/simulations/WorldBuilderDiagnosticViewer.tsx'), 'utf8');
  expect(source).toContain('createWorldRuntime');
  expect(source).toContain('createPresentationPipeline');
  expect(source).toContain('createMaterialFactory');
  expect(source).toContain('resourceRegistry.disposeAll');
  expect(source).not.toContain('requestAnimationFrame');
});

it('provides a diagnostic route without advertising it in the public catalog', () => {
  expect(existsSync(resolve(process.cwd(), 'apps/web/app/simulations/world-builder-diagnostic/page.tsx'))).toBe(true);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/world-diagnostic-viewer.test.ts
```

Expected: FAIL because diagnostic world files do not exist.

- [ ] **Step 3: Build the diagnostic world**

Create a small scene with:

- mapped rough floor;
- standard painted sphere;
- physical metal sphere;
- fallback-material test object hidden in normal mode;
- one key shadow light, fill light, fog, PMREM environment, and tone mapping;
- one rigid sphere and fixed floor collider;
- one observation, misconception, and transfer prompt;
- live developer diagnostics for profile, fps, draw calls, triangles, and resource count.

The route starts in browser mode and offers WebXR entry when available. It is not included in `IMPLEMENTED_SIMULATION_SLUGS` or search documents.

- [ ] **Step 4: Verify GREEN and browser behavior**

```bash
npx vitest run tests/unit/world-diagnostic-viewer.test.ts tests/unit/world-presentation.test.ts tests/unit/rapier-world.test.ts
npm --workspace apps/web run type-check
npm --workspace apps/web run build
```

Use the in-app browser to open `/simulations/world-builder-diagnostic`, enter browser mode, confirm one material response under moving light, complete the three mastery prompts, exit, and confirm there are no console errors.

- [ ] **Step 5: Commit Task 9**

```bash
git add apps/web/components/simulations/WorldBuilderDiagnosticViewer.tsx apps/web/app/simulations/world-builder-diagnostic/page.tsx apps/web/lib/world-builder/diagnosticWorld.ts tests/unit/world-diagnostic-viewer.test.ts
git commit -m "feat: add world builder diagnostic reference"
```

## Task 10: Documentation, Strict Pipeline, W0 Release, and Deployment

**Files:**
- Modify: `docs/simulation-design/simulation-design-system.md`
- Create: `docs/architecture/world-builder.md`
- Create: `docs/releases/w0-world-builder-foundation.md`
- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `tests/unit/ci-workflow.test.ts`
- Test: `tests/unit/world-builder-documentation.test.ts`

- [ ] **Step 1: Write failing documentation and pipeline tests**

```ts
it('documents the fixed lifecycle, adaptive profiles, hidden science, and mastery rules', () => {
  const architecture = readFileSync(resolve(process.cwd(), 'docs/architecture/world-builder.md'), 'utf8');
  const designSystem = readFileSync(resolve(process.cwd(), 'docs/simulation-design/simulation-design-system.md'), 'utf8');
  expect(architecture).toContain('1 / 60');
  expect(architecture).toContain('initialize → fixedUpdate → renderUpdate → dispose');
  expect(designSystem).toContain('Quest Baseline');
  expect(designSystem).toContain('Hidden Scientific Models');
  expect(designSystem).toContain('Misconception and Transfer Evidence');
});

it('makes typecheck and generated freshness strict release gates', () => {
  expect(qualityWorkflow).toContain('npm --workspace apps/web run type-check');
  expect(qualityWorkflow).toContain('git diff --exit-code');
  expect(qualityWorkflow).not.toContain('continue-on-error: true');
  expect(deployWorkflow).toContain('needs: verify');
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/world-builder-documentation.test.ts tests/unit/ci-workflow.test.ts
```

Expected: FAIL because the architecture/release docs and strict workflow are absent.

- [ ] **Step 3: Update documentation**

Document all W0 contracts, lifecycle states, profile budgets, degradation order, hidden-model rule, mastery rule, asset provenance, diagnostics, and Quest acceptance. The W0 release record includes automated command results and leaves the Quest checklist explicitly unsigned until performed on-device.

- [ ] **Step 4: Consolidate strict verification**

Add:

```json
{
  "scripts": {
    "verify": "npm run env:check && npm run contract:compile && npm run catalog:validate && npm run web-catalog:generate && npm run test && npm --workspace apps/web run type-check && npm --workspace apps/web run build"
  }
}
```

Change Quality to one `verify` job that checks out, sets up Node 22, runs `npm ci`, runs `npm run verify`, then runs `git diff --exit-code -- generated/openapi/openapi.json apps/web/lib/scienceCatalog.generated.ts apps/web/lib/curriculumSearch.generated.ts`. Keep a separate PR-only drift job that does not reinstall dependencies because the drift script uses Node built-ins.

Change Deploy to a `verify` job followed by a `deploy` job with `needs: verify`. Keep `--archive=tgz`. Remove invalid coverage upload paths until coverage output is configured in a later release.

- [ ] **Step 5: Verify the full W0 gate**

```bash
npm run verify
npm run spec:drift
git diff --check
git status --short
```

Expected: all tests, strict typecheck, and production build pass; generated files are current; only intended W0 files are modified.

- [ ] **Step 6: Commit the W0 release**

```bash
git add package.json .github/workflows/quality.yml .github/workflows/deploy.yml tests/unit/ci-workflow.test.ts tests/unit/world-builder-documentation.test.ts docs/simulation-design/simulation-design-system.md docs/architecture/world-builder.md docs/releases/w0-world-builder-foundation.md
git commit -m "release: establish world builder foundation"
```

- [ ] **Step 7: Push and deploy W0**

```bash
git push origin main
gh run list --branch main --limit 4
gh run watch <quality-run-id> --exit-status
gh run watch <deploy-run-id> --exit-status
```

Expected: Quality and Deploy complete successfully for the W0 commit.

- [ ] **Step 8: Production acceptance**

Verify:

- `/` and `/simulations` render;
- all five existing Internal QA demos still launch;
- `/simulations/world-builder-diagnostic` renders;
- browser diagnostic mastery flow completes;
- production console has no unhandled errors;
- the deployed commit matches `origin/main`.

Record the URL, commit SHA, automated results, and unsigned Quest checklist in `docs/releases/w0-world-builder-foundation.md`.

- [ ] **Step 9: Report W0 before W1**

Report the W0 commit, production URL, automated evidence, and the fact that direct Quest acceptance remains required. Do not begin the Pollination migration until W0 production verification is complete.
