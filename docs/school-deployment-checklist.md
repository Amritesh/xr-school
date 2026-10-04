# School deployment checklist

Use this checklist for every released simulation before promoting a preview to the school production domain. Automated checks establish a release candidate; they do not replace headset or classroom observation.

## 1. Automated release gate

- `npm run verify` passes from a clean checkout.
- All released catalog entries resolve to one canonical simulation route.
- Every narration cue has a packaged MP3 asset and the manifest validation passes.
- Production build completes without a missing route, asset, or TypeScript error.
- Browser acceptance produces no uncaught console error or framework error overlay.

## 2. Meta Quest device gate

Test on the oldest and newest Quest/browser combination the school will support.

- Enter immersive VR from the launch screen without a second permission failure.
- Trigger selects the visible object and in-scene HUD control being pointed at.
- A performs the primary lesson action; B exits immersive VR; X replays narration; Y returns to the previous stage.
- Left stick moves or bounded-teleports in all horizontal directions and cannot leave the authored learning area.
- Right stick snap-turns once per deflection without drift.
- Narration starts from a learner action, remains audible, and finishes without being cut off.
- Captions, questions, choices, hints, and navigation are visible in VR and do not collide with scene objects.
- Restart clears the current attempt and returns to the authored first stage.
- Exiting VR restores the browser camera and controls without reloading the page.
- Maintain a comfortable frame rate for ten minutes and confirm the headset does not show repeated low-memory warnings.

Record the device model, Quest OS version, Meta Quest Browser version, simulation slug, tester, date, and pass/fail evidence. Set `deviceVerified` only after this gate passes for that simulation.

## 3. Classroom pilot gate

- A teacher can launch the catalog, find the intended class/chapter/activity, and reset the lesson without developer help.
- Two learners can complete the objective using the written and narrated guidance.
- A learner can recover from one wrong choice and can exit VR independently.
- No safety note, scientific claim, visual scale disclosure, or accessibility control is missing.
- The school network can load the simulation and narration assets reliably during a full lesson period.
- Teacher feedback, learner confusion points, completion time, and any motion discomfort are recorded.

Set `classroomVerified` only after the observed pilot passes. A failed item returns the simulation to internal QA with a linked issue and reproduction steps.

## 4. Production promotion and rollback

- Promote the exact immutable preview deployment that passed the device and classroom gates; do not rebuild between approval and promotion.
- Confirm the catalog and three representative routes after promotion.
- Keep the previous production deployment available for immediate rollback.
- Roll back for launch failure, missing narration, broken controls, incorrect science, inaccessible assessment, or a material performance regression.
