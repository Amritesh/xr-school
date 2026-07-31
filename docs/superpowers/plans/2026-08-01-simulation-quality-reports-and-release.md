# Simulation Quality Reports and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish evidence-backed quality reporting for all 35 released simulations and all 23 PR #8 contributions, codify the authoring standard that prevents the observed mistakes, and ship the verified integration to `origin/main` with production evidence.

**Architecture:** Treat `packages/simulation-content/src/implemented/registry.ts` as the identity and release source of truth, while keeping audited scores and evidence in three validated JSON datasets. TypeScript tooling validates registry alignment and immutable PR evidence; deterministic Python/ReportLab generators render the portfolio, portfolio-mistakes, and Aditya contribution reports from those datasets. The root verification gate runs package/API/web/report checks and local Playwright acceptance before a no-force push, then a production Playwright pass records deployed evidence without claiming Quest or classroom validation.

**Tech Stack:** TypeScript 5.9, Vitest, Playwright/Chromium, Next.js 15, npm workspaces, Python 3.12, ReportLab, pdfplumber, pypdf, Pillow, Poppler, Git, GitHub CLI, GitHub Actions, Vercel.

---

## Execution order and invariants

- [ ] Execute this plan only after the library/foundation, guided-simulation, and interactive-investigation plans are complete in `integration/aditya-simulation-suite`.
- [ ] Work only in `/Users/amritesh/Desktop/code/xr-school/.worktrees/aditya-simulation-suite`; do not switch or update the user's main worktree.
- [ ] Confirm `packages/simulation-content/src/implemented/registry.ts` exports `IMPLEMENTED_SIMULATIONS`, `routeForSimulation()`, `findImplementedSimulation()`, and `resolveSimulationPath()`.
- [ ] Confirm the registry has exactly 35 definitions with `module.publicationStatus === 'released'`, and all 35 still have `module.evidenceMaturity === 'internalQA'` unless signed device or classroom evidence has actually been added.
- [ ] Confirm the immutable PR head is `621dfb61b39a4c49e8abb46ce60c54ea3d044479`; never calculate baseline scores from the conflict-resolved or remediated working tree.
- [ ] Keep `publicationStatus` separate from `evidenceMaturity` in every report and response. “Released” means publicly launchable; it does not mean Quest-verified, classroom-verified, or school-validated.
- [ ] Keep production builds offline and deterministic. `npm run build`, `npm run verify`, GitHub Actions, and Vercel must never install narration dependencies or call a voice provider.
- [ ] Use the author-only narration command only as an explicit human action, for example:

  ```bash
  npm run narration:author -- --manifest packages/simulation-content/src/implemented/guided/c5-ch10-a01-a-visit-of-ancient-fort.ts --provider edge-tts
  ```

- [ ] Preserve the real two-parent PR merge. After any rebase, verify that PR head `621dfb61b39a4c49e8abb46ce60c54ea3d044479` remains an ancestor and a direct parent of the integration merge.

## File map

### Create

- `scripts/lib/pr8-quality-evidence.ts` - immutable contribution map, source/test/narration inspection, and baseline-evidence validation.
- `scripts/capture-pr8-quality-evidence.ts` - CLI that reads PR #8 through `git show`/`git ls-tree` and writes an untracked audit snapshot.
- `scripts/lib/simulation-quality-data.ts` - rubric types, score arithmetic, registry-alignment validation, evidence-reference validation, and before/after rules.
- `scripts/validate-simulation-quality-reports.ts` - strict CLI used by `npm run reports:validate`.
- `scripts/generate_new_simulations_top_10_mistakes.py` - deterministic Markdown/PDF generator for the ten portfolio mistakes.
- `scripts/generate_aditya_contribution_report.py` - deterministic Markdown/PDF generator for the constructive, shareable 23-contribution assessment.
- `scripts/check_simulation_quality_reports.py` - regeneration/freshness and structural PDF checker.
- `scripts/render_simulation_quality_pdf_qa.py` - Poppler page rendering and Pillow contact-sheet creation.
- `scripts/record_simulation_quality_pdf_qa.py` - records PDF hashes and reviewed page ranges after visual inspection.
- `requirements-report.txt` - pinned report-generation and PDF-inspection dependencies.
- `reports/data/new-simulation-before-after-scorecard.json` - all 23 PR contributions, including the Solubility overlap.
- `reports/data/simulation-quality-pdf-visual-qa.json` - hashes and visual-review result for every final PDF.
- `reports/data/production-release-evidence.json` - immutable first production deployment evidence, created only after online verification.
- `output/pdf/xr-school-new-simulations-top-10-mistakes.md`
- `output/pdf/xr-school-new-simulations-top-10-mistakes.pdf`
- `output/pdf/aditya-contribution-improvement-report.md`
- `output/pdf/aditya-contribution-improvement-report.pdf`
- `docs/simulation-design/simulation-authoring-standard.md`
- `apps/web/components/simulation-experience/SimulationCanvasHost.tsx` - common canvas mount and stable acceptance hook.
- `apps/web/components/simulation-experience/acceptanceHooks.ts` - unique test-hook constants shared by shell and tests.
- `apps/web/lib/releaseMetadata.ts` - pure release metadata builder.
- `apps/web/app/api/release/route.ts` - deployed SHA and released/evidence counts.
- `apps/api/src/app.ts` - Fastify application factory for injection tests and production startup.
- `playwright.config.ts` - local built-app and externally hosted Playwright configuration.
- `tests/unit/pr8-quality-evidence.test.ts`
- `tests/unit/simulation-quality-data.test.ts`
- `tests/unit/simulation-authoring-standard.test.ts`
- `tests/unit/simulation-experience-acceptance-contract.test.ts`
- `tests/unit/release-metadata.test.ts`
- `tests/unit/api-simulation-registry.test.ts`
- `tests/reporting/test_simulation_quality_reports.py`
- `tests/e2e/simulation-portfolio.spec.ts`
- `tests/e2e/production-release.spec.ts`

### Modify

- `reports/data/implemented-simulation-quality-cards.json` - expand 13 cards to the exact 35 released registry identities.
- `reports/data/implemented-simulation-quality-evidence.json` - replace stale portfolio totals and add evidence records for all 35 simulations.
- `scripts/generate_simulation_quality_report.py` - remove hard-coded 13-card facts, add registry-derived metadata and the 23-contribution appendix, and support deterministic check output.
- `output/pdf/xr-school-implemented-simulations-quality-report.md`
- `output/pdf/xr-school-implemented-simulations-quality-report.pdf`
- `apps/web/components/simulation-experience/SimulationExperienceShell.tsx` - root/stage attributes and stable launch/action/feedback/audio/restart/completion hooks.
- `apps/web/components/simulation-experience/LaunchPortal.tsx` - launch hook.
- `apps/web/components/simulation-experience/BrowserExperienceHud.tsx` - stage, action, feedback, narration, restart, and completion hooks.
- `apps/api/src/index.ts` - start the exported Fastify application without registering routes at import time.
- `apps/api/package.json` - add the injection-test script.
- `package.json` - report, browser, narration-validation, workspace, API, and strict verification scripts.
- `.github/workflows/quality.yml` - Python/Poppler/Chromium setup and the complete root gate.
- `.github/workflows/deploy.yml` - identical release-candidate gate before Vercel deployment.
- `tests/unit/ci-workflow.test.ts` - enforce the expanded gate and the absence of build-time narration generation.
- `.gitignore` - ignore `tmp/` PDF render/evidence intermediates while retaining tracked final artifacts.
- `README.md` - document report generation, strict verification, and the author-only narration boundary.

## Task 1: Capture immutable PR #8 baseline evidence

**Files:**

- Create: `scripts/lib/pr8-quality-evidence.ts`
- Create: `scripts/capture-pr8-quality-evidence.ts`
- Create: `tests/unit/pr8-quality-evidence.test.ts`
- Audit output: `tmp/pdfs/pr8-quality-audit/baseline-evidence.json`

- [ ] **Step 1: Write the failing contribution-map and parser tests**

Create `tests/unit/pr8-quality-evidence.test.ts` with actual assertions for the immutable SHA, the 23 identities, the 22-new-plus-one-enhancement split, FNV narration IDs, source-text tests, and duplicated runtime markers:

