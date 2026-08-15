# Forest Nursery Outbreak Lab — Experience Redesign

**Class:** 8–9  
**Topic:** Fungi and its development  
**Target duration:** adaptive 8–10 minutes, with a 6-minute proficient fast path  
**Primary platform:** browser, with equivalent Meta Quest/WebXR evidence routes  
**Release maturity:** internal QA until a physical Quest run and classroom pilot are recorded

## Purpose

Replace the current sequence of quiz buttons over a static 3D backdrop with a continuous scientific investigation. The learner must be able to manipulate an environment, observe fungal causality, compare trials, make mistakes with meaningful consequences, and use evidence to resolve a real mission.

The experience may use the instructional principles of strong virtual-lab products—narrative agency, contextual theory, scaffolded experimentation, immediate causal feedback, and embedded assessment—but must not copy another product's visual identity, characters, terminology, or proprietary scenarios.

## Experience promise

The learner is a junior field scientist called to a forest nursery where seedling trays and stored food samples may be at risk from fungal growth. They must answer one continuous question:

> What is growing here, what conditions are helping it develop, and what should the nursery team do without harming the useful fungi in the ecosystem?

Every interaction advances that investigation. The class is not a set of unrelated hotspots, and no required evidence is awarded by clicking a button that already states the correct conclusion.

## Learning outcomes

By the end, a learner can:

1. Distinguish a mushroom and bread mould from a green plant using observable evidence.
2. Explain that hyphae form a mycelium and absorb nutrients through a substrate.
3. Describe spores as reproductive units and predict how airflow and landing conditions affect dispersal.
4. Explain fungal development through germination, hyphal extension, branching, colony expansion, sporulation, and spore release.
5. Use a controlled comparison to infer how temperature, moisture, substrate, and time affect growth.
6. Identify yeast in baking, antibiotic-producing fungi in medicine, and saprotrophic fungi in decomposition.
7. Make a safe food-handling decision and explain why visible mould can indicate hidden hyphae.
8. Transfer evidence to a new warm, damp nursery scenario rather than merely repeat a memorized answer.

## Narrative and spatial journey

The experience occurs in one persistent forest nursery clearing with five connected landmarks:

1. **Triage table** — mushroom, sealed mould sample, and living plant.
2. **Mycelium log** — a magnifying lens and microscope portal attached to a fallen log.
3. **Growth chamber** — sealed bread trays, environment controls, time dial, and comparison graph.
4. **Fungi-at-work bench** — yeast dough, medicine culture display, and compost column.
5. **Safety station and nursery gate** — stored food scan and final recommendation terminal.

The landmarks remain in the world throughout the mission. The experience director changes focus, available tools, lighting emphasis, and camera framing without replacing the entire scene. Microscopic views use a lens transition anchored to the specimen; they do not pretend the learner physically shrinks or teleport to an unrelated slide.

Browser transitions use smooth, short camera moves. Reduced-motion mode uses a brief cross-fade and immediate pose change. VR uses comfort fades or short bounded repositioning to authored safe vantage points.

## Mission flow

### Mission 1 — Diagnose the outbreak

The learner first records a prediction about which two specimens are fungi. They then drag a magnifying lens across the mushroom, sealed mould sample, and plant. The lens reveals gills/spore structures, mould filaments, or chlorophyll-bearing leaf tissue.

Evidence is collected only after the lens crosses the relevant specimen region. A wrong prediction is retained as the first answer and can be corrected after observation.

### Mission 2 — Reveal the feeding network

The camera focuses the fallen log and enters an anchored microscope view. A focus/depth slider brings three layers into view: substrate, individual hyphae, and the connected mycelium network. Nutrient particles visibly move from wood into the highlighted network.

The learner traces three different branches and identifies the network. Repeating one branch does not create new evidence.

### Mission 3 — Guide a spore

A controllable airflow fan changes direction and strength. The learner releases a spore and guides it toward one of several landing surfaces. A dry tray, a warm moist bread tray, and an unsuitable leaf surface produce different landing and germination outcomes.

Failure is informative: the spore may miss, land but remain dormant, or germinate slowly. The learner can reset this experiment without restarting the whole journey.

### Mission 4 — Run a controlled growth experiment

This is the centerpiece of the lab. The growth chamber exposes:

- Temperature: 5–40 °C
- Moisture: 10–100%
- Substrate: bread, fruit, or dry paper control
- Elapsed time: 0–120 hours

The learner predicts an outcome, runs a trial, and scrubs time continuously. The colony visibly changes from a landed spore to germ tube, branching hyphae, spreading mycelium, sporulating structures, and released spores. A graph updates with colony coverage and sporulation intensity.

