# Aditya Guided Classes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish all 17 guided PR #8 contributions as evidence-gated, canonical XR School classes with declarative content, focused scene adapters, shared browser/VR presentation, preserved legacy URLs, and behavioral verification.

**Architecture:** Each class is one canonical implemented-simulation record composed from a `GuidedSimulationDefinition`, an assessment sequence, caption/narration cues, an asset manifest, and a `SimulationSceneAdapter`. The shared simulation host owns Three.js/WebXR lifecycle, input, audio, quality profiles, and disposal; the shared `GuidedSimulationViewer` owns lesson/assessment coordination and composes the existing experience shell. Dedicated canonical route files resolve viewer keys through one registry, while dedicated legacy route files issue server redirects.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 15 App Router, Three.js 0.170, `@xr-school/simulation-schema`, `@xr-school/simulation-content`, `@xr-school/simulation-runtime`, `@xr-school/simulation-web`, Vitest, Playwright, WebP/cwebp.

---

## Execution Order and Boundaries

This plan runs after the foundation plan has created these public contracts:

- `packages/simulation-schema/src/guided.ts`: `GuidedStageDefinition`, `GuidedSimulationDefinition`, `toExperienceDefinition`.
- `packages/simulation-content/src/implemented/registry.ts`: `ImplementedSimulationDefinition`, `IMPLEMENTED_SIMULATIONS`, canonical and alias lookup.
- `packages/simulation-web/src/scene/types.ts`: `SimulationSceneAdapter`, `SimulationSceneContext`, `SimulationSceneHandle`.
- `packages/simulation-web/src/host/createSimulationHost.ts`: the shared renderer/WebXR host.
- `packages/simulation-web/src/index.ts`: public exports.
- `apps/web/components/simulation-experience/SimulationCanvasHost.tsx`: the stable shared canvas mount.
- Shared shell/HUD support for `simulationId`, primary action, assessment, captions, replay, restart, and help.

The foundation contracts used below are fixed:

