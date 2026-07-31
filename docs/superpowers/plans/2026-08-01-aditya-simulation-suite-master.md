# Aditya Simulation Suite Master Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for implementation, with a specification review and code-quality review after every task. Use `superpowers:test-driven-development` for behavior changes and `superpowers:verification-before-completion` before every commit, push, deployment, or completion claim.

**Goal:** Turn PR #8 into an auditable, standardized, released 35-class simulation library; publish evidence-backed quality and contributor reports; push the verified result to `main`; and verify the Vercel deployment online.

**Architecture:** This is a coordinated index for four detailed subsystem plans. The foundation plan owns merge ancestry and shared contracts. Guided and interactive plans own disjoint content/runtime/scene paths and feed the canonical registry. The report/release plan scores the finished implementation, generates shareable Markdown/PDF artifacts, enforces acceptance, publishes without force, and records deployed evidence.

**Tech Stack:** Git/GitHub, npm workspaces, TypeScript, Vitest, Next.js, React, Three.js/WebXR, Playwright, Python/ReportLab, Vercel.

---

## Approved scope

- Merge GitHub PR #8 from `Adityakrpand/xr-school:aditya-work` at exact SHA `621dfb61b39a4c49e8abb46ce60c54ea3d044479` with a real two-parent merge commit.
- Represent all 23 contributions publicly as released classes/content while keeping the portfolio at 35 unique canonical classes: 13 existing + 22 net-new; PR Soluble/Insoluble enhances canonical Solubility.
- Label browser publication separately from evidence maturity. New classes may be `released/internalQA`; no class is called Quest-verified or classroom-validated without direct evidence.
- Replace duplicated helpers and simulation-specific infrastructure with reusable packages and typed contracts.
- Make all 35 canonical browser routes launchable and preserve PR/legacy links through redirects.
- Generate the portfolio scorecard, top-ten mistakes report, simulation authoring standard, and a dedicated constructive Aditya improvement report in Markdown and PDF.
- Push to `origin/main` without force, monitor GitHub Actions/Vercel, and verify the deployed SHA and routes at `https://xr-school.vercel.app`.
- Preserve unrelated user changes in the primary worktree.

## Detailed plans

1. [Merge and library foundation](./2026-08-01-aditya-merge-library-foundation.md)
2. [Guided classes](./2026-08-01-aditya-guided-classes.md)
3. [Interactive investigations](./2026-08-01-aditya-interactive-investigations.md)
4. [Quality reports and release](./2026-08-01-simulation-quality-reports-and-release.md)

## Execution sequence

### Phase 1: Preserve ancestry and establish shared APIs

Execute foundation Tasks 1-5 in order:

1. fetch the exact PR object and create the two-parent merge;
2. establish buildable workspace packages;
3. add schema/content validation contracts;
4. create the registry infrastructure and wrap the existing 13 classes;
5. create `@xr-school/simulation-web`, the common shell/HUD contract, and canvas host.

Gate:

```bash
npm run type-check:packages
npm run build:packages
npm test
```

Do not start contributed viewer implementation until this gate passes.

### Phase 2: Implement contributed classes

Execute the guided and interactive plans. They may be delegated concurrently only if workers obey these ownership boundaries:

- guided worker owns `packages/simulation-content/src/implemented/guided/**`, `apps/web/lib/simulations/guided/**`, and `apps/web/components/simulations/shared/GuidedSimulationViewer.tsx`;
- interactive worker owns `packages/simulation-content/src/implemented/interactive/**`, its new runtime models/session, `apps/web/lib/simulations/interactive/**`, and interactive viewer components;
- neither worker edits `packages/simulation-content/src/implemented/registry.ts` or `apps/web/lib/simulations/viewerRegistry.ts` while the other is active;
- the root integrator adds both exported arrays/factory maps to those shared registries after the two owned-path implementations pass focused tests;
- asset directories are owned by canonical slug and never overlap.

Guided and interactive implementation both require test-first evidence gating. A controller/button may perform an action, but no class may advance until the domain/scene observation or correct assessment records the required evidence.

Gate:

