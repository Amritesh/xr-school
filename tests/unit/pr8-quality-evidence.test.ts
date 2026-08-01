import { describe, expect, it } from 'vitest';

import {
  PR8_CONTRIBUTIONS,
  PR8_HEAD,
  inspectPr8Viewer,
  narrationKey,
} from '../../scripts/lib/pr8-quality-evidence';

describe('PR #8 immutable quality evidence', () => {
  it('pins all 23 contributions to the reviewed head', () => {
    expect(PR8_HEAD).toBe('621dfb61b39a4c49e8abb46ce60c54ea3d044479');
    expect(PR8_CONTRIBUTIONS).toHaveLength(23);
    expect(new Set(PR8_CONTRIBUTIONS.map(item => item.prSlug)).size).toBe(23);
    expect(new Set(PR8_CONTRIBUTIONS.map(item => item.canonicalSlug)).size).toBe(23);
    expect(
      PR8_CONTRIBUTIONS.filter(item => item.integration === 'new-class'),
    ).toHaveLength(22);
    expect(
      PR8_CONTRIBUTIONS.filter(item => item.integration === 'existing-enhancement'),
    ).toEqual([
      expect.objectContaining({
        prSlug: 'experiments-with-water-soluble-insoluble',
        canonicalSlug: 'c5-ch07-a03-soluble-and-insoluble-substances',
      }),
    ]);
  });

  it('uses the same stable narration hash as the contributed runtime', () => {
    expect(narrationKey('Test narration')).toBe('1r8jot7');
  });

  it('recognises baseline defects without treating source text as behavior', () => {
    const evidence = inspectPr8Viewer({
      source:
        'new THREE.WebGLRenderer(); renderer.setAnimationLoop(loop); createQuestVrControls({ onPrimary: performAction, onNarrate: replay }); <button>Next</button>',
      testSource:
        "const viewer = readFileSync(path, 'utf8'); expect(viewer).toContain('Next')",
      trackedNarrationPaths: new Set<string>(),
      narrationTexts: ['Test narration'],
    });

    expect(evidence).toMatchObject({
      ownsRenderer: true,
      ownsAnimationLoop: true,
      usesSourceTextTests: true,
      primaryActionCanAdvance: true,
      hasGenericNextControl: true,
      referencedNarrationClips: 1,
      trackedNarrationClips: 0,
    });
  });
});