```ts
import { describe, expect, it } from "vitest";
import {
  PR8_CONTRIBUTIONS,
  PR8_HEAD,
  inspectPr8Viewer,
  narrationKey,
} from "../../scripts/lib/pr8-quality-evidence";

describe("PR #8 immutable quality evidence", () => {
  it("pins all 23 contributions to the reviewed head", () => {
    expect(PR8_HEAD).toBe("621dfb61b39a4c49e8abb46ce60c54ea3d044479");
    expect(PR8_CONTRIBUTIONS).toHaveLength(23);
    expect(new Set(PR8_CONTRIBUTIONS.map((item) => item.prSlug)).size).toBe(23);
    expect(
      new Set(PR8_CONTRIBUTIONS.map((item) => item.canonicalSlug)).size,
    ).toBe(23);
    expect(
      PR8_CONTRIBUTIONS.filter((item) => item.integration === "new-class"),
    ).toHaveLength(22);
    expect(
      PR8_CONTRIBUTIONS.filter(
        (item) => item.integration === "existing-enhancement",
      ),
    ).toEqual([
      expect.objectContaining({
        prSlug: "experiments-with-water-soluble-insoluble",
        canonicalSlug: "c5-ch07-a03-soluble-and-insoluble-substances",
      }),
    ]);
  });

  it("uses the same stable narration hash as the contributed runtime", () => {
    expect(narrationKey("Test narration")).toBe("1r8jot7");
  });

  it("recognises the baseline defects without treating source text as behavior", () => {
    const evidence = inspectPr8Viewer({
      source:
        "new THREE.WebGLRenderer(); renderer.setAnimationLoop(loop); createQuestVrControls({ onPrimary: performAction, onNarrate: replay }); <button>Next</button>",
      testSource:
        "const viewer = readFileSync(path, 'utf8'); expect(viewer).toContain('Next')",
      trackedNarrationPaths: new Set<string>(),
      narrationTexts: ["Test narration"],
    });
    expect(evidence).toMatchObject({
      ownsRenderer: true,
      ownsAnimationLoop: true,
      usesSourceTextTests: true,
      primaryActionCanAdvance: true,
      hasGenericNextControl: true,
      referencedNarrationClips: 1,
      trackedNarrationClips: 0,
    });
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run:

```bash
npm test -- tests/unit/pr8-quality-evidence.test.ts
```

Expected: FAIL because `scripts/lib/pr8-quality-evidence.ts` does not exist.

- [ ] **Step 3: Implement the exact contribution map and pure evidence parser**

Define `PR8_HEAD`, `narrationKey()`, `inspectPr8Viewer()`, and `PR8_CONTRIBUTIONS`. Use this complete identity map; each record also carries `sourcePath` as `apps/web/components/simulations/<Viewer>.tsx`, `testPath` as `tests/unit/<test-file>.test.ts`, and `legacyPath` as `/simulations/<pr-slug>`.

| PR slug                                      | Canonical slug                                               | Viewer                         | Test file                         | Integration          |
| -------------------------------------------- | ------------------------------------------------------------ | ------------------------------ | --------------------------------- | -------------------- |
| `walls-tell-stories-ancient-fort-visit`      | `c5-ch10-a01-a-visit-of-ancient-fort`                        | `AncientFortVisitViewer`       | `ancient-fort-visit-viewer`       | new-class            |
| `up-you-go-snow-mountain-climbing`           | `c5-ch09-a04-snow-mountain-climbing`                         | `SnowMountainClimbingViewer`   | `snow-mountain-climbing-viewer`   | new-class            |
| `up-you-go-camp-in-snow`                     | `c5-ch09-a03-camp-in-the-snow`                               | `CampInSnowViewer`             | `camp-in-snow-viewer`             | new-class            |
| `up-you-go-rock-climbing`                    | `c5-ch09-a02-rock-climbing`                                  | `RockClimbingViewer`           | `rock-climbing-viewer`            | new-class            |
| `up-you-go-river-crossing-adventure`         | `c5-ch09-a01-river-crossing-adventure`                       | `RiverCrossingAdventureViewer` | `river-crossing-adventure-viewer` | new-class            |
| `treat-for-mosquitoes-mosquito-life-cycle`   | `c5-ch08-a02-life-cycle-of-the-mosquito`                     | `MosquitoLifeCycleViewer`      | `mosquito-life-cycle-viewer`      | new-class            |
| `treat-for-mosquitoes-malaria-diagnosis`     | `c5-ch08-a01-diagnosis-of-malaria`                           | `MalariaDiagnosisViewer`       | `malaria-diagnosis-viewer`        | new-class            |
| `experiments-with-water-float-or-sink`       | `c5-ch07-a01-a-concept-about-what-floats-what-sinks`         | `FloatOrSinkViewer`            | `float-or-sink-viewer`            | new-class            |
| `experiments-with-water-dead-sea-salt-water` | `c5-ch07-a02-dead-sea-salt-water-and-its-effects`            | `DeadSeaSaltWaterViewer`       | `dead-sea-salt-water-viewer`      | new-class            |
| `experiments-with-water-soluble-insoluble`   | `c5-ch07-a03-soluble-and-insoluble-substances`               | `SolubleInsolubleViewer`       | `soluble-insoluble-viewer`        | existing-enhancement |
| `every-drop-counts-rainwater-storage`        | `c5-ch06-a01-the-storage-of-rainwater`                       | `RainwaterStorageViewer`       | `rainwater-storage-viewer`        | new-class            |
| `every-drop-counts-stepwell-structure`       | `c5-ch06-a02-a-step-well-structure`                          | `StepwellStructureViewer`      | `stepwell-structure-viewer`       | new-class            |
| `seeds-and-seeds-seed-dispersal`             | `c5-ch05-a02-seed-dispersal`                                 | `SeedDispersalViewer`          | `seed-dispersal-viewer`           | new-class            |
| `seeds-and-seeds-pitcher-plant`              | `c5-ch05-a01-pitcher-plant-the-insect-hunter`                | `PitcherPlantViewer`           | `pitcher-plant-viewer`            | new-class            |
| `mangoes-round-the-year-aam-papad`           | `c5-ch04-a03-the-making-of-aam-papad`                        | `AamPapadViewer`               | `aam-papad-viewer`                | new-class            |
| `mangoes-round-the-year-milk-spoilage`       | `c5-ch04-a02-milk-spoilage`                                  | `MilkSpoilageViewer`           | `milk-spoilage-viewer`            | new-class            |
| `mangoes-round-the-year-food-spoilage`       | `c5-ch04-a01-food-spoilage`                                  | `FoodSpoilageViewer`           | `food-spoilage-viewer`            | new-class            |
| `sorting-materials-by-shape`                 | `c6-ch04-a01-sorting-materials-according-to-their-shape`     | `ShapeSortingViewer`           | `shape-sorting-viewer`            | new-class            |
| `fibre-to-fabric-cotton-farming`             | `c6-ch03-a01-cotton-farming`                                 | `CottonFarmingViewer`          | `cotton-farming-viewer`           | new-class            |
| `fibre-to-fabric-cotton-ginning`             | `c6-ch03-a02-the-process-of-cotton-ginning`                  | `CottonGinningViewer`          | `cotton-ginning-viewer`           | new-class            |
| `components-of-food-mineral-sources`         | `c6-ch02-a05-the-sources-of-minerals-in-food`                | `MineralSourcesViewer`         | `mineral-sources-viewer`          | new-class            |
| `components-of-food-vitamins-deficiencies`   | `c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies` | `VitaminDeficiencyViewer`      | `vitamin-deficiency-viewer`       | new-class            |
| `components-of-food-lipid-test`              | `c6-ch02-a03-test-the-presence-of-lipids`                    | `LipidTestViewer`              | `lipid-test-viewer`               | new-class            |

The pure parser must report narration reference/tracked counts; presence of `new THREE.WebGLRenderer`, `setAnimationLoop`, `createQuestVrControls`, `applyRealisticEnvironment`, a generic Next control, and `onPrimary: performAction`; whether `onNarrate` is accepted but unused; and whether the corresponding test reads source and asserts strings instead of executing behavior.

- [ ] **Step 4: Implement the immutable Git CLI**

`scripts/capture-pr8-quality-evidence.ts` must use `execFileSync('git', args)` without a shell, verify `git rev-parse` equals `PR8_HEAD`, read each source and test with `git show ${PR8_HEAD}:path`, enumerate tracked paths with `git ls-tree -r --name-only`, and write stable, sorted JSON to `tmp/pdfs/pr8-quality-audit/baseline-evidence.json`. The summary must include:

```json
{
  "pr": 8,
  "headSha": "621dfb61b39a4c49e8abb46ce60c54ea3d044479",
  "contributions": 23,
  "netNewClasses": 22,
  "overlappingEnhancements": 1,
  "viewerAddedLines": 16846,
  "referencedNarrationClips": 189,
  "trackedNarrationClips": 16,
  "missingNarrationClips": 173
}
```

Fail closed if the recomputed values differ from these reviewed facts.

- [ ] **Step 5: Run the unit test and capture the real baseline**

Run:

```bash
git fetch --no-tags origin pull/8/head:refs/remotes/origin/pr-8-aditya-work
test "$(git rev-parse refs/remotes/origin/pr-8-aditya-work)" = "621dfb61b39a4c49e8abb46ce60c54ea3d044479"
npm test -- tests/unit/pr8-quality-evidence.test.ts
npx tsx scripts/capture-pr8-quality-evidence.ts
```

Expected: the test passes; the SHA assertion exits 0; the CLI reports `23 contributions, 189 narration references, 173 missing clips`; and the JSON snapshot exists only under `tmp/`.

- [ ] **Step 6: Commit the reproducible baseline tooling**

```bash
git add scripts/lib/pr8-quality-evidence.ts scripts/capture-pr8-quality-evidence.ts tests/unit/pr8-quality-evidence.test.ts .gitignore
git commit -m "test: capture immutable PR 8 quality evidence"
```

## Task 2: Validate and populate the 35-card and 23-contribution datasets

**Files:**

- Create: `scripts/lib/simulation-quality-data.ts`
- Create: `scripts/validate-simulation-quality-reports.ts`
- Create: `tests/unit/simulation-quality-data.test.ts`
- Modify: `reports/data/implemented-simulation-quality-cards.json`
- Modify: `reports/data/implemented-simulation-quality-evidence.json`
- Create: `reports/data/new-simulation-before-after-scorecard.json`

- [ ] **Step 1: Write the failing registry/data contract test**

Create a test that loads the JSON files, imports `IMPLEMENTED_SIMULATIONS`, and calls the proposed validators:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { IMPLEMENTED_SIMULATIONS } from "../../packages/simulation-content/src/implemented/registry";
import {
  validateBeforeAfterScorecard,
  validatePortfolioData,
} from "../../scripts/lib/simulation-quality-data";

const json = (path: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));

describe("simulation quality report data", () => {
  it("covers every released canonical simulation exactly once", () => {
    const errors = validatePortfolioData({
      definitions: IMPLEMENTED_SIMULATIONS,
      cards: json("reports/data/implemented-simulation-quality-cards.json"),
      evidence: json(
        "reports/data/implemented-simulation-quality-evidence.json",
      ),
    });
    expect(errors).toEqual([]);
  });

  it("covers all 23 contributions at the immutable PR head", () => {
    const errors = validateBeforeAfterScorecard({
      definitions: IMPLEMENTED_SIMULATIONS,
      scorecard: json(
        "reports/data/new-simulation-before-after-scorecard.json",
      ),
    });
    expect(errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and verify the current report fails**

Run:

```bash
npm test -- tests/unit/simulation-quality-data.test.ts
```

Expected: FAIL because the current card data has 13 entries and `new-simulation-before-after-scorecard.json` does not exist.

- [ ] **Step 3: Implement the rubric and strict validation API**

Use these exact score keys and weights:

```ts
export const QUALITY_WEIGHTS = {
  education: 20,
  integrity: 15,
  interactivity: 15,
  visuals: 15,
  audio: 10,
  usability: 10,
  stability: 10,
  deployment: 5,
} as const;

