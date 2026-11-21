# Force and Motion: four-scene lab (Claude build)

Branch `claude/force-motion-four-scenes`, built in its own clone at
`E:\My Works\TurboTHR\XR-School-Projects\force-and-motion-claude` so it can be compared side by side with
another tool's build in `xr-school`. Nothing in the `xr-school` working copy was changed.

Route: `/simulations/c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape`.

## What the child does

| Scene | Interaction | Evidence the lesson records |
| --- | --- | --- |
| 1. Store | Drag the trolley to the counter (push), drag the wagon to the shelf (pull), predict and then open and close the door | Push and pull arrows, ghost trail, door opens only by pulling |
| 2. Playground | Predict, then kick gently and hard (hand speed sets ball speed), tap the rolling ball from the side | Ball speed in m/s, change of direction in degrees |
| 3. Friction | Predict which car goes further, release both from the same ramp | Stop flag and distance for tile and carpet; the verdict on the guess is honest |
| 4. Wall | Predict, roll a ball at the wall, hit a fed ball with the racket | Bounce angle and racket deflection in degrees |
| 5. Quiz | Three questions with a hint on a wrong answer | Completion only after all three are right |

Every interaction has a fallback button with the same lesson logic. There is no button that skips a stage.

## Rulings

- **Analytic physics instead of Rapier.** Motion is constant deceleration plus reflection
  (`apps/web/lib/forceLabPhysics.ts`). It is exact, testable and cheap on Quest. Frames are capped at 0.1 s so a
  slow frame can't skip the moment a child is waiting for.
- **Pure reducer.** `apps/web/lib/forceLabLesson.ts` holds all lesson state, as `rainwaterLesson.ts` does.
- **No floating text labels.** Canvas sprites render as black boxes through the shared presentation pipeline.
  Arrows, colour and captions carry the meaning, and lane names are painted on the table.
- **Module record stages and quality scores unchanged.** The old `forceMotion*` world-builder files are left
  in place and unused by this viewer.

## Measurements (headless Chromium, 1280×800)

| Scene | Draw calls | Triangles |
| --- | --- | --- |
| Store | 43 | 13,965 |
| Playground | 41–53 | 17,101–18,581 |
| Friction | 33 | 17,285 |
| Wall | 43–55 | 15,717–17,197 |
| Quiz | 43 | 15,717 |

Budget: 120 draw calls and 250,000 triangles. One key light, one 1024 px shadow map, no post-processing.

## Assets

- 13 models in `apps/web/public/models/force-lab/`, about 22,000 triangles and 400 KB in total, all
  original (built by `scripts/blender/build_force_lab_kit.py`, rebuilt with `scripts/blender/build-force-lab-kit.sh`).
  `SOURCES.json` records source, licence, size, hash and fallback.
- 10 narration clips in `apps/web/public/narration/`, generated from `NARRATIONS` in `ForceMotionViewer.tsx`.

## Tests

- Unit: `force-lab-physics`, `force-lab-lesson`, `force-lab-models`, `force-lab-scene`. The full suite passes
  (1,530 tests); `registry-consumers` can time out under load and passes when run alone.
- Browser: `tests/e2e/force-lab.spec.ts` drags the trolley with the mouse, and completes the whole lesson with
  only the keyboard and reduced motion, checking the render budget in every scene.

## Not tested

- **VR on a Meta Quest headset.** Controller grab, kick by hand speed, racket on the right controller and
  teleport spots are written but have never been tried in a headset.
- **Children.** No classroom or user testing yet.
- Real frame rate on Quest. The draw call and triangle numbers come from desktop Chromium.
- `registry-consumers` cold-imports the whole API app and timed out at 5 s under a full parallel run on
  this machine, blocking the commit hook. That one test now has a 20 s timeout.