```ts
interface GuidedStageDefinition extends ExperienceStageDefinition {
  detail: string;
  actionLabel: string;
  narrationId: string;
  sceneCueId: string;
  evidenceMode: "scene" | "answer";
  scaleNote?: string;
  misconceptionId?: string;
  transferPromptId?: string;
}

interface GuidedSimulationDefinition {
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

`SimulationSceneContext` supplies the host-owned renderer, scene, camera, resource registry, quality profile, launch preferences, normalized action dispatch, evidence recording, and `SimulationInteractionRegistry`. Adapters never create a renderer, animation loop, XR session, audio singleton, input stack, resize listener, or private lesson machine.

The reporting/release plan owns `playwright.config.ts`, root `test:e2e`/`verify` wiring, CI/deploy gates, aggregate production smoke, and generation of missing narration clips. This plan adds the focused guided route suite only. Do not add network narration generation to `prebuild`, `build`, or `verify`.

## Canonical Inventory

This table is normative. Route, module, viewer, alias, source, asset, and test data must use these exact values.

|   # | Canonical slug / module ID                                                                                 | Viewer key                      | Legacy path                                               | PR viewer source                   | Stages | Environment source                         |
| --: | ---------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------- | ---------------------------------- | -----: | ------------------------------------------ |
|   1 | `c5-ch04-a01-food-spoilage` / `sim-c05-ch04-a01-food-spoilage`                                             | `guided-food-spoilage`          | `/simulations/mangoes-round-the-year-food-spoilage`       | `FoodSpoilageViewer.tsx`           |      6 | `food-courtyard-360.png`                   |
|   2 | `c5-ch04-a02-milk-spoilage` / `sim-c05-ch04-a02-milk-spoilage`                                             | `guided-milk-spoilage`          | `/simulations/mangoes-round-the-year-milk-spoilage`       | `MilkSpoilageViewer.tsx`           |      6 | `food-courtyard-360.png`                   |
|   3 | `c5-ch04-a03-the-making-of-aam-papad` / `sim-c05-ch04-a03-the-making-of-aam-papad`                         | `guided-aam-papad`              | `/simulations/mangoes-round-the-year-aam-papad`           | `AamPapadViewer.tsx`               |      7 | `food-courtyard-360.png`                   |
|   4 | `c5-ch05-a01-pitcher-plant-the-insect-hunter` / `sim-c05-ch05-a01-pitcher-plant-the-insect-hunter`         | `guided-pitcher-plant`          | `/simulations/seeds-and-seeds-pitcher-plant`              | `PitcherPlantViewer.tsx`           |      7 | `pitcher-plant-bog-360.png`                |
|   5 | `c5-ch05-a02-seed-dispersal` / `sim-c05-ch05-a02-seed-dispersal`                                           | `guided-seed-dispersal`         | `/simulations/seeds-and-seeds-seed-dispersal`             | `SeedDispersalViewer.tsx`          |      7 | `seed-dispersal-habitat-360.png`           |
|   6 | `c5-ch06-a01-the-storage-of-rainwater` / `sim-c05-ch06-a01-the-storage-of-rainwater`                       | `guided-rainwater-storage`      | `/simulations/every-drop-counts-rainwater-storage`        | `RainwaterStorageViewer.tsx`       |      7 | `rainwater-storage-courtyard-360.png`      |
|   7 | `c5-ch06-a02-a-step-well-structure` / `sim-c05-ch06-a02-a-step-well-structure`                             | `guided-stepwell-structure`     | `/simulations/every-drop-counts-stepwell-structure`       | `StepwellStructureViewer.tsx`      |      7 | `stepwell-courtyard-360.png`               |
|   8 | `c5-ch07-a02-dead-sea-salt-water-and-its-effects` / `sim-c05-ch07-a02-dead-sea-salt-water-and-its-effects` | `guided-dead-sea-salt-water`    | `/simulations/experiments-with-water-dead-sea-salt-water` | `DeadSeaSaltWaterViewer.tsx`       |      8 | `dead-sea-salt-shore-360.png`              |
|   9 | `c5-ch08-a01-diagnosis-of-malaria` / `sim-c05-ch08-a01-diagnosis-of-malaria`                               | `guided-malaria-diagnosis`      | `/simulations/treat-for-mosquitoes-malaria-diagnosis`     | `MalariaDiagnosisViewer.tsx`       |      8 | `malaria-diagnosis-lab-360.png`            |
|  10 | `c5-ch08-a02-life-cycle-of-the-mosquito` / `sim-c05-ch08-a02-life-cycle-of-the-mosquito`                   | `guided-mosquito-life-cycle`    | `/simulations/treat-for-mosquitoes-mosquito-life-cycle`   | `MosquitoLifeCycleViewer.tsx`      |      8 | `mosquito-life-cycle-wetland-360.png`      |
|  11 | `c5-ch09-a01-river-crossing-adventure` / `sim-c05-ch09-a01-river-crossing-adventure`                       | `guided-river-crossing`         | `/simulations/up-you-go-river-crossing-adventure`         | `RiverCrossingAdventureViewer.tsx` |      8 | `up-you-go-river-crossing-360.png`         |
|  12 | `c5-ch09-a02-rock-climbing` / `sim-c05-ch09-a02-rock-climbing`                                             | `guided-rock-climbing`          | `/simulations/up-you-go-rock-climbing`                    | `RockClimbingViewer.tsx`           |      8 | `up-you-go-rock-climbing-360.png`          |
|  13 | `c5-ch09-a03-camp-in-the-snow` / `sim-c05-ch09-a03-camp-in-the-snow`                                       | `guided-camp-in-snow`           | `/simulations/up-you-go-camp-in-snow`                     | `CampInSnowViewer.tsx`             |      8 | `up-you-go-camp-in-snow-360.png`           |
|  14 | `c5-ch09-a04-snow-mountain-climbing` / `sim-c05-ch09-a04-snow-mountain-climbing`                           | `guided-snow-mountain-climbing` | `/simulations/up-you-go-snow-mountain-climbing`           | `SnowMountainClimbingViewer.tsx`   |      8 | `up-you-go-snow-mountain-climbing-360.png` |
|  15 | `c5-ch10-a01-a-visit-of-ancient-fort` / `sim-c05-ch10-a01-a-visit-of-ancient-fort`                         | `guided-ancient-fort`           | `/simulations/walls-tell-stories-ancient-fort-visit`      | `AncientFortVisitViewer.tsx`       |      8 | `walls-tell-stories-ancient-fort-360.png`  |
|  16 | `c6-ch03-a01-cotton-farming` / `sim-c06-ch03-a01-cotton-farming`                                           | `guided-cotton-farming`         | `/simulations/fibre-to-fabric-cotton-farming`             | `CottonFarmingViewer.tsx`          |      7 | `cotton-field-360.png`                     |
|  17 | `c6-ch03-a02-the-process-of-cotton-ginning` / `sim-c06-ch03-a02-the-process-of-cotton-ginning`             | `guided-cotton-ginning`         | `/simulations/fibre-to-fabric-cotton-ginning`             | `CottonGinningViewer.tsx`          |      6 | `cotton-ginning-workshop-360.png`          |

All PR viewer sources are under `apps/web/components/simulations/` in merge parent `621dfb61b39a4c49e8abb46ce60c54ea3d044479`. During authoring, read an immutable source with, for example:

```bash
git show 621dfb61b39a4c49e8abb46ce60c54ea3d044479:apps/web/components/simulations/FoodSpoilageViewer.tsx
```

For every class, preserve the exact `cue`, `detail`, and narration text from the corresponding PR `STAGES` and `NARRATIONS` entries unless a correction is explicitly stated in the approved design. Do not port inline styles, navigation buttons, audio ownership, controller shortcuts, environment loader, renderer setup, or cleanup code from those files.

## Stage and Evidence Matrix

`sceneCueId` is `scene:<stage-id>` and `narrationId` is `<guided-definition-id>:<stage-id>`. Each row has exactly one required action and one completion evidence ID. Rows marked `M` or `T` use `evidenceMode: 'answer'`; all others use `evidenceMode: 'scene'`. `M` links `misconceptionId`, and `T` links `transferPromptId`.

| Simulation          | Ordered stage IDs (title: action ID -> evidence ID)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Food spoilage       | `setup` (Set Up the Investigation: `set-up-mango-samples` -> `controlled-samples-observed`); `day-zero` (Day 0 — Fresh Mango: `inspect-fresh-mango` -> `fresh-baseline-observed`); `day-one` (Day 1 — First Changes: `advance-to-day-one` -> `early-softening-observed`); `day-three` (Day 3 — Compare Carefully: `advance-to-day-three` -> `mould-comparison-observed`); `day-five` M (Day 5 — Strong Evidence: `compare-day-five-samples` -> `preservation-slows-evidence`); `preservation` T (What Slows Spoilage?: `apply-food-storage-rule` -> `food-storage-transfer-evidence`).                                                                                                                                                                                                       |
| Milk spoilage       | `setup` (Set Up Three Samples: `set-up-milk-samples` -> `milk-controls-observed`); `hour-zero` (Hour 0 — Fresh Milk: `inspect-fresh-milk` -> `fresh-milk-baseline-observed`); `hour-six` (After 6 Hours: `advance-to-six-hours` -> `warm-milk-change-observed`); `hour-twelve` (After 12 Hours: `advance-to-twelve-hours` -> `curd-whey-observed`); `hour-twenty-four` M (After 24 Hours: `compare-milk-storage` -> `milk-storage-rate-evidence`); `safe-storage` T (Store Milk Safely: `apply-safe-milk-rule` -> `safe-milk-transfer-evidence`).                                                                                                                                                                                                                                            |
| Aam papad           | `platform` (Prepare the Sunny Platform: `prepare-drying-platform` -> `clean-platform-observed`); `mangoes` (Choose Ripe Mangoes: `wash-and-select-mangoes` -> `clean-ripe-mangoes-observed`); `strain` (Extract and Strain the Pulp: `strain-mango-pulp` -> `smooth-pulp-observed`); `mix` (Mix Sugar and Jaggery: `mix-sweeteners` -> `even-mixture-observed`); `spread` (Spread a Thin Layer: `spread-thin-layer` -> `thin-layer-observed`); `dry-layers` M (Sun-dry and Add Layers: `run-four-week-drying` -> `moisture-removal-evidence`); `store` T (Peel, Cut and Store: `apply-dry-storage-rule` -> `aam-papad-transfer-evidence`).                                                                                                                                                   |
| Pitcher plant       | `meet` (Meet the Insect Hunter: `inspect-pitcher-habitat` -> `poor-soil-observed`); `leaf` (A Modified Leaf: `inspect-modified-leaf` -> `leaf-trap-observed`); `nectar` (Nectar Attracts: `release-insect` -> `nectar-attraction-observed`); `rim` (Slippery Rim: `follow-insect-fall` -> `slippery-rim-observed`); `fluid` (Digestive Fluid: `observe-digestion` -> `mineral-release-observed`); `absorb` M (Nutrients Absorbed: `trace-mineral-uptake` -> `mineral-not-energy-evidence`); `photosynthesis` T (Plant, Not Animal: `apply-plant-nutrition-rule` -> `pitcher-transfer-evidence`).                                                                                                                                                                                             |
| Seed dispersal      | `purpose` (Why Seeds Travel: `release-first-seeds` -> `reduced-crowding-observed`); `wind` (Carried by Wind: `start-seed-breeze` -> `wind-adaptation-observed`); `water` (Carried by Water: `float-coconut` -> `water-adaptation-observed`); `burr` (Hitchhiking on Animals: `attach-burr` -> `hook-adaptation-observed`); `fruit` M (Seeds Inside Fruits: `follow-fruit-seed` -> `animal-dispersal-evidence`); `explosion` (Explosive Dispersal: `burst-ripe-pod` -> `explosive-dispersal-observed`); `compare` T (Dispersal Challenge Complete: `apply-dispersal-rule` -> `seed-transfer-evidence`).                                                                                                                                                                                       |
| Rainwater storage   | `save` (Save the Rain: `begin-rainfall` -> `runoff-opportunity-observed`); `roof` (The Roof Catchment: `collect-roof-runoff` -> `roof-catchment-observed`); `gutter` (Gutter and Downpipe: `open-downpipe` -> `directed-flow-observed`); `first-flush` (Discard the First Dirty Flow: `divert-first-flush` -> `dirty-runoff-diverted`); `filter` M (Filter the Water: `run-water-through-filter` -> `filter-limit-evidence`); `store` (Store and Reuse: `fill-covered-tank` -> `covered-storage-observed`); `review` T (Every Drop Counts: `apply-rainwater-rule` -> `rainwater-transfer-evidence`).                                                                                                                                                                                         |
| Stepwell            | `meet` (Meet the Stepwell: `open-stepwell-structure` -> `deep-store-observed`); `steps` (Steps to the Water: `descend-stepwell-levels` -> `variable-access-observed`); `shade` (Landings, Pillars and Shade: `reveal-shaded-levels` -> `cool-gallery-observed`); `inflow` (How Water Enters: `send-water-inward` -> `runoff-groundwater-observed`); `levels` M (Changing Water Level: `compare-water-levels` -> `water-level-causes-evidence`); `community` (A Shared Water Place: `protect-shared-water` -> `community-care-observed`); `review` T (Structure Complete: `apply-stepwell-rule` -> `stepwell-transfer-evidence`).                                                                                                                                                             |
| Dead Sea            | `meet` (Meet the Dead Sea: `inspect-dead-sea-basin` -> `landlocked-lake-observed`); `compare` (Fresh Water and Salt Water: `compare-equal-tanks` -> `equal-volume-comparison-observed`); `dissolve` (Dissolve the Salt: `dissolve-salt` -> `dissolved-matter-observed`); `fresh-egg` (Egg in Fresh Water: `release-fresh-water-egg` -> `fresh-egg-sinks-observed`); `salt-egg` (Egg in Salt Water: `release-salt-water-egg` -> `salt-egg-floats-observed`); `forces` M (Why Floating Is Easier: `compare-buoyant-forces` -> `object-not-lighter-evidence`); `effects` (Effects of Very Salty Water: `inspect-salinity-effects` -> `salinity-ecology-safety-observed`); `review` T (Salt, Density and Buoyancy: `apply-buoyancy-rule` -> `buoyancy-transfer-evidence`).                       |
| Malaria diagnosis   | `symptoms` M (Symptoms Are Clues: `review-malaria-symptoms` -> `symptoms-not-diagnosis-evidence`); `history` (History and Mosquito Link: `review-exposure-history` -> `exposure-not-confirmation-observed`); `sample` (Professional Blood Collection: `observe-safe-blood-collection` -> `professional-collection-observed`); `films` (Thick and Thin Blood Films: `prepare-blood-films` -> `film-purpose-observed`); `stain` (Stain and Focus: `stain-and-focus-slide` -> `stained-field-observed`); `scan` (Find the Parasites: `reveal-three-parasites` -> `three-parasites-observed`); `rdt` (Rapid Diagnostic Test: `interpret-rdt` -> `valid-rdt-observed`); `care` T (Act on a Confirmed Result: `apply-professional-care-rule` -> `malaria-care-transfer-evidence`).                 |
| Mosquito life cycle | `cycle` (Meet the Anopheles Cycle: `inspect-four-stage-cycle` -> `four-stages-observed`); `eggs` (Eggs Float on Water: `hatch-anopheles-eggs` -> `separate-eggs-observed`); `larvae` (Larvae — The Wigglers: `complete-fourth-moult` -> `parallel-larvae-observed`); `pupae` (Pupae — The Tumblers: `begin-metamorphosis` -> `nonfeeding-pupae-observed`); `adult` (Adult Emerges: `emerge-adult-mosquito` -> `adult-emergence-observed`); `female` M (The Adult Female: `compare-adult-feeding` -> `female-bite-misconception-evidence`); `protect` (Protect the Community: `choose-breeding-prevention` -> `prevention-actions-observed`); `review` T (Life Cycle Mastered: `apply-mosquito-cycle-rule` -> `mosquito-transfer-evidence`).                                                  |
| River crossing      | `survey` (Survey the Mountain River: `inspect-crossing-route` -> `supervised-route-observed`); `equipment` (Check Before You Cross: `inspect-river-equipment` -> `protective-equipment-observed`); `anchors` (Test the Piton Anchors: `inspect-both-pitons` -> `anchor-system-observed`); `clip` (Clip In to the Main Rope: `attach-safety-sling` -> `locked-sling-observed`); `cross` (Cross with Firm Footsteps: `enter-and-cross-river` -> `firm-footsteps-observed`); `recover` (Recover from a Slip: `recover-river-grip` -> `sling-support-observed`); `team` M (Help the Team Across: `choose-safe-team-support` -> `courage-with-safety-evidence`); `review` T (River Crossing Complete: `apply-protected-crossing-rule` -> `river-transfer-evidence`).                              |
| Rock climbing       | `arrive` (Arrive at the Training Rock: `inspect-climbing-route` -> `supervised-route-observed`); `holds` (Identify Hand and Foot Holds: `identify-secure-holds` -> `hold-route-observed`); `equipment` (Helmet, Harness, Sling and Rope: `inspect-climbing-equipment` -> `checked-equipment-observed`); `slip` M (The Rope Catches a Slip: `observe-protected-slip` -> `rope-supervision-evidence`); `posture` (Keep the Body at 90 Degrees: `correct-climbing-posture` -> `balanced-posture-observed`); `climb` (Move with Three Secure Points: `climb-hold-by-hold` -> `three-points-observed`); `rappel` (Prepare to Rappel: `rappel-under-supervision` -> `controlled-rappel-observed`); `review` T (Rock Climbing Complete: `apply-climbing-safety-rule` -> `rock-transfer-evidence`).  |
| Camp in snow        | `site` (Reach the 2,134 Metre Camp: `choose-safe-tent-site` -> `safe-site-observed`); `tent` M (Build a Double-Layer Tent: `raise-double-layer-tent` -> `trapped-air-insulation-evidence`); `lines` (Secure Pegs and Guy Lines: `tension-guy-lines` -> `anchored-tent-observed`); `drain` (Dig a Drain Around the Tent: `dig-drainage-channel` -> `meltwater-diverted-observed`); `cook` (Cook at a Safe Stone Chulha: `prepare-supervised-meal` -> `fire-boundary-observed`); `waste` (Leave the Campsite Clean: `pack-camp-waste` -> `leave-no-trace-observed`); `sleep` (Rest in Feather Sleeping Bags: `enter-sleeping-bag` -> `sleeping-bag-insulation-observed`); `morning` T (Wake to Falling Snow: `apply-snow-camp-rule` -> `camp-transfer-evidence`).                              |
| Snow mountain       | `route` (Read the Snow-Mountain Route: `approve-marked-route` -> `weather-route-observed`); `equipment` (Prepare Warm Layers and Equipment: `complete-cold-equipment-check` -> `cold-equipment-observed`); `group` (Move as One Group: `begin-supervised-climb` -> `group-pace-observed`); `steps` (Plant, Step, Balance: `practise-snow-steps` -> `stick-step-balance-observed`); `rope` M (Practise on the Fixed Safety Rope: `cross-fixed-rope-section` -> `rope-not-permission-evidence`); `slip` (Respond to a Slip: `recover-stable-stance` -> `three-contact-recovery-observed`); `height` (Reach the 2,700 Metre Snowfield: `complete-height-check` -> `group-arrival-observed`); `return` T (Return Before Conditions Change: `apply-turnaround-rule` -> `snow-transfer-evidence`). |
| Ancient fort        | `gate` (Approach the Great Gate: `inspect-fort-gate` -> `defensive-gate-observed`); `bastion` (Look Out from a Bastion: `reveal-bastion-view` -> `wider-field-observed`); `map` (Read the Fort as a Town: `orient-fort-map` -> `fortified-town-observed`); `ruins` (Investigate the Palace Ruins: `highlight-architectural-clues` -> `ruin-evidence-observed`); `water` (Trace the Water Engineering: `start-water-lifting-model` -> `non-electric-water-system-observed`); `sound` (Test the Fort's Acoustics: `send-acoustic-signal` -> `reflected-sound-observed`); `evidence` M (Let Objects Tell Stories: `compare-historical-sources` -> `one-object-limit-evidence`); `care` T (Protect the Story in the Walls: `apply-monument-care-rule` -> `heritage-transfer-evidence`).          |
| Cotton farming      | `visit` (Visit the Cotton Field: `enter-cotton-field` -> `plant-fibre-origin-observed`); `soil` (Prepare Black Soil: `prepare-black-soil` -> `prepared-soil-observed`); `sow` (Sow Cotton Seeds: `sow-spaced-seeds` -> `row-spacing-observed`); `water` (Give Water and Warmth: `water-cotton-rows` -> `seedlings-observed`); `flowers` (Watch Flowers Form Bolls: `grow-cotton-bolls` -> `flower-to-boll-observed`); `mature` M (Let the Bolls Mature: `open-ripe-bolls` -> `fibre-around-seed-evidence`); `pick` T (Pick the Cotton: `apply-field-to-gin-rule` -> `cotton-farming-transfer-evidence`).                                                                                                                                                                                     |
| Cotton ginning      | `mission` (The Ginning Mission: `begin-ginning-investigation` -> `seeded-cotton-observed`); `inspect` (Inspect Picked Cotton: `inspect-fibre-and-seeds` -> `clinging-fibre-observed`); `load` (Load the Cotton Gin: `load-cotton-gin` -> `even-feed-observed`); `rollers` M (Turn the Rollers: `turn-gin-handle` -> `roller-gap-evidence`); `outputs` (Collect Both Outputs: `collect-ginning-outputs` -> `two-outputs-observed`); `confirm` T (Confirm the Process: `apply-ginning-rule` -> `ginning-transfer-evidence`).                                                                                                                                                                                                                                                                   |

## File Map

### Content and tests

- Create `packages/simulation-content/src/implemented/guided/builders.ts`: local authoring helpers that derive runtime stages, captions, assessments, modules, and asset manifests without duplicating foundation contracts.
- Create one definition file per canonical slug under `packages/simulation-content/src/implemented/guided/` and `index.ts` exporting `GUIDED_SIMULATION_DEFINITIONS` plus `GUIDED_IMPLEMENTED_SIMULATIONS`.
- Modify `packages/simulation-content/src/curriculum.ts`: add the seven missing chapter nodes, 17 concepts, and course links; extend the existing Class 5 water chapter.
- Modify `packages/simulation-content/src/implemented/registry.ts`: append `GUIDED_IMPLEMENTED_SIMULATIONS` to the canonical registry.
- Modify `packages/simulation-content/src/index.ts`: export the guided public content.
- Create `tests/unit/guided-definition-builders.test.ts`, five family definition tests, and `tests/unit/guided-simulation-registry.test.ts`.

### Assets

- Create `apps/web/public/simulations/<canonical-slug>/environment.webp` for all 17 slugs.
- Move the eight committed Ancient Fort clips and eight committed Rock Climbing clips into their canonical `narration/<stage-id>.mp3` directories.
- Create `tests/unit/guided-asset-manifests.test.ts`.

### Scene composition

- Create `apps/web/lib/simulations/guided/createGuidedSceneAdapter.ts` and `sceneWorld.ts` for host-bound evidence timing and testable scene-world ownership.
- Create one `<canonical-slug>.scene.ts` adapter under `apps/web/lib/simulations/guided/` for every canonical slug.
- Create `tests/unit/guided-scene-adapter.test.ts` plus one behavioral scene test per migration family.

### Viewer and routes

- Create `apps/web/lib/simulations/guided/createGuidedSimulationController.ts`.
- Create `apps/web/components/simulations/shared/GuidedSimulationViewer.tsx`.
- Create `apps/web/lib/simulations/viewerRegistry.ts`.
- Create `tests/unit/guided-simulation-controller.test.ts` and `tests/unit/guided-viewer-registry.test.ts`.
- Create 17 dedicated canonical `apps/web/app/simulations/<canonical-slug>/page.tsx` files.
- Create 17 dedicated legacy `apps/web/app/simulations/<legacy-slug>/page.tsx` redirect files.
- Create `tests/e2e/guided-simulation-routes.spec.ts`.

### Generated consumers

- Modify `scripts/generate-web-catalog.mjs` only if the foundation registry migration has not already replaced `SIMULATION_MODULES`; it must consume `IMPLEMENTED_SIMULATIONS`.
- Regenerate `apps/web/lib/scienceCatalog.generated.ts` and `apps/web/lib/curriculumSearch.generated.ts` through the existing generator; never hand-edit them.

### Files explicitly not carried forward

Do not retain any of the 17 PR viewer components or their `questVrControls.ts`, `narrationAudio.ts`, `realisticEnvironment.ts`, inline launch UI, direct `OrbitControls`, `WebGLRenderer`, `setAnimationLoop`, or generic Previous/Next implementation. The useful lesson text, scene geometry, scene behavior, panoramas, and the 16 committed narration clips move into the architecture above.

## Authoring Helper Contract

Implement this exact local shape in `packages/simulation-content/src/implemented/guided/builders.ts`; it keeps per-class content explicit while deriving repetitive IDs and invariant release data:

```ts
import type {
  AssessmentSequence,
  AssetManifest,
  GuidedSimulationDefinition,
  NarrationCueDefinition,
  SimulationModuleRecord,
  SimulationNarrationManifest,
} from "@xr-school/simulation-schema";

