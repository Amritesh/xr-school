# Living Mycelium Lab — Fungi and Its Development

## Product intent

Implement the catalogued Class 8 simulation `c8-ch02-a03-fungi-and-its-development` as a rich browser and WebXR lesson. The supplied five-minute VR story remains the content spine, expanded into an eight-to-ten-minute guided investigation that gives students time to predict, manipulate, observe, explain, retry, and transfer their understanding.

The experience must feel like one magical, scientifically grounded forest rather than seven disconnected slides. The forest transforms across scale: a mushroom reveals its hyphae, spores travel through the air, bread becomes a time-lapse landscape, and forest portals reveal useful and harmful fungi. Spectacle always carries observable evidence.

## Audience and outcomes

- Primary audience: Classes 8–9, with the canonical curriculum identity remaining Class 8 Chapter 2, “Microorganisms: Friend and Foe.”
- Guided duration: eight to ten minutes, including one normal retry.
- Delivery: desktop browser, touch, keyboard, and immersive WebXR from the same canonical route.
- Core outcome: students explain that fungi are not plants, hyphae form mycelium, spores germinate best in warm moist conditions, bread mould develops through an ordered cycle, fungi can be useful or harmful, and visibly mouldy food should not be eaten.
- Mastery requires observation, misconception resolution, and transfer evidence. Reaching the badge is completion, not automatic mastery.

## Chosen direction

The chosen direction is a guided investigation called **Living Mycelium Lab**. A cinematic tour was rejected because it makes students mostly passive. A completely open growth sandbox was rejected as the main experience because it weakens the supplied narrative and is harder to complete reliably during a short classroom rotation. A compact warm/moist growth sandbox unlocks after the guided mission.

## Learner journey

### 1. Fungal Forensics

The learner enters a cool, misty forest clearing containing a mushroom on a fallen log, mouldy bread on a rock, and a healthy green plant. They inspect and select the two fungi. Selecting the plant produces evidence-based feedback: chlorophyll and photosynthesis distinguish the plant, while mushroom and bread mould absorb nutrients from other material. The stage records classification evidence only after both fungi are selected.

### 2. Under the Cap

The same clearing darkens while a circular mycelium lens reveals luminous branching threads inside the log and soil. The learner touches three growing hypha tips and watches them connect into a network. A quick assessment asks what a group of hyphae is called. The world labels the full network as mycelium only after the observation.

### 3. Spore Flight

Spores release from the mushroom gills as softly glowing dust. The learner guides one spore through a gentle current toward bread, then predicts the best growth condition from dry and cold, warm and moist, or hot and dry. Landing on the warm moist target starts germination and records observable evidence. Incorrect condition choices point back to the moisture and temperature instruments and allow a retry.

### 4. Five-Day Time Lens

The bread expands into a lab-sized terrain while a day dial controls a deterministic development model:

1. Day 1: landed spore, with no visible colony.
2. Day 2: tiny white hyphae appear.
3. Day 3: cotton-like mycelium spreads.
4. Day 4: dark spore-producing structures develop.
5. Day 5: new spores release.

The learner scrubs through all five days, drags the five process labels into a life-cycle ring, and then orders the stages. Labels cannot be completed by a generic Next action; correct placement plus observation produces evidence.

### 5. Fungi at Work

Three portals appear at the forest edge: bakery, medicine laboratory, and compost floor. The learner adds yeast to dough and observes trapped gas expanding it, then routes useful-fungi tokens to baking, medicines, and decomposition. The yeast quiz is answered after the dough observation.

### 6. Food Safety Scan

A market basket contains fresh and visibly mouldy foods, rotten fruit, and diseased leaves. The learner sorts safe and unsafe food using text and symbol cues in addition to colour. The experience explicitly confronts the misconception that removing only the visible patch makes mouldy food safe. The accepted response is that food covered with mould should not be eaten.

### 7. Forest Circle

The original forest returns. Four glowing mushrooms form an evidence circle covering spores, mycelium, warm/moist growth, and yeast. At least one prompt is a transfer question about an unfamiliar warm damp surface. Completion awards “Mission Complete: Fungi Explorer,” shows collected observations and resolved misconceptions, and unlocks the growth sandbox and field guide.

## Post-mission exploration

The compact growth sandbox lets students change warmth and moisture within labelled safe ranges and run a five-day comparison. The output derives from the same pure development model as the guided time lens. It does not allow unsafe food-handling instructions or imply that visible mould is the only hazard.

The field guide reopens the mushroom, hypha, mycelium, spore, yeast, decomposition, and food-safety evidence cards. Students can replay any completed stage or restart the full class.

## Visual and sound system

