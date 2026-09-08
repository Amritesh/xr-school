# Aditya Contribution Improvement Assessment

**Contributor credit:** GitHub @Adityakrpand

**Reviewed source:** PR #8 at immutable head `621dfb61b39a4c49e8abb46ce60c54ea3d044479`

**Contribution outcome:** 22 contributions became new canonical released classes; 1 contribution improved the existing Solubility class.

**Portfolio indicator movement:** 55.4/100 baseline to 79.9/100 integrated internal QA.

This assessment credits the curriculum, scene, narration, and panorama work supported by evidence. It explains what the integration system changed and what future classes should do from the start. It is a contribution-improvement assessment, not a performance review.

Publication and evidence maturity remain separate: all classes are released at internal QA. Repository and browser evidence do not replace physical Quest acceptance or controlled classroom evidence.

## What to keep doing

- Start from a specific curriculum concept and turn it into a visible learner journey.
- Preserve useful scene ideas, narration writing, and locally owned panorama work with explicit provenance.
- Make the intended student action and observation concrete enough for reviewers to test.
- Contribute in reviewable curriculum slices so the class can be mapped to one canonical identity.

## How to read each contribution card

Baseline scores use only the immutable PR head. Integrated scores use the remediated canonical library. A positive delta measures product-contract improvement, not an individual grade. Remaining risks keep absent device and classroom evidence visible.

## Contribution 01: walls-tell-stories-ancient-fort-visit

**Title:** A Visit of an Ancient Fort

**Canonical class:** `c5-ch10-a01-a-visit-of-ancient-fort`

**Integration:** new-class

**Baseline score:** 65/100

**Integrated score:** 79/100

**Score delta:** +14

### Baseline strengths

- Selected the curriculum-aligned A Visit of an Ancient Fort topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Contributor audio existed, but stable cue ownership, content hashes, captions, and shared playback lifecycle were not standardized.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch10-a01-a-visit-of-ancient-fort`
- `narration:guided-ancient-fort`
- `npm run verify`
- `/simulations/c5-ch10-a01-a-visit-of-ancient-fort`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 02: up-you-go-snow-mountain-climbing

**Title:** Snow Mountain Climbing

**Canonical class:** `c5-ch09-a04-snow-mountain-climbing`

**Integration:** new-class

**Baseline score:** 52/100

**Integrated score:** 79/100

**Score delta:** +27

### Baseline strengths

- Selected the curriculum-aligned Snow Mountain Climbing topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch09-a04-snow-mountain-climbing`
- `narration:guided-snow-mountain-climbing`
- `npm run verify`
- `/simulations/c5-ch09-a04-snow-mountain-climbing`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 03: up-you-go-camp-in-snow

**Title:** Camp in the Snow

**Canonical class:** `c5-ch09-a03-camp-in-the-snow`

**Integration:** new-class

**Baseline score:** 51/100

**Integrated score:** 79/100

**Score delta:** +28

### Baseline strengths

- Selected the curriculum-aligned Camp in the Snow topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch09-a03-camp-in-the-snow`
- `narration:guided-camp-in-snow`
- `npm run verify`
- `/simulations/c5-ch09-a03-camp-in-the-snow`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 04: up-you-go-rock-climbing

**Title:** Rock Climbing

**Canonical class:** `c5-ch09-a02-rock-climbing`

**Integration:** new-class

**Baseline score:** 61/100

**Integrated score:** 79/100

**Score delta:** +18

### Baseline strengths

- Selected the curriculum-aligned Rock Climbing topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Contributor audio existed, but stable cue ownership, content hashes, captions, and shared playback lifecycle were not standardized.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch09-a02-rock-climbing`
- `narration:guided-rock-climbing`
- `npm run verify`
- `/simulations/c5-ch09-a02-rock-climbing`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 05: up-you-go-river-crossing-adventure

**Title:** River Crossing Adventure

**Canonical class:** `c5-ch09-a01-river-crossing-adventure`

**Integration:** new-class