export interface GuidedStageAuthoring {
  id: string;
  title: string;
  cue: string;
  detail: string;
  actionId: string;
  actionLabel: string;
  evidenceId: string;
  evidenceMode: "scene" | "answer";
  narrationText: string;
  audioUrl?: string;
  scaleNote?: string;
  misconceptionId?: string;
  transferPromptId?: string;
}

export function createGuidedLesson(input: {
  id: string;
  moduleId: string;
  viewerKey: string;
  classContext: string;
  gradeTone: GuidedSimulationDefinition["gradeTone"];
  objective: string;
  stages: GuidedStageAuthoring[];
  completion: GuidedSimulationDefinition["completion"];
}): {
  guidance: GuidedSimulationDefinition;
  narration: SimulationNarrationManifest;
} {
  const stages = input.stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    cue: stage.cue,
    detail: stage.detail,
    actionLabel: stage.actionLabel,
    requiredActionIds: [stage.actionId],
    completionEvidenceIds: [stage.evidenceId],
    narrationId: `${input.id}:${stage.id}`,
    sceneCueId: `scene:${stage.id}`,
    evidenceMode: stage.evidenceMode,
    scaleNote: stage.scaleNote,
    misconceptionId: stage.misconceptionId,
    transferPromptId: stage.transferPromptId,
  }));
  const cues: NarrationCueDefinition[] = input.stages.map((stage, index) => ({
    id: stages[index].narrationId,
    stageId: stage.id,
    text: stage.narrationText,
    caption: stage.narrationText,
    audioUrl: stage.audioUrl,
  }));
  return {
    guidance: {
      id: input.id,
      moduleId: input.moduleId,
      viewerKey: input.viewerKey,
      classContext: input.classContext,
      gradeTone: input.gradeTone,
      objective: input.objective,
      stages,
      completion: input.completion,
    },
    narration: { id: `narration:${input.id}`, cues, fallback: "browserTts" },
  };
}
```

Add `createGuidedAssessment` with two explicitly authored prompts per class—one misconception and one transfer—and this mastery rule:

```ts
masteryRule: {
  requiredEvidenceCount: 2,
  requiredKinds: ['misconception', 'transfer'],
  allowHintedMastery: true,
}
```

The helper assigns the accepted evidence ID as the correct option ID and `<accepted-id>:distractor` as the incorrect option ID. Add `createGuidedModuleRecord` to set only these invariants: CBSE board, `status: 'released'`, `releaseMaturity: 'internalQA'`, `evidenceConfidenceLevel: 'experimental'`, `targetFrameRateFps: 72`, `minQuestStorageGb: 1`, and `stages: guidance.stages.length`. Require every other `SimulationModuleRecord` field—including grade band, subjects, curriculum IDs, science explanation, misconceptions, comfort, safety, duration, instructor script, batch prompt, and package size—from each definition file.

Use this record assembly in every definition file:

```ts
const { guidance, narration } = createGuidedLesson(authoring);

