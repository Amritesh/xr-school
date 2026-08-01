# XR School

Offline-first K-12 XR simulation curriculum platform for Indian schools.

## Local Setup

Use Node.js 22 or newer. The repository is configured as an npm workspace with apps in `apps/*` and shared packages in `packages/*`.

```powershell
npm install
npm run env:check
```

## Useful Commands

Compile the TypeSpec API contract:

```powershell
npm run contract:compile
```

Run the test suite:

```powershell
npm run test
```

Build the API:

```powershell
npm run build -w @xr-school/api
```

Build the web app:

```powershell
npm run build -w @xr-school/web
```

Start the web app in development mode:

```powershell
npm run dev -w @xr-school/web
```

Start the API in development mode:

```powershell
npm run dev -w @xr-school/api
```

## Verification

Install the report and browser acceptance tooling once, then run the same strict
gate used by CI:

```powershell
python3 -m pip install -r requirements-report.txt
npx playwright install chromium
npm run verify
```

This matches the GitHub Actions quality gate. It checks the local environment,
TypeSpec and catalog drift, the canonical simulation registry, narration and
assets, all unit/package/API tests, package and production builds, report
freshness, and Chromium acceptance for every released simulation and legacy
route.

If you change TypeSpec contracts or generated catalog inputs, also confirm generated sources are current:

```powershell
git diff --exit-code -- generated/openapi/openapi.json apps/web/lib/scienceCatalog.generated.ts apps/web/lib/curriculumSearch.generated.ts
```

## Simulation quality reports

The quality portfolio covers all 35 publicly launchable simulations. All 35
currently have `internalQA` evidence maturity: public release does not imply a
signed Quest acceptance run, classroom validation, or measured learning gains.

Validate, regenerate, and freshness-check the shareable reports with:

```powershell
npm run reports:validate
npm run reports:generate
npm run reports:check
```

The tracked outputs are in `output/pdf/`. The scoring data is in
`reports/data/`, and the contribution rules are in
`docs/simulation-design/simulation-authoring-standard.md`.

## Narration boundary

Production builds and deployments only validate committed narration manifests:

```powershell
npm run narration:validate
```

Narration authoring is an explicit, provider- and network-dependent human action.
`npm run narration:author -- --manifest <path> --provider edge-tts` is never
called by `build`, `verify`, CI, or deployment.
