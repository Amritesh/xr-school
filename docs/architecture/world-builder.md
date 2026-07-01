# World Builder Architecture

The world builder is the shared runtime foundation for every XR School
simulation. It keeps scientific state deterministic, presentation adaptive,
and lesson content independent from renderer and physics implementation
details.

## Governing constraints

- Runtime sessions are offline-first and do not require a network request.
- Simulations are instructor-operated, batch-level experiences.
- Student-visible content does not expose solver internals or formulas.
- A world fails closed when references, scientific state, or required assets
  are invalid.
- Deployment never promotes release maturity. Direct Quest acceptance remains
  a separate release gate.

## Composition model

A `WorldBundle` is validated before startup. Its `WorldDefinition` references
entities, environments, PBR materials, quality profiles, scientific models,
assessment sequences, asset manifests, and an acceptance profile by stable ID.
Simulation code composes focused `WorldSystem` plugins rather than inheriting
from subject-specific base classes.

The runtime lifecycle is:

`initialize → fixedUpdate → renderUpdate → dispose`

Dependencies are topologically ordered. Initialization runs dependency-first,
fixed and render updates run in that same order, and disposal runs in reverse.
Missing dependencies, duplicate system IDs, cycles, and missing lifecycle
handlers stop startup.

## Deterministic time

Scientific and physical systems run at a fixed `1 / 60` second timestep. The
accumulator clamps a rendered frame delta to 0.1 seconds and performs at most
four catch-up steps. Presentation receives interpolation alpha, but
interpolation cannot modify scientific state or assessment evidence.

When a device falls behind, the runtime lowers optional presentation quality.
It does not skip scientific outcomes, invent state, or change the timestep.

## Resource ownership

Every disposable renderer object, control, listener, material factory,
environment, physics world, and model registry is registered with one
`ResourceRegistry`. Disposal:

1. runs in reverse registration order;
2. attempts every cleanup even when one fails;
3. reports all failures in one aggregate error;
4. is idempotent after a successful cleanup.

Viewers must not create a second independent animation loop or physics solver.
The WebXR-compatible renderer callback advances the shared `WorldRuntime`.

## Physics boundary

`createRapierWorld` is the canonical rigid-body adapter. It owns Rapier
initialization, SI gravity, fixed timestep, stable string IDs, colliders,
snapshots, and disposal. Identical insertion order and inputs produce identical
snapshots.

Rapier is used only for rigid bodies, contacts, sensors, and joints. Biology,
electricity, particle matter, mixtures, and semantic classification use
domain-specific scientific models. The older renderer-independent bounded
particle engine remains a compatibility export only until its consumers are
migrated; no new viewer may depend on it.

## PBR presentation

Instructional meshes use `MeshStandardMaterial` by default.
`MeshPhysicalMaterial` is reserved for effects such as transmission or
clearcoat and requires a Quest-safe fallback when the baseline cannot afford
it.

- Base-color and emissive maps use sRGB.
- Normal, roughness, metalness, and AO maps remain non-color data.
- Texture anisotropy, dimensions, pixel ratio, shadows, triangles, and draw
  calls are capped by the active profile.
- Asset provenance, redistribution licence, author, channels, dimensions,
  compression, and fallbacks are mandatory.
- Environment maps are PMREM-filtered; a declared light rig remains readable
  if the map fails.
- Unlit materials are limited to labels, controller rays, overlays, and
  intentionally emissive cues.

## Adaptive quality

| Profile | Minimum FPS | Draw calls | Visible triangles | Pixel ratio | Post-processing |
|---|---:|---:|---:|---:|---|
| Quest Baseline | 72 | 120 | 250,000 | 1 | Direct WebXR render |
| Browser Balanced | 60 | 220 | 500,000 | 1.5 | Antialias + output |
| Browser Enhanced | 60 | 300 | 750,000 | 2 | AO + selective bloom + antialias + output |

Immersive XR always uses Quest Baseline and direct renderer output. A browser
may choose an enhanced profile only from normalized capability data. Runtime
diagnostics evaluate FPS, draw calls, and triangles against the active profile,
not against a different platform's acceptance thresholds.

The downgrade order is Browser Enhanced → Browser Balanced → Quest Baseline.
Quality transitions may disable optional effects and lower texture or shadow
budgets. They never alter science or mastery results.

## Hidden scientific models

Each model manifest declares version, domain, internal units, valid ranges,
assumptions, limitations, sources, numerical tolerance, and reference vectors.
Inputs must be finite and within range. Model verification compares outputs to
reference vectors before the lesson can depend on them.

Students see controllable variables, visible evidence, comparisons, concise
language, and prompts. Equations, solvers, diagnostic ranges, and assumptions
stay in developer or instructor tooling.

## Assessment and mastery

Assessment is a deterministic session state machine. Incorrect responses show
an evidence-directed hint and allow the declared retry behavior. Correctly
resolved prompts record one aggregate evidence item.

Mastery requires the configured evidence count and all required kinds.
Production reference worlds require independent observation, misconception,
and transfer evidence. No individual student identity is introduced.

## Diagnostics and acceptance

Developer diagnostics expose active profile, FPS, draw calls, visible
triangles, registered resources, and budget issues. They are isolated from the
student lesson.

Automated release gates cover:

- world graph and reference validation;
- fixed-clock and lifecycle determinism;
- resource disposal;
- quality selection and downgrade;
- PBR color spaces and fallbacks;
- Rapier contacts and snapshots;
- scientific reference vectors;
- mastery behavior;
- strict type-check and production build;
- generated artifact freshness.

Direct Quest acceptance must separately record stable 72 FPS, controller
mapping, label readability, comfort, lifecycle behavior, complete learning
flow, asset integrity, temperature, and memory.
