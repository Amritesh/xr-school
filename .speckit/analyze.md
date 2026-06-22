# Spec Kit Analysis — XR School Lab Platform

## Codebase State (Phase 0 Complete)

### What Exists

```
xr-school/
├── contracts/
│   └── typespec/
│       ├── tspconfig.yaml          ✓ compiles
│       └── main.tsp                ✓ 20 routes, 35+ models
├── generated/
│   └── openapi/
│       └── openapi.json            ✓ generated, valid OpenAPI 3.0.0
├── docs/
│   ├── specs/
│   │   ├── product-brief.md        ✓
│   │   ├── mvp-scope.md            ✓
│   │   └── future-extension-shell.md ✓
│   ├── ontology/
│   │   ├── simulation-ontology.md  ✓ with 4 Mermaid diagrams
│   │   └── curriculum-ontology.md  ✓ with 2 Mermaid diagrams
│   ├── er/
│   │   └── entity-relationship.md  ✓ with full ER diagram
│   ├── simulation-design/
│   │   └── simulation-design-system.md ✓
│   ├── offline-quest/
│   │   └── offline-deployment.md   ✓ with 3 architecture diagrams
│   ├── school-ops/
│   │   └── batch-rotation-model.md ✓ with sequence diagram
│   └── ai-boundaries/
│       └── ai-agent-boundaries.md  ✓ with 7 prompt templates
├── scripts/
│   └── spec-drift-check.mjs        ✓ 5 rules, exits 1 on violations
├── .github/
│   └── workflows/
│       └── quality.yml             ✓ compile + test + drift check
├── .speckit/
│   ├── constitution.md             ✓
│   ├── specify.md                  ✓
│   ├── clarify.md                  ✓ 5 open questions, 5 resolved
│   ├── checklist.md                ✓
│   ├── plan.md                     ✓ 4 phases
│   ├── tasks.md                    ✓ 13 tasks, backlog
│   └── analyze.md                  ← this file
├── apps/
│   ├── web/                        (empty, scaffold pending)
│   ├── api/                        (empty, scaffold pending)
│   └── quest/                      (empty, Unity team)
├── packages/
│   ├── shared/                     (empty)
│   ├── curriculum-engine/          (empty)
│   ├── simulation-schema/          (empty)
│   └── evaluation-engine/          (empty)
└── package.json                    ✓ Node 23, npm workspaces
```

---

## Contract Coverage Analysis

### Entities vs Routes

| Entity | GET list | GET by ID | POST create | PUT/PATCH | DELETE |
|---|---|---|---|---|---|
| LearningConcept | ✓ | ✓ | ✓ | - | - |
| CurriculumMap | ✓ | ✓ | ✓ | - | - |
| CueCard | - | ✓ | ✓ | - | - |
| RevisionCard | - | ✓ | ✓ | - | - |
| AssessmentHook | - | ✓ | ✓ | - | - |
| SimulationModule | ✓ | ✓ | ✓ | - | - |
| OfflineContentPack | ✓ | ✓ | ✓ | - | - |
| BatchSession | ✓ | ✓ | ✓ | - | - |
| EvaluationRecord | ✓ | ✓ | ✓ | - | - |
| SyncJob | ✓ | ✓ | - | - | - |

Missing routes for MVP (can be added as needed):
- List for CueCard, RevisionCard, AssessmentHook (add when needed by query patterns)
- PUT/PATCH for content updates (add when edit workflow is needed)
- DELETE endpoints (may not be needed; use status fields instead)

---

## Risk Analysis

### High Risk

1. **Node.js version dependency:** TypeSpec 1.x requires Node ≥ 22 (`fs/promises.glob`). The project is on nvm. CI uses Node 23. Local developers must use nvm. Mitigation: Document in README; add `.nvmrc` file.

2. **Quest offline storage:** 128 GB per device, ~108 GB available for content. If simulations are large (1+ GB each), storage becomes a constraint at ~100 modules. Mitigation: Package size targets per grade band; modular packs with pruning strategy.

3. **Sync conflict resolution:** When a Quest headset is offline for extended periods (weeks), bulk sync may hit API rate limits or produce conflicts. Mitigation: Append-only session logs; server wins on conflict.

### Medium Risk

4. **TypeSpec version compatibility:** The project uses TypeSpec 1.13.0. Future upgrades may break `main.tsp` syntax. Mitigation: Lock exact versions; upgrade with contract recompile verification.

5. **Evaluation without individual logins:** Pre/post scores are batch estimates, not per-student. This limits the precision of learning outcome measurement. This is a known product trade-off, not a bug.

6. **CurriculumMap data volume:** Full CBSE + ICSE + State Board curriculum across all grades and subjects could be thousands of records. MVP data entry will be manual. Mitigation: Focus on Class 6–12 CBSE first; state board and lower grades next.

### Low Risk

7. **Storybook not yet scaffolded:** The Storybook requirement is in the drift check but the tooling isn't set up yet. Risk: developers skip stories before Storybook is wired into CI. Mitigation: T-012 scaffolds Storybook before any UI work starts.

---

## Readiness Assessment

| Area | Status | Blocker |
|---|---|---|
| TypeSpec contract | READY | None |
| OpenAPI generation | READY | None |
| Ontology documentation | READY | None |
| ER diagram | READY | None |
| Drift check | READY | None |
| CI pipeline | READY | None (apps don't exist yet — build job disabled) |
| API implementation | NOT STARTED | Needs T-001 through T-010 |
| Web admin | NOT STARTED | Needs API first |
| Quest app | NOT STARTED | Unity team parallel track |
| Evaluation engine | NOT STARTED | Needs T-008 |

**Phase 0 is complete. Phase 1 is ready to start.**

## Recommended First Implementation

Start with T-001 (Fastify scaffold) → T-002 (Prisma schema) → T-003 (LearningConcept routes) → T-004 (CurriculumMap routes).

This gives you a running API with the curriculum foundation in approximately 4–5 days.
