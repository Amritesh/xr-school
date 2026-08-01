# XR School Simulation Authoring Standard

Status: normative for every new or substantially revised simulation.

This standard turns a simulation contribution into a released XR School class. It applies to browser, touch, keyboard, and Quest delivery. It separates public availability from evidence maturity: a class may be released for use while its device and classroom evidence remains at internal QA.

## Canonical module template

`ImplementedSimulationDefinition` is the unit of contribution. It contains `module`, `kind`, `experience`, `assessment`, `narration`, `assets`, `legacyPaths`, and `contribution`. The canonical registry is the only release inventory. A route, API, classroom picker, search index, report, or viewer registry must derive its identity from that record rather than maintain another list.

The example below is illustrative. It shows the required ownership and evidence fields, including a contribution migrated from PR #8.

```ts
import type { ImplementedSimulationDefinition } from '@xr-school/simulation-schema';

export const ancientFortClass: ImplementedSimulationDefinition = {
  module: {
    id: 'sim-c05-ch10-a01-a-visit-of-ancient-fort',
    slug: 'c5-ch10-a01-a-visit-of-ancient-fort',
    title: 'A Visit of an Ancient Fort',
    viewerKey: 'guided-ancient-fort',
    boards: ['cbse'],
    gradeBands: ['class3To5'],
    subjects: ['environmentalScience', 'history'],
    simulationFormat: 'virtualFieldVisit',
    expectedDurationMinutes: 10,
    stages: 8,
    publicationStatus: 'released',
    evidenceMaturity: 'internalQA',
    legacyAliases: ['walls-tell-stories-ancient-fort-visit'],
  },
  kind: 'guided',
  experience: ancientFortExperience,
  assessment: ancientFortAssessment,
  narration: {
    locale: 'en-IN',
    speaker: 'XR School guide',
    cues: ancientFortNarrationCues,
  },
  assets: ancientFortAssets,
  legacyPaths: ['/simulations/walls-tell-stories-ancient-fort-visit'],
  contribution: {
    source: 'pr-8',
    contributor: 'Aditya',
    integration: 'new-class',
  },
};
```

Use the canonical curriculum slug and a stable `viewerKey`. Aliases preserve links but never become a second class. `publicationStatus` controls launch availability. `evidenceMaturity` records what has actually been verified. Never create a web-local catalog, API-local simulation array, or report-only identity.

## Definition, domain, and scene boundaries

The definition declares curriculum, stages, normalized actions, required evidence, assessment intents, narration cues, assets, aliases, and provenance. It contains no renderer, animation loop, input listener, browser global, or mutable lesson state.

A pure domain function determines the scientific or instructional outcome. It accepts validated state and input and returns an explicit result. The same input must produce the same result. Non-finite values and out-of-range parameters are rejected before evaluation.

A scene adapter projects domain and lesson state into visual state. It may create topic-specific meshes, labels, animations, focus targets, and evidence observations through the host context. It never creates its own renderer, WebXR session, animation loop, audio singleton, resize listener, input stack, or competing lesson machine.

The shared runtime owns renderer and WebXR lifecycle, frame timing, normalized input, presentation quality, pause/resume, audio, asset fallback, rollback, and resource disposal. The shared lesson controller owns stage gating. The shared shell owns launch, captions, help, feedback, assessment, replay, restart, and completion presentation.

## Predict-test-observe-explain and misconceptions

Every investigation uses a complete learning loop:

1. Predict a result or state an observable expectation.
2. Test through the declared learner action.
3. Observe evidence from the domain and scene, not from a shortcut.
4. Explain the result and reconcile the named misconception.
5. Apply the idea to a transfer case.

Guided classes may begin with an observation rather than a prediction only when prediction would be artificial or unsafe. They must still require a meaningful action, observable evidence, explanation, and transfer.

Forward progress requires the stage's declared action and declared evidence. Unknown or disallowed actions never advance the lesson. A generic Next control cannot manufacture evidence. Previous-stage navigation is available only for completed stages and cannot invalidate scored evidence without an explicit restart.

Misconceptions are authored as testable alternatives, not vague warnings. Feedback names what was observed, why the prediction was or was not supported, and what the learner should inspect next. The correct answer is not revealed before the learner has a fair observation opportunity.

