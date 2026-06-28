# Showcase Release Governance and VR Controls Design

**Date:** 28 June 2026  
**Status:** Approved for implementation  
**Platform:** Meta Quest VR headset and browser-based showcase  
**Delivery mode:** Incremental direct releases to `main`, with deployment verification after each release

## Objective

Turn the current XR School application into a professional showcase that is honest about simulation maturity, easy to explore by curriculum concept, and reliable to operate on Meta Quest.

The work begins with the functional feedback for Plant Pollination & Growth Cycle, then introduces platform-wide release governance, a searchable curriculum schema, and a polished hybrid showcase/catalog experience.

## Product Direction

The selected direction is a hybrid experience:

- A polished showcase surface communicates the product value and highlights verified simulations.
- A curriculum library underneath supports discovery by class, subject, chapter, course, concept, and release level.
- Release and evidence badges remain visible so unfinished or unvalidated simulations are never represented as school-ready.
- Search results connect a user to the relevant course material, concepts, and launchable simulation.

## Release Sequence

### Release 0: Baseline

Merge the existing product work, excluding operating-system and temporary visual-companion files. Run the complete quality gate, push to `main`, and verify the live website before continuing.

### Release 1: Intentional VR Button Selection

Controller trigger input must only activate a navigation control when the controller ray intersects that control. Trigger presses aimed at the room, garden, cue card, or any other non-interactive surface must do nothing.

Button hover/aim feedback must make the current target clear. Selection must be edge-triggered so a held trigger cannot advance multiple stages.

### Release 2: Joystick View Control

Enable comfort-safe controller view rotation in immersive VR:

- Horizontal thumbstick input performs snap rotation.
- Rotation uses a dead zone and input latch.
- One intentional deflection produces one snap.
- The default snap angle is 30 degrees.
- No artificial forward locomotion is introduced because the simulation design system requires stationary or teleport-only movement.

Browser OrbitControls remain available outside immersive VR.

### Release 3: B/X Back Navigation

Map the Quest B and X buttons to a Back action:

- If the learner is beyond the first stage, Back returns to the previous stage.
- At the first stage, Back ends the immersive session and navigates to `/simulations`.
- A held button cannot cause repeated navigation.
- Browser navigation retains the existing Previous control.

### Release 4: Left-Side Navigation

Place Previous and Next controls in a consistent left-side VR navigation panel. The panel must remain readable and accessible without obscuring the central learning scene or cue card.

The panel follows the learner's comfortable viewing orientation while preserving deliberate controller-ray selection.

### Release 5: Release Governance

Introduce one canonical simulation maturity field:

| Maturity | Meaning | Public launch behavior |
|---|---|---|
| `catalogued` | Curriculum opportunity exists; implementation may not exist | No launch |
| `inDevelopment` | Runtime or content is incomplete | No launch |
| `internalQA` | Complete enough for team and device testing | Launch enabled with testing badge |
| `pilotReady` | Internal QA and Quest acceptance criteria passed | Launch enabled with pilot badge |
| `schoolValidated` | Successfully used in a school session with evaluation evidence | Launch enabled and eligible for school-stable presentation |

Maturity is distinct from evidence confidence:

- `evidenceConfidenceLevel` describes educational validation.
- `releaseMaturity` describes implementation readiness.
- A module is `schoolStable` only when `releaseMaturity` is `schoolValidated` and evidence is `schoolValidated` or `researchBacked`.

Every simulation and generated catalog row must have a maturity classification. Public pages must not describe all generated archetype rows as ready to launch. Catalogued and in-development rows remain discoverable but clearly gated.

## Curriculum and Search Schema

### Course

A course is the primary browse container:

```ts
interface CourseRecord {
  id: string;
  title: string;
  board: 'cbse' | 'icse' | 'stateBoard';
  classLevel: number;
  gradeBand: GradeBand;
  subject: Subject;
  academicYear?: string;
  description: string;
  chapterIds: string[];
  conceptIds: string[];
  simulationIds: string[];
  searchKeywords: string[];
}
```

### Curriculum Chapter

```ts
interface CurriculumChapterRecord {
  id: string;
  courseId: string;
  chapterNumber: number;
  title: string;
  topicIds: string[];
  conceptIds: string[];
  simulationIds: string[];
}
```

### Learning Concept

