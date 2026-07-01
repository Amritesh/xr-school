import {
  BROWSER_BALANCED_PROFILE,
  BROWSER_ENHANCED_PROFILE,
  QUEST_BASELINE_PROFILE,
  type AssetDefinition,
  type PbrMaterialDefinition,
  type WorldBundle,
} from '../../../../packages/simulation-schema/src/index';

const TEXTURE_ROOT = '/world-builder/circuit';
const ASSET_LICENSE = 'XR School self-authored; redistribution permitted';

function textureAsset(
  family: string,
  channel: 'base-color' | 'normal' | 'roughness',
): AssetDefinition {
  return {
    id: `${family}-${channel}`,
    url: `${TEXTURE_ROOT}/${family}-${channel}.svg`,
    kind: 'texture',
    source: `XR School procedural Circuit ${family} texture`,
    license: ASSET_LICENSE,
    author: 'XR School',
    width: 512,
    height: 512,
    channels: [channel === 'base-color' ? 'baseColor' : channel],
    compression: 'SVG procedural',
  };
}

function mappedMaterial(
  id: string,
  family: string,
  baseColor: string,
  roughness: number,
  metalness: number,
  options: Partial<PbrMaterialDefinition> = {},
): PbrMaterialDefinition {
  return {
    id,
    model: 'standard',
    baseColor,
    baseColorMap: `${family}-base-color`,
    normalMap: `${family}-normal`,
    normalScale: [0.2, 0.2],
    roughness,
    roughnessMap: `${family}-roughness`,
    metalness,
    textureRepeat: [2, 2],
    ...options,
  };
}

const materials: PbrMaterialDefinition[] = [
  mappedMaterial('workshop-wall', 'painted', '#201811', 0.92, 0, {
    textureRepeat: [6, 3],
  }),
  mappedMaterial('workbench-wood', 'wood', '#56331b', 0.82, 0, {
    normalScale: [0.42, 0.42],
    textureRepeat: [5, 2],
  }),
  mappedMaterial('circuit-board', 'circuit', '#14532d', 0.68, 0.08, {
    textureRepeat: [4, 3],
  }),
  mappedMaterial('copper-wire', 'copper', '#d29a29', 0.3, 0.72, {
    textureRepeat: [8, 1],
  }),
  mappedMaterial('brushed-metal', 'metal', '#6b7280', 0.34, 0.82, {
    textureRepeat: [3, 3],
  }),
  mappedMaterial('battery-blue', 'painted', '#1e40af', 0.48, 0.12),
  mappedMaterial('switch-red', 'painted', '#dc2626', 0.38, 0.28, {
    emissiveColor: '#7f1d1d',
    emissiveIntensity: 0.18,
  }),
  mappedMaterial('resistor-body', 'painted', '#c2410c', 0.66, 0.06),
  mappedMaterial('electron', 'metal', '#60a5fa', 0.16, 0.3, {
    emissiveColor: '#2563eb',
    emissiveIntensity: 1.6,
  }),
  {
    id: 'bulb-glass',
    model: 'physical',
    baseColor: '#fff7d6',
    emissiveColor: '#fff3bf',
    emissiveIntensity: 0,
    roughness: 0.12,
    metalness: 0,
    transmission: 0.62,
    clearcoat: 0.4,
    opacity: 0.78,
    fallbackMaterialId: 'bulb-glass-quest',
  },
  {
    id: 'bulb-glass-quest',
    model: 'standard',
    baseColor: '#fff7d6',
    emissiveColor: '#fff3bf',
    emissiveIntensity: 0,
    roughness: 0.2,
    metalness: 0,
    opacity: 0.58,
  },
];

const textureAssets = [
  'painted',
  'wood',
  'circuit',
  'copper',
  'metal',
].flatMap(family => [
  textureAsset(family, 'base-color'),
  textureAsset(family, 'normal'),
  textureAsset(family, 'roughness'),
]);

