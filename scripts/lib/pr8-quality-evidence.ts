export const PR8_HEAD = '621dfb61b39a4c49e8abb46ce60c54ea3d044479' as const;

export type Pr8Integration = 'new-class' | 'existing-enhancement';

export interface Pr8Contribution {
  prSlug: string;
  canonicalSlug: string;
  viewer: string;
  sourcePath: string;
  testPath: string;
  legacyPath: string;
  integration: Pr8Integration;
}

const CONTRIBUTION_ROWS = [
  ['walls-tell-stories-ancient-fort-visit', 'c5-ch10-a01-a-visit-of-ancient-fort', 'AncientFortVisitViewer', 'ancient-fort-visit-viewer', 'new-class'],
  ['up-you-go-snow-mountain-climbing', 'c5-ch09-a04-snow-mountain-climbing', 'SnowMountainClimbingViewer', 'snow-mountain-climbing-viewer', 'new-class'],
  ['up-you-go-camp-in-snow', 'c5-ch09-a03-camp-in-the-snow', 'CampInSnowViewer', 'camp-in-snow-viewer', 'new-class'],
  ['up-you-go-rock-climbing', 'c5-ch09-a02-rock-climbing', 'RockClimbingViewer', 'rock-climbing-viewer', 'new-class'],
  ['up-you-go-river-crossing-adventure', 'c5-ch09-a01-river-crossing-adventure', 'RiverCrossingAdventureViewer', 'river-crossing-adventure-viewer', 'new-class'],
  ['treat-for-mosquitoes-mosquito-life-cycle', 'c5-ch08-a02-life-cycle-of-the-mosquito', 'MosquitoLifeCycleViewer', 'mosquito-life-cycle-viewer', 'new-class'],
  ['treat-for-mosquitoes-malaria-diagnosis', 'c5-ch08-a01-diagnosis-of-malaria', 'MalariaDiagnosisViewer', 'malaria-diagnosis-viewer', 'new-class'],
  ['experiments-with-water-float-or-sink', 'c5-ch07-a01-a-concept-about-what-floats-what-sinks', 'FloatOrSinkViewer', 'float-or-sink-viewer', 'new-class'],
  ['experiments-with-water-dead-sea-salt-water', 'c5-ch07-a02-dead-sea-salt-water-and-its-effects', 'DeadSeaSaltWaterViewer', 'dead-sea-salt-water-viewer', 'new-class'],
  ['experiments-with-water-soluble-insoluble', 'c5-ch07-a03-soluble-and-insoluble-substances', 'SolubleInsolubleViewer', 'soluble-insoluble-viewer', 'existing-enhancement'],
  ['every-drop-counts-rainwater-storage', 'c5-ch06-a01-the-storage-of-rainwater', 'RainwaterStorageViewer', 'rainwater-storage-viewer', 'new-class'],
  ['every-drop-counts-stepwell-structure', 'c5-ch06-a02-a-step-well-structure', 'StepwellStructureViewer', 'stepwell-structure-viewer', 'new-class'],
  ['seeds-and-seeds-seed-dispersal', 'c5-ch05-a02-seed-dispersal', 'SeedDispersalViewer', 'seed-dispersal-viewer', 'new-class'],
  ['seeds-and-seeds-pitcher-plant', 'c5-ch05-a01-pitcher-plant-the-insect-hunter', 'PitcherPlantViewer', 'pitcher-plant-viewer', 'new-class'],
  ['mangoes-round-the-year-aam-papad', 'c5-ch04-a03-the-making-of-aam-papad', 'AamPapadViewer', 'aam-papad-viewer', 'new-class'],
  ['mangoes-round-the-year-milk-spoilage', 'c5-ch04-a02-milk-spoilage', 'MilkSpoilageViewer', 'milk-spoilage-viewer', 'new-class'],
  ['mangoes-round-the-year-food-spoilage', 'c5-ch04-a01-food-spoilage', 'FoodSpoilageViewer', 'food-spoilage-viewer', 'new-class'],
  ['sorting-materials-by-shape', 'c6-ch04-a01-sorting-materials-according-to-their-shape', 'ShapeSortingViewer', 'shape-sorting-viewer', 'new-class'],
  ['fibre-to-fabric-cotton-farming', 'c6-ch03-a01-cotton-farming', 'CottonFarmingViewer', 'cotton-farming-viewer', 'new-class'],
  ['fibre-to-fabric-cotton-ginning', 'c6-ch03-a02-the-process-of-cotton-ginning', 'CottonGinningViewer', 'cotton-ginning-viewer', 'new-class'],
  ['components-of-food-mineral-sources', 'c6-ch02-a05-the-sources-of-minerals-in-food', 'MineralSourcesViewer', 'mineral-sources-viewer', 'new-class'],
  ['components-of-food-vitamins-deficiencies', 'c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies', 'VitaminDeficiencyViewer', 'vitamin-deficiency-viewer', 'new-class'],
  ['components-of-food-lipid-test', 'c6-ch02-a03-test-the-presence-of-lipids', 'LipidTestViewer', 'lipid-test-viewer', 'new-class'],
] as const satisfies ReadonlyArray<readonly [string, string, string, string, Pr8Integration]>;

