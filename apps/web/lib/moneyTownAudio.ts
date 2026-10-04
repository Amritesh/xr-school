import type { MoneyNarrationCue } from './moneyTownNarration';

export type MoneyAudioStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'muted'
  | 'unavailable';

/** Money-only recorded Web Audio queue: feedback never interrupts a clip.
 * Explicit navigation, replay, mute and restart cancel the old sequence.
 * No browser-TTS fallback: a failed clip is surfaced with a replay action.
 */
export function createMoneyTownAudio(
  onStatus: (status: MoneyAudioStatus, caption?: string) => void,
  dependencies: {
    createContext?: () => AudioContext;
    fetchAudio?: (url: string) => Promise<ArrayBuffer>;
  } = {},
) {
  let context: AudioContext | undefined;
  let source: AudioBufferSourceNode | undefined;
  let releasePlayback: (() => void) | undefined;
  let generation = 0;
  let muted = false;
  let disposed = false;
  let running = false;
  const queue: MoneyNarrationCue[] = [];
  const buffers = new Map<string, Promise<AudioBuffer>>();
  const abort = new AbortController();

  async function unlock() {
    if (disposed) return;
    try {
      context ??= dependencies.createContext?.() ?? new AudioContext();
      if (context.state === 'suspended') await context.resume();
    } catch {
      onStatus('unavailable');
    }
  }

  function stop() {
    generation += 1;
    queue.length = 0;
    running = false;
    if (source) {
      source.onended = null;
      source.stop();
      source.disconnect();
      source = undefined;
    }
    releasePlayback?.();
    releasePlayback = undefined;
    if (!disposed) onStatus(muted ? 'muted' : 'idle');
  }

  async function drain() {
    if (running || muted || disposed) return;
    running = true;
    const token = generation;
    while (queue.length && token === generation && !muted && !disposed) {
      const cue = queue.shift()!;
      onStatus('loading', cue.text);
      try {
        await unlock();
        if (!context) throw new Error('Audio unavailable');
        if (!buffers.has(cue.audioUrl)) {
          const data = dependencies.fetchAudio
            ? dependencies.fetchAudio(cue.audioUrl)
            : fetch(cue.audioUrl, { signal: abort.signal }).then((response) => {
                if (!response.ok) throw new Error('Narration download failed');
                return response.arrayBuffer();
              });
          buffers.set(
            cue.audioUrl,
            data.then((bytes) => context!.decodeAudioData(bytes)),
          );
        }
        const buffer = await buffers.get(cue.audioUrl)!;
        if (token !== generation || disposed || muted) break;
        const next = context.createBufferSource();
        source = next;
        next.buffer = buffer;
        next.connect(context.destination);
        onStatus('playing', cue.text);
        await new Promise<void>((resolve) => {
          releasePlayback = resolve;
          next.onended = () => {
            next.disconnect();
            if (source === next) source = undefined;
            resolve();
          };
          next.start();
        });
      } catch {
        buffers.delete(cue.audioUrl);
        if (token === generation && !disposed) {
          queue.length = 0;
          running = false;
          onStatus('unavailable', cue.text);
          return;
        }
      }
    }
    if (token === generation && !disposed) {
      running = false;
      releasePlayback = undefined;
      onStatus(muted ? 'muted' : 'idle');
    }
  }

  return {
    unlock,
    enqueue(cues: MoneyNarrationCue[], replace = false) {
      if (disposed || muted) return;
      if (replace) stop();
      queue.push(...cues);
      void drain();
    },
    stop,
    setMuted(value: boolean) {
      muted = value;
      stop();
    },
    dispose() {
      disposed = true;
      stop();
      abort.abort();
      void context?.close();
      buffers.clear();
    },
  };
}
