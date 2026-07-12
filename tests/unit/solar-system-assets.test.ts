import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOLAR_TEXTURES } from '../../apps/web/lib/world-builder/solarSystemAssets';

describe('solar system production assets', () => {
  it('provides a local credited texture for the Sun and every planet', () => {
    expect(Object.keys(SOLAR_TEXTURES).sort()).toEqual([
      'earth', 'jupiter', 'mars', 'mercury', 'neptune', 'saturn', 'sun', 'uranus', 'venus',
    ]);
    for (const asset of Object.values(SOLAR_TEXTURES)) {
      expect(asset.path).toMatch(/^\/solar-system\/textures\/.+\.webp$/);
      expect(asset.credit.length).toBeGreaterThan(4);
      expect(asset.sourceUrl).toMatch(/^https:\/\//);
      const diskPath = `apps/web/public${asset.path}`;
      expect(existsSync(diskPath), diskPath).toBe(true);
      expect(statSync(diskPath).size, `${diskPath} exceeds the Quest asset budget`).toBeLessThan(600_000);
    }
  });

  it('ships a readable attribution and representation disclosure', () => {
    const attribution = readFileSync('apps/web/public/solar-system/ATTRIBUTION.md', 'utf8');
    expect(attribution).toContain('NASA/JPL');
    expect(attribution).toContain('Solar System Scope');
    expect(attribution).toContain('educational representation');
    for (const asset of Object.values(SOLAR_TEXTURES)) {
      expect(attribution).toContain(asset.sourceUrl);
    }
  });
});
