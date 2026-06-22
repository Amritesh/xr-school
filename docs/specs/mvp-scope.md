# MVP Scope

## In Scope

### Core Data Model
- [ ] `LearningConcept` — canonical concept graph, prerequisite chains, misconceptions
- [ ] `CurriculumMap` — board/grade/subject/topic mapped to concepts with XR fit classification
- [ ] `CueCard` — in-simulation prompts linked to concepts
- [ ] `RevisionCard` — post-session spaced revision linked to concepts
- [ ] `AssessmentHook` — pre/post/micro assessment questions linked to concepts
- [ ] `SimulationModule` — full simulation definition with instructor script, assets, evaluation hooks
- [ ] `OfflineContentPack` — versioned, modular content bundle for Quest installation
- [ ] `BatchSession` — instructor-led session record, anonymous, batch-level
- [ ] `EvaluationRecord` — batch-level evaluation: pre/post scores, engagement, misconceptions, comfort
- [ ] `SyncJob` — offline-to-cloud sync queue and status tracking

### Infrastructure
- [ ] TypeSpec contract compiles and generates valid OpenAPI
- [ ] Monorepo structure: `apps/web`, `apps/api`, `apps/quest`, `packages/shared`
- [ ] Drift check: API changes require TypeSpec changes
- [ ] GitHub Actions: compile + test + drift check on every PR

### Web Admin (Minimal)
- [ ] View simulation modules (list + detail)
- [ ] Create/edit simulation modules
- [ ] View curriculum maps
- [ ] Create/edit curriculum maps
- [ ] View evaluation records by school/grade/module
- [ ] View sync job status

### API
- [ ] All routes defined in TypeSpec, implemented in Fastify
- [ ] Server-side validation on all inputs
- [ ] PostgreSQL via Prisma (SQLite for local dev)

### Evaluation (No Individual Login Required)
- [ ] Batch-level pre/post understanding scores
- [ ] Engagement score capture
- [ ] Misconception detection log
- [ ] Instructor observation field
- [ ] Headset comfort/safety issue log
- [ ] Completion rate
- [ ] Offline sync status per record

### Offline Quest App
- [ ] Installable offline package
- [ ] Local simulation runtime
- [ ] Local module catalog (JSON)
- [ ] Local curriculum map reference
- [ ] Local cue card display
- [ ] Local session log
- [ ] Local batch rotation flow
- [ ] Instructor mode
- [ ] Sync queue for later upload

### Content Packaging
- [ ] Modular packs by grade/subject/module (not monolithic)
- [ ] Versioned packs with release channels
- [ ] Local manifest with install status and sync status
- [ ] Package size estimation per module

## Out of Scope for MVP

| Feature | Status |
|---|---|
| Individual student login | Future |
| Payment gateway | Future |
| CRM / lead management | Future shell only |
| Proposals and sales flows | Future shell only |
| Billing | Future shell only |
| Marketplace | Future |
| AI content generation in production | Future |
| Cloud streaming | Future |
| Multiplayer VR | Future |
| AR / tablet delivery | Future |
| Parent-facing app | Future |
| School-self-service portal | Future |
| Multi-language content | Future (Assamese, Bengali first) |

## MVP Success Criteria

1. TypeSpec contract compiles with no errors
2. OpenAPI is generated and matches TypeSpec
3. A simulation module can be created via API with all required fields
4. A batch session can be logged with evaluation record
5. Evaluation record captures all 15+ fields specified
6. Offline content pack can be versioned and manifested
7. Drift check blocks API changes that skip TypeSpec
8. Storybook has stories for all reusable components
9. Vitest passes for scoring, rotation, evaluation, and sync logic
