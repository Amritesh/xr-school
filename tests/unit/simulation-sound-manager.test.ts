import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSimulationSoundManager,
  playSimulationNarration,
  stopSimulationNarration,
} from '../../apps/web/lib/simulationAudio';

class FakeAudio {
  static instances: FakeAudio[] = [];
  static playResults: Promise<void>[] = [];
  paused = true;
  volume = 1;
  preload = '';
  readonly src: string;

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  setAttribute() {}
  play() { this.paused = false; return FakeAudio.playResults.shift() ?? Promise.resolve(); }
  pause() { this.paused = true; }
}

function fakeAudioContext() {
  return class {
    state = 'running';
    currentTime = 0;
    destination = {};
    resume() { return Promise.resolve(); }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime() {} },
        connect() { return this; },
        start() {}, stop: vi.fn(), disconnect() {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
        connect() { return this; }, disconnect() {},
      };
    }
  };
}

describe('singleton simulation sound manager', () => {
  const originalWindow = globalThis.window;
  const originalAudio = globalThis.Audio;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;

  beforeEach(() => {
    FakeAudio.instances = [];
    FakeAudio.playResults = [];
    Object.assign(globalThis, {
      Audio: FakeAudio,
      SpeechSynthesisUtterance: class { rate = 1; pitch = 1; volume = 1; voice = null; constructor(public text: string) {} },
      window: {
        AudioContext: fakeAudioContext(),
        speechSynthesis: {
          cancel: vi.fn(), speak: vi.fn(),
          getVoices: () => [{ name: 'Samantha', lang: 'en-US', localService: true }],
        },
      },
    });
    stopSimulationNarration();
  });

  afterEach(() => {
    stopSimulationNarration();
    Object.assign(globalThis, { window: originalWindow, Audio: originalAudio, SpeechSynthesisUtterance: originalUtterance });
  });

  it('returns one shared manager instance', () => {
    expect(getSimulationSoundManager()).toBe(getSimulationSoundManager());
  });

  it('interrupts the previous file before starting a rapid replacement', async () => {
    await playSimulationNarration('first', 0, '/first.mp3');
    await playSimulationNarration('second', 1, '/second.mp3');

    expect(FakeAudio.instances).toHaveLength(2);
    expect(FakeAudio.instances[0].paused).toBe(true);
    expect(FakeAudio.instances[1].paused).toBe(false);
  });

  it('stops the active file through the shared stop API', async () => {
    await playSimulationNarration('active', 0, '/active.mp3');
    stopSimulationNarration();
    expect(FakeAudio.instances[0].paused).toBe(true);
  });

  it('does not let a stale failed request lose ownership of the current sound', async () => {
    let rejectFirst!: (reason?: unknown) => void;
    FakeAudio.playResults.push(
      new Promise<void>((_resolve, reject) => { rejectFirst = reject; }),
      Promise.resolve(),
      Promise.resolve(),
    );

    const first = playSimulationNarration('first', 0, '/first.mp3');
    await vi.waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    await playSimulationNarration('second', 1, '/second.mp3');
    rejectFirst(new Error('late failure'));
    await first;
    await playSimulationNarration('third', 2, '/third.mp3');

    expect(FakeAudio.instances[1].paused).toBe(true);
    expect(FakeAudio.instances[2].paused).toBe(false);
  });
});
