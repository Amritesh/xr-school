# Solubility Physics Lab Design

**Status:** Approved by user for autonomous implementation and deployment on 2026-07-13.

## Learning outcome

Class 5 learners use visible evidence to distinguish a solution, suspension, sediment, and immiscible layer. They confront two misconceptions: dissolved matter has not disappeared, and stirring changes the rate of dissolving rather than the final saturation limit.

## Experience

The lesson follows Predict → Mix → Investigate → Explain → Transfer. Students choose salt, sugar, sand, chalk, or oil; predict the result; add measured scoops; stir or wait; vary temperature; inspect live evidence; and use a representational molecular lens. A final unknown asks them to classify from evidence rather than recall a label.

## Scientific boundary

This is a deterministic mesoscopic model, not molecular dynamics. It conserves added mass and separates it into dissolved, suspended, settled, and immiscible pools. Soluble solids approach a temperature-dependent saturation capacity with a dissolution rate driven by exposed mass, saturation deficit, temperature, and agitation. Insoluble particles use density-, size-, viscosity-, and agitation-dependent suspension/settling behavior. Oil forms transient droplets while stirred, then coalesces into a less-dense upper phase. Values are educational approximations within declared ranges.

Rapier remains the correct engine for tool contacts and limited rigid bodies; chemistry is handled by the domain solver because a rigid-body engine cannot model dissolution. The visible particles are evidence-bearing presentation particles and never claim atom-for-atom scale.

## Rendering and performance

The viewer uses the shared fixed-step web simulation runtime, resource registry, adaptive Quest/browser profiles, and shared input system. One instanced mesh represents many grains/droplets with deterministic transforms. Browser quality uses physical glass/liquid materials; Quest uses cheaper standard materials. The scene stays within the project baseline of 72 fps, 120 draw calls, 250k triangles, one shadow map, and no headset post-processing.

## Interaction and assessment

Mouse, touch, keyboard-visible browser controls, and Quest controller rays expose the same actions. Measurements include added mass, dissolved mass, concentration, turbidity, settled mass, phase separation, temperature, and saturation state. Evidence, not button completion, unlocks explanations. Reset is always available and invalid numeric state fails closed.

## References

- IUPAC Gold Book definition of solubility (2025 online edition)
- OpenStax Chemistry 11.1 and 11.3 for homogeneous solutions, saturation, temperature, and stirring
- PhET Sugar and Salt Solutions for coordinated macro/micro representations
- ChemCollective virtual labs for quantitative, unknown-driven inquiry
- Labster solution preparation and emulsion learning materials for mission framing and phase behavior
- Three.js InstancedMesh and MeshPhysicalMaterial documentation for rendering choices

## Acceptance

- Mass is conserved to 0.001 g in every fixed step.
- Salt and sugar can dissolve to a temperature-dependent limit; excess remains visible.
- Sand and chalk do not become dissolved mass; agitation suspends and waiting settles them.
- Oil can form droplets during agitation and returns to an upper separated phase.
- Stirring increases approach rate without changing equilibrium capacity.
- The molecular lens is explicitly labeled representational.
- The viewer uses the shared runtime and disposes all GPU/input resources.
- Unit tests, type-check, production build, and live route smoke check pass.
