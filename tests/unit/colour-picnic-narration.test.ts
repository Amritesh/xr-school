import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PICNIC_NARRATION } from "../../apps/web/lib/colourPicnicLesson";
import { profileForSimulation } from "../../scripts/lib/catalog-narration-profiles";

const outputDirectory = resolve("apps/web/public/narration/colour-picnic");
const expectedCues = Object.entries(PICNIC_NARRATION).map(([id, text]) => ({
  id,
  text,
  audioUrl: `/narration/colour-picnic/${id}.mp3`,
}));

describe("Colour picnic packaged narration", () => {
  it("generates the exact authored cue IDs, text, and lesson voice without duplicating prompts", () => {
    const plan = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/generate-colour-picnic-narration.mjs",
          "--list-json",
        ],
        { encoding: "utf8" },
      ),
    );
    expect(plan.cues).toEqual(expectedCues);
    expect(plan.profile).toEqual(
      profileForSimulation("c1-art-a01-learning-of-colours"),
    );
    expect(expectedCues.length).toBeGreaterThan(0);
    expect(
      expectedCues.every(
        (cue) => /^[a-z0-9-]+$/.test(cue.id) && cue.text.trim(),
      ),
    ).toBe(true);
  });

  it("packages a complete MP3 larger than 1 KiB for every authored cue", () => {
    for (const cue of expectedCues) {
      const path = resolve("apps/web/public", `.${cue.audioUrl}`);
      expect(existsSync(path), cue.id).toBe(true);
      expect(statSync(path).size, cue.id).toBeGreaterThan(1024);
      const header = readFileSync(path).subarray(0, 3);
      const hasMp3Header =
        header.toString() === "ID3" ||
        (header[0] === 0xff && (header[1] & 0xe0) === 0xe0);
      expect(hasMp3Header, `${cue.id} should be MP3 audio`).toBe(true);
    }
    expect(
      readdirSync(outputDirectory)
        .filter((name) => name.endsWith(".mp3"))
        .sort(),
    ).toEqual(expectedCues.map((cue) => `${cue.id}.mp3`).sort());
  });

  it("keeps the recorded transcript and voice settings current with the lesson", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(outputDirectory, "manifest.json"), "utf8"),
    );
    expect(manifest.cues).toEqual(expectedCues);
    expect(manifest.profile).toEqual(
      profileForSimulation("c1-art-a01-learning-of-colours"),
    );
  });
});
