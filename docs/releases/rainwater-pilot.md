# Rainwater Pilot Release Notes

Status: in progress.

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

## Texture format

`toktx` is not installed on the build machine, so KTX2 textures can't be produced here. The rainwater kit uses flat-coloured shared materials with no image textures, which is cheaper still. The loader supports KTX2 for later kits.
