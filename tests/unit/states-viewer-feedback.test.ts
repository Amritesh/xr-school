import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/StatesOfMatterViewer.tsx');
const source = readFileSync(viewerPath, 'utf8');

describe('States of Matter viewer headset regressions', () => {
  it('uses packaged stage narration audio for headset playback', () => {
    expect(source).toContain('NARRATION_AUDIO_URLS');
    expect(source).toContain('/audio/states-of-matter/stage-01.mp3');
    expect(source).toContain('playSimulationNarration(NARRATIONS[nextIndex], nextIndex, NARRATION_AUDIO_URLS[nextIndex])');

    const audioDir = resolve(process.cwd(), 'apps/web/public/audio/states-of-matter');
    expect(existsSync(audioDir)).toBe(true);
    expect(readdirSync(audioDir).filter(file => file.endsWith('.mp3'))).toHaveLength(4);
  });

  it('adds in-scene stage buttons for immersive VR controller use', () => {
    // Raycasting/selection now lives in the shared interaction system used
    // by every migrated viewer, rather than a bespoke per-viewer raycaster.
    expect(source).toContain('makeStageButtonLabelTexture');
    expect(source).toContain('stageButtons');
    expect(source).toContain("button.name = `stage-button-${index}`");
    expect(source).toContain('renderer.xr.getController(0)');
    expect(source).toContain('createInteractionSystem');
    expect(source).toContain("id.startsWith('stage-button-')");
  });

  it('uses the shared runtime physics engine for particle motion', () => {
    expect(source).toContain('@/lib/runtimePhysics');
    expect(source).toContain('createPhysicsWorld');
    expect(source).toContain('createParticleCloud');
    expect(source).toContain('physicsWorldRef');
  });

  it('uses the shared world host, matter model, mapped PBR, and mastery', () => {
    expect(source).toContain('createWebSimulationRuntime');
    expect(source).toContain('createMaterialFactory');
    expect(source).toContain('createEnvironment');
    expect(source).toContain('STATES_WORLD');
    expect(source).toContain('evaluateMatterState');
    expect(source).toContain('createAssessmentSession');
    expect(source).toContain('fixedUpdate');
    expect(source).toContain('renderUpdate');
    expect(source).not.toContain('new THREE.WebGLRenderer');
    expect(source).not.toContain('renderer.setAnimationLoop');
    expect(source).not.toContain('renderer.render(scene, camera)');
  });
});
