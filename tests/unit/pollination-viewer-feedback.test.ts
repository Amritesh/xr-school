import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/PollinationViewer.tsx');
const source = readFileSync(viewerPath, 'utf8');

describe('Pollination viewer feedback regressions', () => {
  it('starts narration on VR entry and includes a headset-playable Web Audio cue with speech fallback', () => {
    expect(source).toContain('playNarration');
    expect(source).toContain('@/lib/simulationAudio');
    expect(source).toContain('playSimulationNarration');
    expect(source).toContain('NARRATION_AUDIO_URLS');
    expect(source).toContain('/audio/pollination/stage-01.mp3');
    expect(source).toContain('playSimulationNarration(NARRATIONS[stageIndex], stageIndex, NARRATION_AUDIO_URLS[stageIndex])');
    expect(source).toContain('stopSimulationNarration');
    expect(source).toContain('playNarration(stageRef.current)');
  });

  it('packages narration audio files for headset playback instead of relying only on speech synthesis', () => {
    const audioDir = resolve(process.cwd(), 'apps/web/public/audio/pollination');

    expect(existsSync(audioDir)).toBe(true);
    expect(readdirSync(audioDir).filter(file => file.endsWith('.mp3'))).toHaveLength(8);
  });

  it('renders text labels directly on VR navigation buttons', () => {
    expect(source).toContain('makeButtonLabelTexture');
    expect(source).toContain("makeButtonLabelMesh('Previous'");
    expect(source).toContain("makeButtonLabelMesh('Next'");
    expect(source).toContain('prevBtn.add');
    expect(source).toContain('nextBtn.add');
  });

  it('requires an intentional controller-ray hit before changing stages', () => {
    expect(source).toContain('resolveControllerSelection');
    expect(source).toContain('updateNavigationHover');
    expect(source).not.toMatch(/else\s*\{\s*advanceStage\(\);\s*\}/);
  });

  it('uses a player rig and latched thumbstick input for comfort snap turning', () => {
    expect(source).toContain('updateSnapTurn');
    expect(source).toContain('playerRig');
    expect(source).toContain('snapTurnLatches');
    expect(source).toContain('gamepad.axes');
  });

  it('maps Quest B and X to latched previous-stage or catalog navigation', () => {
    expect(source).toContain('isQuestBackPressed');
    expect(source).toContain('resolveBackAction');
    expect(source).toContain('backButtonLatches');
    expect(source).toContain("window.location.assign('/simulations')");
  });

  it('groups navigation controls in a persistent left-side VR panel', () => {
    expect(source).toContain("navigationPanel.name = 'left-navigation-panel'");
    expect(source).toContain('navigationPanel.position.set(-1.15, 1.35, -1.65)');
    expect(source).toContain('navigationPanel.add');
    expect(source).toContain('playerRig.add(navigationPanel)');
    expect(source).toContain('navigationPanel.lookAt');
  });

  it('renders pollen as natural 3D grains instead of square point sprites', () => {
    expect(source).toContain('buildPollenGrainGeometry');
    expect(source).toContain('new THREE.SphereGeometry');
    expect(source).toContain('THREE.InstancedMesh');
    expect(source).not.toContain('new THREE.PointsMaterial');
    expect(source).not.toContain('new THREE.DodecahedronGeometry');
  });

  it('draws detailed cue cards for headset reading', () => {
    expect(source).toContain('stage.detail');
    expect(source).toContain('stage.instructor');
    expect(source).toContain('Detailed explanation');
  });

  it('uses shaped bee wings with named animated wing meshes', () => {
    expect(source).toContain('buildBeeWing');
    expect(source).toContain('buildBeeLeg');
    expect(source).toContain("wing.name = 'bee-wing'");
    expect(source).toContain("vein.name = 'bee-wing-vein'");
    expect(source).toContain('beeFlightPhase');
  });

  it('defines explicit flower scale ranges to prevent oversized flowers', () => {
    expect(source).toContain('FLOWER_SCALE_RANGES');
    expect(source).toContain('inner: [0.46, 0.62]');
  });

  it('uses the shared world lifecycle and mapped PBR factories', () => {
    expect(source).toContain('createWebSimulationRuntime');
    expect(source).toContain('createMaterialFactory');
    expect(source).toContain('createEnvironment');
    expect(source).toContain('POLLINATION_WORLD');
    expect(source).toContain('createAssessmentSession');
    expect(source).toContain('createPollinationModel');
    expect(source).not.toContain('new THREE.WebGLRenderer');
    expect(source).not.toContain('renderer.setAnimationLoop');
    expect(source).not.toContain('renderer.render(scene, camera)');
  });
});
