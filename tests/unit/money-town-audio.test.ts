import { describe, expect, it, vi } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createMoneyTownAudio } from '../../apps/web/lib/moneyTownAudio';
import { MONEY_NARRATION_EXTRAS } from '../../apps/web/lib/moneyTownNarrationExtras';

function audioHarness() {
  const sources: Array<{
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  }> = [];
  const context = {
    state: 'running',
    destination: {},
    resume: vi.fn(),
    close: vi.fn(),
    decodeAudioData: vi.fn(async () => ({})),
    createBufferSource: () => {
      const source = {
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
      };
      sources.push(source);
      return source;
    },
  };
  const status = vi.fn();
  const audio = createMoneyTownAudio(status, {
    createContext: () => context as unknown as AudioContext,
    fetchAudio: async () => new ArrayBuffer(8),
  });
  return { audio, sources, status, context };
}
describe('Money Town recorded narration', () => {
  it('packages a matching recorded clip for every added interaction cue', () => {
    expect(MONEY_NARRATION_EXTRAS).toHaveLength(34);
    for (const cue of MONEY_NARRATION_EXTRAS) {
      const path = resolve('apps/web/public', '.' + cue.audioUrl);
      expect(existsSync(path), cue.id).toBe(true);
      expect(statSync(path).size, cue.id).toBeGreaterThan(1024);
    }
  });
  it('finishes current audio before starting queued feedback', async () => {
    const h = audioHarness();
    h.audio.enqueue(MONEY_NARRATION_EXTRAS.slice(0, 1));
    await vi.waitFor(() => expect(h.sources).toHaveLength(1));
    h.audio.enqueue(MONEY_NARRATION_EXTRAS.slice(1, 2));
    expect(h.sources[0].stop).not.toHaveBeenCalled();
    expect(h.sources).toHaveLength(1);
    h.sources[0].onended?.();
    await vi.waitFor(() => expect(h.sources).toHaveLength(2));
    h.sources[1].onended?.();
    await vi.waitFor(() => expect(h.status).toHaveBeenLastCalledWith('idle'));
    h.audio.dispose();
  });
  it('cancels stale clips on navigation, mute, and cleanup', async () => {
    const h = audioHarness();
    h.audio.enqueue(MONEY_NARRATION_EXTRAS.slice(0, 3));
    await vi.waitFor(() => expect(h.sources).toHaveLength(1));
    h.audio.enqueue(MONEY_NARRATION_EXTRAS.slice(3, 4), true);
    await vi.waitFor(() => expect(h.sources).toHaveLength(2));
    expect(h.sources[0].stop).toHaveBeenCalledOnce();
    h.audio.setMuted(true);
    expect(h.sources[1].stop).toHaveBeenCalledOnce();
    h.audio.enqueue(MONEY_NARRATION_EXTRAS.slice(4, 5));
    expect(h.sources).toHaveLength(2);
    h.audio.dispose();
    expect(h.context.close).toHaveBeenCalledOnce();
  });
  it('reports a missing recording instead of silently using another voice', async () => {
    const status = vi.fn();
    const audio = createMoneyTownAudio(status, {
      createContext: () => ({ state: 'running' }) as AudioContext,
      fetchAudio: async () => {
        throw new Error('offline');
      },
    });
    audio.enqueue(MONEY_NARRATION_EXTRAS.slice(0, 1));
    await vi.waitFor(() =>
      expect(status).toHaveBeenLastCalledWith(
        'unavailable',
        MONEY_NARRATION_EXTRAS[0].text,
      ),
    );
  });
});