- Art direction: bioluminescent scientific naturalism, not neon fantasy. The palette uses deep moss, bark brown, warm amber caps, pale mycelium, and restrained lime spore highlights.
- One persistent procedural Three.js forest uses layered fog, instanced trees and plants, a fallen log, mushrooms, bread, soft motes, and contextual portals.
- The mycelium network uses seeded branching curves and restrained emissive material. Growth is deterministic and reduced-motion mode replaces continuous branching with stepped reveals.
- The bread time lens uses visible surface coverage, hypha filaments, and sporangia rather than colour-only state changes.
- Guidance stays in collapsible browser edge regions and a stable off-axis VR panel. The experiment owns the centre.
- Narration captions use the supplied script’s meaning, shortened only where necessary for readable cue length. Captions remain complete when audio is unavailable.
- Ambient forest sound and interaction effects are optional. The shared audio owner prevents overlap and stops on pause, restart, visibility change, and teardown.

## Interaction and comfort

- Mouse, touch, keyboard, gaze/controller selection, help, narration replay, pause, restart, and back map to normalized actions.
- Authored world interactions are primary; accessible HTML controls provide complete equivalent paths.
- The experience begins stationary. Scale changes use local reveals rather than forced locomotion. No rapid acceleration, flash, roll, or strobe is used.
- Reduced-motion mode stops ambient spores and motes, replaces animated growth with stepped states, and preserves every action and evidence gate.
- Seated and standing modes keep important targets within comfortable reach. WebXR failure preserves progress and continues in browser mode.

## Architecture

The canonical implemented definition owns module metadata, stages, actions, evidence, assessments, narration, assets, legacy paths, and contribution provenance. It is registered once and drives route, catalog, search, availability, and viewer coverage.

A pure fungi domain module owns classification facts, growth-condition validation, deterministic five-day development, stage ordering, useful-fungi roles, food-safety classification, and mastery rules. It accepts validated inputs and rejects invalid or non-finite values.

A focused scene module creates and disposes the procedural forest, mycelium, spores, bread development, portals, safety basket, focus targets, and visual evidence. It uses the shared runtime lifecycle and does not create a private renderer, input stack, lesson machine, or competing animation loop.

The React viewer coordinates lesson snapshots, preferences, narration, accessible controls, feedback, evidence summaries, the post-mission sandbox, and the shared WebXR systems. Scientific outcomes remain outside the viewer.

## Error handling and resilience

- Unknown actions, illegal stage transitions, duplicate evidence, invalid day values, and invalid warmth/moisture values fail the current action with recoverable feedback and never advance the lesson.
- Scene initialization is transactional. Partial failures dispose created geometry, material, texture, listener, timer, and runtime resources in reverse order.
- Required teaching-state failures show a diagnostic message while preserving captions and non-3D controls. Optional ambience failures degrade silently to declared procedural fallbacks.
- Pause and page visibility suspend time-dependent state, and resume resets frame timing.

## Classroom companion

Non-headset students use a five-day mould-development observation strip. Before each headset interaction, they predict the next visible change and record whether the projected evidence supports the prediction. During the bakery portal they sketch how gas pockets make dough rise. The class debrief compares useful decomposition with harmful spoilage and reinforces the instruction never to taste experiment food.

## Safety and scientific boundaries

- Comfort risk: low. The learner remains stationary and triggers all scale transitions.
- Do not instruct students to culture mould or open contaminated containers.
- Do not imply that all fungi are harmful, all mushrooms are edible, mould can be judged safe by colour, or removing visible mould makes soft food safe.
- The development sequence is an age-appropriate representation. Temperature and moisture influence growth but do not guarantee identical timing for every fungal species or food.
- Device and classroom evidence remain `internalQA` until recorded headset and school checks are completed.

## Testing and acceptance

- Domain tests cover reference growth vectors, invalid ranges, deterministic output, stage order, classification, useful/harmful roles, safety misconceptions, and mastery distinction.
- Lesson tests prove action-plus-evidence gates, skip rejection, retries, first-answer preservation, previous/restart behaviour, completion, and transfer evidence.
- Scene tests verify authored target registration, progressive visual projection, evidence timing, reduced motion, pause/resume, initialization rollback, and disposal.
- Input tests prove mouse, touch, keyboard, and Quest dispatch equivalent action IDs.
- Route and registry tests prove the canonical fungi slug resolves the exact viewer and becomes launchable without duplicating the catalog identity.
- Browser acceptance launches the class, completes the primary path through accessible controls, verifies feedback and captions, restarts, reaches the badge, and exercises the sandbox.
- Final verification includes focused tests, package and app type checks, catalog and narration validation, production build, visual screenshots at desktop and narrow widths, and the repository root verification gate where practical.

## Explicitly deferred

- Multiplayer avatars or synchronous class state.
- Student identity, leaderboards, or cloud analytics.
- Free-form culturing of arbitrary fungal species.
- Photoreal scanned assets that lack local provenance or Quest-safe budgets.
- Claims of headset certification or classroom validation without recorded evidence.
