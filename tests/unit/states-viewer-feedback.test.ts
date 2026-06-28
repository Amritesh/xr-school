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
    expect(source).toContain('makeStageButtonLabelTexture');
    expect(source).toContain('stageButtons');
    expect(source).toContain("button.name = `stage-button-${index}`");
    expect(source).toContain('renderer.xr.getController(0)');
    expect(source).toContain('intersectObjects(stageButtons');
  });

  it('uses the shared runtime physics engine for particle motion', () => {
    expect(source).toContain('@/lib/runtimePhysics');
    expect(source).toContain('createPhysicsWorld');
    expect(source).toContain('createParticleCloud');
    expect(source).toContain('physicsWorldRef');
  });
});
