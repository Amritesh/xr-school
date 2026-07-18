# Natural Pollination Bees and Flowers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the existing Pollination bees and flowers a natural stylized appearance without changing lesson behavior or exceeding the procedural Quest-friendly rendering approach.

**Architecture:** Keep visual ownership in the existing world modules: palette definitions in `pollinationWorld.ts`, hero bee and lesson-flower geometry in `pollinationBotany.ts`, and instanced background flowers in `pollinationGarden.ts`. Add one focused geometry/material contract test so visual details are testable without a WebGL renderer, then use the current viewer material factory and scene lifecycle unchanged.

**Tech Stack:** TypeScript, Three.js 0.170, Vitest, Next.js 15, Vercel CLI

---

## File Map

- Create `tests/unit/pollination-natural-art.test.ts`: executable contracts for palette, bee anatomy, lesson-flower variation, and peripheral flower construction.
- Modify `apps/web/lib/world-builder/pollinationWorld.ts`: natural base colours and PBR values for flowers, bee body, and wings.
- Modify `apps/web/lib/world-builder/pollinationBotany.ts`: organic leaf/petal geometry plus tapered, fuzzy-looking, veined hero and ambient bees.
- Modify `apps/web/lib/world-builder/pollinationGarden.ts`: instanced petal-and-centre peripheral blossoms with deterministic natural variation.
- Modify `apps/web/lib/world-builder/pollinationScene.ts`: dispose the garden-owned peripheral blossom materials at the existing scene boundary.
- Modify `apps/web/components/simulations/PollinationViewer.tsx`: derive dedicated bee-fuzz and wing-vein material variants and pass them to the botany builders.

### Task 1: Lock the natural-art contracts with failing tests

**Files:**

- Create: `tests/unit/pollination-natural-art.test.ts`
- Test: `tests/unit/pollination-natural-art.test.ts`

- [ ] **Step 1: Write material helpers and failing palette/geometry tests**

Create the test with these contracts:

```ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  createBee,
  createFlowerSpecimen,
  type PollinationBotanyMaterials,
} from '../../apps/web/lib/world-builder/pollinationBotany';
import { createSchoolGarden } from '../../apps/web/lib/world-builder/pollinationGarden';
import { POLLINATION_WORLD } from '../../apps/web/lib/world-builder/pollinationWorld';

function material(color = '#777777') {
  return new THREE.MeshStandardMaterial({ color });
}

function botanyMaterials(): PollinationBotanyMaterials {
  return {
    stem: material(), leaf: material(), petalPrimary: material(),
    petalControl: material(), pollen: material(), flowerCentre: material(),
    beeYellow: material(), beeDark: material(), beeFuzz: material(),
    beeWing: material(), beeWingVein: material(), fruitSkin: material(),
    fruitFlesh: material(), seed: material(), root: material(), soil: material(),
  };
}

describe('pollination natural art', () => {
  it('uses restrained botanical and bee base colours', () => {
    const colors = Object.fromEntries(POLLINATION_WORLD.materials.map(
      item => [item.id, item.baseColor],
    ));
    expect(colors).toMatchObject({
      'petal-pink': '#c96f87',
      'petal-violet': '#78689a',
      'bee-yellow': '#b98524',
      'bee-dark': '#352b23',
      'bee-wing': '#c7d6d2',
    });
  });

  it('builds a tapered, fuzzy-looking bee with veined wings and six hero legs', () => {
    const bee = createBee(botanyMaterials(), 'full');
    expect(bee.root.getObjectByName('bee-abdomen')).toBeInstanceOf(THREE.Mesh);
    expect((bee.root.getObjectByName('bee-abdomen') as THREE.Mesh).geometry.type)
      .toBe('LatheGeometry');
    expect(bee.root.getObjectByName('bee-thorax-fuzz')).toBeInstanceOf(THREE.Mesh);
    expect(bee.root.getObjectsByProperty('name', 'bee-wing-vein')).toHaveLength(8);
    expect(bee.root.getObjectsByProperty('name', 'bee-leg')).toHaveLength(6);
  });

  it('varies lesson petals deterministically and uses shaped leaves', () => {
    const flower = createFlowerSpecimen(botanyMaterials(), {
      id: 'treatment', position: [0, 0, 0],
    });
    const petals = flower.petalGroup.getObjectsByProperty('name', 'petal-blade');
    expect(petals).toHaveLength(20);
    expect(new Set(petals.map(petal => petal.scale.x.toFixed(3))).size)
      .toBeGreaterThan(3);
    const leaf = flower.root.getObjectByName('leaf-blade') as THREE.Mesh;
    expect(leaf.geometry.type).toBe('ShapeGeometry');
    expect((petals[0] as THREE.Mesh).geometry.getAttribute('color')).toBeDefined();
  });

  it('uses instanced petal silhouettes and centres instead of sphere blossoms', () => {
    const shared = material();
    const garden = createSchoolGarden({
      soil: shared, path: shared, paintedWood: shared, naturalWood: shared,
      leaf: shared, grass: shared, glass: shared, metal: shared,
    });
    const bed = garden.root.getObjectByName('peripheral-flower-bed')!;
    const petals = bed.getObjectByName('instanced-peripheral-petals') as THREE.InstancedMesh;
    const centres = bed.getObjectByName('instanced-peripheral-centres') as THREE.InstancedMesh;
    expect(petals.geometry.type).toBe('ShapeGeometry');
    expect(centres).toBeInstanceOf(THREE.InstancedMesh);
    expect(garden.dispose).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run tests/unit/pollination-natural-art.test.ts
```