export type QualityScores = { [K in keyof typeof QUALITY_WEIGHTS]: number };

export function qualityTotal(scores: QualityScores): number {
  return Object.values(scores).reduce((sum, value) => sum + value, 0);
}

export function qualityBand(total: number): string {
  if (total >= 85) return "Pilot candidate";
  if (total >= 70) return "Promising internal QA";
  if (total >= 55) return "Needs focused improvement";
  return "Rebuild before pilot";
}
```

The validators must produce stable error arrays and enforce all of the following:

- the released registry set is exactly 35 unique canonical slugs;
- cards and evidence each contain exactly that set, once each;
- titles, publication status, evidence maturity, route, and legacy aliases match the registry;
- every card has all eight integer score dimensions within its weight, a computed rather than stored total, exactly three strengths, exactly three risks, a summary, an action, and at least one evidence reference per non-zero dimension;
- `internalQA` prevents language such as “Quest verified,” “classroom validated,” “school proven,” or “learning outcomes improved”;
- the before/after scorecard pins PR `8` and the full immutable SHA, has exactly the Task 1 identity map, and marks 22 records `new-class` plus one `existing-enhancement`;
- every baseline dimension has a `git:621dfb61b39a4c49e8abb46ce60c54ea3d044479:path` evidence reference;
- every increased post-integration dimension cites at least one remediated source path and one passing test, build, asset, narration, browser, or deployment evidence ID;
- `postIntegration.scores.deployment <= 3`, `postIntegration.scores.usability <= 8`, and `postIntegration.scores.stability <= 8` while direct Quest acceptance is absent;
- browser TTS without a packaged clip caps audio at 4/10; complete packaged audio without a listener/device run caps it at 8/10;
- missing provenance caps visuals at 9/15; browser-render evidence plus complete provenance can score higher but not the full 15 without device acceptance;
- remaining risk and next action are non-empty for every contribution;
- Solubility's contribution points to the existing canonical record and never creates a 36th card.

- [ ] **Step 4: Expand `implemented-simulation-quality-evidence.json` to 35 simulations**

Keep the audit date `2026-08-01`, set `portfolio.publiclyLaunchableSimulations` to `35`, set `portfolio.evidenceMaturityDistribution.internalQA` to `35`, and keep classroom studies and signed Quest acceptance at `0`. For every registry definition, record:

- canonical slug and `routeForSimulation(definition)`;
- `publicationStatus` and `evidenceMaturity` from `definition.module`;
- stage/action/evidence/assessment counts from `definition.experience` and `definition.assessment`;
- narration cue, packaged-audio, caption, missing-file, and hash-validation results from `definition.narration`;
- asset count, provenance completeness, fallback, and path-validation results from `definition.assets`;
- focused unit/integration/browser test IDs and their last verified command;
- browser observations separately from `questDeviceEvidence: "not-run"` and `classroomEvidence: "not-run"`.

Do not copy the old hard-coded `612 tests` or `85 clips` figures; derive all portfolio totals from the records.

- [ ] **Step 5: Expand `implemented-simulation-quality-cards.json` to 35 cards**

Retain the 13 prior cards only after rechecking their evidence against the integrated head. Add the 22 net-new canonical cards. Each score justification must point to evidence IDs in `implemented-simulation-quality-evidence.json`; route/title/release fields must match the registry. Recalculate portfolio rankings from the eight dimensions and retain explicit internal-QA limitations on all cards.

- [ ] **Step 6: Populate all 23 before/after contribution records**

Use `tmp/pdfs/pr8-quality-audit/baseline-evidence.json` for baseline facts and the exact Task 1 identity order. Implement and validate this exact shape:

```ts
interface EvidenceReference {
  id: string;
  kind:
    | "git"
    | "source"
    | "test"
    | "build"
    | "browser"
    | "asset"
    | "narration"
    | "deployment";
  ref: string;
  finding: string;
}

interface ContributionAssessment {
  sourceRevision: "621dfb61b39a4c49e8abb46ce60c54ea3d044479";
  scores: QualityScores;
  strengths: [string, string, string];
  defects: [string, ...string[]];
  evidence: [EvidenceReference, ...EvidenceReference[]];
}

interface PostIntegrationAssessment {
  scores: QualityScores;
  remediation: [string, ...string[]];
  evidence: [EvidenceReference, ...EvidenceReference[]];
  remainingRisks: [string, ...string[]];
  nextAction: string;
}

