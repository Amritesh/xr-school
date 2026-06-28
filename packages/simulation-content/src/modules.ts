import type { SimulationModuleRecord } from '../../simulation-schema/src/index';

const pollinationScript = `SETUP
Ask the class why flowers are brightly coloured and what might move pollen between plants. Non-headset students sketch a flower and predict where pollen travels.

DURING HEADSET BATCH
Guide students through the garden stages: flower parts, pollen, pollinator arrival, cross-pollination, fertilisation, seed formation, germination, and new plant growth. Pause when pollination and fertilisation are contrasted.

DEBRIEF
Ask students to sequence the process and explain why pollination is not the same as fertilisation. Connect the VR stages to the textbook flower diagram.

REVISION TRIGGER
One week later, show a flower diagram and ask students to identify the stage where pollen transfer happens and the stage where seed formation begins.`;

const circuitScript = `SETUP
Show a simple circuit diagram and ask students to predict what happens when the switch opens and closes. Non-headset students calculate current for 9V with 10 ohm, 50 ohm, and 200 ohm resistors.

DURING HEADSET BATCH
Have students toggle the switch, observe electron flow, change resistance, and compare current with bulb brightness. Pause at each resistor change for a predict-observe-explain prompt.

DEBRIEF
Ask why the bulb becomes dimmer when resistance increases. Connect the visible electron flow to Ohm's Law, V = I x R.

REVISION TRIGGER
In the next session, give one new resistor value and ask students to predict current and relative brightness before calculating.`;

const statesOfMatterScript = `SETUP
Ask students what changes when ice becomes water and water becomes vapour. Non-headset students predict how particle spacing and speed differ in solids, liquids, and gases.

DURING HEADSET BATCH
Guide students through solid, liquid, gas, and phase-change stages. Ask them to adjust heat and observe particle motion, spacing, shape, and container behaviour.

DEBRIEF
Compare the three particle arrangements and ask why gases fill the container while solids keep their shape. Connect observations to kinetic particle theory.

REVISION TRIGGER
One week later, show particle diagrams and ask students to identify the state and explain what heating or cooling would do next.`;

const sourcesOfFoodScript = `SETUP
Ask students to name foods from their last meal and predict whether each came mainly from a plant, an animal, or fungi. Non-headset students prepare a three-column sorting table.

DURING HEADSET BATCH
Guide students through the pantry, farm, dairy, and market stations. Ask them to inspect each food token, place it on the correct source platform, and explain the visible clue before confirming.

DEBRIEF
Review any misplaced foods and separate everyday food names from biological source categories. Connect grains, pulses, fruits, milk, eggs, honey, and mushrooms to their living sources.

REVISION TRIGGER
One week later, give a mixed meal and ask students to classify every ingredient by source and justify one tricky example.`;

const solubilityScript = `SETUP
Place salt, sugar, sand, chalk powder, and oil on a table and ask students to predict which will dissolve in water. Non-headset students prepare a predict-observe-explain table.

DURING HEADSET BATCH
Guide students through each safe virtual trial. Ask them to choose a substance, make a prediction, add it to water, stir, and observe whether the mixture becomes clear, cloudy, settled, or separated.

DEBRIEF
Compare soluble and insoluble substances and separate dissolving from melting, floating, and simply disappearing. Ask students why sand remains visible while salt does not.

REVISION TRIGGER
One week later, show a new material and ask students to predict solubility, state the evidence they would look for, and describe a fair test.`;

