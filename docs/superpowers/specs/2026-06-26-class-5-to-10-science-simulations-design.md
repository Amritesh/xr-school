# Class 5-10 Science Simulation Implementation Spec

Date: 2026-06-26
Source PDF: `/Users/amritesh/Downloads/Class 5 to 10 Science Virtual tours.pdf`
Catalog artifact: `docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv`

## Executive Decision

Implement the PDF as a data-driven simulation catalog, not as 497 hand-written React viewers. The source PDF contains 497 activity-level simulations across 116 topic bundles for Classes 5-10. The implementation should create a canonical content package that maps every activity to the existing `SimulationModule` ontology, then render most activities through reusable simulation archetypes.

The platform should keep bespoke Three.js/WebXR viewers only for high-value anchor modules where reusable archetypes are insufficient. Existing `pollination` and `circuit` viewers should be converted into archetype adapters after their metadata is normalized.

## Scale Summary

| Class | Activity modules |
|---|---:|
| 10 | 137 |
| 5 | 43 |
| 6 | 66 |
| 7 | 82 |
| 8 | 78 |
| 9 | 91 |

| Subject | Activity modules |
|---|---:|
| biology | 115 |
| chemistry | 89 |
| environmentalScience | 92 |
| physics | 160 |
| science | 41 |

| Primary archetype | Activity modules |
|---|---:|
| experimentBench | 81 |
| guidedTour | 59 |
| measurementGraph | 20 |
| modelInspection | 221 |
| processTimeline | 48 |
| scenario | 12 |
| sortingBoard | 51 |
| systemMap | 5 |

## Existing Repo Facts That Govern This Spec

- The current stack is a Node workspace with Next.js 15, React 19, Three.js/WebXR, Fastify, TypeSpec, OpenAPI, Vitest, and scripts for contract drift and simulation validation.
- The intended vertical slice is `LearningConcept -> CurriculumMap -> CueCard -> RevisionCard -> AssessmentHook -> SimulationModule -> OfflineContentPack -> BatchSession -> EvaluationRecord -> SyncJob`.
- The product is offline-first for Indian schools, North East India first, with 10 Quest headsets, 40-student classes, four batches, and unreliable connectivity.
- Evaluation is batch-level only. Individual student login, CRM, billing, proposals, marketplace, cloud streaming, multiplayer VR, and production AI content generation remain out of scope.
- Current simulation data is duplicated in the API seed, web catalog, tests, and viewer-local arrays. This must be replaced with one canonical catalog source.
- The current `circuit` seed uses `class8To10`, which is not a valid `GradeBand`; use `class6To8` and/or `class9To10`.
- The current API seed is not a complete `SimulationModule` because it omits required ontology fields such as concept links, curriculum maps, cue/revision/assessment hooks, instructor script, strategies, and max duration.

## Architecture Approaches Considered

### Approach A: One bespoke viewer per activity

This gives maximum visual control, but it creates 497 separate implementation surfaces. It repeats WebXR setup, cue cards, controls, narration, validation, performance checks, and safety behavior. This approach should be rejected except for 5-10 flagship modules per year.

### Approach B: Topic bundles only

This groups activities into 116 topic bundles and ships one module per topic. It is efficient, but it loses the activity-level catalog from the PDF and makes assessment, routing, and package progress less precise.

### Approach C: Activity catalog plus reusable archetype runtime

This is the recommended approach. Every PDF activity becomes a catalog row with its own slug, objective, archetype, format, comfort level, duration, and pack metadata. Activities under the same topic share assets, scenes, concept records, and content packs. Runtime code is implemented by archetype.

## Core Principles

1. Every built module must have `xrFitType: strongVrFit` unless a future AR path is explicitly opened. Activities that are not strong VR fit should remain cataloged but blocked from release until redesigned.
2. Each module must be instructor-led, batch-first, and usable in 8-12 minutes per headset batch.
3. Non-headset students must receive a companion activity: prediction sheet, sketch, sorting task, observation log, or textbook cross-reference.
4. Every module must address at least one misconception and include pre-check, in-simulation cue cards, post-check, and revision cards.
5. Repeated topics across classes must reuse assets but change depth, vocabulary, variables, and assessment difficulty.
6. Comfort defaults to low. Space, heights, disaster, high-speed motion, human reproduction, disease, and sensitive body topics require medium risk controls and instructor pre-briefing.
7. All content must run offline after installation. Internet can only be used for initial pack download and later sync.
8. The source of truth is TypeSpec plus the catalog. Generated OpenAPI must not be edited manually.

## Target Codebase Arrangement

```text
packages/
  simulation-schema/
    src/types.ts
    src/archetypes.ts
    src/validation.ts
    src/catalog-normalization.ts
    src/package-planning.ts
  simulation-content/
    src/catalog/class-5-to-10-science.ts
    src/modules/<slug>.json
    src/topic-bundles/<class>/<chapter>.json
  simulation-runtime/
    src/core/SimulationShell.tsx
    src/core/stage-machine.ts
    src/core/webxr.ts
    src/core/cue-card-texture.ts
    src/core/controller-raycast.ts
    src/core/audio-narration.ts
    src/core/performance-monitor.ts
    src/archetypes/GuidedTourRuntime.tsx
    src/archetypes/ModelInspectionRuntime.tsx
    src/archetypes/ProcessTimelineRuntime.tsx
    src/archetypes/ExperimentBenchRuntime.tsx
    src/archetypes/SortingBoardRuntime.tsx
    src/archetypes/MeasurementGraphRuntime.tsx
    src/archetypes/SystemMapRuntime.tsx
    src/archetypes/ScenarioRuntime.tsx
apps/
  api/
    src/routes/simulation-modules.ts
    src/routes/curriculum-maps.ts
    src/services/catalog-importer.ts
  web/
    app/simulations/[slug]/page.tsx
    components/simulations/SimulationLauncher.tsx
    components/simulations/runtime/RuntimeHost.tsx
    components/simulations/catalog/SimulationCatalogGrid.tsx
scripts/
  extract-science-pdf-catalog.mjs
  validate-simulation-catalog.mjs
  build-offline-content-pack.mjs
```

The CSV created with this spec is a design artifact. The implementation should convert it into a typed package under `packages/simulation-content` so tests and runtime import the same source.

## Common Utility Functions To Build

- `slugifyActivity(classNumber, chapterNumber, activityNumber, title)` creates stable kebab slugs like `c10-ch21-a02-ohms-law`.
- `buildSimulationId(slug)` creates stable ids with `sim-` prefix.
- `normalizePdfText(text)` fixes extraction artifacts such as missing `fi` ligatures and obvious OCR glitches.
- `inferGradeBand(classNumber)` maps Class 5 to `class3To5`, Classes 6-8 to `class6To8`, and Classes 9-10 to `class9To10`.
- `inferSubject(topic, activity)` maps mixed science topics to `physics`, `chemistry`, `biology`, `environmentalScience`, or `science`.
- `classifySimulationArchetype(topic, activity)` assigns one primary archetype and optional secondary archetypes.
- `mapArchetypeToSimulationFormat(archetype)` maps archetypes to TypeSpec `SimulationFormat` values.
- `calculateComfortRisk(activity, archetype)` applies safety rules for height, speed, space, disaster, disease, and sensitive biology.
- `estimatePackageSizeMb(classNumber, archetype, assetPlan)` enforces grade-band package limits.
- `validateCatalogRow(row)` checks required fields, slug uniqueness, valid enums, duration <= 12, and allowed XR fit.
- `buildCueCardSet(module)` creates 3-10 grade-appropriate cue cards from stage definitions.
- `buildAssessmentHooks(module)` creates pre-check, misconception check, micro-quiz, and post-check hooks.
- `buildInstructorScript(module)` emits setup, during-batch, debrief, and revision-trigger sections.
- `groupIntoContentPacks(catalog)` groups modules by class, subject, chapter, and storage budget.
- `createWebXrRenderer(container)` centralizes Three.js renderer setup, XR flags, resize cleanup, and frame loop disposal.
- `createCueCardTexture(cueCard)` centralizes canvas cue-card rendering for VR panels.
- `createControllerRaycaster(interactables)` centralizes Quest controller targeting and click behavior.
- `createStageMachine(stages)` handles next, previous, reset, timed pauses, and assessment triggers.
- `safeSpeak(text)` wraps browser speech synthesis with cancellation and fallback captions.
- `writeLocalSessionLog(session)` prepares Quest/offline log payloads without individual student identity.

## Simulation Archetype Contracts

### guidedTour

