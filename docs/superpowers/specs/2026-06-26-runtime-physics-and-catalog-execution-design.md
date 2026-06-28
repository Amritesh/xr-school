# Runtime Physics And Catalog Execution Design

## Goal

Make simulation physics reusable across modules and convert the Class 5-10 PDF catalog from a static queue into launchable simulation experiences.

## Principles

- Keep physics deterministic, offline-first, and independent of Three.js so web and future Quest runtimes can share it.
- Keep custom high-fidelity simulations for released modules while giving every catalog row a real archetype runtime.
- Prefer reusable archetypes over static cards: model inspection, scenario, sorting board, guided tour, experiment bench, process timeline, measurement graph, and system map.
- Every launched catalog simulation must include stages, cue text, audio narration trigger, browser controls, and VR controller stage selection.

## Architecture

`packages/simulation-runtime/src/core/physics.ts` owns the reusable engine. It provides vector types, bounded worlds, body integration, force/impulse application, collision response, and deterministic seeded particle clouds.

`apps/web/components/simulations/GenericCatalogSimulationViewer.tsx` consumes catalog rows and renders a real archetype scene. It uses the runtime physics engine for particle motion and dynamic evidence in experiment, graph, and inspection scenes.

`apps/web/app/simulations/[slug]/page.tsx` statically generates routes for every row in `SCIENCE_SIMULATION_CATALOG`. Existing custom routes remain in place and take precedence for released bespoke demos.

## Testing And Gates

- Runtime physics behavior is covered by `tests/unit/physics-engine.test.ts`.
- Catalog execution routing is covered by `tests/unit/catalog-runtime-viewer.test.ts`.
- Availability behavior is covered by `tests/unit/simulation-availability.test.ts`.
- Commit-hook compliance means running TypeSpec compile, unit tests, simulation validation, and spec drift checks before handoff.
