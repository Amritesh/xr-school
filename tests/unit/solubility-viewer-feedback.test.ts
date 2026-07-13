import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/SolubilityLabViewer.tsx');
const source = readFileSync(viewerPath, 'utf8');
const scenePath = resolve(process.cwd(), 'apps/web/lib/world-builder/solubilityScene.ts');
const sceneSource = existsSync(scenePath) ? readFileSync(scenePath, 'utf8') : '';

describe('Solubility Lab viewer headset regressions', () => {
  it('uses packaged narration for stages, selections, predictions, and trial results', () => {
    expect(source).toContain('NARRATION_AUDIO_URLS');
    expect(source).toContain('SUBSTANCE_AUDIO_URLS');
    expect(source).toContain('PREDICTION_AUDIO_URLS');
    expect(source).toContain('TRIAL_AUDIO_URLS');
    expect(source).toContain('/audio/solubility/stage-01.mp3');
    expect(source).toContain('/audio/solubility/substance-salt.mp3');
    expect(source).toContain('/audio/solubility/prediction-dissolves.mp3');
    expect(source).toContain('/audio/solubility/trial-salt-dissolves.mp3');
    expect(source).toContain('playSimulationNarration(NARRATIONS[index], index, NARRATION_AUDIO_URLS[index])');

    const audioDir = resolve(process.cwd(), 'apps/web/public/audio/solubility');
    expect(existsSync(audioDir)).toBe(true);
    expect(readdirSync(audioDir).filter(file => file.endsWith('.mp3'))).toHaveLength(33);
  });

  it('adds VR controller targets for the complete lab workflow', () => {
    // Raycasting/selection now lives in the shared interaction system used
    // by every migrated viewer, rather than a bespoke per-viewer raycaster.
    expect(sceneSource).toContain('`substance-button-${id}`');
    expect(sceneSource).toContain('`prediction-button-${id}`');
    expect(sceneSource).toContain("scoop.name = 'action-button-run'");
    expect(sceneSource).toContain("makeButton('action-button-reset'");
    expect(source).toContain('host.renderer.xr.getController(0)');
    expect(source).toContain('createInteractionSystem');
    expect(source).toContain("id.startsWith('substance-button-')");
    expect(source).toContain("id.startsWith('prediction-button-')");
    expect(source).toContain("id === 'action-button-run'");
  });

  it('runs through the shared fixed-step runtime and scientific model', () => {
    expect(source).toContain('createWebSimulationRuntime');
    expect(source).toContain('createSolubilityModel');
    expect(source).toContain('fixedUpdate');
    expect(source).not.toContain('new THREE.WebGLRenderer');
    expect(source).not.toContain('renderer.setAnimationLoop');
  });

  it('uses adaptive PBR glass and instanced evidence particles', () => {
    expect(sceneSource).toContain('THREE.MeshPhysicalMaterial');
    expect(sceneSource).toContain('THREE.InstancedMesh');
    expect(sceneSource).toContain("profileId === 'questBaseline'");
    expect(sceneSource).toContain('instanceMatrix.needsUpdate = true');
  });

  it('provides visible water, physical ingredients, and a measured pour action', () => {
    expect(sceneSource).toContain("'WATER · 200 mL'");
    expect(sceneSource).toContain('meniscus');
    expect(sceneSource).toContain('ingredientJars');
    expect(sceneSource).toContain('ingredient-fill');
    expect(sceneSource).toContain("scoop.name = 'action-button-run'");
    expect(sceneSource).toContain('pourScoop');
    expect(source).toContain('sceneApiRef.current?.pourScoop');
  });

  it('exposes measured evidence and discloses representational molecular scale', () => {
    expect(source).toContain('Dissolved mass');
    expect(source).toContain('Turbidity');
    expect(source).toContain('Saturation');
    expect(source).toContain('Molecular lens');
    expect(source).toContain('representational, not to scale');
    expect(source).toContain('Stirring changes the rate');
  });
});
