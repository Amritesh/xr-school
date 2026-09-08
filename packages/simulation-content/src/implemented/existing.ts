import type {
  AssessmentSequence,
  AssetDefinition,
  ExperienceStageDefinition,
  GradeToneProfile,
  ImplementedSimulationDefinition,
  SimulationModuleRecord,
} from '@xr-school/simulation-schema';
import {
  ACID_BASE_MODULE,
  BREATHING_PROCESS_MODULE,
  CIRCUIT_MODULE,
  COLOUR_ADVENTURE_MODULE,
  DIGESTIVE_SYSTEM_MODULE,
  FORCE_MOTION_MODULE,
  MONEY_TOWN_MODULE,
  POLLINATION_MODULE,
  PREPOSITION_ADVENTURE_MODULE,
  SOLAR_SYSTEM_MISSION_MODULE,
  SOURCES_OF_FOOD_MODULE,
  STATES_OF_MATTER_MODULE,
} from '../modules.js';
import { withPackagedNarration } from './narrationAssets.js';

interface StageSeed extends ExperienceStageDefinition {
  narration?: string;
  audioUrl?: string;
}

interface ExistingDefinitionOptions {
  experienceId: string;
  gradeTone: GradeToneProfile;
  stages: StageSeed[];
  assessment?: AssessmentSequence;
  assets?: AssetDefinition[];
  legacyPaths?: string[];
  contribution?: ImplementedSimulationDefinition['contribution'];
}

function stage(
  id: string,
  title: string,
  cue: string,
  requiredActionIds: string[],
  completionEvidenceIds: string[] = [`${id}-completed`],
  narration?: string,
  audioUrl?: string,
): StageSeed {
  return {
    id,
    title,
    cue,
    requiredActionIds,
    completionEvidenceIds,
    ...(narration ? { narration } : {}),
    ...(audioUrl ? { audioUrl } : {}),
  };
}

function automaticStage(
  id: string,
  title: string,
  cue: string,
  narration?: string,
): StageSeed {
  return {
    ...stage(id, title, cue, [], []),
    completionMode: 'automatic',
    ...(narration ? { narration } : {}),
  };
}

interface PackagedSvgIntegrity {
  sha256: string;
  byteSize: number;
}

const POLLINATION_SVG_INTEGRITY = {
  'bark-base-color.svg': ['deacf8420664051ca867ba554cdd9ead2d9aea19c0e9e2109a773c5260bbb55a', 538],
  'bark-normal.svg': ['0e3c663ebc80c8104a227cbf5676d3c3ae58a296cf4d61d3bdf62bf5a8ed9f25', 333],
  'bark-roughness.svg': ['3ce4646e99628b7c97a6199f62dc737ebcfd176d164d13f98732bd98383952c4', 330],
  'bee-base-color.svg': ['43adfeb48da0b4e5b1da306cf18cd729da0d4a03579fe19682e530262ad6611b', 407],
  'bee-normal.svg': ['a9dd52c51e438d3a8a9f9dfdbc65bf23e571eef87a52e7f54714b57a64744980', 286],
  'bee-roughness.svg': ['d260a29149ade77e8b6b733e4eeb8392b5ef57255a7dae8f3629df7b7466d11b', 286],
  'foliage-base-color.svg': ['8b570a161f6e2c6a9bdab446359e4db97c3cc8d41ea2c24a3e58b5c9ef280723', 507],
  'foliage-normal.svg': ['5cab4602a44895f711fc115cdff7791bfd0b54fef09fd3607690b66cae0006c4', 258],
  'foliage-roughness.svg': ['b38a0fabdae7012543d727bc25157b35460483724351d1283f03588e9bd85382', 286],
  'garden-environment.svg': ['2dc1c663939b15ad1a7aa59f8695caecbe264ceb808b06ff6bc39edc31ce7bbe', 782],
  'petal-base-color.svg': ['96b843d7aa3b4eb17acd708a8ab64665043e8ffc5ff5c582967422501fcd501f', 466],
  'petal-normal.svg': ['3bd4bb7cd21ac6ab7d4fbe70c02f5258e22b29bb242e81d38d6e857d340c63ff', 317],
  'petal-roughness.svg': ['4f3c273b3a65eb8275539cfbc4529007a292911959c02b0143f59610a4a26ef7', 243],
  'soil-base-color.svg': ['7009caffc105679b94e4e26a92ac5310314c5ad47d844042221df118f85316a7', 544],
  'soil-normal.svg': ['7305bff21d6afa409f57a31a195e6d10de58e7cb48e7194b46b95ddfb7fccab2', 289],
  'soil-roughness.svg': ['2a7bca7b1ea379c327310e6573a4b704ab8ebaf49c3d9043709eb95e4bc70928', 288],
  'wing-base-color.svg': ['ae675d2f4655f383fff45b086afb5dc8551125ac708e9f8f8b3e92dc9a5d9aa7', 297],
  'wing-normal.svg': ['01f1c1c4677bd1565cb1567ae7b150a34f348926ae3c737343fb3d5175c74aab', 257],
  'wing-roughness.svg': ['14c5ee1fd88645ca4926e7da68e84403dde522c081e29a66f0d644a30fe5b5a0', 251],
} as const;

