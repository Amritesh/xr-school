# Implemented Simulation Quality Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a polished, evidence-backed management PDF with a portfolio summary and one quality card for each of the 13 launchable XR School simulations.

**Architecture:** Gather independent live-deployment and repository evidence, translate that evidence through a fixed 100-point management rubric, then generate both Markdown and PDF from one structured card dataset. Keep temporary browser evidence separate from final deliverables and visually inspect every rendered PDF page before handoff.

**Tech Stack:** Playwright with system Chromium, Python 3, ReportLab, pdfplumber/pypdf, Poppler, Markdown, repository test and release metadata.

---

## File Structure

- Create `tmp/pdfs/quality-audit/live-evidence.json` - route health, console health, canvas presence, controls, and captured screenshots.
- Create `tmp/pdfs/quality-audit/repository-evidence.json` - asset, narration, test, interaction, and implementation signals.
- Create `tmp/pdfs/quality-audit/cards.json` - final structured scores and management findings used by both report formats.
- Create `scripts/generate_simulation_quality_report.py` - validate card data, write Markdown, and render the executive PDF.
- Create `output/pdf/xr-school-implemented-simulations-quality-report.md` - readable source report.
- Create `output/pdf/xr-school-implemented-simulations-quality-report.pdf` - final management artifact.

### Task 1: Capture live deployment evidence

**Files:**
- Create: `tmp/pdfs/quality-audit/live-evidence.json`
- Create: `tmp/pdfs/quality-audit/screenshots/<slug>.png`

- [ ] **Step 1: Enumerate exactly the launchable simulations**

Read `IMPLEMENTED_SIMULATION_SLUGS` from `apps/web/lib/simulationAvailability.ts` and assert that the result contains 13 unique slugs.

- [ ] **Step 2: Visit every production route**

Use Playwright with `/Applications/Chromium.app/Contents/MacOS/Chromium`, a 1440 x 900 viewport, and `https://xr-school.vercel.app/simulations/<slug>`. Record HTTP status, page errors, console errors, canvas count, visible button labels, and resource timing entries.

- [ ] **Step 3: Enter the browser experience when a launch gate is present**

Try visible buttons matching `Start browser`, `Start`, `Begin`, `Launch`, or `Enter`. Wait for the real-time scene, then capture the screenshot and post-launch evidence. A missing launch button is acceptable when the scene loads directly.

- [ ] **Step 4: Validate the live evidence**

Run a Python assertion that there are 13 unique records, every route returns HTTP 200, and every record has a screenshot. Report console errors explicitly rather than discarding them.

### Task 2: Capture repository evidence

**Files:**
- Create: `tmp/pdfs/quality-audit/repository-evidence.json`

- [ ] **Step 1: Map slugs to viewer, model, world, and test files**

Use dedicated route imports and the viewer/test naming conventions to record the relevant implementation files for each simulation. Record the launch-list versus canonical-module discrepancy for Colour Adventure.

- [ ] **Step 2: Measure asset and narration coverage**

Count referenced local textures, models, and packaged audio clips by simulation. Use `ffprobe` where available to record codec, sample rate, channels, bitrate, and duration for packaged narration. Mark browser speech fallback separately from packaged narration.

- [ ] **Step 3: Measure interaction and learning evidence**

Record authored stage count, meaningful action types, prediction/observation/assessment gates, misconception feedback, scientific/domain model presence, browser controls, VR controls, subtitles, comfort options, and accessibility affordances.

- [ ] **Step 4: Measure stability and efficiency evidence**

Record fixed-step runtime use, instancing/PBR/adaptive quality signals, relevant automated test count, release maturity, and any live console failures.

### Task 3: Score and write the management cards

**Files:**
- Create: `tmp/pdfs/quality-audit/cards.json`
- Create: `output/pdf/xr-school-implemented-simulations-quality-report.md`

- [ ] **Step 1: Apply the fixed rubric**

Assign integer scores no higher than each weight: education 20, integrity 15, interactivity 15, visuals 15, audio 10, usability 10, stability 10, and deployment 5. Compute the total from the dimensions; do not enter totals independently.

- [ ] **Step 2: Apply conservative caps**

Cap deployment readiness below full marks while the module is Internal QA, cap evidence confidence where headset or classroom acceptance is absent, and penalize governance mismatches, narration gaps, console errors, or purely procedural asset sets.

- [ ] **Step 3: Write decision-oriented findings**

For every simulation provide one management summary, three strengths, three gaps/risks, one next investment action, and an evidence confidence label. Use plain language and distinguish observed evidence from inference.

- [ ] **Step 4: Validate card completeness and arithmetic**

Assert that all 13 slugs occur exactly once, every dimension stays within its weight, every total equals the dimension sum, every card has strengths/risks/action, and bands follow the design thresholds.

### Task 4: Generate the executive PDF

**Files:**
- Create: `scripts/generate_simulation_quality_report.py`
- Create: `output/pdf/xr-school-implemented-simulations-quality-report.pdf`

- [ ] **Step 1: Build shared report primitives**

Implement ReportLab helpers for page headers/footers, wrapped text, score badges, horizontal dimension bars, risk/strength blocks, and tables. Use ASCII hyphens and embedded system fonts that render reliably.

- [ ] **Step 2: Render the portfolio pages**

Create a cover, executive summary, ranked portfolio table, readiness distribution, management interpretation, and portfolio priorities. State clearly that the scores are internal product indicators, not measured learning outcomes.

- [ ] **Step 3: Render one quality-card page per simulation**

Each page contains title, grade/subject, total score, band, evidence confidence, eight score bars, management summary, strengths, risks, and recommended action. Keep all content inside fixed page-safe bounds.

- [ ] **Step 4: Render methodology and limitations**

Include rubric weights, evidence sources, audit date, live production URL, Internal QA limitation, lack of classroom outcome data, and the 12-versus-13 governance discrepancy.

### Task 5: Verify and deliver

**Files:**
- Render: `tmp/pdfs/quality-audit/rendered/page-*.png`

- [ ] **Step 1: Run structural verification**

Run the generator and confirm success. Use `pdfinfo` to confirm page count and page size. Use `pdfplumber` to assert all 13 titles, the rubric, limitations, and portfolio actions appear in extracted text.

- [ ] **Step 2: Render every PDF page**

Run `pdftoppm -png output/pdf/xr-school-implemented-simulations-quality-report.pdf tmp/pdfs/quality-audit/rendered/page`.

- [ ] **Step 3: Visually inspect the rendered pages**

Create contact sheets and inspect at full resolution where necessary. Fix any clipping, overlapping text, weak contrast, broken tables, inconsistent score bars, or awkward page transitions; regenerate and re-render after every correction.

- [ ] **Step 4: Run final repository and artifact checks**

Run `git diff --check`, confirm no unrelated files are staged, and verify the final PDF and Markdown paths exist with non-zero size. Leave `.claude/` untouched.

