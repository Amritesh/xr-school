#!/usr/bin/env node
/**
 * spec-drift-check.mjs
 *
 * Checks that code changes don't drift from the TypeSpec contract.
 *
 * Rules:
 * 1. If apps/api files change, contracts/typespec/main.tsp must also change
 *    (unless [no-contract-change: reason] is in the commit message or CI env)
 * 2. If packages/simulation-schema files change, ontology docs must also change
 * 3. If apps/web/components files change, Storybook files must also change
 * 4. generated/openapi must not be manually edited (only via npm run contract:compile)
 *
 * Usage:
 *   node scripts/spec-drift-check.mjs
 *
 * In CI, set CHANGED_FILES env var to a newline-separated list of changed files.
 * Locally, it uses `git diff --name-only HEAD` to detect changes.
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const BOLD = "\x1b[1m";

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`${RED}${BOLD}[FAIL]${RESET} ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`${YELLOW}${BOLD}[WARN]${RESET} ${msg}`);
  warnings++;
}

function pass(msg) {
  console.log(`${GREEN}[PASS]${RESET} ${msg}`);
}

function getChangedFiles() {
  if (process.env.CHANGED_FILES) {
    return process.env.CHANGED_FILES.split("\n").filter(Boolean);
  }
  try {
    const output = execSync("git diff --name-only HEAD", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const staged = execSync("git diff --name-only --cached", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return [...output.split("\n"), ...staged.split("\n")]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i); // dedupe
  } catch {
    console.warn(
      "Could not read git diff. Pass CHANGED_FILES env var in CI, or run in a git repo."
    );
    return [];
  }
}

function matchesAny(files, prefixes) {
  return files.some((f) => prefixes.some((p) => f.startsWith(p)));
}

function isReusableComponent(filePath) {
  // Simulation viewers are full-page XR experiences, not reusable UI atoms
  if (filePath.includes("/components/simulations/")) return false;
  return (
    filePath.includes("/components/") &&
    !filePath.includes("/pages/") &&
    !filePath.includes("/app/") &&
    (filePath.endsWith(".tsx") || filePath.endsWith(".jsx"))
  );
}

function isStorybookFile(filePath) {
  return (
    filePath.includes(".stories.") ||
    filePath.includes(".story.") ||
    filePath.includes("__stories__") ||
    filePath.includes("storybook")
  );
}

function checkGeneratedOpenApiNotManuallyEdited(changedFiles) {
  const openApiChanged = changedFiles.filter((f) =>
    f.startsWith("generated/openapi/")
  );

  if (openApiChanged.length === 0) {
    pass("No manual edits to generated/openapi/");
    return;
  }

  const typespecChanged = changedFiles.some((f) =>
    f.startsWith("contracts/typespec/")
  );

  if (!typespecChanged) {
    fail(
      `generated/openapi/ was modified but contracts/typespec/ was not.\n` +
        `  Generated files must only change via: npm run contract:compile\n` +
        `  Changed files: ${openApiChanged.join(", ")}`
    );
  } else {
    pass("generated/openapi/ changed alongside TypeSpec (expected from compile)");
  }
}

function checkApiRoutesDriftFromTypeSpec(changedFiles) {
  const apiRoutesChanged = changedFiles.filter(
    (f) =>
      f.startsWith("apps/api/routes/") ||
      f.startsWith("apps/api/handlers/") ||
      f.startsWith("apps/api/controllers/")
  );

  if (apiRoutesChanged.length === 0) {
    pass("No API route changes to check");
    return;
  }

  const typespecChanged = changedFiles.some((f) =>
    f.startsWith("contracts/typespec/")
  );

  const noContractChangeFlag =
    process.env.NO_CONTRACT_CHANGE ||
    (() => {
      try {
        const msg = execSync("git log -1 --format=%B", {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        return msg.includes("[no-contract-change:");
      } catch {
        return false;
      }
    })();

  if (!typespecChanged && !noContractChangeFlag) {
    fail(
      `API route files changed but contracts/typespec/main.tsp did not.\n` +
        `  Changed routes: ${apiRoutesChanged.join(", ")}\n` +
        `  To bypass: add [no-contract-change: <reason>] to your commit message.\n` +
        `  Rule: TypeSpec is the source of truth. Update contract before implementing.`
    );
  } else if (noContractChangeFlag) {
    warn(
      `API route changes detected with [no-contract-change] bypass.\n` +
        `  Make sure changes are purely non-breaking (error handling, logging, etc.)`
    );
  } else {
    pass("API route changes accompanied by TypeSpec changes");
  }
}

function checkSimulationSchemaDriftFromOntology(changedFiles) {
  const simulationSchemaChanged = changedFiles.filter((f) =>
    f.startsWith("packages/simulation-schema/")
  );

  if (simulationSchemaChanged.length === 0) {
    pass("No simulation-schema changes to check");
    return;
  }

  const ontologyChanged = changedFiles.some(
    (f) =>
      f.startsWith("docs/ontology/") || f.startsWith("docs/simulation-design/")
  );

  if (!ontologyChanged) {
    warn(
      `packages/simulation-schema/ changed but ontology docs did not.\n` +
        `  Changed: ${simulationSchemaChanged.join(", ")}\n` +
        `  Consider updating docs/ontology/simulation-ontology.md if the change is structural.`
    );
  } else {
    pass("Simulation schema changes accompanied by ontology doc updates");
  }
}

function checkStorybookForReusableComponents(changedFiles) {
  const reusableComponents = changedFiles.filter(isReusableComponent);

  if (reusableComponents.length === 0) {
    pass("No reusable component changes to check");
    return;
  }

  const storybookChanged = changedFiles.some(isStorybookFile);

  if (!storybookChanged) {
    fail(
      `Reusable UI components changed but no Storybook stories were updated.\n` +
        `  Changed components: ${reusableComponents.join(", ")}\n` +
        `  Every reusable component requires: Default, EmptyState, LoadingState, ErrorState stories.\n` +
        `  See docs/ai-boundaries/ai-agent-boundaries.md for Storybook requirements.`
    );
  } else {
    pass("Reusable component changes accompanied by Storybook story updates");
  }
}

function checkFrozenDomainNotImplemented(changedFiles) {
  const frozenDomainPatterns = [
    { pattern: /crm[-_]lead/i, domain: "CRM Lead" },
    { pattern: /proposal/i, domain: "Proposal" },
    { pattern: /billing[-_]plan/i, domain: "Billing Plan" },
    { pattern: /payment[-_]gateway/i, domain: "Payment Gateway" },
    { pattern: /student[-_]login/i, domain: "Individual Student Login" },
    { pattern: /marketplace/i, domain: "Marketplace" },
  ];

  const appFiles = changedFiles.filter(
    (f) => f.startsWith("apps/") || f.startsWith("packages/")
  );

  for (const f of appFiles) {
    for (const { pattern, domain } of frozenDomainPatterns) {
      if (pattern.test(f)) {
        fail(
          `File "${f}" appears to implement frozen domain: ${domain}\n` +
            `  Frozen domains must not be deeply implemented in MVP.\n` +
            `  See docs/specs/future-extension-shell.md for scope decisions.`
        );
      }
    }
  }

  if (errors === 0) {
    pass("No frozen domain implementations detected");
  }
}

function checkTypeSpecCompiles() {
  const tsconfigPath = "contracts/typespec/tspconfig.yaml";
  if (!existsSync(tsconfigPath)) {
    warn(`TypeSpec config not found at ${tsconfigPath}. Skipping compile check.`);
    return;
  }

  // In CI we rely on the separate contract:compile step.
  // Here we just check the generated file exists and is not empty.
  const openApiPath = "generated/openapi/openapi.json";
  if (!existsSync(openApiPath)) {
    warn(
      `generated/openapi/openapi.json does not exist.\n` +
        `  Run: npm run contract:compile\n` +
        `  This will be an error once the first compile has run.`
    );
    return;
  }

  try {
    const content = readFileSync(openApiPath, "utf8");
    const parsed = JSON.parse(content);
    if (!parsed.openapi || !parsed.info) {
      fail("generated/openapi/openapi.json exists but appears malformed");
    } else {
      pass(`OpenAPI spec exists and is valid JSON (version: ${parsed.openapi})`);
    }
  } catch {
    fail("generated/openapi/openapi.json exists but could not be parsed as JSON");
  }
}

// Run all checks
console.log(`\n${BOLD}=== Spec Drift Check ===${RESET}\n`);

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  console.log("No changed files detected. All checks pass by default.\n");
  process.exit(0);
}

console.log(`Checking ${changedFiles.length} changed files...\n`);

checkGeneratedOpenApiNotManuallyEdited(changedFiles);
checkApiRoutesDriftFromTypeSpec(changedFiles);
checkSimulationSchemaDriftFromOntology(changedFiles);
checkStorybookForReusableComponents(changedFiles);
checkFrozenDomainNotImplemented(changedFiles);
checkTypeSpecCompiles();

console.log(`\n${BOLD}=== Results ===${RESET}`);
console.log(`Errors: ${errors > 0 ? RED : GREEN}${errors}${RESET}`);
console.log(`Warnings: ${warnings > 0 ? YELLOW : GREEN}${warnings}${RESET}`);

if (errors > 0) {
  console.error(
    `\n${RED}${BOLD}Drift check FAILED. Fix the errors above before merging.${RESET}\n`
  );
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`\n${YELLOW}Drift check passed with warnings.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n${GREEN}${BOLD}Drift check PASSED.${RESET}\n`);
  process.exit(0);
}