**Baseline score:** 52/100

**Integrated score:** 79/100

**Score delta:** +27

### Baseline strengths

- Selected the curriculum-aligned River Crossing Adventure topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch09-a01-river-crossing-adventure`
- `narration:guided-river-crossing`
- `npm run verify`
- `/simulations/c5-ch09-a01-river-crossing-adventure`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 06: treat-for-mosquitoes-mosquito-life-cycle

**Title:** Life Cycle of the Mosquito

**Canonical class:** `c5-ch08-a02-life-cycle-of-the-mosquito`

**Integration:** new-class

**Baseline score:** 57/100

**Integrated score:** 79/100

**Score delta:** +22

### Baseline strengths

- Selected the curriculum-aligned Life Cycle of the Mosquito topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch08-a02-life-cycle-of-the-mosquito`
- `narration:guided-mosquito-life-cycle`
- `npm run verify`
- `/simulations/c5-ch08-a02-life-cycle-of-the-mosquito`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 07: treat-for-mosquitoes-malaria-diagnosis

**Title:** Diagnosis of Malaria

**Canonical class:** `c5-ch08-a01-diagnosis-of-malaria`

**Integration:** new-class

**Baseline score:** 57/100

**Integrated score:** 79/100

**Score delta:** +22

### Baseline strengths

- Selected the curriculum-aligned Diagnosis of Malaria topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch08-a01-diagnosis-of-malaria`
- `narration:guided-malaria-diagnosis`
- `npm run verify`
- `/simulations/c5-ch08-a01-diagnosis-of-malaria`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 08: experiments-with-water-float-or-sink

**Title:** What Floats, What Sinks?

**Canonical class:** `c5-ch07-a01-a-concept-about-what-floats-what-sinks`

**Integration:** new-class

**Baseline score:** 64/100

**Integrated score:** 82/100

**Score delta:** +18

### Baseline strengths

- Selected the curriculum-aligned What Floats, What Sinks? topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, assessment, narration, assets, legacy route, and release state into the canonical content registry.
- Separated pure domain outcomes from the shared interactive investigation session so unknown actions cannot advance the lesson.
- Added executable behavior tests and registered the class through the shared route/viewer host instead of a viewer-local lifecycle.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/interactive/floatOrSink.ts`
- `tests/unit/interactive-investigation-session.test.ts`
- `assets-c5-ch07-a01-a-concept-about-what-floats-what-sinks`
- `narration-c5-ch07-a01-a-concept-about-what-floats-what-sinks`
- `npm run verify`
- `/simulations/c5-ch07-a01-a-concept-about-what-floats-what-sinks`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 09: experiments-with-water-dead-sea-salt-water

**Title:** Dead Sea: Salt Water and Its Effects

**Canonical class:** `c5-ch07-a02-dead-sea-salt-water-and-its-effects`

**Integration:** new-class

**Baseline score:** 56/100

**Integrated score:** 79/100

**Score delta:** +23

### Baseline strengths

- Selected the curriculum-aligned Dead Sea: Salt Water and Its Effects topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch07-a02-dead-sea-salt-water-and-its-effects`
- `narration:guided-dead-sea-salt-water`
- `npm run verify`
- `/simulations/c5-ch07-a02-dead-sea-salt-water-and-its-effects`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 10: experiments-with-water-soluble-insoluble

**Title:** Soluble and Insoluble Substances Lab

**Canonical class:** `c5-ch07-a03-soluble-and-insoluble-substances`

**Integration:** existing-enhancement

**Baseline score:** 63/100

**Integrated score:** 85/100

**Score delta:** +22

### Baseline strengths

- Selected the curriculum-aligned Soluble and Insoluble Substances Lab topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Integrated the useful PR experiment as an enhancement of the existing Solubility class, avoiding a duplicate 36th simulation.
- Moved curriculum, assessment, narration, assets, legacy route, and release state into the canonical content registry.
- Separated pure domain outcomes from the shared interactive investigation session so unknown actions cannot advance the lesson.
- Added executable behavior tests and registered the class through the shared route/viewer host instead of a viewer-local lifecycle.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/interactive/solubility.ts`
- `tests/unit/interactive-investigation-session.test.ts`
- `assets-c5-ch07-a03-soluble-and-insoluble-substances`
- `narration-c5-ch07-a03-soluble-and-insoluble-substances`
- `npm run verify`
- `/simulations/c5-ch07-a03-soluble-and-insoluble-substances`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 11: every-drop-counts-rainwater-storage