export const POLLINATION_MODULE: SimulationModuleRecord = {
  id: 'sim-pollination-001',
  slug: 'pollination',
  title: 'Plant Pollination & Growth Cycle',
  summary: 'Walk through a flowering garden. Watch pollen transfer, seed formation, germination, and a full plant life cycle unfold in immersive VR.',
  gradeBands: ['class6To8', 'class9To10'],
  subjects: ['biology', 'environmentalScience'],
  applicableBoards: ['cbse', 'icse'],
  curriculumMapIds: ['cm-biology-pollination-class6to8', 'cm-biology-plant-reproduction-class9to10'],
  conceptIds: ['concept-flower-structure', 'concept-pollination', 'concept-fertilisation', 'concept-seed-germination'],
  simulationFormat: 'immersiveVr',
  evidenceConfidenceLevel: 'expertDesigned',
  xrFitType: 'strongVrFit',
  xrFitJustification: 'Pollination occurs at a scale and speed students cannot witness directly in class. VR lets them stand inside a living garden, follow pollen transfer spatially, and see the hidden transition from pollination to fertilisation and seed formation.',
  learningObjective: 'Students will be able to sequence the 8 stages of plant reproduction from pollen production through germination.',
  scientificConceptExplanation: 'Flowering plants reproduce when pollen from the stamen reaches a stigma, enabling fertilisation inside the ovary. The fertilised ovule becomes a seed, and the seed can germinate into a new plant when conditions are suitable.',
  misconceptionsAddressed: ['Pollination and fertilisation are the same event.', 'A seed appears as soon as pollen touches a flower.', 'Pollinators help only animals, not plants.'],
  visualizationStrategy: 'Use a 360-degree garden with enlarged pollen particles, a close pollinator path, and progressive underground seed and seedling stages.',
  interactionStrategy: 'Students advance through eight guided stages, inspect flowers from inside the garden, and use cue cards to compare pollination, fertilisation, seed formation, and germination.',
  imaginationHelperStrategy: 'Invisible pollen transfer is rendered as visible golden particles moving between flower structures.',
  cueCardIds: ['cue-pollination-001', 'cue-pollination-002', 'cue-pollination-003', 'cue-pollination-004', 'cue-pollination-005', 'cue-pollination-006', 'cue-pollination-007', 'cue-pollination-008'],
  revisionCardIds: ['rev-pollination-sequence-001'],
  assessmentHookIds: ['assess-pollination-pre-001', 'assess-pollination-post-001', 'assess-pollination-misconception-001'],
  instructorScript: pollinationScript,
  batchActivityPrompt: 'Draw and label a flower, then mark where pollen starts, where it lands, and where the seed begins forming.',
  expectedDurationMinutes: 10,
  maxSessionDurationMinutes: 12,
  comfortRiskLevel: 'low',
  safetyNotes: ['Use seated or stationary play.', 'Ask students to pause if the close pollinator movement feels uncomfortable.'],
  offlineContentPackId: 'pack-science-plant-reproduction-v1',
  estimatedPackageSizeMb: 260,
  targetFrameRateFps: 72,
  minQuestStorageGb: 1,
  stages: 8,
  status: 'released',
};