const entity = (
  id: string,
  visualId: string,
  materialId: string,
  position: [number, number, number],
  interactionTags: string[],
  accessibilityLabel: string,
) => ({
  id,
  visualId,
  materialId,
  transform: {
    position,
    rotation: [0, 0, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
  },
  interactionTags,
  accessibilityLabel,
});

export const CIRCUIT_WORLD: WorldBundle = {
  world: {
    id: 'circuit-reference-world',
    version: '1.0.0',
    title: 'Electric Circuits and Ohm’s Law',
    metersPerWorldUnit: 1,
    environmentId: 'circuit-workshop',
    qualityProfileIds: ['questBaseline', 'browserBalanced', 'browserEnhanced'],
    entityIds: [
      'workshop',
      'workbench',
      'board',
      'wire',
      'battery',
      'switch',
      'resistor',
      'bulb',
      'electrons',
    ],
    systemIds: ['electricity', 'lesson', 'presentation'],
    scientificModelIds: ['ohms-law'],
    lessonSequenceId: 'circuit-four-stage-lesson',
    assessmentSequenceId: 'circuit-mastery',
    assetManifestId: 'circuit-assets',
    acceptanceProfileId: 'circuit-acceptance',
  },
  entities: [
    entity('workshop', 'procedural-workshop', 'workshop-wall', [0, 0, 0],
      ['environment'], 'Electrical workshop'),
    entity('workbench', 'procedural-workbench', 'workbench-wood', [0, 0.86, -0.8],
      ['environment'], 'Wooden circuit workbench'),
    entity('board', 'procedural-circuit-board', 'circuit-board', [0, 0.9, -0.8],
      ['inspectable'], 'Green circuit board'),
    entity('wire', 'closed-wire-loop', 'copper-wire', [0, 0.9, -0.8],
      ['electrical-path'], 'Copper wire path'),
    entity('battery', 'procedural-battery', 'battery-blue', [-0.28, 0.9, -0.8],
      ['voltage-source'], 'Nine volt battery'),
    entity('switch', 'interactive-switch', 'switch-red', [0, 1.2, -0.45],
      ['interactive', 'circuit-state'], 'Open or close the circuit'),
    entity('resistor', 'interactive-resistor', 'resistor-body', [0, 0.9, -0.97],
      ['interactive', 'resistance'], 'Selectable resistor'),
    entity('bulb', 'procedural-bulb', 'bulb-glass', [0.28, 1.1, -0.8],
      ['observation'], 'Bulb whose brightness responds to current'),
    entity('electrons', 'illustrative-charge-flow', 'electron', [0, 0.9, -0.8],
      ['illustrative', 'current'], 'Illustrative electron flow markers'),
  ],
  environments: [{
    id: 'circuit-workshop',
    background: { kind: 'color', value: '#1a120d' },
    environmentMap: 'workshop-environment',
    fog: { color: '#1a120d', near: 7, far: 18 },
    keyLight: {
      kind: 'spot',
      color: '#fff0c0',
      intensity: 3,
      position: [0, 2.8, -0.4],
      target: [0, 0.88, -0.8],
      castsShadow: true,
      range: 8,
      decay: 2,
    },
    fillLight: {
      kind: 'hemisphere',
      color: '#9fc5ff',
      intensity: 0.72,
      position: [0, 3, 0],
    },
    accentLights: [{
      kind: 'point',
      color: '#fbbf24',
      intensity: 1.1,
      position: [0, 2.2, -0.5],
      range: 6,
      decay: 2,
    }],
    shadowCasters: ['workbench', 'board', 'battery', 'switch', 'resistor'],
    exposure: 1,
    toneMapping: 'AgX',
  }],
  materials,
  qualityProfiles: [
    QUEST_BASELINE_PROFILE,
    BROWSER_BALANCED_PROFILE,
    BROWSER_ENHANCED_PROFILE,
  ],
  scientificModels: [{
    id: 'ohms-law',
    version: '1.0.0',
    domain: 'electricity',
    internalUnits: {
      voltage: 'V',
      resistance: 'ohm',
      current: 'A',
      power: 'W',
    },
    validInputRanges: {
      voltage: { min: 0, max: 24, unit: 'V' },
      resistance: { min: 1, max: 10_000, unit: 'ohm' },
    },
    assumptions: [
      'The source voltage is ideal and constant',
      'The selected resistor represents total circuit resistance',
      'Electron markers are illustrative and not microscopic trajectories',
    ],
    limitations: [
      'The model omits battery internal resistance and bulb filament nonlinearity',
      'Brightness is a normalized teaching visualization',
    ],
    referenceSources: [
      'NCERT Class 10 Science: Electricity',
    ],
    referenceVectors: [
      {
        id: 'open-circuit',
        inputs: { voltage: 9, resistance: 10, closed: false },
        expectedOutputs: { current: 0, power: 0, brightness: 0 },
      },
      {
        id: 'closed-ten-ohm',
        inputs: { voltage: 9, resistance: 10, closed: true },
        expectedOutputs: { current: 0.9, power: 8.1, brightness: 1 },
      },
      {
        id: 'closed-two-hundred-ohm',
        inputs: { voltage: 9, resistance: 200, closed: true },
        expectedOutputs: { current: 0.045, power: 0.405, brightness: 0.05 },
      },
    ],
    numericalTolerance: 0.000000001,
  }],
  assessments: [{
    id: 'circuit-mastery',
    objectiveId: 'objective-relate-current-resistance',
    prompts: [
      {
        id: 'circuit-observation',
        kind: 'observation',
        stageId: 'stage-closed-circuit',
        question: 'What changes when the switch closes?',
        options: [
          { id: 'flow-and-light', label: 'Current flows and the bulb lights' },
          { id: 'resistance-vanishes', label: 'The resistor disappears' },
        ],
        acceptedEvidenceIds: ['flow-and-light'],
        hint: 'Watch both the blue markers and the bulb.',
        explanation: 'Closing the switch completes the path, so current flows.',
        retryPolicy: 'afterObservation',
      },
      {
        id: 'circuit-misconception',
        kind: 'misconception',
        stageId: 'stage-changing-resistance',
        question: 'At fixed voltage, does higher resistance increase current?',
        options: [
          { id: 'increase', label: 'Yes, current increases' },
          { id: 'decrease', label: 'No, current decreases' },
        ],
        acceptedEvidenceIds: ['decrease'],
        hint: 'Compare the ammeter reading for 10 Ω and 200 Ω.',
        explanation: 'I = V/R, so increasing resistance lowers current.',
        retryPolicy: 'immediateWithHint',
      },
      {
        id: 'circuit-transfer',
        kind: 'transfer',
        stageId: 'stage-ohms-law',
        question: 'A 9 V circuit changes from 50 Ω to 200 Ω. What happens?',
        options: [
          { id: 'quarter-current', label: 'Current becomes one quarter as large' },
          { id: 'four-times-current', label: 'Current becomes four times larger' },
        ],
        acceptedEvidenceIds: ['quarter-current'],
        hint: 'Resistance is multiplied by four while voltage stays fixed.',
        explanation: 'Because I = V/R, four times the resistance gives one quarter the current.',
        retryPolicy: 'immediateWithHint',
      },
    ],
    masteryRule: {
      requiredEvidenceCount: 3,
      requiredKinds: ['observation', 'misconception', 'transfer'],
      allowHintedMastery: true,
    },
  }],
  assetManifests: [{
    id: 'circuit-assets',
    assets: [
      ...textureAssets,
      {
        id: 'workshop-environment',
        url: `${TEXTURE_ROOT}/workshop-environment.svg`,
        kind: 'environment',
        source: 'XR School procedural workshop environment',
        license: ASSET_LICENSE,
        author: 'XR School',
        width: 1024,
        height: 512,
        channels: ['baseColor'],
        compression: 'SVG procedural',
      },
    ],
  }],
  acceptanceProfiles: [{
    id: 'circuit-acceptance',
    requiredQualityProfileId: 'questBaseline',
    minSteadyFps: 72,
    maxDrawCalls: 120,
    maxVisibleTriangles: 250_000,
    requiresQuestAcceptance: true,
  }],
  lessonSequenceIds: ['circuit-four-stage-lesson'],
  systemIds: ['electricity', 'lesson', 'presentation'],
};