interface ContributionComparison {
  prSlug: string;
  canonicalSlug: string;
  integration: "new-class" | "existing-enhancement";
  contributor: "GitHub @Adityakrpand";
  baseline: ContributionAssessment;
  postIntegration: PostIntegrationAssessment;
}
```

Every tuple and string is required, so incomplete records fail validation. Baseline strengths must credit useful curriculum content, scene behavior, narration writing, or panorama contribution where observed. Post-integration remediation must name the actual registry/definition/domain/scene/test paths. Keep absent device/classroom evidence visible rather than awarding assumed credit.

- [ ] **Step 7: Run the focused validator and inspect arithmetic**

Run:

```bash
npm test -- tests/unit/simulation-quality-data.test.ts
npx tsx scripts/validate-simulation-quality-reports.ts
```

Expected: PASS and print `35 portfolio cards; 35 evidence records; 23 contribution comparisons; 0 validation errors`.

- [ ] **Step 8: Commit the audited datasets and validator**

```bash
git add scripts/lib/simulation-quality-data.ts scripts/validate-simulation-quality-reports.ts tests/unit/simulation-quality-data.test.ts reports/data/implemented-simulation-quality-cards.json reports/data/implemented-simulation-quality-evidence.json reports/data/new-simulation-before-after-scorecard.json
git commit -m "docs: audit 35 simulations and 23 contributions"
```

## Task 3: Publish the simulation authoring standard

**Files:**

- Create: `docs/simulation-design/simulation-authoring-standard.md`
- Create: `tests/unit/simulation-authoring-standard.test.ts`

- [ ] **Step 1: Write a failing narrow static-policy test**

This is intentionally a document-policy test, not a substitute for simulation behavior tests:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("simulation authoring standard", () => {
  const path = resolve(
    process.cwd(),
    "docs/simulation-design/simulation-authoring-standard.md",
  );

  it("defines the complete contribution and release contract", () => {
    const text = readFileSync(path, "utf8");
    for (const heading of [
      "## Canonical module template",
      "## Definition, domain, and scene boundaries",
      "## Predict-test-observe-explain and misconceptions",
      "## Evidence, assessment, and mastery",
      "## Browser, touch, keyboard, and Quest equivalence",
      "## Narration, captions, and audio ownership",
      "## Asset provenance and fallbacks",
      "## Comfort and Quest performance budgets",
      "## Accessibility and reduced motion",
      "## Error handling and resource disposal",
      "## Required automated tests",
      "## Review and release checklist",
    ])
      expect(text).toContain(heading);
    expect(text).toContain("publicationStatus: 'released'");
    expect(text).toContain("evidenceMaturity: 'internalQA'");
    expect(text).toContain(
      "Unknown or disallowed actions never advance the lesson.",
    );
    expect(text).toContain("Completion is not mastery.");
    expect(text).toContain("npm run narration:validate");
    expect(text).not.toMatch(/school[- ]validated by default/i);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-file failure**

Run:

```bash
npm test -- tests/unit/simulation-authoring-standard.test.ts
```

Expected: FAIL with `ENOENT` for `docs/simulation-design/simulation-authoring-standard.md`.

- [ ] **Step 3: Write the normative standard with concrete examples**

The document must define all of these rules in direct language:

- `ImplementedSimulationDefinition` is the unit of contribution: `module`, `kind`, `experience`, `assessment`, `narration`, `assets`, `legacyPaths`, and `contribution`.
- The module uses the canonical curriculum slug, a stable `viewerKey`, `publicationStatus`, `evidenceMaturity`, and aliases; it does not create a web-local catalog or API-local array.
- A definition declares curriculum/stages/actions/evidence/assessment/narration/assets; a pure domain function determines outcomes; a scene adapter projects state; only the shared runtime owns lifecycle/input/audio/disposal.
- A complete learning loop is predict -> test/action -> observe evidence -> explain/reconcile -> transfer. Forward progress requires declared action and evidence. Previous is available only for completed stages.
- Completion is not mastery. Mastery requires observation, misconception resolution, and transfer evidence where the definition requires them.
- Mouse, touch, keyboard, and Quest map to the same normalized action IDs. A controller button cannot answer a question, fabricate evidence, or skip a stage.
- Narration cues have stable IDs, exact captions, text hashes, locale/speaker metadata, and an `audioUrl` only when the committed file exists. One sound manager owns narration/effects. `browserTts` is an accessibility fallback, not packaged-audio evidence.
- The explicit authoring command may use a provider; `prebuild`, `build`, `verify`, and deployment may not install Python packages or call that provider.
- Every asset records source, author/contributor, license status, dimensions, compression, and explicit fallback. PR panoramas are credited to PR #8; undocumented external-generation provenance is recorded as unknown rather than invented.
- Quest baseline is 72 FPS with bounded draw calls/triangles, capped pixel ratio, no full-screen post-processing, bounded locomotion, head-relative snap turn, visible focus, captions, reduced motion, and declared comfort risk.
- Invalid inputs and non-finite state fail the current action with a recoverable learner message. Initialization rolls back initialized systems. Disposal attempts all cleanup and aggregates failures.
- Unit tests exercise domain and lesson behavior; integration tests exercise shared runtime/audio/input/disposal; Playwright exercises routes, primary learning action, feedback, narration, restart, completion, accessibility, and asset responses. Source-text assertions are reserved for narrow policy checks.
- Release review proves registry/API/catalog/search agreement, narration/asset validity, root verification, browser acceptance, and generated report freshness. Device/classroom evidence remains unsigned until the corresponding session occurs.

Include one complete illustrative module using the ancient-fort canonical slug and `legacyPaths: ['/simulations/walls-tell-stories-ancient-fort-visit']`; include a reviewer checklist with checkbox syntax; include the exact focused and root commands used in this repository.

- [ ] **Step 4: Run the document-policy test**

Run:

```bash
npm test -- tests/unit/simulation-authoring-standard.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the authoring standard**

```bash
git add docs/simulation-design/simulation-authoring-standard.md tests/unit/simulation-authoring-standard.test.ts
git commit -m "docs: define simulation authoring standard"
```

## Task 4: Generate the 35-simulation portfolio report and contribution appendix

**Files:**

- Modify: `scripts/generate_simulation_quality_report.py`
- Create: `requirements-report.txt`
- Create: `tests/reporting/test_simulation_quality_reports.py`
- Modify: `output/pdf/xr-school-implemented-simulations-quality-report.md`
- Modify: `output/pdf/xr-school-implemented-simulations-quality-report.pdf`

- [ ] **Step 1: Pin the report runtime**

Create `requirements-report.txt`:

```text
Pillow==11.3.0
pdfplumber==0.11.7
pypdf==6.0.0
reportlab==4.4.3
```

Install only in the development/CI report job:

```bash
python3 -m pip install -r requirements-report.txt
```

Expected: all four packages install successfully; no web package lifecycle script references this file.

- [ ] **Step 2: Write failing generator tests against a temporary output directory**

`tests/reporting/test_simulation_quality_reports.py` must run the portfolio generator with `--output-dir` pointing to `tempfile.TemporaryDirectory()`, then assert:

- Markdown scope is 35 and contains exactly 35 `###` quality-card headings;
- the ranked table contains every canonical title exactly once;
- contribution appendix contains all 23 PR slugs and all 23 canonical slugs;
- portfolio average and band counts equal values recomputed from JSON;
- PDF opens with pypdf, is A4, has at least 42 pages, and contains no `/Widget` annotations;
- pdfplumber extraction contains all 35 titles, rubric labels, the internal-QA limitation, all 23 contribution identities, and zero replacement glyphs;
- generation is deterministic: two runs produce byte-identical Markdown and PDF.

Run:

```bash
python3 -m unittest discover -s tests/reporting -p 'test_*.py' -v
```

Expected: FAIL because the current generator rejects any card count other than 13 and hard-codes the 14 July audit facts.

- [ ] **Step 3: Refactor the portfolio generator around validated data**

Keep the existing navy/cyan visual language and deterministic `canvas.Canvas(..., invariant=1)`, but make all counts, date, readiness distribution, rankings, narration totals, test totals, and limitation text data-driven. Add CLI arguments:

```text
--cards reports/data/implemented-simulation-quality-cards.json
--evidence reports/data/implemented-simulation-quality-evidence.json
--scorecard reports/data/new-simulation-before-after-scorecard.json
--output-dir output/pdf
```

Remove `max_lines` truncation. Wrapped blocks must either fit above the 38-point footer or continue on a clearly titled continuation page. Paginate the 35-row ranked table, render one full card per simulation, and add a contribution appendix with PR slug, canonical slug, before score, after score, delta, main remediation, and remaining risk for all 23 records. Normalize Unicode dash characters to ASCII hyphens before drawing PDF text.

The report must contain:

1. cover and audit position;
2. portfolio average and evidence-maturity distribution;
3. paginated ranked scorecard;
4. portfolio priorities;
5. 35 quality cards exactly once;
6. 23-row contribution appendix;
7. rubric, evidence method, and limitations;
8. explicit statements that scores are product indicators, Quest/classroom evidence is absent, and released does not mean school-validated.