export const CIRCUIT_MODULE: SimulationModuleRecord = {
  id: 'sim-circuit-001',
  slug: 'circuit',
  title: "Electric Circuits & Resistance (Ohm's Law)",
  summary: 'Toggle a switch, swap resistors, and watch electrons flow in real time. Discover V=IR through direct interaction with a 3D circuit.',
  gradeBands: ['class6To8', 'class9To10'],
  subjects: ['physics'],
  applicableBoards: ['cbse', 'icse'],
  curriculumMapIds: ['cm-physics-electricity-class6to8', 'cm-physics-ohms-law-class9to10'],
  conceptIds: ['concept-electric-current', 'concept-closed-circuit', 'concept-resistance', 'concept-ohms-law'],
  simulationFormat: 'interactive3d',
  evidenceConfidenceLevel: 'expertDesigned',
  xrFitType: 'strongVrFit',
  xrFitJustification: 'Electric current is invisible in classroom circuits, so students often memorize symbols without understanding flow. VR renders current as visible moving particles and gives immediate feedback between resistance, current, and bulb brightness.',
  learningObjective: "Students will apply Ohm's Law (V=IR) to predict how changing resistance affects current and explain observations in a series circuit.",
  scientificConceptExplanation: 'A closed circuit provides a complete path for charge flow. For a fixed voltage source, current decreases as resistance increases according to I = V / R, reducing the energy delivered to the bulb filament.',
  misconceptionsAddressed: ['Current is used up by the bulb.', 'A switch creates current instead of completing a path.', 'Higher resistance makes current move faster.'],
  visualizationStrategy: 'Use a workbench circuit where electrons, switch state, resistor values, bulb brightness, and the Ohm calculation are visible at the same time.',
  interactionStrategy: 'Students toggle a switch and select resistor values while observing the resulting current, bulb brightness, and equation update.',
  imaginationHelperStrategy: 'Invisible electron flow is rendered as moving blue particles around the circuit loop.',
  practicalUseCase: 'Connects textbook circuit diagrams to torches, chargers, household wiring, and safe troubleshooting.',
  cueCardIds: ['cue-circuit-001', 'cue-circuit-002', 'cue-circuit-003', 'cue-circuit-004'],
  revisionCardIds: ['rev-circuit-ohms-law-001'],
  assessmentHookIds: ['assess-circuit-pre-001', 'assess-circuit-post-001', 'assess-circuit-misconception-001'],
  instructorScript: circuitScript,
  batchActivityPrompt: 'Complete a circuit table for three resistor values: predict current, observe brightness, and explain the trend.',
  expectedDurationMinutes: 8,
  maxSessionDurationMinutes: 10,
  comfortRiskLevel: 'low',
  safetyNotes: ['Use stationary workbench mode.', 'Remind students this is a conceptual circuit model, not permission to handle live mains electricity.'],
  offlineContentPackId: 'pack-science-electricity-v1',
  estimatedPackageSizeMb: 220,
  targetFrameRateFps: 72,
  minQuestStorageGb: 1,
  stages: 4,
  status: 'released',
};

export const STATES_OF_MATTER_MODULE: SimulationModuleRecord = {
  id: 'sim-c09-ch01-a02-states-of-matter',
  slug: 'c9-ch01-a02-states-of-matter',
  title: 'States of Matter Particle Lab',
  summary: 'Manipulate heat in a particle chamber and watch solids, liquids, and gases change motion, spacing, shape, and volume.',
  gradeBands: ['class9To10'],
  subjects: ['chemistry', 'physics'],
  applicableBoards: ['cbse', 'icse'],
  curriculumMapIds: ['cm-cbse-c9-ch01-states-of-matter'],
  conceptIds: ['concept-states-of-matter', 'concept-particle-motion', 'concept-phase-change'],
  simulationFormat: 'interactive3d',
  evidenceConfidenceLevel: 'expertDesigned',
  xrFitType: 'strongVrFit',
  xrFitJustification: 'Particle motion and spacing are invisible in ordinary classroom demonstrations, so students often memorize state properties without a mental model. A VR particle chamber makes microscopic motion visible and lets students connect heating, cooling, shape, volume, and phase change in one manipulable scene.',
  learningObjective: 'Students will compare solid, liquid, and gas particle behaviour and predict how heating or cooling changes state.',
  scientificConceptExplanation: 'Matter is made of particles whose arrangement and kinetic energy determine observable state. Solids have tightly packed particles vibrating in place, liquids have nearby particles that flow past one another, and gases have fast particles spread far apart.',
  misconceptionsAddressed: ['Particles in solids do not move.', 'Heating creates new particles instead of increasing kinetic energy.', 'Gas particles float upward because they are weightless.'],
  visualizationStrategy: 'Use a transparent chamber with animated particles, a heat slider, state labels, and side-by-side particle spacing cues.',
  interactionStrategy: 'Students switch between guided stages and adjust heating or cooling to observe particle speed, spacing, and container behaviour.',
  imaginationHelperStrategy: 'Microscopic particles are enlarged and colour-coded so students can see motion patterns that are normally invisible.',
  practicalUseCase: 'Connects melting, boiling, condensation, evaporation, weather, cooking, and storage of materials.',
  cueCardIds: ['cue-states-matter-001', 'cue-states-matter-002', 'cue-states-matter-003', 'cue-states-matter-004'],
  revisionCardIds: ['rev-states-matter-particles-001'],
  assessmentHookIds: ['assess-states-matter-pre-001', 'assess-states-matter-post-001', 'assess-states-matter-misconception-001'],
  instructorScript: statesOfMatterScript,
  batchActivityPrompt: 'Draw three particle boxes for solid, liquid, and gas, then write what happens to speed and spacing when heat is added.',
  expectedDurationMinutes: 10,
  maxSessionDurationMinutes: 12,
  comfortRiskLevel: 'low',
  safetyNotes: ['Use stationary chamber mode.', 'Avoid rapid camera movement; particles move inside the chamber while the student remains still.'],
  offlineContentPackId: 'pack-science-matter-class9-v1',
  estimatedPackageSizeMb: 240,
  targetFrameRateFps: 72,
  minQuestStorageGb: 1,
  stages: 4,
  status: 'released',
};

