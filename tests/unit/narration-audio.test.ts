import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

function narrationKey(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

describe("Recorded Quest narration", () => {
  it("uses audio files with speech synthesis only as a desktop fallback", () => {
    const source = readFileSync(resolve(process.cwd(), "apps/web/components/simulations/narrationAudio.ts"), "utf8");
    expect(source).toContain("new Audio()");
    expect(source).not.toContain(".m4a");
    expect(source).not.toContain('"wav"');
    expect(source).toMatch(/\.mp3\b/);
    expect(source).toContain("speechFallback");
    expect(source).toContain("NARRATION_ASSET_VERSION");
    expect(source).toContain("narrationUrl(text)");
  });

  it("has a generated audio file for every static stage narration", () => {
    const viewerDirectory = resolve(process.cwd(), "apps/web/components/simulations");
    for (const file of readdirSync(viewerDirectory).filter((name) => name.endsWith("Viewer.tsx"))) {
      const source = readFileSync(resolve(viewerDirectory, file), "utf8");
      const array = source.match(/const NARRATIONS\s*=\s*\[([\s\S]*?)\];/)?.[1];
      if (!array) continue;
      const strings = [...array.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) => JSON.parse(`"${match[1]}"`) as string);
      for (const text of strings) {
        const key = narrationKey(text);
        const wavPath = resolve(process.cwd(), "apps/web/public/narration", `${key}.wav`);
        const mp3Path = resolve(process.cwd(), "apps/web/public/narration", `${key}.mp3`);
        const audioPath = existsSync(wavPath) ? wavPath : mp3Path;
        expect(existsSync(audioPath), `${file}: ${text}`).toBe(true);
        if (process.platform === "darwin") {
          const info = execFileSync("/usr/bin/afinfo", [audioPath], { encoding: "utf8" });
          const duration = Number(info.match(/estimated duration:\s*([\d.]+)/)?.[1] ?? 0);
          expect(duration, `${file}: narration is truncated`).toBeGreaterThanOrEqual(Math.max(1, text.split(/\s+/).length / 5));
        }
      }
    }
  });
});
