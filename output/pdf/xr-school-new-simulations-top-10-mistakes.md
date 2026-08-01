# XR School New Simulations: Top 10 Portfolio Mistakes

**Review scope:** 23 PR #8 contributions at immutable head `621dfb61b39a4c49e8abb46ce60c54ea3d044479`

**Before/after indicator:** 55.4/100 baseline to 76.3/100 integrated internal QA

This is a neutral portfolio-learning report. It identifies repeatable system and authoring mistakes so future classes can preserve useful curriculum ideas while meeting a consistent library contract.

The immutable baseline contained 23 contributed viewers and 16,846 viewer lines. It referenced 189 narration requests, tracked 16 clips, and therefore left 173 requests without committed clips.

Internal/browser evidence does not replace signed Quest acceptance or controlled classroom evidence.

## 1. Unsupported release and evidence claims

### Examples

At immutable PR head 621dfb61, apps/api/src/index.ts assigned status: 'released' and evidenceConfidenceLevel: 'expertDesigned' without a separate maturity record.

### Measurable impact

All 23 contributions appeared release-ready despite 0 signed Quest runs and 0 classroom studies.

### Remediation

The integrated registry and quality datasets store publicationStatus and evidenceMaturity separately, and every released contribution remains internalQA.

### Prevention rule

Store and display publicationStatus and evidenceMaturity independently.

## 2. Competing sources of truth

### Examples

PR-local SIMULATIONS in apps/api/src/index.ts, route pages, homepage lists, and viewerNameMap in scripts/validate-simulations.mjs could each define different identities.

### Measurable impact

Titles, routes, release claims, and supported classes could drift across API, web, validators, and reports.

### Remediation

packages/simulation-content/src/implemented/registry.ts now supplies canonical identities and routes to API, web, classroom, validation, and reporting consumers.

### Prevention rule

Derive every consumer from IMPLEMENTED_SIMULATIONS.

## 3. Source-text tests instead of behavior tests

### Examples

tests/unit/ancient-fort-visit-viewer.test.ts and tests/unit/float-or-sink-viewer.test.ts read TSX and asserted toContain strings.

### Measurable impact

A string can remain present while progression, input, rendering, narration, cleanup, or feedback behavior is broken.

### Remediation

Integrated tests execute registry resolution, guided controllers, investigation sessions, scientific models, shared host lifecycles, assets, narration, and route loading.

### Prevention rule

Exercise domain/runtime behavior; reserve source-string checks for narrow static policy.

## 4. Incomplete narration assets

### Examples

The immutable PR head referenced 189 narration requests but tracked only 16 clips.

### Measurable impact

173 referenced requests had no committed clip and could silently fall back or fail at runtime.

### Remediation

scripts/validate-narration-manifests.ts now validates committed manifests while packages/simulation-web/src/audio/createNarrationController.ts owns playback and fallback.

### Prevention rule

Validate stable IDs, content hashes, committed files, captions, and an explicit fallback policy.

## 5. Network-dependent production builds

### Examples

apps/web/package.json added a prebuild that installed Python dependencies and invoked edge_tts.

### Measurable impact

Clean builds required package, network, and provider availability and could mutate public assets while releasing.

### Remediation

Narration authoring is an explicit human command; production builds only validate committed manifests and never call a voice provider.

### Prevention rule

Keep narration generation author-only; builds validate committed manifests offline.

## 6. Dead Quest narration wiring

### Examples

apps/web/components/simulations/questVrControls.ts accepted onNarrate as _onNarrate and never called it.

### Measurable impact

The advertised controller narration action could not work even though a callback appeared in the API.

### Remediation

packages/simulation-web/src/input/createWebInputRouter.ts normalizes input and the shared narration controller is the single playback owner.

### Prevention rule

Route a tested normalized narration action through one audio owner.

## 7. Controller shortcuts bypass learning

### Examples

Contributed viewers wired onPrimary: performAction directly.

### Measurable impact

A controller button could advance without the declared choice, observation, evidence, or assessment step.

### Remediation

Shared guided and investigation controllers gate forward progress through declared lesson actions and evidence.

### Prevention rule

Gate every input through the lesson session and its declared evidence contract.

## 8. Slideshow progression instead of meaningful interaction

### Examples

Guided viewers exposed generic Next buttons that called goToStage(stage + 1).

### Measurable impact

Scene presence could be mistaken for evidence that a learner predicted, acted, observed, or explained.

### Remediation

Canonical definitions declare required stage actions and evidence; Previous revisits completed stages without bypassing forward gates.

### Prevention rule

Forward progression requires the declared stage action; Previous only revisits completed stages.

## 9. Clone-and-modify architecture

### Examples

23 large viewers repeated renderer, animation loop, environment, controls, cards, audio, and disposal logic.

### Measurable impact

The contributed viewers added 16,846 lines and multiplied defect surfaces for every later class.

### Remediation

Definitions in simulation-content, sessions/models in simulation-runtime, and one simulation-web host replace viewer-local infrastructure.

### Prevention rule

Compose definition + domain + scene adapter over shared runtime and web packages.

## 10. Unverified performance, cleanup, comfort, accessibility, and provenance

### Examples

Source-string checks asserted helper names while panorama PNGs lacked a complete source/license record.

### Measurable impact

Performance, lifecycle, comfort, accessibility, and asset claims were not auditable; physical-device risk remained unknown.

### Remediation

Shared host lifecycle tests, bounded locomotion, caption/input contracts, asset manifests with hashes/credits, browser acceptance, and separate device evidence fields make gaps visible.

### Prevention rule

Require manifests, budgets, behavioral cleanup tests, browser acceptance, and signed device/classroom evidence.

## How to use this report

Apply the prevention rules during class planning, require behavioral evidence before merge, and keep release publication separate from device/classroom maturity. These findings describe an integration baseline and shared engineering responsibilities; they are not personality judgments or a performance review.
