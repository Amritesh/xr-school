import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerPath = resolve(process.cwd(), 'apps/web/components/simulations/FoodSourcesSortingViewer.tsx');
const source = readFileSync(viewerPath, 'utf8');

describe('Food Sources viewer headset regressions', () => {
  it('uses packaged narration for stages, item clues, and placement feedback', () => {
    expect(source).toContain('NARRATION_AUDIO_URLS');
    expect(source).toContain('ITEM_AUDIO_URLS');
    expect(source).toContain('ASSIGNMENT_AUDIO_URLS');
    expect(source).toContain('/audio/food-sources/stage-01.mp3');
    expect(source).toContain('/audio/food-sources/item-rice.mp3');
    expect(source).toContain('/audio/food-sources/assign-rice-plant.mp3');
    expect(source).toContain('playSimulationNarration(NARRATIONS[index], index, NARRATION_AUDIO_URLS[index])');

    const audioDir = resolve(process.cwd(), 'apps/web/public/audio/food-sources');
    expect(existsSync(audioDir)).toBe(true);
    expect(readdirSync(audioDir).filter(file => file.endsWith('.mp3'))).toHaveLength(36);
  });

  it('lets VR controllers select food tokens and category platforms', () => {
    // Raycasting/selection now lives in the shared interaction system used
    // by every migrated viewer, rather than a bespoke per-viewer raycaster.
    expect(source).toContain("token.name = `food-token-${item.id}`");
    expect(source).toContain("platform.name = `food-platform-${category.id}`");
    expect(source).toContain('renderer.xr.getController(0)');
    expect(source).toContain('createInteractionSystem');
    expect(source).toContain("id.startsWith('food-token-')");
    expect(source).toContain("id.startsWith('food-platform-')");
  });
});