Expected: FAIL because `beeFuzz`/`beeWingVein` are not in the material interface, the natural colours are absent, and the named geometry contracts do not exist.

### Task 2: Implement the natural bee and lesson flowers

**Files:**

- Modify: `apps/web/lib/world-builder/pollinationWorld.ts:55-85`
- Modify: `apps/web/lib/world-builder/pollinationBotany.ts:3-300`
- Modify: `apps/web/components/simulations/PollinationViewer.tsx:577-650`
- Test: `tests/unit/pollination-natural-art.test.ts`

- [ ] **Step 1: Apply the restrained PBR palette**

Change the five mapped material definitions to these values:

```ts
mappedMaterial('petal-pink', 'petal', '#c96f87', 0.58, { doubleSided: true }),
mappedMaterial('petal-violet', 'petal', '#78689a', 0.6, { doubleSided: true }),
mappedMaterial('bee-yellow', 'bee', '#b98524', 0.78),
mappedMaterial('bee-dark', 'bee', '#352b23', 0.86),
mappedMaterial('bee-wing', 'wing', '#c7d6d2', 0.3, {
  doubleSided: true,
  opacity: 0.46,
}),
```

- [ ] **Step 2: Add deterministic organic shape helpers**

In `pollinationBotany.ts`, add `beeFuzz` and `beeWingVein` to `PollinationBotanyMaterials`, then add these helpers above `createLeaf`:

```ts
function organicVariation(index: number, salt: number) {
  return (Math.sin(index * 12.9898 + salt * 78.233) + 1) * 0.5;
}

function createTaperedBladeGeometry(length: number, halfWidth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(halfWidth, length * 0.18, halfWidth, length * 0.72, 0, length);
  shape.bezierCurveTo(-halfWidth, length * 0.72, -halfWidth, length * 0.18, 0, 0);
  return new THREE.ShapeGeometry(shape, 8);
}
```

Use `createTaperedBladeGeometry` for named `leaf-blade` and `petal-blade` meshes. Pass each petal's index into `createPetal`, and use `organicVariation` to vary pivot yaw/pitch and blade scale by at most 12%, keeping the 12 outer and 8 inner petals and all existing target names. Add a `color` buffer attribute to each petal geometry: white at the petal base and gradually darkening to `0.82` at the tip, then enable `vertexColors` and set `needsUpdate = true` on the two loaded petal materials in `PollinationViewer.tsx`. This supplies natural base-to-edge colour variation without additional draw calls.

- [ ] **Step 3: Replace the bee body silhouette and add low-cost detail**

Replace the shared abdomen geometry and add shared fuzz/vein geometry:

```ts
abdomen: new THREE.LatheGeometry([
  new THREE.Vector2(0.018, -0.095),
  new THREE.Vector2(0.063, -0.055),
  new THREE.Vector2(0.078, 0.018),
  new THREE.Vector2(0.058, 0.095),
  new THREE.Vector2(0.012, 0.135),
], 18),
thoraxFuzz: new THREE.IcosahedronGeometry(0.076, 2),
wingVein: new THREE.CylinderGeometry(0.0014, 0.0014, 0.1, 4),
```

Name the body meshes `bee-abdomen`, `bee-thorax-fuzz`, and `bee-head`; rotate the lathed abdomen onto the bee's Z axis. Name all six hero leg meshes `bee-leg`. For each hero wing, add two child vein meshes named `bee-wing-vein`, using `materials.beeWingVein`; ambient bees retain their simple wing/body budget.

- [ ] **Step 4: Wire derived bee detail materials in the viewer**

Add the two material properties when constructing `PollinationSceneMaterials`:

```ts
beeFuzz: derive(byId['bee-dark'], {
  color: '#594633', roughness: 1, metalness: 0,
}),
beeWingVein: derive(byId['bee-dark'], {
  color: '#6f7e79', roughness: 0.82, metalness: 0,
  map: null, normalMap: null, roughnessMap: null,
}),
```

- [ ] **Step 5: Run focused tests and type-check**

Run:

