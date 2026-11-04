# Simulation Visual and Fun Upgrade: Design

Status: draft for owner approval. Nothing here has been built.
Activity list: [2026-11-04-simulation-visual-upgrade-activities.csv](2026-11-04-simulation-visual-upgrade-activities.csv)

## 1. Why

The owner finds the simulations visually weak and not fun enough, and named the rainwater simulation as the example. The goal is to make them much better and more fun, category by category and most important first, using as much free and community content as possible, without giving up performance.

What was found in the code and by playing steps 1–6 of 13 of the rainwater simulation in a browser:

- **Mismatched look.** Plain coded shapes sit on top of a detailed 360° village image.
- **Actions have no consequences.** The "water saved" meter is a fixed value per stage. The Heavy Rain Challenge moves from 6,500 to 10,000 L on one button press.
- **Almost no real models.** Only 1 of 51 viewers (Digestive System) has a model loader, and only one model file ships in `apps/web/public` (a cow). The rainwater viewer alone has about 100 coded mesh and geometry calls.
- **Cluttered view.** Instructions appear twice, and the tank blocks the house being worked on.

Frame rate has not been measured, and nothing has been tried on a headset.

## 2. Goals, non-goals, anti-goals

Goals, in priority order:

1. Interaction is fun: what the child does changes what happens.
2. Visuals are the best achievable inside the performance budget.
3. Every activity has a category and a place in the queue.
4. Free and community content is the first choice, and every asset's licence is recorded.

Non-goals:

- Changing the curriculum, learning objectives or assessment model.
- Building all 497 catalogued activities in one effort.
- Replacing the platform (Three.js, WebXR, Next.js).

Anti-goals, which make this a failure even if it ships:

- A scene that looks better but still completes with one button press.
- Missing 72 FPS on Quest to achieve a look.
- An asset with an unknown or incompatible licence.
- Good-looking science that is wrong, such as implying filtered rainwater is safe to drink.
- A patchwork of art styles.
- Removing the accessible, non-pointer way through a lesson.

## 3. Constraints already in the repo

These come from `docs/simulation-design/` and are binding.

| Area | Rule |
|---|---|
| Quest budget | At least 72 FPS, at most 120 draw calls, at most 250,000 visible triangles |
| Rendering on Quest | One 1024 px shadow map, 1024 px standard textures, one key light, no full-screen post-processing |
| Package size | Class 1–5 under 300 MB; Class 6–8 under 500 MB; Class 9–10 under 800 MB |
| Session length | Class 1–5: 8 min; Class 6–8: 10 min; Class 9–10: 12 min |
| Offline | Must run from local files with no third-party network requests |
| Assets | Each records source, author, licence, size, hash and fallback; unknown provenance blocks release evidence |
| Architecture | Reviewers reject clone renderers, so improvements belong in shared systems |
| Accessibility | Keyboard path, captions and reduced-motion mode remain, with the full learning sequence |
| Narration | Authoring is an explicit human action, never part of the build |

Meta's published Quest 3 guidance is looser (under 200 draw calls and 1.5M triangles). This design keeps the stricter repo budget, so scenes also suit lower-end devices.

## 4. Categories

Each activity gets one category, based on what its best version needs. The first three and their combinations were requested by the owner. "Concept board" is an added category (my call) for activities that are mostly diagrams.

| Category | All (503) | Released (44) | Typical content |
|---|---:|---:|---|
| Hard surface + Simulation | 226 | 9 | Lab benches, circuits, optics |
| Organic + Simulation | 94 | 12 | Body systems, plant and microbe processes |
| Organic | 58 | 4 | Plant parts, tissues, animal types |
| Simulation-led | 49 | 2 | Atoms, sky mechanics, wave behaviour |
| Hard surface + Organic | 36 | 12 | Farms, field trips, villages |
| Hard surface + Organic + Simulation | 15 | 4 | Rainwater, river crossing |
| Hard surface | 14 | 1 | Instruments and materials to inspect |
| Concept board | 11 | 0 | Periodic table, chromosome diagrams |

