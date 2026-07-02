# W3 States of Matter Reference World Release

**Release status:** Deployed internal QA reference world

**Release maturity:** `internalQA`

**Implementation commit:** `e6938f8f`

## Scope and evidence

W3 moves States of Matter to the shared fixed `1 / 60` host, adaptive PBR
presentation, reusable shared texture assets, deterministic bounded particle
motion, verified heat-to-state model, deterministic disposal, and
observation/misconception/transfer mastery.

Rendered markers are explicitly illustrative. The hidden model maps a
normalized teaching heat control to solid, liquid, and gas behavior; it does
not claim literal molecular size, count, trajectory, or temperature.

| Check | Result |
|---|---|
| Unit suite | PASS — 296 tests across 40 files |
| Focused W3 contracts | PASS |
| TypeScript | PASS |
| Production build | PASS — generic route remains 250 kB first load |
| Solid, liquid, gas, phase-change modes | PASS |
| Mastery flow | PASS |
| PBR visual inspection | PASS |
| Remount | PASS — one canvas |
| Browser console | PASS — no warnings or errors |

## Production acceptance

- GitHub Quality:
  [run 28562764335](https://github.com/Amritesh/xr-school/actions/runs/28562764335)
- GitHub Deploy:
  [run 28562764358](https://github.com/Amritesh/xr-school/actions/runs/28562764358)
- Immutable URL:
  <https://xr-school-g1xmi1u7b-amritesh-anands-projects.vercel.app>
- Production alias: <https://xr-school.vercel.app>
- Release candidate: `e05cb24265b92b9c425f8db1be9443da48362059`
- Protected Quality and Deploy workflows: PASS
- Solid, liquid, gas, and phase-change modes: PASS
- Observation, misconception, transfer, and mastery: PASS
- Browser canvas ownership: PASS — exactly one canvas
- Browser console: PASS — no warnings or errors

Production acceptance covers the browser/WebXR delivery surface. It does not
replace direct Quest acceptance.

## Direct Quest acceptance — UNSIGNED

- [ ] Stable 72 FPS at Quest Baseline
- [ ] Controller rays select all four stage buttons
- [ ] Heat control and phase transitions remain smooth
- [ ] Particle chamber, cue card, labels, and narration are headset-readable
- [ ] No discomfort, flashes, or exposure jumps
- [ ] Correct session lifecycle and resource disposal
- [ ] Complete mastery path
- [ ] No missing maps or visible fallback errors
- [ ] Device temperature and memory within the approved test envelope

Deployment does not sign this checklist or promote release maturity.
