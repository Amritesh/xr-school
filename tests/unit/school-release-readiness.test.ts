import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IMPLEMENTED_SIMULATIONS } from '@xr-school/simulation-content';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const bespokeGuidedViewers = [
  'FoodSpoilageViewer',
  'MilkSpoilageViewer',
  'AamPapadViewer',
  'PitcherPlantViewer',
  'SeedDispersalViewer',
  'RainwaterStorageViewer',
  'StepwellStructureViewer',
  'DeadSeaSaltWaterViewer',
  'MalariaDiagnosisViewer',
  'MosquitoLifeCycleViewer',
  'RiverCrossingAdventureViewer',
  'RockClimbingViewer',
  'CampInSnowViewer',
  'SnowMountainClimbingViewer',
  'AncientFortVisitViewer',
  'CottonFarmingViewer',
  'CottonGinningViewer',
  'WoolProcessingViewer',
  'YarnMakerViewer',
  'VirusInvasionViewer',
  'IrrigationMethodsViewer',
  'HarvestingStorageViewer',
];

const coreViewers = [
  'PollinationViewer',
  'CircuitViewer',
  'StatesOfMatterViewer',
  'FoodSourcesSortingViewer',
  'DigestiveSystemViewer',
  'BreathingProcessViewer',
  'ForceMotionViewer',
  'FungiDevelopmentViewer',
  'AcidBaseViewer',
  'ColourAdventureViewer',
  'MoneyTownViewer',
  'PrepositionAdventureViewer',
  'SolarSystemMissionViewer',
];

describe('school release readiness contract', () => {
  it('keeps every released simulation backed by packaged narration', () => {
    const released = IMPLEMENTED_SIMULATIONS.filter(
      record => record.module.publicationStatus === 'released',
    );
    expect(released).toHaveLength(41);
    for (const record of released) {
      expect(record.narration.cues.length, record.module.slug).toBeGreaterThan(0);
      for (const cue of record.narration.cues) {
        expect(cue.audioUrl, `${record.module.slug}:${cue.id}`).toMatch(/^\/.+\.mp3(?:\?.*)?$/);
      }
    }
  });

  it('gives every bespoke guided viewer OrbitControls and shared Quest controls', () => {
    for (const viewer of bespokeGuidedViewers) {
      const text = source(`apps/web/components/simulations/${viewer}.tsx`);
      expect(text, viewer).toContain('OrbitControls');
      expect(text, viewer).toContain('createQuestVrControls');
    }
  });

  it('gives every core viewer browser camera control and shared Quest navigation', () => {
    for (const viewer of coreViewers) {
      const text = source(`apps/web/components/simulations/${viewer}.tsx`);
      expect(
        text.includes('createGuidedCamera')
          || text.includes('createFungiViewerController'),
        `${viewer}: browser camera controls`,
      ).toBe(true);
      expect(
        text.includes('createQuestVrControls')
          || text.includes('createVrLocomotion'),
        `${viewer}: Quest controls`,
      ).toBe(true);
    }
  });

  it('projects shared lesson guidance and assessment controls into WebXR', () => {
    const guided = source(
      'apps/web/components/simulations/shared/GuidedSimulationViewer.tsx',
    );
    const interactive = source(
      'apps/web/components/simulations/shared/InteractiveInvestigationViewer.tsx',
    );
    const managedHud = source(
      'apps/web/components/simulations/shared/createManagedVrHud.ts',
    );
    for (const text of [guided, interactive]) {
      expect(text).toContain("locomotion: 'boundedTeleport'");
      expect(text).toContain('createManagedVrHud');
      expect(text).toContain("'choice-a'");
      expect(text).toContain('exitVr');
    }
    expect(managedHud).toContain("inputSources: ['xr-controller']");
    expect(managedHud).toContain('emitAction: false');
  });

  it('fits in-scene guidance to screen-safe panels and documents B as exit', () => {
    const hud = source('apps/web/lib/vr/vrHudPanel.ts');
    expect(hud).toContain('drawFittedText');
    expect(hud).toContain('B: exit VR');
    expect(hud).toContain('FOLLOW_DISTANCE');
  });
});
