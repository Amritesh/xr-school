# Colour Adventure repair verification — 4 September 2026

Scope: `c1-art-a01-learning-of-colours`, following the interactivity audit. Changes are local on `aditya-xr-parity`; not pushed, merged, or deployed to Vercel. Other simulations' existing working-tree edits were preserved.

## Repairs

- One validated action boundary for panel buttons, scene raycasts and controller shortcuts. Invalid/stale quiz choices no longer throw a learner-facing application error.
- Each question displays its own recognizable 3D object and the same four choices as the panel. Clouds no longer offers the invalid Blue scene target.
- Wrong answers remain on the current question with retry feedback. Finish requires ten correct answers; the final celebration also requires explicit completion.
- Stationary readable choice labels, separated scene/panel layout, fixed panel navigation, scroll reset on stage changes and canvas ResizeObserver. Narrow browser viewports use the fixed HTML navigation; immersive VR retains the raycast navigation targets.
- Existing stage narration remains available, with Replay voice. Dynamic action feedback no longer plays an unrelated stage recording. This is not a new narration or headset-audio implementation.

## Evidence

- `npm test`: **145 files / 1,218 tests passed**. Includes 16 focused Colour Adventure model, scene and viewer tests.
- `npm --workspace apps/web run type-check`: passed.
- `npm run build`: passed, including static generation of 72 pages.
- `git diff --check`: passed.
- New Playwright desktop/mobile acceptance scenarios are discoverable with `npm run test:e2e -- --list tests/e2e/colour-adventure-acceptance.spec.ts`. They were not executed by the standalone Playwright browser runner in this environment; interactive verification below used the connected browser.

### Connected-browser checks

Desktop, 1280 × 720, local development build:

1. Opened lesson and completed all ten colour-learning stages plus Find the Colour; Next stayed disabled before required actions.
2. Clicked the actual 3D Finish target at zero answers: stayed on the quiz with Finish and Next locked and explanatory feedback.
3. Answered Apple incorrectly: score stayed 0/10, Apple remained active, no crash.
4. Reached the original Clouds crash boundary. Confirmed White/Green/Orange/Red in scene and panel; selected incorrect Green and then correct White through actual 3D targets. Score stayed 4/10 on the wrong answer, then advanced to 5/10.
5. Completed ten correct answers; Next remained locked until clicking the 3D Finish target. Reached Rainbow Celebration; Back preserved 10/10; Restart cleared progress.
6. Browser error log was empty during these interactions.

Mobile, 390 × 844, optimized production build served on `127.0.0.1:3000`:

1. Completed the full lesson, incorrect-answer retry and all ten quiz answers, explicit Finish and celebration.
2. Scene bounds: x 0, y 94.20, width 390, height 354.48. Panel begins at y 448.67: no scene/panel overlap. No horizontal document overflow.
3. Stage changes reset panel scrolling; fixed Back/Next remained accessible. Longer panel content scrolls independently.
4. Dragging visibly orbited the scene; Reset view restored its authored view.
5. Browser error log was empty. Normal viewport was restored afterward.

## Outstanding

- Physical Meta Quest verification: controller rays, controller A completion gate, B exit, locomotion and immersive audio. Shared input model is covered, but a desktop browser cannot establish headset behavior.
- Standalone Playwright execution in an environment that can launch its browser.
- Vercel preview deployment when requested. Production URL still serves its previous deployment.
- Next audited repair: Preposition Adventure. No changes to that simulation in this repair.
