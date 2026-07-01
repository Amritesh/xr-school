import {
  BROWSER_BALANCED_PROFILE,
  BROWSER_ENHANCED_PROFILE,
  QUEST_BASELINE_PROFILE,
  type AssetDefinition,
  type PbrMaterialDefinition,
  type WorldBundle,
} from '../../../../packages/simulation-schema/src/index';

const TEXTURE_ROOT = '/world-builder/pollination';
const ASSET_SOURCE = 'XR School procedural Pollination texture';
const ASSET_LICENSE = 'XR School self-authored; redistribution permitted';

function textureAsset(
  family: string,
  channel: 'base-color' | 'normal' | 'roughness',
): AssetDefinition {
  return {
    id: `${family}-${channel}`,
    url: `${TEXTURE_ROOT}/${family}-${channel}.svg`,
    kind: 'texture',
    source: ASSET_SOURCE,
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
  options: Partial<PbrMaterialDefinition> = {},
): PbrMaterialDefinition {
  return {
    id,
    model: 'standard',
    baseColor,
    baseColorMap: `${family}-base-color`,
    normalMap: `${family}-normal`,
    normalScale: [0.24, 0.24],
    textureRepeat: [2, 2],
    roughness,
    roughnessMap: `${family}-roughness`,
    metalness: 0,
    ...options,
  };
}

const materials: PbrMaterialDefinition[] = [
  mappedMaterial('soil', 'soil', '#8b5e3c', 0.95, {
    normalScale: [0.48, 0.48],
    textureRepeat: [6, 6],
  }),
  mappedMaterial('stem', 'foliage', '#2f7d38', 0.82, {
    textureRepeat: [1, 4],
  }),
  mappedMaterial('leaf', 'foliage', '#2f9e44', 0.72, {
    doubleSided: true,
  }),
  mappedMaterial('petal-pink', 'petal', '#ec4899', 0.46, {
    doubleSided: true,
  }),
  mappedMaterial('petal-violet', 'petal', '#a855f7', 0.48, {
    doubleSided: true,
  }),
  mappedMaterial('bark', 'bark', '#6b3d14', 0.9, {
    normalScale: [0.42, 0.42],
    textureRepeat: [2, 5],
  }),
  mappedMaterial('bee-yellow', 'bee', '#f59e0b', 0.62),
  mappedMaterial('bee-dark', 'bee', '#1c1917', 0.72),
  mappedMaterial('bee-wing', 'wing', '#dbeafe', 0.22, {
    doubleSided: true,
    opacity: 0.52,
  }),
  mappedMaterial('pollen', 'petal', '#fde68a', 0.7, {
    emissiveColor: '#fbbf24',
    emissiveIntensity: 0.35,
  }),
];

const textureAssets = [
  'soil',
  'foliage',
  'petal',
  'bark',
  'bee',
  'wing',
].flatMap(family => [
  textureAsset(family, 'base-color'),
  textureAsset(family, 'normal'),
  textureAsset(family, 'roughness'),
]);

export const POLLINATION_WORLD: WorldBundle = {
  world: {
    id: 'pollination-reference-world',
    version: '1.0.0',
    title: 'Plant Pollination & Growth Cycle',
    metersPerWorldUnit: 1,
    environmentId: 'pollination-garden',
    qualityProfileIds: [
      'questBaseline',
      'browserBalanced',
      'browserEnhanced',
    ],
    entityIds: [
      'garden',
      'flowers',
      'bee',
      'pollen',
      'seed',
      'seedling',
    ],
    systemIds: ['biology', 'lesson', 'presentation'],
    scientificModelIds: ['pollination-event-graph'],
    lessonSequenceId: 'pollination-eight-stage-lesson',
    assessmentSequenceId: 'pollination-mastery',
    assetManifestId: 'pollination-assets',
    acceptanceProfileId: 'pollination-acceptance',
  },
  entities: [
    {
      id: 'garden',
      visualId: 'procedural-garden',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      materialId: 'soil',
      interactionTags: ['environment'],
      accessibilityLabel: 'Garden floor and surrounding trees',
    },
    {
      id: 'flowers',
      visualId: 'procedural-flower-clusters',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      materialId: 'petal-pink',
      interactionTags: ['inspectable', 'biology'],
      accessibilityLabel: 'Flower clusters with petals, stamens, and pistils',
    },
    {
      id: 'bee',
      visualId: 'procedural-bee',
      transform: {
        position: [0, 1.55, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      materialId: 'bee-yellow',
      interactionTags: ['pollinator', 'biology'],
      accessibilityLabel: 'Bee carrying pollen between flowers',
    },
    {
      id: 'pollen',
      visualId: 'instanced-pollen-grains',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      materialId: 'pollen',
      interactionTags: ['evidence', 'biology'],
      accessibilityLabel: 'Illustrative pollen grains',
    },
    {
      id: 'seed',
      visualId: 'procedural-seed',
      transform: {
        position: [0, -0.35, -0.4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      materialId: 'bark',
      interactionTags: ['stage-result', 'biology'],
      accessibilityLabel: 'Seed formed after fertilisation',
    },
    {
      id: 'seedling',
      visualId: 'procedural-seedling',
      transform: {
        position: [0, -0.3, -0.4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      materialId: 'leaf',
      interactionTags: ['stage-result', 'biology'],
      accessibilityLabel: 'Germinating seedling',
    },
  ],
  environments: [{
    id: 'pollination-garden',
    background: { kind: 'color', value: '#b9e4f2' },
    environmentMap: 'garden-environment',
    fog: { color: '#c5e8f5', near: 18, far: 52 },
    keyLight: {
      kind: 'directional',
      color: '#fff4d6',
      intensity: 3.1,
      position: [8, 14, 5],
      target: [0, 1.2, 0],
      castsShadow: true,
    },
    fillLight: {
      kind: 'hemisphere',
      color: '#b8e7ff',
      intensity: 1.25,
      position: [0, 8, 0],
    },
    accentLights: [{
      kind: 'point',
      color: '#f7c8e8',
      intensity: 4,
      position: [-4, 2.5, -5],
      range: 10,
      decay: 2,
    }],
    shadowCasters: ['flowers', 'bee'],
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
    id: 'pollination-event-graph',
    version: '1.0.0',
    domain: 'biology',
    internalUnits: {},
    validInputRanges: {
      completedStage: { min: 0, max: 7, unit: 'stage' },
    },
    assumptions: [
      'Bee and pollen motion is illustrative',
      'Stage order represents biological causality',
    ],
    limitations: [
      'The model does not represent cellular scale or real event duration',
    ],
    referenceSources: [
      'NCERT Class 7 Science: Reproduction in Plants',
    ],
    referenceVectors: [
      {
        id: 'pollination-before-fertilisation',
        inputs: { completedStage: 3 },
        expectedOutputs: {
          pollenProduced: true,
          pollinatorArrived: true,
          pollenTransferred: true,
          fertilised: false,
          seedFormed: false,
          germinated: false,
          plantMatured: false,
        },
      },
      {
        id: 'fertilisation-enables-seed',
        inputs: { completedStage: 5 },
        expectedOutputs: {
          pollenProduced: true,
          pollinatorArrived: true,
          pollenTransferred: true,
          fertilised: true,
          seedFormed: true,
          germinated: false,
          plantMatured: false,
        },
      },
    ],
    numericalTolerance: 0,
  }],
  assessments: [{
    id: 'pollination-mastery',
    objectiveId: 'objective-distinguish-pollination-fertilisation',
    prompts: [
      {
        id: 'pollination-observation',
        kind: 'observation',
        stageId: 'stage-cross-pollination',
        question: 'What visible evidence shows pollination happened?',
        options: [
          {
            id: 'pollen-on-stigma',
            label: 'Pollen moved from the bee onto another flower’s stigma',
          },
          {
            id: 'petals-opened',
            label: 'The petals opened wider',
          },
        ],
        acceptedEvidenceIds: ['pollen-on-stigma'],
        hint: 'Follow the golden grains from one flower to the next.',
        explanation: 'Pollination is the transfer of pollen to a stigma.',
        retryPolicy: 'afterObservation',
      },
      {
        id: 'pollination-misconception',
        kind: 'misconception',
        stageId: 'stage-fertilisation',
        question: 'Are pollination and fertilisation the same event?',
        options: [
          { id: 'same', label: 'Yes, they are the same' },
          { id: 'different', label: 'No, fertilisation happens later' },
        ],
        acceptedEvidenceIds: ['different'],
        hint: 'First pollen reaches the stigma; then a pollen tube grows.',
        explanation: 'Pollination enables fertilisation, but they are different events.',
        retryPolicy: 'immediateWithHint',
      },
      {
        id: 'pollination-transfer',
        kind: 'transfer',
        stageId: 'stage-cycle-complete',
        question: 'Can pollination happen without a bee?',
        options: [
          { id: 'wind', label: 'Yes, wind can transfer pollen' },
          { id: 'bee-only', label: 'No, only bees can transfer pollen' },
        ],
        acceptedEvidenceIds: ['wind'],
        hint: 'Think about another way pollen could travel through the air.',
        explanation: 'Wind and other pollinators can also transfer pollen.',
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
    id: 'pollination-assets',
    assets: [
      ...textureAssets,
      {
        id: 'garden-environment',
        url: `${TEXTURE_ROOT}/garden-environment.svg`,
        kind: 'environment',
        source: 'XR School procedural Pollination garden environment',
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
    id: 'pollination-acceptance',
    requiredQualityProfileId: 'questBaseline',
    minSteadyFps: 72,
    maxDrawCalls: 120,
    maxVisibleTriangles: 250_000,
    requiresQuestAcceptance: true,
  }],
  lessonSequenceIds: ['pollination-eight-stage-lesson'],
  systemIds: ['biology', 'lesson', 'presentation'],
};
