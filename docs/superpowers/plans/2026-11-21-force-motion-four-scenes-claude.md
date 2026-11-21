# Force and Motion: Four Scenes (Claude Build) Implementation Plan

**Goal:** Replace the Force and Motion lab (`/simulations/c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape`) with the approved four-scene, hands-on lesson.

**Where:** a separate clone at `E:\My Works\TurboTHR\XR-School-Projects\force-and-motion-claude`, branch `claude/force-motion-four-scenes`. It's kept apart from another tool's build so the owner can compare the two. Nothing is pushed.

**Spec:**
- Content script: `E:\My Works\TurboTHR\XR-School-Projects\force-and-motion-xr-script.md`
- Approved layouts: `E:\My Works\TurboTHR\XR-School-Projects\force-and-motion-concepts\` (approved 21 November 2026)

**Architecture:** the rainwater pattern.
- **Lesson logic:** a pure reducer, `apps/web/lib/forceLabLesson.ts`.
- **Motion maths:** pure and deterministic, `apps/web/lib/forceLabPhysics.ts`.
- **3D world:** `apps/web/lib/forceLabScene.ts`, using vertex-coloured models from `scripts/blender/build_force_lab_kit.py` with coded fallbacks.
- **Viewer:** `ForceMotionViewer.tsx`, rewritten, but still the shared core viewer (`SimulationExperienceShell`, `createVrPlayerRig`, `createVrLocomotion`, `createVrHudPanel`, `createGuidedCamera`, `updateXrHover`), because release tests check for those.

## Global constraints

- **Quest budget:** at most 120 draw calls and 250,000 triangles, measured with `renderBudget.ts`.
- **Offline:** models and narration are local.
- **Licences:** all models are original (`XR-School-original`), recorded in `apps/web/public/models/force-lab/SOURCES.json`.
- **Accessibility:** every hands-on action also has a button that runs the same logic, never a skip button.
- **Narration:** text lives in `const NARRATIONS = ["…"]` in the viewer and is generated with edge-tts, which the owner approved earlier for this programme.
- **Don't change** the module record stages in `packages/simulation-content`, or the quality scores. The viewer is bespoke, as rainwater is.

## Decisions

| Decision | Reason |
|---|---|
| Use simple analytic motion (constant deceleration from rolling resistance, reflection with restitution) instead of Rapier | Deterministic, testable, and enough for these demos |
| Kicks use hand speed | Feet aren't tracked |
| Riya is one model with named limb nodes, animated in code | Cheaper than skeletal animation |
| Load one scene at a time; the others are hidden | Keeps draw calls low |

## Tasks

1. **Lesson reducer and physics, with tests.**
   - **Lesson flow:** scenes store, playground, friction, wall; then the quiz.
   - **Scene 1 actions:** push the trolley to the counter, pull the wagon to the shelf, predict the door (push or pull), open the door (pull), close it (push).
   - **Scene 2:** predict gentle or strong, gentle kick, strong kick (records both speeds, and strong must be faster), side tap (direction changed).
   - **Scene 3:** predict smooth, rough or same; release on smooth, release on rough (same height enforced). Distances are recorded, and smooth is 2–3 times farther.
   - **Scene 4:** predict where the ball goes, wall bounce (direction reverses), racket hit (direction changes towards the aim).
   - **Quiz:** 3 questions, retrying until correct with a hint.
   - **Continue rule:** the child can't continue until the scene's actions are done.
2. **Blender kit:** about 16 models, built headless in parallel with a script, then compressed with meshopt and registered in `SOURCES.json`. Model test as in the rainwater pilot.
3. **Scene module:** four environments, arrows shown only during contact, ghost trails, drag interaction targets, camera focus per scene, and VR standing spots. Fallback for every model. Unit tests.
4. **Viewer rewrite:** pointer drag, swipe-to-kick, drag-release car, throw ball, swing racket; VR grab via controllers; DOM buttons as the fallback; shell choices for predictions and the quiz; render-stat attributes.
5. **Narration:** 4 scenes of 4–5 short lines each, with tests for safety and accuracy wording, then generated.
6. **Acceptance:** full keyboard-only run with reduced motion, budget checks per scene, screenshots, release notes in `docs/releases/force-motion-claude.md`, a final review, and a local commit. No push.
