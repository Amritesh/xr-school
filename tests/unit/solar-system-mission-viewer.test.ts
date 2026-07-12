import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/SolarSystemMissionViewer.tsx');
const routePath = resolve(process.cwd(), 'apps/web/app/simulations/c8-10-science-solar-system/page.tsx');

describe('Classes 8-10 Solar System mission viewer', () => {
  it('exposes a dedicated simulation route', () => {
    expect(existsSync(routePath)).toBe(true);
    expect(readFileSync(routePath, 'utf8')).toContain('SolarSystemMissionViewer');
  });

  it('is built on the shared world-builder stack, not a private runtime', () => {
    const source = readFileSync(viewerPath, 'utf8');
    for (const identifier of [
      'createWebSimulationRuntime',
      'createSolarSystemScene',
      'createSolarSystemExperience',
      'createGuidedCamera',
      'createInteractionSystem',
      'SimulationExperienceShell',
    ]) {
      expect(source).toContain(identifier);
    }
    // No viewer-owned render loop or renderer — the runtime owns both.
    expect(source).not.toContain('setAnimationLoop');
    expect(source).not.toContain('new THREE.WebGLRenderer');
  });

  it('uses the unified VR framework', () => {
    const source = readFileSync(viewerPath, 'utf8');
    for (const identifier of [
      'createVrPlayerRig',
      'createVrLocomotion',
      'createVrHudPanel',
      'updateXrHover',
      "requiredFeatures: ['local-floor']",
      'hand-tracking',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('teaches through prediction, observation, and transfer — not passive watching', () => {
    const source = readFileSync(viewerPath, 'utf8');
    for (const identifier of [
      'predict-race-winner',
      'confirm-race-winner',
      'predict-hottest',
      'probe-venus',
      'pull-scale-lever',
      'find-earth',
      'predict-comet-tail',
      'ride-comet',
      'answer-orbit-transfer',
      'recordPrediction',
      'verifySolarAstronomy',
      'SCALE_DISCLOSURE',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('keeps narration, accessibility, and classroom affordances', () => {
    const source = readFileSync(viewerPath, 'utf8');
    for (const identifier of [
      'playSimulationNarration',
      'stopSimulationNarration',
      'aria-live',
      'focusGuide',
      'completionHeadline',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('never suggests an answer target for prediction actions', () => {
    const source = readFileSync(viewerPath, 'utf8');
    const suggestedBlock = source.slice(
      source.indexOf('SUGGESTED_TARGET_BY_ACTION'),
      source.indexOf('TRAY_CHOICES'),
    );
    for (const predictionAction of [
      "'predict-race-winner'",
      "'confirm-race-winner'",
      "'predict-hottest'",
      "'predict-comet-tail'",
      "'answer-orbit-transfer'",
    ]) {
      expect(suggestedBlock).not.toContain(predictionAction);
    }
  });

  it('loads attributed planet textures and exposes observatory scene controls', () => {
    const viewerSource = readFileSync(viewerPath, 'utf8');
    const sceneSource = readFileSync(
      resolve(process.cwd(), 'apps/web/lib/world-builder/solarSystemScene.ts'),
      'utf8',
    );
    expect(sceneSource).toContain('SOLAR_TEXTURES');
    expect(sceneSource).toContain('THREE.TextureLoader');
    for (const control of [
      'setPaused',
      'setLayerVisibility',
      'focusPlanet',
      'setObservatoryMode',
      'setTrueScale',
    ]) {
      expect(sceneSource).toContain(control);
    }
    expect(viewerSource).toContain('SolarSystemScene');
  });

  it('unlocks a keyboard-accessible observatory after the guided mission', () => {
    const source = readFileSync(viewerPath, 'utf8');
    for (const identifier of [
      'createSolarSystemObservatory',
      'Open observatory',
      'Exit observatory',
      'Simulation speed',
      'Compare worlds',
      'Orbit paths',
      'Gravity vectors',
      'True distance',
      'aria-live',
    ]) {
      expect(source).toContain(identifier);
    }
  });

  it('restores guided-scene defaults after leaving or restarting the observatory', () => {
    const sceneSource = readFileSync(
      resolve(process.cwd(), 'apps/web/lib/world-builder/solarSystemScene.ts'),
      'utf8',
    );
    const setStageBlock = sceneSource.slice(
      sceneSource.indexOf('function setStage(stageIndex: number)'),
      sceneSource.indexOf('function beginRace()'),
    );
    for (const reset of [
      'paused = false',
      "setLayerVisibility('orbits', true)",
      "setLayerVisibility('labels', true)",
      "setLayerVisibility('gravity', false)",
    ]) {
      expect(setStageBlock).toContain(reset);
    }
  });
});
