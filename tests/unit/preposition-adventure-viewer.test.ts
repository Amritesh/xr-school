import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/PrepositionAdventureViewer.tsx');
const routePath = resolve(process.cwd(), 'apps/web/app/simulations/c2-english-ch01-prepositions/page.tsx');

describe('Class 2 preposition adventure viewer', () => {
  it('exposes a dedicated simulation route', () => {
    expect(existsSync(routePath)).toBe(true);
    expect(readFileSync(routePath, 'utf8')).toContain('PrepositionAdventureViewer');
  });

  it('keeps Quest/WebXR controls, narration, accessibility, and no-student affordances', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      "renderer.xr.setReferenceSpaceType('local-floor')",
      'renderer.xr.getController(0)',
      'renderer.xr.getController(1)',
      'optionalFeatures',
      'hand-tracking',
      'playSimulationNarration',
      'stopSimulationNarration',
      'aria-live="polite"',
      'Voice on',
      'Comfort',
      'Restart',
      'class-2-magical-english-adventure-no-students',
      'friendly-animated-teacher-guide-smiles-speaks-slowly-never-strict',
    ]) {
      expect(source).toContain(identifier);
    }
    expect(source).not.toContain('student-desk');
    expect(source).not.toContain('animated-student');
  });

  it('builds the requested preposition adventure scenes and rewards', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      'Prepositions Adventure',
      'large-smartboard-preposition-practice-memory-check',
      'floating-books-butterflies-rainbow-magic-sparkles-introduction',
      'toy-room-garden-playground-reading-corner-tree-house-animal-park-castle',
      'large-3d-preposition-scene',
      'randomized-practice-stars-gold-coins-fireworks-teacher-applause',
      'magic-castle-memory-check-answer-cards',
      'achievement-badge-${badge.toLowerCase().replace',
      'rainbow-butterflies-confetti-stars-final-english-adventure-celebration',
      'preposition-vr-controller-navigation',
    ]) {
      expect(source).toContain(identifier);
    }
  });
});
