import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const VIEWERS = [
  'PollinationViewer.tsx',
  'CircuitViewer.tsx',
  'StatesOfMatterViewer.tsx',
  'FoodSourcesSortingViewer.tsx',
  'SolubilityLabViewer.tsx',
  'DigestiveSystemViewer.tsx',
];

describe('implemented simulation audio contract', () => {
  it('keeps the legacy app API as a forwarder to the shared narration owner', () => {
    const appSource = readFileSync(resolve(
      process.cwd(),
      'apps/web/lib/simulationAudio.ts',
    ), 'utf8');
    const librarySource = readFileSync(resolve(
      process.cwd(),
      'packages/simulation-web/src/audio/legacySimulationAudio.ts',
    ), 'utf8');

    expect(appSource).toContain("from '@xr-school/simulation-web'");
    expect(appSource).not.toContain('new Audio');
    expect(librarySource).toContain('createNarrationController');
    expect(librarySource).toContain('export async function playSimulationNarration');
  });

  it('requires every implemented viewer to start narration through the shared utility', () => {
    for (const viewer of VIEWERS) {
      const source = readFileSync(resolve(process.cwd(), `apps/web/components/simulations/${viewer}`), 'utf8');

      expect(source, `${viewer} must import shared audio`).toContain('@/lib/simulationAudio');
      expect(source, `${viewer} must play narration`).toContain('playSimulationNarration');
      expect(source, `${viewer} must stop narration on cleanup`).toContain('stopSimulationNarration');
    }
  });
});
