import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const GROUP = resolve(process.cwd(), 'apps/web/public/models/rainwater');
const ALLOWED_LICENCES = ['CC0-1.0', 'CC-BY-4.0', 'XR-School-original'];
const MAX_GROUP_TRIANGLES = 180_000;

interface SourceEntry {
  file: string;
  source: string;
  author: string;
  license: string;
  modifications: string;
  bytes: number;
  sha256: string;
  triangles: number;
}

const entries = JSON.parse(
  readFileSync(resolve(GROUP, 'SOURCES.json'), 'utf8'),
) as SourceEntry[];

describe('rainwater model licence register', () => {
  it('has one record per model file', () => {
    const onDisk = readdirSync(GROUP).filter(file => file.endsWith('.glb')).sort();
    expect(entries.map(entry => entry.file).sort()).toEqual(onDisk);
  });

  it.each(entries.map(entry => [entry.file, entry] as const))(
    '%s has full provenance, an allowed licence and a matching hash',
    (_file, entry) => {
      for (const field of ['source', 'author', 'modifications'] as const) {
        expect(entry[field].trim(), field).not.toBe('');
      }
      expect(ALLOWED_LICENCES).toContain(entry.license);
      const path = resolve(GROUP, entry.file);
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBe(entry.bytes);
      expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(entry.sha256);
      expect(entry.triangles).toBeGreaterThan(0);
    },
  );

  it('keeps the group within its triangle allowance', () => {
    const total = entries.reduce((sum, entry) => sum + entry.triangles, 0);
    expect(total).toBeLessThanOrEqual(MAX_GROUP_TRIANGLES);
  });
});
