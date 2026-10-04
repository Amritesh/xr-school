import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  SHEARING_SCOURING_WOOL_GUIDANCE,
  SHEARING_SCOURING_WOOL_SIMULATION,
} from '../../packages/simulation-content/src/implemented/guided/shearing-scouring';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Mission Wool simulation', () => {
  it('publishes the Class 7 shearing and scouring activity with ten evidence missions', () => {
    expect(SHEARING_SCOURING_WOOL_GUIDANCE.stages).toHaveLength(10);
    expect(SHEARING_SCOURING_WOOL_SIMULATION.module).toMatchObject({
      id: 'sim-c07-ch03-a01-shearing-and-scouring-of-wool',
      slug: 'c7-ch03-a01-shearing-and-scouring-of-wool',
      publicationStatus: 'released',
      evidenceMaturity: 'internalQA',
      stages: 10,
    });
    expect(SHEARING_SCOURING_WOOL_SIMULATION.assessment.prompts).toHaveLength(2);
    expect(SHEARING_SCOURING_WOOL_SIMULATION.narration.cues).toHaveLength(10);
  });

  it('provides realistic environment artwork and safe interactive processing stations', () => {
    const viewer = source('apps/web/components/simulations/WoolProcessingViewer.tsx');
    const world = source('apps/web/lib/world-builder/woolProcessingWorld.ts');
    const image = resolve(
      process.cwd(),
      'apps/web/public/simulations/c7-ch03-a01-shearing-and-scouring-of-wool/environment.webp',
    );
    expect(statSync(image).size).toBeGreaterThan(100_000);
    expect(statSync(image).size).toBeLessThanOrEqual(400_000);
    expect(viewer).toContain('OrbitControls');
    expect(viewer).toContain('createQuestVrControls');
    expect(viewer).toContain('movementBounds');
    expect(viewer).toContain('B or right grip exits VR');
    expect(viewer).toContain('Controlled warm water + cleaner');
    expect(viewer).toContain('Master of Wool Processing');
    expect(world).toContain('Woolly the sheep');
    expect(world).toContain('fleece-puff');
    expect(world).toContain('c7-ch03-a01-shearing-and-scouring-of-wool/environment.webp');
    expect(world).toContain('wool-primary-action');
  });

  it('keeps the lesson panel responsive and separate from the WebGL scene', () => {
    const css = source('apps/web/components/simulations/WoolProcessingViewer.module.css');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain('max-height: 47dvh');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('pointer-events: none');
  });
});