- [ ] **Step 4: Run tests, generate the tracked outputs, and compare counts**

Run:

```bash
python3 -m unittest discover -s tests/reporting -p 'test_*.py' -v
python3 scripts/generate_simulation_quality_report.py --cards reports/data/implemented-simulation-quality-cards.json --evidence reports/data/implemented-simulation-quality-evidence.json --scorecard reports/data/new-simulation-before-after-scorecard.json --output-dir output/pdf
```

Expected: tests PASS; generator prints `35 quality cards and 23 contribution rows`; both existing portfolio output paths are regenerated.

- [ ] **Step 5: Commit the portfolio report**

```bash
git add requirements-report.txt scripts/generate_simulation_quality_report.py tests/reporting/test_simulation_quality_reports.py output/pdf/xr-school-implemented-simulations-quality-report.md output/pdf/xr-school-implemented-simulations-quality-report.pdf
git commit -m "docs: publish 35-simulation quality report"
```

## Task 5: Generate the top-ten mistakes and Aditya contribution reports

**Files:**

- Create: `scripts/generate_new_simulations_top_10_mistakes.py`
- Create: `scripts/generate_aditya_contribution_report.py`
- Modify: `tests/reporting/test_simulation_quality_reports.py`
- Create: `output/pdf/xr-school-new-simulations-top-10-mistakes.md`
- Create: `output/pdf/xr-school-new-simulations-top-10-mistakes.pdf`
- Create: `output/pdf/aditya-contribution-improvement-report.md`
- Create: `output/pdf/aditya-contribution-improvement-report.pdf`

- [ ] **Step 1: Extend the tests before writing either generator**

Add tests that generate both report pairs in a temporary directory and assert:

- top-ten Markdown has exactly ten numbered `##` mistake sections in the order below;
- each mistake contains `Examples`, `Measurable impact`, `Remediation`, and `Prevention rule` subsections;
- the Aditya report contains exactly 23 contribution sections, credits `GitHub @Adityakrpand`, and includes baseline, implemented remediation, score delta, remaining risk, and next action for every record;
- neither report uses personality judgments or claims device/classroom evidence;
- both PDFs open, have A4 pages, contain all expected headings/identities in extracted text, and are byte-identical across two runs.

Run:

```bash
python3 -m unittest discover -s tests/reporting -p 'test_*.py' -v
```

Expected: FAIL because the two generator modules and four outputs do not exist.

- [ ] **Step 2: Implement the top-ten report with these exact evidence anchors**

|   # | Mistake                                                                 | PR evidence example                                                                                                                       | Measurable impact                                                                | Prevention rule                                                                                                |
| --: | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
|   1 | Unsupported release and evidence claims                                 | `apps/api/src/index.ts` assigns `status: 'released'` and `evidenceConfidenceLevel: 'expertDesigned'` without separate maturity evidence   | 23 contributions appeared release-ready despite zero signed Quest/classroom runs | Store and display `publicationStatus` and `evidenceMaturity` independently                                     |
|   2 | Competing sources of truth                                              | PR-local `SIMULATIONS` in `apps/api/src/index.ts`, route pages, homepage lists, and `viewerNameMap` in `scripts/validate-simulations.mjs` | identities and claims can drift across API, web, routes, and reports             | Derive all consumers from `IMPLEMENTED_SIMULATIONS`                                                            |
|   3 | Source-text tests instead of behavior tests                             | `tests/unit/ancient-fort-visit-viewer.test.ts` and `tests/unit/float-or-sink-viewer.test.ts` read TSX and call `toContain`                | strings can pass while progression, rendering, audio, and cleanup fail           | Exercise domain/runtime behavior; reserve string checks for narrow static policy                               |
|   4 | Incomplete narration assets                                             | 189 referenced clips but only 16 tracked at `621dfb61`                                                                                    | 173 required requests would miss and silently fall back                          | Validate stable IDs, hashes, committed files, captions, and fallback policy                                    |
|   5 | Network-dependent production builds                                     | `apps/web/package.json` adds a `prebuild` that installs Python dependencies and invokes `edge_tts`                                        | clean builds require package/network/provider availability and mutate assets     | Keep narration generation author-only; builds only validate committed manifests                                |
|   6 | Dead Quest narration wiring                                             | `questVrControls.ts` accepts `onNarrate` as `_onNarrate` and never calls it                                                               | advertised controller narration action cannot work                               | Route a tested normalized narration action through one audio owner                                             |
|   7 | Controller shortcuts bypass learning                                    | viewers wire `onPrimary: performAction`                                                                                                   | A can advance without choosing/observing required evidence                       | Gate every action through the lesson session and declared evidence                                             |
|   8 | Slideshow progression instead of meaningful interaction                 | guided viewers expose generic Next buttons calling `goToStage(stage + 1)`                                                                 | scene presence is mistaken for learner evidence                                  | Forward progression requires the declared stage action; Previous revisits completed stages only                |
|   9 | Clone-and-modify architecture                                           | 23 large viewers repeat renderer, animation loop, environment, controls, cards, audio, and disposal                                       | contributed viewers add 16,846 lines and multiply defect surfaces                | Compose definition + domain + scene adapter over shared runtime/web packages                                   |
|  10 | Unverified performance, cleanup, comfort, accessibility, and provenance | source-string tests assert helper names; panorama PNGs have no complete source/license record                                             | quality claims cannot be audited and device risk remains unknown                 | Require manifests, budgets, behavioral cleanup tests, browser acceptance, and signed device/classroom evidence |

Use a neutral portfolio-learning tone. Cite immutable PR paths/SHA, show the remediation paths in the integrated repository, and quantify 23 viewers, 16,846 viewer lines, 189 narration references, 16 tracked clips, and 173 missing clips.

- [ ] **Step 3: Implement the constructive Aditya-specific report**

Generate the report only from `new-simulation-before-after-scorecard.json`. Frame it as a contribution improvement assessment, not a performance review. The report must:

- credit all 23 contributed curriculum/scene implementations and the panorama/narration work where evidence supports it;
- explain that 22 became new canonical classes and one improved existing Solubility;
- show one card per contribution with before scores, after scores, deltas, baseline strengths, defects, actual remediation paths, remaining risks, and next action;
- distinguish architectural/system lessons from individual blame;
- include a “What to keep doing” section and an “Authoring checklist for the next contribution” section linked to `docs/simulation-design/simulation-authoring-standard.md`;
- state that internal/browser evidence does not replace Quest or classroom acceptance.

Use the same report primitives, typography, margins, footer, deterministic metadata, text-fit checks, and ASCII-hyphen normalization as the portfolio report.

- [ ] **Step 4: Run tests and generate all four outputs**

Run:

```bash
python3 -m unittest discover -s tests/reporting -p 'test_*.py' -v
python3 scripts/generate_new_simulations_top_10_mistakes.py --scorecard reports/data/new-simulation-before-after-scorecard.json --output-dir output/pdf
python3 scripts/generate_aditya_contribution_report.py --scorecard reports/data/new-simulation-before-after-scorecard.json --output-dir output/pdf
```

Expected: tests PASS; top-ten generator reports `10 mistakes`; Aditya generator reports `23 contributions`; four non-empty tracked outputs exist.

- [ ] **Step 5: Commit the companion reports**

```bash
git add scripts/generate_new_simulations_top_10_mistakes.py scripts/generate_aditya_contribution_report.py tests/reporting/test_simulation_quality_reports.py output/pdf/xr-school-new-simulations-top-10-mistakes.md output/pdf/xr-school-new-simulations-top-10-mistakes.pdf output/pdf/aditya-contribution-improvement-report.md output/pdf/aditya-contribution-improvement-report.pdf
git commit -m "docs: publish simulation improvement reports"
```

## Task 6: Add stable acceptance hooks and complete browser coverage

**Files:**

- Create: `apps/web/components/simulation-experience/acceptanceHooks.ts`
- Create: `apps/web/components/simulation-experience/SimulationCanvasHost.tsx`
- Modify: `apps/web/components/simulation-experience/SimulationExperienceShell.tsx`
- Modify: `apps/web/components/simulation-experience/LaunchPortal.tsx`
- Modify: `apps/web/components/simulation-experience/BrowserExperienceHud.tsx`
- Create: `tests/unit/simulation-experience-acceptance-contract.test.ts`
- Create: `playwright.config.ts`
- Create: `tests/e2e/simulation-portfolio.spec.ts`
- Modify: guided/interactive scene compositions only where needed to compose `SimulationCanvasHost`