export const PR8_CONTRIBUTIONS: readonly Pr8Contribution[] = Object.freeze(
  CONTRIBUTION_ROWS.map(([prSlug, canonicalSlug, viewer, testFile, integration]) =>
    Object.freeze({
      prSlug,
      canonicalSlug,
      viewer,
      sourcePath: `apps/web/components/simulations/${viewer}.tsx`,
      testPath: `tests/unit/${testFile}.test.ts`,
      legacyPath: `/simulations/${prSlug}`,
      integration,
    }),
  ),
);

export function narrationKey(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export interface InspectPr8ViewerInput {
  source: string;
  testSource: string;
  trackedNarrationPaths: ReadonlySet<string>;
  narrationTexts: readonly string[];
}

export interface Pr8ViewerEvidence {
  ownsRenderer: boolean;
  ownsAnimationLoop: boolean;
  ownsQuestControls: boolean;
  ownsEnvironmentLoader: boolean;
  usesSourceTextTests: boolean;
  primaryActionCanAdvance: boolean;
  hasGenericNextControl: boolean;
  acceptsNarrateButDoesNotInvokeIt: boolean;
  dynamicNarrationRequests: number;
  referencedNarrationClips: number;
  trackedNarrationClips: number;
  missingNarrationClips: number;
}

function hasTrackedNarrationPath(paths: ReadonlySet<string>, key: string): boolean {
  const suffix = `/narration/${key}.mp3`;
  for (const path of paths) {
    if (`/${path.replace(/^\/+/, '')}`.endsWith(suffix)) return true;
  }
  return false;
}

export function inspectPr8Viewer({
  source,
  testSource,
  trackedNarrationPaths,
  narrationTexts,
}: InspectPr8ViewerInput): Pr8ViewerEvidence {
  const trackedNarrationClips = narrationTexts.filter(text =>
    hasTrackedNarrationPath(trackedNarrationPaths, narrationKey(text)),
  ).length;
  // These contributed viewers also build narration requests at runtime. A
  // template call is one request family; each ternary `hint` call has two
  // possible request families. They cannot map to a committed stable hash at
  // audit time and therefore count as missing clips.
  const templateNarrationRequests = [
    ...source.matchAll(/\b(?:speakText|playNarration)\s*\(\s*`[\s\S]*?`\s*[,)]/g),
  ].length;
  const conditionalHintRequests = [
    ...source.matchAll(/\b(?:speakText|playNarration)\s*\(\s*hint\s*\)/g),
  ].length * 2;
  const dynamicNarrationRequests = templateNarrationRequests + conditionalHintRequests;
  const referencedNarrationClips = narrationTexts.length + dynamicNarrationRequests;
  const acceptsNarrate = /\bonNarrate\b\s*[,?]/.test(source);
  const invokesNarrate = /\bonNarrate\s*(?:\?\.)?\s*\(/.test(source);

  return {
    ownsRenderer: /new\s+THREE\.WebGLRenderer\s*\(/.test(source),
    ownsAnimationLoop: /\.setAnimationLoop\s*\(/.test(source),
    ownsQuestControls: /\bcreateQuestVrControls\s*\(/.test(source),
    ownsEnvironmentLoader: /\bapplyRealisticEnvironment\s*\(/.test(source),
    usesSourceTextTests:
      /\breadFileSync\s*\(/.test(testSource)
      && /(?:\.toContain\s*\(|\.toMatch\s*\(|\.includes\s*\()/.test(testSource),
    primaryActionCanAdvance: /\bonPrimary\s*:\s*performAction\b/.test(source),
    hasGenericNextControl: /<button\b[^>]*>\s*(?:[^<]*\s)?Next\s*<\/button>/i.test(source),
    acceptsNarrateButDoesNotInvokeIt: acceptsNarrate && !invokesNarrate,
    dynamicNarrationRequests,
    referencedNarrationClips,
    trackedNarrationClips,
    missingNarrationClips: referencedNarrationClips - trackedNarrationClips,
  };
}
