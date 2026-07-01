# Pollination World-Builder Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release Pollination as the first production reference world using the shared fixed-step lifecycle, adaptive PBR presentation, validated biological event model, and misconception/transfer mastery engine.

**Architecture:** Add one browser/WebXR host adapter around the existing renderer-independent `WorldRuntime`, then use the existing mapped-material and environment factories from W0. Pollination remains a procedural Three.js scene, but scene construction is driven by a validated `WorldBundle`; biological causality lives in `packages/simulation-runtime`, while visual bee and pollen motion remains illustrative.

**Tech Stack:** TypeScript, React, Three.js, WebXR, Vitest, Next.js, Vercel.

---

## Scope and release boundary

This plan implements W1 only. It creates the shared web host that later
reference-world plans will reuse, but it does not migrate Circuit, States of
Matter, Solubility, Food Sources, Digestive System, or the generic catalog
viewer. W2 starts only after W1 is production-verified.

Rapier is not added to Pollination. The approved scientific standard reserves
Rapier for rigid-body contacts; Pollination uses a causal biology model and
illustrative fixed-step presentation.

## File map

- Create `apps/web/lib/world-builder/webSimulationRuntime.ts`: one renderer,
  adaptive pipeline, fixed clock, WebXR profile transitions, resize ownership,
  and deterministic disposal.
- Create `packages/simulation-runtime/src/models/pollinationModel.ts`: causal
  biological event graph.
- Modify `packages/simulation-runtime/src/index.ts`: public model exports.
- Create `apps/web/lib/world-builder/pollinationWorld.ts`: validated W1 world,
  mapped PBR materials, assets, model manifest, assessment, and acceptance.
- Create `apps/web/public/world-builder/pollination/*.svg`: self-authored,
  redistributable map assets.
- Modify `apps/web/components/simulations/PollinationViewer.tsx`: shared host,
  mapped material factory, environment factory, fixed-step updates, and mastery
  UI.
- Modify `tests/unit/pollination-viewer-feedback.test.ts`: adoption and
  regression contract.
- Create `tests/unit/web-simulation-runtime.test.ts`: host source/lifecycle
  contract.
- Create `tests/unit/pollination-world.test.ts`: world graph, science model,
  and assessment contract.
- Create `docs/releases/w1-pollination.md`: automated, production, and unsigned
  Quest evidence.

## Task 1: Lock the W1 contracts

**Files:**

- Create: `tests/unit/web-simulation-runtime.test.ts`
- Create: `tests/unit/pollination-world.test.ts`
- Modify: `tests/unit/pollination-viewer-feedback.test.ts`

- [ ] **Step 1: Add the failing shared-host source contract**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('web simulation runtime host', () => {
  it('owns the renderer loop, adaptive presentation, and resource disposal', () => {
    const source = readFileSync(resolve(
      process.cwd(),
      'apps/web/lib/world-builder/webSimulationRuntime.ts',
    ), 'utf8');
    expect(source).toContain('createWorldRuntime');
    expect(source).toContain('createPresentationPipeline');
    expect(source).toContain('detectDeviceProfile');
    expect(source).toContain('renderer.setAnimationLoop');
    expect(source).toContain('resourceRegistry.disposeAll');
    expect(source).toContain("renderer.xr.addEventListener('sessionstart'");
    expect(source).toContain("renderer.xr.addEventListener('sessionend'");
  });
});
```

- [ ] **Step 2: Add the failing Pollination world/model contract**

```ts
import { describe, expect, it } from 'vitest';
import { POLLINATION_WORLD } from '../../apps/web/lib/world-builder/pollinationWorld';
import {
  createPollinationModel,
  createScientificModelRegistry,
  pollinationSnapshotForStage,
} from '../../packages/simulation-runtime/src/index';
import {
  validateWorldBundle,
} from '../../packages/simulation-schema/src/index';

