# Aditya Simulation Suite Integration and Library Standardization Design

**Date:** 2026-08-01
**Status:** Approved for implementation
**PR:** GitHub PR #8, `Adityakrpand/xr-school:aditya-work` at `621dfb61b39a4c49e8abb46ce60c54ea3d044479`

## Purpose

Integrate all 23 simulation contributions from Aditya's PR #8 into current `main`, publish 22 net-new classes, enhance the already-released Solubility class with the overlapping contribution, and replace the PR's duplicated viewer scaffolding with a coherent simulation library. The same work will produce evidence-backed quality reports that show what was weak, what changed, and how future classes should be built.

This is not a mechanical merge. PR #8 is 117 commits behind `main`, conflicts with the current architecture, and contains 23 contributed viewers while describing 22 new classes. The count differs because its Soluble/Insoluble viewer overlaps the existing canonical Solubility class. The PR adds 16,846 lines across those viewers, duplicates existing runtime concerns, and fails a clean-checkout narration test because 173 of 189 referenced clips are absent.

## Product and Release Decisions

1. All 23 contributions will be represented after the release: 22 net-new classes will be publicly available and the overlapping Solubility contribution will improve the existing released class.
2. Public availability and evidence maturity are separate facts:
   - `publicationStatus: released` means a class is visible and launchable.
   - `evidenceMaturity: internalQA` means it has not yet passed signed Quest and classroom acceptance.
3. Public UI and API responses may say that a class is released, but must also expose its evidence maturity. They must not imply school validation.
4. Direct Quest-device and classroom evidence will remain explicitly unverified until those sessions occur.
5. Existing, newer Pollination, Circuit, and Solubility implementations on `main` remain authoritative. PR versions will not replace them.

## Integration Strategy

Use a proper two-parent merge so the contribution remains attributable and GitHub can recognize PR #8 as merged.

1. Create an isolated integration worktree and branch from current `main`.
2. Fetch PR #8 by immutable head SHA.
3. Merge the PR head with `--no-commit`.
4. Resolve conflicts in favor of current `main` for root manifests, CI, generated catalogs, existing simulations, and architecture files.
5. Retain the educational value of all 23 contributions: lesson content, relevant scene behavior, compatible routes, panoramas, and narration text.
6. Commit the resolved merge with both `main` and PR #8 as parents.
7. Apply library, simulation, test, asset, and reporting improvements as focused follow-up commits.
8. Push the verified integration head to `origin/main` without force.

The user's existing uncommitted `package.json` change and `.claude/` directory are outside the integration scope and must remain untouched.

## Canonical Simulation Identities

The curriculum catalog already defines canonical slugs. New records and routes use those identities rather than creating a second naming system. The PR URLs remain available as compatibility redirects.

| PR slug | Canonical slug |
|---|---|
| `walls-tell-stories-ancient-fort-visit` | `c5-ch10-a01-a-visit-of-ancient-fort` |
| `up-you-go-snow-mountain-climbing` | `c5-ch09-a04-snow-mountain-climbing` |
| `up-you-go-camp-in-snow` | `c5-ch09-a03-camp-in-the-snow` |
| `up-you-go-rock-climbing` | `c5-ch09-a02-rock-climbing` |
| `up-you-go-river-crossing-adventure` | `c5-ch09-a01-river-crossing-adventure` |
| `treat-for-mosquitoes-mosquito-life-cycle` | `c5-ch08-a02-life-cycle-of-the-mosquito` |
| `treat-for-mosquitoes-malaria-diagnosis` | `c5-ch08-a01-diagnosis-of-malaria` |
| `experiments-with-water-float-or-sink` | `c5-ch07-a01-a-concept-about-what-floats-what-sinks` |
| `experiments-with-water-dead-sea-salt-water` | `c5-ch07-a02-dead-sea-salt-water-and-its-effects` |
| `experiments-with-water-soluble-insoluble` | `c5-ch07-a03-soluble-and-insoluble-substances` |
| `every-drop-counts-rainwater-storage` | `c5-ch06-a01-the-storage-of-rainwater` |
| `every-drop-counts-stepwell-structure` | `c5-ch06-a02-a-step-well-structure` |
| `seeds-and-seeds-seed-dispersal` | `c5-ch05-a02-seed-dispersal` |
| `seeds-and-seeds-pitcher-plant` | `c5-ch05-a01-pitcher-plant-the-insect-hunter` |
| `mangoes-round-the-year-aam-papad` | `c5-ch04-a03-the-making-of-aam-papad` |
| `mangoes-round-the-year-milk-spoilage` | `c5-ch04-a02-milk-spoilage` |
| `mangoes-round-the-year-food-spoilage` | `c5-ch04-a01-food-spoilage` |
| `sorting-materials-by-shape` | `c6-ch04-a01-sorting-materials-according-to-their-shape` |
| `fibre-to-fabric-cotton-farming` | `c6-ch03-a01-cotton-farming` |
| `fibre-to-fabric-cotton-ginning` | `c6-ch03-a02-the-process-of-cotton-ginning` |
| `components-of-food-mineral-sources` | `c6-ch02-a05-the-sources-of-minerals-in-food` |
| `components-of-food-vitamins-deficiencies` | `c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies` |
| `components-of-food-lipid-test` | `c6-ch02-a03-test-the-presence-of-lipids` |

