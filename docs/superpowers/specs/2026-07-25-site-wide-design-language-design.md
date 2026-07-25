# Site-Wide XR School Design Language

## Goal

Extend the approved homepage design language across the public curriculum library without modifying the homepage, classroom product, or immersive lessons.

## Design system

The homepage remains the canonical reference. Product surfaces reuse its pale lavender paper, aubergine ink, acid purple, mint, peach, yellow, serif display typography, compact sans-serif labels, pill controls, soft irregular details, subtle paper grain, and generous spacing.

The curriculum library is the editorial expression: spacious, warm, expressive, and content-led. Operational Robotree screens and simulation worlds are explicitly outside this website styling pass.

## Interaction and responsiveness

Interactive targets remain at least 44px. Hover lift is subtle, focus states are purple and visible, mobile layouts collapse to a single readable column, wide data tables scroll safely, and reduced-motion preferences disable nonessential transitions.

## Scope

Modify only the catalog styling in `apps/web/app/globals.css` plus its design contract. Do not modify `apps/web/app/page.tsx`, `apps/web/app/home.css`, Robotree, simulation interfaces, simulation science logic, catalog data, or classroom behavior.

## Verification

A design-contract unit test checks tokens and cross-surface conventions. The full test suite, TypeScript check, production build, and desktop/mobile visual inspection must pass. The final change is one commit pushed to `main`.