export const FOOD_SPOILAGE_GUIDANCE = guidance;
export const FOOD_SPOILAGE_SIMULATION = defineGuidedImplementedSimulation({
  module: createGuidedModuleRecord(moduleInput, guidance),
  guidance,
  assessment: createGuidedAssessment(assessmentInput),
  narration,
  assets: createGuidedAssetManifest(assetInput),
  legacyPaths: ["/simulations/mangoes-round-the-year-food-spoilage"],
  contribution: {
    source: "pr-8",
    contributor: "Aditya K. R. Pandey",
    sourcePath: "apps/web/components/simulations/FoodSpoilageViewer.tsx",
  },
});
```

`defineGuidedImplementedSimulation` must be the foundation builder that calls `toExperienceDefinition(guidance)` and returns the exact `ImplementedSimulationDefinition`; do not author a second `experience` object.

## Module and Assessment Matrix

Every module uses `publicationStatus/status: released`, `evidenceMaturity/releaseMaturity: internalQA`, experimental evidence confidence, CBSE board, 72 FPS target, and explicit `deviceVerified: false` / `classroomVerified: false` if those foundation fields exist. The missing panorama author/license provenance is recorded as `unverified-contributor-supplied`; it must never be upgraded by inference.

| Slug                                              | Title; class/subject; format; duration/max; comfort; concept                                                                         | Learning objective and required safety boundary                                                                                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `c5-ch04-a01-food-spoilage`                       | Food Spoilage; Class 5/environmentalScience; interactive3d; 8/10 min; low; `concept-food-spoilage`                                   | Compare equal mango samples under four storage conditions and explain observed spoilage rates. Never taste investigation samples or smell mould closely; preservation slows spoilage and never makes spoiled food safe.                       |
| `c5-ch04-a02-milk-spoilage`                       | Milk Spoilage; Class 5/environmentalScience; interactive3d; 8/10; low; `concept-milk-spoilage`                                       | Compare equal milk samples over 24 hours and connect souring, curds, whey, and gas to microbial activity and storage. Never taste a spoilage sample; accidental spoilage is not controlled curd-making.                                       |
| `c5-ch04-a03-the-making-of-aam-papad`             | The Making of Aam Papad; Class 5/environmentalScience; interactive3d; 8/10; low; `concept-sun-drying-preservation`                   | Sequence hygienic mango preparation, thin-layer spreading, repeated drying, and dry storage, explaining moisture removal. Food preparation requires clean hands, fruit, utensils, protected drying, and a clean dry container.                |
| `c5-ch05-a01-pitcher-plant-the-insect-hunter`     | Pitcher Plant — The Insect Hunter; Class 5/environmentalScience; virtualFieldVisit; 9/11; low; `concept-carnivorous-plant-nutrition` | Explain the pitcher as a modified leaf that supplies minerals while green tissue still makes sugar by photosynthesis. Do not touch or feed real protected plants or handle trapped insects.                                                   |
| `c5-ch05-a02-seed-dispersal`                      | Seed Dispersal; Class 5/environmentalScience; interactive3d; 8/10; low; `concept-seed-dispersal`                                     | Match wind, water, animal, and explosive dispersal to observable seed adaptations and reduced competition. The explosive-pod effect is a visual model; do not place real seeds or pods near eyes.                                             |
| `c5-ch06-a01-the-storage-of-rainwater`            | The Storage of Rainwater; Class 5/environmentalScience; interactive3d; 8/10; low; `concept-rainwater-harvesting`                     | Trace rain through catchment, gutter, first flush, filter, covered storage, and careful reuse. Filtered rainwater is not automatically drinkable; drinking requires appropriate treatment and testing.                                        |
| `c5-ch06-a02-a-step-well-structure`               | A Step Well Structure; Class 5/environmentalScience; interactive3d; 8/10; low; `concept-stepwell-water-storage`                      | Explain how steps, landings, shade, catchment, groundwater, and reservoir maintain access at changing water levels. The simulation is stationary; real stepwells require barriers, site rules, and adult supervision.                         |
| `c5-ch07-a02-dead-sea-salt-water-and-its-effects` | Dead Sea: Salt Water and Its Effects; Class 5/environmentalScience; interactive3d; 8/10; low; `concept-density-and-buoyancy`         | Use fresh/salt-water egg evidence to explain how dissolved salt raises density and buoyant support without making the object lighter. Do not drink concentrated salt water or expose eyes/open cuts; ordinary water-safety rules still apply. |
| `c5-ch08-a01-diagnosis-of-malaria`                | Diagnosis of Malaria; Class 5/environmentalScience; guidedVisualization; 8/10; low; `concept-malaria-diagnosis`                      | Distinguish symptoms and exposure clues from confirmation by microscopy or a valid RDT and route results to professional care. Learners never collect/handle blood, self-diagnose, or self-medicate.                                          |
| `c5-ch08-a02-life-cycle-of-the-mosquito`          | Life Cycle of the Mosquito; Class 5/environmentalScience; guidedVisualization; 8/10; low; `concept-mosquito-life-cycle`              | Sequence Anopheles egg, larva, pupa, and adult stages and choose safe household prevention. Mosquito-control products and large habitats are handled only by trained adults/community teams.                                                  |
| `c5-ch09-a01-river-crossing-adventure`            | River Crossing Adventure; Class 5/environmentalScience; interactive3d; 8/10; medium; `concept-protected-river-crossing`              | Connect checked anchors, harness, sling, rope technique, calm slip recovery, and teamwork in a supervised model. This is not real crossing instruction; qualified supervision and approved equipment are mandatory.                           |
| `c5-ch09-a02-rock-climbing`                       | Rock Climbing; Class 5/environmentalScience; interactive3d; 8/10; medium; `concept-protected-rock-climbing`                          | Connect route observation, checked equipment, three-point movement, slip protection, posture, and rappelling. This is not real climbing instruction; qualified supervision and approved equipment are mandatory.                              |
| `c5-ch09-a03-camp-in-the-snow`                    | Camp in the Snow; Class 5/environmentalScience; virtualFieldVisit; 9/11; medium; `concept-cold-weather-camping`                      | Explain tent/sleeping-bag insulation, anchoring, drainage, supervised cooking, waste removal, and careful snow travel. A trained leader chooses the site and weather window; only trained adults manage fire away from tents.                 |
| `c5-ch09-a04-snow-mountain-climbing`              | Snow Mountain Climbing; Class 5/environmentalScience; virtualFieldVisit; 9/11; medium; `concept-snow-mountain-safety`                | Explain route, equipment, group pacing, stick-step balance, supervised rope practice, recovery, and turnaround decisions. Never leave the marked route, climb alone, or treat the simulation as mountaineering training.                      |
| `c5-ch10-a01-a-visit-of-ancient-fort`             | A Visit of an Ancient Fort; Class 5/environmentalScience; virtualFieldVisit; 9/11; low; `concept-historical-evidence`                | Use Golconda architecture, water, acoustics, maps, and artefacts as limited historical evidence, then apply monument care. Stay on paths; do not touch, scratch, climb, remove material, or leave waste.                                      |
| `c6-ch03-a01-cotton-farming`                      | Cotton Farming; Class 6/environmentalScience; interactive3d; 10/12; low; `concept-cotton-farming`                                    | Sequence black-soil preparation, sowing, watering, flowering, boll maturation, and harvest, identifying cotton as plant fibre. The field is a visual model; agricultural tools and chemicals require trained adult handling.                  |
| `c6-ch03-a02-the-process-of-cotton-ginning`       | The Process of Cotton Ginning; Class 6/science; guidedVisualization; 10/12; low; `concept-cotton-ginning`                            | Explain how a narrow roller gap separates soft fibre from larger cotton seeds and prepares fibre for spinning. The machine is a visual model; keep hands away from real rollers and use guarded equipment only with trained adults.           |

Use the catalog package-size targets exactly: 150 MB for food spoilage, milk spoilage, aam papad, seed dispersal, rainwater, stepwell, Dead Sea, river crossing, and rock climbing; 225 MB for pitcher plant, camp, snow mountain, and ancient fort; 120 MB for malaria diagnosis; 126 MB for mosquito life cycle; 250 MB for cotton farming; 210 MB for cotton ginning.

Each definition has these two exact assessment intents. Author two options per prompt, with the correct label shown first here only for readability; runtime option order may remain authored but must not be exposed through a `data-correct` DOM attribute.

| Simulation     | Misconception prompt: correct / distractor                                                                                                                                                                                           | Transfer prompt: correct / distractor                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Food spoilage  | “What does the Day 5 comparison show?” — “Cold, covering, and salt slowed change; none made spoiled mango fresh again.” / “Salt and cold reversed spoilage.”                                                                         | “How should cut fruit be kept for later?” — “Clean, covered, and cold, then discarded if spoilage appears.” / “Left warm and uncovered, then washed after mould appears.”                      |
| Milk spoilage  | “Why did the samples change at different rates?” — “Warmth and exposure sped microbial change; boiling, covering, and cold slowed it.” / “Refrigeration removed every microorganism forever.”                                        | “How is safe curd-making different?” — “It starts with safe milk and a clean starter; accidentally spoiled milk is discarded.” / “Any sour spoiled milk can be used as starter.”               |
| Aam papad      | “Why are thin repeated layers used?” — “More surface is exposed so moisture leaves evenly before the next layer.” / “Sugar instantly removes all water and microorganisms.”                                                          | “What must happen before storage?” — “The sheet must be sufficiently dry, then cut and placed in a clean dry container.” / “A wet thick layer can be sealed immediately.”                      |
| Pitcher plant  | “What does the insect supply?” — “Mineral nutrients such as nitrogen; sunlight still supplies energy for sugar-making.” / “The insect replaces photosynthesis as the plant’s energy source.”                                         | “What would still happen without an insect today?” — “Green leaves would still photosynthesise, though mineral supply may be limited.” / “The plant would stop using sunlight.”                |
| Seed dispersal | “Why can an eaten fruit disperse a seed?” — “A hard seed may be dropped or pass through the animal to a new place.” / “The seed decides where the animal walks.”                                                                     | “Which adaptation suits wind?” — “A light seed with hairs or wings.” / “A heavy fruit with no air spaces.”                                                                                     |
| Rainwater      | “Does gravel-and-sand filtration make roof runoff drinkable?” — “No; drinking still needs suitable treatment and testing.” / “Yes; visible dirt is the only risk.”                                                                   | “Choose the safe reuse path.” — “Roof, gutter, first flush, filter, covered tank, then suitable non-drinking reuse.” / “Roof directly to an open drinking bucket.”                             |
| Stepwell       | “Why does the water level change?” — “Rainfall, use, and groundwater conditions change it; lower steps preserve access.” / “The stairs move the reservoir up and down.”                                                              | “What helps in a dry period?” — “Protected catchment, careful use, and lower-step access to remaining water.” / “Adding waste to mark the water line.”                                         |
| Dead Sea       | “Why does the egg float higher?” — “Dissolved salt raises water density and buoyant support; the egg is not lighter.” / “Salt removes some of the egg’s weight.”                                                                     | “What happens in another denser safe liquid?” — “The same object receives greater buoyant support for the displaced volume.” / “Gravity stops acting on the object.”                           |
| Malaria        | “Can fever and chills confirm malaria?” — “No; confirmation needs parasite-based testing by trained health workers.” / “Yes; symptoms alone are enough.”                                                                             | “What follows persistent symptoms after a negative test?” — “Return for professional evaluation of malaria and other possible illness.” / “Self-medicate and avoid further care.”              |
| Mosquito       | “Which adult mosquitoes bite and spread malaria?” — “Only females bite; a female spreads malaria only after Plasmodium infection, while both sexes use plant sugars.” / “Every male and female mosquito carries malaria from birth.” | “Which household action interrupts breeding?” — “Empty and scrub containers, cover stored water, and use nets/screens.” / “Add unapproved pesticide to every water body.”                      |
| River crossing | “What does courage mean in this crossing?” — “Prepare, stay clipped, move calmly, and follow the trained instructor.” / “Ignore the current and move without protection.”                                                            | “May this setup be copied at a real river?” — “No; real crossings require qualified experts, approved equipment, and site assessment.” / “Yes; a rope alone makes any river safe.”             |
| Rock climbing  | “What stops the controlled slip?” — “The checked harness, sling, rope, anchor, and trained belayer work as a system.” / “The helmet alone holds the climber.”                                                                        | “May this route be attempted after the simulation?” — “No; real climbing requires qualified supervision and approved equipment.” / “Yes; remembering the button sequence is enough.”           |
| Camp in snow   | “Why do two tent layers and feathers help?” — “They trap still air that slows heat transfer.” / “They create heat without reducing heat loss.”                                                                                       | “Which campsite decision is responsible?” — “A trained leader selects level ground, safe weather, drainage, and distance from hazards.” / “Pitch beside a steep slope because it blocks wind.” |
| Snow mountain  | “What does a fixed rope mean?” — “It is one instructor-checked part of protected practice, not permission to climb alone.” / “It guarantees safety on any mountain.”                                                                 | “When should the group turn back?” — “Before visibility, weather, time, or energy become unsafe, even after reaching a high point.” / “Only after the last learner is exhausted.”              |
| Ancient fort   | “Can one broken pot explain all daily life?” — “No; historians compare objects, buildings, maps, paintings, and records.” / “Yes; one artefact proves every detail.”                                                                 | “How should a visitor respond to damage?” — “Avoid touching it, keep the site clean, and report it to a responsible adult/site worker.” / “Scratch a note beside it so others notice.”         |
| Cotton farming | “Where are cotton fibre and seeds before harvest?” — “They develop together inside the boll; ripe bolls open to reveal fibre around seeds.” / “Cotton fibre is made from flower petals after picking.”                               | “What happens after clean dry cotton is picked?” — “Ginning separates fibre from seeds before spinning.” / “It becomes fabric without separation or yarn.”                                     |
| Cotton ginning | “How do the rollers separate cotton?” — “Soft fibres pass through the narrow gap while larger seeds are held back.” / “The rollers dissolve the seeds.”                                                                              | “What is the clean fibre ready for?” — “Spinning into yarn, then making fabric.” / “Planting as cotton seed.”                                                                                  |

For each prompt, write a specific hint and explanation using the correct statement above; do not use “Try again” or “Read the text” as the hint.

## Task 1: Lock the 17-class inventory and builder behavior in RED tests

**Files:**

- Create: `tests/unit/guided-definition-builders.test.ts`
- Create: `tests/unit/guided-simulation-registry.test.ts`
- Test: `tests/unit/guided-definition-builders.test.ts`
- Test: `tests/unit/guided-simulation-registry.test.ts`

- [ ] **Step 1: Write the builder contract test**

Use a two-stage fixture and assert derived IDs, caption equality, answer-mode metadata, the exact two-kind mastery rule, and module invariants. The core assertions must be:

```ts
expect(guidance.stages[0]).toMatchObject({
  requiredActionIds: ["inspect-example"],
  completionEvidenceIds: ["example-observed"],
  narrationId: "guided-example:observe",
  sceneCueId: "scene:observe",
  evidenceMode: "scene",
});
expect(narration.cues[0]).toMatchObject({
  id: "guided-example:observe",
  stageId: "observe",
  text: "Observe the example.",
  caption: "Observe the example.",
});
expect(assessment.masteryRule).toEqual({
  requiredEvidenceCount: 2,
  requiredKinds: ["misconception", "transfer"],
  allowHintedMastery: true,
});
expect(module).toMatchObject({
  status: "released",
  releaseMaturity: "internalQA",
  evidenceConfidenceLevel: "experimental",
  targetFrameRateFps: 72,
  minQuestStorageGb: 1,
  stages: 2,
});
```

- [ ] **Step 2: Write the exact inventory test**

Create an `EXPECTED_GUIDED` constant from the Canonical Inventory table and assert:

```ts
expect(GUIDED_SIMULATION_DEFINITIONS).toHaveLength(17);
expect(GUIDED_IMPLEMENTED_SIMULATIONS).toHaveLength(17);
expect(
  GUIDED_SIMULATION_DEFINITIONS.flatMap((item) => item.stages),
).toHaveLength(124);