## Evidence, assessment, and mastery

Each stage declares one action ID and one completion evidence ID. Scene evidence is recorded only after the observable event occurs. Answer evidence is recorded only after a valid response to the linked assessment intent. An assessment records prompt, choices or response contract, correct reasoning, misconception feedback, attempts, and the stage that consumes it.

Completion is not mastery. Completion means the learner reached the end through valid gates. Mastery additionally requires the observations, misconception resolution, and transfer evidence declared by the definition. Reports and dashboards must not infer mastery from a route load, button press, elapsed time, or completion screen.

Evidence maturity remains honest:

- `internalQA`: automated checks and local browser review are complete.
- Device evidence: signed only after the specified headset/browser matrix is exercised.
- Classroom evidence: signed only after a recorded supervised classroom session.
- School-stable claims: reserved for the release policy threshold and its evidence records.

## Browser, touch, keyboard, and Quest equivalence

Mouse, touch, keyboard, and Quest controllers map to the same normalized action IDs. Each modality reaches the same learning action, validation, evidence, feedback, assessment, restart, and completion behavior.

The minimum mappings are visible and testable:

- Mouse or touch activates the focused authored target.
- Keyboard provides an equivalent focus and commit path without hidden-only shortcuts.
- Quest select activates the same target through the same action router.
- Back, help, replay narration, pause, and restart have equivalent reachable controls.

A controller button cannot answer a question, fabricate observation evidence, select the correct category, or skip a stage. Primary input commits the currently valid authored interaction only. Hidden convenience controls are permitted for developer diagnostics only and must not ship in the learner path.

## Narration, captions, and audio ownership

Every narration cue has a stable ID, exact caption text, text hash, locale, speaker metadata, stage link, and fallback policy. `audioUrl` is present only when the committed file exists and its hash and byte size match the manifest. Captions remain available even when audio cannot start.

One shared sound manager owns narration and effects. Starting a cue stops the previous cue cleanly. Pause, page visibility, restart, route unmount, and disposal stop or suspend owned audio. A scene adapter never owns a global `Audio`, `AudioContext`, speech queue, or provider client.

`browserTts` is an accessibility fallback, not evidence of packaged narration. The explicit authoring command may call an approved provider. `prebuild`, `build`, `verify`, CI, and deployment may not install voice dependencies or call a voice provider.

Use these commands:

```bash
npm run narration:validate
npm run narration:author -- --manifest <definition-path> --provider edge-tts
```

The second command is an explicit authoring action. It is never invoked by the first command or by a production build.

## Asset provenance and fallbacks

Every asset manifest records:

- stable ID and public URL;
- media kind, dimensions, byte size, and content hash;
- compression or encoding method;
- source URL or repository contribution;
- author or contributor;
- license or usage status;
- explicit fallback behavior.

PR #8 panoramas are credited to PR #8 and its contributor. If an externally generated image lacks documented tool, model, source, or license evidence, provenance is recorded as unknown. Do not invent attribution. Unknown provenance is a release risk that must be visible in review.

Environment failure falls back to the declared color or local environment without blocking the lesson. A failed optional effect is omitted. A missing required teaching asset fails the current class with a recoverable message and a diagnostic ID. Remote runtime assets are not allowed unless the release manifest explicitly permits and verifies them.

## Comfort and Quest performance budgets

Quest Baseline is the mandatory immersive profile:

- minimum steady target: 72 FPS;
- maximum 120 draw calls;
- maximum 250,000 visible triangles;
- one 1024 px shadow map and bounded dynamic lighting;
- capped renderer pixel ratio and adaptive quality downgrade order;
- no full-screen post-processing in the baseline profile;
- local-floor stationary start by default;
- locomotion only inside finite authored bounds;
- head-relative snap turn or explicit no-turn policy;
- visible focus and reachable interaction targets;
- declared comfort risk and safety notes.

Smooth locomotion or turn is opt-in, never assumed. Reduced-motion preferences replace non-essential continuous motion, large camera transitions, and scale travel with static states or cross-fades. Performance acceptance records device, browser, profile, duration, draw calls, triangles, frame rate, warnings, and build SHA.

## Accessibility and reduced motion

