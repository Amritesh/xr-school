# Anchored Simulation Design Language

## Goal

Make the school XR simulations feel physically credible and complete: learners should feel that objects rest on real surfaces, tools contact targets at the correct scale, final completion moves forward, and instructional UI never blocks the experiment.

## Design language: anchored lab realism

Every authored object must be placed through a named physical anchor instead of one-off visual coordinates. Valid anchors include garden bed soil, table surface, flower head, fruit plate, soil window, circuit board sockets, wire terminals, and workbench surface. Free-floating objects are allowed only for phenomena that are scientifically free-moving, such as bee flight, pollen tube animation, electron flow, field lines, vapor, or fluid.

The shared rules are:

- Ground truth is meters: `metersPerWorldUnit = 1`.
- Surfaces own placement: objects sit on `anchor.y + objectHalfHeight` or a documented contact point.
- Tools have a home pose and a target pose; if they animate, both poses must contact real targets.
- Enlarged cutaways are presentation layers, not garden-scale objects. They must replace the garden view or appear in a dedicated observation bay with an explicit scale note.
- HUD evidence must only count observed scientific evidence. Scale/safety/cue text is separate.
- Final-stage completion must enter a terminal finished state or completion panel. It must not leave an enabled `Complete` button that does nothing.

## Pollination production fixes

Pollination keeps the current eight-stage experiment, but its physical layout is re-authored around anchors:

- Treatment and control flowers sit inside their labelled raised beds.
- Field tools sit on the field table surface, not relative to an unverified tray offset.
- Fruit appears attached to the treatment flower, then opens into a reachable seed selection pose.
- The plantable seed moves into the soil observation window/planting area without overlapping fruit or soil glass.
- Germination cutaway is an enlarged observation panel with seed, radicle, plumule, and soil layers separated and legible.
- Completion after the final germination inspection shows a finished state with a restart/review path instead of remaining stuck on stage 8.

## Circuit follow-up fixes

Circuit will adopt the same anchored language after pollination deploys:

- Workbench, board, battery, switch, resistor, bulb, and wire terminals all use named anchors.
- Electron markers remain constrained to the wire path.
- Switch lever endpoints visibly contact or break the circuit.
- Resistors plug into board sockets; bulb legs and battery terminals touch the copper loop.
- The final stage uses the same terminal completion pattern.

## Testing and acceptance

Automated acceptance must cover:

- Lesson final completion transitions to a terminal state.
- Pollination anchors keep flowers/tools/fruit/seed/germination within allowed clearances.
- HUD separates biological evidence from scale notes.
- Circuit anchors constrain core components to workbench/board/wire contact zones.
- Targeted unit tests pass before full verification.
- Browser manual verification completes the pollination path and circuit path without console errors.

Deployment acceptance:

- Push to `main`.
- GitHub Quality succeeds.
- Vercel deploy succeeds.
- Live production routes return `HTTP 200`.

Quest physical-device signoff remains a separate hardware acceptance step.