**Title:** The Storage of Rainwater

**Canonical class:** `c5-ch06-a01-the-storage-of-rainwater`

**Integration:** new-class

**Baseline score:** 54/100

**Integrated score:** 79/100

**Score delta:** +25

### Baseline strengths

- Selected the curriculum-aligned The Storage of Rainwater topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch06-a01-the-storage-of-rainwater`
- `narration:guided-rainwater-storage`
- `npm run verify`
- `/simulations/c5-ch06-a01-the-storage-of-rainwater`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 12: every-drop-counts-stepwell-structure

**Title:** A Step Well Structure

**Canonical class:** `c5-ch06-a02-a-step-well-structure`

**Integration:** new-class

**Baseline score:** 52/100

**Integrated score:** 79/100

**Score delta:** +27

### Baseline strengths

- Selected the curriculum-aligned A Step Well Structure topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch06-a02-a-step-well-structure`
- `narration:guided-stepwell-structure`
- `npm run verify`
- `/simulations/c5-ch06-a02-a-step-well-structure`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 13: seeds-and-seeds-seed-dispersal

**Title:** Seed Dispersal

**Canonical class:** `c5-ch05-a02-seed-dispersal`

**Integration:** new-class

**Baseline score:** 54/100

**Integrated score:** 79/100

**Score delta:** +25

### Baseline strengths

- Selected the curriculum-aligned Seed Dispersal topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch05-a02-seed-dispersal`
- `narration:guided-seed-dispersal`
- `npm run verify`
- `/simulations/c5-ch05-a02-seed-dispersal`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 14: seeds-and-seeds-pitcher-plant

**Title:** Pitcher Plant - The Insect Hunter

**Canonical class:** `c5-ch05-a01-pitcher-plant-the-insect-hunter`

**Integration:** new-class

**Baseline score:** 54/100

**Integrated score:** 79/100

**Score delta:** +25

### Baseline strengths

- Selected the curriculum-aligned Pitcher Plant - The Insect Hunter topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch05-a01-pitcher-plant-the-insect-hunter`
- `narration:guided-pitcher-plant`
- `npm run verify`
- `/simulations/c5-ch05-a01-pitcher-plant-the-insect-hunter`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 15: mangoes-round-the-year-aam-papad

**Title:** The Making of Aam Papad

**Canonical class:** `c5-ch04-a03-the-making-of-aam-papad`

**Integration:** new-class

**Baseline score:** 50/100

**Integrated score:** 79/100

**Score delta:** +29

### Baseline strengths

- Selected the curriculum-aligned The Making of Aam Papad topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch04-a03-the-making-of-aam-papad`
- `narration:guided-aam-papad`
- `npm run verify`
- `/simulations/c5-ch04-a03-the-making-of-aam-papad`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 16: mangoes-round-the-year-milk-spoilage

**Title:** Milk Spoilage

**Canonical class:** `c5-ch04-a02-milk-spoilage`

**Integration:** new-class

**Baseline score:** 50/100

**Integrated score:** 79/100

**Score delta:** +29

### Baseline strengths

- Selected the curriculum-aligned Milk Spoilage topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch04-a02-milk-spoilage`
- `narration:guided-milk-spoilage`
- `npm run verify`
- `/simulations/c5-ch04-a02-milk-spoilage`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 17: mangoes-round-the-year-food-spoilage

**Title:** Food Spoilage

**Canonical class:** `c5-ch04-a01-food-spoilage`