```ts
interface LearningConceptRecord {
  id: string;
  canonicalName: string;
  aliases: string[];
  subject: Subject;
  description: string;
  parentConceptId?: string;
  prerequisiteConceptIds: string[];
  relatedConceptIds: string[];
  commonMisconceptions: string[];
  practicalRelevance: string;
  searchKeywords: string[];
}
```

### Search Document

The browser receives a deterministic static search index generated from courses, chapters, curriculum maps, concepts, and simulation modules:

```ts
interface CurriculumSearchDocument {
  id: string;
  kind: 'course' | 'chapter' | 'concept' | 'simulation';
  title: string;
  summary: string;
  href: string;
  classLevels: number[];
  subjects: Subject[];
  conceptIds: string[];
  releaseMaturity?: SimulationReleaseMaturity;
  tokens: string[];
}
```

Search is case-insensitive, alias-aware, and ranked:

1. Exact title or canonical concept match
2. Title prefix match
3. Alias match
4. Keyword, summary, or related-concept match

Filters for class, subject, and release maturity apply after the text match. Empty search shows the curated course and simulation browse view.

## User Experience

The catalog page includes:

- A compact product header and professional hero
- A top-level concept/course search bar
- Class-band, subject, and maturity filters
- A featured simulation area containing only launchable, explicitly classified modules
- Course and chapter groupings
- Simulation cards with class, subject, concepts, duration, comfort level, maturity, and evidence
- Disabled launch treatment with a plain-language reason for gated simulations
- Responsive layouts suitable for laptop demonstrations and Quest Browser

The home page introduces the platform and routes visitors into the searchable library without manually duplicating simulation metadata.

## Architecture

- `packages/simulation-schema` owns release, course, chapter, concept, and search-document types plus validation.
- `packages/simulation-content` owns canonical records for implemented simulations and their curriculum links.
- Catalog generation converts the source CSV and canonical records into deterministic web data.
- `apps/web/lib` owns pure filtering, ranking, release-label, and launch-gating functions.
- React components render the showcase/catalog and use the pure library functions.
- Pollination controller handling is separated into testable pure input-state helpers where practical, while Three.js wiring remains inside the viewer.

## Error Handling and Data Integrity

- Catalog validation fails when a simulation has no maturity level.
- Duplicate IDs, slugs, course references, concept references, or search-document IDs fail validation.
- Broken course → chapter → concept → simulation references fail validation.
- A maturity/evidence combination that claims school-stable eligibility without school validation fails validation.
- Search treats missing optional fields as empty data and never breaks page rendering.
- Unsupported XR input sources leave browser controls operational and do not fabricate navigation events.

## Testing

Implementation follows test-first development:

- Unit tests cover controller ray selection, snap-turn dead zones and latching, B/X back behavior, maturity gating, schema validation, reference integrity, search ranking, and filtering.
- Regression tests confirm the trigger cannot advance without a button hit.
- Catalog tests confirm every row is classified and unfinished rows are not launchable.
- Component/source-contract tests confirm left-side VR navigation and professional catalog elements.
- The repository quality gate must pass before every release.
- Each deployed release is verified in the browser at the production URL before the next release starts.
- Quest-specific interactions that cannot be automated in a desktop browser are marked as requiring direct headset acceptance; they cannot advance beyond `internalQA` solely from browser tests.

## Deployment Policy

Each release is a dedicated commit pushed directly to `main`, as explicitly requested. The deployment workflow is monitored to completion. The production page is then checked for the expected version and behavior.

If a quality check, push, deployment, or production verification fails, the sequence stops at that release. The failure is diagnosed and corrected before later releases proceed.

## Acceptance Criteria

- Triggering away from a VR button never advances the pollination stage.
- Thumbsticks provide comfort-safe snap rotation.
- B/X performs deterministic Back behavior.
- VR navigation controls appear on the learner's left.
- Every simulation has a visible, enforced release maturity.
- Unfinished simulations are discoverable but never mislabeled as ready.
- Course, chapter, concept, and simulation data form a validated searchable index.
- Visitors can search by concepts such as pollination, fertilisation, resistance, current, matter, and solubility.
- The home and catalog pages are professional enough for a stakeholder demonstration.
- Every release is tested, pushed to `main`, deployed, and production-verified before the next release.
