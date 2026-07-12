# Solar System VR Observatory Design

## Product intent

Build a professional, classroom-ready solar system simulation for Classes 8–10 that is scientifically defensible, visually credible, comfortable in VR, equally usable in a browser, and structured around active learning rather than passive sightseeing.

The experience should create curiosity through scale and spectacle, but every visual effect must serve a learning action. Students predict, manipulate, observe evidence, explain what happened, and finally explore independently.

## Benchmarked direction

The product combines four proven patterns without copying any single implementation:

- Labster-style mission context, worked guidance, immediate feedback, and evidence-based progression.
- PhET-style manipulable variables, measurement tools, cause-and-effect visibility, and low-friction reset.
- NASA Eyes-style authentic imagery, data provenance, time controls, and free exploration.
- Universe Sandbox-style spatial wonder and intuitive understanding of scale, while avoiding an unrestricted physics editor that would overwhelm a short lesson.

The chosen direction is a **guided-inquiry observatory**. A cinematic tour alone does not produce enough student thinking, while a full orbital sandbox is too cognitively dense for a reliable 10–15 minute classroom experience.

## Target context and success criteria

- Primary audience: Classes 8–10 science students in Indian classrooms.
- Session length: 10–15 minutes for the guided mission, followed by optional free exploration.
- Delivery: desktop browser plus WebXR immersive VR, including seated and standing use.
- Teaching mode: individual headset use, teacher projection, or independent browser use.
- Success means a student can explain that the Sun's gravity organises planetary motion, closer planets orbit faster, Venus is hotter than Mercury because of its atmosphere, textbook distance diagrams are compressed, and comet tails point away from the Sun.
- The complete guided mission must be possible without a headset and without relying on audio.
- A production deployment must load successfully over HTTPS and expose the dedicated solar-system route.

## Experience structure

### Arrival and orientation

The opening places the learner above the ecliptic in a living solar system. Labels remain minimal until needed. A short visual orientation identifies the interaction ray or pointer, the mission card, the reset control, and the current objective. The learner selects the Sun to establish the system's organising body.

### Guided inquiry missions

The existing eight-stage progression is retained and strengthened:

1. **A system in motion** — observe all eight planets and identify the Sun as the common focus.
2. **Gravity lens** — reveal direction and relative strength of gravitational attraction.
3. **Orbit race** — predict which of Mercury, Earth, and Mars completes a lap first, then run and inspect the timed result.
4. **Heat investigation** — predict the hottest world and use an infrared probe to compare Mercury and Venus.
5. **Giant-world field study** — inspect Jupiter, Saturn, Uranus, and Neptune through distinctive, evidence-bearing features.
6. **True-scale reveal** — transition from classroom spacing toward proportional orbital distances, then relocate Earth.
7. **Comet encounter** — predict tail direction, observe its solar alignment, and ride alongside a Kepler-II-inspired orbit.
8. **Transfer and debrief** — apply orbital-period reasoning to an unfamiliar probe at twice Earth's distance and collect the completion badge.

Each mission follows the same cognitive rhythm:

1. Wonder cue.
2. Prediction committed before evidence appears.
3. Direct manipulation or measurement.
4. Immediate visual and textual evidence.
5. Short explanation connecting evidence to the governing idea.

Incorrect predictions are retained as learning evidence. Students can retry the observation, but the system never rewrites their first prediction.

### Open observatory

Completion unlocks an optional free-exploration mode rather than ending at a static badge screen. Students can:

- select any planet and focus it;
- pause, resume, and change simulation speed;
- toggle orbit paths, labels, gravity vectors, and classroom/true-distance comparison;
- open a compact comparison card for two planets;
- revisit the infrared probe and orbital-period measurements;
- return to any guided mission or restart the complete lesson.

The observatory does not expose arbitrary mass editing, collisions, or system destruction in this release. Those belong in a future orbital-mechanics laboratory with a separate learning design.

## Scientific model and disclosure

The pure astronomy module remains the single source of truth for planet properties, orbital periods, orbital speeds, axial tilts, temperatures, and Kepler calculations. Scene labels, accepted answers, charts, and narration derive from that data rather than duplicating constants.

Planetary orbits remain simplified for classroom legibility. The simulation must explicitly disclose:

- orbital distances are compressed during the standard lesson;
- planet sizes are enlarged so the worlds remain visible;
- the true-distance mode restores proportional orbital spacing while still exaggerating planet sizes;
- textures and visual atmospheric effects are educational representations, not live observations;
- giant-planet appearance is representative because their atmospheres change.

Circular planetary paths are acceptable for this lesson because the learning goal is relative orbital period and scale, not eccentricity. The comet uses a visibly elliptical path with speed variation to support Kepler's second law.

## Visual and audio direction

The simulation should feel like a scientific observatory, not a neon arcade.

- Use optimized NASA/JPL-derived equirectangular imagery where suitable, stored locally with an attribution manifest.
- Use physically plausible lighting: the Sun is the dominant light, night sides remain readable without becoming flat, and atmospheres use restrained additive scattering.
- Preserve distinctive features including Earth's clouds and night side, Jupiter's bands and Great Red Spot, Saturn's layered rings, Uranus's axial tilt, and Neptune's deep-blue atmosphere.
- Keep orbit lines thin and hierarchy-aware. Highlight only the orbit relevant to the current mission.
- Labels scale with distance, avoid excessive overlap, and hide when a body is occluded or irrelevant.
- Use a consistent cyan/amber observatory palette for UI and instruments, reserving green for confirmed evidence and red only for errors.
- Narration stays concise and optional. Subtitles communicate the same content and remain enabled by default.
- Audio cues acknowledge hover, selection, measurement completion, evidence confirmation, and mission completion without becoming game-like noise.

