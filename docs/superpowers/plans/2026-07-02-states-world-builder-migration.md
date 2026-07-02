# States of Matter World-Builder Migration Plan

**Goal:** Release States of Matter as W3 using the shared fixed-step host,
reusable PBR assets, bounded particle-motion adapter, verified matter-state
model, and mastery sequence.

## Implementation

1. Add RED contracts for a validated mapped-PBR world, heat-to-state reference
   vectors, mastery evidence, shared-host adoption, and removal of the private
   renderer loop.
2. Add a pure particle-matter model that maps normalized heat to solid,
   liquid, or gas teaching states and declares that rendered markers are
   illustrative rather than literal molecules.
3. Add `statesWorld.ts`, reusing approved shared metal/painted PBR map assets,
   adaptive quality profiles, an environment, acceptance budgets, and
   observation/misconception/transfer prompts.
4. Move bounded particle stepping to `createWebSimulationRuntime.fixedUpdate`
   and visual interpolation to `renderUpdate`; keep the existing deterministic
   seeded cloud, narration, browser heat control, and XR stage buttons.
5. Register environment, PBR materials, model registry, controls, listeners,
   scene resources, and physics state for deterministic disposal.
6. Run focused tests, type-check, production build, all four stages, heat
   transitions, mastery, remount, and console checks.
7. Run the full strict gate, deploy, production-test, record immutable evidence,
   and leave the direct Quest checklist unsigned.

Rapier is not required for the particle markers: the current deterministic
bounded-motion adapter expresses the lesson behavior without rigid-body
contacts. This keeps Rapier out of the client bundle for this demo.