describe('pollination reference world', () => {
  it('defines a valid mapped-PBR world and complete mastery sequence', () => {
    expect(validateWorldBundle(POLLINATION_WORLD)).toEqual([]);
    expect(POLLINATION_WORLD.materials.some(
      material => material.baseColorMap && material.normalMap
        && material.roughnessMap,
    )).toBe(true);
    expect(POLLINATION_WORLD.assessments[0].masteryRule.requiredKinds)
      .toEqual(['observation', 'misconception', 'transfer']);
  });

  it('enforces pollination before fertilisation and germination', () => {
    const model = createPollinationModel();
    expect(() => model.apply('fertilise')).toThrow(/pollen transfer/i);
    model.apply('producePollen');
    model.apply('arrivePollinator');
    model.apply('transferPollen');
    model.apply('fertilise');
    model.apply('formSeed');
    model.apply('germinate');
    expect(model.snapshot()).toMatchObject({
      pollenTransferred: true,
      fertilised: true,
      germinated: true,
    });
  });

  it('verifies the hidden model against the authored reference vectors', () => {
    const registry = createScientificModelRegistry();
    registry.register({
      manifest: POLLINATION_WORLD.scientificModels[0],
      evaluate: input => pollinationSnapshotForStage(
        Number(input.completedStage),
      ),
    });
    expect(registry.verify('pollination-event-graph')).toEqual([]);
  });
});
```

- [ ] **Step 3: Add failing viewer-adoption assertions**

Append to `tests/unit/pollination-viewer-feedback.test.ts`:

```ts
it('uses the shared world lifecycle and mapped PBR factories', () => {
  expect(source).toContain('createWebSimulationRuntime');
  expect(source).toContain('createMaterialFactory');
  expect(source).toContain('createEnvironment');
  expect(source).toContain('POLLINATION_WORLD');
  expect(source).toContain('createAssessmentSession');
  expect(source).toContain('createPollinationModel');
  expect(source).not.toContain('new THREE.WebGLRenderer');
  expect(source).not.toContain('renderer.setAnimationLoop');
  expect(source).not.toContain('renderer.render(scene, camera)');
});
```

- [ ] **Step 4: Run the RED suite**

Run:

```bash
npx vitest run \
  tests/unit/web-simulation-runtime.test.ts \
  tests/unit/pollination-world.test.ts \
  tests/unit/pollination-viewer-feedback.test.ts
```

Expected: FAIL because the host, model, world, and viewer adoption are missing.

- [ ] **Step 5: Commit the contract tests**

```bash
git add tests/unit/web-simulation-runtime.test.ts \
  tests/unit/pollination-world.test.ts \
  tests/unit/pollination-viewer-feedback.test.ts
git commit -m "test: define Pollination world-builder contract"
```

## Task 2: Shared Browser/WebXR Runtime Host

**Files:**

- Create: `apps/web/lib/world-builder/webSimulationRuntime.ts`
- Test: `tests/unit/web-simulation-runtime.test.ts`

- [ ] **Step 1: Define the public host types**

```ts
import * as THREE from 'three';
import {
  createResourceRegistry,
  createWorldRuntime,
  type FixedUpdateContext,
  type RenderUpdateContext,
  type ResourceRegistry,
} from '../../../../packages/simulation-runtime/src/index';
import type {
  QualityProfileId,
} from '../../../../packages/simulation-schema/src/index';
import { detectDeviceProfile } from './deviceProfile';
import { createPresentationPipeline } from './presentationPipeline';

export interface WebSimulationFrame {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  profileId: QualityProfileId;
}

export interface WebSimulationUpdates {
  fixedUpdate?(context: FixedUpdateContext & WebSimulationFrame): void;
  renderUpdate?(context: RenderUpdateContext & WebSimulationFrame): void;
}

export interface WebSimulationRuntimeConfig {
  mount: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  rendererOptions?: THREE.WebGLRendererParameters;
  updates: WebSimulationUpdates;
  onProfileChange?(profileId: QualityProfileId): void;
}

export interface WebSimulationRuntime {
  renderer: THREE.WebGLRenderer;
  resources: ResourceRegistry;
  profile(): QualityProfileId;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}
