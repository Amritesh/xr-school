import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RAINWATER_NARRATION_KEYS,
  createRainwaterState,
  narrationKeyFor,
  reduceRainwater,
} from '../../apps/web/lib/rainwaterLesson';
import { STORM } from '../../apps/web/lib/rainwaterStorm';

const source = readFileSync(
  resolve(process.cwd(), 'apps/web/components/simulations/RainwaterStorageViewer.tsx'),
  'utf8',
);
// The same extraction the narration generator uses.
const array = source.match(/const NARRATIONS\s*=\s*\[([\s\S]*?)\]\s*(?:as const\s*)?;/)![1]!;
const lines = [...array.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(match =>
  JSON.parse(`"${match[1]}"`) as string,
);
const WORDS_PER_SECOND = 2.3;
const seconds = (text: string) => text.split(/\s+/).length / WORDS_PER_SECOND;
const lineFor = (key: (typeof RAINWATER_NARRATION_KEYS)[number]) =>
  lines[RAINWATER_NARRATION_KEYS.indexOf(key)]!;

describe('rainwater narration', () => {
  it('has one line for every narration key, as plain strings the generator can read', () => {
    expect(lines).toHaveLength(RAINWATER_NARRATION_KEYS.length);
  });

  it('never claims a full save except in the full-save finale', () => {
    RAINWATER_NARRATION_KEYS.forEach((key, index) => {
      if (key === 'finale-full') return;
      expect(lines[index], key).not.toMatch(/ten thousand|10,000|every possible drop/i);
    });
    expect(lineFor('finale-full')).toMatch(/all ten thousand/i);
  });

  it('warns about drinking wherever filtered or stored water is used', () => {
    for (const key of ['filter', 'summer', 'summer-short'] as const) {
      expect(lineFor(key), key).toMatch(/drink/i);
    }
  });

  it('fits a full playthrough inside the 8 minute Class 5 limit', () => {
    const path = [
      'rainy-day', 'rainy-lost', 'drought', 'rooftop', 'filter', 'school', 'recharge',
      'storm', 'summer', 'finale-full',
    ] as const;
    const narrated = path.reduce((total, key) => total + seconds(lineFor(key)), 0);
    // Leaves time for the child to actually do the building work.
    expect(narrated + STORM.durationSeconds).toBeLessThan(5 * 60);
  });

  it('picks the line from what actually happened', () => {
    const start = createRainwaterState();
    expect(narrationKeyFor(start)).toBe('rainy-day');
    expect(narrationKeyFor(reduceRainwater(start, { type: 'observe' }))).toBe('rainy-lost');
    const finale = { ...start, stage: 'finale' as const };
    expect(narrationKeyFor(finale)).toBe('finale-partial');
    expect(narrationKeyFor({ ...start, stage: 'summer' as const })).toBe('summer-short');
  });
});
