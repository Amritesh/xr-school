# XR School: broken and passive simulation audit

Audit date: 4 September 2026. Audit only — no simulation code, production deployment, or branch changes made during this review.

## Scope and evidence

Tested deployment: [latest Money-update preview](https://xr-school-work-p6a6572kl-adityateam.vercel.app/simulations).

- All **36 Internal QA builds** opened and responded to a first browser interaction. This includes simple stage-advance actions; it does not imply all 36 provide meaningful hands-on interaction.
- No 404 or blank initial launch was observed in this authenticated preview session.
- Deeper testing found **one reproducible whole-page crash**, **two quiz-completion bypasses**, and **12 Next-only completion paths**.
- Colour Adventure and Preposition Adventure were exercised through their learning/practice stages to the memory activity and celebration. Twelve guided activities were traversed to their ending using only Next. Other lessons received launch/first-action checks, with selected screenshots and additional interaction checks.
- Browser viewport used for the screenshots was 1280 × 720. Code inspection covered the registry, bespoke guided-viewer delegation, relevant progression handlers, and existing production-release smoke tests.
- **Not validated here:** physical Meta Quest, controller B exit, joystick comfort, audible narration from beginning to end, mobile layouts, 10-minute performance, full correct/wrong-answer flows for every lesson, classroom suitability, or the separate production alias.
- The preview requires Vercel authentication for an unauthenticated HTTP client. That is deployment protection, not a simulation 404. Do not use this protected URL as a school-facing release without an appropriate access plan.
- The catalog's remaining **467 entries are gated planning candidates**, not 467 broken simulations. “A Space Shuttle Launching” is currently among the gated entries, not the released 36.

“First action responds” is a limited positive result. “Demonstration” means navigation and preset animation work, but learner manipulation or assessment is weak. Neither label means school-ready.

## Fix first: confirmed defects

### 1. Colour Adventure — crash and invalid completion

**Priority: P1. First recommended repair.**

Reproduction of crash:

1. Open the adventure; complete the introductory action, ten colour-learning actions, and Find the Colour.
2. At stage 13, answer Apple = Red, Banana = Yellow, Grass = Green, and Sun = Yellow using the side-panel buttons.
3. The next question is “What colour are Clouds?” Side-panel options are White, Green, Orange, Red; the scene still contains its fixed Red, Blue, Yellow, Green answer spheres.
4. Click the blue sphere in the 3D scene.
5. The lesson is replaced by the Next.js application-error screen. Console error: `Unknown colour "blue" for question "cloud-white"`.

Separate reproduction of false completion:

1. Reach stage 13 with 0/10 answers. The side-panel Finish Memory Game button is disabled.
2. Click the green 3D Finish sphere.
3. Feedback says the memory game is finished, and Next becomes enabled despite 0/10 answers.
4. Next reaches Rainbow Celebration.

Visual issue: the memory scene does not show the question's apple/cloud/etc.; several 3D labels overlap. The scene and browser panel are not driven by the same active-question model.

Code evidence: `ColourAdventureViewer.tsx:329` creates four fixed colour pads; `:399` accepts the required finish action before checking memory answers; `:419` handles memory pads. `colourAdventureLesson.ts:270` rejects colours outside the current question's options. Stage completion checks only the recorded finish action.

Required change: share one active-question model across DOM/3D/VR; render that question's object and options; validate all action entry points; return retry feedback rather than throwing for a learner selection; require the chosen completion criterion before Finish. Add regressions for the cloud-blue click and 0-answer scene Finish.

### 2. Preposition Adventure — assessment bypass and automatic answers

**Priority: P1. Repair after Colour Adventure.**

- Stage 2 says “one preposition at a time” but displays all 13 placements together, with overlapping labels and generic shapes.
- Stage 3's **Place It Correctly** button directly submits the stored correct answer. Clicking it eight times completed all eight practice challenges without choosing a location or moving an object.
- At stage 4, the scene's Finish sphere enabled Next with **0/6 answers**, while the side-panel Finish Memory Check button remained disabled. Next reached English Champion Celebration.
- The memory view shows A/B/C/D scene targets, while the actual question and answer words are in the browser panel. This is a source/scene parity risk for immersive VR; it was not tested on a headset.

Code evidence: `PrepositionAdventureViewer.tsx:819` dispatches `practiceChallenge.correctPrepositionId`; `:389` accepts required finish actions without an answer-count guard; `:311` creates fixed lettered scene answer targets.

Required change: show one recognizable object/anchor pair, let the learner choose or place it, include wrong-answer feedback, and enforce a single completion guard for DOM, scene, and controller actions.

### 3. Sources of Food Sorting Lab — functional, but visually weak

**Priority: P2.**

Selecting Plant for Rice updated progress, so this is not a dead control. However, rice, tomato, dal, milk, egg, honey, fish, and mushroom are represented by near-identical white token/bowl shapes with text labels. The right-hand panel covers part of the sorting area. After the first correct placement the UI says **1 placed · 13% correct**, which describes total completion rather than accuracy of attempted answers.

Code evidence: `FoodSourcesSortingViewer.tsx:230` creates the same cylinder geometry/material for every food; `:94` calculates the displayed percentage as correct / all eight items, and `:472` labels it “% correct.”

Required change: recognizable food photos/models, a scene-reserving responsive panel, clearer selection feedback, and separate progress and accuracy labels. Preserve the working classification logic.

### 4. Introduction to the Digestive System — works, but needs presentation cleanup

**Priority: P2.**

Start Journey and Place Food in Mouth both completed their required actions, and Next was gated until the action. The student panel exposes long production/story directions labeled “Cinematic,” “Scene,” “Spatial audio,” and “Cues.” At the mouth stage the panel requires scrolling and occupies a substantial part of the view; the camera fills the remainder with a very close-up model.

Required change: concise student instructions, optional teacher transcript, a readable stage-focused view, clearer object manipulation, and full-stage camera/layout testing. Do not classify this as a launch failure.

## Twelve demonstrations that can finish using only Next

For each row below, a fresh launch was followed by **only Next clicks**, without using the named activity action. The final completion screen was reached. The code generally maps both the named action and Next to changing the stage index; some “tasks completed” counters are just that index.

This can be acceptable for a guided tour, but it does **not** demonstrate that a learner performed the advertised practical task or mastered the concept. Keep the current scenes where useful; add real task state and evidence before claiming mastery.

| Simulation | Ending reached | First meaningful improvement |
|---|---|---|
| The Process of Cotton Ginning | Stage 6/6, Ginning complete | Feed cotton, turn the roller/crank, separate and inspect fibre and seeds. |
| Cotton Farming | Stage 7/7, Cotton harvested | Sow, water, compare growth conditions, and pick mature bolls. |
| A Step Well Structure | Stage 7/7, Structure complete | Explore levels, vary water height, identify the reservoir and access route. |
| Seed Dispersal | Stage 7/7, Four dispersal methods mastered | Choose a seed, predict its mechanism, change wind/water, and observe travel. |
| Dead Sea: Salt Water and Its Effects | Stage 8/8, Activity complete | Add measured salt, release the same object, and compare water levels/density. |
| Diagnosis of Malaria | Stage 8/8, Activity complete | Require sample-observation evidence before interpretation; Next currently bypasses the parasite-search stage. Keep professional-care safeguards. |
| Life Cycle of the Mosquito | Stage 8/8, Four life stages mastered | Sequence actual stage models and test the effect of removing standing water. |
| River Crossing Adventure | Stage 8/8, Safety, courage and teamwork mastered | Select/check equipment and anchors; add supervised route decisions and feedback. |
| Rock Climbing | Stage 8/8, Activity complete | Select valid holds and demonstrate safe route decisions, not just advance a preset animation. |
| Camp in the Snow | Stage 8/8, Activity complete | Choose a campsite, assemble layers and compare insulation. |
| Snow Mountain Climbing | Stage 8/8, Activity complete | Make equipment, weather, balance, and turn-back decisions. |
| A Visit of an Ancient Fort | Stage 8/8, Visit complete | Explore hotspots and collect observations rather than count visited slides as discoveries. |

Representative code: `CottonGinningViewer.tsx:179` advances the stage; `:480` exposes unrestricted Next; `:483` reports completed tasks from `stage`. The same stage-only pattern is present in the other listed viewers. Malaria has an additional scan counter, but the browser Next path still reached the ending without scanning.

Suggested order within this group: **Cotton Ginning → Cotton Farming → Stepwell → Seed Dispersal → Dead Sea → Malaria → Mosquito Life Cycle → River Crossing → Rock Climbing → Camp in Snow → Snow Mountain Climbing → Ancient Fort.** This is an implementation recommendation, not a numeric school-readiness rating.

## All 36: coverage and next action

Every row passed initial launch and a first browser-control response. “Retain” means do not prioritize a rewrite based on this limited audit; it is not a full acceptance pass.

| # | Simulation | Observed response / result | Recommendation |
|---|---|---|---|
| 1 | Plant Pollination & Growth Cycle | Inspect flower recorded evidence and enabled Continue. | Retain; test the remaining seven stages and direct model interactions. |
| 2 | Electric Circuits & Resistance | Switch changed OFF to ON, current 0 to 0.900 A, and opened an evidence question. | Retain; test resistance, misconceptions, restart and VR. |
| 3 | States of Matter Particle Lab | Liquid changed state/heat and opened an observation question. | Retain; test phase-change slider and all transitions. |
| 4 | Sources of Food Sorting Lab | Rice → Plant recorded a correct placement. | P2 visual and score-label upgrade described above. |
| 5 | Introduction to the Digestive System | Start and mouth action worked; Next gated. | P2 student-panel and camera cleanup. |
| 6 | The Breathing Process in Human | Trace airway recorded evidence and enabled Continue. | Retain; inspect inhale/exhale views and the full assessment. |
| 7 | Effects of Force on Motion and Shape | Push recorded evidence and enabled Continue. | Retain; test stop, turn, speed and deformation interactions. |
| 8 | Acids, Bases & Neutralisation | Acid test recorded blue-litmus-turns-red evidence. | Retain; test base, pH and neutralisation through completion. |
| 9 | Colour Adventure | First stages work; later 3D choice crashes the page; Finish bypasses quiz. | **P1, fix first.** |
| 10 | Introduction to Money | Enter completed the opening action; responsive dedicated scene and activity panel present. | Preserve the recent repair; perform full Quest/audio and mobile regression before release. |
| 11 | Preposition Adventure | Learning actions work; practice auto-answers; Finish bypasses quiz. | **P1, fix second.** |
| 12 | Solar System: Gravity’s Orchestra | Select Sun recorded evidence and enabled Continue. | Retain; test later mission actions, scale mode and navigation. |
| 13 | Food Spoilage | Observe fresh samples advanced to Day 0. | Guided demonstration; add learner predictions, sample observations and controlled comparison. |
| 14 | Milk Spoilage | Observe fresh milk advanced to Hour 0. | Guided demonstration; add recorded comparisons and temperature/time controls. |
| 15 | The Making of Aam Papad | Set up platform advanced to mango selection. | Guided demonstration; add actual selection, spreading and drying interactions. |
| 16 | Pitcher Plant — The Insect Hunter | Inspect pitcher advanced to modified-leaf stage. | Preserve the user-approved experience; full regression before any optional upgrade. |
| 17 | Seed Dispersal | Release action responds; Next alone reaches mastery ending. | Hands-on upgrade, as above. |
| 18 | The Storage of Rainwater | Guardian action records completion; Next initially disabled, then enabled. | Keep the richer story; audit construction tasks, water accounting and the full 13-mission flow next. |
| 19 | A Step Well Structure | Open structure responds; Next alone reaches ending. | Hands-on exploration upgrade. |
| 20 | Dead Sea: Salt Water and Its Effects | Compare waters responds; Next alone reaches ending. | Measured experiment upgrade. |
| 21 | Diagnosis of Malaria | History action responds; Next bypasses scan and reaches ending. | Evidence-gated investigation upgrade. |
| 22 | Life Cycle of the Mosquito | Begin eggs responds; Next alone reaches mastery ending. | Sequencing and prevention interaction upgrade. |
| 23 | River Crossing Adventure | Inspect equipment responds; Next alone reaches mastery ending. | Decision-based interaction upgrade; retain environmental work. |
| 24 | Rock Climbing | Observe route responds; Next alone reaches ending. | Hold-selection and equipment-check upgrade. |
| 25 | Camp in the Snow | Choose site responds; Next alone reaches ending. | Site-choice and shelter-building upgrade. |
| 26 | Snow Mountain Climbing | Approve route responds; Next alone reaches ending. | Route/weather/equipment decision upgrade. |
| 27 | A Visit of an Ancient Fort | Inspect gate responds; Next alone reaches ending. | Explorable hotspots and observation tasks. |
| 28 | Cotton Farming | Enter field responds; Next alone reports harvested cotton. | Farming-task upgrade. |
| 29 | The Process of Cotton Ginning | Begin responds; Next alone reports ginning complete. | First suggested hands-on demonstration upgrade. |
| 30 | What Floats, What Sinks? | Dry-leaf prediction recorded; next object appears. | Retain mechanics; test all releases/results. Replace raw evidence IDs with child-friendly text. |
| 31 | Soluble and Insoluble Substances | Salt prediction recorded; sugar choices appear. | Retain mechanics; test mixing/settling/filtering. Replace raw evidence IDs. |
| 32 | Test the Presence of Lipids | Peanut prediction recorded; coconut choices appear. | Retain mechanics; test drying and interpretation. Replace raw evidence IDs. |
| 33 | Sources of Vitamins and Their Deficiencies | Vitamin A match accepted; B1 options appear. | Improve choice design: labels currently reveal full source/deficiency links. Replace raw evidence IDs. |
| 34 | The Sources of Minerals in Food | Calcium match accepted; iodine options appear. | Improve choice design: labels currently reveal full source/function links. Replace raw evidence IDs. |
| 35 | Sorting Materials According to Their Shape | Ball → sphere accepted; orange choices appear. | Retain; test wrong groups and all objects; replace raw evidence IDs. |
| 36 | Living Mycelium Lab: Fungi and Its Development | Classification answer moved the task to specimen inspection without prematurely awarding evidence. | Retain; test direct mushroom/mould inspection and the complete investigation. |

## Why previous green checks did not catch this

1. Initial rendering is not lesson acceptance. `tests/e2e/production-release.spec.ts:38` iterates contributions, opens the launch control and verifies a canvas, but does not exercise these memory questions or alternate Finish paths.
2. Seventeen registry entries load bespoke experience components through `bespokeGuidedViewerInput`. `shared/GuidedSimulationViewer.tsx:57` returns that component directly when present. Testing a canonical guided adapter alone therefore does not establish the behavior of the actual rendered bespoke lesson.
3. Button handlers, 3D targets, and controller shortcuts do not always share the same validation. The two memory bypasses demonstrate that disabling a DOM button is insufficient.
4. Completion must be derived from learner actions/evidence, not merely a stage index. A tour ending should say “tour complete,” not “mastered,” unless understanding was assessed.

## One-by-one repair acceptance checklist

For each simulation, before moving to the next:

1. State a clear learning objective and an observable student task.
2. Give the child a visible object and a meaningful choice/manipulation, with safe wrong-answer feedback.
3. Enforce the same state and completion rules for DOM, 3D raycast, touch and controller shortcuts.
4. Run the entire lesson, including wrong answers, replay, back, restart and completion.
5. Verify child-readable panels at desktop and phone sizes; keep the main object visible and labels separated.
6. Listen to complete narration and feedback; verify no interruption, overlap or wrong-clip reuse.
7. Validate on the actual Quest: movement, interaction, narration, B exit, re-entry and sustained performance.
8. Add regression tests for the discovered failure, deploy a preview, and approve that one lesson before starting another.

No production fixes or deployment were performed as part of this audit. Recommended next implementation: **Colour Adventure**, then **Preposition Adventure**.
