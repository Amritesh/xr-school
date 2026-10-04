import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { MONEY_PHOTOS } from '../../apps/web/lib/moneyTownPhotos';
import { MONEY_TOWN_MONEY } from '../../apps/web/lib/moneyTownLesson';

describe('Money Town RBI reference photos', () => {
  it('ships both original-design sides of every taught denomination locally', async () => {
    expect(Object.keys(MONEY_PHOTOS)).toHaveLength(10);
    for (const money of MONEY_TOWN_MONEY) {
      const photo = MONEY_PHOTOS[money.id];
      expect(photo.front).not.toBe(photo.back);
      expect(new URL(photo.source).hostname).toMatch(/(^|\.)rbi\.org\.in$/);
      for (const side of ['front', 'back'] as const) {
        const file = resolve('apps/web/public' + photo[side]);
        expect(statSync(file).size).toBeGreaterThan(1000);
        const metadata = await sharp(file).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBeGreaterThan(100);
        if (side === 'front') {
          expect(metadata.width).toBe(photo.width);
          expect(metadata.height).toBe(photo.height);
        }
      }
    }
  });
  it('keeps the full set below two MB for classroom connections', () => {
    const bytes = Object.values(MONEY_PHOTOS).reduce(
      (sum, photo) =>
        sum +
        statSync(resolve('apps/web/public' + photo.front)).size +
        statSync(resolve('apps/web/public' + photo.back)).size,
      0,
    );
    expect(bytes).toBeLessThan(2_000_000);
  });
  it('uses the same local photos in the scene, question specimen, and choice buttons', () => {
    const viewer = readFileSync(
      resolve('apps/web/components/simulations/MoneyTownViewer.tsx'),
      'utf8',
    );
    const scene = readFileSync(
      resolve('apps/web/lib/moneyTownScene.ts'),
      'utf8',
    );
    expect(viewer).toContain('MONEY_PHOTOS[specimen.id].front');
    expect(viewer).toContain('MONEY_PHOTOS[option.moneyId].front');
    expect(scene).toContain('photos.front : photos.back');
    expect(scene).toContain('moneyPhotoDisposed');
    expect(scene).toContain('THREE.SRGBColorSpace');
  });
});
