# Solar System VR Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current solar-system mission into a polished, data-backed guided inquiry with realistic planet surfaces, an unlocked observatory mode, strong browser/VR controls, and a verified public deployment.

**Architecture:** Keep the pure astronomy and lesson-session modules as the scientific core. Add a pure observatory state module, a typed asset/attribution manifest, and focused scene APIs so the React viewer coordinates state while the shared runtime owns rendering. Enhance the existing scene incrementally to preserve Claude's working mission and dirty-worktree changes.

**Tech Stack:** Next.js 15, React 19, TypeScript, Three.js/WebXR, Vitest, Playwright, Vercel

---

## File map

- `apps/web/lib/world-builder/solarSystemObservatory.ts` — pure free-exploration state, time presets, layers, selection, and two-planet comparison.
- `apps/web/lib/world-builder/solarSystemAssets.ts` — typed local texture manifest, attribution, quality selection, and texture configuration.
- `apps/web/lib/world-builder/solarSystemScene.ts` — existing Three.js world; consume mapped textures and expose observatory controls without taking over lesson state.
- `apps/web/components/simulations/SolarSystemMissionViewer.tsx` — coordinate mission completion, observatory state, accessible controls, and scene APIs.
- `apps/web/components/simulation-experience/simulation-experience.css` — polished mission/observatory layout, responsive rules, focus states, and reduced motion.
- `apps/web/public/solar-system/textures/*` — locally packaged, optimized planetary texture maps.
- `apps/web/public/solar-system/ATTRIBUTION.md` — asset source and usage disclosure.
- `tests/unit/solar-system-observatory.test.ts` — pure observatory behavior.
- `tests/unit/solar-system-assets.test.ts` — complete manifest, local-file, attribution, and size-budget checks.
- `tests/unit/solar-system-mission-viewer.test.ts` — integration contract for observatory and scene controls.
- `tests/e2e/solar-system-mission.spec.ts` — browser launch, representative learning action, and observatory-access smoke coverage.

### Task 1: Observatory state model

**Files:**
- Create: `tests/unit/solar-system-observatory.test.ts`
- Create: `apps/web/lib/world-builder/solarSystemObservatory.ts`

- [ ] **Step 1: Write the failing observatory tests**

```ts
import { describe, expect, it } from 'vitest';
import { createSolarSystemObservatory } from '../../apps/web/lib/world-builder/solarSystemObservatory';

describe('solar system observatory', () => {
  it('starts paused with the core learning layers visible', () => {
    const observatory = createSolarSystemObservatory();
    expect(observatory.snapshot()).toMatchObject({
      paused: true,
      timePreset: 'day',
      selectedPlanetId: 'earth',
      comparisonPlanetId: 'jupiter',
      layers: { orbits: true, labels: true, gravity: false, trueScale: false },
    });
  });

  it('changes time, layers, selection, and comparison deterministically', () => {
    const observatory = createSolarSystemObservatory();
    expect(observatory.setTimePreset('month').daysPerSecond).toBe(30);
    expect(observatory.toggleLayer('gravity').layers.gravity).toBe(true);
    expect(observatory.selectPlanet('saturn').selectedPlanetId).toBe('saturn');
    expect(observatory.compareWith('uranus').comparisonPlanetId).toBe('uranus');
  });

  it('returns comparison values from the astronomy model', () => {
    const observatory = createSolarSystemObservatory();
    const comparison = observatory.comparison();
    expect(comparison.primary.id).toBe('earth');
    expect(comparison.secondary.id).toBe('jupiter');
    expect(comparison.rows.map(row => row.label)).toEqual([
      'Distance from Sun', 'Orbital period', 'Orbital speed', 'Radius', 'Mean temperature',
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run tests/unit/solar-system-observatory.test.ts`

Expected: FAIL because `solarSystemObservatory.ts` does not exist.

- [ ] **Step 3: Implement the pure observatory API**

Create exported `ObservatoryTimePreset`, `ObservatoryLayer`, `ObservatorySnapshot`, `PLANET_TIME_PRESETS`, and `createSolarSystemObservatory()`. The factory returns `snapshot`, `setPaused`, `setTimePreset`, `toggleLayer`, `selectPlanet`, `compareWith`, `comparison`, and `restart`. Validate planet identifiers through `getPlanet`; prevent the comparison planet from matching the selected planet by choosing the next planet in `SOLAR_PLANETS`.

- [ ] **Step 4: Run the observatory tests and verify GREEN**

Run: `npm test -- --run tests/unit/solar-system-observatory.test.ts`

Expected: PASS.

### Task 2: Realistic texture manifest and attribution