```bash
npx vitest run tests/unit/pollination-natural-art.test.ts -t "restrained|tapered|varies"
npx vitest run tests/unit/pollination-world.test.ts tests/unit/pollination-viewer-feedback.test.ts
npm --workspace apps/web run type-check
```

Expected: the selected bee/lesson-flower contracts pass, both regression files pass, and TypeScript reports no errors. The peripheral-flower contract remains intentionally red until Task 3.

- [ ] **Step 6: Commit the bee and lesson-flower implementation**

```bash
git add apps/web/lib/world-builder/pollinationWorld.ts apps/web/lib/world-builder/pollinationBotany.ts apps/web/components/simulations/PollinationViewer.tsx tests/unit/pollination-natural-art.test.ts
git commit -m "feat: naturalize pollination bees and lesson flowers"
```

### Task 3: Replace spherical peripheral blossoms

**Files:**

- Modify: `apps/web/lib/world-builder/pollinationGarden.ts:107-154`
- Modify: `apps/web/lib/world-builder/pollinationScene.ts:337-345`
- Test: `tests/unit/pollination-natural-art.test.ts`

- [ ] **Step 1: Build a reusable five-lobed blossom silhouette**

Add this geometry helper near the top of `pollinationGarden.ts`:

```ts
function createPeripheralBlossomGeometry() {
  const shape = new THREE.Shape();
  const points = 40;
  for (let index = 0; index <= points; index += 1) {
    const angle = index / points * Math.PI * 2;
    const radius = 0.055 + Math.cos(angle * 5) * 0.018;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 5);
}
```

- [ ] **Step 2: Replace sphere batches with instanced petals and centres**

Use one `InstancedMesh` named `instanced-peripheral-petals` with per-instance colours from `['#b96d82', '#75658f', '#d8bd72', '#d7d1b3', '#a9677b']`, plus one `InstancedMesh` named `instanced-peripheral-centres` using a small `SphereGeometry` and warm ochre material. Set `instanceColor` through `setColorAt`, keep the existing 240 stems, and add deterministic height, scale, yaw, and lean variation using the existing index. Mark both `instanceMatrix` values and the petal mesh's `instanceColor` as needing update. Retain the two internally owned `MeshStandardMaterial` instances in `createSchoolGarden`, expose a `dispose()` method that disposes them, and invoke `garden.dispose()` inside the existing `pollinationScene.dispose()` method.

- [ ] **Step 3: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run tests/unit/pollination-natural-art.test.ts tests/unit/pollination-scene.test.ts tests/unit/pollination-viewer-feedback.test.ts
```

Expected: PASS for all selected files.

- [ ] **Step 4: Commit the peripheral-flower implementation**

```bash
git add apps/web/lib/world-builder/pollinationGarden.ts apps/web/lib/world-builder/pollinationScene.ts tests/unit/pollination-natural-art.test.ts
git commit -m "feat: add natural peripheral pollination flowers"
```

### Task 4: Verify visually, run release checks, and deploy

**Files:**

- Verify: `apps/web/app/simulations/pollination/page.tsx`
- Verify: all modified files above

- [ ] **Step 1: Run the full automated verification**

```bash
npm run test
npm --workspace apps/web run type-check
npm --workspace apps/web run build
```

Expected: 80+ test files pass, type-check exits 0, and Next.js production build succeeds.

- [ ] **Step 2: Launch and inspect the simulation**

```bash
npm --workspace apps/web run dev
```

Open `http://localhost:3000/simulations/pollination`. Capture and inspect the initial flower stage and the bee-observation stage. Confirm muted natural colours, tapered bee anatomy, readable translucent wings, non-repeating lesson petals, non-spherical peripheral blossoms, stable camera/selection, and no browser console errors.

- [ ] **Step 3: Review the final diff and working tree scope**

```bash
git status --short
git diff HEAD~3 -- apps/web/lib/world-builder/pollinationWorld.ts apps/web/lib/world-builder/pollinationBotany.ts apps/web/lib/world-builder/pollinationGarden.ts apps/web/lib/world-builder/pollinationScene.ts apps/web/components/simulations/PollinationViewer.tsx tests/unit/pollination-natural-art.test.ts
```

Expected: only the approved Pollination art files, tests, design, and plan are changed; the user's untracked `.claude/` directory remains untouched.

- [ ] **Step 4: Deploy the verified build to Vercel production**

```bash
XR_DEPLOYMENT_URL="$(npx vercel --prod --yes | /usr/bin/tail -n 1)"
printf '%s\n' "$XR_DEPLOYMENT_URL"
```

Expected: Vercel reports a successful production deployment URL. If the checkout is not linked or authentication is absent, stop and report the exact Vercel prompt/error instead of guessing project settings.

- [ ] **Step 5: Smoke-test the deployed route**

```bash
curl --fail --silent --show-error "$XR_DEPLOYMENT_URL/simulations/pollination" >/dev/null
```

Expected: exit code 0. Report the deployment URL and verification summary to the user.