export const SOURCES_OF_FOOD_MODULE: SimulationModuleRecord = {
  id: 'sim-c06-ch01-a01-sources-of-food',
  slug: 'c6-ch01-a01-sources-of-food',
  title: 'Sources of Food Sorting Lab',
  summary: 'Sort common foods by source in a 3D pantry and learn how plant, animal, and fungal sources appear in everyday meals.',
  gradeBands: ['class6To8'],
  subjects: ['science', 'biology'],
  applicableBoards: ['cbse', 'icse'],
  curriculumMapIds: ['cm-cbse-c6-ch01-food-sources'],
  conceptIds: ['concept-food-sources', 'concept-plant-products', 'concept-animal-products', 'concept-edible-fungi'],
  simulationFormat: 'interactive3d',
  evidenceConfidenceLevel: 'expertDesigned',
  xrFitType: 'strongVrFit',
  xrFitJustification: 'Students often memorize examples without seeing that meals are made from ingredients with different biological origins. A spatial sorting board lets them inspect food tokens, group them by source, and immediately correct common confusions such as mushroom, honey, milk, and grain sources.',
  learningObjective: 'Students will classify everyday foods by plant, animal, or fungal source and justify the classification using observable clues.',
  scientificConceptExplanation: 'Food materials come from living sources. Plant sources include grains, pulses, fruits, vegetables, oils, and spices; animal sources include milk, eggs, meat, fish, and honey; fungi such as mushrooms form a separate living group often used as food.',
  misconceptionsAddressed: ['All non-green foods come from animals.', 'Milk and honey come from plants because they are sold with other groceries.', 'Mushrooms are plants.'],
  visualizationStrategy: 'Use a 3D market table with source platforms, enlarged food tokens, source icons, and feedback beams that connect each item to its origin.',
  interactionStrategy: 'Students inspect each item, choose a source platform, receive immediate feedback, and repeat until all foods are classified with a final misconception review.',
  imaginationHelperStrategy: 'Invisible origin information is made visible by showing each food token beside its source environment: field, dairy/animal, or fungal growth patch.',
  practicalUseCase: 'Connects textbook food-source classification to meals, shopping, farming, nutrition discussions, and ingredient labels.',
  cueCardIds: ['cue-food-sources-001', 'cue-food-sources-002', 'cue-food-sources-003', 'cue-food-sources-004'],
  revisionCardIds: ['rev-food-sources-classify-meal-001'],
  assessmentHookIds: ['assess-food-sources-pre-001', 'assess-food-sources-post-001', 'assess-food-sources-misconception-001'],
  instructorScript: sourcesOfFoodScript,
  batchActivityPrompt: 'Sort ingredients from a lunch plate into plant, animal, and fungal sources, then explain one item that was difficult.',
  expectedDurationMinutes: 9,
  maxSessionDurationMinutes: 10,
  comfortRiskLevel: 'low',
  safetyNotes: ['Use stationary table mode.', 'Keep feedback visual and audio-light so students can discuss decisions with the instructor.'],
  offlineContentPackId: 'pack-science-food-sources-class6-v1',
  estimatedPackageSizeMb: 140,
  targetFrameRateFps: 72,
  minQuestStorageGb: 1,
  stages: 4,
  status: 'released',
};