**Files:**
- Create: `tests/unit/solar-system-assets.test.ts`
- Create: `apps/web/lib/world-builder/solarSystemAssets.ts`
- Create: `apps/web/public/solar-system/ATTRIBUTION.md`
- Create: `apps/web/public/solar-system/textures/sun.webp`
- Create: `apps/web/public/solar-system/textures/mercury.webp`
- Create: `apps/web/public/solar-system/textures/venus.webp`
- Create: `apps/web/public/solar-system/textures/earth.webp`
- Create: `apps/web/public/solar-system/textures/mars.webp`
- Create: `apps/web/public/solar-system/textures/jupiter.webp`
- Create: `apps/web/public/solar-system/textures/saturn.webp`
- Create: `apps/web/public/solar-system/textures/uranus.webp`
- Create: `apps/web/public/solar-system/textures/neptune.webp`

- [ ] **Step 1: Write the failing asset tests**

```ts
import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOLAR_TEXTURES } from '../../apps/web/lib/world-builder/solarSystemAssets';

describe('solar system production assets', () => {
  it('provides a local credited texture for the Sun and every planet', () => {
    expect(Object.keys(SOLAR_TEXTURES).sort()).toEqual([
      'earth', 'jupiter', 'mars', 'mercury', 'neptune', 'saturn', 'sun', 'uranus', 'venus',
    ]);
    for (const asset of Object.values(SOLAR_TEXTURES)) {
      expect(asset.path).toMatch(/^\/solar-system\/textures\/.+\.webp$/);
      expect(asset.credit.length).toBeGreaterThan(4);
      expect(asset.sourceUrl).toMatch(/^https:\/\//);
      const diskPath = `apps/web/public${asset.path}`;
      expect(existsSync(diskPath)).toBe(true);
      expect(statSync(diskPath).size).toBeLessThan(600_000);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run tests/unit/solar-system-assets.test.ts`

Expected: FAIL because the manifest and files do not exist.

- [ ] **Step 3: Download and optimize authoritative imagery**

Use JPL planetary maps for Mercury, Venus, Earth, and Mars where the global maps are observation-derived. Use a consistently licensed Solar System Scope/Wikimedia set for the Sun and giant planets where the older JPL maps are explicitly fictional or too low resolution. Convert to 2048×1024 WebP at a headset-safe quality, preserving the original aspect ratio. Record source URL, creator, license/usage basis, modifications, and the representation caveat in `ATTRIBUTION.md`.

- [ ] **Step 4: Implement the typed asset manifest**

Export `SolarTextureId`, `SolarTextureAsset`, `SOLAR_TEXTURES`, and `configureSolarTexture(texture, renderer)` from `solarSystemAssets.ts`. Configure sRGB color space, repeat/clamp wrapping, mipmaps, and anisotropy capped by the renderer's supported maximum.

- [ ] **Step 5: Run the asset tests and verify GREEN**

Run: `npm test -- --run tests/unit/solar-system-assets.test.ts`

Expected: PASS and every asset remains below 600 KB.

### Task 3: Scene realism and observatory controls

**Files:**
- Modify: `tests/unit/solar-system-mission-viewer.test.ts`
- Modify: `apps/web/lib/world-builder/solarSystemScene.ts`

- [ ] **Step 1: Add failing scene/viewer contract assertions**

Assert that the viewer/scene source contains `SOLAR_TEXTURES`, `THREE.TextureLoader`, `setPaused`, `setLayerVisibility`, `focusPlanet`, and `setObservatoryMode`, and that the scene public API exposes the matching methods.

- [ ] **Step 2: Run the focused contract test and verify RED**

Run: `npm test -- --run tests/unit/solar-system-mission-viewer.test.ts`

Expected: FAIL on the missing texture and observatory APIs.

- [ ] **Step 3: Load mapped textures with procedural fallback**

Change planet and Sun material creation to start with the existing seeded procedural texture, then asynchronously replace the `map` after a local texture loads. Keep the fallback so slow or failed networks never prevent learning. Set `material.needsUpdate = true` and register loaded textures in the scene's owned-resource list.

- [ ] **Step 4: Add scene observatory controls**

Add methods:

```ts
setPaused(paused: boolean): void
setLayerVisibility(layer: 'orbits' | 'labels' | 'gravity', visible: boolean): void
setObservatoryMode(enabled: boolean): void
focusPlanet(planetId: PlanetId): THREE.Object3D
setTrueScale(enabled: boolean): void
```

`advance` must stop simulated time when paused. Observatory mode makes all planets selectable, keeps the comet optional, and leaves mission evidence objects hidden. Layer changes affect existing groups rather than rebuilding the scene.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run: `npm test -- --run tests/unit/solar-system-mission-viewer.test.ts tests/unit/solar-system-assets.test.ts`

