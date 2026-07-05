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

  it('uses physical circuit objects instead of floating VR navigation buttons', () => {
    expect(source).toContain('handleCircuitObjectSelection');
    expect(source).toContain('circuit-switch-lever');
    expect(source).toContain('circuit-resistor');
    expect(source).toContain('circuit-bulb');
    expect(source).not.toContain('makeButtonLabelTexture');
    expect(source).not.toContain('makeButtonLabelMesh');
    expect(source).not.toContain('btn-next');
    expect(source).not.toContain('btn-prev');
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

  it('keeps explanatory text in HTML placards instead of the VR scene', () => {
    expect(source).not.toContain('drawCueCard');
    expect(source).not.toContain('drawChalkboard');
    expect(source).not.toContain('chalkCanvas');
    expect(source).not.toContain('cueCanvas');
    expect(source).toContain('simulation-experience__circuit-panel');
    expect(source).toContain('focusGuide');
  });

  it('uses a brighter classroom and removes decorative shelf clutter', () => {
    expect(source).toContain('circuit-classroom-floor');
    expect(source).toContain('student-workbench');
    expect(source).not.toContain('Tool shelves');
    expect(source).not.toContain('shelf.position');
  });

  it('shows a click cursor only when a physical circuit object is targetable', () => {
    // Cursor feedback now lives in the shared interaction system so it isn't
    // duplicated per viewer; verify the viewer wires into it and that the
    // shared module implements the pointer/grab affordance.
    expect(source).toContain('createInteractionSystem');
    expect(source).toContain("circuit-switch-lever'");
    expect(source).toContain("circuit-resistor'");
    expect(source).toContain("circuit-bulb'");

    const interactionSource = readFileSync(
      resolve(process.cwd(), 'apps/web/lib/world-builder/interactionSystem.ts'),
      'utf8',
    );
    expect(interactionSource).toContain("addEventListener('pointermove'");
    expect(interactionSource).toContain('cursor.hover : cursor.idle');
  });
});
