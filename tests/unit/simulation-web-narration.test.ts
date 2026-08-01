import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SimulationNarrationManifest } from "@xr-school/simulation-schema";
import {
  createNarrationController,
  type NarrationAudio,
  type NarrationControllerDependencies,
} from "../../packages/simulation-web/src/audio/createNarrationController";

afterEach(() => {
  vi.unstubAllGlobals();
});

class FakeAudio implements NarrationAudio {
  currentTime = 0;
  readonly pause = vi.fn();

  constructor(
    readonly src: string,
    private readonly playResult: Promise<void> = Promise.resolve(),
  ) {}

  play() {
    return this.playResult;
  }
}

function manifest(
  fallback: SimulationNarrationManifest["fallback"] = "browserTts",
): SimulationNarrationManifest {
  return {
    id: "narration-fixture",
    fallback,
    cues: [
      {
        id: "intro",
        stageId: "observe",
        text: "Observe what changes.",
        caption: "Observe what changes.",
        audioUrl: "/narration/intro.mp3",
      },
      {
        id: "compare",
        stageId: "compare",
        text: "Compare both results.",
        caption: "Compare both results.",
      },
    ],
  };
}

function dependencies(audioResults: Promise<void>[] = []) {
  const audio: FakeAudio[] = [];
  const spoken: string[] = [];
  const speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn((utterance: { text: string }) => spoken.push(utterance.text)),
  };
  const value: NarrationControllerDependencies = {
    createAudio(url) {
      const instance = new FakeAudio(
        url,
        audioResults.shift() ?? Promise.resolve(),
      );
      audio.push(instance);
      return instance;
    },
    speechSynthesis,
    createUtterance: (text) => ({ text }),
  };
  return { value, audio, spoken, speechSynthesis };
}

describe("simulation narration controller", () => {
  it("prefers a committed audio file over browser speech", async () => {
    const seam = dependencies();
    const controller = createNarrationController(manifest(), seam.value);

    await expect(controller.play("intro")).resolves.toBe("audio");

    expect(seam.audio.map((item) => item.src)).toEqual([
      "/narration/intro.mp3",
    ]);
    expect(seam.spoken).toEqual([]);
    expect(controller.currentCueId).toBe("intro");
  });

  it("falls back to browser speech when committed audio cannot play", async () => {
    const seam = dependencies([Promise.reject(new Error("decode failed"))]);
    const controller = createNarrationController(manifest(), seam.value);

    await expect(controller.play("intro")).resolves.toBe("speech");

    expect(seam.spoken).toEqual(["Observe what changes."]);
  });

  it("speaks a cue without audio only when the manifest permits browser TTS", async () => {
    const speechSeam = dependencies();
    const silentSeam = dependencies();
    const speaking = createNarrationController(manifest(), speechSeam.value);
    const silent = createNarrationController(manifest("none"), silentSeam.value);

    await expect(speaking.play("compare")).resolves.toBe("speech");
    await expect(silent.play("compare")).resolves.toBe("silent");

    expect(speechSeam.spoken).toEqual(["Compare both results."]);
    expect(silentSeam.spoken).toEqual([]);
  });

  it("stays silent when the browser utterance constructor fails", async () => {
    const seam = dependencies();
    seam.value.createUtterance = () => {
      throw new Error("speech API unavailable");
    };
    const controller = createNarrationController(manifest(), seam.value);

    await expect(controller.play("compare")).resolves.toBe("silent");

    expect(seam.spoken).toEqual([]);
    expect(controller.currentCueId).toBe("compare");
  });

  it("never fetches or contacts a provider across audio, speech, and silent playback", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("Narration runtime must not use the network");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const audioSeam = dependencies();
    const speechSeam = dependencies();
    const silentSeam = dependencies();

    await createNarrationController(manifest(), audioSeam.value).play("intro");
    await createNarrationController(manifest(), speechSeam.value).play("compare");
    await createNarrationController(manifest("none"), silentSeam.value).play(
      "compare",
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps process and provider tooling outside the browser package boundary", () => {
    const packageManifest = JSON.parse(readFileSync(resolve(
      process.cwd(),
      "packages/simulation-web/package.json",
    ), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    const runtimeDependencies = Object.keys(packageManifest.dependencies ?? {});

    expect(runtimeDependencies).not.toContain("edge-tts");
    expect(runtimeDependencies).not.toContain("child_process");
    expect(runtimeDependencies).not.toContain("node:child_process");
  });

  it("keeps one shared playback owner across controller instances", async () => {
    const firstSeam = dependencies();
    const secondSeam = dependencies();
    const first = createNarrationController(manifest(), firstSeam.value);
    const second = createNarrationController(manifest(), secondSeam.value);

    await first.play("intro");
    await second.play("intro");

    expect(firstSeam.audio[0].pause).toHaveBeenCalledOnce();
    expect(first.currentCueId).toBeUndefined();
    expect(second.currentCueId).toBe("intro");
  });

  it("does not let a stale audio rejection start speech over a newer cue", async () => {
    let rejectFirst!: (reason: unknown) => void;
    const firstResult = new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const seam = dependencies([firstResult]);
    const controller = createNarrationController(manifest(), seam.value);
    const firstPlay = controller.play("intro");

    await expect(controller.play("compare")).resolves.toBe("speech");
    rejectFirst(new Error("late failure"));
    await expect(firstPlay).resolves.toBe("silent");

    expect(seam.spoken).toEqual(["Compare both results."]);
    expect(controller.currentCueId).toBe("compare");
  });

  it("replays the last cue and stops or disposes every playback path", async () => {
    const seam = dependencies();
    const controller = createNarrationController(manifest(), seam.value);

    await controller.play("intro");
    await expect(controller.replay()).resolves.toBe("audio");
    controller.stop();

    expect(seam.audio).toHaveLength(2);
    expect(seam.audio.every((item) => item.pause.mock.calls.length > 0)).toBe(
      true,
    );
    expect(seam.speechSynthesis.cancel).toHaveBeenCalled();
    expect(controller.currentCueId).toBeUndefined();

    controller.dispose();
    await expect(controller.play("intro")).rejects.toThrow(
      "Narration controller has been disposed",
    );
  });

  it("rejects unknown cue identifiers without touching browser playback", async () => {
    const seam = dependencies();
    const controller = createNarrationController(manifest(), seam.value);

    await expect(controller.play("missing")).rejects.toThrow(
      'Unknown narration cue "missing"',
    );
    expect(seam.audio).toHaveLength(0);
    expect(seam.spoken).toHaveLength(0);
  });
});