**Integration:** new-class

**Baseline score:** 50/100

**Integrated score:** 79/100

**Score delta:** +29

### Baseline strengths

- Selected the curriculum-aligned Food Spoilage topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c05-ch04-a01-food-spoilage`
- `narration:guided-food-spoilage`
- `npm run verify`
- `/simulations/c5-ch04-a01-food-spoilage`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 18: sorting-materials-by-shape

**Title:** Sorting Materials According to Their Shape

**Canonical class:** `c6-ch04-a01-sorting-materials-according-to-their-shape`

**Integration:** new-class

**Baseline score:** 51/100

**Integrated score:** 82/100

**Score delta:** +31

### Baseline strengths

- Selected the curriculum-aligned Sorting Materials According to Their Shape topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, assessment, narration, assets, legacy route, and release state into the canonical content registry.
- Separated pure domain outcomes from the shared interactive investigation session so unknown actions cannot advance the lesson.
- Added executable behavior tests and registered the class through the shared route/viewer host instead of a viewer-local lifecycle.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/interactive/shapeSorting.ts`
- `tests/unit/interactive-investigation-session.test.ts`
- `assets-c6-ch04-a01-sorting-materials-according-to-their-shape`
- `narration-c6-ch04-a01-sorting-materials-according-to-their-shape`
- `npm run verify`
- `/simulations/c6-ch04-a01-sorting-materials-according-to-their-shape`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 19: fibre-to-fabric-cotton-farming

**Title:** Cotton Farming

**Canonical class:** `c6-ch03-a01-cotton-farming`

**Integration:** new-class

**Baseline score:** 52/100

**Integrated score:** 79/100

**Score delta:** +27

### Baseline strengths

- Selected the curriculum-aligned Cotton Farming topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c06-ch03-a01-cotton-farming`
- `narration:guided-cotton-farming`
- `npm run verify`
- `/simulations/c6-ch03-a01-cotton-farming`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 20: fibre-to-fabric-cotton-ginning

**Title:** The Process of Cotton Ginning

**Canonical class:** `c6-ch03-a02-the-process-of-cotton-ginning`

**Integration:** new-class

**Baseline score:** 52/100

**Integrated score:** 79/100

**Score delta:** +27

### Baseline strengths

- Selected the curriculum-aligned The Process of Cotton Ginning topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, narration, assessment, assets, legacy route, and release state into a validated ImplementedSimulationDefinition.
- Replaced the cloned renderer/controller lifecycle with a shared guided viewer, declarative scene adapter, normalized actions, and evidence-gated controller.
- Converted contributor panoramas to bounded local WebP assets, retained explicit credit, added digest checks, and preserved scene fallbacks.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/guided/definitions.generated.ts`
- `tests/unit/guided-simulation-controller.test.ts`
- `assets:sim-c06-ch03-a02-the-process-of-cotton-ginning`
- `narration:guided-cotton-ginning`
- `npm run verify`
- `/simulations/c6-ch03-a02-the-process-of-cotton-ginning`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 21: components-of-food-mineral-sources

**Title:** The Sources of Minerals in Food

**Canonical class:** `c6-ch02-a05-the-sources-of-minerals-in-food`

**Integration:** new-class

**Baseline score:** 58/100

**Integrated score:** 82/100

**Score delta:** +24

### Baseline strengths

