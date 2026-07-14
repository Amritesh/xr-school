# Fly-Inspired XR School Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship and deploy an illustration-led public homepage with Fly.io-inspired editorial polish and XR School-specific science content.

**Architecture:** Keep the change isolated to the Next.js home route, a homepage-specific stylesheet, and project-local image assets. Preserve generated catalog data and all destination routes; derive live proof counts from the existing availability helper.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS, Vitest, Playwright, Vercel

---

### Task 1: Lock the homepage contract

**Files:**
- Create: `tests/unit/homepage-design.test.ts`
- Read: `apps/web/app/page.tsx`
- Read: `apps/web/app/globals.css`

- [ ] **Step 1: Write the failing contract test**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('apps/web/app/page.tsx', 'utf8');
const css = readFileSync('apps/web/app/home.css', 'utf8');

describe('editorial homepage design', () => {
  it('leads with the immersive learning promise and primary paths', () => {
    expect(page).toContain('Step inside the lesson');
    expect(page).toContain('/simulations');
    expect(page).toContain('/robotree/login');
    expect(page).toContain('/robotree/headset');
  });

  it('uses contextual artwork and complete homepage sections', () => {
    expect(page).toContain('/home/hero-learning-world.webp');
    expect(page).toContain('home-feature-row');
    expect(page).toContain('home-class-band');
    expect(page).toContain('home-proof');
  });

  it('defines the editorial palette and narrow-screen behavior', () => {
    expect(css).toContain('--home-paper: #f7f5ff');
    expect(css).toContain('--home-purple: #6f35f2');
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('prefers-reduced-motion');
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because `home.css` and the new design are absent**

Run: `PATH=/usr/bin:/bin node node_modules/vitest/vitest.mjs run tests/unit/homepage-design.test.ts`

Expected: FAIL because `apps/web/app/home.css` does not exist.

### Task 2: Create contextual illustration assets

**Files:**
- Create: `apps/web/public/home/hero-learning-world.webp`
- Create: `apps/web/public/home/learning-by-doing.webp`
- Create: `apps/web/public/home/teacher-orchestration.webp`
- Create: `apps/web/public/home/curriculum-worlds.webp`

- [ ] **Step 1: Generate four original, text-free hand-drawn illustrations**

Use the built-in image generator with a shared art direction: indigo imperfect ink outlines; pale lavender, mint, peach, yellow, and electric-purple fills; editorial children's-science-book character; clean matching background; no logos, words, watermarks, gradients, or photorealism.

- [ ] **Step 2: Copy final assets into `apps/web/public/home/` and inspect each at full resolution**

Expected: every asset has clear contextual science imagery, clean edges, no accidental text, and adequate empty space around the subject.

### Task 3: Implement the editorial homepage structure

**Files:**
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/home.css`

- [ ] **Step 1: Replace the current console-led homepage with the approved seven-section hierarchy**

Implement semantic `nav`, `section`, `article`, and `footer` regions; import `next/image`; preserve the three product routes and the six flagship simulation slugs; keep catalog counts derived from `getSimulationCatalogSections`.

- [ ] **Step 2: Add page-scoped CSS tokens and responsive layout rules**

Define `--home-paper`, `--home-ink`, `--home-purple`, `--home-mint`, `--home-peach`, and `--home-yellow`; implement editorial spacing, display typography, alternating feature rows, the purple class band, proof metrics, accessible focus rings, 44px controls, mobile stacking, horizontal class-card snapping, and reduced-motion rules.

- [ ] **Step 3: Run the focused test and confirm it passes**

Run: `PATH=/usr/bin:/bin node node_modules/vitest/vitest.mjs run tests/unit/homepage-design.test.ts`

Expected: 1 test file passed, 3 tests passed.

### Task 4: Verify code and visual behavior

**Files:**
- Modify only if verification exposes a defect: `apps/web/app/page.tsx`, `apps/web/app/home.css`

- [ ] **Step 1: Run the full unit suite**

Run: `PATH=/usr/bin:/bin node node_modules/vitest/vitest.mjs run --reporter=dot`

Expected: all test files and tests pass.

- [ ] **Step 2: Run TypeScript and production build checks**

Run: `PATH=/usr/bin:/bin node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`

Run: `PATH=/usr/bin:/bin node node_modules/next/dist/bin/next build apps/web`

Expected: both commands exit 0.

- [ ] **Step 3: Render desktop and mobile screenshots**

Start the built app and capture full-page screenshots at 1440×1000 and 390×844 with Playwright. Inspect for horizontal overflow, clipping, low contrast, awkward wrapping, asset artifacts, and dead space; make targeted corrections and repeat checks if needed.

### Task 5: Commit, integrate, and deploy

**Files:**
- Review all files changed in Tasks 1–4.

- [ ] **Step 1: Inspect the final diff and commit intentionally**

Run: `git diff --check && git status --short`

Commit: `feat: redesign XR School homepage`

- [ ] **Step 2: Merge the verified branch into `main` and rerun the focused test**

Expected: merge is fast-forward or conflict-free and the homepage test passes on `main`.

- [ ] **Step 3: Deploy the production build using the repository's existing Vercel configuration**

Run the authenticated production deployment command available in the workspace. Record the immutable deployment URL and aliased production URL.

- [ ] **Step 4: Verify production**

Open the production homepage, confirm HTTP 200, confirm “Step inside the lesson” appears, and capture a production screenshot for final visual verification.