The learner saves two trials and compares them side by side. The mission requires a fair comparison: change one main condition while holding the others constant. If multiple variables change, the guide explains that the trial is confounded and allows a retry without revealing the optimal settings.

### Mission 5 — Use fungi without confusing their roles

At the work bench, the learner uses a pipette to add yeast to one dough vessel while a control vessel receives no yeast. Temperature affects gas production. Bubbles accumulate and dough volume rises over time.

The medicine and compost stations are short causal demonstrations, not fact buttons:

- An antibiotic-producing fungal culture creates an inhibition zone around susceptible bacteria in a sealed plate representation.
- A saprotrophic network breaks down leaf litter, releases nutrient particles into soil, and supports a nearby seedling.

The learner routes three organism tokens to the correct role stations, with plausible incorrect destinations allowed and explained.

### Mission 6 — Make a safe decision

The learner scans a mouldy soft-food sample. A UV/microscopy slider reveals hyphae extending beyond the visible patch. They sort fresh and mouldy items into “check/use” and “do not eat” areas, then explain the decision.

The experience must never instruct learners to open, smell, touch, or taste mould cultures or mouldy food.

### Mission 7 — Recommend action

The nursery gate presents a new warm, damp storage scenario. The learner selects a storage change, explains expected fungal development using evidence from saved trials, and distinguishes harmful food spoilage from useful decomposition.

The final report shows:

- First and revised prediction
- Two trial settings and observed curves
- Mycelium observation
- Safety reasoning
- Independent transfer recommendation

Completion and mastery remain separate. Completion records participation; mastery requires independent observation, misconception resolution, and transfer evidence.

## Continuous fungal-development model

The existing five discrete day snapshots are replaced by a deterministic continuous model. The model is explanatory and must disclose that species, inoculum, substrate, and real environmental conditions vary.

### Inputs

- Temperature in degrees Celsius
- Relative moisture percentage
- Substrate suitability
- Elapsed hours
- Inoculum viability

### Derived values

- Germination delay
- Hyphal extension rate
- Branching density
- Colony radius
- Surface coverage
- Sporulation readiness
- Spore-release intensity

Temperature uses a broad response curve with low, optimum, and high limits rather than one abrupt favorable threshold. Moisture and substrate modulate germination and extension separately. Time is continuous. Outputs are clamped, deterministic, and validated against authored reference cases.

The model does not claim that all bread mould follows a universal five-day schedule. UI copy labels the output as a representative classroom model.

## World and visual system

The forest uses coherent spatial landmarks, depth, layered lighting, atmospheric particles, grounded shadows, and recognizable scientific apparatus. It must remain performant on Quest baseline and browser-balanced profiles.

Visible biological outputs include:

- Germ tube emergence
- Branching hyphae through substrate
- Expanding colony edge
- Surface coverage texture/instances
- Sporangiophore growth
- Spore release affected by airflow
- Dough bubble count and volume
- Compost mass reduction and nutrient transfer

Color is never the only signal. Shape, motion, labels, icons, and numeric readouts provide redundant cues. World-space labels must render visibly; metadata-only labels do not satisfy the requirement.

## Camera and navigation

Create a dedicated browser camera controller owned by the shared runtime.

Required behavior:

- Authored pose and focus bounds per mission
- Constrained orbit around the active apparatus
- Bounded zoom and no camera entry into geometry
- Drag-to-orbit, wheel/pinch zoom, and keyboard alternatives
- Focus-specimen and reset-view controls
- Smooth stage transitions that suspend while the learner manipulates the camera
- Responsive framing from object bounds at desktop, tablet, and phone sizes
- Reduced-motion cross-fade alternative
- No forced camera snap while dragging or while a control is focused

The active apparatus must remain within the unobstructed safe viewport at every supported aspect ratio.

## Interaction design

Direct manipulation is primary. Compact semantic controls remain as keyboard and screen-reader equivalents, not a duplicate wall of buttons.

Required manipulables:

- Magnifying lens drag
- Microscope focus slider
- Airflow direction and strength
- Spore release and reset
- Temperature and moisture knobs/sliders
- Substrate selector
- Continuous time scrubber
- Save trial and compare trials
- Yeast pipette and control dough
- Organism-to-role drag routing
- UV/microscopy safety scanner
- Storage recommendation controls

Pointer, touch, keyboard, and XR controller actions route through the same normalized action IDs. Incorrect manipulations remain possible and produce model-driven feedback.

## Interface and protected visual space