## Target Library Architecture

### `@xr-school/simulation-schema`

A pure TypeScript package containing public simulation, lesson, action, assessment, spatial, asset, release, and quality contracts plus runtime validators.

- Export only supported public entry points.
- Emit ESM JavaScript and declarations.
- Define `exports`, `types`, dependencies, build, type-check, and test scripts.
- Mechanically verify fields shared with TypeSpec so API and runtime contracts cannot silently drift.

### `@xr-school/simulation-content`

The sole source of truth for implemented modules.

Each module definition contains:

- canonical identity and legacy aliases;
- curriculum, board, grade, subject, and learning objective;
- `publicationStatus` and `evidenceMaturity`;
- duration, comfort classification, scale disclosure, and safety notes;
- stage, normalized action, evidence, misconception, and transfer definitions;
- narration and asset manifests;
- route and viewer key;
- instructor, batch-companion, and debrief content.

API records, web cards, classroom content, route validation, search generation, reports, and narration checks derive from this registry.

### `@xr-school/simulation-runtime`

The headless deterministic layer for lesson state, assessment, scientific models, physics, fixed time, and resource ownership.

- All simulations use `createLessonSession`, normalized actions, and evidence-gated progression.
- Completion never implies mastery.
- Mastery requires observation, misconception resolution, and transfer evidence where applicable.
- Scientific outcomes live in testable domain functions rather than renderer constants.
- Rigid-body simulations use the canonical Rapier boundary.

### `@xr-school/simulation-web`

A new renderer-facing package containing Three.js and WebXR integration:

- WebXR-compatible shared render lifecycle;
- adaptive Quest/browser presentation profiles;
- renderer, camera, scene, resize, pause, and disposal ownership;
- bounded VR rig, head-relative snap turning, normalized controller actions, and exit behavior;
- shared environment, lighting, material, interaction, focus, and spatial-cue utilities;
- exclusive narration/audio ownership;
- asset loading, fallbacks, diagnostics, and resource registration;
- testable hooks that do not depend on a Next.js route.

It must reuse and relocate the stronger current `world-builder`, `vr`, and audio behavior. The PR's `questVrControls.ts`, `narrationAudio.ts`, and `realisticEnvironment.ts` will not survive as competing abstractions.

### Web application

`apps/web` becomes composition rather than infrastructure:

- thin route files;
- one shared launch and browser/VR experience shell;
- a registry that resolves a canonical module to a scene adapter;
- reusable accessibility, caption, audio, progress, help, restart, and completion UI;
- legacy URL redirects.

### Other packages and API

- Turn `evaluation-engine` into a real workspace package with public exports and tests.
- Give every shared package complete dependency metadata and build/type-check scripts.
- Change the API to import canonical module records rather than maintaining a local array.
- Fix the existing API TypeScript errors and include API/shared-package builds in root verification.

## Simulation Composition Model

Every released class is composed from three explicit units:

1. **Definition:** curriculum metadata, stages, meaningful actions, evidence, assessment, narration, safety, and assets.
2. **Domain behavior:** pure state/scientific functions that convert learner actions into observable outcomes.
3. **Scene adapter:** a focused renderer projection of domain state with no private lesson machine, audio owner, input scheme, or animation lifecycle.

The data flow is:

`canonical registry -> lesson session -> normalized action -> domain behavior -> evidence -> assessment -> lesson snapshot -> browser/VR presentation`

Browser mouse, touch, keyboard, and Quest controller actions pass through the same action IDs. A controller button may trigger the current permitted action, but cannot supply the correct answer, fabricate observation evidence, or skip a stage.

