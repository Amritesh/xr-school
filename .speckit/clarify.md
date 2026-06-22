# Spec Kit Clarifications — XR School Lab Platform

Open questions and resolved decisions. New questions go at the top.

---

## Open Questions

### OQ-001: Scoring Formula for Pre/Post Understanding
**Question:** How are pre-check and post-check scores calculated? Are they averages across the batch? Median? Instructor-estimated 0–1?
**Impact:** `packages/evaluation-engine/` scoring logic
**Status:** OPEN
**Decision needed from:** programOwner

---

### OQ-002: Conflict Resolution for Offline Sync
**Question:** When a sync conflict occurs (device has data, server has newer version of same record), which wins?
**Impact:** `SyncJob` conflict resolution; `apps/api/` sync handler
**Status:** OPEN — interim decision: server wins for all session logs (immutable append-only)
**Decision needed from:** programOwner, supportOps

---

### OQ-003: State Board Curriculum Completeness
**Question:** Which state boards are in scope for first content release? Assam State Board only? Or all NE states?
**Impact:** `CurriculumMap` data entry scope
**Status:** OPEN
**Decision needed from:** programOwner

---

### OQ-004: Language Pack Priority
**Question:** English-only for MVP? Or bilingual (English + Assamese) from the start?
**Impact:** `languagePackIds` in `CurriculumMap`; Quest app UI; cue card text
**Status:** OPEN — English-only for MVP is the safe assumption
**Decision needed from:** programOwner

---

### OQ-005: Instructor Tablet App vs Web
**Question:** Is the instructor's session management interface a mobile web app (PWA) or native tablet app?
**Impact:** `apps/web/` vs native app investment
**Status:** OPEN — interim: minimal web form for MVP; tablet PWA is next phase
**Decision needed from:** programOwner

---

## Resolved

### RQ-001: Individual Student Login
**Question:** Should MVP support individual student login for longitudinal tracking?
**Resolution:** NO. Evaluation is batch-level. Individual login adds complexity (device assignment, privacy, roster management) that is out of scope for MVP.
**Date resolved:** MVP scope definition

---

### RQ-002: CRM Implementation
**Question:** Should MVP include a school CRM for lead management?
**Resolution:** NO. CRM models exist as TypeSpec shells but are not implemented. Sales happen manually.
**Date resolved:** MVP scope definition

---

### RQ-003: Primary API Framework
**Question:** Fastify vs NestJS?
**Resolution:** Fastify. Lighter weight for MVP, easier to keep API surface close to TypeSpec. NestJS introduces decorator-driven abstractions that can obscure contract drift. If team scales and needs NestJS structure, this decision can be revisited with documentation.
**Date resolved:** MVP scope definition

---

### RQ-004: Quest App Platform
**Question:** Meta Quest only, or also PCVR / other platforms?
**Resolution:** Meta Quest only. All 10 headsets are Meta Quest. No PCVR, no Pico, no HTC. `Meta XR SDK` used only where Quest-specific features (guardian, passthrough) are required.
**Date resolved:** MVP scope definition

---

### RQ-005: Content Bundle Strategy (Unity)
**Question:** Unity AssetBundles vs Addressables vs custom?
**Resolution:** Unity Addressables. More mature API, supports per-module remote loading path (for future OTA), better memory management than raw AssetBundles. Custom bundling adds unnecessary maintenance.
**Date resolved:** Tech stack definition