- [ ] **Step 1: Write the failing hook-contract test**

Use one unique invariant list:

```ts
import { describe, expect, it } from "vitest";
import { ACCEPTANCE_HOOKS } from "../../apps/web/components/simulation-experience/acceptanceHooks";

describe("simulation acceptance hooks", () => {
  it("keeps one unique cross-class browser contract", () => {
    expect(ACCEPTANCE_HOOKS).toEqual({
      launch: "simulation-launch",
      canvas: "simulation-canvas",
      stageTitle: "stage-title",
      stageCue: "stage-cue",
      primaryAction: "primary-action",
      feedback: "feedback",
      narrationReplay: "narration-replay",
      restart: "restart",
      completion: "completion",
    });
    expect(new Set(Object.values(ACCEPTANCE_HOOKS)).size).toBe(9);
  });
});
```

Run `npm test -- tests/unit/simulation-experience-acceptance-contract.test.ts` and expect FAIL because the module is missing.

- [ ] **Step 2: Implement the common hooks**

`SimulationExperienceShell` owns `data-simulation-id` and active `data-stage-id`. `LaunchPortal` owns `data-testid="simulation-launch"`. `SimulationCanvasHost` renders the one mount node with `data-testid="simulation-canvas"`. The shell/HUD expose `stage-title`, `stage-cue`, `primary-action`, `feedback`, `narration-replay`, `restart`, and `completion` exactly once when the corresponding state/control is present. Use accessible headings/buttons/status regions in addition to the hooks.

- [ ] **Step 3: Add the Playwright configuration**

Create `playwright.config.ts` with `testDir: './tests/e2e'`, deterministic screenshots/traces on failure, Chromium only, two CI workers, and this server rule:

```ts
webServer: process.env.XR_BASE_URL ? undefined : {
  command: 'npm --workspace apps/web run start',
  url: 'http://127.0.0.1:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
},
use: {
  baseURL: process.env.XR_BASE_URL ?? 'http://127.0.0.1:3000',
  viewport: { width: 1440, height: 900 },
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
},
```

- [ ] **Step 4: Write the 35-route and legacy-path acceptance test**

`tests/e2e/simulation-portfolio.spec.ts` imports `IMPLEMENTED_SIMULATIONS`, `routeForSimulation`, and `resolveSimulationPath`. It must first assert 35 released definitions. For every canonical definition it must:

- navigate to `routeForSimulation(definition)` and require HTTP 200;
- require root `data-simulation-id` and the registry `module.id`;
- click `simulation-launch`, require visible `simulation-canvas`, `stage-title`, `stage-cue`, `primary-action`, `narration-replay`, and `restart`;
- perform the primary action and require a non-empty `feedback` region or an active `data-stage-id` change;
- click narration replay and require no overlapping-owner/runtime error;
- click restart and require the first stage ID;
- collect page errors, error console messages, failed requests, and HTTP 400+ asset responses; require all arrays empty.

For every unique `legacyPaths` and `module.legacyAliases` input, use `resolveSimulationPath()` to assert the canonical destination, navigate from the legacy URL, and require the final page URL to equal the canonical route. The guided and interactive deep-flow specs remain responsible for completing all 17 guided and six interactive contributions; run them in the aggregate command.

- [ ] **Step 5: Build and run focused browser acceptance**

Run:

```bash
npm test -- tests/unit/simulation-experience-acceptance-contract.test.ts
npm --workspace apps/web run type-check
npm --workspace apps/web run build
npx playwright test tests/e2e/simulation-portfolio.spec.ts tests/e2e/guided-simulation-routes.spec.ts tests/e2e/interactive-investigations.spec.ts --config playwright.config.ts
```

Expected: the unit test passes; the production build succeeds; Playwright reports 35 canonical route launches, all legacy redirects, 17 guided deep flows, six interactive deep flows, and zero unexpected console/network/asset errors.

- [ ] **Step 6: Commit the acceptance contract**

```bash
git add apps/web/components/simulation-experience/acceptanceHooks.ts apps/web/components/simulation-experience/SimulationCanvasHost.tsx apps/web/components/simulation-experience/SimulationExperienceShell.tsx apps/web/components/simulation-experience/LaunchPortal.tsx apps/web/components/simulation-experience/BrowserExperienceHud.tsx tests/unit/simulation-experience-acceptance-contract.test.ts playwright.config.ts tests/e2e/simulation-portfolio.spec.ts
git commit -m "test: verify the released simulation portfolio"
```

## Task 7: Add API injection coverage, release metadata, and hosted acceptance

**Files:**

- Create: `apps/web/lib/releaseMetadata.ts`
- Create: `apps/web/app/api/release/route.ts`
- Create: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/package.json`
- Create: `tests/unit/release-metadata.test.ts`
- Create: `tests/unit/api-simulation-registry.test.ts`
- Create: `tests/e2e/production-release.spec.ts`

- [ ] **Step 1: Write the failing Fastify injection test**

Create `tests/unit/api-simulation-registry.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../apps/api/src/app";

describe("simulation registry API", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });
  afterAll(async () => {
    await app.close();
  });

  it("returns all 35 canonical released modules with honest maturity", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/simulation-modules",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items).toHaveLength(35);
    expect(body.page.totalItems).toBe(35);
    expect(
      body.items.every(
        (item: Record<string, string>) => item.publicationStatus === "released",
      ),
    ).toBe(true);
    expect(
      body.items.every(
        (item: Record<string, string>) =>
          item.evidenceMaturity === "internalQA",
      ),
    ).toBe(true);
  });

  it("resolves a canonical slug and rejects an unknown module", async () => {
    const found = await app.inject({
      method: "GET",
      url: "/v1/simulation-modules/c5-ch10-a01-a-visit-of-ancient-fort",
    });
    expect(found.statusCode).toBe(200);
    expect(found.json().viewerKey).toBeTruthy();
    const missing = await app.inject({
      method: "GET",
      url: "/v1/simulation-modules/not-a-module",
    });
    expect(missing.statusCode).toBe(404);
  });
});
```

Run `npm test -- tests/unit/api-simulation-registry.test.ts` and expect FAIL because `apps/api/src/app.ts` does not exist.

- [ ] **Step 2: Extract a testable API factory**

Move Fastify construction, CORS registration, canonical registry routes, Robotree routes, and `/health` into `buildApp(options)`. It imports released records through the public `@xr-school/simulation-content` export. Keep `apps/api/src/index.ts` responsible only for calling `buildApp({ logger: { level: 'info' } })`, listening on `0.0.0.0:3001`, and logging URLs. Add this package script:

```json
"test": "vitest run --root ../.. tests/unit/api-simulation-registry.test.ts"
```

- [ ] **Step 3: Write the failing release-metadata test**

```ts
import { describe, expect, it } from "vitest";
import { IMPLEMENTED_SIMULATIONS } from "../../packages/simulation-content/src/implemented/registry";
import { buildReleaseMetadata } from "../../apps/web/lib/releaseMetadata";