```

- [ ] **Step 2: Implement one renderer and fixed-step runtime**

Implement `createWebSimulationRuntime(config)` with these exact behaviors:

```ts
export function createWebSimulationRuntime(
  config: WebSimulationRuntimeConfig,
): WebSimulationRuntime {
  const resourceRegistry = createResourceRegistry();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    ...config.rendererOptions,
  });
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  config.mount.replaceChildren(renderer.domElement);

  const browserProfile = detectDeviceProfile(renderer);
  let profileId: QualityProfileId = browserProfile;
  const pipeline = createPresentationPipeline(renderer, profileId);
  let runtime: ReturnType<typeof createWorldRuntime> | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let previousTime = 0;
  let disposed = false;

  const frame = (): WebSimulationFrame => ({
    renderer,
    scene: config.scene,
    camera: config.camera,
    profileId,
  });

  const onSessionStart = () => {
    profileId = 'questBaseline';
    pipeline.setQualityProfile(profileId);
    config.onProfileChange?.(profileId);
  };
  const onSessionEnd = () => {
    profileId = browserProfile;
    pipeline.setQualityProfile(profileId);
    config.onProfileChange?.(profileId);
  };

  renderer.xr.addEventListener('sessionstart', onSessionStart);
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  resourceRegistry.register('renderer', () => {
    renderer.setAnimationLoop(null);
    renderer.xr.removeEventListener('sessionstart', onSessionStart);
    renderer.xr.removeEventListener('sessionend', onSessionEnd);
    renderer.dispose();
    renderer.domElement.remove();
  });
  resourceRegistry.register('presentation', () => pipeline.dispose());

  return {
    renderer,
    resources: resourceRegistry,
    profile: () => profileId,
    async initialize() {
      if (runtime) throw new Error('Web simulation runtime is already initialized');
      runtime = createWorldRuntime({
        resourceRegistry,
        systems: [{
          id: 'experience',
          dependencies: [],
          initialize() {},
          fixedUpdate(context) {
            config.updates.fixedUpdate?.({ ...context, ...frame() });
          },
          renderUpdate(context) {
            config.updates.renderUpdate?.({ ...context, ...frame() });
            pipeline.render(config.scene, config.camera);
          },
          dispose() {},
        }],
      });
      await runtime.initialize();

      const resize = () => {
        const width = Math.max(1, config.mount.clientWidth);
        const height = Math.max(1, config.mount.clientHeight);
        config.camera.aspect = width / height;
        config.camera.updateProjectionMatrix();
        pipeline.resize(width, height, window.devicePixelRatio);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(config.mount);
      resourceRegistry.register('resize-observer', () => resizeObserver?.disconnect());
      resize();

      renderer.setAnimationLoop(time => {
        if (!runtime || runtime.state() !== 'running') return;
        const deltaSeconds = previousTime === 0
          ? 0
          : Math.max(0, (time - previousTime) / 1000);
        previousTime = time;
        runtime.advance(deltaSeconds);
      });
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (runtime) await runtime.dispose();
      else await resourceRegistry.disposeAll();
    },
  };
}
```

- [ ] **Step 3: Verify the host contract**

Run:

```bash
npx vitest run tests/unit/web-simulation-runtime.test.ts
npm --workspace apps/web run type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/world-builder/webSimulationRuntime.ts \
  tests/unit/web-simulation-runtime.test.ts
git commit -m "feat: add shared WebXR world runtime host"
```

## Task 3: Causal Pollination Model

**Files:**

- Create: `packages/simulation-runtime/src/models/pollinationModel.ts`
- Modify: `packages/simulation-runtime/src/index.ts`
- Test: `tests/unit/pollination-world.test.ts`

- [ ] **Step 1: Implement the event graph**

```ts
export type PollinationEvent =
  | 'producePollen'
  | 'arrivePollinator'
  | 'transferPollen'
  | 'fertilise'
  | 'formSeed'
  | 'germinate'
  | 'maturePlant';

