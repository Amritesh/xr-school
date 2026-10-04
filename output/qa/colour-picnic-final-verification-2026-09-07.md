# Colour Picnic final verification — 2026-09-07

## Outcome

The Class 1 Colour Picnic playable sample is ready for stakeholder preview on desktop and mobile browsers. The optimized Next.js production build completes successfully.

## Verified learner journey

- Opened the production route and confirmed the 3D garden reached its ready state.
- Used the visible 3D objects to inspect a wrong fruit, return it, and drag the red apple into the basket.
- Selected blue paint in the scene and painted six distinct cup patches with direct drag gestures.
- Chose and planted a yellow flag through the 3D scene.
- Reached the completion celebration and restarted with clean progress.
- Orbited the camera around the table and restored the authored view.
- Repeated layout verification at 390 × 844 with no horizontal overflow or scene/text collision.
- Confirmed no browser console errors or warnings during the journey.

## Automated evidence

- Focused Colour Picnic suite: 49/49 tests passed.
- Full repository suite: 1,267/1,267 tests passed across 149 files.
- Web TypeScript check: passed.
- Next.js optimized production build: passed, including static generation of `/simulations/colour-picnic-preview`.
- Formatting and whitespace validation: passed for the prototype files.

## Defects found and corrected during final testing

- Later-mission props could intercept pointer rays during the fruit mission. Hit testing is now restricted to the active mission while the guide and immersive controls remain available.
- A stale object label could remain after a mission transition. Cancelling an interaction now clears the hover label.
- The scene contract test was corrected to verify the complete unique target set without depending on `Map` insertion order.

## Remaining device boundary

Meta Quest immersive-VR hardware was not connected during this pass. WebXR controls, locomotion, narration hooks, and Exit VR wiring are covered by the existing automated project tests, but the prototype still needs a short on-headset acceptance check before a school release label.

The repository's Playwright acceptance file is authored for both 1280 × 800 and 390 × 844. Its standalone runner could not launch because this Mac does not currently have Playwright's separate headless Chromium binary; the same two flows were completed through the live browser instead.