Best for forts, farms, cities, forests, power plants, refineries, high-altitude shelters, and industrial visits. Required interactions: teleport or seated-look navigation, 3-6 hotspots, instructor pause points, observation checklist, and no continuous locomotion. Use `virtualFieldVisit` format.

### modelInspection

Best for organs, cells, atoms, animals, instruments, plant parts, lenses, mirrors, magnets, and machines. Required interactions: rotate, zoom, isolate, explode, compare, labels on/off, vocabulary layer, and misconception highlight. Use `interactive3d` format.

### processTimeline

Best for digestion, photosynthesis, reproduction, crop production, waste treatment, cycles, separation processes, and energy flows. Required interactions: staged reveal, scrubber, before/after comparison, replay one stage, and recap sequence card. Use `guidedVisualization` format.

### experimentBench

Best for chemistry tests, circuits, heat, optics, force, pressure, solubility, buoyancy, electroplating, and reaction simulations. Required interactions: variable controls, safe reset, observation panel, predict-observe-explain cue, and one measured output. Use `practicalLabSimulation` format.

### sortingBoard

Best for classification, sources, types, properties, materials, organisms, diets, resources, and periodic categories. Required interactions: drag/classify, compare, reveal rule, misconception trap, and instructor review. Use `interactive3d` format.

### measurementGraph

Best for motion, time, speed, current, resistance, voltage, graphs, moisture, percolation, breathing rate, and power. Required interactions: instrument reading, data table, plotted graph, outlier prompt, and interpretation question. Use `interactive3d` format.

### systemMap

Best for water cycle, food chain/web, air balance, carbon/nitrogen/oxygen cycle, resource systems, monsoon, ecosystems, and energy source comparison. Required interactions: nodes, flows, visible feedback loop, disturbance toggle, and local-context example. Use `guidedVisualization` format.

### scenario

Best for traffic rules, danger sensing, fire control, disease prevention, waste choices, pollution, adolescence, and safety-sensitive decision making. Required interactions: decision point, consequence preview, safe retry, instructor debrief, and no score-shaming. Use `guidedVisualization` format.

## Data Model Requirements Per Activity

Every activity row must be converted into:

- 1 `LearningConcept` or a link to an existing concept.
- 1 `CurriculumMap` linked to board, class band, subject, topic, difficulty, Bloom level, assessment types, XR fit, and local context where useful.
- 1 `SimulationModule` linked to the concept and curriculum map.
- 3-10 `CueCard` records.
- At least 1 `RevisionCard`.
- At least 1 pre-check and 1 post-check `AssessmentHook`.
- 1 companion activity prompt for the 30 non-headset students.
- 1 package assignment under an `OfflineContentPack`.

## Implementation Waves

### Wave 0: Catalog normalization and guardrails

Create `packages/simulation-schema`, import the CSV into typed data, fix existing `pollination` and `circuit` metadata, remove invalid `class8To10`, and make tests validate the real catalog instead of copied fixtures.

### Wave 1: Runtime foundation

Build `simulation-runtime` with shared WebXR renderer, cue-card texture, controller raycast, narration/caption, stage machine, performance monitor, and `SimulationShell`. Migrate `pollination` and `circuit` to use the shell without changing their visible behavior.

### Wave 2: First archetype set

Implement `modelInspection`, `processTimeline`, `experimentBench`, and `sortingBoard`. These cover most biology/chemistry/physics modules and unlock a large part of the catalog with controlled asset work.

### Wave 3: Field/tour and system set

Implement `guidedTour`, `systemMap`, `measurementGraph`, and `scenario`. Add medium-risk comfort controls, teacher pre-briefs, and visual inspection tests.

### Wave 4: Content pack generation

Build offline content pack manifests by class and subject. Enforce size limits: Class 5 under 300 MB per activity pack target, Classes 6-8 under 500 MB, Classes 9-10 under 800 MB, with shared assets deduped by topic bundle.

### Wave 5: Quest/offline validation

Use HTTPS local proxy for WebXR testing, then move toward Quest package installation and local session logging. All runtime modules must pass desktop browser smoke tests, mobile viewport checks, and Quest browser checks before school pilot.

## Per-Topic Bundle Catalog

Each row below expands to activity-level rows in `docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv`. The activity brackets show `primaryArchetype / simulationFormat / comfortRisk / expectedDuration`.