export interface PollinationSnapshot {
  pollenProduced: boolean;
  pollinatorArrived: boolean;
  pollenTransferred: boolean;
  fertilised: boolean;
  seedFormed: boolean;
  germinated: boolean;
  plantMatured: boolean;
}

const EVENT_ORDER: PollinationEvent[] = [
  'producePollen',
  'arrivePollinator',
  'transferPollen',
  'fertilise',
  'formSeed',
  'germinate',
  'maturePlant',
];

export function pollinationSnapshotForStage(
  completedStage: number,
): PollinationSnapshot {
  if (!Number.isInteger(completedStage)
    || completedStage < 0 || completedStage > EVENT_ORDER.length) {
    throw new Error('completedStage must be an integer from 0 to 7');
  }
  return {
    pollenProduced: completedStage >= 1,
    pollinatorArrived: completedStage >= 2,
    pollenTransferred: completedStage >= 3,
    fertilised: completedStage >= 4,
    seedFormed: completedStage >= 5,
    germinated: completedStage >= 6,
    plantMatured: completedStage >= 7,
  };
}

export function createPollinationModel() {
  let completed = 0;

  function snapshot(): PollinationSnapshot {
    return pollinationSnapshotForStage(completed);
  }

  return {
    apply(event: PollinationEvent) {
      const expected = EVENT_ORDER[completed];
      if (event !== expected) {
        const reason = event === 'fertilise' && completed < 3
          ? 'Fertilisation requires pollen transfer first'
          : `Expected ${expected ?? 'no further event'}, received ${event}`;
        throw new Error(reason);
      }
      completed += 1;
      return snapshot();
    },
    snapshot,
    reset() {
      completed = 0;
    },
  };
}

export type PollinationModel = ReturnType<typeof createPollinationModel>;
```

- [ ] **Step 2: Export the model**

Append to `packages/simulation-runtime/src/index.ts`:

```ts
export {
  createPollinationModel,
  pollinationSnapshotForStage,
} from './models/pollinationModel';
export type {
  PollinationEvent,
  PollinationModel,
  PollinationSnapshot,
} from './models/pollinationModel';
```

- [ ] **Step 3: Add duplicate/out-of-order/reset coverage**

Append to `tests/unit/pollination-world.test.ts`:

```ts
it('rejects duplicate biological events and resets deterministically', () => {
  const model = createPollinationModel();
  model.apply('producePollen');
  expect(() => model.apply('producePollen')).toThrow(/Expected arrivePollinator/);
  model.reset();
  expect(model.snapshot()).toEqual({
    pollenProduced: false,
    pollinatorArrived: false,
    pollenTransferred: false,
    fertilised: false,
    seedFormed: false,
    germinated: false,
    plantMatured: false,
  });
});
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
npx vitest run tests/unit/pollination-world.test.ts
```

Expected: the model tests pass; the world-bundle test remains red until Task 4.

Commit:

```bash
git add packages/simulation-runtime/src/models/pollinationModel.ts \
  packages/simulation-runtime/src/index.ts \
  tests/unit/pollination-world.test.ts