## Migration Families

The 23 contributed implementations fall into two implementation families.

### Guided experiences

The 17 primarily linear experiences use one declarative guided-simulation engine. A module supplies stage definitions and a scene adapter; the engine supplies lifecycle, UI, input, audio, evidence, navigation, accessibility, completion, and cleanup.

Generic Previous/Next navigation is allowed only for revisiting completed stages. Forward progression requires the stage's declared action and evidence.

### Interactive investigations

Float or Sink, Soluble/Insoluble, Lipid Test, Mineral Sources, Vitamin Deficiencies, and Shape Sorting retain richer mechanics through domain-specific behavior adapters. They still use the same runtime, action, evidence, assessment, audio, UI, and disposal foundations.

The existing main Solubility laboratory remains canonical. Compatible useful content from the PR's overlapping Soluble/Insoluble viewer can enhance that implementation without creating a duplicate class identity.

## Narration and Audio

- Released builds are deterministic and offline-capable.
- Production build steps must not install Python packages, call a voice service, or generate tracked assets.
- Narration generation is an explicit authoring command, never a web `prebuild` hook.
- A generated narration manifest maps stable narration IDs to committed files, text hashes, speaker metadata, duration, and locale.
- Validation fails when a released module references a missing or corrupt required clip.
- Captions always expose the narration text.
- Browser speech synthesis is an optional accessibility fallback, not evidence that packaged narration exists.
- One sound manager owns narration and effects so instructions never overlap.

## Assets, Performance, and Comfort

- Every asset records source, contributor/author, license status, dimensions, compression, and fallback.
- PR panoramas are recorded as contributions from PR #8; undocumented external-generation provenance remains visible as an audit limitation rather than being invented.
- Environment assets receive Quest-safe optimized variants while retaining a suitable browser source.
- Quest uses the existing baseline budget: 72 FPS target, bounded draw calls/triangles, capped pixel ratio, and no full-screen post-processing.
- Scene resources are registered and disposed through one resource registry.
- Locomotion uses movement bounds and current head-relative snap-turn behavior.
- Comfort classification comes from the canonical catalog; hazardous or height-based lessons cannot default to `low` without evidence.
- Every module provides captions, audio controls, visible focus, reduced-motion behavior, responsive browser UI, and equivalent input actions.

## Error Handling

Released modules fail closed when required contracts or assets are invalid.

- Registry validation reports duplicate slugs, aliases, routes, viewer keys, and missing curriculum references.
- A missing required narration or asset fails verification. At runtime, a declared visual fallback may be used only when the manifest explicitly permits it.
- Invalid domain inputs and non-finite scientific state stop the action and produce a recoverable learner-facing message.
- Unknown or disallowed actions never advance lesson state.
- Initialization rollback disposes every initialized system.
- Disposal aggregates errors while attempting all cleanup.
- Browser/VR session exits preserve or deliberately reset lesson state according to one documented rule.

## Quality and Reporting System

The existing eight-dimension, 100-point rubric remains authoritative:

| Dimension | Weight |
|---|---:|
| Educational effectiveness | 20 |
| Content/scientific integrity | 15 |
| Learner interactivity | 15 |
| Visual and asset quality | 15 |
| Narration and sound | 10 |
| Usability, accessibility, and comfort | 10 |
| Performance and stability | 10 |
| Deployment readiness | 5 |

Scores are evidence-backed product indicators, not measured learning outcomes.

### Required artifacts

1. `output/pdf/xr-school-implemented-simulations-quality-report.md`
2. `output/pdf/xr-school-implemented-simulations-quality-report.pdf`
3. `output/pdf/xr-school-new-simulations-top-10-mistakes.md`
4. `output/pdf/xr-school-new-simulations-top-10-mistakes.pdf`
5. `reports/data/implemented-simulation-quality-cards.json`
6. `reports/data/implemented-simulation-quality-evidence.json`
7. `reports/data/new-simulation-before-after-scorecard.json`
8. `docs/simulation-design/simulation-authoring-standard.md`

### Portfolio report

The updated portfolio report covers all 35 publicly launchable canonical simulations exactly once: the previous 13 plus 22 net-new classes. It contains portfolio averages, readiness distribution, ranked scorecards, explicit limitations, and one quality card per simulation. The contribution appendix and before/after dataset cover all 23 PR implementations, including the Solubility implementation that was merged into an existing class.

For every new simulation it records:

