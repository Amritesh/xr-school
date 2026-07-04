# Pollination Production Vertical Slice

**Date:** 4 July 2026  
**Status:** Approved for implementation  
**Platforms:** Meta Quest Browser/WebXR, desktop browser, classroom projector  
**Reference world:** Class 6 Plant Pollination and Growth Cycle

## Objective

Rebuild Pollination as a complete, believable field experiment that establishes
the art, interaction, scale-transition, presentation, and acceptance pipeline
for subsequent Circuit and States of Matter production worlds.

The learner must feel present in a school garden and must perform the causal
actions of an experiment. Progress cannot be earned by pressing a generic Next
button. Browser and Quest use the same scientific and lesson state while
presenting controls appropriate to each device.

## Product Benchmark

The quality target combines the strongest patterns observed in paid educational
simulation products:

- Labster's mission framing, explorable equipment, safe experimentation,
  immediate feedback, and visible scientific evidence.
- MEL Science's controlled transitions from the familiar world into otherwise
  invisible scales, with every representational scale explicitly explained.
- Prisms' progression from embodied experience to observation and then to
  formal vocabulary.
- Proteus and VictoryXR's believable tools, experiment records, and practical
  task completion.

The target is not photorealism at the expense of clarity or frame rate. It is a
coherent authored place, high-quality materials, convincing movement and sound,
direct manipulation, correct scale, and scientific consequences that remain
clear without covering the world in interface panels.

## Learning Experience

### Mission

The student is a field biologist in a school pollinator garden. Two matched
flowers are tagged: an experimental flower and an unpollinated control. The
student must perform hand pollination, compare the outcomes, trace fertilisation
inside the flower, and grow the resulting seed.

### Sequence

1. **Enter the garden.** Locate the highlighted experimental flower and inspect
   its petals, anthers, and stigma with a hand lens.
2. **Collect pollen.** Brush a mature anther with the pollination brush. Visible
   pollen adheres to the bristles and the field notebook records the sample.
3. **Observe a pollinator.** Watch a bee approach, land, collect nectar, and
   acquire pollen on its body. The bee demonstrates natural cross-pollination;
   it does not replace the student's experiment.
4. **Transfer pollen.** Brush the experimental flower's receptive stigma. The
   control flower remains untouched. Contact, pollen count, and valid target are
   observable.
5. **Inspect fertilisation.** Activate the hand lens on the stigma to enter a
   clearly labelled enlarged cutaway. Trace pollen-tube growth from stigma,
   through style, to ovule. Pollination and fertilisation remain distinct.
6. **Compare outcomes.** Advance a local time-lapse station. The experimental
   ovary swells into fruit while the control flower does not. The student records
   the causal comparison.
7. **Plant the seed.** Open the fruit, select a seed, make a planting hole, place
   the seed, cover it, and pour water with the watering can.
8. **Observe germination.** Use the soil observation window to see imbibition,
   radicle emergence, root growth, and plumule emergence before returning to the
   garden-scale mature plant.
9. **Explain and transfer.** Correct the misconception that pollination is
   fertilisation, then predict what happens when pollinators disappear.

Each stage requires its authored action and evidence before the lesson session
can advance. A short Continue affordance may appear only after completion.

## World Art Direction

### Place

The garden is a bounded 9-by-9-metre teaching plot at warm morning light. It has
a compacted-earth path, planted beds, low boundary wall, trellis, water station,
field table, specimen tray, flowering plants at several growth stages, distant
school-building silhouettes, and animated but non-distracting ambient life.
Every landmark helps orientation or explains the ecosystem.

The primary flower sits in a comfortable 0.85–1.2 metre reach zone. Garden-scale
flowers use plausible dimensions. Pollen, the internal pistil, and germination
cutaways are explicitly labelled as enlarged representations.

### Geometry and materials

- Reusable authored geometry modules build flowers, leaves, stems, garden beds,
  field tools, the bee, fruit, seed, and soil cutaway.
- Geometry uses smooth silhouette budgets where the learner can approach and
  lower detail for peripheral scenery.
- Shared instanced vegetation provides density without multiplying draw calls.
- Materials use compact PBR texture atlases, non-flat normal detail, varied
  roughness, vertex colour variation, and correct colour space.
- Petals use a Quest-safe translucent-looking fallback rather than transmission.
- Baked contact shading and restrained real-time shadows ground objects.
- Browser Enhanced may add higher shadow resolution, denser vegetation, and
  limited bloom-like emissive accents; XR never uses full-screen post-processing.

### Lighting and atmosphere

- A warm directional sun supplies readable form and one controlled shadow map.
- Hemisphere fill supplies soft sky and ground colour.
- Baked or vertex ambient occlusion provides contact depth.
- Gentle distance haze replaces the current flat horizon.
- Wind moves leaves, petals, grass, and trellis cloth at different frequencies.
- Focus light changes are subtle and stage-specific; unrelated objects dim only
  enough to guide attention.

### Sound

The world includes spatially placed birds, leaves, distant school ambience,
close bee flight, brush contact, fruit opening, soil movement, pouring water,
and germination cues. Narration ducks ambient sound but does not silence it.
Every essential sound has a visual equivalent.

## Interaction Design

### Normalized actions

The world consumes these device-independent action identifiers:

- `inspect-flower`
- `collect-pollen`
- `observe-pollinator`
- `transfer-pollen`
- `enter-pollen-cutaway`
- `trace-pollen-tube`
- `advance-time-lapse`
- `compare-control`
- `open-fruit`
- `select-seed`
- `dig-hole`
- `plant-seed`
- `cover-seed`
- `water-seed`
- `inspect-germination`
- `explain-misconception`
- `predict-transfer`