git commit -m "feat: model causal Pollination stages"
```

## Task 4: Validated Pollination World and PBR Assets

**Files:**

- Create: `apps/web/lib/world-builder/pollinationWorld.ts`
- Create: `apps/web/public/world-builder/pollination/soil-base-color.svg`
- Create: `apps/web/public/world-builder/pollination/soil-normal.svg`
- Create: `apps/web/public/world-builder/pollination/soil-roughness.svg`
- Create: `apps/web/public/world-builder/pollination/foliage-base-color.svg`
- Create: `apps/web/public/world-builder/pollination/foliage-normal.svg`
- Create: `apps/web/public/world-builder/pollination/foliage-roughness.svg`
- Create: `apps/web/public/world-builder/pollination/petal-base-color.svg`
- Create: `apps/web/public/world-builder/pollination/petal-normal.svg`
- Create: `apps/web/public/world-builder/pollination/petal-roughness.svg`
- Create: `apps/web/public/world-builder/pollination/bark-base-color.svg`
- Create: `apps/web/public/world-builder/pollination/bark-normal.svg`
- Create: `apps/web/public/world-builder/pollination/bark-roughness.svg`
- Create: `apps/web/public/world-builder/pollination/bee-base-color.svg`
- Create: `apps/web/public/world-builder/pollination/bee-normal.svg`
- Create: `apps/web/public/world-builder/pollination/bee-roughness.svg`
- Create: `apps/web/public/world-builder/pollination/wing-base-color.svg`
- Create: `apps/web/public/world-builder/pollination/wing-normal.svg`
- Create: `apps/web/public/world-builder/pollination/wing-roughness.svg`
- Create: `apps/web/public/world-builder/pollination/garden-environment.svg`
- Test: `tests/unit/pollination-world.test.ts`

- [ ] **Step 1: Define the W1 world graph**

Create `POLLINATION_WORLD: WorldBundle` with:

```ts
world: {
  id: 'pollination-reference-world',
  version: '1.0.0',
  title: 'Plant Pollination & Growth Cycle',
  metersPerWorldUnit: 1,
  environmentId: 'pollination-garden',
  qualityProfileIds: ['questBaseline', 'browserBalanced', 'browserEnhanced'],
  entityIds: ['garden', 'flowers', 'bee', 'pollen', 'seed', 'seedling'],
  systemIds: ['biology', 'lesson', 'presentation'],
  scientificModelIds: ['pollination-event-graph'],
  lessonSequenceId: 'pollination-eight-stage-lesson',
  assessmentSequenceId: 'pollination-mastery',
  assetManifestId: 'pollination-assets',
  acceptanceProfileId: 'pollination-acceptance',
}
```

Each entity must have an explicit transform, interaction tags, and
accessibility label. The world uses the three W0 quality-profile constants and
an acceptance profile of 72 FPS, 120 draw calls, and 250,000 triangles.

- [ ] **Step 2: Define mapped PBR materials**

Define these material IDs and map families:

| Material | Map family | Roughness | Metalness |
|---|---|---:|---:|
| `soil` | soil | 0.95 | 0 |
| `stem` | foliage | 0.82 | 0 |
| `leaf` | foliage | 0.72 | 0 |
| `petal-pink` | petal | 0.46 | 0 |
| `petal-violet` | petal | 0.48 | 0 |
| `bark` | bark | 0.9 | 0 |
| `bee-yellow` | bee | 0.62 | 0 |
| `bee-dark` | bee | 0.72 | 0 |
| `bee-wing` | wing | 0.22 | 0 |
| `pollen` | petal | 0.7 | 0 |

Every mapped material sets `baseColorMap`, `normalMap`, `normalScale`,
`roughnessMap`, and `textureRepeat`. Transparent wing material uses
`MeshStandardMaterial` with `opacity: 0.52`; it does not use transmission.

- [ ] **Step 3: Define the scientific manifest and mastery**

The model manifest has:

```ts
{
  id: 'pollination-event-graph',
  version: '1.0.0',
  domain: 'biology',
  internalUnits: {},
  validInputRanges: {
    completedStage: { min: 0, max: 7, unit: 'stage' },
  },
  assumptions: [
    'Bee and pollen motion is illustrative',
    'Stage order represents biological causality',
  ],
  limitations: [
    'The model does not represent cellular scale or real event duration',
  ],
  referenceSources: [
    'NCERT Class 7 Science: Reproduction in Plants',
  ],
  referenceVectors: [
    {
      id: 'pollination-before-fertilisation',
      inputs: { completedStage: 3 },
      expectedOutputs: {
        pollenProduced: true,
        pollinatorArrived: true,
        pollenTransferred: true,
        fertilised: false,
        seedFormed: false,
        germinated: false,
        plantMatured: false,
      },
    },
    {
      id: 'fertilisation-enables-seed',
      inputs: { completedStage: 5 },
      expectedOutputs: {
        pollenProduced: true,
        pollinatorArrived: true,
        pollenTransferred: true,
        fertilised: true,
        seedFormed: true,
        germinated: false,
        plantMatured: false,
      },
    },
  ],
  numericalTolerance: 0,
}
```

The assessment has exactly three required prompts:

- observation: visible pollen transfer from anther/bee to stigma;
- misconception: pollination is not fertilisation;
- transfer: wind can transfer pollen without a bee.

Mastery requires all three kinds and allows hinted mastery.

- [ ] **Step 4: Add self-authored SVG assets and manifest records**

Each SVG is 512×512 except the 1024×512 environment. Each asset record includes
the exact public URL, kind, source `XR School procedural Pollination texture`,
license `XR School self-authored; redistribution permitted`, author
`XR School`, dimensions, channel, and compression `SVG procedural`.

Normal-map SVGs use neutral `#8080ff` as the base with low-contrast procedural
detail. Roughness SVGs are grayscale. The environment is a non-flashing garden
gradient with no text or external image.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npx vitest run tests/unit/pollination-world.test.ts \
  tests/unit/world-schema.test.ts \
  tests/unit/world-presentation.test.ts