Expected: PASS.

### Task 4: Completion-to-observatory experience

**Files:**
- Modify: `tests/unit/solar-system-mission-viewer.test.ts`
- Modify: `apps/web/components/simulations/SolarSystemMissionViewer.tsx`
- Modify: `apps/web/components/simulation-experience/simulation-experience.css`

- [ ] **Step 1: Add failing observatory UI contract assertions**

Assert that the viewer contains `createSolarSystemObservatory`, `Open observatory`, `Exit observatory`, `Simulation speed`, `Compare worlds`, `Orbit paths`, `Gravity vectors`, and `True distance`, while preserving narration, VR locomotion, focus guidance, and accessible live feedback.

- [ ] **Step 2: Run the contract test and verify RED**

Run: `npm test -- --run tests/unit/solar-system-mission-viewer.test.ts`

Expected: FAIL on the new observatory controls.

- [ ] **Step 3: Integrate observatory state and scene synchronization**

Create one observatory instance in a ref. On mission completion, keep the current summary and make its action open observatory mode. Synchronize time preset, pause, layer, selected planet, comparison planet, and true-scale state to the scene API. Browser focus uses `computeFocusFrame`; immersive VR never receives forced camera movement.

- [ ] **Step 4: Build the accessible observatory panel**

Render compact controls for pause/play, four time presets, planet selection, comparison selection, and layer toggles. Show a five-row comparison table derived from the pure observatory model. Keep all controls keyboard accessible with visible focus, unit-bearing values, and an `aria-live` status.

- [ ] **Step 5: Polish responsive and reduced-motion styling**

Extend the shared CSS with a right-edge observatory panel, compact mobile stacking, minimum touch targets, high-contrast focus rings, table readability, and reduced-motion overrides. Keep the central solar-system view unobstructed.

- [ ] **Step 6: Run focused tests and type-check**

Run: `npm test -- --run tests/unit/solar-system-observatory.test.ts tests/unit/solar-system-assets.test.ts tests/unit/solar-system-mission-viewer.test.ts && npm --workspace apps/web run type-check`

Expected: all focused tests PASS and TypeScript reports no errors.

### Task 5: Browser journey coverage

**Files:**
- Create: `tests/e2e/solar-system-mission.spec.ts`

- [ ] **Step 1: Write the browser smoke test**

```ts
import { expect, test } from '@playwright/test';

test('launches the solar mission and exposes accessible learning actions', async ({ page }) => {
  await page.goto('/simulations/c8-10-science-solar-system');
  await page.getByRole('button', { name: 'Explore in browser' }).click();
  await expect(page.getByRole('region', { name: 'Solar system mission actions' })).toBeVisible();
  await expect(page.getByText('Select the Sun', { exact: true }).last()).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});
```

- [ ] **Step 2: Run the smoke test against a local server**

Run: `npx playwright test tests/e2e/solar-system-mission.spec.ts`

Expected: PASS with no uncaught page errors.

- [ ] **Step 3: Capture desktop screenshots for visual QA**

Capture the launch screen, first mission, and observatory panel at 1440×1000. Inspect for clipping, label collisions, central-view obstruction, missing textures, and weak contrast; correct any observed defect with a failing regression test when behavior is affected.

### Task 6: Full verification and deployment

**Files:**
- Modify only if verification exposes a tested defect.

- [ ] **Step 1: Run repository verification**

Run: `npm run verify`

Expected: environment check, TypeSpec compile, catalog validation, generated catalog, all tests, type-check, and production build PASS.

- [ ] **Step 2: Inspect the final diff and asset footprint**

Run: `git diff --check && du -sh apps/web/public/solar-system && git status --short`

Expected: no whitespace errors, solar-system assets remain within the planned web budget, and only intentional files are modified.

- [ ] **Step 3: Commit the implementation intentionally**

Stage Claude's in-scope solar-system rewrite plus the observatory additions, tests, assets, and generated catalog changes. Exclude `.claude/` and `.superpowers/`. Commit with `feat: deliver solar system VR observatory`.

- [ ] **Step 4: Deploy the verified build**

Run the linked Vercel production deployment with the repository's existing project configuration.

Expected: a successful HTTPS production URL.

- [ ] **Step 5: Validate the deployed route**

Open `/simulations/c8-10-science-solar-system` on the public deployment, start browser mode, verify the first mission action and texture requests, check for page/console errors, and capture a final deployment screenshot.

- [ ] **Step 6: Report the deployment**

Provide the public URL, route, test/build evidence, asset attribution location, and the remaining caveat that physical headset certification requires an actual Quest-class device.