- Selected the curriculum-aligned The Sources of Minerals in Food topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, assessment, narration, assets, legacy route, and release state into the canonical content registry.
- Separated pure domain outcomes from the shared interactive investigation session so unknown actions cannot advance the lesson.
- Added executable behavior tests and registered the class through the shared route/viewer host instead of a viewer-local lifecycle.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/interactive/mineralSources.ts`
- `tests/unit/interactive-investigation-session.test.ts`
- `assets-c6-ch02-a05-the-sources-of-minerals-in-food`
- `narration-c6-ch02-a05-the-sources-of-minerals-in-food`
- `npm run verify`
- `/simulations/c6-ch02-a05-the-sources-of-minerals-in-food`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 22: components-of-food-vitamins-deficiencies

**Title:** Sources of Vitamins and Their Deficiencies

**Canonical class:** `c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies`

**Integration:** new-class

**Baseline score:** 58/100

**Integrated score:** 82/100

**Score delta:** +24

### Baseline strengths

- Selected the curriculum-aligned Sources of Vitamins and Their Deficiencies topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, assessment, narration, assets, legacy route, and release state into the canonical content registry.
- Separated pure domain outcomes from the shared interactive investigation session so unknown actions cannot advance the lesson.
- Added executable behavior tests and registered the class through the shared route/viewer host instead of a viewer-local lifecycle.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/interactive/vitaminDeficiencies.ts`
- `tests/unit/interactive-investigation-session.test.ts`
- `assets-c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies`
- `narration-c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies`
- `npm run verify`
- `/simulations/c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Contribution 23: components-of-food-lipid-test

**Title:** Test the Presence of Lipids

**Canonical class:** `c6-ch02-a03-test-the-presence-of-lipids`

**Integration:** new-class

**Baseline score:** 62/100

**Integrated score:** 82/100

**Score delta:** +20

### Baseline strengths

- Selected the curriculum-aligned Test the Presence of Lipids topic and expressed it as a staged spatial class.
- Contributed useful learner-facing scene, interaction, panorama, and narration ideas that could be retained during integration.
- Established a working route-level prototype that made the intended student journey concrete for review.

### Baseline defects

- The viewer owned renderer, animation, input, audio, state, and disposal concerns instead of using the project runtime contract.
- The regression test inspected source strings rather than executing the learner behavior, so it could pass while the class was broken.
- Narration depended on missing files or runtime/browser speech; the PR portfolio referenced 189 requests while only 16 clips were tracked.

### Implemented remediation

- Moved curriculum, assessment, narration, assets, legacy route, and release state into the canonical content registry.
- Separated pure domain outcomes from the shared interactive investigation session so unknown actions cannot advance the lesson.
- Added executable behavior tests and registered the class through the shared route/viewer host instead of a viewer-local lifecycle.

### Remediation evidence paths

- `packages/simulation-content/src/implemented/interactive/lipidTest.ts`
- `tests/unit/interactive-investigation-session.test.ts`
- `assets-c6-ch02-a03-test-the-presence-of-lipids`
- `narration-c6-ch02-a03-test-the-presence-of-lipids`
- `npm run verify`
- `/simulations/c6-ch02-a03-test-the-presence-of-lipids`

### Remaining risk

- No signed physical-headset acceptance has been run, so comfort, controller discoverability, frame rate, and listener quality remain internal-QA risks.
- No controlled classroom study has been run, so the release makes no claim of measured learning improvement.
- Upstream generation/license metadata for the contributed panorama remains undocumented and is carried as an explicit provenance limitation.

### Next action

Run the published reviewer checklist on a representative browser and headset, then pilot with a teacher and record evidence before raising maturity.

## Authoring checklist for the next contribution

Use `docs/simulation-design/simulation-authoring-standard.md` as the normative class contract.

- Register one canonical identity, route, legacy aliases, publication status, and evidence maturity.
- Compose a definition, domain/session model, and scene adapter over shared runtime and web packages.
- Require an explicit learner action and evidence before forward progression.
- Test behavior, scientific invariants, cleanup, input parity, narration ownership, and fallback behavior.
- Commit narration manifests and assets with stable IDs, hashes, captions, credits, and licenses.
- Keep production builds offline; narration generation is an explicit authoring action.
- Record browser, physical-device, and classroom evidence separately; never infer one from another.

## Closing position

The contribution set supplied substantial curriculum coverage and concrete simulation ideas. The integrated library demonstrates how those ideas become maintainable released classes: one registry, shared lifecycles, declared evidence gates, reproducible assets, behavior tests, and honest evidence maturity. The next contribution should begin with those contracts instead of retrofitting them after a viewer is complete.