```

Expected: PASS.

Commit:

```bash
git add apps/web/lib/world-builder/pollinationWorld.ts \
  apps/web/public/world-builder/pollination \
  tests/unit/pollination-world.test.ts
git commit -m "feat: define mapped PBR Pollination world"
```

## Task 5: Migrate Pollination Viewer

**Files:**

- Modify: `apps/web/components/simulations/PollinationViewer.tsx`
- Modify: `tests/unit/pollination-viewer-feedback.test.ts`

- [ ] **Step 1: Replace renderer ownership**

Import:

```ts
import {
  createAssessmentSession,
  createPollinationModel,
  createScientificModelRegistry,
  pollinationSnapshotForStage,
  type PollinationEvent,
} from '../../../../packages/simulation-runtime/src/index';
import { createEnvironment } from '@/lib/world-builder/environmentFactory';
import { createMaterialFactory } from '@/lib/world-builder/materialFactory';
import { POLLINATION_WORLD } from '@/lib/world-builder/pollinationWorld';
import { createWebSimulationRuntime } from '@/lib/world-builder/webSimulationRuntime';
```

Remove the private `WebGLRenderer`, `THREE.Clock`,
`renderer.setAnimationLoop`, `window.resize` listener, direct
`renderer.render`, and manual renderer disposal.

- [ ] **Step 2: Make procedural builders consume shared materials**

Add:

```ts
type PollinationMaterials = {
  soil: THREE.MeshStandardMaterial;
  stem: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  petalPink: THREE.MeshStandardMaterial;
  petalViolet: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  beeYellow: THREE.MeshStandardMaterial;
  beeDark: THREE.MeshStandardMaterial;
  beeWing: THREE.MeshStandardMaterial;
  pollen: THREE.MeshStandardMaterial;
};
```

Change `buildFlower`, `buildBeeLeg`, and `buildBee` to accept
`PollinationMaterials`. All instructional `MeshStandardMaterial` construction
inside those builders is replaced by the corresponding shared material.
`MeshBasicMaterial` remains only for the sky, cue-card canvas, button labels,
and wing-vein educational overlay.

- [ ] **Step 3: Load mapped materials before scene construction**

Inside the effect's async `start()`:

```ts
const materialFactory = createMaterialFactory({
  assets: POLLINATION_WORLD.assetManifests[0],
  materials: POLLINATION_WORLD.materials,
  qualityProfileId: 'questBaseline',
  maxAnisotropy: 8,
});
const definition = (id: string) => {
  const result = POLLINATION_WORLD.materials.find(item => item.id === id);
  if (!result) throw new Error(`Missing Pollination material ${id}`);
  return result;
};
const [
  soil, stem, leaf, petalPink, petalViolet,
  bark, beeYellow, beeDark, beeWing, pollen,
] = await Promise.all([
  'soil', 'stem', 'leaf', 'petal-pink', 'petal-violet',
  'bark', 'bee-yellow', 'bee-dark', 'bee-wing', 'pollen',
].map(id => materialFactory.create(definition(id))));
```

Register `materialFactory.dispose()` with the shared host resource registry.
Use `petalPink` or `petalViolet` according to the authored flower variant; do
not mutate a shared material's color per mesh.
The mapped instructional textures intentionally use Quest Baseline anisotropy
on every platform; browser enhancement comes from the adaptive presentation
pipeline, so entering WebXR never leaves a browser-only texture setting active.

- [ ] **Step 4: Create the shared environment and host**

Create the scene and camera as before, then:

```ts
const environment = await createEnvironment({
  renderer: host.renderer,
  scene,
  definition: POLLINATION_WORLD.environments[0],
  assets: POLLINATION_WORLD.assetManifests[0],
});
host.resources.register('pollination-environment', () => environment.dispose());
host.resources.register('pollination-materials', () => materialFactory.dispose());
host.resources.register('orbit-controls', () => controls.dispose());
```

The environment factory owns tone mapping, fog, PMREM, and the calibrated
key/fill/accent rig. Remove duplicate scene lights and exponential fog.

- [ ] **Step 5: Drive biology on stage transitions**

Add:

```ts
const biology = createPollinationModel();
const STAGE_EVENTS: Array<PollinationEvent | undefined> = [
  undefined,
  'producePollen',
  'arrivePollinator',
  'transferPollen',
  'fertilise',
  'formSeed',
  'germinate',
  'maturePlant',
];
let modelStage = 0;

