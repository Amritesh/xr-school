import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { IMPLEMENTED_SIMULATIONS } from '@xr-school/simulation-content';
import { validateNarrationManifest } from '@xr-school/simulation-schema';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(repositoryRoot, 'apps/web/public');
const failures: string[] = [];
let cueCount = 0;
let recordedCueCount = 0;

for (const definition of IMPLEMENTED_SIMULATIONS) {
  const prefix = definition.module.slug;
  for (const error of validateNarrationManifest(definition.narration)) {
    failures.push(`${prefix}: ${error}`);
  }

  for (const cue of definition.narration.cues) {
    cueCount += 1;
    if (cue.caption.trim() !== cue.text.trim()) {
      failures.push(`${prefix}/${cue.id}: caption must reproduce the narrated text`);
    }
    if (!cue.audioUrl) continue;
    recordedCueCount += 1;

    let pathname: string;
    try {
      const parsed = new URL(cue.audioUrl, 'https://xr-school.local');
      if (parsed.origin !== 'https://xr-school.local') {
        failures.push(`${prefix}/${cue.id}: audioUrl must be an offline public asset`);
        continue;
      }
      pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    } catch {
      failures.push(`${prefix}/${cue.id}: invalid audioUrl ${JSON.stringify(cue.audioUrl)}`);
      continue;
    }

    const assetPath = resolve(publicRoot, pathname);
    if (relative(publicRoot, assetPath).startsWith('..')) {
      failures.push(`${prefix}/${cue.id}: audioUrl escapes apps/web/public`);
    } else if (!existsSync(assetPath)) {
      failures.push(`${prefix}/${cue.id}: missing ${relative(repositoryRoot, assetPath)}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Narration validation failed:\n${failures.join('\n')}`);
}

process.stdout.write(
  `Validated ${IMPLEMENTED_SIMULATIONS.length} narration manifests (${cueCount} captioned cues; ${recordedCueCount} recorded assets).\n`,
);
