# Anchored Simulation Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix pollination completion and physical placement first, deploy it, then move circuit to the same anchored design language and deploy again.

**Architecture:** Add a small reusable anchor/placement module for authored scenes, then apply it to pollination and circuit. Keep lesson state logic separate from rendering, and use tests to lock terminal completion and spatial contact rules.

**Tech Stack:** TypeScript, React, Three.js, Vitest, Next.js, GitHub Actions, Vercel.

---

## File structure

- Create `apps/web/lib/world-builder/anchoredPlacement.ts` for reusable anchors, contact poses, and clearance checks.
- Modify `apps/web/components/simulation-experience/BrowserExperienceHud.tsx` and `SimulationExperienceShell.tsx` to support a terminal finished state and separate scale notes.
- Modify `apps/web/components/simulations/PollinationViewer.tsx` to own pollination completion state and pass scale notes separately.
- Modify `apps/web/lib/world-builder/pollinationScene.ts`, `pollinationGarden.ts`, `pollinationTools.ts`, and `pollinationBotany.ts` to use explicit anchors.
- Add/modify `tests/unit/anchored-placement.test.ts`, `pollination-experience.test.ts`, and `pollination-viewer-feedback.test.ts`.
- Later modify `apps/web/components/simulations/CircuitViewer.tsx` and create focused circuit scene anchor helpers/tests.

## Task 1: Terminal completion and evidence-note separation

- [ ] Write failing tests asserting that a completed final pollination lesson can enter a terminal completed UI state and that scale notes are not counted as biological evidence.
- [ ] Run targeted tests and confirm the new tests fail for the current implementation.
- [ ] Add `completed` and `scaleNote` props to the shared shell/HUD, render a completion panel when `completed` is true, and keep scale notes outside the evidence count.
- [ ] Update `PollinationViewer` so final `Complete` sets `completed=true` instead of calling `lesson.next()` again.
- [ ] Run targeted tests and commit.

## Task 2: Reusable anchor placement system

- [ ] Write failing tests for anchor contact helpers: table object rests on surface, bed object remains inside bed bounds, and collision clearance reports overlaps.
- [ ] Run tests and confirm they fail because the helper does not exist.
- [ ] Implement `anchoredPlacement.ts` with `createAnchor`, `placeOnSurface`, `isWithinFootprint`, and `checkClearance`.
- [ ] Run targeted tests and commit.

## Task 3: Pollination anchored layout

- [ ] Write failing tests that inspect exported pollination anchor diagnostics for flower bed placement, table tool placement, fruit/seed separation, and germination cutaway separation.
- [ ] Run tests and confirm they fail against the current scene constants.
- [ ] Re-author pollination garden/tools/scene coordinates around named anchors.
- [ ] Add `pollinationLayout.ts` if needed to keep constants reusable.
- [ ] Run targeted tests, inspect browser screenshots, and commit.

## Task 4: Pollination verification and deploy

- [ ] Run targeted pollination tests.
- [ ] Run `npm run verify` and `npm run spec:drift`.
- [ ] Browser-test the full pollination path through final completion.
- [ ] Merge to `main`, push, watch GitHub Quality and Deploy to Vercel.
- [ ] Verify live production pollination route returns `HTTP 200`.

## Task 5: Circuit anchored layout and completion

- [ ] Write failing circuit anchor/completion tests for board sockets, wire endpoints, resistor/bulb/battery contact, electron path constraints, and final completion.
- [ ] Run tests and confirm they fail against the current monolithic viewer.
- [ ] Extract reusable circuit layout constants/helpers, apply anchor rules, and add terminal completion.
- [ ] Browser-test the circuit path.
- [ ] Run full verification, merge/push/deploy, and verify live production circuit route.

## Self-review

- Spec coverage: completion, placement, UI clarity, pollination-first deploy, circuit-second deploy are each represented.
- Placeholder scan: no TBD/TODO/later placeholders remain.
- Type consistency: helper names are stable and limited to the files listed above.