The 503 rows are the 497 catalogued activities plus 6 released simulations outside the catalog (Classes 1 and 2, and three multi-class).

Categories were assigned from titles, chapters and catalog fields by judgement, not by inspecting each lesson. Expect corrections. The catalog's own `primaryArchetype` was not used as the category, because it labels the rainwater mission `modelInspection`.

## 5. Kits

Categories say what content is needed. Kits are what actually gets built and reused: a set of models, materials and interaction behaviour shared by many activities. This is how the work stays affordable and the style stays consistent.

| Kit | Activities | Released | Wave 3 hands-on | Content approach |
|---|---:|---:|---:|---|
| Living World | 82 | 12 | 5 | Poly Haven, NIH 3D (per model), Blender |
| Chemistry Bench | 73 | 3 | 31 | Blender glassware, Poly Haven textures |
| Forces, Motion & Sound Bench | 60 | 2 | 7 | Kenney, Blender, Rapier physics (already a dependency) |
| Farm & Factory | 49 | 7 | 1 | Kenney, Blender; Quaternius after licence decision |
| Human Body | 46 | 2 | 0 | BodyParts3D or Z-Anatomy restyled in Blender; share-alike decision needed |
| Water, Air & Weather | 38 | 1 | 4 | Kenney, Poly Haven, custom water and particle effects |
| Electricity & Magnets Bench | 38 | 1 | 9 | Blender components, custom circuit logic |
| Light & Optics Bench | 31 | 0 | 19 | Blender optics, custom ray tracing |
| Places & Field Trips | 26 | 10 | 1 | Kenney, Poly Haven, Blender for Indian buildings |
| Atoms & Particles | 26 | 1 | 5 | Procedural instancing; no external models |
| Sort & Classify | 24 | 4 | 1 | Kenney and Poly Haven props, board UI |
| Sky & Space | 10 | 1 | 0 | NASA models and texture maps |

Only 469 of the titles are unique, so some activities can share one build (for example Water Cycle appears three times).

## 6. Order of work

| Wave | Count | What | Rule |
|---|---:|---|---|
| Foundation | – | Shared systems (section 7) | Built with the first pilot, not before it |
| 1 Pilot | 6 | One released simulation per main kit | Proves the kit and the fun standard |
| 2 Released upgrade | 38 | The remaining released simulations | Children can already reach these |
| 3 Hands-on new | 83 | Unreleased `experimentBench` and `scenario` activities | Hands-on activities gain most from VR |
| 4 Remaining new | 365 | Everything else | By kit, then by class |
| Review first | 11 | Reproduction, sex determination and AIDS topics | Age-appropriateness and content review before any work |

Pilots:

| Pilot | Kit | Why |
|---|---|---|
| Rainwater Storage | Water, Air & Weather (also starts Places) | Owner's named example; needs all three content types |
| Breathing Process | Human Body | Lowest overall quality score (73) and tied-lowest visuals (8); tests the anatomy pipeline |
| Acids and Bases | Chemistry Bench | Second-largest kit and the most Wave 3 work |
| Force and Motion | Forces, Motion & Sound | 60 activities depend on this kit |
| Electric Circuits | Electricity & Magnets | Existing circuit behaviour to build on |
| Pollination | Living World | Largest kit |

Pilots run one at a time. Rainwater goes first, and Wave 2 starts only after the owner signs off the pilots.

Quality-card scores helped little here: visuals only range from 8 to 12 and interactivity from 13 to 15, so reuse carried more weight (my call). Wave 2 order is Living World, Places, Farm & Factory, then the rest (my call).

## 7. Shared foundation

Built into the shared packages so all viewers benefit, and scoped to what the rainwater pilot needs first:

- **Model loading:** one GLB loader with texture and mesh compression, caching, disposal and the required fallback when a file is missing. Three.js 0.170 is already in use.
- **Asset pipeline:** a script that imports a source model, compresses it, reports triangles and texture memory, and fails if the budget or licence record is missing. Tool choice is left to the builder.
- **Licence register:** extends the existing `AssetDefinition` records, with attribution files alongside the assets, as already done for the ploughing and solar-system assets.
- **Art kit:** one material and colour palette, lighting preset and scale guide.
- **Interaction kit:** grab, snap-to-socket, valve and pour, working with pointer, Quest controllers and keyboard.
- **Water and effects kit:** moving-surface water, pooled instanced droplets, and fill levels. No real fluid solver on Quest.
- **Performance gate:** draw-call and triangle checks from `renderer.info` in tests, plus an on-headset FPS record per release. Measure the current rainwater simulation first, so there is a baseline to compare against.

Art direction (my call): clean stylised low-poly with physically based materials and baked lighting. That is the style most likely to look good within 250,000 triangles and to blend assets from different sources. The 360° images stay only if they stop clashing, and may need repainting to match.

Community kits skew Western or medieval, so India-specific items (stepwells, Sundargram's houses, forts, local crops) will likely be modelled in Blender. Blender and ComfyUI are available on this machine. Any generated texture must record its tool, model and source, as the authoring standard requires.

## 8. The fun standard

Every upgraded simulation must meet all of these:

1. **Consequence:** the child's action directly changes what happens.
2. **Visible, safe mistakes:** a wrong action shows why it's wrong and can be retried.
3. **One "whoa" moment** that is worth telling a friend about.
4. **A reason to replay:** a score, a better outcome or something left to find.
5. **Non-pointer parity:** keyboard and reduced-motion paths run the same logic, not a skip button.
6. **Right science:** the behaviour teaches the correct idea, and existing misconception checks remain.

Whether it is actually fun can only be confirmed by watching children use it. The pilots should be tried with a few learners before Wave 2. Who runs that is an open question.

## 9. Rainwater pilot

| Step | Child does | Sees |
|---|---|---|
| Rainy day | Follows a raindrop | Runoff reaches the drain; the "lost" counter climbs |
| Drought jump | Looks around | The village dries: pond shrinks, crops wilt |
| Rooftop | Snaps gutter pieces to the roof edge | Water flows at once; gaps spill onto the road |
| Filter | Opens first-flush valve, stacks stones, sand, charcoal | Brown water diverts, then runs clear; wrong order stays cloudy |
| School | Connects a far larger roof | Tank fills faster: bigger roof, more water |
| Recharge pit | Drops in layers | Cutaway shows seepage, groundwater rises, plants recover |
| Heavy rain | 60–90 second valve-routing game | Storm builds, roads flood if they fall behind, score at the end |
| Summer | Shares saved water among garden, animals, cleaning | Supply can run out; storm result carries over |
| Final choice and celebration | Compares two villages | Sees their own result reflected |

Things this changes (builder must handle):

- **Earned meter:** the fixed `saved` values go. The 10,000 L target remains the goal, but children can finish below it.
- **Narration:** lines stating fixed results ("reached ten thousand litres", "You saved every possible drop") must be reworded or given variants, then re-authored by a person.
- **Time:** the mission must still fit the 8-minute Class 5 limit. The current 13 stages may need merging (builder's call, with the learning order preserved).
- **Safety message:** stored water remains for non-drinking uses, and filtering is never shown as making water drinkable.
- **Clean view:** remove duplicate instruction text and keep the working area unblocked.

Definition of done:

- Meets the fun standard.
- At least 72 FPS on a Quest, inside the budget.
- Full licence records.
- All existing tests pass, updated only where they assert the old fixed behaviour.
- Owner signs off in a headset.

## 10. Free content sources

Checked on 2026-11-04 at the source's own licence page unless marked otherwise. Licences must be rechecked per asset at download.

| Source | Use | Licence found | Decision |
|---|---|---|---|
| [Kenney](https://kenney.nl/support) | Props, vehicles, buildings | CC0, commercial use allowed | First choice |
| [Poly Haven](https://polyhaven.com/license) | Textures, HDRIs, realistic models | CC0 | First choice; realistic models need restyling |
| [ambientCG](https://docs.ambientcg.com/license/) | Textures | CC0 | First choice |
| [NASA](https://www.nasa.gov/nasa-brand-center/images-and-media/) | Space models and maps | Generally no US copyright; logos excluded; no implied endorsement | Use with credit, no logos |
| [Quaternius](https://quaternius.com/license.html) | Rigged animals, crops, characters | Own licence, not CC0 in the page checked: free in finished products, no redistributing the assets, even modified | Hold; this repo is public |
| [BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D), [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) | Anatomy | CC BY-SA (from repositories; some derivatives add non-commercial parts) | Decision needed; share-alike applies to derived models |
| [NIH 3D](https://3d.nih.gov/about) | Cells, viruses, anatomy | Not stated on the page checked | Per-model check |
| Smithsonian Open Access | Artefacts, specimens | Not verified (site refused access) | Verify before use |
| [Sketchfab](https://sketchfab.com/licenses) | Gap filler | Varies per model; Standard licence bars standalone redistribution | Downloadable CC0 or CC BY only, per model |
| [Poly Pizza](https://poly.pizza) | Low-poly gap filler | Varies per model (secondary source) | Per-model check |
| [PhET](https://phet.colorado.edu/en/licensing/html) | Behaviour reference | Sims before 2026-03-29: CC BY 4.0, logo must stay. Later sims: not confirmed at source; [PhET's announcement](https://phetsims.substack.com/p/a-small-change-to-support-a-big-mission) describes non-commercial licensing | Behaviour reference. May be embedded as a browser companion, with attribution and logo, but it isn't a VR experience |
| Mixamo | Character animation | Not checked | Don't use until checked |

Rules:

- The owner confirmed on 2026-11-04 that XR School is non-commercial, so CC BY-NC content is allowed.
- Prefer CC0 and CC BY where they serve equally well. Each NC asset is flagged in its licence record, so it can be found and replaced if the project ever starts charging.
- ND and "editorial" content stays excluded: these simulations need to adapt and optimise models, which ND forbids.
- Share-alike and attribution terms still apply, and Quaternius's redistribution limit is unaffected.
- Store local copies with source URL, author, licence and any changes.
- No hotlinking.
- Science must be reviewed regardless of source.

## 11. Open decisions for the owner

Decided: XR School is non-commercial (owner, 2026-11-04). This allows non-commercial anatomy parts and makes PhET embedding possible in principle, subject to section 10.

Still open:

1. **Can the repo stay public with third-party models in it?** Quaternius forbids redistribution of the assets, and a public repo may count. Default: use no Quaternius assets until resolved. A private asset store is the alternative.
2. **Is share-alike acceptable for anatomy models?** Default: use BodyParts3D-derived models only with their licence kept and credited; otherwise model organs in Blender.
3. **Which Quest device is the minimum, and who can test on it and with children?** Default: Quest Baseline budget.

## 12. Calls made without the owner

- Added the "Concept board" category.
- Introduced kits and the four-wave order; chose the six pilots.
- Set stylised low-poly as the art direction.
- Excluded a real fluid solver on Quest.
- Marked 11 sensitive topics "Review first".
- Kept the repo's stricter Quest budget over Meta's.
- Moved 8.1.5's slug to the released spelling (`...-of-crops`) in the activity list; the catalog says `...-of-crop`.

## 13. Left to the builder

- Compression and pipeline tools.
- Module layout, within the existing architecture and no clone renderers.
- Exact stage merging and game tuning for rainwater.
- Selecting individual assets, within section 10.