- baseline score at immutable PR head `621dfb61`;
- baseline evidence and defect references;
- implemented remediation;
- post-integration score and evidence;
- score delta;
- remaining risk and recommended next action.

No dimension score increases unless a referenced implementation or verification result supports the increase.

### Top-ten mistakes report

The separate report explains these portfolio-level mistakes with file examples, measurable impact, remediation, and prevention rules:

1. unsupported release and evidence claims;
2. competing sources of truth;
3. source-text tests instead of behavior tests;
4. incomplete narration assets;
5. network-dependent production builds;
6. dead Quest narration wiring;
7. controller shortcuts that bypass learning;
8. slideshow progression instead of meaningful interaction;
9. clone-and-modify architecture;
10. unverified performance, cleanup, comfort, accessibility, and asset provenance.

### Authoring standard

The authoring standard turns the remediation into a repeatable contribution process. It defines the module template, architecture boundaries, TPOE and misconception patterns, evidence rules, interaction equivalence, narration/asset requirements, comfort budgets, tests, review checklist, and release evidence.

## Testing and Verification

### Unit and contract tests

- Schema and registry validation.
- Canonical/legacy slug resolution.
- Lesson progression and disallowed-action behavior.
- Assessment retries, hints, observation, misconception, transfer, and mastery.
- Pure domain models and reference vectors.
- Narration manifest completeness and hashes.
- Asset manifest completeness and provenance fields.
- Quality scoring arithmetic and report completeness.

### Integration tests

- Shared web runtime initialization, fixed updates, rendering projection, pause/resume, and disposal.
- Browser, keyboard, touch, and Quest actions map to equivalent normalized actions.
- Audio exclusivity, replay, captions, fallback, and stop behavior.
- Route, registry, API, web catalogue, classroom catalogue, and search all resolve the same modules.
- API Fastify injection tests validate responses against the public contract.

Source-file string assertions do not count as behavioral coverage and will be replaced or demoted to narrow static-policy checks.

### Browser acceptance

- Every one of the 35 canonical routes returns successfully and mounts its intended experience; every legacy PR URL resolves to its canonical class.
- Every new class can start, perform its primary learning action, expose feedback, replay narration, restart, and complete without console errors.
- Required assets load without 404/403 responses.
- Representative interactive families receive deeper Playwright flows.
- Responsive, keyboard, focus, caption, and reduced-motion checks run for the shared shell.

### Build and repository gates

Root `verify` must cover:

- environment and lockfile consistency;
- TypeSpec compile and contract drift;
- canonical catalog validation and generation;
- all shared package builds/type-checks/tests;
- API build and integration tests;
- web type-check and production build;
- narration and asset manifests;
- report data validation;
- browser smoke tests that are reliable in CI.

`git diff --check` and generated-file freshness are final gates.

### Production verification

After pushing `main`:

- confirm the deployed commit or deployment reflects the pushed SHA;
- check the public catalogue, all 22 net-new canonical routes, the enhanced Solubility route, and every legacy redirect;
- record HTTP, console, canvas, asset, launch, and representative interaction evidence;
- update post-deployment evidence without overstating Quest or classroom acceptance.

## Success Criteria

The work is complete when:

1. PR #8 is represented by a real merge parent in `main` history.
2. All 23 contributions are represented: 22 net-new classes are publicly released under canonical identities, the existing Solubility class contains the compatible enhancement, and legacy URLs redirect correctly.
3. The API, web catalogue, classroom catalogue, search, routes, and reports derive from one registry.
4. No new viewer owns a duplicate render lifecycle, input stack, audio singleton, generic progression system, or environment loader.
5. Released module progression is evidence-gated and controller shortcuts cannot fabricate success.
6. Production builds require no narration network access or Python installation.
7. Shared packages have documented public exports and participate in verification.
8. All required unit, integration, browser, type-check, build, asset, narration, and report checks pass.
9. The 35-simulation portfolio quality report, 23-contribution before/after evidence, and top-ten mistakes report exist in both Markdown and visually verified PDF form where specified.
10. The pushed production deployment is checked and all remaining device/classroom limitations are explicit.

## Non-goals and Honest Limitations

- This release cannot create classroom learning-outcome evidence without school sessions.
- This release cannot claim direct Quest performance, comfort, temperature, or controller acceptance without physical-device testing.
- The reports will distinguish those absent external validations from repository and browser evidence.
- Unrelated persistence, Unity/offline-content-pack, and full TypeSpec endpoint implementation are not expanded beyond what is required to make this simulation suite coherent and verifiable.
