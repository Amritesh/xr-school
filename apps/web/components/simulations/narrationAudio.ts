let narrationAudio: HTMLAudioElement | null = null;
let narrationContext: AudioContext | null = null;
let narrationSource: AudioBufferSourceNode | null = null;
let playSequence = 0;
const NARRATION_ASSET_VERSION = "20260725-neerja-storyteller";

export function narrationKey(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function narrationUrl(text: string) {
  const key = narrationKey(text);
  return `/narration/${key}.mp3?v=${NARRATION_ASSET_VERSION}`;
}

function audioElement() {
  if (typeof window === "undefined") return null;
  if (!narrationAudio) {
    narrationAudio = new Audio();
    narrationAudio.preload = "auto";
    narrationAudio.volume = 1;
    narrationAudio.muted = false;
    narrationAudio.setAttribute("playsinline", "true");
  }
  return narrationAudio;
}

function audioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  if (!narrationContext) narrationContext = new AudioContextConstructor();
  return narrationContext;
}

export function unlockNarration() {
  const context = audioContext();
  if (context?.state === "suspended") void context.resume();
}

function speechFallback(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const speech = window.speechSynthesis;
  speech.cancel();
  speech.resume();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88;
  const voices = speech.getVoices();
  utterance.voice = voices.find((voice) => voice.lang.startsWith("en-IN")) ?? voices.find((voice) => voice.lang.startsWith("en")) ?? null;
  speech.speak(utterance);
}

export function playNarration(text: string) {
  const sequence = ++playSequence;
  const context = audioContext();
  if (context) {
    narrationSource?.stop();
    narrationSource = null;
    void context.resume().then(async () => {
      const response = await fetch(narrationUrl(text));
      if (!response.ok) throw new Error(`Narration audio ${response.status}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      if (sequence !== playSequence) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
      narrationSource = source;
    }).catch(() => playHtmlNarration(text, sequence));
    return;
  }
  playHtmlNarration(text, sequence);
}

function playHtmlNarration(text: string, sequence: number) {
  if (sequence !== playSequence) return;
  const audio = audioElement();
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;
  audio.muted = false;
  audio.src = narrationUrl(text);
  audio.load();
  const fallback = () => speechFallback(text);
  audio.onerror = fallback;
  audio.play().catch(fallback);
}

export function stopNarration() {
  playSequence += 1;
  narrationSource?.stop();
  narrationSource = null;
  if (narrationAudio) {
    narrationAudio.pause();
    narrationAudio.currentTime = 0;
  }
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}
