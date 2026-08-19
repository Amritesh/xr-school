import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { GUIDED_IMPLEMENTED_SIMULATIONS } from '../../packages/simulation-content/src/implemented/guided';

function publicFile(url: string) {
  return resolve(process.cwd(), 'apps/web/public', url.replace(/^\//, ''));
}

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

function decodeLossyWebpDimensions(bytes: Buffer) {
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('VP8 ');
  const syncOffset = bytes.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
  expect(syncOffset).toBeGreaterThan(0);
  return {
    width: bytes.readUInt16LE(syncOffset + 3) & 0x3fff,
    height: bytes.readUInt16LE(syncOffset + 5) & 0x3fff,
  };
}

describe('guided asset manifests', () => {
  it('binds every class to one optimized, integrity-checked canonical panorama', () => {
    for (const record of GUIDED_IMPLEMENTED_SIMULATIONS) {
      const environments = record.assets.assets.filter(asset => asset.kind === 'environment');
      expect(environments).toHaveLength(1);
      const environment = environments[0];
      const bytes = readFileSync(publicFile(environment.url));
      expect(decodeLossyWebpDimensions(bytes)).toEqual({ width: 1774, height: 887 });
      expect(bytes.byteLength).toBeLessThanOrEqual(400_000);
      expect(environment).toMatchObject({
        url: `/simulations/${record.module.slug}/environment.webp`,
        width: 1774,
        height: 887,
        byteSize: bytes.byteLength,
        sha256: sha256(bytes),
        compression: 'WebP lossy q75; cwebp 1.6.0 method 6',
        author: 'unverified-contributor-supplied',
        license: 'unverified-contributor-supplied',
      });
      expect(environment.source).toContain('PR #8 621dfb61');
    }
  });

  it('publishes a committed narration file for every cue and never a missing URL', () => {
    for (const record of GUIDED_IMPLEMENTED_SIMULATIONS) {
      const expectsAudio = [
        'c5-ch09-a02-rock-climbing',
        'c5-ch10-a01-a-visit-of-ancient-fort',
      ].includes(record.module.slug);
      const cuesWithAudio = record.narration.cues.filter(cue => cue.audioUrl);
      const audioAssets = record.assets.assets.filter(asset => asset.kind === 'audio');
      expect(cuesWithAudio).toHaveLength(record.narration.cues.length);
      expect(audioAssets).toHaveLength(expectsAudio ? 8 : 0);

      for (const cue of cuesWithAudio) {
        const bytes = readFileSync(publicFile(cue.audioUrl!));
        const asset = audioAssets.find(candidate => candidate.url === cue.audioUrl);
        if (asset) {
          expect(asset).toMatchObject({
            byteSize: bytes.byteLength,
            sha256: sha256(bytes),
          });
        } else {
          expect(cue.audioUrl).toMatch(/^\/narration\/[a-z0-9]+\.mp3$/u);
          expect(bytes.byteLength).toBeGreaterThanOrEqual(1024);
        }
      }
      if (!expectsAudio) {
        expect(record.narration.cues.every(
          cue => cue.audioUrl?.startsWith('/narration/'),
        )).toBe(true);
      }
    }
  });
});
