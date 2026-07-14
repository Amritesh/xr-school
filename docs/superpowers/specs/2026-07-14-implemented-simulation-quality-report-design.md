# Implemented Simulation Quality Report Design

**Date:** 2026-07-14  
**Audience:** School leadership, product management, academic leadership, and deployment decision-makers

## Purpose

Create a concise, evidence-backed management report that explains the current quality of every genuinely launchable XR School simulation. The report must help a non-technical reader compare portfolio strengths, see material risks, and decide what to improve or pilot next.

## Scope

The report covers the 13 slugs in `IMPLEMENTED_SIMULATION_SLUGS`. It excludes the generic catalog viewer, world-builder diagnostic, and the 497 catalog-only concepts because they are not bespoke launchable simulations.

All 13 simulations are currently classified as **Internal QA**. The report will not describe them as school-validated or production-proven without classroom and headset acceptance evidence.

## Reporting Approach

Use a conservative audit rather than promotional scoring. Ratings will be based on observable repository and deployment evidence:

- live route and browser rendering health;
- authored or procedural visual assets and scene richness;
- packaged narration coverage and audio-file technical characteristics;
- meaningful learner actions and feedback loops;
- curriculum intent, misconception handling, and assessment evidence;
- accessibility, comfort, and browser/VR control coverage;
- fixed-step models, scientific truth functions, and automated tests;
- build, deployment, and release maturity evidence.

If evidence is absent, the report will mark the area as unverified rather than assume quality.

## Management Rubric

Each simulation receives a score out of 100:

| Dimension | Weight | Management question |
|---|---:|---|
| Educational effectiveness | 20 | Does the experience produce understandable learning, evidence, and reflection? |
| Content/scientific integrity | 15 | Is the underlying content or scientific model defensible and tested? |
| Learner interactivity | 15 | Does the learner make meaningful decisions and manipulate the experience? |
| Visual and asset quality | 15 | Is the real-time 3D world clear, coherent, rich, and age-appropriate? |
| Narration and sound | 10 | Is instruction audible, covered, non-overlapping, and technically usable? |
| Usability, accessibility, and comfort | 10 | Can students operate it reliably in browser and VR with suitable support? |
| Performance and stability | 10 | Is the implementation efficient, deterministic where needed, and regression-tested? |
| Deployment readiness | 5 | Is it live, governed, and supported by release evidence? |

The requested “video quality” is intentionally not scored because these are real-time interactive simulations rather than pre-rendered videos. Its useful intent is covered by **Visual and asset quality**.

## Rating Bands

- **85-100 - Pilot candidate:** strong enough for a controlled pilot after headset acceptance.
- **70-84 - Promising internal QA:** valuable experience with identifiable polish or validation gaps.
- **55-69 - Needs focused improvement:** learning value exists, but quality is uneven.
- **Below 55 - Rebuild before pilot:** material product, learning, or reliability weaknesses.

Scores are comparative portfolio indicators, not research evidence of learning outcomes.

## Report Structure

1. Cover and audit statement.
2. Executive portfolio scorecard and readiness distribution.
3. Management interpretation and portfolio-level risks.
4. One full quality card per implemented simulation containing:
   - overall score, band, evidence confidence, and recommended action;
   - eight dimension scores;
   - management summary;
   - strongest evidence;
   - gaps and risks;
   - next investment decision.
5. Cross-portfolio improvement priorities.
6. Methodology, limitations, and evidence sources.

## Deliverables

- A polished PDF at `output/pdf/xr-school-implemented-simulations-quality-report.pdf`.
- A readable Markdown source at `output/pdf/xr-school-implemented-simulations-quality-report.md`.
- Evidence snapshots remain in `tmp/pdfs/` and are not part of the final deliverable.

## Visual Design

Use an executive dark-navy and cyan visual system consistent with XR School. Keep each card skimmable: large score, compact score bars, short evidence statements, and explicit management action. Avoid code terminology unless it materially changes a decision.

## Verification

- Confirm all 13 launchable simulations appear exactly once.
- Confirm weighted totals match displayed dimension scores.
- Check live routes and capture console/render evidence.
- Extract PDF text to confirm content completeness.
- Render every PDF page to PNG and inspect for clipping, overlap, unreadable text, or broken page transitions.

