import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function isSupportedNodeVersion(versionText) {
  const match = String(versionText).trim().match(/^v?(\d+)\./);
  if (!match) return false;
  return Number(match[1]) >= 22;
}

export function collectMissingRequiredPaths(requiredPaths, exists = existsSync) {
  return requiredPaths.filter(item => !exists(item.path)).map(item => item.label);
}

export function buildRequiredPaths(root = process.cwd()) {
  return [
    { label: 'TypeSpec contract', path: resolve(root, 'contracts/typespec/main.tsp') },
    { label: 'OpenAPI output', path: resolve(root, 'generated/openapi/openapi.json') },
    { label: 'science simulation catalog', path: resolve(root, 'docs/catalog/class-5-to-10-science-virtual-tours-catalog.csv') },
    { label: 'simulation design spec', path: resolve(root, 'docs/superpowers/specs/2026-06-26-class-5-to-10-science-simulations-design.md') },
  ];
}

export function runDevEnvCheck({
  root = process.cwd(),
  nodeVersion = process.version,
  exists = existsSync,
  platform = process.platform,
} = {}) {
  const failures = [];

  if (!isSupportedNodeVersion(nodeVersion)) {
    failures.push(`Node ${nodeVersion} is unsupported. Use Node 22 or newer.`);
  }

  const missingPaths = collectMissingRequiredPaths(buildRequiredPaths(root), exists);
  for (const label of missingPaths) {
    failures.push(`Missing required file: ${label}`);
  }

  if (platform !== 'win32' && !exists('/bin/sh')) {
    failures.push('Missing /bin/sh. npm script execution expects a POSIX shell.');
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runDevEnvCheck();
  if (result.ok) {
    console.log('Dev environment check passed.');
  } else {
    console.error('Dev environment check failed:');
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}