for (const expected of EXPECTED_GUIDED) {
  const record = GUIDED_IMPLEMENTED_SIMULATIONS.find(
    (item) => item.module.slug === expected.slug,
  );
  expect(record).toMatchObject({
    kind: "guided",
    legacyPaths: [expected.legacyPath],
    contribution: { source: "pr-8" },
  });
  expect(record?.module.id).toBe(expected.moduleId);
  expect(record?.module.status).toBe("released");
  expect(record?.module.releaseMaturity).toBe("internalQA");
  expect(record?.experience.stages).toHaveLength(expected.stageCount);
}
```

Also assert unique module IDs, slugs, viewer keys, stage IDs within a definition, narration IDs, legacy paths, canonical paths, and asset IDs. For every stage assert one required action, one completion evidence ID, a non-empty cue/detail/action label, and a narration cue whose caption equals its text. For every record assert at least one `scene` evidence stage, one misconception answer stage, and one transfer answer stage.

- [ ] **Step 3: Run both tests and verify RED**

Run:

```bash
npx vitest run tests/unit/guided-definition-builders.test.ts tests/unit/guided-simulation-registry.test.ts
```

Expected: FAIL because the guided helpers, definitions, and exports do not exist yet.

## Task 2: Implement the authoring helpers and food-preservation definitions

**Files:**

- Create: `packages/simulation-content/src/implemented/guided/builders.ts`
- Create: `packages/simulation-content/src/implemented/guided/food-spoilage.ts`
- Create: `packages/simulation-content/src/implemented/guided/milk-spoilage.ts`
- Create: `packages/simulation-content/src/implemented/guided/aam-papad.ts`
- Create: `packages/simulation-content/src/implemented/guided/index.ts`
- Create: `tests/unit/guided-food-definitions.test.ts`
- Modify: `packages/simulation-content/src/curriculum.ts`

- [ ] **Step 1: Write the failing food-family behavior test**

Import the three records and use `createLessonSession(record.experience)` plus `createAssessmentSession(record.assessment)`. Assert stage counts `[6, 6, 7]`, exact titles from the matrix, the four food-spoilage condition ranks `[1, 0.72, 0.25, 0.16]`, the milk condition ranks `[1, 0.55, 0.16]` as authored scene metadata, and the Aam Papad “about four weeks” caption. For each definition, assert `next()` throws before action/evidence, the required action alone does not complete an answer stage, an incorrect option returns a hint, the accepted option records the stage evidence, and restart clears all lesson/assessment evidence.

- [ ] **Step 2: Run the food-family test and verify RED**

Run:

```bash
npx vitest run tests/unit/guided-food-definitions.test.ts
```

Expected: FAIL because the three definitions do not exist.

- [ ] **Step 3: Implement the helper contract and the three records**

Implement `builders.ts` exactly as specified under Authoring Helper Contract. In each record, copy `STAGES[index].cue`, `STAGES[index].detail`, and `NARRATIONS[index]` from the immutable PR viewer and apply the exact stage IDs/actions/evidence from the Stage and Evidence Matrix. Use these curriculum IDs:

```ts
["cm-cbse-c5-ch04-food-spoilage"] /
  ["concept-food-spoilage"]["cm-cbse-c5-ch04-milk-spoilage"] /
  ["concept-milk-spoilage"]["cm-cbse-c5-ch04-aam-papad"] /
  ["concept-sun-drying-preservation"];
```

Set completion headlines to `Food-storage investigator`, `Milk-storage investigator`, and `Aam papad process guide`; completion bodies must summarize the observation, misconception resolution, and transfer rule rather than claim mastery or classroom validation.

- [ ] **Step 4: Add the Class 5 Chapter 4 curriculum graph**

Add concepts `concept-food-spoilage`, `concept-milk-spoilage`, and `concept-sun-drying-preservation`, plus `chapter-cbse-c5-mangoes-round-year` with all three module IDs. Append the chapter, concepts, and simulations to `course-cbse-c5-environmental-science`. Give each concept a concrete description, aliases, the misconception from the assessment matrix, practical relevance, and at least four search keywords.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
npx vitest run tests/unit/guided-definition-builders.test.ts tests/unit/guided-food-definitions.test.ts tests/unit/curriculum-content.test.ts
```

Expected: PASS. The aggregate 17-record test remains intentionally red.

```bash
git add packages/simulation-content/src/implemented/guided packages/simulation-content/src/curriculum.ts tests/unit/guided-definition-builders.test.ts tests/unit/guided-food-definitions.test.ts
git commit -m "feat: define guided food preservation classes"
```

## Task 3: Add plant and fibre definitions

**Files:**

- Create: `packages/simulation-content/src/implemented/guided/pitcher-plant.ts`
- Create: `packages/simulation-content/src/implemented/guided/seed-dispersal.ts`
- Create: `packages/simulation-content/src/implemented/guided/cotton-farming.ts`
- Create: `packages/simulation-content/src/implemented/guided/cotton-ginning.ts`
- Create: `tests/unit/guided-plant-fibre-definitions.test.ts`
- Modify: `packages/simulation-content/src/implemented/guided/index.ts`
- Modify: `packages/simulation-content/src/curriculum.ts`

- [ ] **Step 1: Write failing tests for the four definitions**

Assert stage counts `[7, 7, 7, 6]`, exact canonical/legacy/viewer identities, complete caption coverage, the Pitcher Plant mineral-versus-energy assessment, all four dispersal modes, Cotton Farming’s boll-before-ginning sequence, and Cotton Ginning’s fibre/seed output. Run every definition through `validateGuidedSimulationDefinition`, `createLessonSession`, and `createAssessmentSession`; assert wrong-stage actions and direct `next()` calls are rejected.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/guided-plant-fibre-definitions.test.ts
```

Expected: FAIL on missing definition imports.

- [ ] **Step 3: Implement all four records from the normative matrices**

Use the immutable PR sources and exact stage rows. Use these curriculum/concept pairs:

```ts
["cm-cbse-c5-ch05-pitcher-plant"] /
  ["concept-carnivorous-plant-nutrition"]["cm-cbse-c5-ch05-seed-dispersal"] /
  ["concept-seed-dispersal"]["cm-cbse-c6-ch03-cotton-farming"] /
  ["concept-cotton-farming"]["cm-cbse-c6-ch03-cotton-ginning"] /
  ["concept-cotton-ginning"];
```

Use completion headlines `Pitcher plant investigator`, `Seed journey investigator`, `Cotton field investigator`, and `Cotton ginning investigator`.

- [ ] **Step 4: Extend the curriculum graph**

Add `chapter-cbse-c5-seeds-and-seeds` with both Class 5 definitions and `chapter-cbse-c6-fibre-to-fabric` with both Class 6 definitions. Add the four concepts from the module matrix, then update both owning courses with exact chapter, concept, and simulation IDs.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
npx vitest run tests/unit/guided-plant-fibre-definitions.test.ts tests/unit/curriculum-content.test.ts tests/unit/simulation-modules.test.ts
```

Expected: PASS.

```bash
git add packages/simulation-content/src/implemented/guided packages/simulation-content/src/curriculum.ts tests/unit/guided-plant-fibre-definitions.test.ts
git commit -m "feat: define guided plant and fibre classes"
```

## Task 4: Add water and heritage definitions

**Files:**

- Create: `packages/simulation-content/src/implemented/guided/rainwater-storage.ts`
- Create: `packages/simulation-content/src/implemented/guided/stepwell-structure.ts`
- Create: `packages/simulation-content/src/implemented/guided/dead-sea-salt-water.ts`
- Create: `packages/simulation-content/src/implemented/guided/ancient-fort.ts`
- Create: `tests/unit/guided-water-heritage-definitions.test.ts`
- Modify: `packages/simulation-content/src/implemented/guided/index.ts`
- Modify: `packages/simulation-content/src/curriculum.ts`

- [ ] **Step 1: Write the failing definition tests**

Assert stage counts `[7, 7, 8, 8]`; verify first flush precedes filtration and covered storage, stepwell levels depend on rain/use/groundwater, Dead Sea captions say salt changes water density rather than object weight, and Ancient Fort captions distinguish evidence from imagination and require monument care. Exercise both answer stages and every scene stage through the runtime.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/guided-water-heritage-definitions.test.ts
```

Expected: FAIL on missing definitions.

- [ ] **Step 3: Implement the four records**

Use exact PR strings and these curriculum/concept pairs:

```ts
["cm-cbse-c5-ch06-rainwater-storage"] /
  ["concept-rainwater-harvesting"]["cm-cbse-c5-ch06-stepwell"] /
  ["concept-stepwell-water-storage"]["cm-cbse-c5-ch07-dead-sea"] /
  ["concept-density-and-buoyancy"]["cm-cbse-c5-ch10-ancient-fort"] /
  ["concept-historical-evidence"];
```

Use completion headlines `Rainwater system investigator`, `Stepwell structure investigator`, `Density and buoyancy investigator`, and `Fort evidence investigator`.

- [ ] **Step 4: Extend the curriculum graph**

Add `chapter-cbse-c5-every-drop-counts` and `chapter-cbse-c5-walls-tell-stories`. Extend the existing `chapter-cbse-c5-water-experiments` with the Dead Sea concept/module without removing Solubility. Add all four concept records and update the Class 5 course.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
npx vitest run tests/unit/guided-water-heritage-definitions.test.ts tests/unit/curriculum-content.test.ts tests/unit/solubility-experience.test.ts
```

Expected: PASS, including the Solubility regression.

```bash
git add packages/simulation-content/src/implemented/guided packages/simulation-content/src/curriculum.ts tests/unit/guided-water-heritage-definitions.test.ts
git commit -m "feat: define guided water and heritage classes"
```

## Task 5: Add mosquito and malaria definitions

**Files:**

- Create: `packages/simulation-content/src/implemented/guided/malaria-diagnosis.ts`
- Create: `packages/simulation-content/src/implemented/guided/mosquito-life-cycle.ts`
- Create: `tests/unit/guided-health-definitions.test.ts`
- Modify: `packages/simulation-content/src/implemented/guided/index.ts`
- Modify: `packages/simulation-content/src/curriculum.ts`

- [ ] **Step 1: Write failing medical/science behavior tests**

Assert eight stages each; symptoms never complete diagnosis evidence; thick and thin films have distinct purposes; the parasite scan requires all three reveals; RDT validity requires its control line; mosquito stages are egg → larva → pupa → adult; only infected females can transmit malaria; prevention advice stays within household/community safety boundaries.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/guided-health-definitions.test.ts
```

Expected: FAIL on missing definitions.

- [ ] **Step 3: Implement both records and curriculum links**

Use `cm-cbse-c5-ch08-malaria-diagnosis` / `concept-malaria-diagnosis` and `cm-cbse-c5-ch08-mosquito-life-cycle` / `concept-mosquito-life-cycle`. Add `chapter-cbse-c5-treat-for-mosquitoes`, both concept records, and Class 5 course links. Use completion headlines `Malaria evidence investigator` and `Mosquito life-cycle investigator`.

- [ ] **Step 4: Run focused tests and commit**

Run:

```bash
npx vitest run tests/unit/guided-health-definitions.test.ts tests/unit/curriculum-content.test.ts
```

Expected: PASS.

```bash
git add packages/simulation-content/src/implemented/guided packages/simulation-content/src/curriculum.ts tests/unit/guided-health-definitions.test.ts
git commit -m "feat: define guided mosquito and malaria classes"
```

## Task 6: Add the four supervised adventure definitions

**Files:**

- Create: `packages/simulation-content/src/implemented/guided/river-crossing.ts`
- Create: `packages/simulation-content/src/implemented/guided/rock-climbing.ts`
- Create: `packages/simulation-content/src/implemented/guided/camp-in-snow.ts`
- Create: `packages/simulation-content/src/implemented/guided/snow-mountain-climbing.ts`
- Create: `tests/unit/guided-adventure-definitions.test.ts`
- Modify: `packages/simulation-content/src/implemented/guided/index.ts`
- Modify: `packages/simulation-content/src/curriculum.ts`

- [ ] **Step 1: Write failing safety and progression tests**

Assert eight stages each, exact medium comfort for all four hazardous/height classes, explicit simulation-not-training language, supervised equipment and anchors, evidence-gated slip recovery, no controller action that jumps to success, and transfer answers that reject copying the simulated setup in real life.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/guided-adventure-definitions.test.ts
```

