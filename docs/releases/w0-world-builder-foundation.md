# W0 World Builder Foundation Release

**Release status:** Deployed internal QA foundation

**Release maturity:** `internalQA`

**Foundation commit:** `d40bfb6ffb805a2a7a979e851175482b1593b3a8`

**Production URL:** <https://xr-school.vercel.app>

## Scope

W0 establishes the shared contracts and runtime needed to migrate one
simulation at a time:

- validated world, entity, environment, PBR material, quality, scientific
  model, assessment, asset, and acceptance definitions;
- deterministic `1 / 60` lifecycle and resource disposal;
- adaptive Quest/browser rendering and PBR factories;
- canonical Rapier rigid-body adapter;
- hidden scientific-model verification;
- misconception and transfer mastery engine;
- an uncatalogued browser/WebXR diagnostic reference world;
- strict verification and generated-artifact freshness gates.

W0 does not claim that Pollination, Circuit, States of Matter, Solubility, Food
Sources, Digestive System, or generic catalog viewers have completed their
world-builder migrations. Those remain separate releases.

## Automated acceptance

Evidence captured before the final release commit:

| Check | Result |
|---|---|
| Unit suite | PASS — 279 tests across 36 files |
| Focused W0 contracts | PASS — diagnostic, presentation, quality, Rapier |
| TypeScript | PASS — web `tsc --noEmit` |
| Production build | PASS — diagnostic and six simulation routes generated |
| TypeSpec and OpenAPI | PASS |
| Simulation contracts | PASS — six implemented slugs |
| Spec drift | PASS — no errors or warnings |
| Diagnostic browser flow | PASS — observation, misconception, transfer, mastery, replay |
| Browser console | PASS — no warnings or errors |

Final release evidence:

- Local `npm run verify`: PASS
- Generated-source diff: PASS
- GitHub Quality:
  [run 28542046710](https://github.com/Amritesh/xr-school/actions/runs/28542046710)
- GitHub Deploy:
  [run 28542047529](https://github.com/Amritesh/xr-school/actions/runs/28542047529)
- Deployed immutable URL:
  <https://xr-school-7972j2zui-amritesh-anands-projects.vercel.app>
- `origin/main` matched the foundation commit at acceptance time.
- Production smoke: `/`, `/simulations`, all six released demos, and the
  diagnostic route loaded without console warnings or errors.
- Production diagnostic: observation, misconception, transfer, mastery, and
  Rapier-backed world startup passed.

## Diagnostic acceptance

- PBR floor, painted sphere, metal comparison, calibrated light, fog, and
  PMREM environment render in browser mode.
- Rapier gravity replay disposes and remounts without an error.
- Browser diagnostics use the active quality profile.
- Observation, misconception, and transfer prompts produce mastery.
- The route is not included in the public simulation catalog.

## Direct Quest acceptance — UNSIGNED

W0 is not approved for pilot or school-stable use until an on-device reviewer
signs all items:

- [ ] Stable 72 FPS at Quest Baseline
- [ ] Controller ray and trigger behavior
- [ ] Thumbstick, B/X, and navigation behavior
- [ ] Labels and cues readable at headset resolution
- [ ] No discomfort, flashes, or exposure jumps
- [ ] Correct session start, pause/resume, exit, and disposal
- [ ] Complete diagnostic learning and mastery path
- [ ] No missing assets or visible fallback materials
- [ ] Device temperature and memory within the approved test envelope

Deployment does not sign this checklist and does not promote release maturity.

## Known follow-up

Reference-world migration order remains:

1. Pollination
2. Circuit
3. States of Matter
4. Solubility
5. Food Sources

Digestive System and the generic catalog runtime must also adopt the shared
lifecycle and presentation adapters before the architecture-wide acceptance
criterion “all simulations use the shared world lifecycle” can be closed.
