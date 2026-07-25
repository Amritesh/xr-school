# Site-Wide XR School Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the homepage’s approved visual language to the public curriculum website while leaving the homepage and classroom experiences unchanged.

**Architecture:** Keep the homepage isolated and unchanged. Promote its visual constants into the existing global catalog CSS without touching Robotree or simulation implementations.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS, Vitest

---

### Task 1: Lock the design contract

**Files:**
- Create: `tests/unit/site-design-language.test.ts`

- [ ] Add assertions for the shared palette, display type, texture, pill controls, responsive behavior, reduced motion, and Robotree brand lockup.
- [ ] Run `npm test -- tests/unit/site-design-language.test.ts` and confirm it fails because the legacy surfaces do not expose the new tokens.

### Task 2: Retheme the curriculum library

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] Replace the legacy dark catalog palette with homepage-derived global tokens.
- [ ] Restyle navigation, hero, filters, cards, metrics, empty states, and release policy using the editorial system.
- [ ] Preserve all existing class hooks and responsive behavior.

### Task 3: Verify and deliver

**Files:**
- Verify only

- [ ] Run the focused design-contract test, full test suite, TypeScript check, and production build.
- [ ] Inspect the catalog at desktop and mobile widths.
- [ ] Confirm `apps/web/app/page.tsx` and `apps/web/app/home.css` have no diff.
- [ ] Stage only in-scope files, create one commit, and push `main`.
