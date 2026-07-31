import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  narrationKey,
  playNarration,
  stopNarration,
} from "../../apps/web/components/simulations/narrationAudio";

afterEach(() => {
  stopNarration();
  vi.unstubAllGlobals();
});

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

  it("uses the packaged narration manifest and falls back to speech for a missing clip", async () => {
    const viewerDirectory = resolve(process.cwd(), "apps/web/components/simulations");
    const narrations: string[] = [];
    for (const file of readdirSync(viewerDirectory).filter((name) => name.endsWith("Viewer.tsx"))) {
      const source = readFileSync(resolve(viewerDirectory, file), "utf8");
      const array = source.match(/const NARRATIONS\s*=\s*\[([\s\S]*?)\];/)?.[1];
      if (!array) continue;
      narrations.push(
        ...[...array.matchAll(/"((?:\\.|[^"\\])*)"/g)]
          .map((match) => JSON.parse(`"${match[1]}"`) as string),
      );
    }

    const shippedKeys = new Set(
      readdirSync(resolve(process.cwd(), "apps/web/public/narration"))
        .filter((file) => file.endsWith(".mp3"))
        .map((file) => file.slice(0, -4)),
    );
    const authoredKeys = new Set(narrations.map(narrationKey));
    expect(shippedKeys.size).toBeGreaterThan(0);
    expect([...shippedKeys].every((key) => authoredKeys.has(key))).toBe(true);

    const missingNarration = narrations.find(
      (text) => !shippedKeys.has(narrationKey(text)),
    );
    if (!missingNarration) {
      throw new Error("Expected at least one narration without a packaged clip");
    }

    const requestedSources: string[] = [];
    const spoken: string[] = [];
    class StubAudio {
      preload = "";
      volume = 1;
      muted = false;
      currentTime = 0;
      src = "";
      onerror: (() => void) | null = null;

      pause() {}
      load() {}
      setAttribute() {}
      play() {
        requestedSources.push(this.src);
        return Promise.reject(new Error("missing narration asset"));
      }
    }
    class StubUtterance {
      rate = 1;
      voice = null;

      constructor(readonly text: string) {}
    }
    const speechSynthesis = {
      cancel: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => []),
      speak: vi.fn((utterance: StubUtterance) => spoken.push(utterance.text)),
    };
    vi.stubGlobal("Audio", StubAudio);
    vi.stubGlobal("SpeechSynthesisUtterance", StubUtterance);
    vi.stubGlobal("window", { speechSynthesis });

    playNarration(missingNarration);
    await Promise.resolve();
    await Promise.resolve();

    expect(requestedSources).toHaveLength(1);
    expect(requestedSources[0]).toContain(
      `/narration/${narrationKey(missingNarration)}.mp3?v=`,
    );
    expect(spoken).toEqual([missingNarration]);
  });
});
