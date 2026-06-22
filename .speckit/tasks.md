# Spec Kit Tasks — XR School Lab Platform

## Active Sprint: Phase 1 API Core

Priority order follows the vertical slice: curriculum → simulation → packaging → sessions → evaluation.

---

### T-001: Initialize apps/api (Fastify)
**Priority:** P0  
**Domain:** API  
**Estimate:** 2 days  
**Depends on:** Nothing

Steps:
1. `npm create fastify@latest apps/api` or manual scaffold
2. TypeScript config
3. Prisma setup with SQLite dev schema
4. Vitest config
5. `npm run dev` starts a hello world route

Acceptance: `apps/api` starts and returns 200 on `/health`

---

### T-002: Prisma schema — curriculum entities
**Priority:** P0  
**Domain:** API / DB  
**Estimate:** 1 day  
**Depends on:** T-001

Model: `LearningConcept`, `CurriculumMap`  
Includes: all TypeSpec fields, correct relations, JSON fields for arrays

Acceptance: `npx prisma migrate dev` runs without errors

---

### T-003: LearningConcept API routes
**Priority:** P0  
**Domain:** API  
**Estimate:** 1 day  
**Depends on:** T-002

Routes: `GET /v1/learning-concepts`, `POST /v1/learning-concepts`, `GET /v1/learning-concepts/:id`  
Validation: subject enum, prerequisiteConceptIds exist

Acceptance: 3 Vitest tests pass (list, create, get)

---

### T-004: CurriculumMap API routes
**Priority:** P0  
**Domain:** API  
**Estimate:** 1 day  
**Depends on:** T-003

Routes: `GET /v1/curriculum-maps`, `POST /v1/curriculum-maps`, `GET /v1/curriculum-maps/:id`  
Validation: board enum, xrFitJustification required, conceptIds exist

Acceptance: 3 Vitest tests pass (list, create, get with concept links)

---

### T-005: Prisma schema — simulation entities
**Priority:** P1  
**Domain:** API / DB  
**Estimate:** 1 day  
**Depends on:** T-002

Models: `CueCard`, `RevisionCard`, `AssessmentHook`, `SimulationModule`

Acceptance: migration runs

---

### T-006: Simulation card API routes
**Priority:** P1  
**Domain:** API  
**Estimate:** 1 day  
**Depends on:** T-005

Routes for CueCard, RevisionCard, AssessmentHook (create + get)

Acceptance: Vitest tests pass

---

### T-007: SimulationModule API routes
**Priority:** P1  
**Domain:** API  
**Estimate:** 2 days  
**Depends on:** T-004, T-006

Routes: `GET /v1/simulation-modules`, `POST /v1/simulation-modules`, `GET /v1/simulation-modules/:id`  
Validation: curriculumMapIds exist, conceptIds exist, xrFitType must be strongVrFit or arTabletFit

Acceptance: Integration test creates full SimulationModule with cards and curriculum links

---

### T-008: Evaluation engine — scoring
**Priority:** P1  
**Domain:** packages/evaluation-engine  
**Estimate:** 1 day  
**Depends on:** T-001 (vitest setup)

Functions:
- `calculateImprovement(pre: number, post: number): number`
- `validateBatchCount(batchSize: number, classSize: number): number`
- `isValidScore(score: number): boolean`

Acceptance: 10+ Vitest tests including edge cases (0 pre-score, perfect post-score, 0 class size)

---

### T-009: BatchSession and EvaluationRecord API routes
**Priority:** P1  
**Domain:** API  
**Estimate:** 2 days  
**Depends on:** T-007, T-008

Routes for BatchSession (create + list + get) and EvaluationRecord (create + list + get)  
Evaluation create: auto-calculates improvementPercent

Acceptance: Vitest integration test creates session → creates evaluation → reads improvement

---

### T-010: OfflineContentPack and SyncJob API routes
**Priority:** P2  
**Domain:** API  
**Estimate:** 1 day  
**Depends on:** T-007

Routes: `POST /v1/offline-content-packs`, `GET /v1/offline-content-packs`, `GET /v1/sync-jobs`

Acceptance: Create a pack linking to a simulation module; verify size fields

---

### T-011: Seed data
**Priority:** P2  
**Domain:** API / DB  
**Estimate:** 0.5 days  
**Depends on:** T-009

Seed: 5 LearningConcepts (Physics, Chemistry), 3 CurriculumMaps (CBSE Class 9), 1 SimulationModule (Atomic Structure)

Acceptance: `npx prisma db seed` succeeds; GET /v1/simulation-modules returns 1 module

---

### T-012: Web admin scaffold
**Priority:** P2  
**Domain:** apps/web  
**Estimate:** 1 day  
**Depends on:** T-007

Next.js App Router setup, Tailwind, basic layout  
No pages yet — just scaffold + Storybook

---

### T-013: Simulation module list + detail pages
**Priority:** P2  
**Domain:** apps/web  
**Estimate:** 2 days  
**Depends on:** T-012

Pages: `/modules` (list), `/modules/[id]` (detail)  
Storybook stories required for every reusable component

Acceptance: List renders module cards; detail renders full module with curriculum links

---

### BACKLOG (Not in active sprint)

| Task | Domain | Notes |
|---|---|---|
| Evaluation record web view | apps/web | After T-013 |
| Quest app scaffold | apps/quest | Parallel Unity work |
| Quest offline catalog reader | apps/quest | After pack spec finalized |
| Auth (JWT) for admin | apps/api | Phase 2 |
| Prisma → PostgreSQL migration | apps/api | After SQLite MVP |
| Language pack model | packages/shared | Future |
| CRM / billing / proposals | All | FROZEN |
