interface ActiveCue {
  oscillator: OscillatorNode;
  gain: GainNode;
}

/**
 * One application-wide owner for narration, speech synthesis, and headset cues.
 * Every play request atomically interrupts the previous request. A generation
 * token prevents late async play failures from clearing or restarting newer audio.
 */
export class SimulationSoundManager {
  private static readonly shared = new SimulationSoundManager();
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentCue: ActiveCue | null = null;
  private generation = 0;
  private voicesChangedListener: (() => void) | null = null;

  private constructor() {}

  static instance() { return SimulationSoundManager.shared; }

  private speechSynthesis() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    return window.speechSynthesis;
  }

  private async ensureAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextCtor = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    this.audioContext ??= new AudioContextCtor();
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();
    return this.audioContext;
  }

  private stopCue() {
    if (!this.currentCue) return;
    try { this.currentCue.gain.gain.cancelScheduledValues(0); } catch {}
    try { this.currentCue.oscillator.stop(); } catch {}
    try { this.currentCue.oscillator.disconnect(); } catch {}
    try { this.currentCue.gain.disconnect(); } catch {}
    this.currentCue = null;
  }

  private interrupt() {
    this.generation += 1;
    this.stopCue();
    if (this.currentAudio) {
      this.currentAudio.pause();
      if (Number.isFinite(this.currentAudio.currentTime)) this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    const speech = this.speechSynthesis();
    speech?.cancel();
    if (speech && this.voicesChangedListener) {
      speech.removeEventListener('voiceschanged', this.voicesChangedListener);
    }
    this.voicesChangedListener = null;
    return this.generation;
  }

  private async playHeadsetCue(cueIndex: number, request: number) {
    const context = await this.ensureAudioContext();
    if (!context || request !== this.generation) return;
    this.stopCue();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(520 + (cueIndex % 8) * 38, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.16);
    this.currentCue = { oscillator, gain };
    oscillator.onended = () => {
      if (this.currentCue?.oscillator === oscillator) this.currentCue = null;
      try { oscillator.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    };
  }

  private async playAudioFile(audioUrl: string, request: number) {
    if (typeof window === 'undefined' || request !== this.generation) return false;
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    audio.volume = 1;
    this.currentAudio = audio;
    try {
      await audio.play();
      if (request !== this.generation) {
        audio.pause();
        return false;
      }
      return true;
    } catch {
      if (this.currentAudio === audio) this.currentAudio = null;
      return false;
    }
  }

  private speakText(text: string, request: number) {
    const speech = this.speechSynthesis();
    if (!speech || request !== this.generation) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.87;
    utterance.pitch = 1.02;
    utterance.volume = 1;

    const speak = () => {
      if (request !== this.generation) return;
      const voices = speech.getVoices();
      const voice = voices.find(value => value.name === 'Samantha')
        || voices.find(value => value.name.includes('Google US English'))
        || voices.find(value => value.name.includes('Karen'))
        || voices.find(value => value.lang === 'en-US' && value.localService)
        || voices.find(value => value.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
      speech.speak(utterance);
    };

    if (speech.getVoices().length > 0) speak();
    else {
      this.voicesChangedListener = speak;
      speech.addEventListener('voiceschanged', speak, { once: true });
    }
  }

  async playNarration(text: string, cueIndex = 0, audioUrl?: string) {
    const request = this.interrupt();
    void this.playHeadsetCue(cueIndex, request);
    if (audioUrl) {
      const played = await this.playAudioFile(audioUrl, request);
      if (request !== this.generation) return;
      if (played) return;
    }
    this.speakText(text, request);
  }

  stop() { this.interrupt(); }
}

export function getSimulationSoundManager() {
  return SimulationSoundManager.instance();
}

export async function playSimulationNarration(text: string, cueIndex = 0, audioUrl?: string) {
  await getSimulationSoundManager().playNarration(text, cueIndex, audioUrl);
}

export function stopSimulationNarration() {
  getSimulationSoundManager().stop();
}
