import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
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
    // Canonical manifests and their 16 packaged clips are integrity-tested in
    // guided-asset-manifests.test.ts. This legacy adapter must still degrade
    // safely for simulations whose manifest intentionally declares browser TTS.
    const missingNarration = "Narration fallback contract smoke test.";

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
