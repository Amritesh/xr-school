# Digestive Simulation Production Assets

This folder is the production asset drop zone for the Labster-style digestive journey.

The viewer loads these GLB files first. If a file is missing, the simulation keeps running with its temporary optimized fallback scene. To replace geometric fallbacks with authored assets, export each model as `.glb` using the exact filenames below.

## Required GLB Files

| File | Purpose |
| --- | --- |
| `teacher-guide-rig.glb` | Rigged AI teacher guide with idle, point, gesture, face-player, praise, and explain clips. |
| `futuristic-science-room.glb` | Intro/return room with smart board, holograms, lab props, soft lights, and shrink portal. No student NPCs. |
| `mouth-interior-environment.glb` | Inside-mouth environment: gum walls, teeth, moving tongue, saliva emitters, falling food, bolus states. |
| `esophagus-peristalsis-tunnel.glb` | Tunnel scene with contraction rings/blendshapes, bolus path, particle emitters. |
| `stomach-chamber-digestion.glb` | Large stomach chamber with contracting walls, acid bubbles, steam, enzyme wheel, chyme morph. |
| `helper-organs-chamber.glb` | Liver/gallbladder/pancreas chamber with bile flow and enzyme flow animations. |
| `small-intestine-villi-world.glb` | Largest scene: intestinal folds, large villi, nutrient particles, pulsing blood vessels. |
| `large-intestine-water-world.glb` | Large intestine scene with water particles and waste transformation states. |
| `rectum-exit-pathway.glb` | Minimal final pathway for storage and exit explanation. |
| `healthy-habits-table.glb` | Futuristic sorting table with food cards, baskets, and celebration emitters. |
| `holographic-quiz-arena.glb` | Floating quiz card arena with answer glow states, applause particles, and badge reveal. |

## Export Rules

- Use Blender, Maya, or Unity to author assets, then export GLB 2.0.
- Keep origin at the learner-space center unless a specific offset is needed.
- Use real scale in meters. The current viewer assumes a stage environment around 3-4 meters wide.
- Use PBR materials: base color, roughness, normal, occlusion, and emissive maps where useful.
- Prefer compressed textures: WebP source where possible, KTX2/Basis for production if the runtime adds a KTX2 loader.
- Keep Quest 3S performance in mind: use LODs, low overdraw, and repeated mesh instancing for villi/particles.
- Include animation clips inside the GLB. The viewer auto-plays all clips with `THREE.AnimationMixer`.
- Name important nodes clearly, for example `Tongue_Rig`, `Saliva_Emitter`, `Bolus_Path`, `Villi_Cluster_LOD0`, `Bile_Stream`, `Quiz_Card_A`.

## Quality Target

The intended look is a stylized educational VR production similar in direction to Labster or The Body VR: authored organ environments, cinematic camera movement, spatial audio hooks, interaction-ready model nodes, and no visible primitive placeholder shapes.
