import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(
  process.cwd(),
  'apps/web/components/simulations/DigestiveSystemViewer.tsx',
);
const stylesPath = resolve(process.cwd(), 'apps/web/app/globals.css');

describe('Digestive System viewer experience contract', () => {
  it('provides Quest WebXR controller selection in a stationary local-floor world', () => {
    expect(existsSync(viewerPath)).toBe(true);
    const source = readFileSync(viewerPath, 'utf8');

    expect(source).toContain("renderer.xr.setReferenceSpaceType('local-floor')");
    expect(source).toContain('renderer.xr.getController(0)');
    expect(source).toContain('renderer.xr.getController(1)');
    expect(source).toContain('intersectObjects(interactiveTargets');
    expect(source).toContain("controller0.addEventListener('select'");
    expect(source).toContain("controller1.addEventListener('select'");
    expect(source).toContain('digestive-nav-previous');
    expect(source).toContain('digestive-nav-next');
    expect(source).toContain('goToStageRef.current');
  });

  it('uses the shared narration, persistent subtitles, comfort mode, and badge', () => {
    const source = readFileSync(viewerPath, 'utf8');

    expect(source).toContain('@/lib/simulationAudio');
    expect(source).toContain('playSimulationNarration');
    expect(source).toContain('stopSimulationNarration');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('Comfort mode');
    expect(source).toContain('Digestive Explorer');
  });

  it('contains the complete organ pathway and requested interactions', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      'mouth',
      'esophagus',
      'stomach',
      'liver',
      'gallbladder',
      'pancreas',
      'small-intestine',
      'large-intestine',
      'rectum-anus',
      'peristalsis-wave',
      'mixer-turn',
      'absorb-nutrient',
      'absorb-water',
      'healthy-fruit',
      'DIGESTIVE_QUIZ_QUESTIONS',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('keeps the entire lesson operable through accessible HTML controls', () => {
    const source = readFileSync(viewerPath, 'utf8');

    expect(source).toContain('ActionButtons');
    expect(source).toContain('aria-label="Previous stage"');
    expect(source).toContain('aria-label="Next stage"');
    expect(source).toContain('aria-label="Restart lesson"');
    expect(source).toContain('Enter VR');
    expect(source).toContain('onClick={() => performAction');
  });

  it('stacks the lesson HUD at narrow browser fallback widths', () => {
    const source = readFileSync(viewerPath, 'utf8');
    const styles = readFileSync(stylesPath, 'utf8');

    expect(source).toContain('digestive-hud-header');
    expect(source).toContain('digestive-stage-panel');
    expect(source).toContain('digestive-utility-controls');
    expect(styles).toContain('.digestive-hud-header');
    expect(styles).toContain('.digestive-stage-panel');
    expect(styles).toContain('@media (max-width: 720px)');
  });
});
