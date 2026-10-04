import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/ColourAdventureViewer.tsx');
const routePath = resolve(process.cwd(), 'apps/web/app/simulations/c1-art-a01-learning-of-colours/page.tsx');

describe('Class 1 colour adventure viewer', () => {
  it('exposes its canonical route through the shared viewer registry', () => {
    expect(existsSync(routePath)).toBe(true);
    const source = readFileSync(routePath, 'utf8');
    expect(source).toContain('SimulationRoutePage');
    expect(source).toContain('slug="c1-art-a01-learning-of-colours"');
  });

  it('keeps Quest controls, narration, accessibility, and no-student classroom affordances', () => {
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
      'class-1-magical-circular-colour-classroom-no-students',
      'animated-friendly-teacher-guide',
    ]) {
      expect(source).toContain(identifier);
    }
    expect(source).not.toContain('student-desk');
    expect(source).not.toContain('animated-student');
  });

  it('builds the requested colour adventure scenes and interactions', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      'Learning of Colours',
      'rainbow-ceiling-light',
      'large-3d-led-smart-board',
      'floating-${colour.id}-balloon',
      '`touch-${colour.id}-balloon`',
      'find-colours-stars-coins-rainbow-reward',
      'createColourMemoryScene',
      'rainbow-finale-balloons-butterflies-confetti',
      'colour-vr-controller-navigation',
      'colourMemoryActionId(memoryQuestion.id, colourId)',
      'complete-memory-check',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('shares action validation, keeps labels stationary and reserves the scene viewport', () => {
    const source = readFileSync(viewerPath, 'utf8');
    expect(source).toContain('applyColourAdventureAction(progressRef.current, currentStage.id, actionId)');
    expect(source).toContain('disabled={!memoryReady || stageComplete}');
    expect(source).toContain('canVisitColourStage(progressRef.current, nextIndex)');
    expect(source).not.toContain('setMemoryQuestionIndex');
    expect(source).not.toContain('target.rotation.y = time');
    expect(source).toContain('new ResizeObserver(onResize)');
    expect(source).toContain('className={styles.scene}');
  });
});
