# W1 Pollination Reference World Release

**Release status:** Deployed internal QA reference world

**Release maturity:** `internalQA`

**Implementation commit:** `71b97c54`

## Scope

W1 migrates Pollination to the shared world-builder foundation:

- one browser/WebXR renderer host backed by the fixed `1 / 60` world runtime;
- automatic browser and Quest presentation-profile transitions;
- mapped PBR soil, bark, foliage, petal, bee, wing, and pollen materials;
- a validated world bundle with explicit quality and acceptance budgets;
- a causal biology model that enforces pollen production, pollinator arrival,
  pollen transfer, fertilisation, seed formation, germination, and maturation;
- hidden scientific-model reference-vector verification;
- observation, misconception, and transfer evidence before mastery;
- deterministic resource disposal and seeded scene placement.

Rapier is intentionally not used by this world. Pollination is a biological
process, so its scientific truth is represented by the causal biology model.
Illustrative bee and pollen motion uses the shared fixed-step lifecycle.

## Automated acceptance

Evidence captured for the release candidate:

| Check | Result |
|---|---|
| Root verification | PASS |
| Unit suite | PASS — 285 tests across 38 files |
| TypeScript | PASS — web `tsc --noEmit` |
| Production build | PASS — Pollination and all released routes generated |
| TypeSpec and OpenAPI | PASS |
| Generated-source freshness | PASS |
| Spec drift | PASS — no errors or warnings |
| Pollination browser flow | PASS — all eight stages and three evidence kinds |
| Browser remount | PASS — one canvas after reload |
| Browser console | PASS — no warnings or errors |

## Production acceptance

- GitHub Quality:
  [run 28543477257](https://github.com/Amritesh/xr-school/actions/runs/28543477257)
- GitHub Deploy:
  [run 28543477060](https://github.com/Amritesh/xr-school/actions/runs/28543477060)
- Deployed immutable URL:
  <https://xr-school-99zkhkyer-amritesh-anands-projects.vercel.app>
- Production alias: <https://xr-school.vercel.app>
- Release candidate: `4f12b8301938e848b1ab9ad3a66e1ed173d13982`
- Protected Quality and Deploy workflows: PASS
- Production stages 1–8: PASS
- Observation evidence: PASS
- Misconception evidence: PASS
- Transfer evidence and concept mastery: PASS
- Mapped PBR scene and readable browser HUD: PASS
- Browser canvas ownership: PASS — exactly one canvas
- Browser console: PASS — no warnings or errors

Production acceptance covers the browser/WebXR delivery surface. It does not
replace the direct Quest checks below.

## Direct Quest acceptance — UNSIGNED

W1 is not approved for pilot or school-stable use until an on-device reviewer
signs all items:

- [ ] Stable 72 FPS at Quest Baseline
- [ ] Controller ray and trigger behavior
- [ ] Thumbstick, B/X, and navigation behavior
- [ ] Labels, narration, and cue cards readable at headset resolution
- [ ] No discomfort, flashes, or exposure jumps
- [ ] Correct session start, pause/resume, exit, and disposal
- [ ] Complete observation, misconception, transfer, and mastery path
- [ ] No missing maps or visible fallback materials
- [ ] Device temperature and memory within the approved test envelope

Deployment does not sign this checklist and does not promote release maturity.

## Next release

W2 migrates Circuit only after W1 passes production acceptance. Circuit will
reuse the shared web host and PBR presentation layer, while electrical truth
remains in an electrical model rather than the rigid-body engine.
