import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  VIRUS_INVASION_GUIDANCE,
  VIRUS_INVASION_SIMULATION,
} from '../../packages/simulation-content/src/implemented/guided/virus-invasion';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('The Invisible Invader simulation', () => {
  it('publishes the Class 8 virus activity as a seven-stage five-minute mission', () => {
    expect(VIRUS_INVASION_GUIDANCE.stages).toHaveLength(7);
    expect(VIRUS_INVASION_SIMULATION.module).toMatchObject({
      id: 'sim-c08-ch02-a02-virus-introduction-spreading-and-its-effects',
      slug: 'c8-ch02-a02-virus-introduction-spreading-and-its-effects',
      publicationStatus: 'released',
      evidenceMaturity: 'internalQA',
      expectedDurationMinutes: 5,
      stages: 7,
    });
    expect(VIRUS_INVASION_SIMULATION.assessment.prompts).toHaveLength(2);
    expect(VIRUS_INVASION_SIMULATION.narration.cues).toHaveLength(7);
  });

  it('provides a realistic environment and interactive scientific models', () => {
    const viewer = source('apps/web/components/simulations/VirusInvasionViewer.tsx');
    const world = source('apps/web/lib/world-builder/virusInvasionWorld.ts');
    const environment = resolve(
      process.cwd(),
      'apps/web/public/simulations/c8-ch02-a02-virus-introduction-spreading-and-its-effects/environment.webp',
    );
    expect(statSync(environment).size).toBeGreaterThan(100_000);
    expect(statSync(environment).size).toBeLessThanOrEqual(400_000);
    expect(viewer).toContain('OrbitControls');
    expect(viewer).toContain('createQuestVrControls');
    expect(viewer).toContain('movementBounds');
    expect(viewer).toContain('B or right grip exits VR');
    expect(viewer).toContain('No characters · science models only');
    expect(viewer).toContain('Antibiotics act against certain bacteria, not viruses');
    expect(world).toContain('viral-genetic-material');
    expect(world).toContain('living-host-cell');
    expect(world).toContain('completed-virus-shield');
    expect(world).toContain('virus-primary-action');
  });

  it('keeps the learning panel responsive and separate from the 3D canvas', () => {
    const css = source('apps/web/components/simulations/VirusInvasionViewer.module.css');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain('max-height: 47dvh');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('pointer-events: none');
  });
});
