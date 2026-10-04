import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  HARVESTING_THRESHING_STORAGE_GUIDANCE,
  HARVESTING_THRESHING_STORAGE_SIMULATION,
} from '../../packages/simulation-content/src/implemented/guided/harvesting-threshing-storage';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Harvesting, Threshing and Storage simulation', () => {
  it('publishes a five-minute Class 8 journey with eight evidence stages', () => {
    expect(HARVESTING_THRESHING_STORAGE_GUIDANCE.stages.map(stage => stage.id)).toEqual([
      'crop-ready',
      'harvesting',
      'threshing',
      'winnowing',
      'drying',
      'storage',
      'summary',
      'challenge',
    ]);
    expect(HARVESTING_THRESHING_STORAGE_SIMULATION.module).toMatchObject({
      id: 'sim-c08-ch01-a05-harvesting-threshing-and-storage-of-crops',
      slug: 'c8-ch01-a05-harvesting-threshing-and-storage-of-crops',
      publicationStatus: 'released',
      evidenceMaturity: 'internalQA',
      expectedDurationMinutes: 5,
      stages: 8,
    });
    expect(HARVESTING_THRESHING_STORAGE_SIMULATION.assessment.prompts).toHaveLength(2);
    expect(HARVESTING_THRESHING_STORAGE_SIMULATION.narration.cues).toHaveLength(8);
  });

  it('provides orbit, Quest, exit and packaged narration controls', () => {
    const viewer = source('apps/web/components/simulations/HarvestingStorageViewer.tsx');
    expect(viewer).toContain('OrbitControls');
    expect(viewer).toContain('controls.enablePan = true');
    expect(viewer).toContain('createQuestVrControls');
    expect(viewer).toContain('movementBounds');
    expect(viewer).toContain('B or right grip exits VR');
    expect(viewer).toContain('playNarration');
    expect(viewer).toContain('maturityChecks');
    expect(viewer).toContain('challengeMatches');
  });

  it('models the complete field-to-storage journey and four-task challenge', () => {
    const world = source('apps/web/lib/world-builder/harvestingStorageWorld.ts');
    const environment = resolve(
      process.cwd(),
      'apps/web/public/simulations/c8-ch01-a05-harvesting-threshing-and-storage-of-crops/environment.webp',
    );
    expect(statSync(environment).size).toBeGreaterThan(100_000);
    expect(statSync(environment).size).toBeLessThanOrEqual(400_000);
    expect(world).toContain('combine-harvester');
    expect(world).toContain('powered-thresher-body');
    expect(world).toContain('winnowing-air-separation');
    expect(world).toContain('sealed-metal-grain-silo');
    expect(world).toContain('["select-mature-crop", "mature-crop"]');
    expect(world).toContain('["arrange-farming-processes", "process-order"]');
    expect(world).toContain('["select-grain-separator", "thresher"]');
    expect(world).toContain('["choose-safe-storage", "safe-storage"]');
  });

  it('exposes the canonical route and guided-scene adapter', () => {
    const route = source('apps/web/app/simulations/c8-ch01-a05-harvesting-threshing-and-storage-of-crops/page.tsx');
    const scene = source('apps/web/lib/simulations/guided/c8-ch01-a05-harvesting-threshing-and-storage-of-crops.scene.ts');
    expect(route).toContain('slug="c8-ch01-a05-harvesting-threshing-and-storage-of-crops"');
    expect(scene).toContain('HARVESTING_THRESHING_STORAGE_GUIDANCE');
    expect(scene).toContain('HARVESTING_THRESHING_STORAGE_SCENE_METADATA');
    expect(scene).toContain('createGuidedSceneAdapter');
  });
});
