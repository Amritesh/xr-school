# Natural Pollination Bees and Flowers

**Date:** 18 July 2026

**Status:** Approved visual direction; awaiting written-spec review

**Target:** Pollination simulation on desktop, classroom display, and Meta Quest Browser/WebXR

## Objective

Improve only the visible bees and flowers in the existing Pollination class so
they read as natural living organisms while retaining the project's approachable
stylized-realism art direction. The lesson sequence, interactions, pollination
model, camera, tools, garden layout, and assessment behavior remain unchanged.

## Reference Basis

The art decisions use the following classroom and natural-history
references:

- NCERT Class VII Science exemplar material for the expected Indian classroom
  distinction between self- and cross-pollination:
  https://ncert.nic.in/exemplar-problems.php?ln=en
- Smithsonian Gardens' field-journal approach, which prioritizes observation of
  real flower shape, colour, anatomy, and pollinator relationships:
  https://gardens.si.edu/learn/for-educators/pollination-investigation/
- Kew's pollinator classroom resources, which connect petal colour, shape,
  nectar, and scent to pollinator attraction:
  https://endeavour.kew.org/taster-resources/ks-2/pollination-and-seed-dispersal-infographics
- Smithsonian slow-motion bumblebee footage for wing posture, body mass, and
  pollen-contact reference:
  https://www.si.edu/object/yt_J7q9Kn1rhRc
- PBS Deep Look bee footage for hairy bodies, leg structure, pollen collection,
  and close-contact flower behavior:
  https://www.pbs.org/video/these-bees-hustle-to-put-food-on-the-table-doadj6/

These references guide appearance and biological readability; they are not
copied as assets.

## Selected Direction

Use natural stylization rather than photorealism or a colour-only correction.
The result should be recognizable and biologically plausible at close range,
but still readable for school learners and inexpensive enough for the existing
Quest performance budget.

### Bees

- Replace the bright synthetic yellow with a restrained ochre/amber abdomen,
  warm charcoal bands, a dark brown head, and a slightly warmer thorax.
- Improve the procedural silhouette with a tapered abdomen and distinct head,
  thorax, and abdomen proportions.
- Suggest thorax hair through low-cost layered geometry or material treatment,
  not expensive strand-based fur.
- Make wings thin, softly translucent, grey-blue rather than white, and add
  subtle vein geometry or texture that remains legible against the garden.
- Keep six legs on the hero bee, retain the cheaper ambient-bee detail level,
  and reuse shared geometry and materials.
- Preserve current flight, obstacle avoidance, wing animation, picking, and
  lesson visibility behavior.

### Lesson Flowers

- Preserve the existing anther, stigma, ovary, fruit, and interaction object
  names so lesson targeting is unchanged.
- Replace perfectly repeated petal forms with small deterministic differences in
  length, width, pitch, yaw, and colour value.
- Use dusty rose and muted violet palettes with lighter petal bases, darker
  edges or veins, and warm natural flower centres.
- Refine leaves from flattened spheres into tapered organic blades with visible
  midribs and slight asymmetry.
- Keep reproductive structures visibly distinct and classroom-readable even
  when their dimensions are slightly exaggerated.

### Peripheral Flowers

- Replace spherical blossoms with low-cost petal-and-centre silhouettes.
- Use a restrained meadow palette: dusty pink, soft violet, warm cream, muted
  yellow, and occasional off-white.
- Add deterministic variation in height, lean, scale, blossom rotation, and
  colour placement so rows do not read as cloned objects.
- Preserve instancing and bounded draw calls; no downloaded high-poly models or
  new runtime network dependency will be introduced.

## Architecture and Data Flow

`pollinationWorld.ts` remains the source of base PBR material definitions.
`PollinationViewer.tsx` derives the final bee and flower material variants and
passes them into `createPollinationScene`. `pollinationBotany.ts` owns hero bee
and lesson-flower geometry. `pollinationGarden.ts` owns instanced peripheral
flowers. No scientific or lesson state flows through these visual changes.

The existing scene update and disposal boundaries remain intact. Any new shared
geometry or derived material is created once, reused across instances, and
disposed by the existing Pollination scene/material resource lifecycle.

## Failure and Fallback Behavior

- The change uses procedural geometry and existing packaged texture families, so
  asset loading cannot introduce a new remote failure mode.
- If a quality profile needs simplification, ambient bees and peripheral flowers
  may use lower segment counts while hero objects retain their silhouettes.
- Existing object names and interaction targets must remain stable; a failed
  name-based contract test blocks deployment.

## Testing and Acceptance

- Add or update focused unit tests for natural bee palette/material wiring,
  tapered bee anatomy, translucent veined wings, varied lesson petals, organic
  leaves, and non-spherical peripheral blossoms.
- Run the Pollination-specific Vitest tests, the full unit suite, and web
  type-check.
- Launch the simulation and visually inspect at representative lesson stages,
  including close flower inspection and the bee stage.
- Confirm no new console errors, missing interaction targets, or disposal issues.
- Confirm the Quest-oriented scene still uses shared/instanced geometry and stays
  within the existing world budgets.
- After verification, deploy the resulting application through the repository's
  configured Vercel project and report the deployment URL.

## Out of Scope

- Adding or changing self-, insect-, wind-, or water-pollination lesson stages.
- Changing plant wind physics, bee flight behavior, garden density, lighting,
  UI, narration, assessment, or camera choreography.
- Importing photogrammetry, third-party GLB models, or external texture packs.
