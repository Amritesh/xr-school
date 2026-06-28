# Spec Kit Implementation Plan — XR School Lab Platform

## Guiding Principle

Build the vertical slice first. Every phase must produce something runnable and testable before moving to the next phase. No horizontal layers.

The vertical slice:
```
LearningConcept → CurriculumMap → CueCard → RevisionCard → AssessmentHook 
  → SimulationModule → OfflineContentPack → BatchSession → EvaluationRecord → SyncJob
```

---

## Phase 0: Foundation (COMPLETE)

**Goal:** TypeSpec compiles. OpenAPI generated. Docs exist. Drift check works.

### Completed
1. TypeSpec contract — `contracts/typespec/main.tsp` ✓
2. OpenAPI generated — `generated/openapi/openapi.json` ✓
3. All 8 domain docs written ✓
4. Drift check script — `scripts/spec-drift-check.mjs` ✓
5. GitHub Actions CI — `.github/workflows/quality.yml` ✓
6. Spec Kit artifacts — `.speckit/` ✓

---

## Phase 0A: Toolchain and Catalog Preflight

**Goal:** Make the active repo state and the Class 5-10 science catalog safe for implementation.

**Duration estimate:** 2-3 days

### Step 1: Toolchain preflight
- Add `scripts/dev-env-check.mjs`
- Add `npm run env:check`
- Ensure Node 22+ is active before TypeSpec/Vitest checks
- Verify required catalog/spec files exist

**Verify:** `node scripts/dev-env-check.mjs` exits 0 under Node 23.

### Step 2: Typed catalog source
- Create `packages/simulation-schema`
- Create `packages/simulation-content`
- Convert `docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv` into typed content data
- Add catalog validation tests

**Verify:** Catalog tests confirm 497 rows, unique slugs, valid enums, and max duration <= 12.

### Step 3: Existing demo normalization
- Move `pollination` and `circuit` metadata into shared content
- Fix invalid `class8To10`
- Make API, web catalog, and tests import shared records

**Verify:** Existing simulation validation passes and no duplicate fixture data remains.

---

## Phase 1: API Core

**Goal:** A simulation module can be created, linked to curriculum, and returned via API.

**Duration estimate:** 2–3 weeks

### Step 1: API normalization
- Split current `apps/api/src/index.ts` into route modules
- Keep `/health` and current simulation list/get behavior working
- Import simulation records from `packages/simulation-content`
- Decide whether this phase uses in-memory repositories or Prisma/SQLite

**Verify:** API tests pass and `GET /v1/simulation-modules` returns normalized shared records.

### Step 2: Curriculum endpoints
- `POST /v1/learning-concepts`
- `GET /v1/learning-concepts`
- `GET /v1/learning-concepts/:conceptId`
- `POST /v1/curriculum-maps`
- `GET /v1/curriculum-maps`
- `GET /v1/curriculum-maps/:curriculumMapId`

**Verify:** Vitest tests pass. Manual POST + GET cycle works.

### Step 3: Simulation endpoints
- `POST /v1/cue-cards`
- `POST /v1/revision-cards`
- `POST /v1/assessment-hooks`
- `POST /v1/simulation-modules`
- `GET /v1/simulation-modules`
- `GET /v1/simulation-modules/:moduleId`

**Verify:** Create a full SimulationModule with linked concepts and curriculum maps.

### Step 4: Offline/packaging endpoints
- `POST /v1/offline-content-packs`
- `GET /v1/offline-content-packs`
- `GET /v1/sync-jobs`

**Verify:** Create an offline pack linking to the simulation module.

### Step 5: Session and evaluation endpoints
- `POST /v1/batch-sessions`
- `GET /v1/batch-sessions`
- `POST /v1/evaluation-records`
- `GET /v1/evaluation-records`

**Verify:** Create a full batch session + evaluation record. Confirm improvement percent calculated.

---

## Phase 2: Evaluation Engine

**Goal:** Scoring logic is tested and correct.

**Duration estimate:** 1 week

### Steps
1. `packages/evaluation-engine/scoring.ts` — pre/post improvement calculation
2. `packages/evaluation-engine/rotation.ts` — batch count validation
3. `packages/evaluation-engine/sync.ts` — sync status transitions
4. 20+ Vitest tests covering edge cases (zero scores, single batch, conflict states)

---

## Phase 3: Minimal Web Admin

**Goal:** A content manager can create and view simulation modules.

**Duration estimate:** 2–3 weeks

### Steps
1. Initialize `apps/web/` as Next.js App Router project
2. Simulation module list + detail pages
3. Simulation module create form (schema-driven)
4. Curriculum map list + detail pages
5. Evaluation records view (by school + grade)
6. Storybook setup + stories for all reusable components

---

## Phase 4: Quest App (Parallel with Phase 2+)

**Goal:** A simulation can run offline on a Quest headset.

**Duration estimate:** 6–8 weeks (Unity team)

### Steps
1. Unity project setup with OpenXR + Meta XR SDK
2. Offline catalog reader (JSON)
3. Cue card display component
4. Instructor mode overlay
5. Session log writer
6. First simulation: Atomic Structure (Class 9, Physics)
7. USB sideload installer workflow

---

## What We Are Not Building Yet

| Feature | Phase |
|---|---|
| Authentication / JWT | Phase 2+ (admin auth) |
| CRM / leads | Future shell only |
| Billing | Future shell only |
| Proposals | Future shell only |
| Multiplayer VR | Future |
| AR / tablet | Future |
| Individual student login | Future |
| Language packs (Assamese, Bengali) | Future |
| Parent app | Future |
