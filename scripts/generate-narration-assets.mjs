import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, "..");
const viewerDirectory = resolve(root, "apps/web/components/simulations");
const outputDirectory = resolve(root, "apps/web/public/narration");
mkdirSync(outputDirectory, { recursive: true });

const NEERJA_STORYTELLER = {
  voice: "en-IN-NeerjaExpressiveNeural",
  rate: "-8%",
  pitch: "-2Hz",
  description: "Neerja Expressive storyteller",
};

// Keep this explicit so every catalog simulation is deliberately included in
// the narration rollout rather than only receiving an implicit fallback.
const narrationProfiles = Object.fromEntries([
  "AamPapadViewer.tsx",
  "CampInSnowViewer.tsx",
  "CircuitViewer.tsx",
  "CottonFarmingViewer.tsx",
  "CottonGinningViewer.tsx",
  "DeadSeaSaltWaterViewer.tsx",
  "FloatOrSinkViewer.tsx",
  "FoodSpoilageViewer.tsx",
  "LipidTestViewer.tsx",
  "MalariaDiagnosisViewer.tsx",
  "MilkSpoilageViewer.tsx",
  "MineralSourcesViewer.tsx",
  "MosquitoLifeCycleViewer.tsx",
  "PitcherPlantViewer.tsx",
  "PollinationViewer.tsx",
  "RainwaterStorageViewer.tsx",
  "RiverCrossingAdventureViewer.tsx",
  "RockClimbingViewer.tsx",
  "SeedDispersalViewer.tsx",
  "ShapeSortingViewer.tsx",
  "SnowMountainClimbingViewer.tsx",
  "SolubleInsolubleViewer.tsx",
  "StepwellStructureViewer.tsx",
  "VitaminDeficiencyViewer.tsx",
].map((file) => [file, NEERJA_STORYTELLER]));
const requestedViewer = process.argv[2];
const narrationPython = process.env.NARRATION_PYTHON ?? "python3";
const narrationPythonPath = process.env.NARRATION_PYTHONPATH;

function extended80ToNumber(buffer, offset) {
  const exponent = ((buffer[offset] & 0x7f) << 8) | buffer[offset + 1];
  const mantissa = buffer.readUInt32BE(offset + 2) * 2 ** 32 + buffer.readUInt32BE(offset + 6);
  return exponent === 0 ? 0 : mantissa * 2 ** (exponent - 16383 - 63);
}

function convertAiffPcmToWav(aiffPath, wavPath) {
  const aiff = readFileSync(aiffPath);
  let channels = 0;
  let frames = 0;
  let bits = 0;
  let sampleRate = 0;
  let pcm = null;
  for (let position = 12; position + 8 <= aiff.length;) {
    const chunk = aiff.toString("ascii", position, position + 4);
    const size = aiff.readUInt32BE(position + 4);
    const data = position + 8;
    if (chunk === "COMM") {
      channels = aiff.readUInt16BE(data);
      frames = aiff.readUInt32BE(data + 2);
      bits = aiff.readUInt16BE(data + 6);
      sampleRate = Math.round(extended80ToNumber(aiff, data + 8));
    } else if (chunk === "SSND") {
      const soundOffset = aiff.readUInt32BE(data);
      pcm = Buffer.from(aiff.subarray(data + 8 + soundOffset, data + size));
    }
    position = data + size + (size % 2);
  }
  if (!pcm || !channels || !frames || bits !== 16 || !sampleRate) throw new Error(`Unsupported AIFF narration: ${aiffPath}`);
  for (let index = 0; index + 1 < pcm.length; index += 2) {
    const byte = pcm[index]; pcm[index] = pcm[index + 1]; pcm[index + 1] = byte;
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32); header.writeUInt16LE(bits, 34); header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  writeFileSync(wavPath, Buffer.concat([header, pcm]));
  return frames / sampleRate;
}

function narrationKey(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function generateVoicePreviews() {
  const previewDirectory = resolve(root, "apps/web/public/voice-previews");
  const previewText = "Good morning, students. Today we will learn the life cycle of a mosquito: egg, larva, pupa, and adult. Observe each stage carefully, and notice how the first three stages depend on water.";
  const profiles = [
    { file: "1-rishi-classroom.wav", voice: "Rishi", rate: "152" },
    { file: "2-rishi-gentle.wav", voice: "Rishi", rate: "136" },
    { file: "3-rishi-energetic.wav", voice: "Rishi", rate: "170" },
    { file: "4-lekha-classroom.wav", voice: "Lekha", rate: "150" },
    { file: "5-lekha-gentle.wav", voice: "Lekha", rate: "132" },
  ];
  mkdirSync(previewDirectory, { recursive: true });
  for (const profile of profiles) {
    const aiff = join(previewDirectory, `${profile.file}.aiff`);
    const wav = join(previewDirectory, profile.file);
    rmSync(aiff, { force: true });
    rmSync(wav, { force: true });
    execFileSync("/usr/bin/say", [
      "-v",
      profile.voice,
      "-r",
      profile.rate,
      "-o",
      aiff,
      previewText,
    ]);
    convertAiffPcmToWav(aiff, wav);
    rmSync(aiff);
  }
  process.stdout.write(`${profiles.length} Indian voice previews generated\n`);
}

if (requestedViewer === "--voice-previews") {
  generateVoicePreviews();
  process.exit(0);
}

const files = readdirSync(viewerDirectory).filter(
  (file) => file.endsWith("Viewer.tsx") && (!requestedViewer || file === requestedViewer),
);
if (requestedViewer && files.length === 0) {
  throw new Error(`Narration viewer not found: ${requestedViewer}`);
}
let generated = 0;
for (const file of files) {
  const profile = narrationProfiles[file] ?? NEERJA_STORYTELLER;
  const source = readFileSync(join(viewerDirectory, file), "utf8");
  const array = source.match(/const NARRATIONS\s*=\s*\[([\s\S]*?)\];/)?.[1];
  if (!array) continue;
  const strings = [...array.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) => JSON.parse(`"${match[1]}"`));
  for (const match of source.matchAll(/const [A-Z_]*NARRATION\s*=\s*"((?:\\.|[^"\\])*)"/g)) {
    strings.push(JSON.parse(`"${match[1]}"`));
  }
  for (const text of strings) {
    const key = narrationKey(text);
    const mp3 = join(outputDirectory, `${key}.mp3`);
    const temporaryMp3 = `${mp3}.tmp`;
    rmSync(temporaryMp3, { force: true });
    execFileSync(narrationPython, [
      "-m",
      "edge_tts",
      "--voice",
      profile.voice,
      `--rate=${profile.rate}`,
      `--pitch=${profile.pitch}`,
      "--text",
      text,
      "--write-media",
      temporaryMp3,
    ], {
      env: narrationPythonPath
        ? { ...process.env, PYTHONPATH: narrationPythonPath }
        : process.env,
    });
    if (statSync(temporaryMp3).size < 1024) {
      throw new Error(`${basename(file)} produced an invalid narration clip for: ${text}`);
    }
    renameSync(temporaryMp3, mp3);
    generated += 1;
  }
  process.stdout.write(
    `${basename(file)} narration ready (${profile.description}, ${profile.voice})\n`,
  );
}
process.stdout.write(`${generated} narration clips generated\n`);