Each class provides semantic launch controls, keyboard focus, visible focus indication, captions, narration replay, readable contrast, sufficient target size, and feedback that does not depend on color or audio alone. The layout must remain usable at narrow browser widths and with text zoom.

Reduced motion does not remove evidence or shorten the learning sequence. It lowers or removes ambient motion, changes smooth movement to snap/static transitions, and retains all actions, observations, captions, feedback, and assessments. Audio failure never hides caption text. Headset-only affordances always have a browser-accessible equivalent.

## Error handling and resource disposal

Invalid input, unknown action IDs, illegal stage transitions, and non-finite domain state fail the current action with a recoverable learner message. They do not crash the route, silently coerce a scientific result, or advance evidence.

Initialization is transactional. If any host or adapter subsystem fails, already initialized systems roll back in reverse order. Disposal attempts every registered cleanup even when one cleanup fails, then aggregates and reports failures. It covers animation callbacks, XR sessions, listeners, observers, timers, narration/effects, object URLs, textures, materials, geometry, render targets, controls, scene attachments, and the renderer-owned canvas.

Pause and visibility changes suspend time-dependent behavior. Resume resets frame timing so a hidden interval cannot create a large physics or animation jump.

## Required automated tests

Every contribution includes behavioral tests at the appropriate boundaries:

- Domain unit tests exercise reference vectors, invalid ranges, deterministic outcomes, and misconception cases.
- Lesson-controller tests prove action plus evidence gating, rejection of skips, assessment attempts, previous/restart behavior, completion, and mastery distinction.
- Scene-adapter tests prove cue projection, authored target registration, evidence timing, pause/resume, partial-initialization rollback, and complete disposal.
- Input tests prove mouse, touch, keyboard, and Quest dispatch the same action IDs.
- Audio tests prove stable cue IDs, captions, manifest integrity, fallback behavior, overlap prevention, and stop/dispose behavior.
- Route tests execute canonical pages and legacy redirects and resolve the exact registered viewer.
- Playwright tests exercise launch, the primary learning action, observable feedback, narration/captions, restart, completion, accessibility hooks, and asset responses.

Source-text assertions are reserved for narrow policy checks such as forbidding deep package imports or provider calls in builds. They are never proof that a class interaction works.

Focused commands vary by class, but every author runs the relevant unit files and package checks, followed by the root gate:

```bash
npm test -- tests/unit/<domain>.test.ts tests/unit/<lesson>.test.ts tests/unit/<scene>.test.ts
npm --workspace apps/web run type-check
npm --workspace apps/web run build
npm run narration:validate
npm run verify
```

## Review and release checklist

- [ ] The canonical record contains module, kind, experience, assessment, narration, assets, legacy paths, and contribution provenance.
- [ ] Registry IDs, slugs, viewer keys, routes, API records, classroom launches, catalog rows, search documents, and report inputs agree exactly.
- [ ] The class implements action and evidence gates; unknown actions and controller shortcuts cannot advance it.
- [ ] Domain outputs and misconception cases pass reference-vector tests.
- [ ] Mouse, touch, keyboard, and Quest use the same normalized action IDs.
- [ ] Narration IDs, captions, hashes, committed audio files, and fallback policy validate with `npm run narration:validate`.
- [ ] Asset hashes, dimensions, compression, provenance, license status, and fallbacks are complete.
- [ ] Quest Baseline budgets, comfort policy, focus visibility, captions, and reduced motion are declared.
- [ ] Initialization rollback and full resource disposal are behaviorally tested.
- [ ] Canonical routes, legacy redirects, browser learning actions, feedback, restart, completion, and asset responses pass acceptance tests.
- [ ] `npm run verify` passes from the release candidate and generated outputs remain unchanged afterward.
- [ ] Quality scorecards and shareable reports are regenerated and structurally and visually verified.
- [ ] `publicationStatus` and `evidenceMaturity` are reported separately.
- [ ] Device and classroom evidence remains unsigned until the corresponding recorded session occurs.

Reviewers reject clone renderers, duplicate content arrays, source-only interaction tests, generic stage advancement, missing captions, undeclared assets, fabricated provenance, networked builds, or evidence claims unsupported by a recorded gate.