export const SOLUBLE_INSOLUBLE_MODULE: SimulationModuleRecord = {
  id: 'sim-c05-ch07-a03-soluble-and-insoluble-substances',
  slug: 'c5-ch07-a03-soluble-and-insoluble-substances',
  title: 'Soluble and Insoluble Substances Lab',
  summary: 'Run safe virtual water-mixing trials and observe which everyday substances dissolve, settle, cloud, or separate.',
  gradeBands: ['class3To5'],
  subjects: ['environmentalScience', 'science'],
  applicableBoards: ['cbse', 'icse'],
  curriculumMapIds: ['cm-cbse-c5-ch07-water-experiments'],
  conceptIds: ['concept-solubility', 'concept-solution', 'concept-mixture-observation'],
  simulationFormat: 'practicalLabSimulation',
  evidenceConfidenceLevel: 'expertDesigned',
  xrFitType: 'strongVrFit',
  xrFitJustification: 'Solubility is easy to demonstrate, but students often miss particle-level evidence and confuse dissolving with melting or disappearing. A resettable XR bench makes repeated trials fast, safe, visible, and discussion-friendly while showing magnified particle behaviour inside the beaker.',
  learningObjective: 'Students will distinguish soluble and insoluble substances in water using prediction, observation, and evidence from repeated trials.',
  scientificConceptExplanation: 'A soluble substance dissolves when its particles spread evenly through water to form a solution. Insoluble substances do not dissolve; they may settle, remain suspended, float, or form a separate layer depending on their properties.',
  misconceptionsAddressed: ['Dissolving means a substance disappears.', 'Any powder will dissolve in water.', 'Floating and dissolving are the same observation.'],
  visualizationStrategy: 'Use a virtual beaker with visible stirring, magnified particle trails, clarity changes, sediment, and separate oil layers for comparison.',
  interactionStrategy: 'Students choose a substance, predict an outcome, run the trial, observe the beaker state, and compare the result with the prediction before resetting.',
  imaginationHelperStrategy: 'Invisible dissolved particles are shown as tiny coloured dots spreading through water while insoluble particles remain visible and settle.',
  practicalUseCase: 'Connects classroom water experiments to cooking, washing, soil, river water, filters, and separating mixtures.',
  cueCardIds: ['cue-solubility-001', 'cue-solubility-002', 'cue-solubility-003', 'cue-solubility-004'],
  revisionCardIds: ['rev-solubility-fair-test-001'],
  assessmentHookIds: ['assess-solubility-pre-001', 'assess-solubility-post-001', 'assess-solubility-misconception-001'],
  instructorScript: solubilityScript,
  batchActivityPrompt: 'Complete a predict-observe-explain table for five substances and write one sentence explaining how dissolving differs from disappearing.',
  expectedDurationMinutes: 8,
  maxSessionDurationMinutes: 10,
  comfortRiskLevel: 'low',
  safetyNotes: ['Use stationary lab bench mode.', 'Reinforce that real experiments should use teacher-approved materials only.'],
  offlineContentPackId: 'pack-evs-water-experiments-class5-v1',
  estimatedPackageSizeMb: 135,
  targetFrameRateFps: 72,
  minQuestStorageGb: 1,
  stages: 4,
  status: 'released',
};

export const SIMULATION_MODULES = [
  POLLINATION_MODULE,
  CIRCUIT_MODULE,
  STATES_OF_MATTER_MODULE,
  SOURCES_OF_FOOD_MODULE,
  SOLUBLE_INSOLUBLE_MODULE,
] as const;
