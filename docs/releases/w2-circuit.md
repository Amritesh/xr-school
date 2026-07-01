# W2 Circuit Reference World Release

**Release status:** Deployed internal QA reference world

**Release maturity:** `internalQA`

**Implementation commit:** `f6bf442c`

## Scope

W2 migrates Circuit to the shared world-builder foundation:

- one browser/WebXR renderer host backed by the fixed `1 / 60` lifecycle;
- automatic browser and Quest presentation-profile transitions;
- mapped PBR workshop, wood, circuit-board, copper, metal, battery, switch,
  resistor, bulb, and electron-marker materials;
- a validated world bundle with explicit Quest quality budgets;
- a hidden Ohm's-law model for current, power, and normalized bulb response;
- reference-vector verification for open, 10 Ω, and 200 Ω circuits;
- observation, misconception, and transfer evidence before mastery;
- deterministic scene construction, fixed-step charge-marker movement, and
  resource disposal.

Rapier is intentionally not used to calculate electricity. Voltage, current,
resistance, power, and bulb response are electrical-model outputs. The
rigid-body module remains available to worlds whose learning behavior depends
on contacts, forces, or gravity.

## Automated acceptance

| Check | Result |
|---|---|
| Unit suite | PASS — 291 tests across 39 files |
| Focused W2 contracts | PASS — model, world, host, PBR, viewer |
| TypeScript | PASS — web `tsc --noEmit` |
| Production build | PASS — all released routes generated |
| Generic route bundle guard | PASS — restored from 1.09 MB to 250 kB first load |
| TypeSpec and OpenAPI | PASS |
| Spec drift | PASS — no errors or warnings |
| Circuit browser flow | PASS — all four stages |
| Electrical readings | PASS — 10 Ω: 0.900 A; 50 Ω: 0.180 A; 200 Ω: 0.045 A |
| Mastery flow | PASS — observation, misconception, and transfer |
| Browser remount | PASS — one canvas after reload |
| Browser console | PASS — no warnings or errors |

## Production acceptance

- GitHub Quality:
  [run 28544670766](https://github.com/Amritesh/xr-school/actions/runs/28544670766)
- GitHub Deploy:
  [run 28544670796](https://github.com/Amritesh/xr-school/actions/runs/28544670796)
- Deployed immutable URL:
  <https://xr-school-dfbnvrj7w-amritesh-anands-projects.vercel.app>
- Production alias: <https://xr-school.vercel.app>
- Release candidate: `dd0eea0a5e93e0b1d678ddb0eeef1249727095b1`
- Protected Quality and Deploy workflows: PASS
- Open-circuit state and 0.000 A reading: PASS
- Closed 10 Ω state and 0.900 A reading: PASS
- Closed 200 Ω state and 0.045 A reading: PASS
- Stages 1–4: PASS
- Observation, misconception, transfer, and mastery: PASS
- Browser canvas ownership: PASS — exactly one canvas
- Browser console: PASS — no warnings or errors

Production acceptance covers the browser/WebXR delivery surface. It does not
replace the direct Quest checks below.

## Direct Quest acceptance — UNSIGNED

W2 is not approved for pilot or school-stable use until an on-device reviewer
signs all items:

- [ ] Stable 72 FPS at Quest Baseline
- [ ] Controller ray behavior for switch, resistor, and navigation controls
- [ ] Labels, narration, formula board, and readings are headset-readable
- [ ] Current markers and bulb response remain smooth at all resistor values
- [ ] No discomfort, flashes, or exposure jumps
- [ ] Correct session start, pause/resume, exit, and disposal
- [ ] Complete observation, misconception, transfer, and mastery path
- [ ] No missing maps or visible fallback errors
- [ ] Device temperature and memory within the approved test envelope

Deployment does not sign this checklist and does not promote release maturity.

## Next release

W3 migrates States of Matter after W2 production acceptance. Its particle
truth model and bounded motion will reuse the fixed-step runtime; Rapier will
only be used if a rigid-body contact is part of the lesson behavior.
