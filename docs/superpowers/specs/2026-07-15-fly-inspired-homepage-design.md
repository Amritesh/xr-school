# Fly-Inspired XR School Homepage Design

## Goal

Transform the public XR School homepage into a warm, editorial, illustration-led experience with the clarity, restraint, and playful confidence of Fly.io while preserving XR School's own education-focused identity.

## Design direction

The page uses a pale lavender paper canvas, deep aubergine typography, acid-purple actions, mint and peach accents, and lightly textured hand-drawn illustrations. The visual system borrows Fly.io's rhythm—large serif statements, generous whitespace, alternating copy/art sections, and one saturated brand band—without copying its characters, layouts, or wording.

Typography pairs a literary display serif stack with a clean system sans-serif. Headlines are compact and conversational; body copy is shorter and more concrete than the current governance-heavy language. Decorative stars, orbit lines, and annotation marks support the science theme without becoming UI controls.

## Page structure

1. A compact sticky-feeling navigation row with XR School identity, Curriculum, Teacher room, Join room, and a purple “Explore simulations” action.
2. A centered hero led by “Step inside the lesson.” A wide original illustration shows a learner entering a portal surrounded by a flower, lungs, particles, orbiting planets, and a circuit—objects from the actual flagship simulations.
3. Three alternating editorial feature rows explaining embodied learning, classroom orchestration, and curriculum coverage. Each row has concise copy and contextual spot art.
4. A four-point capability grid for comfort, offline readiness, visible scientific models, and teacher control.
5. A saturated purple curriculum band containing six compact flagship cards for Classes 5–10. Cards use small hand-drawn subject motifs and preserve direct launch links.
6. A pale proof section with live catalog counts and a transparent Internal QA explanation.
7. A closing invitation and a structured dark-aubergine footer.

## Illustration system

Artwork is original raster illustration generated for XR School. It uses hand-drawn indigo outlines, imperfect ink texture, flat lavender/mint/peach/yellow fills, minimal shadow, no embedded text, no logos, and no photorealism. Assets are delivered as wide section compositions with backgrounds matching their page sections so they remain visually clean and avoid fragile transparency extraction.

## Responsive behavior

Desktop uses a maximum 1200px editorial column and alternates two-column feature rows. Below 900px, navigation links condense, features stack, and artwork follows its copy. Below 640px, the hero type scales down, actions become full-width, class cards become a horizontal snap row, and decorative elements reduce in size or hide. Touch targets remain at least 44px and focus states remain visible.

## Accessibility and performance

Illustrations are decorative where adjacent text communicates the same information; meaningful artwork receives concise alt text. Heading hierarchy remains sequential, links retain explicit labels, reduced-motion preferences disable hover lifts and animated accents, and color contrast targets WCAG AA. Images use Next.js optimization and explicit dimensions to avoid layout shift.

## Verification

- A unit contract checks the new homepage sections, links, artwork references, and responsive design hooks.
- The full Vitest suite, TypeScript check, and production build must pass.
- Desktop and mobile screenshots are inspected for overflow, hierarchy, clipping, legibility, and visual balance.
- The production URL is opened after deployment and checked for a successful response and expected hero content.

## Scope boundaries

This change does not alter catalog data, simulation routes, Robotree classroom behavior, API contracts, or simulation runtime styling. It redesigns only the public homepage and adds its dedicated visual assets.