| Class | Chapter | Topic | Activities | Archetypes | Activity implementation map |
|---:|---:|---|---:|---|---|
| 5 | 01 | Super Senses | 4 | modelInspection, scenario | A01 Supersense of smell [modelInspection / interactive3d / low / 8m]; A02 Supersense of sights [modelInspection / interactive3d / low / 8m]; A03 Super Sense of danger [scenario / guidedVisualization / low / 8m]; A04 Supersense of hearing [modelInspection / interactive3d / low / 8m] |
| 5 | 02 | A Snake Charmer's Story | 1 | sortingBoard | A01 Snakes and their types [sortingBoard / interactive3d / low / 7m] |
| 5 | 03 | From Tasting to Digesting | 2 | modelInspection | A01 A Sense of Taste [modelInspection / interactive3d / low / 8m]; A02 Introduction of Digestive system [modelInspection / interactive3d / low / 8m] |
| 5 | 04 | Mangoes Round the Year | 3 | modelInspection | A01 Food spoilage [modelInspection / interactive3d / low / 8m]; A02 Milk spoilage [modelInspection / interactive3d / low / 8m]; A03 The making of Aam papad [modelInspection / interactive3d / low / 8m] |
| 5 | 05 | Seeds and Seeds | 2 | guidedTour, modelInspection | A01 Pitcher plant- The insect hunter [guidedTour / virtualFieldVisit / low / 9m]; A02 Seed dispersal [modelInspection / interactive3d / low / 8m] |
| 5 | 06 | Every Drop Counts | 2 | modelInspection | A01 The storage of rainwater [modelInspection / interactive3d / low / 8m]; A02 A step well structure [modelInspection / interactive3d / low / 8m] |
| 5 | 07 | Experiments with Water | 3 | experimentBench, modelInspection | A01 A concept about- What floats, what sinks? [modelInspection / interactive3d / low / 8m]; A02 Dead sea : Salt water and its effects [modelInspection / interactive3d / low / 8m]; A03 Soluble and Insoluble substances [experimentBench / practicalLabSimulation / low / 8m] |
| 5 | 08 | A Treat for Mosquitoes | 2 | processTimeline, scenario | A01 Diagnosis of malaria [scenario / guidedVisualization / low / 8m]; A02 Life cycle of the mosquito [processTimeline / guidedVisualization / low / 8m] |
| 5 | 09 | Up You Go ! | 4 | guidedTour, modelInspection | A01 River crossing Adventure [modelInspection / interactive3d / low / 8m]; A02 Rock Climbing [modelInspection / interactive3d / medium / 8m]; A03 Camp in the snow [guidedTour / virtualFieldVisit / medium / 9m]; A04 Snow mountain climbing [guidedTour / virtualFieldVisit / medium / 9m] |
| 5 | 10 | Walls Tell Stories | 2 | guidedTour, modelInspection | A01 A Visit of Ancient Fort [guidedTour / virtualFieldVisit / low / 9m]; A02 Bulls fetching well water arrangement [modelInspection / interactive3d / low / 8m] |
| 5 | 11 | Sunita in Space | 2 | guidedTour | A01 A Space Shuttle Launching [guidedTour / virtualFieldVisit / medium / 9m]; A02 Life in Space [guidedTour / virtualFieldVisit / medium / 9m] |
| 5 | 12 | What if It Finishes..? | 3 | modelInspection, scenario | A01 Important Traffic signs and rules [scenario / guidedVisualization / low / 8m]; A02 Types of fuels [modelInspection / interactive3d / low / 8m]; A03 Types of domestic fuels and its usage [modelInspection / interactive3d / low / 8m] |
| 5 | 13 | A Shelter so High! | 3 | guidedTour | A01 Preparation for Tour [guidedTour / virtualFieldVisit / low / 9m]; A02 A visit to Ladakh [guidedTour / virtualFieldVisit / low / 9m]; A03 A visit to Srinagar [guidedTour / virtualFieldVisit / low / 9m] |
| 5 | 14 | Blow Hot, Blow Cold | 2 | modelInspection, processTimeline | A01 Hot air and Cool air [modelInspection / interactive3d / low / 8m]; A02 Flow of air [processTimeline / guidedVisualization / low / 8m] |
| 5 | 15 | Who will do this work ? | 2 | guidedTour, modelInspection | A01 Waste Management System [modelInspection / interactive3d / low / 8m]; A02 Waste Water Treatment Plant [guidedTour / virtualFieldVisit / low / 9m] |
| 5 | 16 | No place for Us ? | 3 | guidedTour | A01 A Village Life [guidedTour / virtualFieldVisit / low / 9m]; A02 A life in a small town [guidedTour / virtualFieldVisit / low / 9m]; A03 A life in a metro city [guidedTour / virtualFieldVisit / low / 9m] |
| 5 | 17 | A Seed tells a Farmer's Story | 3 | modelInspection, processTimeline | A01 Old farming methods [modelInspection / interactive3d / low / 8m]; A02 Transformations in old farming methods [processTimeline / guidedVisualization / low / 8m]; A03 Modern Farming Methods [modelInspection / interactive3d / low / 8m] |
| 6 | 01 | Food: Where does It come from? | 2 | sortingBoard | A01 Sources of Food [sortingBoard / interactive3d / low / 9m]; A02 Herbivores, Carnivores, and Omnivores [sortingBoard / interactive3d / low / 9m] |
| 6 | 02 | Components of Food | 5 | experimentBench, modelInspection | A01 Test the Presence of Carbohydrates [experimentBench / practicalLabSimulation / low / 10m]; A02 Test the Presence of Proteins [experimentBench / practicalLabSimulation / low / 10m]; A03 Test the Presence of Lipids [experimentBench / practicalLabSimulation / low / 10m]; A04 The sources of vitamins and their deficiencies [modelInspection / interactive3d / low / 10m]; A05 The sources of minerals in Food [modelInspection / interactive3d / low / 10m] |
| 6 | 03 | Fiber to Fabric | 2 | modelInspection, processTimeline | A01 Cotton Farming [modelInspection / interactive3d / low / 10m]; A02 The process of Cotton Ginning [processTimeline / guidedVisualization / low / 10m] |
| 6 | 04 | Sorting Materials into Groups | 7 | sortingBoard | A01 Sorting materials according to their shape [sortingBoard / interactive3d / low / 9m]; A02 Sorting materials according to their surface [sortingBoard / interactive3d / low / 9m]; A03 Sorting materials according to their hardness [sortingBoard / interactive3d / low / 9m]; A04 Sorting solid materials according to their solubility in water [sortingBoard / interactive3d / low / 9m]; A05 Sorting Liquids according to their solubility in water [sortingBoard / interactive3d / low / 9m]; A06 Sorting materials according to their density [sortingBoard / interactive3d / low / 9m]; A07 Transparency, Translucency and Opacity [sortingBoard / interactive3d / low / 9m] |
| 6 | 05 | Separation of Substances | 4 | experimentBench, processTimeline | A01 Methods of separating substances [processTimeline / guidedVisualization / low / 10m]; A02 The Sieving process [processTimeline / guidedVisualization / low / 10m]; A03 Sedimentation, Decantation and Filtration processes [processTimeline / guidedVisualization / low / 10m]; A04 Saturation, Evaporation and Condensation Process [experimentBench / practicalLabSimulation / low / 10m] |
| 6 | 06 | Changes around Us | 3 | modelInspection, processTimeline | A01 Information about Reversible and Irreversible changes and its examples - Part 1 [processTimeline / guidedVisualization / low / 10m]; A02 Reversible and Irreversible changes - Part 2 [modelInspection / interactive3d / low / 10m]; A03 Reversible and Irreversible changes - Part 3 [modelInspection / interactive3d / low / 10m] |
| 6 | 07 | Getting to Know Plants | 6 | guidedTour | A01 Types and parts of the plant [guidedTour / virtualFieldVisit / low / 11m]; A02 Types of root- its structure and function [guidedTour / virtualFieldVisit / low / 11m]; A03 Structure and function of stem [guidedTour / virtualFieldVisit / low / 11m]; A04 Structure and function of leaf [guidedTour / virtualFieldVisit / low / 11m]; A05 Structure and function of the flower [guidedTour / virtualFieldVisit / low / 11m]; A06 The Basic photosynthesis process [guidedTour / virtualFieldVisit / low / 11m] |
| 6 | 08 | Body Movements | 3 | modelInspection, processTimeline | A01 Body movement in human [processTimeline / guidedVisualization / low / 10m]; A02 Body movement of earthworm, snail, and cockroach [modelInspection / interactive3d / low / 10m]; A03 Body movement in eagle, fish and snake [processTimeline / guidedVisualization / low / 10m] |
| 6 | 09 | The Living Organisms Characteristicsand Habitats | 5 | guidedTour, modelInspection | A01 Adaptations for desert habitat [modelInspection / interactive3d / low / 10m]; A02 Adaptations for aquatic habitat [modelInspection / interactive3d / low / 10m]; A03 Adaptations for mountain habitat [guidedTour / virtualFieldVisit / medium / 11m]; A04 Adaptations for grassland habitat [modelInspection / interactive3d / low / 10m]; A05 Characteristics of living organisms [modelInspection / interactive3d / low / 10m] |
| 6 | 10 | Motion and Measurement of Distances | 2 | measurementGraph, sortingBoard | A01 Measurement of Length [measurementGraph / interactive3d / low / 9m]; A02 Motion and its types [sortingBoard / interactive3d / low / 9m] |
| 6 | 11 | Light, Shadows and Reflections | 2 | experimentBench | A01 Transparency, Translucency and Opacity [experimentBench / practicalLabSimulation / low / 10m]; A02 The making of pinhole camera [experimentBench / practicalLabSimulation / low / 10m] |
| 6 | 12 | Electricity and Circuits | 4 | experimentBench, modelInspection | A01 Types of electric Cells [modelInspection / interactive3d / low / 10m]; A02 Different types of electric circuit connections [modelInspection / interactive3d / low / 10m]; A03 Electric Torch and its parts [modelInspection / interactive3d / low / 10m]; A04 Conductivity of Electricity [experimentBench / practicalLabSimulation / low / 10m] |
| 6 | 13 | Fun with Magnets | 7 | modelInspection | A01 Types of magnet [modelInspection / interactive3d / low / 10m]; A02 Magnetic and non-magnetic materials [modelInspection / interactive3d / low / 10m]; A03 Poles of magnet [modelInspection / interactive3d / low / 10m]; A04 Attraction and repulsion between magnets [modelInspection / interactive3d / low / 10m]; A05 Magnetic compass [modelInspection / interactive3d / low / 10m]; A06 Making of Magnet at home [modelInspection / interactive3d / low / 10m]; A07 Caution of magnet [modelInspection / interactive3d / low / 10m] |
| 6 | 14 | Water | 5 | experimentBench, modelInspection, processTimeline, sortingBoard | A01 Sources of water [sortingBoard / interactive3d / low / 9m]; A02 Evaporation of water from wet clothes [experimentBench / practicalLabSimulation / low / 10m]; A03 Water cycle [processTimeline / guidedVisualization / low / 10m]; A04 A Heavy Rainfall [modelInspection / interactive3d / low / 10m]; A05 Rooftop Rain Water Harvesting [processTimeline / guidedVisualization / low / 10m] |
| 6 | 15 | Air around Us | 6 | modelInspection, systemMap | A01 Presence of air around us [modelInspection / interactive3d / low / 10m]; A02 Presence of oxygen in the air [modelInspection / interactive3d / low / 10m]; A03 Presence of dust and smoke in air [modelInspection / interactive3d / low / 10m]; A04 Presence of air in water and soil [modelInspection / interactive3d / low / 10m]; A05 Components of air [modelInspection / interactive3d / low / 10m]; A06 The Balance of oxygen and carbon dioxide in the air [systemMap / guidedVisualization / low / 10m] |
| 6 | 16 | Garbage In, Garbage Out | 3 | guidedTour, modelInspection, processTimeline | A01 Waste disposal: At landfill [guidedTour / virtualFieldVisit / low / 11m]; A02 Vermicomposting [modelInspection / interactive3d / low / 10m]; A03 The paper recycling process: Home Made [processTimeline / guidedVisualization / low / 10m] |
| 7 | 01 | Nutrition in Plants | 1 | guidedTour | A01 Photosynthesis process [guidedTour / virtualFieldVisit / low / 11m] |
| 7 | 02 | Nutrition in Animals | 2 | modelInspection | A01 Cow Digestive system [modelInspection / interactive3d / low / 10m]; A02 Nutrition in Amoeba [modelInspection / interactive3d / low / 10m] |
| 7 | 03 | Fiber to Fabric | 4 | modelInspection, sortingBoard | A01 Shearing and Scouring of Wool [modelInspection / interactive3d / low / 10m]; A02 Sorting and Dyeing of Wool [sortingBoard / interactive3d / low / 9m]; A03 Spinning and Rolling of Wool [modelInspection / interactive3d / low / 10m]; A04 Sericulture: Rearing of silkworms to produce silk [modelInspection / interactive3d / low / 10m] |
| 7 | 04 | Heat | 5 | experimentBench, modelInspection | A01 Types of thermometer [modelInspection / interactive3d / low / 10m]; A02 The Convection of water [experimentBench / practicalLabSimulation / low / 10m]; A03 The Convection of air [experimentBench / practicalLabSimulation / low / 10m]; A04 Sea breeze and land breeze [modelInspection / interactive3d / low / 10m]; A05 Heat absorption- Color Matters [modelInspection / interactive3d / low / 10m] |
| 7 | 05 | Acids, Bases and Salts | 4 | experimentBench, modelInspection | A01 The Neutralization process using Universal Indicator [experimentBench / practicalLabSimulation / low / 10m]; A02 Natural indicator: Turmeric paper [modelInspection / interactive3d / low / 10m]; A03 The Neutralization process [experimentBench / practicalLabSimulation / low / 10m]; A04 The ant bite: Neutralization in everyday life [experimentBench / practicalLabSimulation / low / 10m] |
| 7 | 06 | Physical and Chemical Changes | 5 | experimentBench, modelInspection | A01 Types of physical changes: Part-1 [modelInspection / interactive3d / low / 10m]; A02 Types of physical changes: Part-2 [modelInspection / interactive3d / low / 10m]; A03 Chemical Reaction: Burning of Magnesium Ribbon [experimentBench / practicalLabSimulation / low / 10m]; A04 Rusting of Iron [experimentBench / practicalLabSimulation / low / 10m]; A05 Reactivity of metals [modelInspection / interactive3d / low / 10m] |
| 7 | 07 | Weather, Climate and Adaptations ofAnimals to Climate | 1 | guidedTour | A01 Adaptation of animals in tropical rainforests [guidedTour / virtualFieldVisit / low / 11m] |
| 7 | 08 | Winds, Storms and Cyclones | 6 | measurementGraph, modelInspection, systemMap | A01 Air exerts pressure [modelInspection / interactive3d / medium / 10m]; A02 High pressure area and low pressure area of air and effects [modelInspection / interactive3d / medium / 10m]; A03 High speed wind reduces the air pressure [measurementGraph / interactive3d / medium / 9m]; A04 Air expands on heating [modelInspection / interactive3d / medium / 10m]; A05 Wind current on the earth [modelInspection / interactive3d / medium / 10m]; A06 Monsoon Winds [systemMap / guidedVisualization / medium / 10m] |
| 7 | 09 | Soil | 4 | experimentBench, modelInspection | A01 Soil profile [modelInspection / interactive3d / low / 10m]; A02 Test of the percolation rate of soil [experimentBench / practicalLabSimulation / low / 10m]; A03 Measurement of moisture in soil [experimentBench / practicalLabSimulation / low / 10m]; A04 Layers of soil [modelInspection / interactive3d / low / 10m] |
| 7 | 10 | Respiration in Organisms part - 1 | 4 | modelInspection | A01 The breathing rate [modelInspection / interactive3d / low / 10m]; A02 The breathing process in human [modelInspection / interactive3d / low / 10m]; A03 Aerobic respiration in human [modelInspection / interactive3d / low / 10m]; A04 Anaerobic respiration in Human [modelInspection / interactive3d / low / 10m] |
| 7 | 11 | Respiration in Organisms part - 2 | 3 | modelInspection | A01 Anaerobic respiration in yeast [modelInspection / interactive3d / low / 10m]; A02 Breathing in cockroach and earthworm [modelInspection / interactive3d / low / 10m]; A03 Breathing in fish [modelInspection / interactive3d / low / 10m] |
| 7 | 12 | Transportation in Animals and Plants | 5 | guidedTour | A01 The blood and its components [guidedTour / virtualFieldVisit / low / 11m]; A02 The circulatory system in human [guidedTour / virtualFieldVisit / low / 11m]; A03 Introduction to human heart [guidedTour / virtualFieldVisit / low / 11m]; A04 Human Excretory system [guidedTour / virtualFieldVisit / low / 11m]; A05 Transport of water and food in plants [guidedTour / virtualFieldVisit / low / 11m] |
| 7 | 13 | Reproduction in Plants part - 1 | 4 | guidedTour | A01 Vegetative propagation by stem cutting [guidedTour / virtualFieldVisit / low / 11m]; A02 Vegetative propagation by buds or eyes [guidedTour / virtualFieldVisit / low / 11m]; A03 Vegetative propagation in Leaf [guidedTour / virtualFieldVisit / low / 11m]; A04 Vegetative propagation in cactus [guidedTour / virtualFieldVisit / low / 11m] |
| 7 | 14 | Reproduction in Plants part - 2 | 3 | guidedTour | A01 Fragmentation in spirogyra [guidedTour / virtualFieldVisit / low / 11m]; A02 Asexual reproduction by spore formation [guidedTour / virtualFieldVisit / low / 11m]; A03 Reproduction through spore formation in fern [guidedTour / virtualFieldVisit / low / 11m] |
| 7 | 15 | Reproduction in Plants part - 3 | 3 | guidedTour | A01 Structure and function of the flower [guidedTour / virtualFieldVisit / low / 11m]; A02 Pollination and fertilization [guidedTour / virtualFieldVisit / low / 11m]; A03 Seed Dispersal [guidedTour / virtualFieldVisit / low / 11m] |
| 7 | 16 | Motion and Time | 8 | measurementGraph | A01 Slow motion or Fast motion [measurementGraph / interactive3d / low / 9m]; A02 Measurement Of Time [measurementGraph / interactive3d / low / 9m]; A03 Speed and its measurement [measurementGraph / interactive3d / low / 9m]; A04 Units of speed [measurementGraph / interactive3d / low / 9m]; A05 Uniform motion [measurementGraph / interactive3d / low / 9m]; A06 Distance vs Time graph for uniform motion [measurementGraph / interactive3d / low / 9m]; A07 Non-Uniform motion [measurementGraph / interactive3d / low / 9m]; A08 Distance Vs Time Graph for non- uniform motion [measurementGraph / interactive3d / low / 9m] |
| 7 | 17 | Electric Current and Its Effects | 6 | measurementGraph, modelInspection, processTimeline | A01 Symbol of electric components [modelInspection / interactive3d / low / 10m]; A02 The Making of a battery [processTimeline / guidedVisualization / low / 10m]; A03 Heating effect of electric current and its uses [measurementGraph / interactive3d / low / 9m]; A04 The fuse: Working principle and application [processTimeline / guidedVisualization / low / 10m]; A05 Magnetic effect of electric current [modelInspection / interactive3d / low / 10m]; A06 The working of Electric Bell [processTimeline / guidedVisualization / low / 10m] |
| 7 | 18 | Light | 6 | experimentBench, modelInspection | A01 Travelling of light [modelInspection / interactive3d / low / 10m]; A02 Concave mirror and its use [modelInspection / interactive3d / low / 10m]; A03 Convex mirror and its use [modelInspection / interactive3d / low / 10m]; A04 The Newton's Disc [modelInspection / interactive3d / low / 10m]; A05 Refraction of light by convex lens and concave lens [experimentBench / practicalLabSimulation / low / 10m]; A06 Laws of reflection of light [experimentBench / practicalLabSimulation / low / 10m] |
| 7 | 19 | Water: A Precious Resource | 2 | processTimeline, sortingBoard | A01 Water cycle [processTimeline / guidedVisualization / low / 10m]; A02 Extraction of groundwater [sortingBoard / interactive3d / low / 9m] |
| 7 | 20 | Forests: Our Lifeline | 5 | guidedTour | A01 Visit to a forest [guidedTour / virtualFieldVisit / low / 11m]; A02 The three link food chain [guidedTour / virtualFieldVisit / low / 11m]; A03 The five link food chain [guidedTour / virtualFieldVisit / low / 11m]; A04 The balance between oxygen and carbon dioxide [guidedTour / virtualFieldVisit / low / 11m]; A05 The soil erosion and prevention [guidedTour / virtualFieldVisit / low / 11m] |
| 7 | 21 | Waste Water Story | 1 | scenario | A01 Waste Water Collection [scenario / guidedVisualization / low / 10m] |
| 8 | 01 | Crop Production and Management | 5 | processTimeline | A01 Ploughing : Preparation of Soil [processTimeline / guidedVisualization / low / 10m]; A02 Sowing of seeds [processTimeline / guidedVisualization / low / 10m]; A03 Irrigation methods [processTimeline / guidedVisualization / low / 10m]; A04 Fertilizers and Weedicides [processTimeline / guidedVisualization / low / 10m]; A05 Harvesting, Threshing and Storage of crop [processTimeline / guidedVisualization / low / 10m] |
| 8 | 02 | Microorganisms : Friend and Foe | 4 | modelInspection | A01 Microorganisms: Introduction, Their types, Useful or Harmful [modelInspection / interactive3d / low / 10m]; A02 Virus: Introduction, spreading and its effects [modelInspection / interactive3d / low / 10m]; A03 Fungi and its development [modelInspection / interactive3d / low / 10m]; A04 Food Preservation: Pasteurization of milk [modelInspection / interactive3d / low / 10m] |
| 8 | 03 | Synthetic Fibers and Plastics | 3 | modelInspection, sortingBoard | A01 Polymer: Introduction and Classification Based on Availability Source and Structure of Monomer Chain [modelInspection / interactive3d / low / 10m]; A02 Synthetic Fibers: Introduction and Types [sortingBoard / interactive3d / low / 9m]; A03 Plastic: Introduction and Types [sortingBoard / interactive3d / low / 9m] |
| 8 | 04 | Materials : Metals and Non-Metals | 10 | experimentBench, sortingBoard | A01 Conductivity of heat in metals [experimentBench / practicalLabSimulation / low / 10m]; A02 Conductivity of Electricity [experimentBench / practicalLabSimulation / low / 10m]; A03 Physical Properties of Metal: Sonorous, Malleability, Ductile, Lustrous, and Hard [sortingBoard / interactive3d / low / 9m]; A04 Chemical properties of metal part 1 [sortingBoard / interactive3d / low / 9m]; A05 Chemical properties of metal part 2 [sortingBoard / interactive3d / low / 9m]; A06 Chemical properties of non metal [sortingBoard / interactive3d / low / 9m]; A07 Reaction of metals with water [experimentBench / practicalLabSimulation / low / 10m]; A08 Reaction of metals with acid [experimentBench / practicalLabSimulation / low / 10m]; A09 Reaction of metals with base [experimentBench / practicalLabSimulation / low / 10m]; A10 Reactivity Series of Metals [experimentBench / practicalLabSimulation / low / 10m] |
| 8 | 05 | Coal and Petroleum | 3 | guidedTour, modelInspection, processTimeline | A01 Introduction of coal [modelInspection / interactive3d / low / 10m]; A02 Production of Coal-gas, Coal-tar and Coke from Coal [processTimeline / guidedVisualization / low / 10m]; A03 Petroleum refinery [guidedTour / virtualFieldVisit / medium / 11m] |
| 8 | 06 | Combustion and Flame | 5 | experimentBench, modelInspection | A01 Combustion and Ignition temperature [experimentBench / practicalLabSimulation / low / 10m]; A02 Heating water in a paper cup [modelInspection / interactive3d / low / 10m]; A03 How to control flre [modelInspection / interactive3d / low / 10m]; A04 Types of combustion [modelInspection / interactive3d / low / 10m]; A05 Structure of flame [modelInspection / interactive3d / low / 10m] |
| 8 | 07 | Cell - Structure and Functions | 2 | modelInspection | A01 Cells of the human body [modelInspection / interactive3d / low / 10m]; A02 Basic structure of Animal cell [modelInspection / interactive3d / low / 10m] |
| 8 | 08 | Reproduction in Animals | 7 | modelInspection, processTimeline | A01 Male reproductive organs [modelInspection / interactive3d / low / 10m]; A02 Female reproductive organs [modelInspection / interactive3d / low / 10m]; A03 Fertilization in human [processTimeline / guidedVisualization / medium / 10m]; A04 Development of embryo in humans [processTimeline / guidedVisualization / medium / 10m]; A05 Fertilization in frog [processTimeline / guidedVisualization / low / 10m]; A06 Asexual Reproduction : Budding [processTimeline / guidedVisualization / low / 10m]; A07 Binary fission in Amoeba [processTimeline / guidedVisualization / low / 10m] |
| 8 | 09 | Reaching The Age of Adolescence | 3 | modelInspection, scenario | A01 Types of Glands and their functions [modelInspection / interactive3d / medium / 10m]; A02 Human sex determination- Female [scenario / guidedVisualization / medium / 10m]; A03 Human sex determination- Male [scenario / guidedVisualization / medium / 10m] |
| 8 | 10 | Force and Pressure | 4 | modelInspection | A01 The Force [modelInspection / interactive3d / low / 10m]; A02 The effects of force on object's motion and shape [modelInspection / interactive3d / low / 10m]; A03 Types of force [modelInspection / interactive3d / low / 10m]; A04 Introduction of Pressure [modelInspection / interactive3d / low / 10m] |
| 8 | 11 | Friction | 7 | modelInspection | A01 Introduction of Friction [modelInspection / interactive3d / low / 10m]; A02 The force of friction [modelInspection / interactive3d / low / 10m]; A03 The factors affecting Friction [modelInspection / interactive3d / low / 10m]; A04 The Advantages and Disadvantages of Friction [modelInspection / interactive3d / low / 10m]; A05 Increasing and Reducing Friction [modelInspection / interactive3d / low / 10m]; A06 Rolling Friction [modelInspection / interactive3d / low / 10m]; A07 Fluid Friction [modelInspection / interactive3d / low / 10m] |
| 8 | 12 | Sound | 4 | modelInspection | A01 How the sound is produced [modelInspection / interactive3d / low / 10m]; A02 The sound produced by human [modelInspection / interactive3d / low / 10m]; A03 Propagation of Sound [modelInspection / interactive3d / low / 10m]; A04 The Ear structure and function [modelInspection / interactive3d / low / 10m] |
| 8 | 13 | Chemical Effects of Electric Current | 3 | experimentBench, guidedTour | A01 Conductivity of Electricity in liquids [experimentBench / practicalLabSimulation / low / 10m]; A02 Electroplating [experimentBench / practicalLabSimulation / low / 10m]; A03 A visit to the electroplating industry [guidedTour / virtualFieldVisit / low / 11m] |
| 8 | 14 | Some Natural Phenomena | 3 | modelInspection, processTimeline | A01 Types of charges, their interaction and Transfer of Charges [modelInspection / interactive3d / low / 10m]; A02 What causes Lightning [modelInspection / interactive3d / medium / 10m]; A03 Seismograph and its working [processTimeline / guidedVisualization / medium / 10m] |
| 8 | 15 | Light | 7 | experimentBench, guidedTour, modelInspection, sortingBoard | A01 Laws of reflection [experimentBench / practicalLabSimulation / low / 10m]; A02 Regular and irregular reflection [experimentBench / practicalLabSimulation / low / 10m]; A03 The Periscope and its function [modelInspection / interactive3d / low / 10m]; A04 Human Eye Anatomy [modelInspection / interactive3d / low / 10m]; A05 Defects of Vision : Myopia and how is it corrected [sortingBoard / interactive3d / low / 9m]; A06 Defects of Vision : Hypermetropia and how is it corrected [guidedTour / virtualFieldVisit / low / 11m]; A07 Defects of Vision: Presbyopia and how is it corrected [sortingBoard / interactive3d / low / 9m] |
| 8 | 16 | Stars and The Solar System | 7 | modelInspection | A01 Day and Night cycle on the earth [modelInspection / interactive3d / low / 10m]; A02 Change of seasons on earth [modelInspection / interactive3d / low / 10m]; A03 Phases of the moon [modelInspection / interactive3d / low / 10m]; A04 Introduction to the solar system [modelInspection / interactive3d / low / 10m]; A05 Constellations [modelInspection / interactive3d / low / 10m]; A06 Comets, meteors, and meteorites [modelInspection / interactive3d / low / 10m]; A07 Artiflcial satellites [modelInspection / interactive3d / low / 10m] |
| 8 | 17 | Pollution of Air and Water | 1 | scenario | A01 Air Pollution [scenario / guidedVisualization / low / 10m] |
| 9 | 01 | Matter in Our Surroundings | 3 | modelInspection | A01 Matters in our surroundings [modelInspection / interactive3d / low / 12m]; A02 States of Matter [modelInspection / interactive3d / low / 12m]; A03 Changes of states of the matter [modelInspection / interactive3d / low / 12m] |
| 9 | 02 | Is Matter Around Us Pure? | 8 | modelInspection, processTimeline | A01 Element, compound And mixture [modelInspection / interactive3d / low / 12m]; A02 Types of mixtures [modelInspection / interactive3d / low / 12m]; A03 What is a solution? [modelInspection / interactive3d / low / 12m]; A04 What is a suspension? [modelInspection / interactive3d / low / 12m]; A05 What is a Colloidal solution? [modelInspection / interactive3d / low / 12m]; A06 Separating components of a mixture [modelInspection / interactive3d / low / 12m]; A07 Separation of Immiscible Liquids [processTimeline / guidedVisualization / low / 12m]; A08 Separation of Miscible Liquids [processTimeline / guidedVisualization / low / 12m] |
| 9 | 03 | Atoms and Molecules | 4 | experimentBench, modelInspection | A01 Law of conservation of mass [experimentBench / practicalLabSimulation / low / 12m]; A02 Law of constant proportions [experimentBench / practicalLabSimulation / low / 12m]; A03 Information about atom [modelInspection / interactive3d / low / 12m]; A04 Molecules of elements [modelInspection / interactive3d / low / 12m] |
| 9 | 04 | Structure of The Atom | 7 | modelInspection | A01 The Structure of an Atom [modelInspection / interactive3d / low / 12m]; A02 Thomson, Rutherford, and Bohr's model of the atom [modelInspection / interactive3d / low / 12m]; A03 Atomic Number and Atomic Mass [modelInspection / interactive3d / low / 12m]; A04 Electronic Configuration of elements [modelInspection / interactive3d / low / 12m]; A05 Valency of the electron [modelInspection / interactive3d / low / 12m]; A06 Noble gases [modelInspection / interactive3d / low / 12m]; A07 Isotopes and Isobars [modelInspection / interactive3d / low / 12m] |
| 9 | 05 | The Fundamental Unit of Life | 2 | guidedTour | A01 Basic structure of Animal cell [guidedTour / virtualFieldVisit / low / 12m]; A02 Cells of the human body [guidedTour / virtualFieldVisit / low / 12m] |
| 9 | 06 | Tissues part - 1 | 2 | guidedTour, modelInspection | A01 Meristematic Tissue of plants [guidedTour / virtualFieldVisit / low / 12m]; A02 Epidermal and Guard Cells [modelInspection / interactive3d / low / 12m] |
| 9 | 07 | Tissue part - 2 | 3 | modelInspection | A01 Epithelial Tissue [modelInspection / interactive3d / low / 12m]; A02 Connective Tissue [modelInspection / interactive3d / low / 12m]; A03 Nervous Tissue [modelInspection / interactive3d / low / 12m] |
| 9 | 08 | Diversity in Living Organisms | 6 | guidedTour, modelInspection | A01 Biological Classification [modelInspection / interactive3d / low / 12m]; A02 The five kingdom classiflcation [modelInspection / interactive3d / low / 12m]; A03 Classification of Plants [guidedTour / virtualFieldVisit / low / 12m]; A04 Classification of Animals [modelInspection / interactive3d / low / 12m]; A05 Classes of Vertebrates [modelInspection / interactive3d / low / 12m]; A06 Binomial nomenclature [modelInspection / interactive3d / low / 12m] |
| 9 | 09 | Motion | 6 | measurementGraph, modelInspection | A01 Uniform motion [modelInspection / interactive3d / low / 12m]; A02 Velocity vs Time graph for uniform motion [measurementGraph / interactive3d / low / 11m]; A03 Distance vs Time graph for uniform motion [measurementGraph / interactive3d / low / 11m]; A04 Non-Uniform motion [modelInspection / interactive3d / low / 12m]; A05 Distance Vs Time Graph for non- uniform motion [measurementGraph / interactive3d / low / 11m]; A06 Velocity Vs Time Graph for non- uniform motion [measurementGraph / interactive3d / low / 11m] |
| 9 | 10 | Force and Laws of Motion | 6 | experimentBench, modelInspection, systemMap | A01 Balanced and Unbalanced forces [systemMap / guidedVisualization / low / 12m]; A02 Inertia and mass [modelInspection / interactive3d / low / 12m]; A03 The Second law of motion [experimentBench / practicalLabSimulation / low / 12m]; A04 The Third law of motion [experimentBench / practicalLabSimulation / low / 12m]; A05 Conservation of momentum [modelInspection / interactive3d / low / 12m]; A06 The relation between Galileo's track and the first law of motion [experimentBench / practicalLabSimulation / low / 12m] |
| 9 | 11 | Gravitation | 5 | experimentBench, modelInspection | A01 Universal Law of Gravitation [experimentBench / practicalLabSimulation / low / 12m]; A02 Free Fall [experimentBench / practicalLabSimulation / medium / 12m]; A03 Mass and Weight [modelInspection / interactive3d / low / 12m]; A04 Thrust and Pressure [modelInspection / interactive3d / low / 12m]; A05 The Archimedes principle [modelInspection / interactive3d / low / 12m] |
| 9 | 12 | Work and Energy | 7 | experimentBench, measurementGraph, modelInspection | A01 Concept of work [modelInspection / interactive3d / low / 12m]; A02 The Energy [modelInspection / interactive3d / low / 12m]; A03 The kinetic Energy [modelInspection / interactive3d / low / 12m]; A04 The Potential Energy [modelInspection / interactive3d / low / 12m]; A05 The Law of conservation of Energy [experimentBench / practicalLabSimulation / low / 12m]; A06 Potential energy of an object at a height [modelInspection / interactive3d / low / 12m]; A07 The Power [measurementGraph / interactive3d / low / 11m] |
| 9 | 13 | Sound Part 1 | 4 | modelInspection | A01 Sound and its propagation [modelInspection / interactive3d / low / 12m]; A02 Sound waves are longitudinal waves [modelInspection / interactive3d / low / 12m]; A03 Characteristics Of Sound wave [modelInspection / interactive3d / low / 12m]; A04 Sonic boom [modelInspection / interactive3d / medium / 12m] |
| 9 | 14 | Sound Part 2 | 4 | experimentBench, modelInspection | A01 Echo [modelInspection / interactive3d / low / 12m]; A02 Reverberation [modelInspection / interactive3d / low / 12m]; A03 Reflection of sound [experimentBench / practicalLabSimulation / low / 12m]; A04 Ultrasound [modelInspection / interactive3d / low / 12m] |
| 9 | 15 | Why do we fall ill part - 1 | 4 | modelInspection, scenario, sortingBoard | A01 Health and its issues [modelInspection / interactive3d / low / 12m]; A02 Disease and its types [sortingBoard / interactive3d / low / 11m]; A03 AIDS disease and its causes [scenario / guidedVisualization / medium / 12m]; A04 Malaria disease and its causes [scenario / guidedVisualization / low / 12m] |
| 9 | 16 | Why do we fall ill part - 2 | 1 | scenario | A01 Foodborne diseases, their causes and cure [scenario / guidedVisualization / low / 12m] |
| 9 | 17 | Natural Resources part - 1 | 5 | processTimeline, sortingBoard | A01 Winds: The movement of air [processTimeline / guidedVisualization / low / 12m]; A02 Air expands on heating [sortingBoard / interactive3d / low / 11m]; A03 Formation of clouds and rain [processTimeline / guidedVisualization / low / 12m]; A04 Air Pollution: Causes and Effects [sortingBoard / interactive3d / low / 11m]; A05 Water Pollution: Causes and Effects [sortingBoard / interactive3d / low / 11m] |
| 9 | 18 | Natural Resources part - 2 | 5 | processTimeline, sortingBoard | A01 Water Cycle [processTimeline / guidedVisualization / low / 12m]; A02 Nitrogen cycle [processTimeline / guidedVisualization / low / 12m]; A03 Carbon cycle [processTimeline / guidedVisualization / low / 12m]; A04 Oxygen cycle [processTimeline / guidedVisualization / low / 12m]; A05 The ozone layer [sortingBoard / interactive3d / low / 11m] |
| 9 | 19 | Improvement in Food Resources | 9 | modelInspection, sortingBoard | A01 Types of Cropping [modelInspection / interactive3d / low / 12m]; A02 Types of irrigation [modelInspection / interactive3d / low / 12m]; A03 Fertilizers [sortingBoard / interactive3d / low / 11m]; A04 Crop Protection [sortingBoard / interactive3d / low / 11m]; A05 Storage of grains [sortingBoard / interactive3d / low / 11m]; A06 Cattle Farming [sortingBoard / interactive3d / low / 11m]; A07 Poultry Farming [sortingBoard / interactive3d / low / 11m]; A08 Fishery [sortingBoard / interactive3d / low / 11m]; A09 Apiculture [sortingBoard / interactive3d / low / 11m] |
| 10 | 01 | Chemical Reactions and Equations | 6 | experimentBench | A01 Chemical Reaction: Burning of Magnesium Ribbon [experimentBench / practicalLabSimulation / low / 12m]; A02 Combination Reaction [experimentBench / practicalLabSimulation / low / 12m]; A03 Decomposition Reaction [experimentBench / practicalLabSimulation / low / 12m]; A04 Displacement Reaction [experimentBench / practicalLabSimulation / low / 12m]; A05 Double Displacement Reaction [experimentBench / practicalLabSimulation / low / 12m]; A06 Redox Reaction [experimentBench / practicalLabSimulation / low / 12m] |
| 10 | 02 | Acids, Bases and Salts | 9 | experimentBench, modelInspection, processTimeline | A01 Introduction to Acids and Bases and litmus test [experimentBench / practicalLabSimulation / low / 12m]; A02 Reaction of metals with acid and base [experimentBench / practicalLabSimulation / low / 12m]; A03 Reaction of metal carbonates and metal hydrogen carbonates with acid [experimentBench / practicalLabSimulation / low / 12m]; A04 Conductivity of Chemicals [experimentBench / practicalLabSimulation / low / 12m]; A05 What Happens to an Acid or a Base in a Water Solution? [modelInspection / interactive3d / low / 12m]; A06 Salts contain water [modelInspection / interactive3d / low / 12m]; A07 Reaction of metal oxides with acids [experimentBench / practicalLabSimulation / low / 12m]; A08 Is this an exothermic or endothermic process? [processTimeline / guidedVisualization / low / 12m]; A09 Reaction of acids and bases with each other [experimentBench / practicalLabSimulation / low / 12m] |
| 10 | 03 | Metals and Non-metals | 9 | experimentBench, modelInspection, sortingBoard | A01 Physical Property of Metal: Conductivity of Heat [experimentBench / practicalLabSimulation / low / 12m]; A02 Physical Properties of Metal: Sonorous, Malleability, Ductile, Lustrous, and Hard [sortingBoard / interactive3d / low / 11m]; A03 Conductivity of Electricity [experimentBench / practicalLabSimulation / low / 12m]; A04 Chemical properties of Metal [sortingBoard / interactive3d / low / 11m]; A05 Metal reacts with Water [modelInspection / interactive3d / low / 12m]; A06 Reactivity Series of Metals [experimentBench / practicalLabSimulation / low / 12m]; A07 Properties of Ionic compounds [sortingBoard / interactive3d / low / 11m]; A08 Magnetic separation process: Extraction of metal [modelInspection / interactive3d / low / 12m]; A09 Prevention of corrosion [modelInspection / interactive3d / low / 12m] |
| 10 | 04 | Carbon and Its Compounds Part - 1 | 6 | experimentBench, measurementGraph, modelInspection | A01 Types of bonds [modelInspection / interactive3d / low / 12m]; A02 Versatile nature and catenation of carbon, structure of carbon compounds [modelInspection / interactive3d / low / 12m]; A03 Saturated and unsaturated compounds of carbon [measurementGraph / interactive3d / low / 11m]; A04 Allotropes of carbon and oxygen [modelInspection / interactive3d / low / 12m]; A05 Homologous series and nomenclature of the chlorine group [experimentBench / practicalLabSimulation / low / 12m]; A06 Homologous series and nomenclature of the hydroxyl group [experimentBench / practicalLabSimulation / low / 12m] |
| 10 | 05 | Carbon and Its Compounds Part - 2 | 5 | experimentBench, modelInspection, sortingBoard | A01 Homologous series and nomenclature of the aldehyde group [experimentBench / practicalLabSimulation / low / 12m]; A02 Homologous series and nomenclature of carboxyl group [experimentBench / practicalLabSimulation / low / 12m]; A03 Homologous series and nomenclature of unsaturated compound [experimentBench / practicalLabSimulation / low / 12m]; A04 Chemical properties of carbon compound [sortingBoard / interactive3d / low / 11m]; A05 Soap And Detergent [modelInspection / interactive3d / low / 12m] |
| 10 | 06 | Periodic Classification of Elements | 4 | experimentBench, sortingBoard | A01 Dobereiner's Triads [sortingBoard / interactive3d / low / 11m]; A02 Newland's Law of Octaves [experimentBench / practicalLabSimulation / low / 12m]; A03 Mendeleev's Periodic Table [sortingBoard / interactive3d / low / 11m]; A04 Modern Periodic Table [sortingBoard / interactive3d / low / 11m] |
| 10 | 07 | Life Process Part - 1 | 5 | modelInspection, processTimeline | A01 A deep Photosynthesis process [processTimeline / guidedVisualization / low / 12m]; A02 Nutrition in Amoeba [processTimeline / guidedVisualization / low / 12m]; A03 Human Digestive System [modelInspection / interactive3d / low / 12m]; A04 Aerobic respiration in Human [processTimeline / guidedVisualization / low / 12m]; A05 Anaerobic respiration in Human [processTimeline / guidedVisualization / low / 12m] |
| 10 | 08 | Life Process Part - 2 | 3 | modelInspection, processTimeline | A01 The human heart [modelInspection / interactive3d / low / 12m]; A02 Transport and exchange of O2 and CO2 in humans [processTimeline / guidedVisualization / low / 12m]; A03 Human Lymphatic system [modelInspection / interactive3d / low / 12m] |
| 10 | 09 | Life Process Part - 3 | 3 | guidedTour, modelInspection, processTimeline | A01 Anaerobic respiration in yeast [processTimeline / guidedVisualization / low / 12m]; A02 Human respiratory system [modelInspection / interactive3d / low / 12m]; A03 Transportation in plants [guidedTour / virtualFieldVisit / low / 12m] |
| 10 | 10 | Life Process Part - 4 | 3 | guidedTour, modelInspection, processTimeline | A01 Human Excretory system [modelInspection / interactive3d / low / 12m]; A02 Hemodialysis [processTimeline / guidedVisualization / low / 12m]; A03 Excretion in plants [guidedTour / virtualFieldVisit / low / 12m] |
| 10 | 11 | Control and Coordination | 7 | guidedTour, modelInspection | A01 The Human Nervous System [modelInspection / interactive3d / low / 12m]; A02 The reflex action in Human [modelInspection / interactive3d / low / 12m]; A03 the human brain [modelInspection / interactive3d / low / 12m]; A04 The endocrine glands and hormones [modelInspection / interactive3d / low / 12m]; A05 Tropism in plants [guidedTour / virtualFieldVisit / low / 12m]; A06 Nastism in plants [guidedTour / virtualFieldVisit / low / 12m]; A07 Hormones of the plant [guidedTour / virtualFieldVisit / low / 12m] |
| 10 | 12 | How do Organisms Reproduce part - 1 | 4 | modelInspection | A01 Binary fission in Amoeba [modelInspection / interactive3d / low / 12m]; A02 Fragmentation in spirogyra [modelInspection / interactive3d / low / 12m]; A03 Regeneration in Hydra [modelInspection / interactive3d / low / 12m]; A04 Asexual reproduction in Hydra by budding [modelInspection / interactive3d / low / 12m] |
| 10 | 13 | How do Organisms Reproduce part - 2 | 3 | modelInspection | A01 Asexual reproduction by spore formation [modelInspection / interactive3d / low / 12m]; A02 Vegetative propagation by buds or eyes. [modelInspection / interactive3d / low / 12m]; A03 Vegetative propagation in Leaf [modelInspection / interactive3d / low / 12m] |
| 10 | 14 | How do Organisms Reproduce part - 3 | 2 | modelInspection | A01 Fertilization in human [modelInspection / interactive3d / medium / 12m]; A02 Development of embryo in humans [modelInspection / interactive3d / medium / 12m] |
| 10 | 15 | Heredity and Evolution Part - 1 | 4 | experimentBench, modelInspection | A01 Introduction of heredity and DNA [modelInspection / interactive3d / low / 12m]; A02 Mendel's law of segregation [experimentBench / practicalLabSimulation / low / 12m]; A03 Mendel's law of dominance [experimentBench / practicalLabSimulation / low / 12m]; A04 Mendel's law of independent assortment [experimentBench / practicalLabSimulation / low / 12m] |
| 10 | 16 | Heredity and Evolution Part - 2 | 3 | modelInspection, scenario | A01 Human sex determination- Female [scenario / guidedVisualization / medium / 12m]; A02 Human sex determination- Male [scenario / guidedVisualization / medium / 12m]; A03 Fossils [modelInspection / interactive3d / low / 12m] |
| 10 | 17 | Heredity and Evolution Part - 3 | 3 | modelInspection | A01 Evolution of beetles [modelInspection / interactive3d / low / 12m]; A02 Evolution of Homologous and Analogous organs [modelInspection / interactive3d / low / 12m]; A03 Evolution of wild cabbage [modelInspection / interactive3d / low / 12m] |
| 10 | 18 | Light Reflection and Refraction | 11 | experimentBench | A01 Law of reflection [experimentBench / practicalLabSimulation / low / 12m]; A02 The making of a convex mirror [experimentBench / practicalLabSimulation / low / 12m]; A03 The making of a concave mirror [experimentBench / practicalLabSimulation / low / 12m]; A04 Definition of focal length, radius of curvature, pole and Principal axis of spherical mirror [experimentBench / practicalLabSimulation / low / 12m]; A05 Image Formation By Concave mirror [experimentBench / practicalLabSimulation / low / 12m]; A06 Image Formation By Convex mirror [experimentBench / practicalLabSimulation / low / 12m]; A07 Refraction of Light [experimentBench / practicalLabSimulation / low / 12m]; A08 The making of concave and convex Lens [experimentBench / practicalLabSimulation / low / 12m]; A09 Refraction by concave and convex Lens [experimentBench / practicalLabSimulation / low / 12m]; A10 Image formation by concave Lens [experimentBench / practicalLabSimulation / low / 12m]; A11 Image formation by convex Lens [experimentBench / practicalLabSimulation / low / 12m] |
| 10 | 19 | Human Eye and Colourful World Part -1 | 6 | experimentBench, guidedTour, modelInspection | A01 Structure of the Human eye [modelInspection / interactive3d / low / 12m]; A02 Defects of Vision : Myopia and how is it corrected [modelInspection / interactive3d / low / 12m]; A03 Defects of Vision : Hypermetropia and how is it corrected [guidedTour / virtualFieldVisit / low / 12m]; A04 Defects of Vision: Presbyopia and how is it corrected [modelInspection / interactive3d / low / 12m]; A05 Refraction and dispersion of light [experimentBench / practicalLabSimulation / low / 12m]; A06 Primary and Secondary Rainbow [modelInspection / interactive3d / low / 12m] |
| 10 | 20 | Human Eye and Colourful World Part -2 | 6 | experimentBench, modelInspection | A01 Atmospheric refraction [experimentBench / practicalLabSimulation / low / 12m]; A02 Twinkling of stars [modelInspection / interactive3d / low / 12m]; A03 Advance sunrise and delayed sunset [modelInspection / interactive3d / low / 12m]; A04 Scattering of light: Tyndall effect [modelInspection / interactive3d / low / 12m]; A05 Blue colour of the sky [modelInspection / interactive3d / low / 12m]; A06 The Sunrise and Sunset [modelInspection / interactive3d / low / 12m] |
| 10 | 21 | Electricity | 8 | experimentBench, measurementGraph, modelInspection | A01 Electric current and Electric potential difference [measurementGraph / interactive3d / low / 11m]; A02 Ohm'S LAW [experimentBench / practicalLabSimulation / low / 12m]; A03 Relation between R & I for constant V with different electric material. [modelInspection / interactive3d / low / 12m]; A04 Resistivity [measurementGraph / interactive3d / low / 11m]; A05 Resistance of a system of resistor [experimentBench / practicalLabSimulation / low / 12m]; A06 Resistors in Series [experimentBench / practicalLabSimulation / low / 12m]; A07 Resistors in Parallel [experimentBench / practicalLabSimulation / low / 12m]; A08 Heating Effect of Electric Current [measurementGraph / interactive3d / low / 11m] |
| 10 | 22 | Magnetic Effects of Electric Current | 7 | modelInspection | A01 Magnetic Lines and Magnetic field creates in simple electric circuit [modelInspection / interactive3d / low / 12m]; A02 Right Hand Thumb Rule [modelInspection / interactive3d / low / 12m]; A03 Solenoid [modelInspection / interactive3d / low / 12m]; A04 Fleming's left hand rule [modelInspection / interactive3d / low / 12m]; A05 Electric motor [modelInspection / interactive3d / low / 12m]; A06 Electromagnetic Induction [modelInspection / interactive3d / low / 12m]; A07 Electric Generator [modelInspection / interactive3d / low / 12m] |
| 10 | 23 | Sources of Energy Part - 1 | 7 | guidedTour, sortingBoard | A01 Sources of Energy [sortingBoard / interactive3d / low / 11m]; A02 Fossil Fuels [sortingBoard / interactive3d / low / 11m]; A03 Thermal Power Plant [guidedTour / virtualFieldVisit / medium / 12m]; A04 Hydro Power plant [guidedTour / virtualFieldVisit / medium / 12m]; A05 Biomass [sortingBoard / interactive3d / low / 11m]; A06 Wind Energy [sortingBoard / interactive3d / low / 11m]; A07 Solar Energy [sortingBoard / interactive3d / low / 11m] |
| 10 | 24 | Sources of Energy Part - 2 | 6 | modelInspection, sortingBoard | A01 Solar Cooker [sortingBoard / interactive3d / low / 11m]; A02 Tidal Energy [sortingBoard / interactive3d / low / 11m]; A03 Wave Energy [sortingBoard / interactive3d / low / 11m]; A04 Ocean Thermal Energy [sortingBoard / interactive3d / low / 11m]; A05 Geothermal Energy [sortingBoard / interactive3d / low / 11m]; A06 Nuclear Energy [modelInspection / interactive3d / medium / 12m] |
| 10 | 25 | Our Environment | 3 | modelInspection, systemMap | A01 Food chain [systemMap / guidedVisualization / low / 12m]; A02 Food web [systemMap / guidedVisualization / low / 12m]; A03 Ozone layer and its depletion [modelInspection / interactive3d / low / 12m] |
| 10 | 26 | Management of Natural Resources | 4 | guidedTour, processTimeline | A01 Water storage by dams [guidedTour / virtualFieldVisit / low / 12m]; A02 Water Harvesting [processTimeline / guidedVisualization / low / 12m]; A03 Rainwater Harvesting [processTimeline / guidedVisualization / low / 12m]; A04 The formation and conservation of Coal and Petroleum [processTimeline / guidedVisualization / low / 12m] |