```bash
npx vitest run tests/unit/implemented-simulation-registry.test.ts tests/unit/guided-simulation-definitions.test.ts tests/unit/interactive-simulation-definitions.test.ts
npx playwright test tests/e2e/guided-simulations.spec.ts tests/e2e/interactive-investigations.spec.ts --project=chromium
```

Expected invariant: 35 unique canonical classes and 23 PR contribution records.

### Phase 3: Finish routing and consumers

Execute foundation Tasks 6-8:

1. integrate the typed viewer registry;
2. establish canonical and legacy routing;
3. move API, classroom sync, search, availability, generators, and validators to the registry;
4. remove transitional PR helper/viewer duplication;
5. run the full strict verification.

Gate:

```bash
npm run verify
```

The gate must include packages, API, web type-check/build, all unit tests, narration validation, registry/report validation, and local browser acceptance after the report plan adds those scripts.

### Phase 4: Generate reports and perform visual QA

Execute report/release Tasks 1-10. The immutable baseline data must describe PR #8 as received; post-integration scores must cite actual source/test/build/browser evidence and retain explicit unverified Quest/classroom limitations.

Required shareable outputs:

- `output/pdf/xr-school-implemented-simulations-quality-report.md`
- `output/pdf/xr-school-implemented-simulations-quality-report.pdf`
- `output/pdf/xr-school-new-simulations-top-10-mistakes.md`
- `output/pdf/xr-school-new-simulations-top-10-mistakes.pdf`
- `output/pdf/aditya-contribution-improvement-report.md`
- `output/pdf/aditya-contribution-improvement-report.pdf`
- `docs/simulation-design/simulation-authoring-standard.md`
- `reports/data/new-simulation-before-after-scorecard.json`

Use the PDF skill's render-and-inspect workflow. Structural PDF tests alone are insufficient: render every page, inspect montages and full-resolution pages, correct clipping/overflow/blank-page defects, then rerun report checks.

Gate:

```bash
npm run reports:validate
npm run reports:check
npm run verify
```

### Phase 5: Independent review

Before publishing, dispatch:

1. a specification reviewer comparing the diff line-by-line with the approved design and all four plans;
2. a code-quality reviewer over `origin/main..HEAD`;
3. a report reviewer checking constructive language, evidence citations, score arithmetic, class/contribution counts, and remaining risks;
4. a browser reviewer checking representative desktop/mobile pages plus all automated route results.

Fix every Critical and Important finding and re-run the affected gates before continuing.

### Phase 6: Push and deployed verification

Execute report/release Task 11. Required safety sequence:

```bash
git fetch origin main
git merge-base --is-ancestor origin/main HEAD
git status --short
npm run verify
git push origin HEAD:main
```

If `origin/main` advanced, preserve merge topology with `git rebase --rebase-merges origin/main` or merge the current remote tip; never force-push. Monitor both `quality.yml` and `deploy.yml` for the exact pushed SHA.

Run hosted acceptance against `https://xr-school.vercel.app`, requiring `/api/release` to report the exact expected SHA before evaluating routes. Verify all 35 canonical routes, every legacy redirect, representative class completions, assets, console output, and HTTP failures.

After recording production evidence, make and push the evidence-only follow-up commit, wait for its deployment, and repeat the deployed SHA/smoke check.

## Completion checklist

- [ ] The Git history contains a two-parent merge whose second parent is PR tip `621dfb61...`.
- [ ] All four plans have been executed and reviewed.
- [ ] Registry has 35 unique canonical released definitions and accounts for all 23 contributions.
- [ ] No released definition overstates device or classroom evidence.
- [ ] Package, API, web, unit, report, and browser gates pass from a clean checkout.
- [ ] All required Markdown, PDF, JSON, and authoring-standard artifacts are committed.
- [ ] PDFs pass structural and visual inspection.
- [ ] `origin/main` equals the intended local final SHA.
- [ ] GitHub Quality and Deploy workflows pass for the final SHA.
- [ ] Production reports the final SHA and passes hosted route/asset/browser checks.
- [ ] The handoff gives clickable paths to the reports, final commit, production URL, verification evidence, and remaining Quest/classroom limitations.
