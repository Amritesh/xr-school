import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(
  process.cwd(),
  'apps/web/components/simulations/DigestiveSystemViewer.tsx',
);
const stylesPath = resolve(process.cwd(), 'apps/web/app/globals.css');
const assetReadmePath = resolve(process.cwd(), 'apps/web/public/assets/digestive/README.md');

describe('Digestive System viewer experience contract', () => {
  it('provides Quest WebXR controller selection in a stationary local-floor world', () => {
    expect(existsSync(viewerPath)).toBe(true);
    const source = readFileSync(viewerPath, 'utf8');

    // Raycasting/selection now lives in the shared interaction system used
    // by every migrated viewer, rather than a bespoke per-viewer raycaster.
    expect(source).toContain("renderer.xr.setReferenceSpaceType('local-floor')");
    expect(source).toContain('renderer.xr.getController(0)');
    expect(source).toContain('renderer.xr.getController(1)');
    expect(source).toContain('createInteractionSystem');
    expect(source).toContain('xrControllers: [controller0, controller1]');
    expect(source).toContain('digestive-nav-previous');
    expect(source).toContain('digestive-nav-next');
    expect(source).toContain('goToStageRef.current');

    const interactionSource = readFileSync(
      resolve(process.cwd(), 'apps/web/lib/world-builder/interactionSystem.ts'),
      'utf8',
    );
    expect(interactionSource).toContain("addEventListener('selectstart'");
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
      'sort-apple-healthy',
      'sort-pizza-unhealthy',
      'sort-soft-drink-unhealthy',
      'DIGESTIVE_QUIZ_QUESTIONS',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('renders the requested immersive science room and teacher-led journey affordances', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      'modern-futuristic-science-classroom',
      'interactive-smart-board-digestive-journey',
      'teacher-ai-avatar',
      'human-body-hologram',
      'digestive-system-hologram-growing',
      'glowing-shrink-portal-to-mouth',
      'holographic-window-soft-ambient-lighting',
      'animated-lighting-projector-spatial-speakers',
      'floating-ui-panel-digestive-journey',
      'science-lab-equipment-holographic-table',
      'spatial-science-room-ambience-no-student-npcs',
      'Teacher AI:',
      'Cinematic:',
      'Spatial audio:',
      'DIGESTIVE_VR_FEATURES',
      'DIGESTIVE_IMMERSION_REQUIREMENTS',
      'DIGESTIVE_HEALTHY_SORT_ACTIONS',
    ]) {
      expect(source).toContain(identifier);
    }
    expect(source).not.toContain('student-desk-${index + 1}');
    expect(source).not.toContain('animated-student-${index + 1}');
  });

  it('adds body-scale environments and cinematic transition effects', () => {
    const source = readFileSync(viewerPath, 'utf8');
    const styles = readFileSync(stylesPath, 'utf8');

    for (const identifier of [
      'BODY_TRAVEL_STAGE_IDS',
      'STAGE_CAMERA_FRAMES',
      'scienceRoomObjectsRef',
      'object.visible = !isInsideBody',
      'digestive-cinematic-transition',
      'digestive-cinematic-fade',
      'inside-mouth-gum-walls-warm-lighting',
      'surrounding-realistic-tooth',
      'flowing-saliva-streams',
      'living-esophagus-tunnel-peristalsis-walls',
      'huge-living-stomach-chamber-contracting-walls',
      'animated-bile-flow-stream',
      'largest-scene-giant-intestinal-folds',
      'cool-large-intestine-water-absorption-environment',
      'floating-holographic-quiz-card-arena',
      'procedural-pbr-organ-fold',
      'soft-organ-bloom-light',
    ]) {
      expect(`${source}\n${styles}`).toContain(identifier);
    }
  });

  it('animates active body environments instead of leaving static stage models', () => {
    const source = readFileSync(viewerPath, 'utf8');

    for (const identifier of [
      'activeStageGroup?.traverse',
      'object instanceof THREE.Points',
      'peristalsis-wall-contraction-ring',
      'acid-particle-steam-bubble',
      'large-surrounding-villus',
      'food-falls-from-above',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('prefers authored GLB production assets over procedural fallback geometry', () => {
    const source = readFileSync(viewerPath, 'utf8');
    const assetReadme = readFileSync(assetReadmePath, 'utf8');

    for (const identifier of [
      'GLTFLoader',
      'DIGESTIVE_GLTF_ASSET_SLOTS',
      'loadProductionDigestiveAssets',
      'production-gltf-${slot.id}',
      'THREE.AnimationMixer',
      'createPresentationPipeline',
      'browserEnhanced',
      'mouth-interior-environment.glb',
      'small-intestine-villi-world.glb',
      'holographic-quiz-arena.glb',
    ]) {
      expect(`${source}\n${assetReadme}`).toContain(identifier);
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