## Validation And Acceptance Criteria

- `npm run contract:compile` succeeds before API route changes land.
- `npm run test` includes catalog validation, runtime stage-machine tests, package grouping tests, and evaluation-engine tests.
- `node scripts/validate-simulation-catalog.mjs` verifies all 497 activity slugs, ids, enums, durations, comfort risks, cue-card counts, assessment hooks, and package assignments.
- Existing `scripts/validate-simulations.mjs` is replaced or extended so it validates dynamic routes and viewer/runtime mappings rather than hardcoded `PollinationViewer` and `CircuitViewer` names.
- No catalog row can release with `normalClassroomBetter`, `physicalLabBetter`, or `notWorthXr`.
- No simulation exceeds 12 minutes in headset mode.
- Medium-risk modules include safety notes and instructor pre-briefing.
- All reusable web components added under `apps/web/components` include Storybook stories once Storybook is installed.
- The two existing simulations remain playable after migration to the shared runtime.

## Known Ambiguities And Decisions

- The PDF calls all entries virtual tours, but the implementation should classify them by pedagogy, not by that label.
- Repeated topic headings in the PDF are page continuations, not separate curriculum topics.
- OCR and spelling artifacts are normalized in catalog import, while original titles can be preserved as `sourceTitle` if needed.
- Place-based activities use representative environments unless a location is explicitly required by curriculum or licensing.
- Human reproduction, adolescence, disease, and sex determination modules must use age-appropriate visuals, privacy-sensitive language, and instructor-controlled progression.
- English is the initial language for MVP. Language packs remain future scope unless product explicitly changes priority.

## Definition Of Done For A Catalog Activity

A catalog activity is implementation-ready when it has a valid row in the typed catalog, linked concept and curriculum records, an archetype runtime plan, stage definitions, cue cards, assessment hooks, instructor script, companion activity, comfort risk, pack assignment, and passing catalog validation. It is release-ready only after internal pilot, school pilot evaluation data, 72 FPS Quest validation, and offline pack install verification.
