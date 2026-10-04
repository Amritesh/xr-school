import { spawn } from 'node:child_process';
import { mkdir, stat, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { MONEY_NARRATION_EXTRAS } from '../apps/web/lib/moneyTownNarrationExtras.ts';
import { profileForSimulation } from './lib/catalog-narration-profiles.ts';

// Scoped companion to generate-catalog-narration-assets.mjs. Does not rewrite
// any existing catalog clip or require a runtime TTS API/account.
const profile = profileForSimulation('c1-math-ch01-introduction-to-money');
let cursor = 0;
async function worker() {
  while (cursor < MONEY_NARRATION_EXTRAS.length) {
    const cue = MONEY_NARRATION_EXTRAS[cursor++];
    const output = resolve('apps/web/public', `.${cue.audioUrl}`);
    await mkdir(dirname(output), { recursive: true });
    if (
      await stat(output)
        .then((s) => s.size > 1024)
        .catch(() => false)
    )
      continue;
    const temporary = `${output}.tmp`;
    try {
      await new Promise((done, fail) => {
        const child = spawn(
          process.env.NARRATION_PYTHON ?? 'python3',
          [
            '-m',
            'edge_tts',
            '--voice',
            profile.voice,
            `--rate=${profile.rate}`,
            `--pitch=${profile.pitch}`,
            '--text',
            cue.text,
            '--write-media',
            temporary,
          ],
          {
            env: {
              ...process.env,
              PYTHONPATH: process.env.NARRATION_PYTHONPATH ?? '',
            },
            stdio: ['ignore', 'ignore', 'pipe'],
          },
        );
        let error = '';
        child.stderr.on('data', (chunk) => {
          error += chunk.toString();
        });
        child.on('error', fail);
        child.on('exit', (code) =>
          code === 0 ? done() : fail(new Error(error)),
        );
      });
      if ((await stat(temporary)).size < 1024)
        throw new Error(`Invalid clip: ${cue.id}`);
      await rename(temporary, output);
      console.log(`Recorded ${cue.id} (${profile.label})`);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
console.log(
  `Money narration: ${MONEY_NARRATION_EXTRAS.length} clips available`,
);
