import { spawn } from "node:child_process";
import { mkdir, readFile, stat, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PICNIC_NARRATION } from "../apps/web/lib/colourPicnicLesson.ts";
import { profileForSimulation } from "./lib/catalog-narration-profiles.ts";

// Run from the repository root with node --import tsx. This generator owns only
// the picnic recordings; it never rewrites the catalog or Money Town assets.
const profile = profileForSimulation("c1-art-a01-learning-of-colours");
const cues = Object.entries(PICNIC_NARRATION).map(([id, text]) => {
  if (!/^[a-z0-9-]+$/.test(id) || typeof text !== "string" || !text.trim()) {
    throw new Error(`Invalid picnic narration cue: ${id}`);
  }
  return { id, text, audioUrl: `/narration/colour-picnic/${id}.mp3` };
});

if (process.argv.includes("--list-json")) {
  // Offline inspection contract used by the asset tests, without starting TTS.
  console.log(JSON.stringify({ profile, cues }));
} else {
  const outputDirectory = resolve("apps/web/public/narration/colour-picnic");
  const manifestPath = resolve(outputDirectory, "manifest.json");
  const previous = await readFile(manifestPath, "utf8")
    .then(JSON.parse)
    .catch(() => null);
  const previousCues = new Map(
    (previous?.cues ?? []).map((cue) => [cue.id, cue]),
  );
  const sameProfile = ["voice", "rate", "pitch"].every(
    (key) => previous?.profile?.[key] === profile[key],
  );
  let cursor = 0;

  async function worker() {
    while (cursor < cues.length) {
      const cue = cues[cursor++];
      const output = resolve("apps/web/public", `.${cue.audioUrl}`);
      await mkdir(dirname(output), { recursive: true });
      const unchanged =
        sameProfile && previousCues.get(cue.id)?.text === cue.text;
      if (
        unchanged &&
        (await stat(output)
          .then((file) => file.size > 1024)
          .catch(() => false))
      ) {
        continue;
      }
      const temporary = `${output}.${process.pid}.tmp`;
      try {
        await new Promise((done, fail) => {
          const child = spawn(
            process.env.NARRATION_PYTHON ?? "python3",
            [
              "-m",
              "edge_tts",
              "--voice",
              profile.voice,
              `--rate=${profile.rate}`,
              `--pitch=${profile.pitch}`,
              "--text",
              cue.text,
              "--write-media",
              temporary,
            ],
            {
              env: {
                ...process.env,
                PYTHONPATH: process.env.NARRATION_PYTHONPATH ?? "",
              },
              stdio: ["ignore", "ignore", "pipe"],
            },
          );
          let error = "";
          child.stderr.on("data", (chunk) => {
            error += chunk.toString();
          });
          child.on("error", fail);
          child.on("close", (code) =>
            code === 0
              ? done()
              : fail(
                  new Error(
                    `Narration ${cue.id} failed: ${error || `exit ${code}`}`,
                  ),
                ),
          );
        });
        if ((await stat(temporary)).size <= 1024) {
          throw new Error(`Invalid picnic clip: ${cue.id}`);
        }
        await rename(temporary, output);
        console.log(`Recorded ${cue.id} (${profile.label})`);
      } catch (error) {
        await rm(temporary, { force: true });
        throw error;
      }
    }
  }

  await Promise.all(Array.from({ length: 3 }, worker));
  // Record the exact authored text and voice settings so tests detect stale clips
  // after a prompt changes, rather than accepting an unrelated nonempty MP3.
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify({ profile, cues }, null, 2)}\n`,
  );
  console.log(
    `Colour picnic narration: ${cues.length} clips available (${profile.voice})`,
  );
}
