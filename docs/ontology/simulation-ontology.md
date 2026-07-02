# Simulation Ontology

Every simulation in the XR School Lab Platform must be defined against this ontology. It is not a flat list — it is a structured graph of relationships, constraints, and design requirements.

## Ontology Diagram

```mermaid
graph TD
    subgraph SimulationOntology["Simulation Ontology"]
        SM[SimulationModule]
        LC[LearningConcept]
        CM[CurriculumMap]
        CC[CueCard]
        RC[RevisionCard]
        AH[AssessmentHook]
        OCP[OfflineContentPack]
        CV[ContentVersion]
    end

    SM -->|"conceptIds[]"| LC
    SM -->|"curriculumMapIds[]"| CM
    SM -->|"cueCardIds[]"| CC
    SM -->|"revisionCardIds[]"| RC
    SM -->|"assessmentHookIds[]"| AH
    SM -->|"offlineContentPackId"| OCP
    OCP -->|"moduleIds[]"| SM
    CV -->|"entityId"| SM

    CC -->|"conceptId"| LC
    RC -->|"conceptId"| LC
    AH -->|"conceptId"| LC

    LC -->|"parentConceptId"| LC
    LC -->|"prerequisiteConceptIds[]"| LC
    CM -->|"conceptIds[]"| LC
    CM -->|"prerequisiteConceptIds[]"| LC

    WD[WorldDefinition] -->|"entityIds[]"| WED[WorldEntityDefinition]
    WD -->|"environmentId"| ED[EnvironmentDefinition]
    WED -->|"materialId"| PMD[PbrMaterialDefinition]
    WD -->|"scientificModelIds[]"| SMM[ScientificModelManifest]
    WD -->|"assessmentSequenceId"| AS[AssessmentSequence]
    WD -->|"assetManifestId"| AM[AssetManifest]
    WD -->|"acceptanceProfileId"| AP[AcceptanceProfile]
    AP -->|"requiredQualityProfileId"| QP[QualityProfile]
```

## Simulation Required Properties

Every `SimulationModule` must define all of the following. None are optional from a design standpoint (though some are optional in the data model for drafts):

### Identity
- `title` — human-readable name
- `slug` — URL-safe identifier
- `summary` — one paragraph for content managers

### Curriculum Linkage
- `gradeBands[]` — which grade bands this simulation targets
- `subjects[]` — which subjects it covers
- `applicableBoards[]` — CBSE, ICSE, StateBoard
- `stateBoardStates[]` — which state boards if `stateBoard`
- `curriculumMapIds[]` — explicit links to `CurriculumMap` records
- `conceptIds[]` — explicit links to `LearningConcept` records

### Format and Evidence
- `simulationFormat` — immersiveVr | threeSixtyVr | interactive3d | guidedVisualization | practicalLabSimulation | virtualFieldVisit | revisionMode
- `evidenceConfidenceLevel` — experimental | expertDesigned | internallyPiloted | schoolValidated | researchBacked
- `releaseMaturity` — catalogued | inDevelopment | internalQA | pilotReady | schoolValidated
- `xrFitType` — strongVrFit | arTabletFit | normalClassroomBetter | physicalLabBetter | notWorthXr
- `xrFitJustification` — required text: why XR is better than textbook/video/lab for this topic

### Learning Design
- `learningObjective` — one clear measurable outcome
- `scientificConceptExplanation` — what scientific concept is being taught
- `prerequisiteConceptIds[]` — what students must understand first
- `misconceptionsAddressed[]` — common wrong beliefs this simulation corrects
- `visualizationStrategy` — how the concept is made visible
- `interactionStrategy` — how students interact with the simulation
- `imaginationHelperStrategy` — for abstract concepts: how the simulation aids imagination

### Instructor Design
- `instructorScript` — full talking points and facilitation guide
- `batchActivityPrompt` — what the instructor asks the full class (not just headset batch)
- `expectedDurationMinutes` — planned session length
- `maxSessionDurationMinutes` — hard upper limit for safety

### Safety
- `comfortRiskLevel` — low | medium | high
- `safetyNotes[]` — specific comfort or safety instructions

### Assessment
- `cueCardIds[]` — in-simulation concept prompts
- `revisionCardIds[]` — post-session spaced revision cards
- `assessmentHookIds[]` — pre/post/micro quiz hooks

### Packaging
- `offlineContentPackId` — which offline pack bundles this module
- `estimatedPackageSizeMb` — for storage budgeting
- `targetFrameRateFps` — performance target (72fps minimum for Quest)
- `minQuestStorageGb` — minimum device storage required

## XR Fit Classification Rules

| Classification | Meaning | Example Use |
|---|---|---|
| `strongVrFit` | VR provides irreplaceable advantage | Atomic structure, space exploration, dangerous chemical reactions |
| `arTabletFit` | AR on tablet would work better or additionally | Overlaying cell structures on paper diagrams |
| `normalClassroomBetter` | Discussion, debate, teacher explanation is more effective | Literature interpretation, ethical discussions |
| `physicalLabBetter` | Hands-on physical experiment is better | Titration, dissection (where permitted), actual plant growth |
| `notWorthXr` | XR adds no value over existing tools | Simple arithmetic, reading comprehension |

