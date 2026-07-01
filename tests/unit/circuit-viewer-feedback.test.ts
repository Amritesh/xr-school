import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/CircuitViewer.tsx');
const source = readFileSync(viewerPath, 'utf8');

describe('Circuit viewer headset regressions', () => {
  it('uses packaged stage narration audio for headset playback', () => {
    expect(source).toContain('NARRATION_AUDIO_URLS');
    expect(source).toContain('/audio/circuit/stage-01.mp3');
    expect(source).toContain('playSimulationNarration(NARRATIONS[stageIndex], stageIndex, NARRATION_AUDIO_URLS[stageIndex])');

    const audioDir = resolve(process.cwd(), 'apps/web/public/audio/circuit');
    expect(existsSync(audioDir)).toBe(true);
    expect(readdirSync(audioDir).filter(file => file.endsWith('.mp3'))).toHaveLength(4);
  });

  it('renders readable labels on all VR interaction buttons', () => {
    expect(source).toContain('makeButtonLabelTexture');
    expect(source).toContain("makeButtonLabelMesh('Previous'");
    expect(source).toContain("makeButtonLabelMesh('Next'");
    expect(source).toContain("makeButtonLabelMesh('Switch'");
    expect(source).toContain('makeButtonLabelMesh(r.label');
    expect(source).toContain('prevBtn.add');
    expect(source).toContain('nextBtn.add');
    expect(source).toContain('vrSwBtn.add');
    expect(source).toContain('rb.add');
  });

  it('uses the shared world lifecycle, electrical truth, and mapped PBR', () => {
    expect(source).toContain('createWebSimulationRuntime');
    expect(source).toContain('createMaterialFactory');
    expect(source).toContain('createEnvironment');
    expect(source).toContain('CIRCUIT_WORLD');
    expect(source).toContain('createScientificModelRegistry');
    expect(source).toContain('evaluateCircuit');
    expect(source).toContain('createAssessmentSession');
    expect(source).toContain('fixedUpdate');
    expect(source).toContain('renderUpdate');
    expect(source).not.toContain('new THREE.WebGLRenderer');
    expect(source).not.toContain('renderer.setAnimationLoop');
    expect(source).not.toContain('renderer.render(scene, camera)');
  });
});