describe("release metadata", () => {
  it("exposes the deployed SHA without overstating evidence", () => {
    const result = buildReleaseMetadata("abc123", IMPLEMENTED_SIMULATIONS);
    expect(result).toEqual({
      commitSha: "abc123",
      publiclyLaunchable: 35,
      evidenceMaturity: {
        internalQA: 35,
        deviceVerified: 0,
        classroomVerified: 0,
      },
    });
  });
});
```

Run `npm test -- tests/unit/release-metadata.test.ts` and expect FAIL because `releaseMetadata.ts` is missing.

- [ ] **Step 4: Implement the pure builder and route**

`buildReleaseMetadata()` filters `module.publicationStatus === 'released'`, computes the three maturity counts, and accepts the SHA as an argument. `GET /api/release` passes `process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'development'` and returns JSON with `Cache-Control: no-store`.

- [ ] **Step 5: Write hosted-production acceptance**

`tests/e2e/production-release.spec.ts` requires `XR_EXPECTED_SHA`, fetches `/api/release` until it returns that exact SHA or 10 minutes elapse, asserts `35 / 35 internalQA / 0 device / 0 classroom`, and then reuses the canonical/legacy checks from `simulation-portfolio.spec.ts` against `XR_BASE_URL`. It must launch all 22 net-new routes plus enhanced Solubility, capture HTTP/canvas/console/asset evidence, and run representative complete flows for one guided class, Float or Sink, Lipid Test, Nutrition Match, Shape Sorting, and Solubility.

- [ ] **Step 6: Run focused tests**

```bash
npm test -- tests/unit/release-metadata.test.ts
npm --workspace @xr-school/api run test
npm --workspace @xr-school/api run build
npm --workspace apps/web run type-check
```

Expected: PASS.

- [ ] **Step 7: Commit API and release observability**

```bash
git add apps/api/src/app.ts apps/api/src/index.ts apps/api/package.json apps/web/lib/releaseMetadata.ts apps/web/app/api/release/route.ts tests/unit/api-simulation-registry.test.ts tests/unit/release-metadata.test.ts tests/e2e/production-release.spec.ts
git commit -m "test: verify simulation APIs and release metadata"
```

## Task 8: Automate structural PDF checks and perform visual PDF QA

**Files:**

- Create: `scripts/check_simulation_quality_reports.py`
- Create: `scripts/render_simulation_quality_pdf_qa.py`
- Create: `scripts/record_simulation_quality_pdf_qa.py`
- Create: `reports/data/simulation-quality-pdf-visual-qa.json`
- Modify: `tests/reporting/test_simulation_quality_reports.py`

- [ ] **Step 1: Write failing freshness and QA-manifest tests**

Extend the Python suite to require all three Markdown/PDF pairs, verify every expected heading/title/identity with pdfplumber, reject replacement glyphs and Unicode dash characters in PDF-bound source strings, validate page size/metadata/page numbering, and require a QA-manifest record whose SHA-256 equals each tracked PDF. Run the suite and expect FAIL because the check/render/record scripts and QA manifest do not exist.

- [ ] **Step 2: Implement deterministic regeneration checks**

`check_simulation_quality_reports.py` must generate all six artifacts in a temporary directory, byte-compare each with its tracked counterpart, then run pypdf/pdfplumber structural checks. It must print one of these exact outcomes per artifact: `fresh`, `content mismatch`, `unreadable PDF`, `missing expected text`, or `QA hash mismatch`.

- [ ] **Step 3: Implement page rendering and contact sheets**

`render_simulation_quality_pdf_qa.py` must create only under `tmp/pdfs/simulation-quality-qa/`, call `pdftoppm -png -r 150` for all three PDFs, verify rendered page count equals pypdf page count, and create sequential contact sheets of at most 12 pages each with page labels. Keep the original page PNGs for full-resolution inspection.

- [ ] **Step 4: Render and inspect every final page**

Run:

```bash
python3 scripts/check_simulation_quality_reports.py --skip-qa-hash
python3 scripts/render_simulation_quality_pdf_qa.py
```

Open every contact sheet with the environment image viewer. Inspect full-resolution PNGs for every dense scorecard, long title, table transition, contribution appendix, top-ten section, and contribution card. Reject clipping, overlap, missing glyphs, black squares, weak contrast, truncated bullets, broken score bars, bad page transitions, inconsistent headers/footers, or unreadable page numbers. After any correction, regenerate all affected PDF/Markdown artifacts, rerender every page of that PDF, and repeat the inspection.

- [ ] **Step 5: Record the reviewed hashes only after zero defects remain**

Run:

```bash
python3 scripts/record_simulation_quality_pdf_qa.py --reviewer codex --approve-all-rendered-pages
python3 scripts/check_simulation_quality_reports.py
python3 -m unittest discover -s tests/reporting -p 'test_*.py' -v
```

Expected: the record script writes all three PDF hashes and complete page ranges with `status: "approved"` and `defects: []`; freshness and tests PASS.

- [ ] **Step 6: Commit structural and visual QA evidence**

```bash
git add scripts/check_simulation_quality_reports.py scripts/render_simulation_quality_pdf_qa.py scripts/record_simulation_quality_pdf_qa.py reports/data/simulation-quality-pdf-visual-qa.json tests/reporting/test_simulation_quality_reports.py output/pdf
git commit -m "test: verify simulation report PDFs"
```

## Task 9: Make reports, API, packages, browser smoke, and narration validation strict release gates

**Files:**

- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `tests/unit/ci-workflow.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Extend CI policy tests before changing scripts/workflows**

Add assertions that root scripts expose `reports:validate`, `reports:test`, `reports:check`, `test:e2e`, `narration:validate`, `type-check:packages`, `build:packages`, and API test/build; that root `verify` runs them; that both workflows set up Python 3.12, install `requirements-report.txt`, install Poppler and Chromium, and run `npm run verify`; and that neither package scripts nor workflows contain `edge_tts`, `requirements-narration.txt`, `pip install --user`, or a narration author command.

Run:

```bash
npm test -- tests/unit/ci-workflow.test.ts
```

Expected: FAIL because the current strict gate covers only the prior root tests, web type-check, and web build.

- [ ] **Step 2: Add exact root scripts**

Add these scripts while retaining the Vercel-facing root `build` command:

```json
{
  "reports:validate": "tsx scripts/validate-simulation-quality-reports.ts",
  "reports:test": "python3 -m unittest discover -s tests/reporting -p 'test_*.py' -v",
  "reports:generate": "python3 scripts/generate_simulation_quality_report.py --output-dir output/pdf && python3 scripts/generate_new_simulations_top_10_mistakes.py --output-dir output/pdf && python3 scripts/generate_aditya_contribution_report.py --output-dir output/pdf",
  "reports:check": "python3 scripts/check_simulation_quality_reports.py",
  "test:e2e": "playwright test --config playwright.config.ts",
  "api:test": "npm --workspace @xr-school/api run test",
  "api:build": "npm --workspace @xr-school/api run build"
}
```

Retain the foundation-provided `type-check:packages`, `build:packages`, `narration:validate`, and explicit `narration:author` scripts; do not introduce duplicate workspace aliases or invoke authoring from any other script. Set root `verify` in this order: environment check; TypeSpec compile/drift; catalog validation/generation; simulation/registry validation; narration validation; report data validation; Vitest; `type-check:packages`; API tests; `build:packages`; API/web builds; report tests/freshness; local Playwright acceptance. The web build must precede Playwright because the config starts `next start`.

- [ ] **Step 3: Update both workflows with identical prerequisites**

Before `npm run verify`, both `.github/workflows/quality.yml` and the `verify` job in `.github/workflows/deploy.yml` must:

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: "3.12"
- name: Install report dependencies
  run: python -m pip install -r requirements-report.txt
- name: Install Poppler
  run: sudo apt-get update && sudo apt-get install -y poppler-utils
- name: Install Chromium
  run: npx playwright install --with-deps chromium
```

Keep generated-source freshness strict and add all three Markdown/PDF pairs plus the three report data files and visual-QA manifest to the freshness check. The Vercel deploy job itself runs only `vercel pull`, `vercel build`, and `vercel deploy`; it must not install report/narration Python packages or generate media.

- [ ] **Step 4: Document the exact local gate and authoring boundary**

README must show `python3 -m pip install -r requirements-report.txt`, `npx playwright install chromium`, `npm run verify`, `npm run reports:generate`, `npm run reports:check`, and `npm run narration:validate`. State that narration authoring is explicit, provider/network dependent, and never part of build/deploy.

- [ ] **Step 5: Run focused CI policy tests**

```bash
npm test -- tests/unit/ci-workflow.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the release gates**

```bash
git add package.json .github/workflows/quality.yml .github/workflows/deploy.yml tests/unit/ci-workflow.test.ts README.md
git commit -m "ci: gate simulation reports and browser acceptance"
```

## Task 10: Run the complete clean-checkout verification

**Files:**

- Verify only; fix only failures attributable to this integration.

- [ ] **Step 1: Confirm the branch and merge ancestry**

```bash
test "$(git branch --show-current)" = "integration/aditya-simulation-suite"
git merge-base --is-ancestor 621dfb61b39a4c49e8abb46ce60c54ea3d044479 HEAD
git rev-list --merges --parents HEAD | rg '621dfb61b39a4c49e8abb46ce60c54ea3d044479'
```

Expected: all commands exit 0; the merge-history line contains the immutable PR head as one parent.

- [ ] **Step 2: Reinstall from the lockfile and install verification-only dependencies**

```bash
npm ci
python3 -m pip install -r requirements-report.txt
npx playwright install chromium
```

Expected: clean installs complete; no narration files change.

- [ ] **Step 3: Run focused domain, registry, report, API, and browser suites**

