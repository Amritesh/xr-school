# Spec Kit Acceptance Checklist — XR School Lab Platform

## Phase 0: Foundation (Current)

### Contract and Spec
- [x] `contracts/typespec/tspconfig.yaml` exists and is valid
- [x] `contracts/typespec/main.tsp` exists and compiles with no errors
- [x] `generated/openapi/openapi.json` is generated and valid
- [x] All 10 core entities are in TypeSpec: LearningConcept, CurriculumMap, CueCard, RevisionCard, AssessmentHook, SimulationModule, OfflineContentPack, BatchSession, EvaluationRecord, SyncJob
- [x] Future shell entities exist in TypeSpec but have no routes: CRMLead, Proposal, BillingPlan

### Documentation
- [x] `docs/specs/product-brief.md` — what the product is and is not
- [x] `docs/specs/mvp-scope.md` — explicit in/out of scope
- [x] `docs/specs/future-extension-shell.md` — frozen domain documentation
- [x] `docs/ontology/simulation-ontology.md` — with Mermaid diagrams
- [x] `docs/ontology/curriculum-ontology.md` — with Mermaid diagrams
- [x] `docs/er/entity-relationship.md` — with full ER diagram
- [x] `docs/simulation-design/simulation-design-system.md` — interaction patterns, safety rules, quality checklist
- [x] `docs/offline-quest/offline-deployment.md` — offline architecture, sync flow, content structure
- [x] `docs/school-ops/batch-rotation-model.md` — rotation flow, session model, companion activities
- [x] `docs/ai-boundaries/ai-agent-boundaries.md` — component ownership, allowed/forbidden zones, prompt templates

### Drift Control
- [x] `scripts/spec-drift-check.mjs` exists and runs
- [x] Drift check: blocks API route changes without TypeSpec change
- [x] Drift check: warns on simulation-schema changes without ontology change
- [x] Drift check: blocks reusable component changes without Storybook story
- [x] Drift check: validates generated OpenAPI exists and is valid JSON
- [x] `.github/workflows/quality.yml` — CI with compile, test, drift check

---

## Phase 1: API Implementation (Next)

### Curriculum
- [ ] `apps/api/routes/learning-concepts.ts` — GET list, POST create, GET by ID
- [ ] `apps/api/routes/curriculum-maps.ts` — GET list, POST create, GET by ID
- [ ] Vitest tests for LearningConcept prerequisite cycle detection
- [ ] Vitest tests for CurriculumMap XR fit validation

### Simulation
- [ ] `apps/api/routes/simulation-modules.ts` — GET list, POST create, GET by ID
- [ ] `apps/api/routes/cue-cards.ts`
- [ ] `apps/api/routes/revision-cards.ts`
- [ ] `apps/api/routes/assessment-hooks.ts`
- [ ] Vitest tests: SimulationModule requires at least one curriculum map link
- [ ] Vitest tests: Assessment hook pre/post pair validation

### Offline/Packaging
- [ ] `apps/api/routes/offline-content-packs.ts`
- [ ] `apps/api/routes/sync-jobs.ts`
- [ ] `packages/simulation-schema/` — TypeScript types generated from OpenAPI
- [ ] Vitest tests: pack release channel progression validation
- [ ] Vitest tests: sync status state machine transitions

### Operations
- [ ] `apps/api/routes/batch-sessions.ts`
- [ ] `apps/api/routes/evaluation-records.ts`
- [ ] `packages/evaluation-engine/` — scoring logic
- [ ] Vitest tests: pre/post improvement calculation
- [ ] Vitest tests: batch rotation count validation (4 batches × 10 = 40)

### Database
- [ ] Prisma schema matching TypeSpec models
- [ ] Migrations for all core entities
- [ ] Seed data: 5 LearningConcepts, 3 CurriculumMaps, 1 SimulationModule

---

## Phase 2: Web Admin (Minimal)

- [ ] Simulation module list page
- [ ] Simulation module create/edit page
- [ ] Curriculum map list page
- [ ] Evaluation record list page (by school/grade)
- [ ] Sync job status page
- [ ] Storybook stories for all reusable components

---

## Phase 3: Quest App

- [ ] Offline module catalog (local JSON)
- [ ] Local curriculum map reference
- [ ] Cue card display system
- [ ] Session log writer
- [ ] Sync queue
- [ ] Instructor mode overlay
- [ ] Batch rotation timer
- [ ] Assessment hook triggers
- [ ] First simulation: atomic structure