Mouse, touch, keyboard, and Quest controller adapters emit equivalent actions.
World interaction code never advances lesson state directly.

### Affordances and feedback

- Tools return to their tray when released out of bounds.
- Hover uses a restrained outline or rim, not a permanent glow.
- Valid targets show a physical-looking highlight and subtle audio cue.
- Invalid contact produces a small physical response and a concise hint.
- Brush bristles accumulate visible pollen; the stigma retains transferred
  grains.
- Pour angle controls water flow. Planting only completes after seed placement,
  covering, and sufficient water.
- Quest uses direct grab when reachable and a ray only for distant or panel
  controls. Browser uses pointer drag with accessible keyboard equivalents.
- Haptics confirm pickup, contact, valid transfer, cutting, planting, and pour.

## Scale Transitions

Transitions are authored scientific moments rather than camera teleports:

1. A circular hand-lens aperture isolates the flower.
2. Surrounding garden audio and light soften.
3. A scale legend animates from literal flower dimensions to an explicitly
   enlarged pistil cutaway.
4. The camera/rig moves along a comfortable fixed curve with reduced-motion
   cross-fade available.
5. Return uses the same spatial landmark so orientation is preserved.

The underground view is a fixed observation window beside the planted pot. The
student does not travel rapidly through soil.

## Presentation

### Browser and projector

- Full-bleed world viewport.
- Compact top-left exit and audio utilities.
- One-line mission chip at the lower-left edge.
- Tool state near the tool tray, not the viewport centre.
- Collapsible field notebook on the right edge for evidence and explanations.
- Continue appears in the mission chip only after valid evidence exists.
- The central 60 by 64 percent clear-view region remains unobstructed.

### Quest

- Diegetic tool tray on the field table.
- Summonable field notebook mounted 35–45 degrees off-axis.
- World-space labels appear beside the inspected object and dismiss
  automatically.
- Controller hints appear on the virtual tool or hand and disappear after first
  successful use.
- No head-locked card, persistent central panel, or duplicated browser HUD.

## Architecture

The existing shared world runtime remains the owner of the render loop, device
profile, lifecycle, fixed updates, presentation pipeline, and disposal.

New Pollination code is divided by responsibility:

- `pollinationExperiment.ts`: headless experiment state and action/evidence
  contract.
- `pollinationScene.ts`: scene assembly and stable references to authored
  interactables.
- `pollinationBotany.ts`: flower, bee, fruit, seed, and germination geometry.
- `pollinationGarden.ts`: garden enclosure, vegetation, landmarks, wind, and
  environment dressing.
- `pollinationTools.ts`: hand lens, brush, tags, fruit knife, seed tools, and
  watering can.
- `pollinationInteraction.ts`: pointer/controller picking, grabbing, brushing,
  pouring, haptics, and normalized action emission.
- `pollinationChoreography.ts`: stage focus, scale transitions, time lapse, and
  scientific reveal animation.
- `PollinationViewer.tsx`: React lifecycle, shared shell, accessible controls,
  and adapter wiring only.

Shared additions are limited to reusable systems needed by at least two worlds:
an authored-scene asset disposer, pointer/tool interaction helpers, a scale
transition controller, a spatial-audio mixer, and a clear-view HUD pattern.

## Scientific Truth

The model distinguishes:

- pollen collection from pollen transfer;
- pollination from fertilisation;
- the ovule becoming a seed;
- the ovary becoming the fruit;
- germination from later plant growth;
- experimental treatment from unpollinated control.

The experiment produces deterministic state snapshots for the same action
sequence. Visual animation may interpolate, but it cannot change or invent the
scientific result.

## Performance Budgets

Quest Baseline acceptance requires:

- sustained 72 FPS on the supported headset profile;
- no full-screen post-processing in XR;
- one principal dynamic shadow light;
- instancing for repeated vegetation and pollen;
- bounded pixel ratio and compressed textures;
- no per-frame React state updates;
- no resource leaks after restart or exit;
- declared geometry, texture, draw-call, and audio budgets passing the existing
  world diagnostic system.

Browser Balanced targets 60 FPS on an integrated-GPU laptop. Browser Enhanced
may increase vegetation, shadow, and texture quality without changing the
lesson.

## Accessibility and Safety

- All meaningful actions have keyboard-accessible HTML equivalents.
- Captions and reduced-motion behavior are available before launch.
- Important information is never communicated by colour or sound alone.
- Text meets contrast and minimum-size targets.
- The stationary experience needs no required locomotion.
- Seated mode adjusts eye height and brings tools into reach.
- Restart reconstructs the experiment deterministically.

## Acceptance Criteria

The slice is releasable only when:

1. Every stage is completed through direct action and evidence.
2. The generic Next button cannot bypass any experiment step.
3. Pollination and fertilisation are visibly and verbally distinct.
4. Treatment and control flowers produce different, scientifically valid
   outcomes.
5. Literal and enlarged scales are identified at the moment of transition.
6. Browser and Quest keep the central subject clear.
7. All essential actions work by pointer, keyboard, and XR controller mapping.
8. The garden, tools, bee, flower interior, fruit, seed, and germination view
   have complete authored geometry, materials, motion, and sound.
9. Quest Baseline and Browser Balanced performance profiles pass.
10. Automated unit, contract, lifecycle, and build verification passes.
11. Browser visual acceptance passes at desktop and narrow widths.
12. Production deployment returns a successful response and the release
    workflow is green.

## Rollout

The reusable production pipeline proven here moves next to Circuit, where it
will create a believable school workbench and direct wire/component
manipulation, and then to States of Matter, where it will create a macroscopic
thermal experiment linked to an explicitly representational particle chamber.