const CIRCUIT_SVG_INTEGRITY = {
  'circuit-base-color.svg': ['63d3793b46b1bf3ef3a72ce23127bcb5a10ed45bdbfd7e17a39ae715a3bf3547', 383],
  'circuit-normal.svg': ['1ebd92bd58d2e877e6c229af9c8b69b62c786ac43a0859ce9bfef2138b542651', 246],
  'circuit-roughness.svg': ['e7ae238878f422126906098a949c6a98e6d7faf8eececd73cd8869f2e0c5ca96', 246],
  'copper-base-color.svg': ['2a7e9c1abd0ea623f68132a1743e38293cd3d560c72c81ea1d42696ba1a651f4', 321],
  'copper-normal.svg': ['3da82b234c2398ec19cd1d990f94e11a2bdd416ada9127a43cfec4ae67749eaf', 208],
  'copper-roughness.svg': ['8eb8eea38912a3079a8195c9981e66d235407bbc4e64ae631f2bf99733749d3c', 194],
  'metal-base-color.svg': ['9144226e45073a776df1c79ea50d70554a9d4bb48009597ad8267116abe78548', 335],
  'metal-normal.svg': ['913d9093f431d31247554ff0dd874cae35765c426029971fe7477715cf7bc463', 204],
  'metal-roughness.svg': ['7d60196218ec77ae58951a83dc0531943e7d619d25101bc20d9a8450192682c5', 201],
  'painted-base-color.svg': ['f7f993443d2e972eb7876655b21dc52c207fc547a750c02088a960dd05a306a1', 317],
  'painted-normal.svg': ['1556453802edc0267fbed97dcd26288ed5019e6c2715e015692635f03a7661cc', 284],
  'painted-roughness.svg': ['b7462c9ef37d0195a1e9038ca98dc9f635a781afd8452a7a8a8e89288d668b5c', 219],
  'wood-base-color.svg': ['45ab1a6445dc25fd5253225d2b1e796e0bf66a2be999c784a2d02a0a0b0fdc51', 316],
  'wood-normal.svg': ['a2d369e7d7fb57ea87aa5e69f937f2b22bc7fae106dfec6e89b619609485b459', 333],
  'wood-roughness.svg': ['262d7f3a09a258dfc5ee22fab84c1895fbf115f8cf1fa2ccc6c1814ab387fa83', 245],
  'workshop-environment.svg': ['ef3f170d0b96bec298efc8fb17187a9e307eec97ae5a29b0ef675beaa8a72340', 499],
} as const;

function svgChannels(fileName: string): string[] {
  if (fileName.includes('-normal.')) return ['normal'];
  if (fileName.includes('-roughness.')) return ['roughness'];
  return ['baseColor'];
}

function packagedSvgAsset(
  root: 'pollination' | 'circuit',
  fileName: string,
  integrity: PackagedSvgIntegrity,
  options: { id?: string; source: string },
): AssetDefinition {
  const environment = fileName.includes('environment');
  return {
    id: options.id ?? fileName.replace(/\.svg$/, ''),
    url: `/world-builder/${root}/${fileName}`,
    kind: environment ? 'environment' : 'texture',
    source: options.source,
    license: 'XR School self-authored; redistribution permitted',
    author: 'XR School',
    width: environment ? 1024 : 512,
    height: 512,
    channels: svgChannels(fileName),
    compression: 'SVG procedural',
    sha256: integrity.sha256,
    byteSize: integrity.byteSize,
  };
}

function integrityFrom(
  values: readonly [string, number],
): PackagedSvgIntegrity {
  return { sha256: values[0], byteSize: values[1] };
}

const pollinationAssets = Object.entries(POLLINATION_SVG_INTEGRITY).map(
  ([fileName, values]) => packagedSvgAsset(
    'pollination',
    fileName,
    integrityFrom(values),
    {
      source: fileName === 'garden-environment.svg'
        ? 'XR School procedural Pollination garden environment'
        : 'XR School procedural Pollination texture',
    },
  ),
);

const circuitAssets = Object.entries(CIRCUIT_SVG_INTEGRITY).map(
  ([fileName, values]) => packagedSvgAsset(
    'circuit',
    fileName,
    integrityFrom(values),
    {
      source: fileName === 'workshop-environment.svg'
        ? 'XR School procedural workshop environment'
        : `XR School procedural Circuit ${fileName.split('-')[0]} texture`,
    },
  ),
);

const statesAssets = [
  ['states-painted-base', 'painted-base-color.svg'],
  ['states-painted-normal', 'painted-normal.svg'],
  ['states-painted-roughness', 'painted-roughness.svg'],
  ['states-metal-base', 'metal-base-color.svg'],
  ['states-metal-normal', 'metal-normal.svg'],
  ['states-metal-roughness', 'metal-roughness.svg'],
  ['states-environment', 'workshop-environment.svg'],
].map(([id, fileName]) => packagedSvgAsset(
  'circuit',
  fileName,
  integrityFrom(CIRCUIT_SVG_INTEGRITY[fileName as keyof typeof CIRCUIT_SVG_INTEGRITY]),
  {
    id,
    source: fileName === 'workshop-environment.svg'
      ? 'XR School shared procedural laboratory environment'
      : `XR School shared procedural ${fileName.split('-')[0]} PBR texture`,
  },
));

function smallestHonestAssessment(
  module: SimulationModuleRecord,
  experienceId: string,
  stages: readonly StageSeed[],
): AssessmentSequence {
  const misconceptionStage = stages[Math.max(0, stages.length - 2)];
  const transferStage = stages[stages.length - 1];
  const prefix = module.viewerKey;
  const misconception = module.misconceptionsAddressed[0];
  const useCase = module.practicalUseCase
    ?? `Use the evidence from ${module.title} in a new classroom example.`;

  return {
    id: `${prefix}-internal-qa-assessment`,
    objectiveId: experienceId,
    prompts: [
      {
        id: `${prefix}-misconception`,
        kind: 'misconception',
        stageId: misconceptionStage.id,
        question: `Which answer best corrects this common idea: “${misconception}”?`,
        options: [
          {
            id: `${prefix}-use-observed-evidence`,
            label: `Use the observed stage evidence: ${misconceptionStage.cue}`,
          },
          {
            id: `${prefix}-repeat-misconception`,
            label: misconception,
          },
        ],
        acceptedEvidenceIds: [`${prefix}-use-observed-evidence`],
        hint: 'Return to the visible result from the activity before choosing.',
        explanation: module.scientificConceptExplanation,
        retryPolicy: 'immediateWithHint',
      },
      {
        id: `${prefix}-transfer`,
        kind: 'transfer',
        stageId: transferStage.id,
        question: `How should the evidence from ${module.title} be used here: ${useCase}`,
        options: [
          {
            id: `${prefix}-transfer-with-evidence`,
            label: 'Apply the same observed relationship and explain the evidence.',
          },
          {
            id: `${prefix}-transfer-by-guessing`,
            label: 'Ignore the observations and choose only by appearance.',
          },
        ],
        acceptedEvidenceIds: [`${prefix}-transfer-with-evidence`],
        hint: 'Use the relationship you observed, not an unsupported guess.',
        explanation: `The activity transfers when its observed relationship is used to reason about a new example. ${module.scientificConceptExplanation}`,
        retryPolicy: 'immediateWithHint',
      },
    ],
    masteryRule: {
      requiredEvidenceCount: 2,
      requiredKinds: ['misconception', 'transfer'],
      allowHintedMastery: true,
    },
  };
}