Expected: FAIL on missing definitions.

- [ ] **Step 3: Implement the four records**

Use these exact curriculum/concept pairs:

```ts
["cm-cbse-c5-ch09-river-crossing"] /
  ["concept-protected-river-crossing"]["cm-cbse-c5-ch09-rock-climbing"] /
  ["concept-protected-rock-climbing"]["cm-cbse-c5-ch09-camp-in-snow"] /
  ["concept-cold-weather-camping"]["cm-cbse-c5-ch09-snow-mountain"] /
  ["concept-snow-mountain-safety"];
```

Use completion headlines `Protected crossing investigator`, `Protected climbing investigator`, `Cold-weather camp investigator`, and `Snow-mountain decision investigator`.

- [ ] **Step 4: Add the Up You Go curriculum graph**

Add `chapter-cbse-c5-up-you-go`, the four concept records, and exact Class 5 course links. The chapter contains all four module IDs in activity-number order.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
npx vitest run tests/unit/guided-adventure-definitions.test.ts tests/unit/curriculum-content.test.ts
```

Expected: PASS.

```bash
git add packages/simulation-content/src/implemented/guided packages/simulation-content/src/curriculum.ts tests/unit/guided-adventure-definitions.test.ts
git commit -m "feat: define guided adventure classes"
```

## Task 7: Register the complete guided inventory and generated consumers

**Files:**

- Modify: `packages/simulation-content/src/implemented/registry.ts`
- Modify: `packages/simulation-content/src/index.ts`
- Modify: `scripts/generate-web-catalog.mjs`
- Modify (generated): `apps/web/lib/scienceCatalog.generated.ts`
- Modify (generated): `apps/web/lib/curriculumSearch.generated.ts`
- Test: `tests/unit/guided-simulation-registry.test.ts`
- Test: `tests/unit/simulation-modules.test.ts`
- Test: `tests/unit/curriculum-search.test.ts`

- [ ] **Step 1: Run the aggregate inventory test and verify it is still RED**

Run:

```bash
npx vitest run tests/unit/guided-simulation-registry.test.ts
```

Expected: FAIL because the family exports are not yet part of the canonical implemented registry.

- [ ] **Step 2: Export and register all 17 records**

In `guided/index.ts`, export family constants plus these ordered arrays:

```ts
export const GUIDED_SIMULATION_DEFINITIONS = [
  FOOD_SPOILAGE_GUIDANCE,
  MILK_SPOILAGE_GUIDANCE,
  AAM_PAPAD_GUIDANCE,
  PITCHER_PLANT_GUIDANCE,
  SEED_DISPERSAL_GUIDANCE,
  RAINWATER_STORAGE_GUIDANCE,
  STEPWELL_STRUCTURE_GUIDANCE,
  DEAD_SEA_SALT_WATER_GUIDANCE,
  MALARIA_DIAGNOSIS_GUIDANCE,
  MOSQUITO_LIFE_CYCLE_GUIDANCE,
  RIVER_CROSSING_GUIDANCE,
  ROCK_CLIMBING_GUIDANCE,
  CAMP_IN_SNOW_GUIDANCE,
  SNOW_MOUNTAIN_CLIMBING_GUIDANCE,
  ANCIENT_FORT_GUIDANCE,
  COTTON_FARMING_GUIDANCE,
  COTTON_GINNING_GUIDANCE,
] as const;
```

Create `GUIDED_IMPLEMENTED_SIMULATIONS` in the same order. Append it to `IMPLEMENTED_SIMULATIONS`; do not add a second alias map. The registry’s canonical/legacy resolution must return the same record for each pair in Canonical Inventory.

- [ ] **Step 3: Point catalog/search generation at the canonical registry**

If not already done by the foundation plan, replace the legacy `SIMULATION_MODULES` input with `IMPLEMENTED_SIMULATIONS.map(record => record.module)`. Generate files using the existing command:

```bash
npm run web-catalog:generate
```

Expected: 497 catalog rows remain, the 17 canonical search documents now link to `/simulations/<canonical-slug>`, and the implemented inventory increases by exactly 17 without duplicating Solubility or any existing class.

- [ ] **Step 4: Run registry, catalog, and curriculum tests**

Run:

```bash
npx vitest run tests/unit/guided-simulation-registry.test.ts tests/unit/simulation-modules.test.ts tests/unit/curriculum-content.test.ts tests/unit/curriculum-search.test.ts tests/unit/web-catalog-generator.test.ts
```

Expected: PASS; the aggregate assertions report 17 guided definitions and 124 guided stages.

- [ ] **Step 5: Commit the canonical content registration**

```bash
git add packages/simulation-content/src packages/simulation-content/src/curriculum.ts scripts/generate-web-catalog.mjs apps/web/lib/scienceCatalog.generated.ts apps/web/lib/curriculumSearch.generated.ts tests/unit/guided-simulation-registry.test.ts
git commit -m "feat: register seventeen guided simulation classes"
```

## Task 8: Migrate, optimize, and verify guided assets

**Files:**

- Create: `apps/web/public/simulations/<each canonical slug>/environment.webp` (17 files)
- Create: `apps/web/public/simulations/c5-ch09-a02-rock-climbing/narration/*.mp3` (8 files)
- Create: `apps/web/public/simulations/c5-ch10-a01-a-visit-of-ancient-fort/narration/*.mp3` (8 files)
- Modify: the 17 guided asset/narration manifests
- Create: `tests/unit/guided-asset-manifests.test.ts`
- Remove after successful migration: the 15 source PNGs under `apps/web/public/environments/` and 16 hash-named files under `apps/web/public/narration/`

- [ ] **Step 1: Write a failing binary/manifest test**

For every canonical record, locate exactly one `environment` asset, read the file, assert RIFF/WEBP signature, decode the lossy `VP8 ` width/height fields, compute SHA-256, and compare all values with the manifest. Assert width `1774`, height `887`, `byteSize <= 400_000`, `compression === 'WebP lossy q75; cwebp 1.6.0 method 6'`, and canonical URL `/simulations/<slug>/environment.webp`.

Also assert:

```ts
expect(asset.source).toContain("PR #8 621dfb61");
expect(asset.author).toBe("unverified-contributor-supplied");
expect(asset.license).toBe("unverified-contributor-supplied");
```

Ancient Fort and Rock Climbing must each have eight cues with existing `audioUrl` files and audio asset entries whose size and SHA match. Every other guided cue must omit `audioUrl`; no manifest may point to a missing clip.

- [ ] **Step 2: Run the asset test and verify RED**

Run:

```bash
npx vitest run tests/unit/guided-asset-manifests.test.ts
```

Expected: FAIL because canonical WebP/audio files do not exist.

- [ ] **Step 3: Convert the 15 source panoramas into 17 canonical assets**

Require `cwebp 1.6.0`, create the 17 canonical directories, and run `cwebp -quiet -q 75 -m 6 <source> -o <destination>`. Use the Canonical Inventory mapping exactly; convert `food-courtyard-360.png` separately into the three Chapter 4 destinations. The expected output baselines are:

| Source                                     | Output bytes | Output SHA-256                                                     |
| ------------------------------------------ | -----------: | ------------------------------------------------------------------ |
| `food-courtyard-360.png`                   |       115440 | `454c952d5cde0e0622566ec9266983e9c22ebf2d02ffc798ca152746528ea154` |
| `pitcher-plant-bog-360.png`                |       381098 | `3cd72e1ae91842651122d2365fa8e03383723a96ca5be60043c616edb16f1d41` |
| `seed-dispersal-habitat-360.png`           |       258276 | `9970bc6c7e1db2f7b3d4c1b4fd9c6e1fc5b9895f8226f56280b8772375cc6930` |
| `rainwater-storage-courtyard-360.png`      |       173402 | `ac19019fbce28b50ecd59829641e02c0d75be2c7ee0120ccea313507eec619b7` |
| `stepwell-courtyard-360.png`               |       138468 | `b2d44490489593bb0c3fabb7de7c6986e011e416331863a8033c08dd54614121` |
| `dead-sea-salt-shore-360.png`              |       143242 | `48a5e0deddbb1f0174eb6a2269457e17199c7dbcdb1a947c5b21db33e0e54c48` |
| `malaria-diagnosis-lab-360.png`            |        53990 | `51ab76076bff52941400f11e1d43d4c613b9b3b0edc7950127921d0161ddbf0b` |
| `mosquito-life-cycle-wetland-360.png`      |       213158 | `a81481b610fb7cb6b4e63f66de572e0c847947e2172e5927747383c9f7dc8142` |
| `up-you-go-river-crossing-360.png`         |       231876 | `9c25f7b271b0444e9ac8e96eaa21ec91cb2fd7bc8a2b34d226bf98683df13edc` |
| `up-you-go-rock-climbing-360.png`          |       178540 | `d85fe8365b21aed71c67ca79aa3030413d196539bba4a0710feb06c2da056421` |
| `up-you-go-camp-in-snow-360.png`           |       109680 | `04201622d5c3145897f7a0f8511c3a02f2e2a68c39feafaa28257201287b937b` |
| `up-you-go-snow-mountain-climbing-360.png` |       153126 | `c650212a1a73002a26847815ef8e1851c9771a2118bc721c9550dc3b43ac3b69` |
| `walls-tell-stories-ancient-fort-360.png`  |       156696 | `8314c25564d8bff0277af1259b839281730ed0741766e14c33f8b08f0df86a7f` |
| `cotton-field-360.png`                     |       154134 | `c9744cdbf040de1ec8adb09ee31273fa9a4cf292325531b2eef7df523c96c47f` |
| `cotton-ginning-workshop-360.png`          |       139610 | `272ff258259f548525761ab3c51e02a85da5b45d576a2ad993ade1b6bedaca4c` |

The three food outputs intentionally share the same hash and must each have a manifest entry whose `source` names the shared PR file.

- [ ] **Step 4: Move the 16 committed narration clips to stable stage paths**

Map Ancient Fort source keys `1f4n10w`, `vs01zg`, `1ek04iz`, `dw5nrg`, `1ifzmpu`, `1cxmbxz`, `g5vwfy`, `rxzofw` to stage IDs `gate`, `bastion`, `map`, `ruins`, `water`, `sound`, `evidence`, `care`. Map Rock Climbing keys `5ab3vl`, `g7h4vh`, `1ugu2e2`, `p490ym`, `1ei9w6g`, `iawj3x`, `nnd7n9`, `1x2klvi` to `arrive`, `holds`, `equipment`, `slip`, `posture`, `climb`, `rappel`, `review`. Use `git mv`, set each matching cue’s `audioUrl` to `/simulations/<slug>/narration/<stage-id>.mp3`, and add the audio asset to that record’s manifest. Do not invent URLs for the other 108 cues.

- [ ] **Step 5: Verify assets, remove migrated legacy files, and commit**

Run:

```bash
npx vitest run tests/unit/guided-asset-manifests.test.ts
```

Expected: PASS for 17 environments, 16 committed audio clips, exact hashes, and zero missing manifest targets. Then remove the 15 migrated environment PNGs; no surviving runtime code may reference `/environments/` or `/narration/<hash>.mp3`.

```bash
git add apps/web/public/simulations packages/simulation-content/src/implemented/guided tests/unit/guided-asset-manifests.test.ts
git add -u apps/web/public/environments apps/web/public/narration
git commit -m "feat: migrate guided simulation assets"
```

## Task 9: Build the shared guided scene-adapter bridge

**Files:**

- Create: `apps/web/lib/simulations/guided/sceneWorld.ts`
- Create: `apps/web/lib/simulations/guided/createGuidedSceneAdapter.ts`
- Create: `tests/unit/guided-scene-adapter.test.ts`

- [ ] **Step 1: Write failing host-boundary and evidence tests**

Use a fake `SimulationSceneContext`, a real `THREE.Scene`, `createResourceRegistry()`, a fake interaction registry, and a two-stage definition. Assert create adds one root and registers hotspots/resources; `applySnapshot` alone records nothing; a performed scene action starts projection; fixed updates record evidence only after the cue duration; reduced motion applies the final projection without skipping the required action; answer-mode projection never calls `recordEvidence`; reapplying a completed snapshot does not record twice; focus target follows the current cue; dispose unregisters interactions, removes the root, disposes world geometry/materials, and leaves zero resources.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npx vitest run tests/unit/guided-scene-adapter.test.ts
```

Expected: FAIL because the bridge does not exist.

- [ ] **Step 3: Implement the testable world boundary**

Use this exact interface:

```ts
export interface GuidedSceneWorld {
  root: THREE.Group;
  cueIds: readonly string[];
  interactionTargets: readonly {
    id: string;
    object: THREE.Object3D;
    actionId: string;
    accessibilityLabel: string;
    inputSources?: NormalizedInputSource[];
  }[];
  cueDurationSeconds(cueId: string): number;
  applyCue(
    cueId: string,
    progress: number,
    preferences: SimulationLaunchPreferences,
  ): void;
  focusTarget(cueId: string): THREE.Object3D | undefined;
  dispose(): void;
}

export type CreateGuidedSceneWorld = (
  context: SimulationSceneContext,
) => GuidedSceneWorld | Promise<GuidedSceneWorld>;
```

Implement `createGuidedSceneAdapter(definition, createWorld)` so its `SimulationSceneHandle.applySnapshot` resolves the current stage, detects completion from the snapshot’s action/evidence IDs, and starts only the declared cue. `fixedUpdate` advances a clamped `0..1` projection. At projection completion it calls `context.recordEvidence(stage.completionEvidenceIds[0])` exactly once only when `evidenceMode === 'scene'`; answer stages finish visually but wait for a correct shell answer. Register every world target through `context.interactions.register`, use all browser/touch/keyboard/XR sources by default, register disposal through `context.resources`, and return the current cue’s focus target. Reject unknown stage IDs, unknown cue IDs, non-finite durations, and worlds whose cue set differs from the definition.

- [ ] **Step 4: Run the focused test and commit**

Run:

```bash
npx vitest run tests/unit/guided-scene-adapter.test.ts
```

Expected: PASS.

```bash
git add apps/web/lib/simulations/guided/sceneWorld.ts apps/web/lib/simulations/guided/createGuidedSceneAdapter.ts tests/unit/guided-scene-adapter.test.ts
git commit -m "feat: add guided scene adapter bridge"
```

## Task 10: Port food-preservation scene adapters

**Files:**

- Create: `apps/web/lib/simulations/guided/c5-ch04-a01-food-spoilage.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch04-a02-milk-spoilage.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch04-a03-the-making-of-aam-papad.scene.ts`
- Create: `tests/unit/guided-food-scenes.test.ts`

- [ ] **Step 1: Write failing projection tests**

Instantiate each exported world without WebGL. Food Spoilage must expose four equal mango samples and progress condition severity to `[1, 0.72, 0.25, 0.16]` by Day 5, including discoloration, texture, mould, and safe-observation state. Milk must expose three equal samples and `[1, 0.55, 0.16]` at 24 hours, with souring, clumps, whey, and bubbles. Aam Papad must project clean platform, ripe mangoes, strained pulp, mixed sweeteners, a thin sheet, 28 daily layers with lower moisture, and cut stored pieces. Every `sceneCueId` must have one focus target and the declared action hotspot.

- [ ] **Step 2: Run RED, port only scene behavior, then run GREEN**

Run before and after implementation:

```bash
npx vitest run tests/unit/guided-food-scenes.test.ts tests/unit/guided-scene-adapter.test.ts
```

Expected before: missing adapters. Expected after: PASS. Port useful geometry/material/animation logic from the three immutable PR viewers into `GuidedSceneWorld`; use canonical environment URLs and host quality/profile/preferences. Do not copy their renderer, loop, UI, input, audio, or cleanup scaffolding.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/simulations/guided/c5-ch04-*.scene.ts tests/unit/guided-food-scenes.test.ts
git commit -m "feat: port guided food scenes"
```

## Task 11: Port plant and fibre scene adapters

**Files:**

- Create: `apps/web/lib/simulations/guided/c5-ch05-a01-pitcher-plant-the-insect-hunter.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch05-a02-seed-dispersal.scene.ts`
- Create: `apps/web/lib/simulations/guided/c6-ch03-a01-cotton-farming.scene.ts`
- Create: `apps/web/lib/simulations/guided/c6-ch03-a02-the-process-of-cotton-ginning.scene.ts`
- Create: `tests/unit/guided-plant-fibre-scenes.test.ts`

- [ ] **Step 1: Write failing behavior tests**

Pitcher Plant must project modified leaf/rim/lid, nectar attraction, insect fall, digestive bubbles, glowing mineral uptake, and separate sunlight/sugar cues. Seed Dispersal must behaviorally move hair/wing seeds, float the coconut, attach the burr, transfer the fruit seed, and burst the pod. Cotton Farming must progress soil → spaced seed rows → seedlings → flowers/green bolls → open white bolls → harvested cotton. Cotton Ginning must rotate the handle/rollers, move fibre through the gap, block seeds, and produce separate fibre/seed outputs.

- [ ] **Step 2: Run RED, implement, and run GREEN**

```bash
npx vitest run tests/unit/guided-plant-fibre-scenes.test.ts tests/unit/guided-scene-adapter.test.ts
```

Expected before: missing adapters. Expected after: PASS with all cue IDs, hotspots, focus targets, reduced-motion final states, and disposal verified.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/simulations/guided/c5-ch05-*.scene.ts apps/web/lib/simulations/guided/c6-ch03-*.scene.ts tests/unit/guided-plant-fibre-scenes.test.ts
git commit -m "feat: port guided plant and fibre scenes"
```

## Task 12: Port water and heritage scene adapters

**Files:**

- Create: `apps/web/lib/simulations/guided/c5-ch06-a01-the-storage-of-rainwater.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch06-a02-a-step-well-structure.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch07-a02-dead-sea-salt-water-and-its-effects.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch10-a01-a-visit-of-ancient-fort.scene.ts`
- Create: `tests/unit/guided-water-heritage-scenes.test.ts`

- [ ] **Step 1: Write failing behavior tests**

Rainwater must animate rain, roof runoff, gutter/downpipe, dirty first-flush diversion, later filtration, and covered-tank fill in order. Stepwell must reveal descending stairs/galleries, rain/runoff/groundwater arrows, high/low reservoir levels, and preserved lower access. Dead Sea must dissolve visible salt, sink the fresh-water egg, float the salt-water egg, show opposing force arrows, and retain microorganisms while excluding familiar fish from extreme salinity. Ancient Fort must reveal the gate/spikes, wider bastion field, town map/compass, palace clues, chain-of-pots water system, reflected sound rings, multiple evidence sources, and care state.

- [ ] **Step 2: Run RED, implement, and run GREEN**

```bash
npx vitest run tests/unit/guided-water-heritage-scenes.test.ts tests/unit/guided-scene-adapter.test.ts
```

Expected before: missing adapters. Expected after: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/simulations/guided/c5-ch06-*.scene.ts apps/web/lib/simulations/guided/c5-ch07-a02-dead-sea-salt-water-and-its-effects.scene.ts apps/web/lib/simulations/guided/c5-ch10-a01-a-visit-of-ancient-fort.scene.ts tests/unit/guided-water-heritage-scenes.test.ts
git commit -m "feat: port guided water and heritage scenes"
```

## Task 13: Port mosquito and malaria scene adapters

**Files:**

- Create: `apps/web/lib/simulations/guided/c5-ch08-a01-diagnosis-of-malaria.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch08-a02-life-cycle-of-the-mosquito.scene.ts`
- Create: `tests/unit/guided-health-scenes.test.ts`

- [ ] **Step 1: Write failing health-scene behavior tests**

Malaria must show symptom clues without confirmation, exposure history, protected collection, distinct thick/thin films, Giemsa/focus, exactly three independently revealed parasite rings, an RDT control line before its test line, and professional result routing. Mosquito must show separate floating Anopheles eggs with side floats, parallel no-siphon larvae, comma-shaped nonfeeding pupae, adult emergence, female feeding nuance, and prevention icons. The parasite action must require three commits before `three-parasites-observed`; one controller select cannot fabricate all evidence.

- [ ] **Step 2: Run RED, implement, and run GREEN**

```bash
npx vitest run tests/unit/guided-health-scenes.test.ts tests/unit/guided-scene-adapter.test.ts
```

Expected before: missing adapters. Expected after: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/simulations/guided/c5-ch08-*.scene.ts tests/unit/guided-health-scenes.test.ts
git commit -m "feat: port guided mosquito and malaria scenes"
```

## Task 14: Port supervised adventure scene adapters

**Files:**

- Create: `apps/web/lib/simulations/guided/c5-ch09-a01-river-crossing-adventure.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch09-a02-rock-climbing.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch09-a03-camp-in-the-snow.scene.ts`
- Create: `apps/web/lib/simulations/guided/c5-ch09-a04-snow-mountain-climbing.scene.ts`
- Create: `tests/unit/guided-adventure-scenes.test.ts`

- [ ] **Step 1: Write failing projection and safety tests**

River Crossing must expose two pitons, braided main rope, harness/sling/connector, deliberate steps, current/spray, and a slip followed by grip recovery without camera-forced motion. Rock Climbing must expose checked helmet/harness/sling/top-rope/belay, route holds, controlled slip, 90-degree guide, three-point climb, and rappel. Camp must expose two tent layers, still-air gap, tensioned guy lines, outside drain, supervised chulha, sealed waste bag, feather sleeping bag, and snow. Snow Mountain must expose route poles, layer/equipment check, grouped learners, plant-step balance, instructor-checked fixed rope, stable slip recovery, 2,700-metre check, and return. Reduced motion must jump object animation to final evidence state and never move the camera.

- [ ] **Step 2: Run RED, implement, and run GREEN**

```bash
npx vitest run tests/unit/guided-adventure-scenes.test.ts tests/unit/guided-scene-adapter.test.ts
```

Expected before: missing adapters. Expected after: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/simulations/guided/c5-ch09-*.scene.ts tests/unit/guided-adventure-scenes.test.ts
git commit -m "feat: port guided adventure scenes"
```

## Task 15: Implement the shared guided controller, viewer, and viewer registry

**Files:**

- Create: `apps/web/lib/simulations/guided/createGuidedSimulationController.ts`
- Create: `apps/web/components/simulations/shared/GuidedSimulationViewer.tsx`
- Create: `apps/web/lib/simulations/viewerRegistry.ts`
- Create: `tests/unit/guided-simulation-controller.test.ts`
- Create: `tests/unit/guided-viewer-registry.test.ts`

- [ ] **Step 1: Write failing controller behavior tests**

With a real lesson/assessment session and fake host, assert:

```ts
controller.dispatch(actionFrom("mouse", firstAction));
expect(controller.view().snapshot.stageComplete).toBe(false);
hostEvidence(firstEvidence);
expect(controller.view().snapshot.stageComplete).toBe(true);

controller.next();
controller.dispatch(actionFrom("xr-controller", answerStageAction));
expect(controller.view().snapshot.stageComplete).toBe(false);
expect(controller.answer(distractorId).correct).toBe(false);
expect(controller.view().feedback).toMatch(/hint/i);
expect(controller.answer(acceptedId).correct).toBe(true);
expect(controller.view().snapshot.stageComplete).toBe(true);
```

Also assert unknown/disallowed actions never change stage/evidence; controller select performs only the current action and cannot answer; previous revisits only completed stages; next is blocked before evidence; restart resets lesson and assessment, applies the first snapshot, stops current audio, and replays the first cue only after restart is confirmed; narration replay changes neither lesson nor mastery; stage entry calls `host.narration.play(stage.narrationId)` and exposes the matching caption; disposal calls host disposal once.

- [ ] **Step 2: Run controller tests and verify RED**

```bash
npx vitest run tests/unit/guided-simulation-controller.test.ts
```

Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Implement the controller around the shared runtime**

Create `createGuidedSimulationController({ record, guidance, host, onChange })`. It owns `createLessonSession(record.experience)`, `createAssessmentSession(record.assessment)`, caption/feedback state, and deterministic UI methods `view`, `dispatch`, `recordEvidence`, `answer`, `previous`, `next`, `restart`, `replayNarration`, and `dispose`. Every state change calls `host.applySnapshot(snapshot)` then `onChange(view())`. A correct assessment answer records only the current stage’s declared evidence; an incorrect answer records none. The controller must never call scene evidence directly.

- [ ] **Step 4: Implement `GuidedSimulationViewer` using only shared presentation pieces**

The component signature is exact:

```ts
export interface GuidedSimulationViewerProps {
  definition: GuidedSimulationDefinition;
  sceneAdapter: SimulationSceneAdapter;
}
```

Resolve the implemented record by `definition.moduleId`. Render `SimulationExperienceShell` and put only this shared mount inside its world slot:

```tsx
<SimulationCanvasHost
  ref={mountRef}
  ariaLabel={`${record.module.title} interactive scene`}
  busy={!ready}
/>
```

On mount, call `createSimulationHost({ mount, adapter: sceneAdapter, preferences, narration: record.narration, onAction: controller.dispatch, onEvidence: controller.recordEvidence })`, initialize once, and dispose once. Map controller view to the shell’s `simulationId`, `snapshot`, primary action, current assessment, caption, replay, restart, help, completion, and existing launch/VR/preference props. Browser primary action dispatches a normalized `mouse` action through `host.dispatch`; Quest hotspots reach the same controller through the host interaction registry. Do not render an extra panel, canvas div, audio element, stage nav, or action overlay.

- [ ] **Step 5: Build and behavior-test the viewer registry**

Create one lazy entry for every exact viewer key in Canonical Inventory. Each loader dynamically imports its canonical `.scene.ts` and returns a component that renders `GuidedSimulationViewer` with the matching exported guidance. Export `getSimulationViewer(viewerKey)` that throws for unknown keys. Test exactly 17 guided keys, one-to-one definition binding, successful lazy adapter load, unique adapter IDs, and no legacy slug as a viewer key.

- [ ] **Step 6: Run focused tests, type-check, and commit**

```bash
npx vitest run tests/unit/guided-simulation-controller.test.ts tests/unit/guided-viewer-registry.test.ts tests/unit/guided-scene-adapter.test.ts
npm --workspace apps/web run type-check
```

Expected: PASS and no TypeScript errors.

```bash
git add apps/web/lib/simulations apps/web/components/simulations/shared tests/unit/guided-simulation-controller.test.ts tests/unit/guided-viewer-registry.test.ts
git commit -m "feat: compose guided classes in shared viewer"
```

## Task 16: Add dedicated canonical routes and legacy redirects

**Files:**

- Create: `apps/web/components/simulations/shared/SimulationRoutePage.tsx`
- Create: the 17 canonical `apps/web/app/simulations/<canonical-slug>/page.tsx` files from Canonical Inventory
- Create: the 17 legacy `apps/web/app/simulations/<legacy-slug>/page.tsx` files from Canonical Inventory
- Create: `tests/unit/guided-route-resolution.test.ts`

- [ ] **Step 1: Write failing route-resolution tests**

For every canonical/legacy pair, assert registry resolution returns the canonical record, its module ID maps to the expected guidance/viewer key, and `getSimulationViewer(viewerKey)` succeeds. Assert a missing slug throws a controlled not-found error and that no alias equals another canonical slug.

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/guided-route-resolution.test.ts
```

Expected: FAIL because route composition and/or all bindings do not exist.

- [ ] **Step 3: Implement the shared route composition**

`SimulationRoutePage` accepts `{ slug: string }`, resolves the canonical record, resolves `GuidedSimulationDefinition` by module ID, resolves its viewer key, and renders the registered component. A canonical page contains only:

```tsx
import SimulationRoutePage from "@/components/simulations/shared/SimulationRoutePage";

export default function Page() {
  return <SimulationRoutePage slug="c5-ch04-a01-food-spoilage" />;
}
```

Create one file with the exact slug substituted for every canonical row. Do not add `app/simulations/[slug]/page.tsx`; the repository’s dedicated-page invariant remains intact.

- [ ] **Step 4: Implement all 17 server redirects**

Each legacy page imports `redirect` from `next/navigation` and redirects to its exact canonical path:

```tsx
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/simulations/c5-ch04-a01-food-spoilage");
}
```

Create all pairs in Canonical Inventory; do not render a client-side redirect or duplicate viewer.

- [ ] **Step 5: Run tests/build and commit routes**

```bash
npx vitest run tests/unit/guided-route-resolution.test.ts tests/unit/catalog-runtime-viewer.test.ts tests/unit/guided-viewer-registry.test.ts
npm --workspace apps/web run type-check
npm --workspace apps/web run build
```

Expected: PASS; Next builds all 34 new static route entries without route collisions.

```bash
git add apps/web/app/simulations apps/web/components/simulations/shared/SimulationRoutePage.tsx tests/unit/guided-route-resolution.test.ts
git commit -m "feat: add guided canonical routes and redirects"
```

## Task 17: Add focused Playwright behavior and route smoke

**Files:**

- Create: `tests/e2e/guided-simulation-routes.spec.ts`

- [ ] **Step 1: Write the canonical route matrix test**

Generate one Playwright test per record from `GUIDED_IMPLEMENTED_SIMULATIONS` and its matching guidance. For each canonical route:

1. Capture page errors and 404/403 responses.
2. Navigate and assert HTTP 200, canonical URL, the shell’s canonical simulation data attribute, heading, maturity label, and `getByTestId('simulation-canvas')`.
3. Enable Reduced motion, retain captions, and click `Explore in browser`.
4. For every authored stage, click the exact `actionLabel`. For answer stages, find the current assessment prompt, locate its accepted option label from the imported assessment definition, and click that label. Assert Continue is absent before evidence and present after evidence; click Continue except on the last stage.
5. Assert the exact completion headline, replay narration without changing the stage, restart, and return to stage 1.
6. Assert no page error and no failed required asset response.

Use UI roles/labels and shared shell data attributes; do not invoke controller functions from the browser test and do not add a “complete test” shortcut.

- [ ] **Step 2: Write the legacy redirect test**

For every legacy path, issue an API request with redirects disabled, assert status 307 or 308 and exact `Location: /simulations/<canonical-slug>`, then navigate normally and assert the final URL and canonical simulation data attribute.

- [ ] **Step 3: Run focused Playwright smoke**

Run against the release plan’s shared configuration:

```bash
npx playwright test tests/e2e/guided-simulation-routes.spec.ts --config playwright.config.ts --reporter=line
```

Expected: 34 route cases pass (17 canonical behavior flows and 17 legacy redirects), with zero page errors and zero missing required assets.

- [ ] **Step 4: Commit the smoke suite**

```bash
git add tests/e2e/guided-simulation-routes.spec.ts
git commit -m "test: cover guided simulation routes"
```

## Task 18: Remove obsolete guided viewers and run final gates

**Files:**

- Remove: the 17 PR viewer component files named in Canonical Inventory, if retained by the merge
- Remove when no other consumer remains: `apps/web/components/simulations/questVrControls.ts`, `apps/web/components/simulations/narrationAudio.ts`, `apps/web/components/simulations/realisticEnvironment.ts`
- Modify only files exposed by verification failures, within this plan’s scope

- [ ] **Step 1: Prove there are no competing guided runtimes**

Run:

```bash
rg -n "new THREE.WebGLRenderer|setAnimationLoop|requestSession\(|questVrControls|narrationAudio|realisticEnvironment" apps/web/components/simulations apps/web/lib/simulations/guided
```

Expected: no match in any guided definition/adapter/route/shared viewer; renderer/session/loop matches, if any, are only in foundation-owned host files outside the guided adapter directory.

- [ ] **Step 2: Run all focused guided tests**

```bash
npx vitest run tests/unit/guided-*.test.ts
```

Expected: PASS for builders, 17 definitions, registry, assets, shared adapter, 17 scene adapters, controller, viewer registry, and route resolution.

- [ ] **Step 3: Run repository regressions and build gates**

```bash
npm run test
npm --workspace apps/web run type-check
npm --workspace apps/web run build
npm run web-catalog:generate
git diff --exit-code -- apps/web/lib/scienceCatalog.generated.ts apps/web/lib/curriculumSearch.generated.ts
npm run verify
git diff --check
```

Expected: all unit tests pass, TypeScript has no errors, production build succeeds, generated files are fresh, root verification passes, and `git diff --check` prints nothing.

- [ ] **Step 4: Run focused browser acceptance**

```bash
npx playwright test tests/e2e/guided-simulation-routes.spec.ts --config playwright.config.ts --reporter=line
```

Expected: all 34 cases pass.

- [ ] **Step 5: Inspect the final change set and commit cleanup**

```bash
git status --short
git diff --stat
```

Expected: only guided-class content, curriculum links, assets, adapters, shared guided composition, routes, generated consumers, and tests are changed; no unrelated user files are present.

```bash
git add -u apps/web/components/simulations
git add packages/simulation-content apps/web/lib/simulations apps/web/components/simulations/shared apps/web/app/simulations apps/web/public/simulations apps/web/lib/scienceCatalog.generated.ts apps/web/lib/curriculumSearch.generated.ts tests
git commit -m "refactor: retire duplicated guided viewers"
```

## Self-Review Checklist

- [ ] **Spec coverage:** All 17 guided contributions appear once under canonical identity, all 17 PR URLs redirect, all definitions are evidence-gated, all scenes use shared host/audio/input/resource ownership, and all captions/assets/provenance are explicit.
- [ ] **Inventory arithmetic:** 17 guided definitions, 17 implemented records, 124 stages, 17 canonical routes, 17 redirects, 17 canonical environments, 15 unique panorama sources, and 16 migrated committed narration clips.
- [ ] **Learning integrity:** Every class has scene observation, misconception resolution, and transfer evidence; completion is not labelled mastery or school validation; controller/XR shortcuts never fabricate evidence.
- [ ] **Safety and evidence maturity:** River, rock, camp, and snow are medium comfort; medical, food, water, height, fire, heritage, and machinery boundaries remain visible; Quest and classroom evidence remain false/unverified.
- [ ] **Placeholder scan:** `rg -n -i 'T[B]D|T[O]DO|implement[[:space:]]+later|fill[[:space:]]+this[[:space:]]+in[[:space:]]+later|appropriate[[:space:]]+error[[:space:]]+handling|similar[[:space:]]+to[[:space:]]+X' docs/superpowers/plans/2026-08-01-aditya-guided-classes.md` returns no plan placeholders.
- [ ] **Type consistency:** `moduleId`, `viewerKey`, stage IDs, action IDs, evidence IDs, narration IDs, cue IDs, assessment IDs, canonical slugs, aliases, adapter IDs, and route paths match their single normative tables.
- [ ] **Behavioral coverage:** No PR source-text assertion is promoted as proof of behavior; tests exercise runtime state, scene projections, resource disposal, normalized input parity, route rendering, progression, replay, restart, completion, redirects, and missing assets.

Plan complete and saved to `docs/superpowers/plans/2026-08-01-aditya-guided-classes.md`. Execute it after the simulation-library foundation plan with `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`; execute the reporting/release plan after this one for aggregate manifests, CI, PDFs, deployment, and production evidence.