**Rule:** No simulation with `xrFitType: normalClassroomBetter`, `physicalLabBetter`, or `notWorthXr` should be built. These classifications exist to reject bad ideas, not describe built simulations.

## Learning Technique Taxonomy

Every simulation should explicitly implement one or more of these techniques:

| Technique | Description |
|---|---|
| `cueCards` | Floating prompts that focus attention on key observations |
| `conceptPointers` | Visual arrows or highlights pointing to relevant elements |
| `visualAnchors` | Persistent on-screen labels for spatial orientation |
| `guidedExploration` | Student has agency but instructor narrows focus |
| `progressiveReveal` | Concepts revealed in sequence, not all at once |
| `tryPredictObserveExplain` | Student predicts, then watches, then explains |
| `microQuizzes` | 1–3 question check embedded in simulation flow |
| `misconceptionCheck` | Forces confrontation with common wrong belief |
| `revisionMode` | Separate mode to replay key moments with quiz overlay |
| `recapCards` | End-of-simulation summary cards |
| `spacedRevisionHooks` | Tags that suggest when to revisit |
| `beforeAfterUnderstandingChecks` | Pre and post understanding scored questions |
| `instructorTalkingPoints` | On-screen notes only visible in instructor mode |
| `batchActivityPrompts` | Activities designed for the whole class while one batch wears headsets |
| `handsOnInteraction` | Physical interaction with virtual objects |
| `imaginationHelperScenes` | Scenes designed specifically for abstract concepts like atoms, forces, time |

## Curriculum Search Graph

The public curriculum library is generated from four linked record types:

- `CourseRecord` is the board, class, and subject browse container.
- `CurriculumChapterRecord` links one course chapter to its concepts and simulations.
- `LearningConceptRecord` stores canonical names, aliases, prerequisites, related concepts, misconceptions, practical relevance, and search keywords.
- `CurriculumSearchDocument` is the deterministic browser index for courses, chapters, concepts, and simulations.

Every course-to-chapter, chapter-to-concept, and course/chapter-to-simulation reference is validated before generation. Search documents include class, subject, concept, and release-maturity facets so filters cannot bypass launch governance.

## World-Builder Runtime Graph

Each production world is a validated composition rooted at `WorldDefinition`:

- `WorldEntityDefinition` holds explicit transforms, visual references, material links, collider links, interaction tags, and accessibility labels.
- `EnvironmentDefinition` defines the background, fog, physically based lighting, shadow casters, exposure, and tone mapping.
- `PbrMaterialDefinition` defines standard or selectively physical materials plus licensed image-map references and fallbacks.
- `ScientificModelManifest` records internal units, valid ranges, assumptions, limitations, sources, numerical tolerance, and reference vectors. Its formulas remain hidden from the student lesson.
- `AssessmentSequence` requires misconception and transfer prompts and defines the evidence needed for mastery.
- `ExperienceDefinition` records grade tone, objective, stages, meaningful actions, and observable completion evidence for the headless lesson session.
- `InteractionAffordanceDefinition` maps one entity action to equivalent mouse, touch, keyboard, and XR-controller input.
- `SpatialLayoutDefinition` records literal or explained representational scale, eye heights, movement bounds, reach, cue placement, browser clear-view bounds, and minimum label size.
- `AssetManifest` records provenance, redistribution license, author, dimensions, channels, compression, and explicit fallback assets.
- `AcceptanceProfile` binds a world to a quality profile and its frame-rate, draw-call, triangle, and direct-Quest acceptance limits.

Validation fails closed before a world can start when any reference is unresolved; an ID is duplicated; a transform or budget is non-finite; a scale is non-positive; a PBR property is outside its physical range; an asset lacks provenance or licensing; a scientific model lacks reference vectors; or a mastery rule cannot be satisfied. Visual assets may degrade only through declared fallbacks. Scientific state and assessment outcomes never receive cosmetic substitutes.

## Simulation Lifecycle States

```
CATALOGUED → IN_DEVELOPMENT → INTERNAL_QA → PILOT_READY → SCHOOL_VALIDATED
```

Tracked separately from evidence confidence and content-pack lifecycle:

| Release maturity | Public behavior | Required evidence |
|---|---|---|
| `catalogued` | Searchable curriculum candidate; no launch link | Structured catalog record |
| `inDevelopment` | Visible as being built; no public launch link | Assigned implementation work |
| `internalQA` | Launchable test build | Automated gates and internal functional QA |
| `pilotReady` | Launchable for controlled pilots | Quest acceptance, content review, and pilot approval |
| `schoolValidated` | May be labelled school-ready | Completed school evaluation plus `schoolValidated` or `researchBacked` evidence confidence |

**Policy:** launch access begins at `internalQA`. A `schoolStable` claim requires both `releaseMaturity: schoolValidated` and an evidence confidence of `schoolValidated` or `researchBacked`. Deployment alone never advances maturity.

## Simulation Lifecycle Diagram

```mermaid
flowchart LR
    A[Catalogued] -->|Approved scope| B[In development]
    B -->|Build and automated gates pass| C{Internal QA}
    C -->|Pass| D[Pilot ready]
    C -->|Fail| B
    D -->|Controlled school pilot| E{School review}
    E -->|Evidence accepted| F[School validated]
    E -->|Needs changes| B
```