function createExistingDefinition(
  module: SimulationModuleRecord,
  options: ExistingDefinitionOptions,
): ImplementedSimulationDefinition {
  const assessment = options.assessment
    ?? smallestHonestAssessment(module, options.experienceId, options.stages);

  return {
    module,
    kind: 'interactive',
    experience: {
      id: options.experienceId,
      gradeTone: options.gradeTone,
      objective: module.learningObjective,
      stages: options.stages.map(({ narration: _narration, audioUrl: _audioUrl, ...value }) => value),
    },
    assessment,
    narration: {
      id: `${module.viewerKey}-narration`,
      cues: options.stages.map((value) => {
        const text = value.narration ?? `${value.title}. ${value.cue}`;
        return withPackagedNarration({
          id: `${module.viewerKey}-narration-${value.id}`,
          stageId: value.id,
          text,
          caption: text,
          ...(value.audioUrl ? { audioUrl: value.audioUrl } : {}),
        });
      }),
      fallback: 'browserTts',
    },
    assets: {
      id: `${module.viewerKey}-assets`,
      assets: options.assets ?? [],
    },
    legacyPaths: options.legacyPaths ?? [],
    contribution: options.contribution ?? { source: 'existing' },
  };
}

const pollinationStages = [
  stage('stage-flower-garden', 'Inspect the flower', 'Find the petals, pollen-bearing anthers, and pollen-receiving stigma.', ['inspect-flower'], ['flower-parts-identified'], undefined, '/audio/pollination/stage-01.mp3'),
  stage('stage-pollen-production', 'Collect a pollen sample', 'Brush a mature anther and confirm that pollen adheres to the bristles.', ['collect-pollen'], ['pollen-collected-on-brush'], undefined, '/audio/pollination/stage-02.mp3'),
  stage('stage-pollinator-arrival', 'Observe the pollinator', 'Follow the bee and notice which flower features attract it.', ['observe-pollinator'], ['bee-flower-visit-observed'], undefined, '/audio/pollination/stage-03.mp3'),
  stage('stage-cross-pollination', 'Transfer pollen', 'Brush the collected pollen onto the experimental flower’s receptive stigma.', ['transfer-pollen'], ['pollen-on-stigma-observed'], undefined, '/audio/pollination/stage-04.mp3'),
  stage('stage-fertilisation', 'Trace the pollen tube', 'Trace the route from the stigma through the style to the ovule.', ['trace-pollen-tube'], ['fertilisation-route-observed'], undefined, '/audio/pollination/stage-05.mp3'),
  stage('stage-seed-fruit', 'Compare treatment and control', 'Advance the time lapse, then compare the pollinated flower with the untouched control.', ['advance-time-lapse', 'compare-control'], ['treatment-control-difference-observed'], undefined, '/audio/pollination/stage-06.mp3'),
  stage('stage-germination', 'Plant the resulting seed', 'Open the fruit, plant and cover one seed, then add enough water.', ['open-fruit', 'plant-seed', 'cover-seed', 'water-seed'], ['germination-conditions-provided'], undefined, '/audio/pollination/stage-07.mp3'),
  stage('stage-mature-plant', 'Inspect germination', 'Use the soil window to identify the radicle and plumule, then return to the mature plant.', ['inspect-germination'], ['cycle-completion-observed'], undefined, '/audio/pollination/stage-08.mp3'),
];
const pollinationAssessment: AssessmentSequence = {
  id: 'pollination-mastery',
  objectiveId: 'experience-pollination-cycle',
  prompts: [
    {
      id: 'pollination-observation',
      kind: 'observation',
      stageId: 'stage-cross-pollination',
      question: 'What visible evidence shows pollination happened?',
      options: [
        { id: 'pollen-on-stigma', label: 'Pollen moved from the bee onto another flower’s stigma' },
        { id: 'petals-opened', label: 'The petals opened wider' },
      ],
      acceptedEvidenceIds: ['pollen-on-stigma'],
      hint: 'Follow the golden grains from one flower to the next.',
      explanation: 'Pollination is the transfer of pollen to a stigma.',
      retryPolicy: 'immediateWithHint',
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
      stageId: 'stage-mature-plant',
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
};

const circuitStages = [
  stage('stage-open-circuit', 'Open Circuit', 'The switch is open. No current can flow, so the bulb is off.', ['inspect-open-circuit'], ['open-circuit-observed'], 'Open circuit. The switch is open, creating a gap. No current can flow and the bulb stays dark. A circuit must form a complete, unbroken loop for electrons to move.', '/audio/circuit/stage-01.mp3'),
  stage('stage-closed-circuit', 'Closed Circuit', 'Close the switch and watch current flow through the complete circuit.', ['close-switch'], ['current-flow-observed'], 'Closed circuit. The switch is now closed — the path is complete. Electrons flow from the battery through the wire, resistor, and bulb filament and back.', '/audio/circuit/stage-02.mp3'),
  stage('stage-changing-resistance', 'Changing Resistance', 'Change the resistor and compare the current and bulb brightness.', ['select-10-ohm', 'select-50-ohm', 'select-200-ohm'], ['resistance-current-compared'], 'Changing resistance. A higher resistance reduces the current, making the bulb dimmer. This is Ohm’s Law.', '/audio/circuit/stage-03.mp3'),
  stage('stage-ohms-law', 'Ohm’s Law Mastered', 'Use V = IR to connect voltage, current, and resistance.', ['complete-ohms-law'], ['ohms-law-applied'], 'Ohm’s Law. Voltage equals current multiplied by resistance. More resistance gives less current for the same voltage.', '/audio/circuit/stage-04.mp3'),
];

const circuitAssessment: AssessmentSequence = {
  id: 'circuit-mastery',
  objectiveId: 'experience-circuit-ohms-law',
  prompts: [
    {
      id: 'circuit-observation', kind: 'observation', stageId: 'stage-closed-circuit',
      question: 'What changes when the switch closes?',
      options: [{ id: 'flow-and-light', label: 'Current flows and the bulb lights' }, { id: 'resistance-vanishes', label: 'The resistor disappears' }],
      acceptedEvidenceIds: ['flow-and-light'], hint: 'Watch both the blue markers and the bulb.',
      explanation: 'Closing the switch completes the path, so current flows.', retryPolicy: 'immediateWithHint',
    },
    {
      id: 'circuit-misconception', kind: 'misconception', stageId: 'stage-changing-resistance',
      question: 'At fixed voltage, does higher resistance increase current?',
      options: [{ id: 'increase', label: 'Yes, current increases' }, { id: 'decrease', label: 'No, current decreases' }],
      acceptedEvidenceIds: ['decrease'], hint: 'Compare the ammeter reading for 10 Ω and 200 Ω.',
      explanation: 'I = V/R, so increasing resistance lowers current.', retryPolicy: 'immediateWithHint',
    },
    {
      id: 'circuit-transfer', kind: 'transfer', stageId: 'stage-ohms-law',
      question: 'A 9 V circuit changes from 50 Ω to 200 Ω. What happens?',
      options: [{ id: 'quarter-current', label: 'Current becomes one quarter as large' }, { id: 'four-times-current', label: 'Current becomes four times larger' }],
      acceptedEvidenceIds: ['quarter-current'], hint: 'Resistance is multiplied by four while voltage stays fixed.',
      explanation: 'Because I = V/R, four times the resistance gives one quarter the current.', retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: { requiredEvidenceCount: 3, requiredKinds: ['observation', 'misconception', 'transfer'], allowHintedMastery: true },
};

const statesStages = [
  stage('stage-solid', 'Solid', 'Particles stay close together and vibrate in fixed positions.', ['inspect-solid'], ['solid-particles-observed'], undefined, '/audio/states-of-matter/stage-01.mp3'),
  stage('stage-liquid', 'Liquid', 'Particles remain close, but slide past each other and take the container shape.', ['inspect-liquid'], ['liquid-particles-observed'], undefined, '/audio/states-of-matter/stage-02.mp3'),
  stage('stage-gas', 'Gas', 'Particles spread far apart, move quickly, and fill all available space.', ['inspect-gas'], ['gas-particles-observed'], undefined, '/audio/states-of-matter/stage-03.mp3'),
  stage('stage-phase-change', 'Phase Change', 'Add or remove heat and observe how particle energy changes the state.', ['change-heat'], ['phase-change-observed'], undefined, '/audio/states-of-matter/stage-04.mp3'),
];

const statesAssessment: AssessmentSequence = {
  id: 'matter-mastery',
  objectiveId: 'experience-states-of-matter',
  prompts: [
    {
      id: 'matter-observation', kind: 'observation', stageId: 'stage-liquid',
      question: 'What changes from solid to liquid?',
      options: [{ id: 'slide', label: 'Particles remain close but can slide past each other' }, { id: 'vanish', label: 'Particles vanish' }],
      acceptedEvidenceIds: ['slide'], hint: 'Compare spacing and freedom of movement.',
      explanation: 'Liquid particles remain close while moving past one another.', retryPolicy: 'immediateWithHint',
    },
    {
      id: 'matter-misconception', kind: 'misconception', stageId: 'stage-gas',
      question: 'Does heating make the particles themselves grow?',
      options: [{ id: 'grow', label: 'Yes, each particle gets much larger' }, { id: 'move', label: 'No, they move faster and spread farther apart' }],
      acceptedEvidenceIds: ['move'], hint: 'Watch motion and spacing, not marker size.',
      explanation: 'Heating changes particle energy and spacing, not particle size.', retryPolicy: 'immediateWithHint',
    },
    {
      id: 'matter-transfer', kind: 'transfer', stageId: 'stage-phase-change',
      question: 'What should cooling a gas eventually produce?',
      options: [{ id: 'condense', label: 'A liquid, as particles slow and come closer' }, { id: 'faster', label: 'An even faster gas' }],
      acceptedEvidenceIds: ['condense'], hint: 'Reverse the heating sequence.',
      explanation: 'Removing heat can condense a gas into a liquid.', retryPolicy: 'immediateWithHint',
    },
  ],
  masteryRule: { requiredEvidenceCount: 3, requiredKinds: ['observation', 'misconception', 'transfer'], allowHintedMastery: true },
};

const foodStages = [
  stage('stage-inspect', 'Inspect', 'Read the clue on each food token before sorting.', ['inspect-food-tokens'], undefined, undefined, '/audio/food-sources/stage-01.mp3'),
  stage('stage-plant-sources', 'Plant Sources', 'Sort rice, tomato, and dal using their plant-source clues.', ['sort-rice-plant', 'sort-tomato-plant', 'sort-dal-plant'], undefined, undefined, '/audio/food-sources/stage-02.mp3'),
  stage('stage-animal-sources', 'Animal and Fungal Sources', 'Sort milk, egg, honey, fish, and mushroom by their living source.', ['sort-milk-animal', 'sort-egg-animal', 'sort-honey-animal', 'sort-fish-animal', 'sort-mushroom-fungal'], undefined, undefined, '/audio/food-sources/stage-03.mp3'),
  stage('stage-review', 'Review', 'Fix any misplaced tokens and explain one tricky source.', ['review-food-sources'], undefined, undefined, '/audio/food-sources/stage-04.mp3'),
];

const digestiveStages = [
  stage('welcome', 'Welcome to the Human Body', 'Look around the classroom, find the glowing body model, and start the journey.', ['start-journey'], undefined, 'Hello students! Today we are going on an exciting journey inside the human body to discover how food gives us energy.'),
  stage('mouth', 'The Mouth', 'Pick the food, place it on the tongue, and watch the teeth and saliva work together.', ['place-food'], undefined, 'Our journey starts in the mouth. Incisors cut food, canines tear it, and molars grind it into smaller pieces. Saliva mixes with the food so it becomes a soft ball called a bolus.'),
  stage('esophagus', 'Food Pipe (Esophagus)', 'Press each glowing muscle ring from top to bottom to operate peristalsis.', ['peristalsis-wave-1', 'peristalsis-wave-2', 'peristalsis-wave-3'], undefined, 'Now the bolus enters the esophagus, also called the food pipe. Muscles squeeze in waves, called peristalsis, to push food safely toward the stomach.'),
  stage('stomach', 'The Stomach', 'Rotate the mixer wheel three times to churn food with digestive juices.', ['mixer-turn-1', 'mixer-turn-2', 'mixer-turn-3'], undefined, 'The stomach is like a strong mixing bag. It churns food with gastric juices, and the mixture becomes a thick liquid called chyme.'),
  stage('supporting-organs', 'Liver, Gallbladder & Pancreas', 'Touch the liver, gallbladder, and pancreas to activate each explanation.', ['inspect-liver', 'inspect-gallbladder', 'inspect-pancreas'], undefined, 'The liver, gallbladder, and pancreas help digestion. The liver makes bile, the gallbladder stores bile, and the pancreas sends helpful digestive juices.'),
  stage('small-intestine', 'The Small Intestine', 'Drag protein, sugar, and vitamin particles through the villi into the blood vessel.', ['absorb-nutrient-1', 'absorb-nutrient-2', 'absorb-nutrient-3'], undefined, 'Most nutrient absorption happens in the small intestine. Tiny finger-like villi move useful nutrients into the blood.'),
  stage('large-intestine', 'The Large Intestine', 'Collect each glowing water droplet to show water absorption.', ['absorb-water-1', 'absorb-water-2', 'absorb-water-3'], undefined, 'The large intestine absorbs water from what is left. The remaining material becomes more solid and is prepared as waste.'),
  stage('rectum-anus', 'Rectum & Anus', 'Follow the final glowing pathway from storage in the rectum to removal through the anus.', ['trace-final-pathway'], undefined, 'At the end of digestion, waste is stored for a short time in the rectum. Then it leaves the body through the anus.'),
  stage('healthy-habits', 'Healthy Digestion Habits', 'Sort each food and drink into the healthy or limit-often basket.', ['sort-apple-healthy', 'sort-pizza-unhealthy', 'sort-milk-healthy', 'sort-chips-unhealthy', 'sort-banana-healthy', 'sort-burger-unhealthy', 'sort-water-healthy', 'sort-soft-drink-unhealthy'], undefined, 'Healthy digestion needs balanced choices. Foods like apple, banana, milk, and water help the body; other foods and drinks are best limited.'),
  stage('recap', 'Recap Quiz', 'Answer all five questions, then collect your Digestive Explorer badge.', ['complete-digestive-recap'], undefined, 'You have travelled with food through the digestive system. Now answer five quick questions and collect your Digestive Explorer badge.'),
];

const breathingStages = [
  stage('stage-airway', 'Follow the airway', 'Trace the path air takes from the nose or mouth, down the windpipe, into the two bronchi.', ['inspect-airway'], ['airway-path-identified']),
  stage('stage-lungs-diaphragm', 'Find the lungs and diaphragm', 'Locate the two lungs inside the rib cage, then find the diaphragm muscle beneath them.', ['inspect-lungs', 'inspect-diaphragm'], ['lungs-diaphragm-identified']),
  stage('stage-inhale', 'Breathe in', 'Contract the diaphragm and watch it flatten and move down as the rib cage lifts and air rushes in.', ['trigger-inhale'], ['inhale-mechanics-observed']),
  stage('stage-exhale', 'Breathe out', 'Relax the diaphragm and watch it dome upward as the rib cage falls and air flows back out.', ['trigger-exhale'], ['exhale-mechanics-observed']),
  stage('stage-alveoli', 'Zoom into the alveoli', 'Enter the enlarged cutaway to see the tiny air sacs where gases are exchanged.', ['inspect-alveoli'], ['gas-exchange-observed']),
  stage('stage-compare', 'Compare inhale and exhale', 'Contrast rib position, diaphragm shape, and lung volume in each phase.', ['compare-breathing-cycle'], ['breathing-cycle-compared']),
];

const forceStages = [
  stage('stage-push', 'Push a resting ball into motion', 'Apply a push to the ball at rest and watch it start rolling.', ['apply-push'], ['motion-started']),
  stage('stage-brake', 'Stop a moving ball', 'Apply the brake to the rolling ball and watch it come to rest.', ['apply-brake'], ['motion-stopped']),
  stage('stage-accelerate', 'Speed up a moving ball', 'Apply a stronger push to a rolling ball and watch it speed up.', ['apply-accelerate'], ['speed-increased']),
  stage('stage-deflect', 'Change the direction of a moving ball', 'Apply a sideways push to the rolling ball and watch its path curve.', ['apply-deflect'], ['direction-changed']),
  stage('stage-shape', 'Change the shape of an object', 'Squeeze the ball between the plates, then release it and see whether it springs back.', ['squeeze-ball', 'release-ball'], ['shape-changed']),
  stage('stage-compare', 'Compare the effects of force', 'Review how force changed motion and shape.', ['compare-motion-effects'], ['effects-compared']),
];

const acidBaseStages = [
  stage('stage-test-acid', 'Test the acid with litmus', 'Dip red and blue litmus into the acidic solution and see which paper changes colour.', ['test-acid-litmus'], ['acid-identified']),
  stage('stage-test-base', 'Test the base with litmus', 'Switch to the basic solution and dip the litmus again.', ['test-base-litmus'], ['base-identified']),
  stage('stage-indicator', 'Read the pH with a universal indicator', 'Add indicator and match the solution colour to the pH scale.', ['add-indicator'], ['ph-colour-observed']),
  stage('stage-neutralise', 'Neutralise the acid', 'Add base drop by drop and watch the pH climb toward 7.', ['add-base'], ['neutralisation-observed']),
  stage('stage-compare', 'Compare acid, neutral, and base', 'Review the pH scale comparing the acidic start, neutral product, and basic solution.', ['compare-solutions'], ['comparison-recorded']),
];

const colourStages = [
  stage('intro', 'Magical Colour Classroom', 'Touch the rainbow star to begin.', ['start-colour-adventure'], undefined, "Hello, my little friend! Welcome to our colourful classroom. Today we are going to learn about colours. Colours are everywhere around us. Can you find them? Let's begin our colourful adventure!"),
  stage('learn-red', 'Red World', 'Touch the Red balloon and watch the Red objects glow.', ['touch-red-balloon'], undefined, 'This is RED. Red is the colour of apples. Can you say RED? Touch the glowing Red balloon to fill the room with Red.'),
  stage('learn-blue', 'Blue World', 'Touch the Blue balloon and watch the Blue objects glow.', ['touch-blue-balloon'], undefined, 'This is BLUE. Blue is the colour of the sky. Touch the glowing Blue balloon to fill the room with Blue.'),
  stage('learn-yellow', 'Yellow World', 'Touch the Yellow balloon and watch the Yellow objects glow.', ['touch-yellow-balloon'], undefined, 'This is YELLOW. Yellow is bright like the sun. Touch the glowing Yellow balloon to fill the room with Yellow.'),
  stage('learn-green', 'Green World', 'Touch the Green balloon and watch the Green objects glow.', ['touch-green-balloon'], undefined, 'This is GREEN. Green is the colour of leaves and grass. Touch the glowing Green balloon to fill the room with Green.'),
  stage('learn-orange', 'Orange World', 'Touch the Orange balloon and watch the Orange objects glow.', ['touch-orange-balloon'], undefined, 'This is ORANGE. Orange is the colour of pumpkins. Touch the glowing Orange balloon to fill the room with Orange.'),
  stage('learn-purple', 'Purple World', 'Touch the Purple balloon and watch the Purple objects glow.', ['touch-purple-balloon'], undefined, 'This is PURPLE. Purple can be found in grapes and flowers. Touch the glowing Purple balloon to fill the room with Purple.'),
  stage('learn-pink', 'Pink World', 'Touch the Pink balloon and watch the Pink objects glow.', ['touch-pink-balloon'], undefined, 'This is PINK. Pink is soft and cheerful. Touch the glowing Pink balloon to fill the room with Pink.'),
  stage('learn-brown', 'Brown World', 'Touch the Brown balloon and watch the Brown objects glow.', ['touch-brown-balloon'], undefined, 'This is BROWN. Brown is the colour of chocolate and wood. Touch the glowing Brown balloon to fill the room with Brown.'),
  stage('learn-black', 'Black World', 'Touch the Black balloon and watch the Black objects glow.', ['touch-black-balloon'], undefined, 'This is BLACK. Black is the colour of the night sky. Touch the glowing Black balloon to fill the room with Black.'),
  stage('learn-white', 'White World', 'Touch the White balloon and watch the White objects glow.', ['touch-white-balloon'], undefined, 'This is WHITE. White is the colour of clouds and snow. Touch the glowing White balloon to fill the room with White.'),
  stage('find-colours', 'Find the Colour', 'Find red, blue, yellow, green, orange, purple, pink, brown, black, and white.', ['find-red', 'find-blue', 'find-yellow', 'find-green', 'find-orange', 'find-purple', 'find-pink', 'find-brown', 'find-black', 'find-white'], undefined, "Now let's play a game! Find the colour I ask. Touch each correct object and earn rainbow stars."),
  stage('memory-check', 'Colour Memory Game', 'Answer ten simple object-colour questions.', ['complete-memory-check'], undefined, "Let's see how well you remember colours. Look at the object and choose the matching colour. If you miss, that's okay. Let's try again."),
  automaticStage('celebration', 'Rainbow Celebration', 'Wave goodbye and view your Colour Explorer star.', 'Amazing! You have learned many beautiful colours today. Now you can find colours all around you. Keep looking, keep learning, and keep smiling.'),
];

const moneyStages = [
  stage('intro', 'Welcome to Money Town', 'Touch the glowing piggy bank button to enter Money Town.', ['enter-money-town'], undefined, 'Hello, my little friend! Welcome to Money Town. We use money to buy toys, fruits, chocolates, and books. Today we will learn about coins and currency notes.'),
  stage('learn-coins', 'Learning Coins', 'Pick up each glowing coin.', ['grab-coin-rs-1', 'grab-coin-rs-2', 'grab-coin-rs-5', 'grab-coin-rs-10'], undefined, 'Coins are round and made of metal. Pick up the One Rupee, Two Rupee, Five Rupee, and Ten Rupee coins one by one.'),
  stage('learn-notes', 'Learning Currency Notes', 'Touch each floating note.', ['touch-note-rs-10', 'touch-note-rs-20', 'touch-note-rs-50', 'touch-note-rs-100', 'touch-note-rs-200', 'touch-note-rs-500'], undefined, 'Currency notes are made of paper. Touch the Ten, Twenty, Fifty, One Hundred, Two Hundred, and Five Hundred Rupee notes.'),
  stage('coins-vs-notes', 'Coins vs Notes', 'Select the coin side and then the note side.', ['select-coin-side', 'select-note-side'], undefined, 'Coins are round, metal, and small. Notes are paper, rectangular, and foldable. Coins and notes are both money.'),
  stage('identify-money', 'Coins and Currency Identification', 'Answer all five identification rounds.', ['identify-find-rs-1-coin', 'identify-find-rs-10-coin', 'identify-find-rs-20-note', 'identify-find-rs-100-note', 'identify-find-rs-500-note'], undefined, 'Now let us play a fun game. Look carefully and select the correct coin or note.'),
  stage('shopping-challenge', 'Shopping Challenge', 'Buy the apple, balloon, and candy with the correct money.', ['buy-fruit-apple', 'buy-balloon', 'buy-candy'], undefined, 'Look at each price sign, choose the matching money, and buy the item.'),
  stage('memory-check', 'Memory Check on Coins and Currency', 'Answer eight simple money questions.', ['complete-money-memory-check'], undefined, 'Let us see how much you remember. Choose the answer that matches the money or the question.'),
  automaticStage('celebration', 'Money Explorer Celebration', 'View your Money Explorer star.', 'Fantastic! You have learned about coins and currency. Now you know that money helps us buy the things we need.'),
];

const prepositionStages = [
  stage('intro', 'English Adventure Begins', 'Touch the rainbow book to begin.', ['start-preposition-adventure'], undefined, 'Hello, little explorer! Today we are going to discover prepositions. Prepositions tell us where people, animals, and objects are.'),
  stage('learn-prepositions', 'Learn Prepositions', 'Complete each glowing object placement.', ['place-ball-on-table', 'move-ball-under-table', 'put-book-in-bag', 'place-teddy-inside-box', 'move-teddy-outside-box', 'fly-bird-above-tree', 'swim-fish-below-bridge', 'hide-cat-behind-chair', 'stand-puppy-in-front-of-house', 'place-book-next-to-pencil', 'move-rabbit-near-carrot', 'place-football-between-boxes', 'fly-airplane-over-house'], undefined, 'Let us learn one preposition at a time. Watch the object, listen carefully, and place it in the correct position.'),
  stage('preposition-practice', 'Preposition Practice', 'Answer all eight placement challenges.', ['complete-practice-on', 'complete-practice-inside', 'complete-practice-under', 'complete-practice-behind', 'complete-practice-next-to', 'complete-practice-over', 'complete-practice-between', 'complete-practice-above'], undefined, 'Let us play a game. I will tell you where to place the object. Try your best, and try again if you miss.'),
  stage('memory-check', 'Memory Check in Prepositions', 'Answer six position-scene questions.', ['complete-preposition-memory-check'], undefined, 'Look at each scene and choose the correct preposition.'),
  automaticStage('celebration', 'English Champion Celebration', 'View your Preposition Explorer badge.', 'Amazing! Today you learned many prepositions. Now you know how to tell where objects are.'),
];

const solarNarrations = [
  'You are drifting above the plane of the solar system, and nothing out here stands still. Eight worlds are circling one ordinary star. Find the body every path bends around, and select it.',
  'This is the engine of the whole system: gravity. Power the gravity lens and watch how the Sun’s pull is fierce up close and fades far away.',
  'Mercury, Earth, and Mars are lined up for one full lap of the Sun. Lock in your prediction, then trust the lap board.',
  'Mercury hugs the Sun, so it must be the hottest world. Or is it? Choose your suspect, then probe Mercury and Venus.',
  'Cross the asteroid belt into giant country and inspect Jupiter, Saturn, Uranus, and Neptune up close.',
  'Every poster squeezes the distances. Pull the lever and let the solar system stretch to its honest proportions, then find Earth.',
  'A comet is falling toward the Sun. Before you ride alongside, choose which way its tail will point.',
  'A new probe orbits from twice Earth’s distance. Decide whether its year is longer or shorter, then collect your badge.',
];

const solarStages = [
  stage('stage-arrival', 'A system in motion', 'Watch the eight planets move, then select the Sun.', ['inspect-sun'], ['system-observed'], solarNarrations[0]),
  stage('stage-gravity', 'Switch on the gravity lens', 'Power the lens to reveal how the Sun’s pull fades with distance.', ['toggle-gravity-lens'], ['gravity-visualised'], solarNarrations[1]),
  stage('stage-orbit-race', 'The orbit race', 'Predict which planet finishes one orbit first, then confirm the winner.', ['predict-race-winner', 'confirm-race-winner'], ['closer-is-faster'], solarNarrations[2]),
  stage('stage-heat-probe', 'Hunt the hottest world', 'Predict the hottest planet, then probe Mercury and Venus.', ['predict-hottest', 'probe-mercury', 'probe-venus'], ['greenhouse-resolved'], solarNarrations[3]),
  stage('stage-giants', 'Tour of the giants', 'Inspect the signature feature of each outer giant.', ['scan-jupiter', 'scan-saturn', 'scan-uranus', 'scan-neptune'], ['giants-compared'], solarNarrations[4]),
  stage('stage-true-scale', 'The emptiness of space', 'Stretch the orbits to true proportions, then find Earth.', ['pull-scale-lever', 'find-earth'], ['scale-confronted'], solarNarrations[5]),
  stage('stage-comet', 'Ride the comet', 'Predict where the tail points, then ride alongside the comet.', ['predict-comet-tail', 'ride-comet'], ['comet-tail-observed'], solarNarrations[6]),
  stage('stage-debrief', 'Mission debrief', 'Transfer the distance-orbit relationship to a new probe and collect the badge.', ['answer-orbit-transfer', 'collect-badge'], ['transfer-proved'], solarNarrations[7]),
];

function solarTexture(
  id: string,
  source: string,
  license: string,
  author: string,
  width: number,
  height: number,
  sha256: string,
  byteSize: number,
): AssetDefinition {
  return {
    id: `solar-texture-${id}`,
    url: `/solar-system/textures/${id}.webp`,
    kind: 'texture',
    source,
    license,
    author,
    width,
    height,
    channels: ['baseColor'],
    compression: 'WebP',
    sha256,
    byteSize,
  };
}

const nasaUsage = 'NASA Media Usage Guidelines (educational use; no endorsement)';
const solarTextures = [
  solarTexture('sun', 'https://www.solarsystemscope.com/textures/download/2k_sun.jpg', 'CC BY 4.0', 'Solar System Scope, based on NASA imagery', 2048, 1024, '49e6d24484a721a2950efcc3cca4f4cf5522c084a81acdf87d03843a92cda8df', 184076),
  solarTexture('mercury', 'https://maps.jpl.nasa.gov/tmaps/pix/mer0muu2.jpg', nasaUsage, 'Caltech/JPL/USGS, Mariner 10', 1440, 720, '6811e21e5892e607c1c99175e6bb103fedaf356933ebc6b33460760c8e34582b', 112572),
  solarTexture('venus', 'https://maps.jpl.nasa.gov/tmaps/pix/ven0ajj2.jpg', nasaUsage, 'JPL/Caltech, Magellan/Venera/Pioneer', 1440, 720, 'f4ffe620e6a0f35e5d8f97b6e053feb692d61d5f8a3fcd6a345c2b29235d92e7', 156828),
  solarTexture('earth', 'https://maps.jpl.nasa.gov/tmaps/pix/ear0xuu2.jpg', nasaUsage, 'Caltech/JPL/USGS global map', 1440, 720, 'f20c02a5f34867a07002073ec37c723d11b74dc651d233a61edac3b5bc90121f', 245594),
  solarTexture('mars', 'https://maps.jpl.nasa.gov/tmaps/pix/mar0kuu2.jpg', nasaUsage, 'Caltech/JPL/USGS, Viking', 1440, 720, '96e094db15608f1eca0fb99ff8f854204de9297d2cafdf391ac6472b056eda3a', 106060),
  solarTexture('jupiter', 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg', 'CC BY 4.0', 'Solar System Scope, based on NASA imagery', 2048, 1024, '7fcd0929ff8fcdaf3888bd0fc5bc4fc246c1842f3ef5d4dbe16e59602933547b', 90856),
  solarTexture('saturn', 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg', 'CC BY 4.0', 'Solar System Scope, based on NASA imagery', 2048, 1024, '942a1427be1d7ecdfb6c8880e136128b3085bcd5dfb10e6bf381cc28ed0f4bee', 25292),
  solarTexture('uranus', 'https://maps.jpl.nasa.gov/tmaps/pix/ura0fss1.jpg', nasaUsage, 'JPL/Caltech representative atmosphere map', 720, 360, 'c8d2ab5c6604dc9c1c1fedb7570efb50e93369b0f4afcdc35a704f86368e7d51', 570),
  solarTexture('neptune', 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg', 'CC BY 4.0', 'Solar System Scope, based on NASA imagery', 2048, 1024, '952329a980e07b7c17f9522695ce252c0e4dd5a75fe0456cf6a38160f4960c39', 12858),
];

export const EXISTING_IMPLEMENTED_SIMULATIONS: ImplementedSimulationDefinition[] = [
  createExistingDefinition(POLLINATION_MODULE, {
    experienceId: 'experience-pollination-cycle',
    gradeTone: 'class6To8',
    stages: pollinationStages,
    assessment: pollinationAssessment,
    assets: pollinationAssets,
  }),
  createExistingDefinition(CIRCUIT_MODULE, {
    experienceId: 'experience-circuit-ohms-law',
    gradeTone: 'class9To10',
    stages: circuitStages,
    assessment: circuitAssessment,
    assets: circuitAssets,
  }),
  createExistingDefinition(STATES_OF_MATTER_MODULE, {
    experienceId: 'experience-states-of-matter',
    gradeTone: 'class9To10',
    stages: statesStages,
    assessment: statesAssessment,
    assets: statesAssets,
  }),
  createExistingDefinition(SOURCES_OF_FOOD_MODULE, {
    experienceId: 'experience-sources-of-food',
    gradeTone: 'class6To8',
    stages: foodStages,
  }),
  createExistingDefinition(DIGESTIVE_SYSTEM_MODULE, {
    experienceId: 'experience-digestive-system',
    gradeTone: 'class3To5',
    stages: digestiveStages,
  }),
  createExistingDefinition(BREATHING_PROCESS_MODULE, {
    experienceId: 'experience-breathing-process',
    gradeTone: 'class6To8',
    stages: breathingStages,
  }),
  createExistingDefinition(FORCE_MOTION_MODULE, {
    experienceId: 'experience-force-motion',
    gradeTone: 'class6To8',
    stages: forceStages,
  }),
  createExistingDefinition(ACID_BASE_MODULE, {
    experienceId: 'experience-acids-bases',
    gradeTone: 'class9To10',
    stages: acidBaseStages,
  }),
  createExistingDefinition(COLOUR_ADVENTURE_MODULE, {
    experienceId: 'experience-colour-adventure',
    gradeTone: 'class1To2',
    stages: colourStages,
  }),
  createExistingDefinition(MONEY_TOWN_MODULE, {
    experienceId: 'experience-money-town',
    gradeTone: 'class1To2',
    stages: moneyStages,
  }),
  createExistingDefinition(PREPOSITION_ADVENTURE_MODULE, {
    experienceId: 'experience-preposition-adventure',
    gradeTone: 'class1To2',
    stages: prepositionStages,
  }),
  createExistingDefinition(SOLAR_SYSTEM_MISSION_MODULE, {
    experienceId: 'experience-solar-system-mission',
    gradeTone: 'class9To10',
    stages: solarStages,
    assets: solarTextures,
  }),
];