## Interaction design

Desktop input supports pointer selection, keyboard activation, guided camera focus, and visible buttons for every required action. VR input supports controller rays and hand-tracking select when available.

- Hover feedback must be visible before selection.
- Interactive objects use generous invisible hit targets without changing their visible scale.
- Prediction choices never reveal or highlight the correct answer before commitment.
- Mission actions occur in the 3D world when practical. The companion action tray remains an accessible fallback, not the primary experience.
- Every action produces immediate state feedback and an `aria-live` text equivalent.
- Students can pause, restart the current mission, restart the full experience, mute narration, toggle subtitles, and change comfort settings at any time.

## VR comfort and classroom safety

- Support seated and standing modes with an explicit local-floor reference space.
- Default to snap turning and conservative locomotion; smooth turning and smooth movement are opt-in.
- Never force guided camera animation while an immersive session is active.
- Use teleport or focus anchors for large interplanetary transitions rather than long artificial movement.
- Keep essential HUD content within a comfortable central viewing cone and at a readable angular size.
- Avoid intense full-screen flashes, rapid acceleration, or uncontrolled roll.
- Reduced-motion mode removes nonessential camera easing, pulsing, and particle animation.
- If immersive VR fails, preserve progress and continue in browser mode with a clear explanation.

## Architecture

The existing shared simulation runtime, lesson session, WebXR player rig, locomotion, HUD panel, guided camera, and interaction system remain the platform foundation.

The current monolithic solar-system scene module should be divided by responsibility:

- astronomy data and pure calculations;
- texture/asset loading and attribution;
- celestial-body construction and materials;
- orbital-system animation and scale transitions;
- mission instruments and evidence visualisations;
- observatory controls and comparison data;
- top-level scene lifecycle and disposal.

The React viewer coordinates lesson state, preferences, runtime lifecycle, narration, stage transitions, and accessible fallback controls. It does not own the renderer or animation loop.

All procedural randomness must be seeded. Scene construction and cleanup must be deterministic, and every geometry, material, canvas texture, and event subscription must be disposed on teardown.

## Performance budgets

- Use compressed, power-of-two textures with a headset-friendly default quality tier and an enhanced desktop tier.
- Lazy-load high-detail planet assets when a mission first needs them.
- Keep the initial experience usable while enhanced textures stream in.
- Avoid per-frame allocations in the animation loop.
- Reuse materials and geometry where practical, and use instancing for asteroid and star fields.
- Maintain a stable standalone-headset target appropriate to the connected device, with desktop rendering expected to remain smooth at common classroom resolutions.
- Automated checks will enforce asset-size and initial-load budgets; manual headset validation remains required before claiming device certification.

## Accessibility and resilience

- All required learning content is available through text as well as audio and visuals.
- Controls have accessible names, keyboard focus states, and logical navigation order.
- Color is never the only indicator of evidence, selection, correctness, or progress.
- Measurement values include units and short interpretations.
- A WebGL or asset-load failure produces a recoverable error panel and preserves non-3D lesson information.
- The simulation remains usable at narrow laptop and tablet widths even though immersive VR is the premium mode.

## Assessment and classroom evidence

The shared lesson snapshot records completed actions and evidence. The solar experience additionally records first predictions and mastery evidence.

The completion summary reports:

- stages completed;
- observations collected;
- original predictions and whether evidence supported them;
- misconceptions resolved;
- the final transfer answer;
- whether the defined mastery rule was met.

No public leaderboard is added. The objective is scientific reasoning and revision, not competition.

## Testing and verification

Implementation follows test-driven development.

- Unit tests verify astronomical values, Kepler relationships, scale mappings, deterministic functions, lesson gating, predictions, evidence, restart behavior, and observatory state.
- Component/source-contract tests verify use of shared runtime and VR systems without relying solely on brittle string checks for behavior.
- Browser end-to-end tests complete the guided mission through accessible controls, verify restart and free exploration, and validate the non-WebXR fallback.
- Rendering smoke tests check that scene creation, stage transitions, scale changes, and disposal complete without console errors.
- Accessibility checks cover keyboard progression, labels, live feedback, subtitles, reduced motion, and contrast-sensitive states.
- Production verification runs the full test suite, type check, catalog validation, and Next.js build.
- Deployment verification opens the public HTTPS route, starts the browser mission, completes representative interactions, and checks the browser console and network failures.

## Deployment

Deploy through the repository's linked Vercel project after local verification. The deployment must include all texture assets and their attribution manifest. The final handoff provides the public URL, verification results, remaining headset-specific caveats, and the exact route used for validation.

## Explicitly deferred

- Full N-body editing, collisions, and destructive sandbox controls.
- Multiplayer avatars or synchronous student presence.
- Live NASA ephemeris and spacecraft telemetry.
- Surface landing sequences for every planet.
- Device certification across every commercial headset.
- Additional languages beyond the platform's current localization support.

These are valuable future directions but would dilute the immediate goal of a reliable, professional solar-system class.