```bash
npm test -- tests/unit/pr8-quality-evidence.test.ts tests/unit/simulation-quality-data.test.ts tests/unit/simulation-authoring-standard.test.ts tests/unit/simulation-experience-acceptance-contract.test.ts tests/unit/api-simulation-registry.test.ts tests/unit/release-metadata.test.ts tests/unit/ci-workflow.test.ts
npm test -- tests/unit/float-or-sink-model.test.ts tests/unit/solubility-model.test.ts tests/unit/lipid-test-model.test.ts tests/unit/nutrition-match-model.test.ts tests/unit/shape-sorting-model.test.ts
npm run reports:validate
npm run narration:validate
npm run type-check:packages
npm run build:packages
npm run api:test
npm run api:build
npm run reports:test
npm run reports:check
npm --workspace apps/web run type-check
npm --workspace apps/web run build
npx playwright test tests/e2e/simulation-portfolio.spec.ts tests/e2e/guided-simulation-routes.spec.ts tests/e2e/interactive-investigations.spec.ts --config playwright.config.ts
```

Expected: every command exits 0; validator reports 35/35/23; all canonical/legacy browser checks pass; no 404/403 asset responses or console errors occur.

- [ ] **Step 4: Run the exact root release gate**

```bash
npm run verify
git diff --check
git status --short
```

Expected: `npm run verify` and `git diff --check` exit 0; `git status --short` is empty. If generated artifacts differ, regenerate, rerender/reinspect PDFs, record new hashes, commit, and repeat this step.

## Task 11: Rebase safely, push the integration head to `main`, and validate production

**Files:**

- Create after first deployment validation: `reports/data/production-release-evidence.json`
- Regenerate after evidence capture: all six report artifacts and `reports/data/simulation-quality-pdf-visual-qa.json`

- [ ] **Step 1: Fetch current remote main and preserve merge topology**

```bash
git fetch origin main
git rebase --rebase-merges origin/main
git merge-base --is-ancestor origin/main HEAD
git merge-base --is-ancestor 621dfb61b39a4c49e8abb46ce60c54ea3d044479 HEAD
git rev-list --merges --parents HEAD | rg '621dfb61b39a4c49e8abb46ce60c54ea3d044479'
```

Expected: rebase completes without flattening the PR merge; both ancestry checks and the direct-parent search pass. If conflicts occur, resolve only integration-owned files, rerun Task 10, and do not touch the user's other worktree.

- [ ] **Step 2: Re-run the complete gate after any rewritten commit IDs**

```bash
npm run verify
git diff --check
test -z "$(git status --porcelain)"
```

Expected: all exit 0.

- [ ] **Step 3: Push without force**

```bash
RELEASE_SHA="$(git rev-parse HEAD)"
git push origin HEAD:main
test "$(git ls-remote origin refs/heads/main | cut -f1)" = "$RELEASE_SHA"
```

Expected: a normal fast-forward push reports `HEAD -> main`; the remote SHA equals `RELEASE_SHA`. Never use `--force` or `--force-with-lease`.

- [ ] **Step 4: Wait for Quality and Deploy to Vercel**

```bash
QUALITY_RUN_ID="$(gh run list --repo Amritesh/xr-school --workflow quality.yml --branch main --limit 20 --json databaseId,headSha --jq ".[] | select(.headSha == \"$RELEASE_SHA\") | .databaseId" | head -n 1)"
DEPLOY_RUN_ID="$(gh run list --repo Amritesh/xr-school --workflow deploy.yml --branch main --limit 20 --json databaseId,headSha --jq ".[] | select(.headSha == \"$RELEASE_SHA\") | .databaseId" | head -n 1)"
gh run watch "$QUALITY_RUN_ID" --repo Amritesh/xr-school --exit-status
gh run watch "$DEPLOY_RUN_ID" --repo Amritesh/xr-school --exit-status
```

Expected: both runs conclude `success`. Also run:

```bash
gh pr view 8 --repo Amritesh/xr-school --json state,mergedAt,headRefOid
```

Expected: PR #8 is recognized as merged and `headRefOid` is the immutable PR head.

- [ ] **Step 5: Verify the deployed SHA and every public route**

```bash
XR_BASE_URL=https://xr-school.vercel.app XR_EXPECTED_SHA="$RELEASE_SHA" npx playwright test tests/e2e/production-release.spec.ts --config playwright.config.ts --project=chromium
```

Expected: `/api/release` reaches `RELEASE_SHA`; the public catalogue and all 22 net-new canonical routes, enhanced Solubility, all legacy redirects, canvas launches, required assets, and representative interactions pass with zero unexpected console or HTTP errors.

- [ ] **Step 6: Record first-deployment evidence without overstating maturity**

Create `reports/data/production-release-evidence.json` with the actual `RELEASE_SHA`, public base URL, GitHub Quality/Deploy run URLs, Vercel deployment URL, audit timestamp, and per-route results emitted by production Playwright. Record Quest and classroom status as `not-run`. Reference this evidence from the portfolio and contribution datasets where deployment scores increased.

- [ ] **Step 7: Regenerate and visually reapprove evidence-bearing reports**

```bash
npm run reports:validate
npm run reports:generate
python3 scripts/render_simulation_quality_pdf_qa.py
python3 scripts/record_simulation_quality_pdf_qa.py --reviewer codex --approve-all-rendered-pages
npm run reports:check
npm run verify
```

Expected: all reports mention the actual validated release SHA; every updated PDF page has been rerendered and inspected; all gates pass.

- [ ] **Step 8: Commit and push the evidence-only follow-up**

```bash
git add reports/data/production-release-evidence.json reports/data/implemented-simulation-quality-cards.json reports/data/implemented-simulation-quality-evidence.json reports/data/new-simulation-before-after-scorecard.json reports/data/simulation-quality-pdf-visual-qa.json output/pdf
git commit -m "release: record simulation suite production evidence"
FINAL_SHA="$(git rev-parse HEAD)"
git fetch origin main
git rebase --rebase-merges origin/main
git push origin HEAD:main
```

Expected: a normal fast-forward push succeeds. The evidence describes the first deployed product SHA; the follow-up commit changes only report/evidence artifacts.

- [ ] **Step 9: Verify the final evidence-only deployment and handoff**

```bash
FINAL_SHA="$(git rev-parse HEAD)"
XR_BASE_URL=https://xr-school.vercel.app XR_EXPECTED_SHA="$FINAL_SHA" npx playwright test tests/e2e/production-release.spec.ts --config playwright.config.ts --project=chromium
git ls-remote origin refs/heads/main
git status --short
```

Expected: production serves `FINAL_SHA`, hosted acceptance passes again, remote `main` equals `FINAL_SHA`, and the integration worktree is clean. Report the two SHAs, Quality/Deploy run URLs, production URL, report paths, 35/23/10 counts, and the explicit remaining limitation that no physical Quest or classroom session was performed.

## Final self-review checklist

- [ ] **Spec coverage:** 35 released simulations appear exactly once; all 23 contributions appear in before/after data and the appendix; the Solubility overlap is one enhancement, not a duplicate class.
- [ ] **Report coverage:** portfolio, top-ten mistakes, and Aditya contribution reports exist in both Markdown and PDF; the authoring standard exists at the required path.
- [ ] **Evidence integrity:** every score is within weight, every increase has implementation and verification references, and internal QA is never described as device/classroom/school validation.
- [ ] **PR integrity:** immutable head `621dfb61b39a4c49e8abb46ce60c54ea3d044479` remains in main ancestry and the two-parent merge remains recognizable.
- [ ] **Build boundary:** no build, verify, CI, or deploy command installs narration packages, calls a voice provider, or creates tracked narration assets.
- [ ] **Browser coverage:** all 35 canonical routes, every legacy path, assets, launch controls, and representative completion flows pass locally and online.
- [ ] **PDF quality:** latest PDF hashes match the visual-QA manifest and every rendered page has zero clipping, overlap, unreadable glyphs, broken tables, or inconsistent headers/footers.
- [ ] **Repository quality:** `npm run verify`, `git diff --check`, both GitHub workflows, and final production acceptance pass; worktree is clean.
- [ ] **Placeholder scan:** `rg -n 'T[B]D|T[O]DO|implement[[:space:]]later|fill[[:space:]]in[[:space:]]details|similar[[:space:]]to[[:space:]]task|<[s]lug>|<[p]ath>' docs/superpowers/plans/2026-08-01-simulation-quality-reports-and-release.md` returns no matches.
- [ ] **Type consistency:** registry helper names, `ImplementedSimulationDefinition` fields, acceptance hooks, score dimensions, dataset property names, and CLI flags match across every task.
