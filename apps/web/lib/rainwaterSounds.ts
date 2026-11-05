import { savedLitres, type AssemblyStageId, type RainwaterState } from './rainwaterLesson';

export type RainwaterSound = 'pick' | 'snap' | 'wrong' | 'earn' | 'stage' | 'valve' | 'pour';

const ASSEMBLIES: AssemblyStageId[] = ['rooftop', 'filter', 'school', 'recharge'];

/** Which short cues a lesson state change should play. */
export function soundsFor(before: RainwaterState, after: RainwaterState): RainwaterSound[] {
  if (before === after) return [];
  if (savedLitres(after) > savedLitres(before)) return ['earn'];
  if (after.stage !== before.stage) return ['stage'];
  if (after.feedback && after.feedback !== before.feedback) return ['wrong'];
  if (after.firstFlushOpen && !before.firstFlushOpen) return ['valve'];
  if (after.allocated !== before.allocated) return ['pour'];
  for (const stage of ASSEMBLIES) {
    const was = before.assemblies[stage];
    const is = after.assemblies[stage];
    if (is === was) continue;
    if (is.lastResult === 'rejected') return ['wrong'];
    if (is.lastResult === 'placed') return ['snap'];
    if (is.picked && is.picked !== was.picked) return ['pick'];
  }
  return [];
}

const TONES: Record<RainwaterSound, { from: number; to: number; seconds: number; type: OscillatorType; volume: number }[]> = {
  pick: [{ from: 520, to: 660, seconds: 0.09, type: 'triangle', volume: 0.06 }],
  snap: [{ from: 240, to: 120, seconds: 0.08, type: 'square', volume: 0.05 }],
  wrong: [{ from: 240, to: 180, seconds: 0.22, type: 'sine', volume: 0.07 }],
  valve: [{ from: 300, to: 520, seconds: 0.25, type: 'triangle', volume: 0.06 }],
  pour: [{ from: 700, to: 340, seconds: 0.3, type: 'sine', volume: 0.06 }],
  stage: [{ from: 440, to: 620, seconds: 0.2, type: 'sine', volume: 0.05 }],
  earn: [
    { from: 523, to: 523, seconds: 0.12, type: 'triangle', volume: 0.07 },
    { from: 659, to: 659, seconds: 0.12, type: 'triangle', volume: 0.07 },
    { from: 784, to: 784, seconds: 0.28, type: 'triangle', volume: 0.08 },
  ],
};

/** Generated sounds, so the lesson stays offline and adds no audio files. */
export function createRainwaterAudio() {
  let context: AudioContext | null = null;
  let rainGain: GainNode | null = null;

  function ensureContext() {
    if (typeof window === 'undefined' || !window.AudioContext) return null;
    context ??= new window.AudioContext();
    void context.resume();
    return context;
  }

  function play(sound: RainwaterSound) {
    const audio = ensureContext();
    if (!audio) return;
    let start = audio.currentTime;
    for (const tone of TONES[sound]) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.from, start);
      oscillator.frequency.linearRampToValueAtTime(tone.to, start + tone.seconds);
      gain.gain.setValueAtTime(tone.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.seconds);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.seconds);
      start += tone.seconds * 0.9;
    }
  }

  /** Looped filtered noise for the storm; 0 is silent. */
  function setRain(level: number) {
    const audio = ensureContext();
    if (!audio) return;
    if (!rainGain) {
      const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = audio.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      rainGain = audio.createGain();
      rainGain.gain.value = 0;
      source.connect(filter).connect(rainGain).connect(audio.destination);
      source.start();
    }
    rainGain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.12, audio.currentTime, 0.3);
  }

  return {
    play,
    setRain,
    dispose() {
      void context?.close();
      context = null;
      rainGain = null;
    },
  };
}
