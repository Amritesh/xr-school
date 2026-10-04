import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  IRRIGATION_METHODS_GUIDANCE,
  IRRIGATION_METHODS_SIMULATION,
} from '../../packages/simulation-content/src/implemented/guided/irrigation-methods';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Irrigation Methods simulation', () => {
  it('publishes a five-minute Class 8 investigation with eight evidence stages', () => {
    expect(IRRIGATION_METHODS_GUIDANCE.stages.map(stage => stage.id)).toEqual([
      'dry-field',
      'root-zone',
      'water-sources',
      'traditional',
      'sprinkler',
      'drip',
      'compare',
      'field-challenge',
    ]);
    expect(IRRIGATION_METHODS_SIMULATION.module).toMatchObject({
      id: 'sim-c08-ch01-a03-irrigation-methods',
      slug: 'c8-ch01-a03-irrigation-methods',
      publicationStatus: 'released',
      evidenceMaturity: 'internalQA',
      expectedDurationMinutes: 5,
      stages: 8,
    });
    expect(IRRIGATION_METHODS_SIMULATION.assessment.prompts).toHaveLength(2);
    expect(IRRIGATION_METHODS_SIMULATION.narration.cues).toHaveLength(8);
  });

  it('provides orbit, Quest and narration controls for the immersive farm lesson', () => {
    const viewer = source('apps/web/components/simulations/IrrigationMethodsViewer.tsx');
    expect(viewer).toContain('OrbitControls');
    expect(viewer).toContain('createQuestVrControls');
    expect(viewer).toContain('movementBounds');
    expect(viewer).toContain('B or right grip exits VR');
    expect(viewer).toContain('playNarration');
    expect(viewer).toContain('traditionalMethods');
    expect(viewer).toContain('sprinklerStep');
    expect(viewer).toContain('dripStep');
    expect(viewer).toContain('fieldMatches');
  });

  it('models traditional, sprinkler and drip systems plus the final three-field match', () => {
    const world = source('apps/web/lib/world-builder/irrigationMethodsWorld.ts');
    const environment = resolve(
      process.cwd(),
      'apps/web/public/simulations/c8-ch01-a03-irrigation-methods/environment.webp',
    );
    expect(statSync(environment).size).toBeGreaterThan(100_000);
    expect(statSync(environment).size).toBeLessThanOrEqual(400_000);
    expect(world).toContain("['moat', 'dhekli', 'chain-pump', 'rahat']");
    expect(world).toContain("'sprinkler-pump'");
    expect(world).toContain("'drip-main-valve'");
    expect(world).toContain("['traditional', 'sprinkler', 'drip']");
    expect(world).toContain("['uneven-field', 'orchard', 'small-farm']");
    expect(world).toContain('snapshot.fieldMatches.includes(challengeIds[index])');
    expect(world).toContain('method-match-${fieldId}');
  });

  it('exposes the canonical route and guided-scene adapter', () => {
    const route = source('apps/web/app/simulations/c8-ch01-a03-irrigation-methods/page.tsx');
    const scene = source('apps/web/lib/simulations/guided/c8-ch01-a03-irrigation-methods.scene.ts');
    expect(route).toContain('slug="c8-ch01-a03-irrigation-methods"');
    expect(scene).toContain('IRRIGATION_METHODS_GUIDANCE');
    expect(scene).toContain('IRRIGATION_METHODS_SCENE_METADATA');
    expect(scene).toContain('createGuidedSceneAdapter');
  });
});
