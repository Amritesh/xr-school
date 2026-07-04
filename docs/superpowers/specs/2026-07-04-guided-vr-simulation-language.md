# Guided VR Simulation Design Language

## Purpose

Every XR School lesson should feel like performing a real experiment, while
remaining readable in a browser and independently navigable in a headset.
Worlds may have unique lighting, materials, scale, and scientific equipment,
but they share the same interaction and guidance grammar.

## Layering

- The 3D world contains the environment, equipment, specimens, physical cues,
  controller rays, and scientifically meaningful animation.
- Explanations, formulas, assessment text, evidence, and navigation placards
  remain in the HTML interface.
- The centre of the viewport is reserved for the experiment. Persistent cards
  occupy the outer safe zones and never overlap the route Back control.
- The renderer must keep its CSS viewport size separate from its pixel-density
  drawing buffer so HTML and 3D always share the same coordinate system.

## Interaction

- Every required action maps to a named physical target.
- Mouse users receive a pointer cursor only over a valid target.
- Quest users select the same targets with controller rays.
- Completing a target action advances browser and Quest object-driven flows
  without requiring an HTML Continue button inside immersive VR.
- The final physical action enters the terminal completion state.
- Quest Back moves to the prior stage; from the first stage it exits the
  immersive session.

## Guidance

- The shared focus guide is hidden while the next target is inside the central
  safe view.
- It appears at the appropriate edge only when the target leaves that safe
  view, with a short action label.
- World-specific targets drive the common projection logic. Circuit targets
  are the switch, bulb, and resistor; pollination targets follow the authored
  biological action sequence.

## Circuit Classroom

- Use a bright, uncluttered school electronics classroom and one correctly
  scaled student workbench.
- Remove decorative shelves, floating buttons, chalkboard prose, and duplicate
  in-world navigation.
- Learners close the switch, observe current and electron movement, change
  resistance, inspect bulb brightness, and connect the evidence to Ohm's law.
- Camera framing keeps the apparatus left of the HTML placard and moves closer
  for resistor observation without placing equipment in mid-air.

## Pollination Field Study

- Preserve life-size garden scale until an explicitly disclosed biological
  cutaway is required.
- Named flowers, anther, stigma, bee, fruit, seed, tools, and germination
  specimen are the actionable progression path.
- The treatment and control remain spatially distinct and physically anchored.
- The final germination inspection completes the lesson directly in both
  browser object interaction and Quest controller interaction.
