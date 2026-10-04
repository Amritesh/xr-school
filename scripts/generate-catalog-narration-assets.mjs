import { spawn } from "node:child_process";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { IMPLEMENTED_SIMULATIONS } from "@xr-school/simulation-content";
import { profileForSimulation } from "./lib/catalog-narration-profiles.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(repositoryRoot, "apps/web/public/narration");
const narrationPython = process.env.NARRATION_PYTHON ?? "python3";
const narrationPythonPath = process.env.NARRATION_PYTHONPATH;
const concurrency = Number.parseInt(
  process.env.NARRATION_CONCURRENCY ?? "6",
  10,
);
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 12) {
  throw new Error("NARRATION_CONCURRENCY must be an integer from 1 to 12");
}

async function validClip(path) {
  try {
    return (await stat(path)).size >= 1024;
  } catch {
    return false;
  }
}

function runEdgeTts(task, temporaryPath) {
  const profile = profileForSimulation(task.slug);
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      narrationPython,
      [
        "-m",
        "edge_tts",
        "--voice",
        profile.voice,
        `--rate=${profile.rate}`,
        `--pitch=${profile.pitch}`,
        "--text",
        task.text,
        "--write-media",
        temporaryPath,
      ],
      {
        env: narrationPythonPath
          ? { ...process.env, PYTHONPATH: narrationPythonPath }
          : process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else
        rejectPromise(
          new Error(
            `${profile.label} failed for ${task.slug}/${task.cueId} (exit ${code}): ${stderr.trim()}`,
          ),
        );
    });
  });
}

async function generate(task, index) {
  const outputPath = resolve(outputDirectory, task.fileName);
  if (!force && (await validClip(outputPath))) return "skipped";
  if (dryRun) return "planned";

  const temporaryPath = `${outputPath}.tmp-${process.pid}-${index}`;
  await rm(temporaryPath, { force: true });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await runEdgeTts(task, temporaryPath);
      if (!(await validClip(temporaryPath))) {
        throw new Error(`Narration clip is too small: ${temporaryPath}`);
      }
      await rename(temporaryPath, outputPath);
      return "generated";
    } catch (error) {
      await rm(temporaryPath, { force: true });
      if (attempt === 3) throw error;
      await new Promise((resolvePromise) =>
        setTimeout(resolvePromise, attempt * 750),
      );
    }
  }
  throw new Error(`Unable to generate ${task.slug}/${task.cueId}`);
}

const tasks = [];
for (const definition of IMPLEMENTED_SIMULATIONS) {
  for (const cue of definition.narration.cues) {
    const match = cue.audioUrl?.match(/^\/narration\/([a-z0-9]+\.mp3)$/u);
    if (!match) continue;
    tasks.push({
      slug: definition.module.slug,
      cueId: cue.id,
      text: cue.text,
      fileName: match[1],
      profile: profileForSimulation(definition.module.slug),
    });
  }
}

if (new Set(tasks.map((task) => task.fileName)).size !== tasks.length) {
  throw new Error("Catalog narration contains duplicate hashed asset names");
}

await mkdir(outputDirectory, { recursive: true });
const counts = { generated: 0, skipped: 0, planned: 0 };
let nextIndex = 0;
let completed = 0;

async function worker() {
  while (nextIndex < tasks.length) {
    const index = nextIndex;
    nextIndex += 1;
    const result = await generate(tasks[index], index);
    counts[result] += 1;
    completed += 1;
    if (!dryRun && completed % 10 === 0) {
      process.stdout.write(
        `Narration progress: ${completed}/${tasks.length}\n`,
      );
    }
  }
}

await Promise.all(
  Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()),
);

const byVoice = tasks.reduce((summary, task) => {
  const key = `#${task.profile.previewNumber} ${task.profile.label}`;
  summary[key] = (summary[key] ?? 0) + 1;
  return summary;
}, {});

process.stdout.write(
  `${JSON.stringify({ total: tasks.length, ...counts, byVoice })}\n`,
);
