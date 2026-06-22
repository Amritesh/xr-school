# Spec Kit Specification — XR School Lab Platform

## Version: 0.1.0
## Status: Foundation Complete

---

## Specified Domains

### 1. Curriculum Domain (ACTIVE)

**Entities:** `LearningConcept`, `CurriculumMap`  
**Status:** Specced, TypeSpec defined, ontology documented  
**Contract:** `/v1/learning-concepts`, `/v1/curriculum-maps`

A `LearningConcept` is a canonical, board-agnostic representation of a scientific or subject concept. It forms a DAG (directed acyclic graph) where nodes are concepts and edges are prerequisite relationships.

A `CurriculumMap` is a board-specific topic entry that links to one or more `LearningConcept` records and carries XR fit classification with mandatory justification.

**Constraints:**
- Every `CurriculumMap` must link to at least one `LearningConcept`
- `xrFitJustification` is required — no silent XR decisions
- `misconceptions` are required at concept level, not topic level

---

### 2. Simulation Domain (ACTIVE)

**Entities:** `CueCard`, `RevisionCard`, `AssessmentHook`, `SimulationModule`  
**Status:** Specced, TypeSpec defined, design system documented  
**Contract:** `/v1/cue-cards`, `/v1/revision-cards`, `/v1/assessment-hooks`, `/v1/simulation-modules`

A `SimulationModule` is the complete unit of VR content. It must trace to curriculum maps and concepts. It carries the full design brief including instructor script, cue cards, assessment hooks, and safety notes.

**Constraints:**
- `instructorScript` is required (4-section structure: setup, during, debrief, revision)
- `xrFitType` must be `strongVrFit` or `arTabletFit` for built simulations
- `comfortRiskLevel` must be declared; high-risk requires safety notes
- Minimum 3 cue cards, minimum 1 pre-check + 1 post-check assessment hook

---

### 3. Offline/Packaging Domain (ACTIVE)

**Entities:** `OfflineContentPack`, `ContentVersion`, `SyncJob`  
**Status:** Specced, TypeSpec defined, deployment architecture documented  
**Contract:** `/v1/offline-content-packs`, `/v1/sync-jobs`

Content is modular, versioned, and release-channeled. Packs are installed via USB sideload, not OTA. Session data is queued locally and synced when internet is available.

**Constraints:**
- No single monolithic content bundle
- `requiresInternetAfterInstall: false` for all released packs
- Package size targets per grade band (see simulation design system)
- Release channel progression: internal → pilot → schoolStable → regionalStable

---

### 4. Operations Domain (ACTIVE)

**Entities:** `Instructor`, `School`, `LabDeployment`, `HardwareKit`, `BatchSession`  
**Status:** Specced, TypeSpec defined, rotation model documented  
**Contract:** `/v1/batch-sessions`

Sessions are instructor-led, batch-sequential, anonymous. Each batch of 10 students generates one `BatchSession` record. A 40-student class = 4 `BatchSession` records per module visit.

**Constraints:**
- `anonymousParticipantCount` not individual student IDs
- `instructorProvidedByUs: true` for all MVP deployments
- Batch size: 10 (matches headset count)
- Class size: 40 (standard Indian classroom)

---

### 5. Evaluation Domain (ACTIVE)

**Entities:** `EvaluationRecord`  
**Status:** Specced, TypeSpec defined  
**Contract:** `/v1/evaluation-records`

Evaluation is batch-level. No individual student tracking. 15+ fields captured per batch session including pre/post scores, engagement, misconceptions, and comfort issues.

**Constraints:**
- One `EvaluationRecord` per `BatchSession`
- Pre/post scores are proportional (0.0–1.0)
- `syncStatus` field is required (offline-first)
- `instructorObservation` is free text (qualitative, not replaced by metrics)

---

### 6. AI/Storybook Boundary Domain (SHELL)

**Entities:** `StorybookComponentBoundary`, `AIChangeRequest`  
**Status:** Specced, boundaries documented, not deeply implemented  
**Purpose:** Governance, not runtime

---

### 7. Future Extension Shell (FROZEN)

**Entities:** `CRMLead`, `Proposal`, `BillingPlan`  
**Status:** TypeSpec models exist, no routes, no implementation  
**Rule:** These domains receive no further investment until explicitly moved to active scope