function syncBiology(nextStage: number) {
  if (nextStage < modelStage) {
    biology.reset();
    modelStage = 0;
  }
  while (modelStage < nextStage) {
    modelStage += 1;
    biology.apply(STAGE_EVENTS[modelStage]!);
  }
}
```

Call `syncBiology(next)` before committing every browser or controller stage
change. A model error prevents stage progression and preserves the last valid
state.

- [ ] **Step 6: Verify the hidden scientific model before startup**

```ts
const scientificModels = createScientificModelRegistry();
scientificModels.register({
  manifest: POLLINATION_WORLD.scientificModels[0],
  evaluate: input => pollinationSnapshotForStage(
    Number(input.completedStage),
  ),
});
const modelFailures = scientificModels.verify('pollination-event-graph');
if (modelFailures.length > 0) throw new Error(modelFailures.join('; '));
host.resources.register(
  'pollination-scientific-models',
  () => scientificModels.dispose(),
);
```

Do this before enabling stage controls. A failed reference vector stops world
startup; it is not replaced with an animation.

- [ ] **Step 7: Move animation into shared fixed/render updates**

Use `createWebSimulationRuntime` with:

```ts
updates: {
  fixedUpdate({ deltaSeconds }) {
    for (const [index, cloud] of clouds.entries()) {
      cloud.position.x += deltaSeconds * 0.09
        * (index % 2 === 0 ? 1 : -1);
    }
    if (stageRef.current === 7) {
      seedlingGrowthRef.current = Math.min(
        seedlingGrowthRef.current + deltaSeconds * 0.42,
        1,
      );
    }
  },
  renderUpdate({ elapsedSeconds, interpolationAlpha, renderer }) {
    const t = elapsedSeconds + interpolationAlpha / 60;
    updateCueCard();
    updateBee(t);
    updatePollen(t);
    updateUndergroundStage(t);
    updateCameraFacingPanels();
    updateControllerNavigation();
    if (!renderer.xr.isPresenting) controls.update();
  },
}
```

The only per-step mutations are cloud drift and seedling growth. Bee and pollen
positions are pure functions of `t`, stage, and authored seed positions.
Replace scene-building `Math.random()` calls with one seeded random helper so
replay creates identical flower and tree layouts.

- [ ] **Step 8: Add shared mastery UI**

Create one `AssessmentSession` from
`POLLINATION_WORLD.assessments[0]`. After stage 3, expose observation and
misconception prompts; after stage 7, expose transfer. Use accessible HTML
buttons with evidence-directed hints, retry, and a mastery completion state.
Do not expose model assumptions, units, or reference vectors in the student UI.

- [ ] **Step 9: Preserve Quest controls and cleanup**

Keep controller rays, intentional hit testing, snap turning, B/X navigation,
left navigation panel, narration, and all eight packaged audio files.
Register controller listeners, geometries, canvas textures, controls, and
environment resources. Effect cleanup calls only:

```ts
cancelled = true;
void host?.dispose();
stopSimulationNarration();
```

- [ ] **Step 10: Verify the migrated viewer**

Run:

```bash
npx vitest run \
  tests/unit/pollination-viewer-feedback.test.ts \
  tests/unit/pollination-world.test.ts \
  tests/unit/web-simulation-runtime.test.ts \
  tests/unit/simulation-audio-contract.test.ts \
  tests/unit/xr-navigation.test.ts
