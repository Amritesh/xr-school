import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';

function usage(message) {
  const suffix = message ? `: ${message}` : '';
  process.stderr.write(
    `Usage${suffix}\n  npm run narration:author -- --manifest <manifest.json> --provider edge-tts [--output-dir <directory>] [--voice <voice>]\n`,
  );
  process.exit(2);
}

function argumentsFrom(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) usage(`unexpected argument ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) usage(`${key} requires a value`);
    values.set(key.slice(2), value);
    index += 1;
  }
  return values;
}

const options = argumentsFrom(process.argv.slice(2));
const manifestArgument = options.get('manifest');
const provider = options.get('provider');
if (!manifestArgument || !provider) usage('--manifest and --provider edge-tts are required');
if (provider !== 'edge-tts') usage(`unsupported provider ${provider}`);

const manifestPath = resolve(process.cwd(), manifestArgument);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (!manifest || typeof manifest.id !== 'string' || !Array.isArray(manifest.cues)) {
  usage('manifest must contain an id and cues array');
}

const outputDirectory = resolve(
  process.cwd(),
  options.get('output-dir')
    ?? `apps/web/public/audio/${basename(manifestPath, extname(manifestPath))}`,
);
const voice = options.get('voice') ?? 'en-IN-NeerjaNeural';
mkdirSync(outputDirectory, { recursive: true });

for (const cue of manifest.cues) {
  if (!cue || typeof cue.id !== 'string' || typeof cue.text !== 'string') {
    usage('every cue must contain string id and text fields');
  }
  const safeId = cue.id.replace(/[^a-zA-Z0-9_-]/gu, '-');
  const outputPath = resolve(outputDirectory, `${safeId}.mp3`);
  if (dirname(outputPath) !== outputDirectory) usage(`unsafe cue id ${cue.id}`);
  execFileSync('edge-tts', [
    '--voice', voice,
    '--text', cue.text,
    '--write-media', outputPath,
  ], { stdio: 'inherit' });
}

process.stdout.write(
  `Authored ${manifest.cues.length} narration assets in ${outputDirectory}. Update and review the manifest audioUrl values before release.\n`,
);
