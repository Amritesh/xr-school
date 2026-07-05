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

Before opening a pull request, run:

```powershell
npm run verify
```

This matches the GitHub Actions quality gate. It checks the local environment, compiles the TypeSpec contract, validates and regenerates the science catalog, runs the unit suite, type-checks the web workspace, and builds the web app.

If you change TypeSpec contracts or generated catalog inputs, also confirm generated sources are current:

```powershell
git diff --exit-code -- generated/openapi/openapi.json apps/web/lib/scienceCatalog.generated.ts apps/web/lib/curriculumSearch.generated.ts
```