npm --workspace apps/web run type-check
npm --workspace apps/web run build
```

Expected: PASS. Source contract confirms no private renderer loop.

- [ ] **Step 11: Commit**

```bash
git add apps/web/components/simulations/PollinationViewer.tsx \
  tests/unit/pollination-viewer-feedback.test.ts
git commit -m "feat: migrate Pollination to shared world builder"
```

## Task 6: Browser Acceptance and W1 Release Record

**Files:**

- Create: `docs/releases/w1-pollination.md`

- [ ] **Step 1: Run the complete strict gate**

```bash
npm run verify
npm run spec:drift
git diff --exit-code -- \
  generated/openapi/openapi.json \
  apps/web/lib/scienceCatalog.generated.ts \
  apps/web/lib/curriculumSearch.generated.ts
git diff --check
git status --short
```

Expected: all commands pass; only intended W1 files are changed.

- [ ] **Step 2: Run local browser acceptance**

Open `/simulations/pollination` in the in-app browser and verify:

- mapped soil, foliage, petals, bark, bee, wings, and pollen respond to the
  environment light;
- all eight stages remain accessible from browser controls;
- pollination visibly precedes fertilisation;
- observation, misconception, and transfer prompts complete mastery;
- replay produces the same authored layout;
- no console warning/error appears;
- diagnostics stay inside the active browser profile.

- [ ] **Step 3: Create the W1 release record**

`docs/releases/w1-pollination.md` records:

- release commit and world/model versions;
- local strict-gate result;
- browser interaction and console result;
- production URL after deployment;
- `UNSIGNED` direct Quest checklist for 72 FPS, controller mappings, label
  readability, comfort, lifecycle, complete mastery flow, asset integrity,
  memory, and temperature;
- release maturity remains `internalQA`.

- [ ] **Step 4: Commit the release candidate**

```bash
git add docs/releases/w1-pollination.md
git commit -m "release: prepare W1 Pollination reference world"
```

- [ ] **Step 5: Integrate, push, and watch workflows**

Fast-forward the verified branch to `main`, push, then watch both workflow runs:

```bash
git push origin main
QUALITY_RUN_ID=$(gh run list --workflow Quality --branch main --limit 1 \
  --json databaseId --jq '.[0].databaseId')
DEPLOY_RUN_ID=$(gh run list --workflow "Deploy to Vercel" --branch main \
  --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$QUALITY_RUN_ID" --exit-status
gh run watch "$DEPLOY_RUN_ID" --exit-status
```

- [ ] **Step 6: Production acceptance**

Verify `/`, `/simulations`, `/simulations/pollination`, and
`/simulations/world-builder-diagnostic` on the deployed commit. Complete
Pollination mastery, confirm zero console warnings/errors, confirm
`origin/main` equals the deployed SHA, and update the W1 release record with
immutable and aliased URLs.

- [ ] **Step 7: Release boundary**

Report W1 production evidence and the unsigned Quest checklist. Start the W2
Circuit plan only after production acceptance is recorded.
