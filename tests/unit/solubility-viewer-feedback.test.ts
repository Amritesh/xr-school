import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/SolubilityLabViewer.tsx');
const source = readFileSync(viewerPath, 'utf8');

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
    expect(source).toContain("button.name = `substance-button-${substance.id}`");
    expect(source).toContain("button.name = `prediction-button-${outcome.id}`");
    expect(source).toContain("runButton.name = 'action-button-run'");
    expect(source).toContain("resetButton.name = 'action-button-reset'");
    expect(source).toContain('renderer.xr.getController(0)');
    expect(source).toContain('createInteractionSystem');
    expect(source).toContain("id.startsWith('substance-button-')");
    expect(source).toContain("id.startsWith('prediction-button-')");
    expect(source).toContain("id === 'action-button-run'");
  });
});
