let simulationAudioContext: AudioContext | null = null;
let currentNarrationAudio: HTMLAudioElement | null = null;

function getSpeechSynthesis() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

async function ensureSimulationAudio() {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  simulationAudioContext ??= new AudioContextCtor();
  if (simulationAudioContext.state === 'suspended') {
    await simulationAudioContext.resume();
  }
  return simulationAudioContext;
}

async function playHeadsetCue(cueIndex: number) {
  const ctx = await ensureSimulationAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520 + (cueIndex % 8) * 38, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.065, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + 0.24);
}

function speakText(text: string) {
  const speechSynthesis = getSpeechSynthesis();
  if (!speechSynthesis) return;

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.87;
  utterance.pitch = 1.02;
  utterance.volume = 1.0;

  const trySpeak = () => {
    const voices = speechSynthesis.getVoices();
    if (voices.length) {
      const voice =
        voices.find(v => v.name === 'Samantha') ||
        voices.find(v => v.name.includes('Google US English')) ||
        voices.find(v => v.name.includes('Karen')) ||
        voices.find(v => v.lang === 'en-US' && v.localService) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
    }
    speechSynthesis.speak(utterance);
  };

  if (speechSynthesis.getVoices().length > 0) trySpeak();
  else speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
}

async function playAudioFile(audioUrl: string) {
  if (typeof window === 'undefined') return false;
  currentNarrationAudio?.pause();
  currentNarrationAudio = new Audio(audioUrl);
  currentNarrationAudio.preload = 'auto';
  currentNarrationAudio.setAttribute('playsinline', 'true');
  currentNarrationAudio.volume = 1;

  try {
    await currentNarrationAudio.play();
    return true;
  } catch {
    currentNarrationAudio = null;
    return false;
  }
}

export async function playSimulationNarration(text: string, cueIndex = 0, audioUrl?: string) {
  await playHeadsetCue(cueIndex);
  if (audioUrl && await playAudioFile(audioUrl)) return;
  speakText(text);
}

export function stopSimulationNarration() {
  currentNarrationAudio?.pause();
  currentNarrationAudio = null;
  getSpeechSynthesis()?.cancel();
}
