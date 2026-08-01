import type { SimulationNarrationManifest } from "@xr-school/simulation-schema";

export type NarrationPlaybackMode = "audio" | "speech" | "silent";

export interface NarrationAudio {
  currentTime: number;
  play(): Promise<void> | void;
  pause(): void;
}

export interface NarrationUtterance {
  readonly text: string;
}

export interface NarrationSpeechSynthesis {
  cancel(): void;
  speak(utterance: NarrationUtterance): void;
}

export interface NarrationControllerDependencies {
  createAudio?(url: string): NarrationAudio | undefined;
  speechSynthesis?: NarrationSpeechSynthesis | null;
  createUtterance?(text: string): NarrationUtterance | undefined;
}

export interface SimulationNarrationController {
  readonly currentCueId: string | undefined;
  play(cueId: string): Promise<NarrationPlaybackMode>;
  replay(): Promise<NarrationPlaybackMode>;
  stop(): void;
  dispose(): void;
}

interface PlaybackOwner {
  stopFromPeer(): void;
}

let activeOwner: PlaybackOwner | undefined;

function defaultAudio(url: string): NarrationAudio | undefined {
  if (typeof Audio === "undefined") return undefined;
  return new Audio(url);
}

function defaultSpeechSynthesis(): NarrationSpeechSynthesis | null {
  if (typeof globalThis.speechSynthesis === "undefined") return null;
  return globalThis.speechSynthesis;
}

function defaultUtterance(text: string): NarrationUtterance | undefined {
  if (typeof SpeechSynthesisUtterance === "undefined") return undefined;
  return new SpeechSynthesisUtterance(text);
}

export function createNarrationController(
  manifest: SimulationNarrationManifest,
  dependencies: NarrationControllerDependencies = {},
): SimulationNarrationController {
  const cues = new Map(manifest.cues.map((cue) => [cue.id, cue]));
  const createAudio = dependencies.createAudio ?? defaultAudio;
  const speechSynthesis = dependencies.speechSynthesis === undefined
    ? defaultSpeechSynthesis()
    : dependencies.speechSynthesis;
  const createUtterance = dependencies.createUtterance ?? defaultUtterance;

  let currentCueId: string | undefined;
  let lastCueId: string | undefined;
  let activeAudio: NarrationAudio | undefined;
  let generation = 0;
  let disposed = false;

  const stopOwnedPlayback = () => {
    generation += 1;
    if (activeAudio) {
      activeAudio.pause();
      if (Number.isFinite(activeAudio.currentTime)) activeAudio.currentTime = 0;
      activeAudio = undefined;
    }
    if (activeOwner === owner) {
      speechSynthesis?.cancel();
      activeOwner = undefined;
    }
    currentCueId = undefined;
  };

  const owner: PlaybackOwner = {
    stopFromPeer: stopOwnedPlayback,
  };

  const controller: SimulationNarrationController = {
    get currentCueId() {
      return currentCueId;
    },

    async play(cueId) {
      if (disposed) {
        throw new Error("Narration controller has been disposed");
      }
      const cue = cues.get(cueId);
      if (!cue) throw new Error(`Unknown narration cue "${cueId}"`);

      activeOwner?.stopFromPeer();
      activeOwner = owner;
      generation += 1;
      const request = generation;
      currentCueId = cue.id;
      lastCueId = cue.id;

      if (cue.audioUrl) {
        try {
          const audio = createAudio(cue.audioUrl);
          if (audio) {
            activeAudio = audio;
            await audio.play();
            if (
              request !== generation
              || activeOwner !== owner
              || currentCueId !== cue.id
            ) {
              audio.pause();
              return "silent";
            }
            return "audio";
          }
        } catch {
          if (
            request !== generation
            || activeOwner !== owner
            || currentCueId !== cue.id
          ) {
            return "silent";
          }
          activeAudio = undefined;
        }
      }

      if (manifest.fallback === "browserTts" && speechSynthesis) {
        try {
          const utterance = createUtterance(cue.text);
          if (utterance) {
            speechSynthesis.speak(utterance);
            return "speech";
          }
        } catch {
          return "silent";
        }
      }

      return "silent";
    },

    replay() {
      if (disposed) {
        return Promise.reject(
          new Error("Narration controller has been disposed"),
        );
      }
      if (!lastCueId) {
        return Promise.reject(new Error("No narration cue has been played"));
      }
      return controller.play(lastCueId);
    },

    stop() {
      stopOwnedPlayback();
    },

    dispose() {
      if (disposed) return;
      stopOwnedPlayback();
      lastCueId = undefined;
      disposed = true;
    },
  };

  return controller;
}
