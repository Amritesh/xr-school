# Circuit World-Builder Migration Implementation Plan

**Goal:** Release Circuit as W2 on the shared fixed-step WebXR lifecycle and
adaptive PBR layer, with Ohm's law represented by a verified electrical model.

**Release boundary:** This plan migrates Circuit only. It does not begin the
States of Matter migration until W2 is production-verified. Rapier is not used
to calculate current, resistance, voltage, or brightness; those are electrical
model outputs. Rigid-body support remains available to later worlds whose
learning behavior genuinely depends on contact or gravity.

## Task 1: Lock electrical truth and world contracts

- Add `tests/unit/circuit-world.test.ts`.
- Extend `tests/unit/circuit-viewer-feedback.test.ts` to require the shared web
  host, mapped PBR factories, validated world, model registry, mastery engine,
  fixed/render update split, and absence of a private renderer loop.
- Run the focused tests and confirm RED before implementation.

## Task 2: Implement the electrical model

- Add `packages/simulation-runtime/src/models/circuitModel.ts`.
- Accept finite voltage, resistance, and open/closed state.
- Return current using `I = V / R` only for a closed circuit.
- Return electrical power using `P = V × I`.
- Return normalized illustrative bulb brightness relative to a declared
  reference load.
- Reject non-positive resistance and invalid numeric values.
- Export the model from the runtime package.
- Verify authored open-, low-resistance-, and high-resistance reference vectors
  through the hidden scientific-model registry.

## Task 3: Author the validated W2 world and PBR asset set

- Add `apps/web/lib/world-builder/circuitWorld.ts`.
- Declare workshop, bench, board, wire, battery, switch, resistor, bulb, and
  electron visualization entities.
- Add Quest Baseline, Browser Balanced, and Browser Enhanced profiles.
- Add mapped PBR definitions for wood, wall, board, metal, copper, battery,
  resistor, and glass-safe bulb fallback.
- Add self-authored base-color, normal, and roughness SVG maps under
  `apps/web/public/world-builder/circuit/`.
- Add an authored workshop environment map.
- Add observation, misconception, and transfer prompts.
- Keep acceptance at 72 FPS, no more than 120 draw calls, and no more than
  250,000 visible triangles on Quest Baseline.

## Task 4: Migrate the Circuit viewer

- Replace private `WebGLRenderer`, resize, render loop, and disposal ownership
  with `createWebSimulationRuntime`.
- Build scene materials through `createMaterialFactory` and the validated W2
  definitions.
- Build lighting, fog, tone mapping, and PMREM environment through
  `createEnvironment`.
- Register and verify the Ohm's law model during initialization.
- Derive current, power, electron speed, and bulb response from model output.
- Move deterministic state evolution to fixed updates; reserve camera and
  visual interpolation for render updates.
- Preserve narration, controller ray interaction, readable VR labels, browser
  controls, switch/resistor interactions, and comfort behavior.
- Add observation, misconception, transfer, hint/retry, and mastery UI.
- Register controls, geometry, materials, textures, environment, model
  registry, and DOM listeners for deterministic disposal.

## Task 5: Verify and release W2

- Run focused W2 tests.
- Run web type-check and production build.
- Exercise all four stages, all resistor values, switch state, numerical
  readings, mastery flow, remount behavior, and console diagnostics locally.
- Add `docs/releases/w2-circuit.md` with automated evidence and an unsigned
  direct-Quest checklist.
- Run `npm run verify`, generated-source freshness, spec drift, diff checks,
  and clean-worktree checks.
- Fast-forward to `main`, push, watch protected Quality and Deploy workflows,
  and test the production alias.
- Record the immutable deployment and CI run URLs.