The fungi-specific full-height rail and duplicated shared mission dock are removed.

The replacement UI has:

- One compact mission strip with objective and progress
- One collapsible tool drawer occupying at most 20% of desktop width
- Object-anchored readouts near apparatus
- One caption/feedback region
- Temporary assessment tray only when interpretation is required
- Optional evidence notebook and theory cards
- Reset experiment, reset camera, replay narration, and restart journey as distinct actions

At least 75% of the canvas must remain unobstructed on desktop and tablet. On phone, the apparatus and active target must remain visible while controls use a bottom sheet that can collapse to a handle.

## Experience director architecture

Introduce a declarative `FungiExperienceDirector` with one descriptor per mission:

- Mission ID and objective
- Spatial landmark
- Camera pose and focus bounds
- Available tools
- Normalized actions
- Model inputs and outputs
- World projection
- Evidence predicate
- Hint escalation
- Entry and exit transition
- Reset boundary

The director coordinates the lesson session, assessment session, camera, world, and UI. It replaces the viewer's large stage switch and prevents camera, evidence, and tool state from diverging.

Keep boundaries explicit:

- **Scientific model** — pure deterministic calculations
- **Experiment state** — trials, predictions, observations, resets
- **Experience director** — mission sequencing and gates
- **World renderer** — visual projection only
- **Camera controller** — poses, focus, user orbit, responsive framing
- **Interaction tools** — lens, fan, knobs, pipette, scanner
- **Viewer composition** — shared runtime ownership and accessible UI

## Feedback and guidance

Use “know it → do it → apply it” pacing. A short guide demonstrates one moisture adjustment, then releases control.

Hints escalate:

1. Restate the scientific objective.
2. Point to the relevant apparatus.
3. Suggest a variable relationship.

Hints never select an answer or manipulate the apparatus. Feedback describes the observed biological consequence before explaining it.

## Accessibility

- Full keyboard completion
- Visible focus and 44px minimum targets
- Screen-reader names for tools, values, and outcomes
- Captions and narration transcript
- Audio pause/mute and replay
- Reduced motion and stationary-camera alternatives
- Color-independent cues
- Resizable text without covering the active apparatus
- Navigation refresher and reset-view action
- Text fallback if WebGL fails, preserving experiment state and assessment honesty

## Performance budgets

Quest baseline acceptance targets:

- Fewer than 120 visible draw calls
- Fewer than 250,000 visible triangles
- No per-frame geometry or material allocation
- Instancing for spores, hyphal markers, and colony structures
- Bounded texture resolution and no full-screen postprocessing in XR
- Idempotent disposal of world, tools, controls, listeners, and narration

Browser mode may increase density but must preserve stable frame pacing on integrated graphics.

## Testing and acceptance

### Model tests

- Deterministic reference cases
- Boundary and invalid-input rejection
- Warm/moist versus cold/dry comparison
- Substrate differences
- Continuous monotonic time behavior where scientifically appropriate
- Sporulation threshold and high-temperature suppression

### Director tests

- Every mission has a landmark, pose, tool set, evidence predicate, and reset boundary
- No mission advances from a labelled answer click alone
- Wrong trials and confounded trials preserve honest evidence history
- Reset experiment differs from reset camera and restart journey

### World and camera tests

- Persistent landmarks remain authored and spatially separated
- Model changes alter visible colony geometry and graph data
- Camera pose keeps active bounds inside the safe viewport
- User orbit is constrained and never overridden during manipulation
- Reduced-motion transition path
- Quest draw-call and triangle budgets
- Disposal and remount safety

### Browser acceptance

At 1280×720, 1024×768, 390×844, pointer and keyboard routes must:

- Complete the journey through real apparatus interactions
- Adjust all growth variables
- Save and compare two trials
- Produce a failed/dormant outcome and a growing outcome
- Keep the active specimen visible and unobstructed
- Reset camera and current experiment independently
- Reach every control without a blocking overlay
- Preserve progress through mission boundaries

### XR acceptance

- Same normalized evidence actions as browser
- Controller manipulation for every required tool
- Visible choices before assessment commit
- Comfort repositioning and stationary locomotion
- Physical Quest acceptance remains pending until run on hardware

## Deployment and evidence honesty

The rebuild is released through the existing canonical slug and viewer key. Generated catalogs and reports remain deterministic. Code-native visual evidence references the actual world, camera, director, and browser acceptance tests. No asset-manifest claim is made for procedural geometry.

The feature merges to `main` only after focused tests, full unit tests, package and web type-checks, production build, catalog/simulation/report validators, independent spec review, independent quality review, and live browser visual inspection.

