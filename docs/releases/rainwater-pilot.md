# Rainwater Pilot Release Notes

Status: ready for review on `feature/rainwater-pilot`. Not yet tried on a Quest headset.

## Baseline before the upgrade

Captured on 2026-11-04 in headless desktop Chromium with `renderer.info`, one frame per stage, browser (non-VR) view. Draw calls include the shadow pass.

Budget: at most 120 draw calls and 250,000 triangles.

| Stage | Draw calls | Triangles |
|---:|---:|---:|
| 1 Welcome | 111 | 16,122 |
| 2 Rainy day | 141 | 19,532 |
| 3 Future | 36 | 5,822 |
| 4 Choice | 32 | 5,474 |
| 5 Map | 113 | 16,032 |
| 6 Rooftop | 172 | 22,072 |
| 7 Filter and tank | 157 | 20,642 |
| 8 School | 180 | 24,222 |
| 9 Recharge | 157 | 23,766 |
| 10 Heavy rain | 142 | 24,130 |
| 11 Summer | 28 | 5,466 |
| 12 Final choice | 30 | 5,470 |
| 13 Celebration | 34 | 7,430 |

Six stages already exceed the draw-call budget, even though the scene is simple. Triangles are about a tenth of the budget, so the upgrade has plenty of room for real models, but it must draw them in far fewer calls (shared materials, merged meshes, instancing).

Quest FPS: not measured (no headset used yet).

## Rooftop slice (Task 6)

Measured the same way as the baseline, at the end of the rooftop stage: 21 draw calls and 28,536 triangles, against 172 draw calls before. Quest FPS: not measured.

All five models are original work built by `scripts/blender/build_rainwater_kit.py`, because community kits don't cover Indian village houses. Each is one mesh with vertex colours and baked ambient occlusion, so each costs one draw call.

## Filter stage (owner feedback, 2026-11-04)

The owner reported the roof tiles tilted the wrong way and the filter stage appearing broken. The tile rotation sign was reversed. The filter logic worked, but nothing in the scene showed it, and the tank filled with clear water before any filtering.

Now the tank fills with dirty water at the rooftop stage, and the filter stage has a valve, a first-flush drain and three layers to place. At the end of this stage: 26 draw calls and about 30,500 triangles. Quest FPS: not measured.

The layer order (stones, sand, charcoal) is still unchecked against the Class 5 NCERT chapter.

## Whole mission

Measured in headless desktop Chromium at the end of each stage, browser (non-VR) view.

| Stage | Draw calls | Triangles |
|---:|---:|---:|
| 1 Rainy day | 17 | 31,780 |
| 2 Drought | 14 | 29,900 |
| 3 Rooftop | 21 | about 28,500 |
| 4 Filter | 26 | about 30,500 |
| 5 School | 37 | 35,224 |
| 6 Recharge | 22 | 31,970 |
| 7 Storm (peak) | 57 | 41,036 |
| 8 Summer | 38 | 35,076 |
| 9 Finale | 38 | 34,850 |

The old mission reached 180 draw calls and went over the limit of 120 on six stages. The new one stays under half the limit at its peak.

## Assets

All 26 models in `apps/web/public/models/rainwater/` are original work built by `scripts/blender/build_rainwater_kit.py` and recorded in `SOURCES.json` (licence `XR-School-original`). They come to about 0.8 MB. No community models are used in this pilot, because no free kit fitted an Indian village. The three old 360° images (about 8 MB) were removed.

## Narration

Twelve clips were regenerated with edge-tts (`en-IN-NeerjaExpressiveNeural`), and the 13 old clips were removed. Run on 2026-11-05 with the owner's approval.

## VR preparation

Done before the headset test, from the code review, and checked only with unit tests:

- The child is moved to a standing spot facing the work at each stage, including in front of the storm valves.
- A storm pauses when VR ends or the Quest system menu opens, and resumes on return.
- The grip button no longer ends VR in this lesson, because the mission asks children to pick things up. B and the panel's exit button still do. Other simulations are unchanged.
- Selecting a placed piece takes it off, and wrong-order messages now say so.

## Not tested

- **Quest headset:** nothing has been tried in VR, so frame rate, controller carrying and the VR panel are unproven. The owner will test this later. VR draw calls may be higher than the figures above.
- **Children:** no playtest yet, and the storm values are starting points.

## Open science question

The filter order (stones, sand, charcoal) keeps the old lesson's wording. A web search found gravel, sand and optional charcoal in varying arrangements, with no single authority, and the Class 5 NCERT chapter was not checked. A teacher should confirm it. To change it, edit `solutionKind` in `apps/web/lib/rainwaterLesson.ts` and the matching prompt and narration.

The school tank is shown above ground with see-through sides so the child can watch it fill.

## Texture format

`toktx` is not installed on the build machine, so KTX2 textures can't be produced here. The rainwater kit uses flat-coloured shared materials with no image textures, which is cheaper still. The loader supports KTX2 for later kits.
