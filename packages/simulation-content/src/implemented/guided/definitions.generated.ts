import type { GuidedImplementedSimulationInput } from '@xr-school/simulation-schema';
import {
  createGuidedAssessment,
  createGuidedAssetManifest,
  createGuidedLesson,
  createGuidedModuleRecord,
  defineGuidedImplementedSimulation,
  type GuidedStageAuthoring,
} from './builders.js';

export interface GuidedSceneMetadata {
  environmentUrl: string;
  stageOutcomes: Readonly<Record<string, string>>;
  numericEvidence?: Readonly<Record<string, readonly number[]>>;
}

function buildGuidedClass(seed: GuidedClassSeed) {
  const misconceptionStage = seed.stages.find(stage => stage.intent === 'M');
  const transferStage = seed.stages.find(stage => stage.intent === 'T');
  if (!misconceptionStage || !transferStage) throw new Error(`${seed.slug}: assessment stages are required`);
  const stages: GuidedStageAuthoring[] = seed.stages.map(stage => ({
    id: stage.id, title: stage.title, cue: stage.cue, detail: stage.detail,
    actionId: stage.actionId, actionLabel: stage.actionLabel, evidenceId: stage.evidenceId,
    evidenceMode: stage.intent ? 'answer' : 'scene', narrationText: stage.narrationText,
    ...(stage.intent === 'M' ? { misconceptionId: `${seed.viewerKey}:misconception` } : {}),
    ...(stage.intent === 'T' ? { transferPromptId: `${seed.viewerKey}:transfer` } : {}),
    ...(stage.audioKey ? { audioUrl: `/simulations/${seed.slug}/narration/${stage.id}.mp3` } : {}),
    ...(seed.comfort === 'medium' ? { scaleNote: 'Stationary scale model; the camera never follows simulated height or motion.' } : {}),
  }));
  const { guidance, narration } = createGuidedLesson({
    id: seed.viewerKey, moduleId: seed.moduleId, viewerKey: seed.viewerKey, classContext: `CBSE Class ${seed.classLevel} ${seed.subject === 'environmentalScience' ? 'Environmental Science' : 'Science'}`, gradeTone: seed.classLevel <= 5 ? 'class3To5' : 'class6To8', objective: seed.objective, stages,
    completion: { eyebrow: 'Evidence review complete', headline: seed.headline, body: `You recorded the scene evidence, corrected the key misconception, and applied this rule: ${seed.assessments[1].correct}`, actionLabel: 'Review final evidence' },
  });
  const assessment = createGuidedAssessment({
    id: `${seed.viewerKey}:assessment`, objectiveId: guidance.id,
    misconception: { id: `${seed.viewerKey}:misconception`, stageId: misconceptionStage.id, question: seed.assessments[0].question, acceptedEvidenceId: misconceptionStage.evidenceId, acceptedLabel: seed.assessments[0].correct, distractorLabel: seed.assessments[0].distractor, hint: `Compare the visible result at “${misconceptionStage.title}”. The evidence must account for: ${misconceptionStage.detail}`, explanation: `${seed.assessments[0].correct} ${misconceptionStage.detail}` },
    transfer: { id: `${seed.viewerKey}:transfer`, stageId: transferStage.id, question: seed.assessments[1].question, acceptedEvidenceId: transferStage.evidenceId, acceptedLabel: seed.assessments[1].correct, distractorLabel: seed.assessments[1].distractor, hint: `Carry the observed relationship into the new situation: ${transferStage.cue}`, explanation: `${seed.assessments[1].correct} ${transferStage.detail}` },
  });
  const environment = { id: `${seed.moduleId}:environment`, url: `/simulations/${seed.slug}/environment.webp`, source: `PR #8 621dfb61 ${seed.environment}`, license: 'unverified-contributor-supplied', author: 'unverified-contributor-supplied', width: 1774, height: 887, channels: ['baseColor'], compression: 'WebP lossy q75; cwebp 1.6.0 method 6', byteSize: seed.integrity[0], sha256: seed.integrity[1] };
  const audio = seed.stages.flatMap(stage => stage.audioKey ? [{ id: `${seed.moduleId}:narration:${stage.id}`, url: `/simulations/${seed.slug}/narration/${stage.id}.mp3`, source: `PR #8 621dfb61 narration/${stage.audioKey}.mp3`, license: 'unverified-contributor-supplied', author: 'unverified-contributor-supplied', width: 1, height: 1, channels: ['mono'], compression: 'MP3 contributor-supplied', sha256: stage.audioSha256!, byteSize: stage.audioByteSize! }] : []);
  const module = createGuidedModuleRecord({
    id: seed.moduleId, title: seed.title, slug: seed.slug, viewerKey: seed.viewerKey, legacyAliases: [seed.legacyPath.split('/').at(-1)!], summary: seed.objective, gradeBands: [seed.classLevel <= 5 ? 'class3To5' : 'class6To8'], subjects: [seed.subject], curriculumMapIds: [seed.curriculumId], conceptIds: [seed.conceptId], simulationFormat: seed.format, xrFitType: 'strongVrFit', xrFitJustification: 'Spatial evidence, scale, sequence, and viewpoint are clearer in a shared browser and stationary VR model.', learningObjective: seed.objective, scientificConceptExplanation: `${seed.objective} ${seed.assessments[0].correct}`, misconceptionsAddressed: [seed.assessments[0].distractor], visualizationStrategy: `A staged spatial model reveals ${seed.stages.map(stage => stage.title).join(', ')}.`, interactionStrategy: `Learners perform one declared action per stage, observe scene evidence, then resolve misconception and transfer prompts.`, practicalUseCase: seed.assessments[1].correct, cueCardIds: seed.stages.map(stage => `${seed.viewerKey}:cue:${stage.id}`), revisionCardIds: [`${seed.viewerKey}:revision`], assessmentHookIds: [`${seed.viewerKey}:misconception`, `${seed.viewerKey}:transfer`], instructorScript: `Ask learners to predict, perform the declared action, name visible evidence, and justify the answer before continuing.`, batchActivityPrompt: `Compare evidence in pairs, then explain how the final transfer rule follows from the model.`, expectedDurationMinutes: seed.duration, maxSessionDurationMinutes: seed.maxDuration, comfortRiskLevel: seed.comfort, safetyNotes: [seed.safety], estimatedPackageSizeMb: seed.packageSize,
  }, guidance);
  const input: GuidedImplementedSimulationInput = { module, guidance, assessment, narration, assets: createGuidedAssetManifest({ id: `assets:${seed.moduleId}`, environment, audio }), legacyPaths: [seed.legacyPath], contribution: { source: 'pr-8', contributor: 'Aditya K. R. Pandey', sourcePath: `apps/web/components/simulations/${seed.viewer}.tsx` } };
  return { guidance, simulation: defineGuidedImplementedSimulation(input), sceneMetadata: { environmentUrl: environment.url, stageOutcomes: Object.fromEntries(seed.stages.map(stage => [`scene:${stage.id}`, stage.detail])), ...(seed.numericEvidence ? { numericEvidence: seed.numericEvidence } : {}) } satisfies GuidedSceneMetadata };
}

interface GuidedClassSeed {
  name: string; constant: string; viewer: string; slug: string; moduleId: string; viewerKey: string; legacyPath: string; environment: string; title: string; classLevel: number; subject: 'science' | 'environmentalScience'; format: 'interactive3d' | 'guidedVisualization' | 'virtualFieldVisit'; duration: number; maxDuration: number; comfort: 'low' | 'medium'; conceptId: string; curriculumId: string; packageSize: number; headline: string; objective: string; safety: string; integrity: readonly [number, string]; numericEvidence?: Readonly<Record<string, readonly number[]>>; assessments: readonly [{ question: string; correct: string; distractor: string }, { question: string; correct: string; distractor: string }]; stages: readonly { id: string; intent?: 'M' | 'T'; title: string; actionId: string; evidenceId: string; cue: string; detail: string; actionLabel: string; narrationText: string; audioKey?: string; audioSha256?: string; audioByteSize?: number }[];
}

const FOOD_SPOILAGE_SEED = {
    "name": "food-spoilage",
    "constant": "FOOD_SPOILAGE",
    "viewer": "FoodSpoilageViewer",
    "slug": "c5-ch04-a01-food-spoilage",
    "moduleId": "sim-c05-ch04-a01-food-spoilage",
    "viewerKey": "guided-food-spoilage",
    "legacyPath": "/simulations/mangoes-round-the-year-food-spoilage",
    "environment": "food-courtyard-360.png",
    "title": "Food Spoilage",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "low",
    "conceptId": "concept-food-spoilage",
    "curriculumId": "cm-cbse-c5-ch04-food-spoilage",
    "packageSize": 150,
    "headline": "Food-storage investigator",
    "objective": "Compare equal mango samples under four storage conditions and explain observed spoilage rates.",
    "safety": "Never taste investigation samples or smell mould closely; preservation slows spoilage and never makes spoiled food safe.",
    "stages": [
      {
        "id": "setup",
        "title": "Set Up the Investigation",
        "actionId": "set-up-mango-samples",
        "evidenceId": "controlled-samples-observed",
        "cue": "Compare equal mango pieces stored in four different conditions.",
        "detail": "All samples begin fresh so storage is the only condition that changes.",
        "actionLabel": "Observe fresh samples",
        "narrationText": "Welcome to Mangoes Round the Year, Activity 1, Food Spoilage. We will compare equal mango pieces stored in four different conditions."
      },
      {
        "id": "day-zero",
        "title": "Day 0 — Fresh Mango",
        "actionId": "inspect-fresh-mango",
        "evidenceId": "fresh-baseline-observed",
        "cue": "Look for colour, smell, texture and visible growth without tasting anything.",
        "detail": "Fresh mango is yellow-orange, firm and has a pleasant fruity smell.",
        "actionLabel": "Advance to Day 1",
        "narrationText": "On day zero all mango pieces are fresh. Observe colour, smell and texture, but never taste food during a spoilage investigation."
      },
      {
        "id": "day-one",
        "title": "Day 1 — First Changes",
        "actionId": "advance-to-day-one",
        "evidenceId": "early-softening-observed",
        "cue": "The uncovered warm sample begins softening before the protected samples.",
        "detail": "Warmth, air and microorganisms can speed up food spoilage.",
        "actionLabel": "Advance to Day 3",
        "narrationText": "By day one the uncovered mango at room temperature starts softening first. Warmth, air and microorganisms can speed spoilage."
      },
      {
        "id": "day-three",
        "title": "Day 3 — Compare Carefully",
        "actionId": "advance-to-day-three",
        "evidenceId": "mould-comparison-observed",
        "cue": "Notice discoloration and mould on the warm samples. Never smell mould closely.",
        "detail": "The refrigerated and salted samples change more slowly because their conditions hinder microbial growth.",
        "actionLabel": "Advance to Day 5",
        "narrationText": "By day three, discoloration and mould appear on the warmer samples. Refrigeration and salt slow the changes."
      },
      {
        "id": "day-five",
        "intent": "M",
        "title": "Day 5 — Strong Evidence",
        "actionId": "compare-day-five-samples",
        "evidenceId": "preservation-slows-evidence",
        "cue": "The uncovered mango has spoiled most, while cold and salt delayed spoilage.",
        "detail": "Spoilage signs include changed colour, soft or slimy texture, unpleasant odour and mould growth.",
        "actionLabel": "Explain the result",
        "narrationText": "By day five, the uncovered sample shows the strongest spoilage. Changed colour, slimy texture, bad odour and mould are warning signs."
      },
      {
        "id": "preservation",
        "intent": "T",
        "title": "What Slows Spoilage?",
        "actionId": "apply-food-storage-rule",
        "evidenceId": "food-storage-transfer-evidence",
        "cue": "Cooling, covering and preserving can keep food usable for longer.",
        "detail": "These methods slow spoilage; they do not make already spoiled food safe. When in doubt, do not taste it.",
        "actionLabel": "Investigation complete",
        "narrationText": "Cooling, covering and preserving with salt can delay spoilage. They cannot make already spoiled food safe. When in doubt, do not taste it."
      }
    ],
    "assessments": [
      {
        "question": "What does the Day 5 comparison show?",
        "correct": "Cold, covering, and salt slowed change; none made spoiled mango fresh again.",
        "distractor": "Salt and cold reversed spoilage."
      },
      {
        "question": "How should cut fruit be kept for later?",
        "correct": "Clean, covered, and cold, then discarded if spoilage appears.",
        "distractor": "Left warm and uncovered, then washed after mould appears."
      }
    ],
    "integrity": [
      115440,
      "454c952d5cde0e0622566ec9266983e9c22ebf2d02ffc798ca152746528ea154"
    ],
    "numericEvidence": {
      "scene:day-five": [
        1,
        0.72,
        0.25,
        0.16
      ]
    }
  } as const satisfies GuidedClassSeed;
const FOOD_SPOILAGE_BUILT = buildGuidedClass(FOOD_SPOILAGE_SEED);
export const FOOD_SPOILAGE_GUIDANCE = FOOD_SPOILAGE_BUILT.guidance;
export const FOOD_SPOILAGE_SIMULATION = FOOD_SPOILAGE_BUILT.simulation;
export const FOOD_SPOILAGE_SCENE_METADATA = FOOD_SPOILAGE_BUILT.sceneMetadata;

const MILK_SPOILAGE_SEED = {
    "name": "milk-spoilage",
    "constant": "MILK_SPOILAGE",
    "viewer": "MilkSpoilageViewer",
    "slug": "c5-ch04-a02-milk-spoilage",
    "moduleId": "sim-c05-ch04-a02-milk-spoilage",
    "viewerKey": "guided-milk-spoilage",
    "legacyPath": "/simulations/mangoes-round-the-year-milk-spoilage",
    "environment": "food-courtyard-360.png",
    "title": "Milk Spoilage",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "low",
    "conceptId": "concept-milk-spoilage",
    "curriculumId": "cm-cbse-c5-ch04-milk-spoilage",
    "packageSize": 150,
    "headline": "Milk-storage investigator",
    "objective": "Compare equal milk samples over 24 hours and connect souring, curds, whey, and gas to microbial activity and storage.",
    "safety": "Never taste a spoilage sample; accidental spoilage is not controlled curd-making.",
    "stages": [
      {
        "id": "setup",
        "title": "Set Up Three Samples",
        "actionId": "set-up-milk-samples",
        "evidenceId": "milk-controls-observed",
        "cue": "Place equal amounts of fresh milk in clean containers under different storage conditions.",
        "detail": "Changing only the storage condition makes the comparison fair.",
        "actionLabel": "Observe fresh milk",
        "narrationText": "Welcome to Activity 2, Milk Spoilage. We will compare equal milk samples stored in three different conditions."
      },
      {
        "id": "hour-zero",
        "title": "Hour 0 — Fresh Milk",
        "actionId": "inspect-fresh-milk",
        "evidenceId": "fresh-milk-baseline-observed",
        "cue": "All three samples look smooth and white at the start.",
        "detail": "Never taste milk during a spoilage investigation. Use appearance and safe wafting only with adult supervision.",
        "actionLabel": "Advance to 6 hours",
        "narrationText": "At hour zero, all samples are smooth and white. Never taste milk during a spoilage investigation."
      },
      {
        "id": "hour-six",
        "title": "After 6 Hours",
        "actionId": "advance-to-six-hours",
        "evidenceId": "warm-milk-change-observed",
        "cue": "Warm uncovered milk begins changing first while refrigerated milk remains stable.",
        "detail": "Warm conditions help microorganisms multiply more quickly.",
        "actionLabel": "Advance to 12 hours",
        "narrationText": "After six hours, warm uncovered milk begins changing first. Warmth helps microorganisms multiply quickly."
      },
      {
        "id": "hour-twelve",
        "title": "After 12 Hours",
        "actionId": "advance-to-twelve-hours",
        "evidenceId": "curd-whey-observed",
        "cue": "The room-temperature milk smells sour and starts forming small clumps.",
        "detail": "Acids produced by microorganisms make milk proteins join into curds and separate from watery whey.",
        "actionLabel": "Advance to 24 hours",
        "narrationText": "After twelve hours, the room temperature sample smells sour and forms clumps. Microbial acids make milk proteins form curds and separate from whey."
      },
      {
        "id": "hour-twenty-four",
        "intent": "M",
        "title": "After 24 Hours",
        "actionId": "compare-milk-storage",
        "evidenceId": "milk-storage-rate-evidence",
        "cue": "Compare sour smell, clumps, separation and gas bubbles across the samples.",
        "detail": "Boiling reduces many microorganisms, covering limits contamination, and refrigeration slows microbial growth.",
        "actionLabel": "Explain the result",
        "narrationText": "After twenty four hours, the warm sample shows the most spoilage. Boiling, covering and refrigeration slow the changes."
      },
      {
        "id": "safe-storage",
        "intent": "T",
        "title": "Store Milk Safely",
        "actionId": "apply-safe-milk-rule",
        "evidenceId": "safe-milk-transfer-evidence",
        "cue": "Keep milk clean, covered and cold, and use it within its safe storage time.",
        "detail": "Accidental spoilage is different from controlled curd-making with a clean starter culture. Never use spoiled milk to make food.",
        "actionLabel": "Investigation complete",
        "narrationText": "Store milk clean, covered and cold. Accidental spoilage is not the same as controlled curd making with a clean starter culture. Never consume spoiled milk."
      }
    ],
    "assessments": [
      {
        "question": "Why did the samples change at different rates?",
        "correct": "Warmth and exposure sped microbial change; boiling, covering, and cold slowed it.",
        "distractor": "Refrigeration removed every microorganism forever."
      },
      {
        "question": "How is safe curd-making different?",
        "correct": "It starts with safe milk and a clean starter; accidentally spoiled milk is discarded.",
        "distractor": "Any sour spoiled milk can be used as starter."
      }
    ],
    "integrity": [
      115440,
      "454c952d5cde0e0622566ec9266983e9c22ebf2d02ffc798ca152746528ea154"
    ],
    "numericEvidence": {
      "scene:hour-twenty-four": [
        1,
        0.55,
        0.16
      ]
    }
  } as const satisfies GuidedClassSeed;
const MILK_SPOILAGE_BUILT = buildGuidedClass(MILK_SPOILAGE_SEED);
export const MILK_SPOILAGE_GUIDANCE = MILK_SPOILAGE_BUILT.guidance;
export const MILK_SPOILAGE_SIMULATION = MILK_SPOILAGE_BUILT.simulation;
export const MILK_SPOILAGE_SCENE_METADATA = MILK_SPOILAGE_BUILT.sceneMetadata;

const AAM_PAPAD_SEED = {
    "name": "aam-papad",
    "constant": "AAM_PAPAD",
    "viewer": "AamPapadViewer",
    "slug": "c5-ch04-a03-the-making-of-aam-papad",
    "moduleId": "sim-c05-ch04-a03-the-making-of-aam-papad",
    "viewerKey": "guided-aam-papad",
    "legacyPath": "/simulations/mangoes-round-the-year-aam-papad",
    "environment": "food-courtyard-360.png",
    "title": "The Making of Aam Papad",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "low",
    "conceptId": "concept-sun-drying-preservation",
    "curriculumId": "cm-cbse-c5-ch04-aam-papad",
    "packageSize": 150,
    "headline": "Aam papad process guide",
    "objective": "Sequence hygienic mango preparation, thin-layer spreading, repeated drying, and dry storage, explaining moisture removal.",
    "safety": "Food preparation requires clean hands, fruit, utensils, protected drying, and a clean dry container.",
    "stages": [
      {
        "id": "platform",
        "title": "Prepare the Sunny Platform",
        "actionId": "prepare-drying-platform",
        "evidenceId": "clean-platform-observed",
        "cue": "Set a clean mat on a raised frame in a sunny place.",
        "detail": "A raised, clean drying surface keeps the mango pulp away from the ground while sunlight and moving air help remove moisture.",
        "actionLabel": "Set up the platform",
        "narrationText": "Welcome to Mangoes Round the Year, Activity 3, the making of aam papad, also called mamidi tandra. First prepare a clean raised mat in a sunny place."
      },
      {
        "id": "mangoes",
        "title": "Choose Ripe Mangoes",
        "actionId": "wash-and-select-mangoes",
        "evidenceId": "clean-ripe-mangoes-observed",
        "cue": "Wash ripe mangoes and clean your hands and utensils.",
        "detail": "Ripe mangoes are soft and full of sweet pulp. Clean preparation helps keep dirt and unwanted microorganisms out.",
        "actionLabel": "Wash and select mangoes",
        "narrationText": "Choose ripe mangoes. Wash the fruit, your hands and all utensils before beginning."
      },
      {
        "id": "strain",
        "title": "Extract and Strain the Pulp",
        "actionId": "strain-mango-pulp",
        "evidenceId": "smooth-pulp-observed",
        "cue": "Remove the peel and seed, then press the pulp through a strainer.",
        "detail": "Straining removes fibres and produces smooth mango pulp that can be spread into an even sheet.",
        "actionLabel": "Strain the mango pulp",
        "narrationText": "Remove the peel and seed, collect the mango pulp and strain away the fibres to make it smooth."
      },
      {
        "id": "mix",
        "title": "Mix Sugar and Jaggery",
        "actionId": "mix-sweeteners",
        "evidenceId": "even-mixture-observed",
        "cue": "Stir sugar and jaggery evenly into the smooth pulp.",
        "detail": "They sweeten the pulp and help preservation. The mixture must be smooth before it is spread.",
        "actionLabel": "Mix the ingredients",
        "narrationText": "Add sugar and jaggery to the smooth pulp and stir until the mixture is even."
      },
      {
        "id": "spread",
        "title": "Spread a Thin Layer",
        "actionId": "spread-thin-layer",
        "evidenceId": "thin-layer-observed",
        "cue": "Pour the sweetened pulp onto the clean mat and spread it evenly.",
        "detail": "A thin layer dries more evenly than a thick pool because more surface is exposed to warm air and sunlight.",
        "actionLabel": "Spread the first layer",
        "narrationText": "Pour the sweetened mango pulp onto the clean mat and spread one thin, even layer."
      },
      {
        "id": "dry-layers",
        "intent": "M",
        "title": "Sun-dry and Add Layers",
        "actionId": "run-four-week-drying",
        "evidenceId": "moisture-removal-evidence",
        "cue": "Let each layer dry, then add another thin layer. Continue daily for about four weeks.",
        "detail": "Sun-drying removes water slowly. Repeated layers build a thick sheet that can be stored beyond mango season.",
        "actionLabel": "Complete four weeks of layers",
        "narrationText": "Let the layer dry in the sun. Add another thin layer after it dries and repeat this process each day for about four weeks."
      },
      {
        "id": "store",
        "intent": "T",
        "title": "Peel, Cut and Store",
        "actionId": "apply-dry-storage-rule",
        "evidenceId": "aam-papad-transfer-evidence",
        "cue": "Lift the dry mango sheet, cut it into pieces and keep it in a clean, dry container.",
        "detail": "The finished mamidi tandra, or aam papad, is firm and flexible. Less moisture helps it keep much longer than fresh mango pulp.",
        "actionLabel": "Aam papad complete",
        "narrationText": "Peel the dried sheet from the mat, cut it into pieces and store it in a clean, dry container. Removing moisture lets us enjoy mango after its season."
      }
    ],
    "assessments": [
      {
        "question": "Why are thin repeated layers used?",
        "correct": "More surface is exposed so moisture leaves evenly before the next layer.",
        "distractor": "Sugar instantly removes all water and microorganisms."
      },
      {
        "question": "What must happen before storage?",
        "correct": "The sheet must be sufficiently dry, then cut and placed in a clean dry container.",
        "distractor": "A wet thick layer can be sealed immediately."
      }
    ],
    "integrity": [
      115440,
      "454c952d5cde0e0622566ec9266983e9c22ebf2d02ffc798ca152746528ea154"
    ]
  } as const satisfies GuidedClassSeed;
const AAM_PAPAD_BUILT = buildGuidedClass(AAM_PAPAD_SEED);
export const AAM_PAPAD_GUIDANCE = AAM_PAPAD_BUILT.guidance;
export const AAM_PAPAD_SIMULATION = AAM_PAPAD_BUILT.simulation;
export const AAM_PAPAD_SCENE_METADATA = AAM_PAPAD_BUILT.sceneMetadata;

const PITCHER_PLANT_SEED = {
    "name": "pitcher-plant",
    "constant": "PITCHER_PLANT",
    "viewer": "PitcherPlantViewer",
    "slug": "c5-ch05-a01-pitcher-plant-the-insect-hunter",
    "moduleId": "sim-c05-ch05-a01-pitcher-plant-the-insect-hunter",
    "viewerKey": "guided-pitcher-plant",
    "legacyPath": "/simulations/seeds-and-seeds-pitcher-plant",
    "environment": "pitcher-plant-bog-360.png",
    "title": "Pitcher Plant — The Insect Hunter",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "virtualFieldVisit",
    "duration": 9,
    "maxDuration": 11,
    "comfort": "low",
    "conceptId": "concept-carnivorous-plant-nutrition",
    "curriculumId": "cm-cbse-c5-ch05-pitcher-plant",
    "packageSize": 225,
    "headline": "Pitcher plant investigator",
    "objective": "Explain the pitcher as a modified leaf that supplies minerals while green tissue still makes sugar by photosynthesis.",
    "safety": "Do not touch or feed real protected plants or handle trapped insects.",
    "stages": [
      {
        "id": "meet",
        "title": "Meet the Insect Hunter",
        "actionId": "inspect-pitcher-habitat",
        "evidenceId": "poor-soil-observed",
        "cue": "Why does this plant have a deep, cup-shaped leaf?",
        "detail": "Pitcher plants often grow where the soil contains very little usable nitrogen.",
        "actionLabel": "Inspect the pitcher",
        "narrationText": "Welcome to Seeds and Seeds, Activity 1, Pitcher Plant, the insect hunter. Let us discover why this unusual plant traps insects."
      },
      {
        "id": "leaf",
        "title": "A Modified Leaf",
        "actionId": "inspect-modified-leaf",
        "evidenceId": "leaf-trap-observed",
        "cue": "Look at the pitcher, its slippery rim and the lid above the opening.",
        "detail": "The trap is a modified leaf—not a flower and not a mouth.",
        "actionLabel": "Release the insect",
        "narrationText": "The pitcher is a modified leaf. It has a slippery rim, a deep chamber and a lid above the opening."
      },
      {
        "id": "nectar",
        "title": "Nectar Attracts",
        "actionId": "release-insect",
        "evidenceId": "nectar-attraction-observed",
        "cue": "Sweet nectar and colour guide a small insect toward the rim.",
        "detail": "The plant attracts insects chemically and visually; it does not chase them.",
        "actionLabel": "Watch the insect land",
        "narrationText": "Colour and sweet nectar attract a small insect to the pitcher rim. The plant does not chase its prey."
      },
      {
        "id": "rim",
        "title": "Slippery Rim",
        "actionId": "follow-insect-fall",
        "evidenceId": "slippery-rim-observed",
        "cue": "The insect loses its grip and slides down the smooth inner wall.",
        "detail": "Downward-pointing structures and a slippery surface make escape difficult.",
        "actionLabel": "Follow the fall",
        "narrationText": "The insect slips on the smooth rim and falls down the inner wall. Downward pointing structures make climbing out difficult."
      },
      {
        "id": "fluid",
        "title": "Digestive Fluid",
        "actionId": "observe-digestion",
        "evidenceId": "mineral-release-observed",
        "cue": "Fluid inside the pitcher breaks down the insect's soft tissues.",
        "detail": "Digestive enzymes release mineral nutrients, especially nitrogen compounds.",
        "actionLabel": "Trace the nutrients",
        "narrationText": "Digestive fluid and enzymes break down the insect's soft tissues and release mineral nutrients such as nitrogen compounds."
      },
      {
        "id": "absorb",
        "intent": "M",
        "title": "Nutrients Absorbed",
        "actionId": "trace-mineral-uptake",
        "evidenceId": "mineral-not-energy-evidence",
        "cue": "The pitcher wall absorbs released nutrients and carries them into the plant.",
        "detail": "These nutrients supplement poor soil and support growth.",
        "actionLabel": "Explain the plant's food",
        "narrationText": "The pitcher wall absorbs the released minerals. This helps the plant grow in nutrient poor soil."
      },
      {
        "id": "photosynthesis",
        "intent": "T",
        "title": "Plant, Not Animal",
        "actionId": "apply-plant-nutrition-rule",
        "evidenceId": "pitcher-transfer-evidence",
        "cue": "The green leaves still use sunlight, water and carbon dioxide to make sugars.",
        "detail": "The insect supplies minerals—not the plant's main food energy. The pitcher plant still photosynthesises.",
        "actionLabel": "Activity complete",
        "narrationText": "The pitcher plant is still a green plant. It makes sugars by photosynthesis. Insects provide extra minerals, not its main food energy."
      }
    ],
    "assessments": [
      {
        "question": "What does the insect supply?",
        "correct": "Mineral nutrients such as nitrogen; sunlight still supplies energy for sugar-making.",
        "distractor": "The insect replaces photosynthesis as the plant’s energy source."
      },
      {
        "question": "What would still happen without an insect today?",
        "correct": "Green leaves would still photosynthesise, though mineral supply may be limited.",
        "distractor": "The plant would stop using sunlight."
      }
    ],
    "integrity": [
      381098,
      "3cd72e1ae91842651122d2365fa8e03383723a96ca5be60043c616edb16f1d41"
    ]
  } as const satisfies GuidedClassSeed;
const PITCHER_PLANT_BUILT = buildGuidedClass(PITCHER_PLANT_SEED);
export const PITCHER_PLANT_GUIDANCE = PITCHER_PLANT_BUILT.guidance;
export const PITCHER_PLANT_SIMULATION = PITCHER_PLANT_BUILT.simulation;
export const PITCHER_PLANT_SCENE_METADATA = PITCHER_PLANT_BUILT.sceneMetadata;

const SEED_DISPERSAL_SEED = {
    "name": "seed-dispersal",
    "constant": "SEED_DISPERSAL",
    "viewer": "SeedDispersalViewer",
    "slug": "c5-ch05-a02-seed-dispersal",
    "moduleId": "sim-c05-ch05-a02-seed-dispersal",
    "viewerKey": "guided-seed-dispersal",
    "legacyPath": "/simulations/seeds-and-seeds-seed-dispersal",
    "environment": "seed-dispersal-habitat-360.png",
    "title": "Seed Dispersal",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "low",
    "conceptId": "concept-seed-dispersal",
    "curriculumId": "cm-cbse-c5-ch05-seed-dispersal",
    "packageSize": 150,
    "headline": "Seed journey investigator",
    "objective": "Match wind, water, animal, and explosive dispersal to observable seed adaptations and reduced competition.",
    "safety": "The explosive-pod effect is a visual model; do not place real seeds or pods near eyes.",
    "stages": [
      {
        "id": "purpose",
        "title": "Why Seeds Travel",
        "actionId": "release-first-seeds",
        "evidenceId": "reduced-crowding-observed",
        "cue": "Discover why a seed benefits from moving away from its parent plant.",
        "detail": "Dispersal reduces crowding and competition for sunlight, water, minerals and space. It also helps plants reach new places.",
        "actionLabel": "Release the first seeds",
        "narrationText": "Welcome to Chapter 5, Seeds and Seeds, Activity 2, Seed Dispersal. Plants cannot walk, but their seeds can travel. Dispersal reduces crowding near the parent plant and helps seedlings find sunlight, water, minerals and space."
      },
      {
        "id": "wind",
        "title": "Carried by Wind",
        "actionId": "start-seed-breeze",
        "evidenceId": "wind-adaptation-observed",
        "cue": "Observe light seeds with hair-like tufts and winged seeds.",
        "detail": "Cotton and dandelion-like seeds drift because they are light and have hairs. Drumstick and maple-like seeds have wings that slow their fall.",
        "actionLabel": "Start the breeze",
        "narrationText": "Wind carries very light seeds. Hair-like tufts act like parachutes, while thin wings make other seeds spin or glide. Start the breeze and watch them travel away from the parent plant."
      },
      {
        "id": "water",
        "title": "Carried by Water",
        "actionId": "float-coconut",
        "evidenceId": "water-adaptation-observed",
        "cue": "Test how a coconut can travel across water.",
        "detail": "A coconut has a waterproof outer covering and a fibrous husk containing air spaces, so it can float to another shore.",
        "actionLabel": "Float the coconut",
        "narrationText": "Water can carry seeds and fruits. A coconut has a waterproof outer layer and a fibrous husk with air spaces. This helps it float until it reaches a suitable shore."
      },
      {
        "id": "burr",
        "title": "Hitchhiking on Animals",
        "actionId": "attach-burr",
        "evidenceId": "hook-adaptation-observed",
        "cue": "Look closely at the hooks on a burr-like fruit.",
        "detail": "Hooks and spines catch on animal fur or people’s clothes. The seed is carried away and later falls off.",
        "actionLabel": "Attach the burr",
        "narrationText": "Some fruits have hooks or spines. They cling to animal fur or to people's clothes, travel with them, and later fall onto the ground in a new place."
      },
      {
        "id": "fruit",
        "intent": "M",
        "title": "Seeds Inside Fruits",
        "actionId": "follow-fruit-seed",
        "evidenceId": "animal-dispersal-evidence",
        "cue": "Follow a fleshy fruit eaten by a bird.",
        "detail": "Animals carry fruits or eat them. Hard seeds may be dropped or pass through the animal and reach a new place with natural manure.",
        "actionLabel": "Follow the fruit seed",
        "narrationText": "Animals also disperse seeds by carrying or eating fleshy fruits. Hard seeds may be dropped, or pass through the animal without being digested, and arrive with natural manure."
      },
      {
        "id": "explosion",
        "title": "Explosive Dispersal",
        "actionId": "burst-ripe-pod",
        "evidenceId": "explosive-dispersal-observed",
        "cue": "Watch a ripe balsam-like pod split suddenly.",
        "detail": "When some dry pods ripen, their walls spring apart and scatter seeds away from the parent plant.",
        "actionLabel": "Burst the ripe pod",
        "narrationText": "Some plants disperse seeds by explosion. As a dry pod ripens, tension builds in its walls. The pod suddenly splits and throws its seeds away from the parent plant."
      },
      {
        "id": "compare",
        "intent": "T",
        "title": "Dispersal Challenge Complete",
        "actionId": "apply-dispersal-rule",
        "evidenceId": "seed-transfer-evidence",
        "cue": "Compare the four main journeys: wind, water, animals and explosion.",
        "detail": "Seed shape and covering suit the method of travel. Dispersal helps the next generation find space and resources to grow.",
        "actionLabel": "Activity complete",
        "narrationText": "You have explored four important methods of seed dispersal: wind, water, animals and explosive pods. Each seed has features suited to its journey, helping new plants grow with less competition."
      }
    ],
    "assessments": [
      {
        "question": "Why can an eaten fruit disperse a seed?",
        "correct": "A hard seed may be dropped or pass through the animal to a new place.",
        "distractor": "The seed decides where the animal walks."
      },
      {
        "question": "Which adaptation suits wind?",
        "correct": "A light seed with hairs or wings.",
        "distractor": "A heavy fruit with no air spaces."
      }
    ],
    "integrity": [
      258276,
      "9970bc6c7e1db2f7b3d4c1b4fd9c6e1fc5b9895f8226f56280b8772375cc6930"
    ]
  } as const satisfies GuidedClassSeed;
const SEED_DISPERSAL_BUILT = buildGuidedClass(SEED_DISPERSAL_SEED);
export const SEED_DISPERSAL_GUIDANCE = SEED_DISPERSAL_BUILT.guidance;
export const SEED_DISPERSAL_SIMULATION = SEED_DISPERSAL_BUILT.simulation;
export const SEED_DISPERSAL_SCENE_METADATA = SEED_DISPERSAL_BUILT.sceneMetadata;

const RAINWATER_STORAGE_SEED = {
    "name": "rainwater-storage",
    "constant": "RAINWATER_STORAGE",
    "viewer": "RainwaterStorageViewer",
    "slug": "c5-ch06-a01-the-storage-of-rainwater",
    "moduleId": "sim-c05-ch06-a01-the-storage-of-rainwater",
    "viewerKey": "guided-rainwater-storage",
    "legacyPath": "/simulations/every-drop-counts-rainwater-storage",
    "environment": "rainwater-storage-courtyard-360.png",
    "title": "The Storage of Rainwater",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "low",
    "conceptId": "concept-rainwater-harvesting",
    "curriculumId": "cm-cbse-c5-ch06-rainwater-storage",
    "packageSize": 150,
    "headline": "Rainwater system investigator",
    "objective": "Trace rain through catchment, gutter, first flush, filter, covered storage, and careful reuse.",
    "safety": "Filtered rainwater is not automatically drinkable; drinking requires appropriate treatment and testing.",
    "stages": [
      {
        "id": "save",
        "title": "Save the Rain",
        "actionId": "begin-rainfall",
        "evidenceId": "runoff-opportunity-observed",
        "cue": "Find out why rainfall should be collected instead of allowed to run away.",
        "detail": "Rain may arrive during only part of the year. Storing some of it can provide water later and reduce pressure on other sources.",
        "actionLabel": "Begin the rain",
        "narrationText": "Welcome to Chapter 6, Every Drop Counts, Activity 1, The Storage of Rainwater. Rain may fall for only part of the year. If we collect and store some rainfall, it can be available later and reduce pressure on wells, rivers and water supplies."
      },
      {
        "id": "roof",
        "title": "The Roof Catchment",
        "actionId": "collect-roof-runoff",
        "evidenceId": "roof-catchment-observed",
        "cue": "Watch the sloping roof receive rain over a wide area.",
        "detail": "A clean roof acts as a catchment. Its slope guides many small drops toward the lower edge.",
        "actionLabel": "Collect roof runoff",
        "narrationText": "The sloping roof is the catchment. It receives rain over a wide area and guides the drops toward its lower edge. Keeping the roof reasonably clean improves the quality of the collected runoff."
      },
      {
        "id": "gutter",
        "title": "Gutter and Downpipe",
        "actionId": "open-downpipe",
        "evidenceId": "directed-flow-observed",
        "cue": "Trace water along the gutter and down through the pipe.",
        "detail": "The gutter catches water from the roof edge. A downpipe carries it toward the cleaning and storage system without spilling.",
        "actionLabel": "Open the downpipe",
        "narrationText": "A gutter runs along the lower edge of the roof. It catches the flowing water and leads it into a downpipe. The pipe carries the runoff toward the cleaning and storage system without wasting it."
      },
      {
        "id": "first-flush",
        "title": "Discard the First Dirty Flow",
        "actionId": "divert-first-flush",
        "evidenceId": "dirty-runoff-diverted",
        "cue": "Divert the first rain that washes dust and leaves from the roof.",
        "detail": "A first-flush arrangement keeps the initial dirty runoff out of the tank. A mesh screen can also stop larger debris.",
        "actionLabel": "Divert the first flush",
        "narrationText": "The first rain can wash dust, bird droppings and leaves from the roof. A first-flush arrangement diverts this initial dirty water away from the tank. A mesh screen can stop larger debris."
      },
      {
        "id": "filter",
        "intent": "M",
        "title": "Filter the Water",
        "actionId": "run-water-through-filter",
        "evidenceId": "filter-limit-evidence",
        "cue": "Pass the later runoff through a simple filter.",
        "detail": "A filter with clean gravel and sand can remove suspended dirt. Filtering improves stored water but does not automatically make it safe to drink.",
        "actionLabel": "Run water through filter",
        "narrationText": "After the first flush, runoff can pass through a simple filter. Layers such as clean gravel and sand trap suspended dirt. This improves the water, but filtration alone does not guarantee that it is safe for drinking."
      },
      {
        "id": "store",
        "title": "Store and Reuse",
        "actionId": "fill-covered-tank",
        "evidenceId": "covered-storage-observed",
        "cue": "Fill a covered tank and send water to useful tasks.",
        "detail": "A covered tank reduces contamination and mosquito breeding. Stored rainwater can support cleaning and gardening; drinking requires appropriate treatment and testing.",
        "actionLabel": "Fill the storage tank",
        "narrationText": "The filtered rainwater enters a covered storage tank. A tight cover reduces contamination and mosquito breeding. Stored rainwater can be used for gardening or cleaning. Drinking water needs suitable treatment and testing."
      },
      {
        "id": "review",
        "intent": "T",
        "title": "Every Drop Counts",
        "actionId": "apply-rainwater-rule",
        "evidenceId": "rainwater-transfer-evidence",
        "cue": "Review the complete path from cloud to careful reuse.",
        "detail": "Catchment, gutter, first flush, filter, covered tank and careful use work as one rainwater-harvesting system.",
        "actionLabel": "Activity complete",
        "narrationText": "You have completed the rainwater journey: catch it on a clean roof, guide it through gutters and a downpipe, divert the first dirty flow, filter later runoff, store it in a covered tank and use it carefully. Every drop counts."
      }
    ],
    "assessments": [
      {
        "question": "Does gravel-and-sand filtration make roof runoff drinkable?",
        "correct": "No; drinking still needs suitable treatment and testing.",
        "distractor": "Yes; visible dirt is the only risk."
      },
      {
        "question": "Choose the safe reuse path.",
        "correct": "Roof, gutter, first flush, filter, covered tank, then suitable non-drinking reuse.",
        "distractor": "Roof directly to an open drinking bucket."
      }
    ],
    "integrity": [
      173402,
      "ac19019fbce28b50ecd59829641e02c0d75be2c7ee0120ccea313507eec619b7"
    ]
  } as const satisfies GuidedClassSeed;
const RAINWATER_STORAGE_BUILT = buildGuidedClass(RAINWATER_STORAGE_SEED);
export const RAINWATER_STORAGE_GUIDANCE = RAINWATER_STORAGE_BUILT.guidance;
export const RAINWATER_STORAGE_SIMULATION = RAINWATER_STORAGE_BUILT.simulation;
export const RAINWATER_STORAGE_SCENE_METADATA = RAINWATER_STORAGE_BUILT.sceneMetadata;

const STEPWELL_STRUCTURE_SEED = {
    "name": "stepwell-structure",
    "constant": "STEPWELL_STRUCTURE",
    "viewer": "StepwellStructureViewer",
    "slug": "c5-ch06-a02-a-step-well-structure",
    "moduleId": "sim-c05-ch06-a02-a-step-well-structure",
    "viewerKey": "guided-stepwell-structure",
    "legacyPath": "/simulations/every-drop-counts-stepwell-structure",
    "environment": "stepwell-courtyard-360.png",
    "title": "A Step Well Structure",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "low",
    "conceptId": "concept-stepwell-water-storage",
    "curriculumId": "cm-cbse-c5-ch06-stepwell",
    "packageSize": 150,
    "headline": "Stepwell structure investigator",
    "objective": "Explain how steps, landings, shade, catchment, groundwater, and reservoir maintain access at changing water levels.",
    "safety": "The simulation is stationary; real stepwells require barriers, site rules, and adult supervision.",
    "stages": [
      {
        "id": "meet",
        "title": "Meet the Stepwell",
        "actionId": "open-stepwell-structure",
        "evidenceId": "deep-store-observed",
        "cue": "Examine a water structure built deep into the ground.",
        "detail": "A stepwell, also called a baoli or vav in different regions, combines a deep water store with long flights of steps.",
        "actionLabel": "Open the structure",
        "narrationText": "Welcome to Chapter 6, Every Drop Counts, Activity 2, A Stepwell Structure. A stepwell is a deep water structure with flights of steps leading down to stored water. In different parts of India, stepwells may be called baolis, baoris or vavs."
      },
      {
        "id": "steps",
        "title": "Steps to the Water",
        "actionId": "descend-stepwell-levels",
        "evidenceId": "variable-access-observed",
        "cue": "Follow the symmetrical stairways from the surface to the reservoir.",
        "detail": "Many rows of steps let people reach the water as its level rises after rain or falls during dry months.",
        "actionLabel": "Descend the steps",
        "narrationText": "Look at the long, symmetrical stairways. They descend level by level toward the reservoir. When the water level changes between rainy and dry seasons, people can walk farther down to reach it."
      },
      {
        "id": "shade",
        "title": "Landings, Pillars and Shade",
        "actionId": "reveal-shaded-levels",
        "evidenceId": "cool-gallery-observed",
        "cue": "Inspect the broad landings and shaded galleries between flights.",
        "detail": "Landings provide resting and gathering places. Stone pillars support shaded spaces that remain cooler below ground.",
        "actionLabel": "Reveal the shaded levels",
        "narrationText": "Broad landings interrupt the long stairways. Pillars support shaded galleries and resting spaces. Because much of the structure is below ground and shaded, the lower levels can feel cooler than the surface."
      },
      {
        "id": "inflow",
        "title": "How Water Enters",
        "actionId": "send-water-inward",
        "evidenceId": "runoff-groundwater-observed",
        "cue": "Trace rainwater and groundwater moving toward the lowest chamber.",
        "detail": "Stepwells can collect rain and surface runoff, and some also reach groundwater. Stone walls and the deep basin hold the supply.",
        "actionLabel": "Send water inward",
        "narrationText": "Now trace the water. Rain falling on the surrounding catchment can flow toward the stepwell as runoff. Some stepwells also reach groundwater. The deep stone-lined basin stores water at the lowest level."
      },
      {
        "id": "levels",
        "intent": "M",
        "title": "Changing Water Level",
        "actionId": "compare-water-levels",
        "evidenceId": "water-level-causes-evidence",
        "cue": "Compare the reservoir after rain with the same reservoir in a dry period.",
        "detail": "The water level changes with rainfall, use and groundwater conditions. The descending steps keep lower levels accessible.",
        "actionLabel": "Lower the water level",
        "narrationText": "Watch the water level change. After good rain the reservoir rises and fewer steps are exposed. During a dry period the water falls, but the lower flights of steps still provide access. Water levels depend on rain, use and groundwater."
      },
      {
        "id": "community",
        "title": "A Shared Water Place",
        "actionId": "protect-shared-water",
        "evidenceId": "community-care-observed",
        "cue": "See how the structure served both practical and community needs.",
        "detail": "Stepwells stored precious water and offered cool gathering spaces. Protecting the catchment and keeping the water clean helped the whole community.",
        "actionLabel": "Protect the water",
        "narrationText": "A stepwell was more than a staircase. It stored scarce water and created a cool community space. Keeping waste out, protecting the surrounding catchment and using water carefully helped preserve the shared supply."
      },
      {
        "id": "review",
        "intent": "T",
        "title": "Structure Complete",
        "actionId": "apply-stepwell-rule",
        "evidenceId": "stepwell-transfer-evidence",
        "cue": "Review the connected parts: catchment, steps, landings, pillars and reservoir.",
        "detail": "The design follows water downward and gives people access at different levels. It is an example of architecture shaped by water scarcity.",
        "actionLabel": "Activity complete",
        "narrationText": "You have identified the main parts of a stepwell: the catchment, descending steps, landings, pillars, shaded galleries and reservoir. Together they collect, store and provide access to water in a dry climate."
      }
    ],
    "assessments": [
      {
        "question": "Why does the water level change?",
        "correct": "Rainfall, use, and groundwater conditions change it; lower steps preserve access.",
        "distractor": "The stairs move the reservoir up and down."
      },
      {
        "question": "What helps in a dry period?",
        "correct": "Protected catchment, careful use, and lower-step access to remaining water.",
        "distractor": "Adding waste to mark the water line."
      }
    ],
    "integrity": [
      138468,
      "b2d44490489593bb0c3fabb7de7c6986e011e416331863a8033c08dd54614121"
    ]
  } as const satisfies GuidedClassSeed;
const STEPWELL_STRUCTURE_BUILT = buildGuidedClass(STEPWELL_STRUCTURE_SEED);
export const STEPWELL_STRUCTURE_GUIDANCE = STEPWELL_STRUCTURE_BUILT.guidance;
export const STEPWELL_STRUCTURE_SIMULATION = STEPWELL_STRUCTURE_BUILT.simulation;
export const STEPWELL_STRUCTURE_SCENE_METADATA = STEPWELL_STRUCTURE_BUILT.sceneMetadata;

const DEAD_SEA_SALT_WATER_SEED = {
    "name": "dead-sea-salt-water",
    "constant": "DEAD_SEA_SALT_WATER",
    "viewer": "DeadSeaSaltWaterViewer",
    "slug": "c5-ch07-a02-dead-sea-salt-water-and-its-effects",
    "moduleId": "sim-c05-ch07-a02-dead-sea-salt-water-and-its-effects",
    "viewerKey": "guided-dead-sea-salt-water",
    "legacyPath": "/simulations/experiments-with-water-dead-sea-salt-water",
    "environment": "dead-sea-salt-shore-360.png",
    "title": "Dead Sea: Salt Water and Its Effects",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "low",
    "conceptId": "concept-density-and-buoyancy",
    "curriculumId": "cm-cbse-c5-ch07-dead-sea",
    "packageSize": 150,
    "headline": "Density and buoyancy investigator",
    "objective": "Use fresh and salt-water egg evidence to explain how dissolved salt raises density and buoyant support without making the object lighter.",
    "safety": "Do not drink concentrated salt water or expose eyes or open cuts; ordinary water-safety rules still apply.",
    "stages": [
      {
        "id": "meet",
        "title": "Meet the Dead Sea",
        "actionId": "inspect-dead-sea-basin",
        "evidenceId": "landlocked-lake-observed",
        "cue": "Explore a landlocked salt lake with calm water, an arid mountain basin and salt crystals along the shore.",
        "detail": "The Dead Sea is a lake, not an ocean. Water flows in and evaporates, while much of its dissolved salt remains behind.",
        "actionLabel": "Compare the waters",
        "narrationText": "Welcome to Chapter 7, Experiments with Water, Activity 2, Dead Sea: Salt Water and Its Effects. The Dead Sea is a landlocked salt lake in a hot, dry basin. Water evaporates strongly, but dissolved salts remain, so the lake becomes extremely salty."
      },
      {
        "id": "compare",
        "title": "Fresh Water and Salt Water",
        "actionId": "compare-equal-tanks",
        "evidenceId": "equal-volume-comparison-observed",
        "cue": "Inspect two equal tanks. The left tank contains fresh water; the right tank will become a concentrated salt solution.",
        "detail": "The same volume of salt water contains dissolved material as well as water, so it has more mass and a greater density.",
        "actionLabel": "Pour in the salt",
        "narrationText": "Compare the two tanks. The left contains fresh water. The right will contain concentrated salt water. Equal volumes do not have equal mass: dissolved salt adds matter, so the salt solution has greater density."
      },
      {
        "id": "dissolve",
        "title": "Dissolve the Salt",
        "actionId": "dissolve-salt",
        "evidenceId": "dissolved-matter-observed",
        "cue": "Watch salt crystals separate into particles and spread through the right tank.",
        "detail": "Dissolved salt does not vanish. Its particles mix among the water particles, increasing the solution's density.",
        "actionLabel": "Test fresh water",
        "narrationText": "Pour the salt into the right tank. The crystals break into particles too small to see and spread among the water particles. The salt has not vanished. It remains dissolved and increases the density of the solution."
      },
      {
        "id": "fresh-egg",
        "title": "Egg in Fresh Water",
        "actionId": "release-fresh-water-egg",
        "evidenceId": "fresh-egg-sinks-observed",
        "cue": "Release an egg into the left tank and follow its journey.",
        "detail": "The egg sinks because its average density is greater than the fresh water around it.",
        "actionLabel": "Test salt water",
        "narrationText": "Now release an egg into fresh water. The egg moves downward and settles near the bottom because its average density is greater than the density of fresh water."
      },
      {
        "id": "salt-egg",
        "title": "Egg in Salt Water",
        "actionId": "release-salt-water-egg",
        "evidenceId": "salt-egg-floats-observed",
        "cue": "Release the same kind of egg into the concentrated salt solution.",
        "detail": "The denser salt water produces a stronger upward buoyant force for the same displaced volume, so the egg rises and floats.",
        "actionLabel": "Reveal the forces",
        "narrationText": "Release the same kind of egg into concentrated salt water. It drops briefly, then rises toward the surface. Denser salt water gives a stronger upward buoyant force for the same volume of displaced water, allowing the egg to float."
      },
      {
        "id": "forces",
        "intent": "M",
        "title": "Why Floating Is Easier",
        "actionId": "compare-buoyant-forces",
        "evidenceId": "object-not-lighter-evidence",
        "cue": "Observe a reclining swimmer model and compare the upward push of the water with the downward pull of weight.",
        "detail": "A person's weight does not disappear. Dense salt water supplies a larger upward force, making the body easier to support near the surface.",
        "actionLabel": "Explore salt-water effects",
        "narrationText": "The swimmer model shows the same principle. Gravity still pulls the body downward, but dense salt water provides a larger upward push. When the forces balance, the body rests high near the surface. Floating is easier, but normal water-safety rules still apply."
      },
      {
        "id": "effects",
        "title": "Effects of Very Salty Water",
        "actionId": "inspect-salinity-effects",
        "evidenceId": "salinity-ecology-safety-observed",
        "cue": "Study salt crystals, a freshwater-life comparison and safe-use reminders.",
        "detail": "Extreme salinity is unsuitable for most familiar fish and aquatic plants, though some microorganisms survive. The water must not be drunk or allowed into eyes or open cuts.",
        "actionLabel": "Complete the investigation",
        "narrationText": "Very salty water has important effects. Salt crystals can form as water evaporates. The extreme salinity is unsuitable for most familiar fish and aquatic plants, although some salt-tolerant microorganisms can survive. Never drink the water, and keep it away from eyes and open cuts."
      },
      {
        "id": "review",
        "intent": "T",
        "title": "Salt, Density and Buoyancy",
        "actionId": "apply-buoyancy-rule",
        "evidenceId": "buoyancy-transfer-evidence",
        "cue": "Review the complete chain: evaporation concentrates salt, dissolved salt raises density, and denser water increases buoyant support.",
        "detail": "Salt does not make an object lighter. It changes the water, so the upward force can balance the object's weight sooner.",
        "actionLabel": "Activity complete",
        "narrationText": "You have completed the investigation. Evaporation concentrates dissolved salts. Dissolved salt increases the water's density. Denser water can provide more buoyant support, so an egg or a person floats higher. The salt changes the water; it does not make the floating object lighter."
      }
    ],
    "assessments": [
      {
        "question": "Why does the egg float higher?",
        "correct": "Dissolved salt raises water density and buoyant support; the egg is not lighter.",
        "distractor": "Salt removes some of the egg’s weight."
      },
      {
        "question": "What happens in another denser safe liquid?",
        "correct": "The same object receives greater buoyant support for the displaced volume.",
        "distractor": "Gravity stops acting on the object."
      }
    ],
    "integrity": [
      143242,
      "48a5e0deddbb1f0174eb6a2269457e17199c7dbcdb1a947c5b21db33e0e54c48"
    ]
  } as const satisfies GuidedClassSeed;
const DEAD_SEA_SALT_WATER_BUILT = buildGuidedClass(DEAD_SEA_SALT_WATER_SEED);
export const DEAD_SEA_SALT_WATER_GUIDANCE = DEAD_SEA_SALT_WATER_BUILT.guidance;
export const DEAD_SEA_SALT_WATER_SIMULATION = DEAD_SEA_SALT_WATER_BUILT.simulation;
export const DEAD_SEA_SALT_WATER_SCENE_METADATA = DEAD_SEA_SALT_WATER_BUILT.sceneMetadata;

const MALARIA_DIAGNOSIS_SEED = {
    "name": "malaria-diagnosis",
    "constant": "MALARIA_DIAGNOSIS",
    "viewer": "MalariaDiagnosisViewer",
    "slug": "c5-ch08-a01-diagnosis-of-malaria",
    "moduleId": "sim-c05-ch08-a01-diagnosis-of-malaria",
    "viewerKey": "guided-malaria-diagnosis",
    "legacyPath": "/simulations/treat-for-mosquitoes-malaria-diagnosis",
    "environment": "malaria-diagnosis-lab-360.png",
    "title": "Diagnosis of Malaria",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "guidedVisualization",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "low",
    "conceptId": "concept-malaria-diagnosis",
    "curriculumId": "cm-cbse-c5-ch08-malaria-diagnosis",
    "packageSize": 120,
    "headline": "Malaria evidence investigator",
    "objective": "Distinguish symptoms and exposure clues from confirmation by microscopy or a valid rapid diagnostic test and route results to professional care.",
    "safety": "Learners never collect or handle blood, self-diagnose, or self-medicate.",
    "stages": [
      {
        "id": "symptoms",
        "intent": "M",
        "title": "Symptoms Are Clues",
        "actionId": "review-malaria-symptoms",
        "evidenceId": "symptoms-not-diagnosis-evidence",
        "cue": "Recognise fever, chills, headache, tiredness and body aches—but do not diagnose malaria from symptoms alone.",
        "detail": "Several illnesses can cause similar symptoms. Suspected malaria needs prompt parasite-based testing by trained health workers.",
        "actionLabel": "Review the history",
        "narrationText": "Welcome to Chapter 8, A Treat for Mosquitoes, Activity 1, Diagnosis of Malaria. Fever, chills, headache, tiredness and body aches can suggest malaria, but these symptoms also occur in other illnesses. Symptoms alone cannot confirm malaria. A suspected case needs prompt testing by trained health workers."
      },
      {
        "id": "history",
        "title": "History and Mosquito Link",
        "actionId": "review-exposure-history",
        "evidenceId": "exposure-not-confirmation-observed",
        "cue": "Connect fever with exposure in a malaria-risk area and the bite of an infected female Anopheles mosquito.",
        "detail": "The mosquito transmits Plasmodium parasites. A mosquito bite or travel history raises suspicion but still does not confirm malaria.",
        "actionLabel": "Collect a sample safely",
        "narrationText": "A health worker asks about the illness, recent time spent in a malaria-risk area and possible mosquito exposure. Malaria is transmitted when an infected female Anopheles mosquito passes Plasmodium parasites during a bite. Exposure raises suspicion, but laboratory evidence is still required."
      },
      {
        "id": "sample",
        "title": "Professional Blood Collection",
        "actionId": "observe-safe-blood-collection",
        "evidenceId": "professional-collection-observed",
        "cue": "Observe a protected health worker station preparing a small blood sample.",
        "detail": "Only a trained health worker should collect and handle blood using gloves, sterile single-use equipment and safe sharps disposal.",
        "actionLabel": "Prepare both films",
        "narrationText": "A trained health worker collects a small blood sample using gloves and sterile single-use equipment, then disposes of sharps safely. This is a demonstration only. Learners should never collect or handle blood themselves."
      },
      {
        "id": "films",
        "title": "Thick and Thin Blood Films",
        "actionId": "prepare-blood-films",
        "evidenceId": "film-purpose-observed",
        "cue": "Prepare two complementary smears from the same sample.",
        "detail": "A thick film concentrates parasites for detection. A thin film preserves red-cell detail to help identify the Plasmodium species and estimate the proportion of infected cells.",
        "actionLabel": "Stain the films",
        "narrationText": "Two blood films are prepared from the same patient. The thick film concentrates parasites and is useful for detecting infection. The thin film keeps red blood cells visible, helping an experienced microscopist identify the parasite species and estimate how many cells are infected."
      },
      {
        "id": "stain",
        "title": "Stain and Focus",
        "actionId": "stain-and-focus-slide",
        "evidenceId": "stained-field-observed",
        "cue": "Apply Giemsa stain, place the prepared slide on the microscope and bring the field into focus.",
        "detail": "Staining makes parasite structures easier for a trained microscopist to recognise. Correct preparation and careful examination matter.",
        "actionLabel": "Begin microscope scan",
        "narrationText": "The films are stained, commonly with Giemsa stain, so parasite structures can be seen. The trained microscopist places the slide on the microscope, focuses carefully and examines many fields before reporting a result."
      },
      {
        "id": "scan",
        "title": "Find the Parasites",
        "actionId": "reveal-three-parasites",
        "evidenceId": "three-parasites-observed",
        "cue": "Scan the enlarged field and reveal three infected red blood cells.",
        "detail": "Malaria is confirmed by finding Plasmodium parasites in the blood. A thick film helps detect them; the thin film helps assess species and parasite density.",
        "actionLabel": "Reveal parasite 1 of 3",
        "narrationText": "Scan the enlarged blood field. Healthy red blood cells appear as red discs with pale centres. Infected cells can contain purple-stained Plasmodium structures, including small ring forms. Reveal three infected cells to complete the scan."
      },
      {
        "id": "rdt",
        "title": "Rapid Diagnostic Test",
        "actionId": "interpret-rdt",
        "evidenceId": "valid-rdt-observed",
        "cue": "Observe a malaria RDT detect parasite antigens from a small blood sample.",
        "detail": "RDTs can provide parasite-based evidence where quality microscopy is not readily available. The control line must appear for a valid test.",
        "actionLabel": "Interpret the result",
        "narrationText": "A malaria rapid diagnostic test, or R D T, detects specific parasite antigens in a small blood sample. It is useful where quality microscopy is not readily available. A visible control line shows that the test worked; the health worker interprets the test line according to the kit instructions."
      },
      {
        "id": "care",
        "intent": "T",
        "title": "Act on a Confirmed Result",
        "actionId": "apply-professional-care-rule",
        "evidenceId": "malaria-care-transfer-evidence",
        "cue": "Send the result to a qualified health professional for prompt interpretation and treatment decisions.",
        "detail": "Do not self-diagnose or self-medicate. A positive test needs prompt professional care; persistent symptoms after a negative result need further medical evaluation.",
        "actionLabel": "Activity complete",
        "narrationText": "The diagnosis journey is complete. Suspect malaria from symptoms and exposure, but confirm it with parasite-based testing by microscopy or an approved rapid diagnostic test. A positive result needs prompt professional treatment. If symptoms continue after a negative result, return for further medical evaluation. Never self-medicate."
      }
    ],
    "assessments": [
      {
        "question": "Can fever and chills confirm malaria?",
        "correct": "No; confirmation needs parasite-based testing by trained health workers.",
        "distractor": "Yes; symptoms alone are enough."
      },
      {
        "question": "What follows persistent symptoms after a negative test?",
        "correct": "Return for professional evaluation of malaria and other possible illness.",
        "distractor": "Self-medicate and avoid further care."
      }
    ],
    "integrity": [
      53990,
      "51ab76076bff52941400f11e1d43d4c613b9b3b0edc7950127921d0161ddbf0b"
    ]
  } as const satisfies GuidedClassSeed;
const MALARIA_DIAGNOSIS_BUILT = buildGuidedClass(MALARIA_DIAGNOSIS_SEED);
export const MALARIA_DIAGNOSIS_GUIDANCE = MALARIA_DIAGNOSIS_BUILT.guidance;
export const MALARIA_DIAGNOSIS_SIMULATION = MALARIA_DIAGNOSIS_BUILT.simulation;
export const MALARIA_DIAGNOSIS_SCENE_METADATA = MALARIA_DIAGNOSIS_BUILT.sceneMetadata;

const MOSQUITO_LIFE_CYCLE_SEED = {
    "name": "mosquito-life-cycle",
    "constant": "MOSQUITO_LIFE_CYCLE",
    "viewer": "MosquitoLifeCycleViewer",
    "slug": "c5-ch08-a02-life-cycle-of-the-mosquito",
    "moduleId": "sim-c05-ch08-a02-life-cycle-of-the-mosquito",
    "viewerKey": "guided-mosquito-life-cycle",
    "legacyPath": "/simulations/treat-for-mosquitoes-mosquito-life-cycle",
    "environment": "mosquito-life-cycle-wetland-360.png",
    "title": "Life Cycle of the Mosquito",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "guidedVisualization",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "low",
    "conceptId": "concept-mosquito-life-cycle",
    "curriculumId": "cm-cbse-c5-ch08-mosquito-life-cycle",
    "packageSize": 126,
    "headline": "Mosquito life-cycle investigator",
    "objective": "Sequence Anopheles egg, larva, pupa, and adult stages and choose safe household prevention.",
    "safety": "Mosquito-control products and large habitats are handled only by trained adults or community teams.",
    "stages": [
      {
        "id": "cycle",
        "title": "Meet the Anopheles Cycle",
        "actionId": "inspect-four-stage-cycle",
        "evidenceId": "four-stages-observed",
        "cue": "Discover the four connected stages of a malaria-carrying mosquito.",
        "detail": "Anopheles mosquitoes pass through egg, larva, pupa and adult stages. The first three stages depend on water; only the adult flies.",
        "actionLabel": "Begin with the eggs",
        "narrationText": "Welcome to Chapter 8, A Treat for Mosquitoes, Activity 2, Life Cycle of the Mosquito. A malaria-carrying Anopheles mosquito passes through four stages: egg, larva, pupa and adult. The first three stages depend on water, while the adult can fly."
      },
      {
        "id": "eggs",
        "title": "Eggs Float on Water",
        "actionId": "hatch-anopheles-eggs",
        "evidenceId": "separate-eggs-observed",
        "cue": "Watch a female Anopheles lay separate floating eggs.",
        "detail": "A female lays eggs one at a time directly on water. Anopheles eggs have small side floats and do not tolerate drying out.",
        "actionLabel": "Hatch the eggs",
        "narrationText": "An adult female Anopheles lays eggs one at a time directly on water. Each egg floats at the surface with tiny side floats. Unlike the eggs of some other mosquitoes, Anopheles eggs do not tolerate drying out."
      },
      {
        "id": "larvae",
        "title": "Larvae — The Wigglers",
        "actionId": "complete-fourth-moult",
        "evidenceId": "parallel-larvae-observed",
        "cue": "Observe legless larvae feeding and breathing near the surface.",
        "detail": "Larvae live in water, feed on tiny organisms and moult four times. Anopheles larvae have no breathing siphon, so they rest parallel to the water surface.",
        "actionLabel": "Complete the fourth moult",
        "narrationText": "The eggs hatch into larvae. These legless wigglers live in water, feed on tiny organisms and moult four times as they grow. Anopheles larvae do not have a breathing siphon, so they usually lie parallel to the water surface and breathe through spiracles on the abdomen."
      },
      {
        "id": "pupae",
        "title": "Pupae — The Tumblers",
        "actionId": "begin-metamorphosis",
        "evidenceId": "nonfeeding-pupae-observed",
        "cue": "Follow the comma-shaped pupae as the adults form inside.",
        "detail": "A pupa lives in water and breathes at the surface, but it does not feed. Its body changes dramatically during metamorphosis.",
        "actionLabel": "Begin emergence",
        "narrationText": "After the fourth larval stage comes the comma-shaped pupa, sometimes called a tumbler. It remains in water and breathes at the surface, but it does not feed. Inside, metamorphosis changes the larva into an adult mosquito."
      },
      {
        "id": "adult",
        "title": "Adult Emerges",
        "actionId": "emerge-adult-mosquito",
        "evidenceId": "adult-emergence-observed",
        "cue": "Watch the pupal case split and the adult rise above the water.",
        "detail": "The adult carefully emerges onto the water surface, rests while its body and wings harden, and then flies away.",
        "actionLabel": "Follow the adult",
        "narrationText": "The pupal case splits and the adult mosquito carefully emerges onto the water surface. It rests while its body and wings harden. When it is ready, the new adult takes its first flight."
      },
      {
        "id": "female",
        "intent": "M",
        "title": "The Adult Female",
        "actionId": "compare-adult-feeding",
        "evidenceId": "female-bite-misconception-evidence",
        "cue": "See how an adult female continues the next generation.",
        "detail": "Male and female mosquitoes use plant sugars for energy. Only females bite; a female needs a blood meal to develop eggs. A mosquito carries malaria only after becoming infected with Plasmodium.",
        "actionLabel": "Continue the cycle",
        "narrationText": "Adult males and females use plant sugars for energy. Only female mosquitoes bite people or animals. A female needs a blood meal to develop eggs, then returns to water to lay them. A mosquito can spread malaria only after it becomes infected with Plasmodium parasites."
      },
      {
        "id": "protect",
        "title": "Protect the Community",
        "actionId": "choose-breeding-prevention",
        "evidenceId": "prevention-actions-observed",
        "cue": "Identify safe actions that interrupt mosquito breeding and reduce bites.",
        "detail": "Empty, scrub, cover or turn over household containers that collect water. Use bed nets and screens. Let trained community teams manage larger habitats and any mosquito-control products.",
        "actionLabel": "Review the complete cycle",
        "narrationText": "We can interrupt mosquito breeding around homes by emptying and scrubbing water containers, covering stored water, clearing blocked drains, and turning over unused items that collect rain. Bed nets and screens reduce bites. Larger habitats and mosquito-control products should be managed by trained adults and community teams."
      },
      {
        "id": "review",
        "intent": "T",
        "title": "Life Cycle Mastered",
        "actionId": "apply-mosquito-cycle-rule",
        "evidenceId": "mosquito-transfer-evidence",
        "cue": "Trace the repeating sequence: egg, larva, pupa and adult.",
        "detail": "Egg, larva and pupa are aquatic stages. The adult is the flying stage. Anopheles development from egg to adult often takes about 10 to 14 days, depending on species and conditions.",
        "actionLabel": "Activity complete",
        "narrationText": "You have completed the Anopheles mosquito life cycle: egg, larva, pupa and adult. The first three stages are aquatic, and the adult is the flying stage. Development from egg to adult often takes about ten to fourteen days, depending on the species and conditions."
      }
    ],
    "assessments": [
      {
        "question": "Which adult mosquitoes bite and spread malaria?",
        "correct": "Only females bite; a female spreads malaria only after Plasmodium infection, while both sexes use plant sugars.",
        "distractor": "Every male and female mosquito carries malaria from birth."
      },
      {
        "question": "Which household action interrupts breeding?",
        "correct": "Empty and scrub containers, cover stored water, and use nets/screens.",
        "distractor": "Add unapproved pesticide to every water body."
      }
    ],
    "integrity": [
      213158,
      "a81481b610fb7cb6b4e63f66de572e0c847947e2172e5927747383c9f7dc8142"
    ]
  } as const satisfies GuidedClassSeed;
const MOSQUITO_LIFE_CYCLE_BUILT = buildGuidedClass(MOSQUITO_LIFE_CYCLE_SEED);
export const MOSQUITO_LIFE_CYCLE_GUIDANCE = MOSQUITO_LIFE_CYCLE_BUILT.guidance;
export const MOSQUITO_LIFE_CYCLE_SIMULATION = MOSQUITO_LIFE_CYCLE_BUILT.simulation;
export const MOSQUITO_LIFE_CYCLE_SCENE_METADATA = MOSQUITO_LIFE_CYCLE_BUILT.sceneMetadata;

const RIVER_CROSSING_SEED = {
    "name": "river-crossing",
    "constant": "RIVER_CROSSING",
    "viewer": "RiverCrossingAdventureViewer",
    "slug": "c5-ch09-a01-river-crossing-adventure",
    "moduleId": "sim-c05-ch09-a01-river-crossing-adventure",
    "viewerKey": "guided-river-crossing",
    "legacyPath": "/simulations/up-you-go-river-crossing-adventure",
    "environment": "up-you-go-river-crossing-360.png",
    "title": "River Crossing Adventure",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "medium",
    "conceptId": "concept-protected-river-crossing",
    "curriculumId": "cm-cbse-c5-ch09-river-crossing",
    "packageSize": 150,
    "headline": "Protected crossing investigator",
    "objective": "Connect checked anchors, harness, sling, rope technique, calm slip recovery, and teamwork in a supervised model.",
    "safety": "This is not real crossing instruction; qualified supervision and approved equipment are mandatory.",
    "stages": [
      {
        "id": "survey",
        "title": "Survey the Mountain River",
        "actionId": "inspect-crossing-route",
        "evidenceId": "supervised-route-observed",
        "cue": "Observe the cold current, the two banks and the supervised crossing route.",
        "detail": "After an eight-kilometre trek, the group in the NCERT story reaches a fast-flowing mountain river. A trained instructor has prepared a protected route across it.",
        "actionLabel": "Inspect the safety equipment",
        "narrationText": "Welcome to Chapter 9, Up You Go, Activity 1, River Crossing Adventure. After an eight kilometre trek, the group reaches a cold, fast-flowing mountain river. A trained instructor has prepared a supervised crossing route. Look at the two banks, the moving water and the thick rope stretched across the river."
      },
      {
        "id": "equipment",
        "title": "Check Before You Cross",
        "actionId": "inspect-river-equipment",
        "evidenceId": "protective-equipment-observed",
        "cue": "Identify the helmet, harness, sling, locking connector and thick main rope.",
        "detail": "Adventure equipment must be checked and fitted by a trained instructor. This simulation is for learning—not for attempting a real river crossing without expert supervision.",
        "actionLabel": "Inspect both anchors",
        "narrationText": "Before anyone enters the river, inspect the equipment. The learner wears a helmet and a properly fitted harness. A safety sling with a locking connector links the learner to the thick main rope. Every item must be checked by a trained instructor. Never try a real river crossing without expert supervision and approved equipment."
      },
      {
        "id": "anchors",
        "title": "Test the Piton Anchors",
        "actionId": "inspect-both-pitons",
        "evidenceId": "anchor-system-observed",
        "cue": "Follow the thick rope from one bank to the other.",
        "detail": "The textbook describes the rope as tightly fixed to pegs, or pitons, on both banks. Secure anchors keep the main rope in place while the safety system is checked.",
        "actionLabel": "Attach the safety sling",
        "narrationText": "Trace the thick rope from one bank to the other. In the textbook, it is tightly fixed to strong pegs called pitons on both sides. The instructor checks each anchor, the knots and the tension before the crossing begins."
      },
      {
        "id": "clip",
        "title": "Clip In to the Main Rope",
        "actionId": "attach-safety-sling",
        "evidenceId": "locked-sling-observed",
        "cue": "Connect the learner's secured harness and sling to the thick rope.",
        "detail": "The sling and locking connector link the learner to the main rope. The instructor confirms the attachment before anyone enters the water.",
        "actionLabel": "Step into the icy water",
        "narrationText": "Now the instructor attaches the learner's secured harness and sling to the main rope. The locking connector closes around the rope. The learner is connected before stepping into the water, and the instructor confirms the system."
      },
      {
        "id": "cross",
        "title": "Cross with Firm Footsteps",
        "actionId": "enter-and-cross-river",
        "evidenceId": "firm-footsteps-observed",
        "cue": "Hold the rope and place each foot carefully on the riverbed.",
        "detail": "Face the crossing, keep both hands on the rope and test each foothold before shifting weight. The safety sling stays connected while the learner moves slowly.",
        "actionLabel": "Meet the strongest current",
        "narrationText": "Enter the cold water slowly. Keep both hands on the rope. Place each foot firmly on the rocky riverbed and test the foothold before shifting your weight. Move one careful step at a time while the safety sling remains attached."
      },
      {
        "id": "recover",
        "title": "Recover from a Slip",
        "actionId": "recover-river-grip",
        "evidenceId": "sling-support-observed",
        "cue": "See how the safety connection supports the learner while balance is regained.",
        "detail": "In the story, Sangeeta loses her balance and the rope slips from her hands, but the sling keeps her connected. She listens, regains her grip and pulls herself forward.",
        "actionLabel": "Reach the far bank",
        "narrationText": "The current becomes stronger and the learner slips. In Sangeeta's story, the rope slipped from her hands, but the sling kept her connected. Listen to the instructor, regain the rope, steady both feet and continue calmly."
      },
      {
        "id": "team",
        "intent": "M",
        "title": "Help the Team Across",
        "actionId": "choose-safe-team-support",
        "evidenceId": "courage-with-safety-evidence",
        "cue": "Encourage the next person and repeat the instructor's safety reminders.",
        "detail": "Courage grows through preparation, support and calm action. A responsible group leader stays attentive, helps others and follows the instructor.",
        "actionLabel": "Review the adventure",
        "narrationText": "The learner reaches the far bank and turns to encourage the group. A responsible teammate reminds others to hold the rope, move slowly and follow the instructor. Courage does not mean ignoring risk. It means preparing well and acting carefully even when you feel afraid."
      },
      {
        "id": "review",
        "intent": "T",
        "title": "River Crossing Complete",
        "actionId": "apply-protected-crossing-rule",
        "evidenceId": "river-transfer-evidence",
        "cue": "Connect equipment, technique, teamwork and courage.",
        "detail": "The thick rope, secure piton anchors, fitted sling and trained instructor create a protected system. Careful footsteps and teamwork help the learner complete the challenge.",
        "actionLabel": "Activity complete",
        "narrationText": "River crossing complete. You inspected the equipment, checked the piton anchors, attached the safety sling, used firm footsteps, recovered from a slip and supported the team. The lesson joins safety, discipline, courage and cooperation."
      }
    ],
    "assessments": [
      {
        "question": "What does courage mean in this crossing?",
        "correct": "Prepare, stay clipped, move calmly, and follow the trained instructor.",
        "distractor": "Ignore the current and move without protection."
      },
      {
        "question": "May this setup be copied at a real river?",
        "correct": "No; real crossings require qualified experts, approved equipment, and site assessment.",
        "distractor": "Yes; a rope alone makes any river safe."
      }
    ],
    "integrity": [
      231876,
      "9c25f7b271b0444e9ac8e96eaa21ec91cb2fd7bc8a2b34d226bf98683df13edc"
    ]
  } as const satisfies GuidedClassSeed;
const RIVER_CROSSING_BUILT = buildGuidedClass(RIVER_CROSSING_SEED);
export const RIVER_CROSSING_GUIDANCE = RIVER_CROSSING_BUILT.guidance;
export const RIVER_CROSSING_SIMULATION = RIVER_CROSSING_BUILT.simulation;
export const RIVER_CROSSING_SCENE_METADATA = RIVER_CROSSING_BUILT.sceneMetadata;

const ROCK_CLIMBING_SEED = {
    "name": "rock-climbing",
    "constant": "ROCK_CLIMBING",
    "viewer": "RockClimbingViewer",
    "slug": "c5-ch09-a02-rock-climbing",
    "moduleId": "sim-c05-ch09-a02-rock-climbing",
    "viewerKey": "guided-rock-climbing",
    "legacyPath": "/simulations/up-you-go-rock-climbing",
    "environment": "up-you-go-rock-climbing-360.png",
    "title": "Rock Climbing",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 8,
    "maxDuration": 10,
    "comfort": "medium",
    "conceptId": "concept-protected-rock-climbing",
    "curriculumId": "cm-cbse-c5-ch09-rock-climbing",
    "packageSize": 150,
    "headline": "Protected climbing investigator",
    "objective": "Connect route observation, checked equipment, three-point movement, slip protection, posture, and rappelling.",
    "safety": "This is not real climbing instruction; qualified supervision and approved equipment are mandatory.",
    "stages": [
      {
        "id": "arrive",
        "title": "Arrive at the Training Rock",
        "actionId": "inspect-climbing-route",
        "evidenceId": "supervised-route-observed",
        "cue": "Survey the tall rock, the supervised route and the safety team.",
        "detail": "In the NCERT story, the group walks 15 kilometres to Tekla village at 1,600 metres. Colonel Ram Singh waits near a 90-metre flat rock with pegs and ropes.",
        "actionLabel": "Observe the climbing route",
        "narrationText": "Welcome to Chapter 9, Up You Go, Activity 2, Rock Climbing. In the NCERT story, the group walks fifteen kilometres to Tekla village, at a height of sixteen hundred metres. Colonel Ram Singh waits near a ninety metre flat rock with pegs and ropes. Look around the supervised training area and find the planned route.",
        "audioKey": "5ab3vl",
        "audioSha256": "4d1e27a9d03b997e15eadba174956b6dd4f8d0ea258a9fed250bfd8d89515af5",
        "audioByteSize": 156096
      },
      {
        "id": "holds",
        "title": "Identify Hand and Foot Holds",
        "actionId": "identify-secure-holds",
        "evidenceId": "hold-route-observed",
        "cue": "Follow the glowing route and inspect each crack, ledge and firm hold.",
        "detail": "Before climbing, the group is told to observe the rock carefully and identify holds—places where hands and feet can be placed securely.",
        "actionLabel": "Check the equipment",
        "narrationText": "Before anyone starts climbing, observe the rock carefully. Identify the holds: firm cracks, edges and ledges where hands and feet can be placed. Follow the glowing route from the ground towards the top marker. A careful climber studies the next move before leaving a secure position.",
        "audioKey": "g7h4vh",
        "audioSha256": "8344e339d6dbce1941d61c8d2ad9bc102ed7456ca3acf245d79df1087ae36adf",
        "audioByteSize": 134928
      },
      {
        "id": "equipment",
        "title": "Helmet, Harness, Sling and Rope",
        "actionId": "inspect-climbing-equipment",
        "evidenceId": "checked-equipment-observed",
        "cue": "Inspect the helmet, fitted harness, sling, locking connector and belay rope.",
        "detail": "A trained instructor fits and checks every connection. This simulation is for learning only; real rock climbing requires qualified supervision and approved equipment.",
        "actionLabel": "Try the first step",
        "narrationText": "Now inspect the safety equipment. The learner wears a helmet and a properly fitted harness. A sling and locking connector attach the learner to the rope, while a trained instructor controls the belay. Every item and anchor must be checked. Never attempt real rock climbing without qualified supervision and approved equipment.",
        "audioKey": "1ugu2e2",
        "audioSha256": "e037b28a251d3ddda7d65fe9730a490077cb5d66c6902d103898b51056f813b4",
        "audioByteSize": 154944
      },
      {
        "id": "slip",
        "intent": "M",
        "title": "The Rope Catches a Slip",
        "actionId": "observe-protected-slip",
        "evidenceId": "rope-supervision-evidence",
        "cue": "Watch the safety system hold the learner after the first foot slips.",
        "detail": "Sangeeta slips on her first step and swings from the rope. The secured sling and rope stop a fall while the instructor keeps the system controlled.",
        "actionLabel": "Correct the climbing posture",
        "narrationText": "The learner tries the first step, but the foot slips. In Sangeeta's story, she finds herself swinging from the rope. The secured sling, rope and instructor keep the slip controlled. She does not panic. She steadies herself, listens and prepares to try again.",
        "audioKey": "p490ym",
        "audioSha256": "eeecbbd9fc681478adf7a42fe1c22dcafadf44df487914be4ea81d042e813a22",
        "audioByteSize": 134208
      },
      {
        "id": "posture",
        "title": "Keep the Body at 90 Degrees",
        "actionId": "correct-climbing-posture",
        "evidenceId": "balanced-posture-observed",
        "cue": "Straighten the back and keep the body at a right angle while using the holds.",
        "detail": "The instructor calls out: keep your body at an angle of 90 degrees, keep your back straight and do not bend. Sangeeta imagines the rock as flat ground and starts again.",
        "actionLabel": "Climb hold by hold",
        "narrationText": "Listen to the instructor's advice: keep your body at an angle of ninety degrees while climbing. Keep your back straight. Do not bend. Sangeeta imagines the rock as flat ground, places her feet firmly and starts climbing again with a balanced posture.",
        "audioKey": "1ei9w6g",
        "audioSha256": "14fb796a96336147b8b2a6f81e9410164f1927b2e91ba19293f7e79ad64b21a5",
        "audioByteSize": 123840
      },
      {
        "id": "climb",
        "title": "Move with Three Secure Points",
        "actionId": "climb-hold-by-hold",
        "evidenceId": "three-points-observed",
        "cue": "Keep three points steady while moving one hand or foot to the next hold.",
        "detail": "Test each hold before shifting weight. Move calmly, keep the safety rope tensioned and listen to the instructor’s directions.",
        "actionLabel": "Reach the top marker",
        "narrationText": "Climb hold by hold. Keep three secure points in contact while moving only one hand or foot at a time. Test the next hold before shifting weight, keep the rope tensioned and follow the instructor's directions. Calm movement is more important than speed.",
        "audioKey": "iawj3x",
        "audioSha256": "bb7d61f62b8bcf4a07b44d6085f5e2434af4a862abd51bd54d1b58df8a318c2d",
        "audioByteSize": 120816
      },
      {
        "id": "rappel",
        "title": "Prepare to Rappel",
        "actionId": "rappel-under-supervision",
        "evidenceId": "controlled-rappel-observed",
        "cue": "Pause at the top marker and check the rope before descending.",
        "detail": "After climbing, the group comes down using the rope in a special controlled way called rappelling. The instructor checks the connection and descent path.",
        "actionLabel": "Rappel down the rock",
        "narrationText": "You have reached the top marker. Pause and check the rope before the descent. In the chapter, the group comes down using the rope in a special controlled way called rappelling. Lean back with a straight body, keep the feet against the rock and descend only when the instructor says the system is ready.",
        "audioKey": "nnd7n9",
        "audioSha256": "1bc4a6bf9c2efbafa850c77cc7c56a00dc63961bc95e22c915bc861884fb4295",
        "audioByteSize": 134784
      },
      {
        "id": "review",
        "intent": "T",
        "title": "Rock Climbing Complete",
        "actionId": "apply-climbing-safety-rule",
        "evidenceId": "rock-transfer-evidence",
        "cue": "Connect observation, equipment, posture, careful movement and courage.",
        "detail": "Sangeeta faces her fear, learns from the slip, follows the instructor and completes both the climb and the rappel. Preparation turns courage into safe, disciplined action.",
        "actionLabel": "Activity complete",
        "narrationText": "Rock climbing complete. You observed the route, identified holds, checked the helmet, harness, sling and rope, recovered from a slip, used a straight ninety degree posture, climbed carefully and rappelled down. Courage grows when preparation, discipline and expert guidance work together.",
        "audioKey": "1x2klvi",
        "audioSha256": "5f0f83983e47ecb25166eaaa6e907b5264c48c77ec7896f51255005302895f66",
        "audioByteSize": 136224
      }
    ],
    "assessments": [
      {
        "question": "What stops the controlled slip?",
        "correct": "The checked harness, sling, rope, anchor, and trained belayer work as a system.",
        "distractor": "The helmet alone holds the climber."
      },
      {
        "question": "May this route be attempted after the simulation?",
        "correct": "No; real climbing requires qualified supervision and approved equipment.",
        "distractor": "Yes; remembering the button sequence is enough."
      }
    ],
    "integrity": [
      178540,
      "d85fe8365b21aed71c67ca79aa3030413d196539bba4a0710feb06c2da056421"
    ]
  } as const satisfies GuidedClassSeed;
const ROCK_CLIMBING_BUILT = buildGuidedClass(ROCK_CLIMBING_SEED);
export const ROCK_CLIMBING_GUIDANCE = ROCK_CLIMBING_BUILT.guidance;
export const ROCK_CLIMBING_SIMULATION = ROCK_CLIMBING_BUILT.simulation;
export const ROCK_CLIMBING_SCENE_METADATA = ROCK_CLIMBING_BUILT.sceneMetadata;

const CAMP_IN_SNOW_SEED = {
    "name": "camp-in-snow",
    "constant": "CAMP_IN_SNOW",
    "viewer": "CampInSnowViewer",
    "slug": "c5-ch09-a03-camp-in-the-snow",
    "moduleId": "sim-c05-ch09-a03-camp-in-the-snow",
    "viewerKey": "guided-camp-in-snow",
    "legacyPath": "/simulations/up-you-go-camp-in-snow",
    "environment": "up-you-go-camp-in-snow-360.png",
    "title": "Camp in the Snow",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "virtualFieldVisit",
    "duration": 9,
    "maxDuration": 11,
    "comfort": "medium",
    "conceptId": "concept-cold-weather-camping",
    "curriculumId": "cm-cbse-c5-ch09-camp-in-snow",
    "packageSize": 225,
    "headline": "Cold-weather camp investigator",
    "objective": "Explain tent and sleeping-bag insulation, anchoring, drainage, supervised cooking, waste removal, and careful snow travel.",
    "safety": "A trained leader chooses the site and weather window; only trained adults manage fire away from tents.",
    "stages": [
      {
        "id": "site",
        "title": "Reach the 2,134 Metre Camp",
        "actionId": "choose-safe-tent-site",
        "evidenceId": "safe-site-observed",
        "cue": "Survey the snowy campsite and choose a safe, level place for the night.",
        "detail": "On 18 February 1984, the group stopped at 2,134 metres. A trained leader checks the weather, wind, ground and distance from steep slopes before anyone begins.",
        "actionLabel": "Choose the tent site",
        "narrationText": "Welcome to Chapter 9, Up You Go, Activity 3, Camp in the Snow. On the eighteenth of February, nineteen eighty-four, the group reached a height of two thousand one hundred and thirty-four metres. They would spend the night here. Look around with the leader and choose a level campsite away from steep slopes and other hazards."
      },
      {
        "id": "tent",
        "intent": "M",
        "title": "Build a Double-Layer Tent",
        "actionId": "raise-double-layer-tent",
        "evidenceId": "trapped-air-insulation-evidence",
        "cue": "Place one sheet on the ground and raise two separated tent layers.",
        "detail": "The story describes double-layered plastic sheets for both the tent and ground. Still air trapped between the layers slows heat transfer and helps the inside stay warmer.",
        "actionLabel": "Raise the double layers",
        "narrationText": "Now build the shelter described in the story. Put a protective sheet on the snowy ground, then raise two tent layers with a small gap between them. The still air trapped between the layers slows the movement of heat. This insulation helps the inside of the tent stay warmer than the cold air outside."
      },
      {
        "id": "lines",
        "title": "Secure Pegs and Guy Lines",
        "actionId": "tension-guy-lines",
        "evidenceId": "anchored-tent-observed",
        "cue": "Push every peg firmly and tighten opposite guy lines against the wind.",
        "detail": "When the group tied one side, the wind lifted the other. Working together, they pulled, tugged, checked each peg and finally secured the tent.",
        "actionLabel": "Tension every line",
        "narrationText": "The mountain wind pulls hard at the tent. When the group tied one side, the other side flew up. Work as a team. Push each peg firmly into the ground, tighten opposite guy lines evenly, and check every connection until the tent remains stable."
      },
      {
        "id": "drain",
        "title": "Dig a Drain Around the Tent",
        "actionId": "dig-drainage-channel",
        "evidenceId": "meltwater-diverted-observed",
        "cue": "Form a shallow channel outside the groundsheet without weakening the pegs.",
        "detail": "A drain guides melting snow and rainwater away from the sleeping area. The trench stays outside the tent edge so water does not collect beneath the groundsheet.",
        "actionLabel": "Complete the drainage channel",
        "narrationText": "Dig a shallow drainage channel around the outside of the tent. The channel guides melting snow or rainwater away from the groundsheet. Keep it beyond the tent edge and away from the pegs, so the sleeping area stays dry and the anchors remain firm."
      },
      {
        "id": "cook",
        "title": "Cook at a Safe Stone Chulha",
        "actionId": "prepare-supervised-meal",
        "evidenceId": "fire-boundary-observed",
        "cue": "Build the cooking place away from the tent and heat a simple meal together.",
        "detail": "The hungry group collected firewood and stones to make a chulha. Fire is handled only by trained adults, away from tent fabric, with water ready and the embers fully extinguished.",
        "actionLabel": "Prepare the warm meal",
        "narrationText": "Everyone is hungry. In the textbook story, the group collects firewood and stones to make a chulha and cook food. In a real camp, only trained adults manage fire, well away from tents and dry equipment. Keep water ready and extinguish every ember after cooking."
      },
      {
        "id": "waste",
        "title": "Leave the Campsite Clean",
        "actionId": "pack-camp-waste",
        "evidenceId": "leave-no-trace-observed",
        "cue": "Collect every food wrapper and piece of waste in the camp bag.",
        "detail": "After the meal, the group put all waste in a bag. Mountain visitors carry rubbish back instead of burying, burning or leaving it where it can harm wildlife.",
        "actionLabel": "Pack all the waste",
        "narrationText": "The meal is finished, but the campsite is not finished with us. Collect every scrap and wrapper in the waste bag. Carry rubbish back from the mountain. A responsible camper leaves the ground, plants and wildlife as clean and undisturbed as possible."
      },
      {
        "id": "sleep",
        "title": "Rest in Feather Sleeping Bags",
        "actionId": "enter-sleeping-bag",
        "evidenceId": "sleeping-bag-insulation-observed",
        "cue": "Step into the dry sleeping bag and close it around the body.",
        "detail": "The soft feathers trap many tiny pockets of air. Like the tent’s double layer, this trapped air slows heat loss and helps a tired camper stay warm through the cold night.",
        "actionLabel": "Settle in for the night",
        "narrationText": "It is time to rest. The group climbs into sleeping bags filled with soft feathers. The feathers hold many small pockets of still air, which slow heat loss from the body. Keep the sleeping bag dry, close it comfortably and notice how insulation works in both the bag and the double-layer tent."
      },
      {
        "id": "morning",
        "intent": "T",
        "title": "Wake to Falling Snow",
        "actionId": "apply-snow-camp-rule",
        "evidenceId": "camp-transfer-evidence",
        "cue": "Use walking sticks, take short steps and climb carefully toward 2,700 metres.",
        "detail": "The next morning everything looked white. The group walked carefully because the snow was slippery, using sticks for balance before reaching the snow-covered mountains by afternoon.",
        "actionLabel": "Activity complete",
        "narrationText": "Morning arrives with soft, fluffy snowflakes. Trees, grass and mountains look white. The group must climb higher, towards two thousand seven hundred metres. Snow is slippery, so take short careful steps and use walking sticks for balance. Camp in the Snow complete: shelter, insulation, drainage, warmth, cleanliness and teamwork made the night possible."
      }
    ],
    "assessments": [
      {
        "question": "Why do two tent layers and feathers help?",
        "correct": "They trap still air that slows heat transfer.",
        "distractor": "They create heat without reducing heat loss."
      },
      {
        "question": "Which campsite decision is responsible?",
        "correct": "A trained leader selects level ground, safe weather, drainage, and distance from hazards.",
        "distractor": "Pitch beside a steep slope because it blocks wind."
      }
    ],
    "integrity": [
      109680,
      "04201622d5c3145897f7a0f8511c3a02f2e2a68c39feafaa28257201287b937b"
    ]
  } as const satisfies GuidedClassSeed;
const CAMP_IN_SNOW_BUILT = buildGuidedClass(CAMP_IN_SNOW_SEED);
export const CAMP_IN_SNOW_GUIDANCE = CAMP_IN_SNOW_BUILT.guidance;
export const CAMP_IN_SNOW_SIMULATION = CAMP_IN_SNOW_BUILT.simulation;
export const CAMP_IN_SNOW_SCENE_METADATA = CAMP_IN_SNOW_BUILT.sceneMetadata;

const SNOW_MOUNTAIN_CLIMBING_SEED = {
    "name": "snow-mountain-climbing",
    "constant": "SNOW_MOUNTAIN_CLIMBING",
    "viewer": "SnowMountainClimbingViewer",
    "slug": "c5-ch09-a04-snow-mountain-climbing",
    "moduleId": "sim-c05-ch09-a04-snow-mountain-climbing",
    "viewerKey": "guided-snow-mountain-climbing",
    "legacyPath": "/simulations/up-you-go-snow-mountain-climbing",
    "environment": "up-you-go-snow-mountain-climbing-360.png",
    "title": "Snow Mountain Climbing",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "virtualFieldVisit",
    "duration": 9,
    "maxDuration": 11,
    "comfort": "medium",
    "conceptId": "concept-snow-mountain-safety",
    "curriculumId": "cm-cbse-c5-ch09-snow-mountain",
    "packageSize": 225,
    "headline": "Snow-mountain decision investigator",
    "objective": "Explain route, equipment, group pacing, stick-step balance, supervised rope practice, recovery, and turnaround decisions.",
    "safety": "Never leave the marked route, climb alone, or treat the simulation as mountaineering training.",
    "stages": [
      {
        "id": "route",
        "title": "Read the Snow-Mountain Route",
        "actionId": "approve-marked-route",
        "evidenceId": "weather-route-observed",
        "cue": "Observe the weather, slope and marker poles before leaving the 2,134-metre camp.",
        "detail": "The textbook group woke to falling snow and planned a climb toward 2,700 metres. A trained leader checks visibility, wind, surface snow and the safe return time before the group moves.",
        "actionLabel": "Approve the marked route",
        "narrationText": "Welcome to Chapter 9, Up You Go, Activity 4, Snow Mountain Climbing. The group wakes at the two thousand one hundred and thirty-four metre camp and sees fresh snow. Today they will climb carefully toward two thousand seven hundred metres. Begin by reading the weather, the slope and the marker poles with a trained leader. The climb starts only when the route and return time are safe."
      },
      {
        "id": "equipment",
        "title": "Prepare Warm Layers and Equipment",
        "actionId": "complete-cold-equipment-check",
        "evidenceId": "cold-equipment-observed",
        "cue": "Check boots, warm layers, gloves, eye protection, water, whistle and walking sticks.",
        "detail": "Clothing is layered so damp or warm layers can be adjusted. Firm boots improve grip, gloves protect hands, and eye protection reduces glare from bright snow. The leader checks every learner.",
        "actionLabel": "Complete the equipment check",
        "narrationText": "Prepare for cold and bright snow. Wear adjustable warm layers, firm boots, gloves and eye protection. Carry water and a whistle, and check both walking sticks. The equipment supports safe movement, but it does not replace trained supervision or good decisions. The leader checks every member before the group leaves."
      },
      {
        "id": "group",
        "title": "Move as One Group",
        "actionId": "begin-supervised-climb",
        "evidenceId": "group-pace-observed",
        "cue": "Follow the marker poles, keep visual contact and match the slowest member's pace.",
        "detail": "The chapter describes a leader who helps others, watches anyone who feels unwell and stays near the back. No learner leaves the marked route or climbs alone.",
        "actionLabel": "Begin the supervised climb",
        "narrationText": "Move as one group along the marked route. Match the pace of the slowest member and keep everyone in sight. The textbook describes a leader who helps others, watches anyone who feels unwell and stays near the back. No one takes a shortcut or climbs alone."
      },
      {
        "id": "steps",
        "title": "Plant, Step, Balance",
        "actionId": "practise-snow-steps",
        "evidenceId": "stick-step-balance-observed",
        "cue": "Plant the stick, test the snow, then take one short deliberate step.",
        "detail": "The group used sticks because it kept slipping on the snow. Short steps keep the body balanced, while a planted stick provides an extra contact point before weight moves forward.",
        "actionLabel": "Practise careful snow steps",
        "narrationText": "The snow is slippery, just as the textbook group discovered. Use a simple rhythm: plant the stick, test the surface, then take one short step. Keep the body balanced over the feet and avoid sudden turns. The stick becomes an extra point of contact, helping you notice soft or uneven snow before shifting your weight."
      },
      {
        "id": "rope",
        "intent": "M",
        "title": "Practise on the Fixed Safety Rope",
        "actionId": "cross-fixed-rope-section",
        "evidenceId": "rope-not-permission-evidence",
        "cue": "At the training section, let the instructor inspect the anchor and clip the safety line.",
        "detail": "A fixed-rope section is used only under trained supervision. The learner checks the harness connection, keeps the rope above the body and moves one attachment at a time past each anchor.",
        "actionLabel": "Cross the protected section",
        "narrationText": "You have reached a short fixed-rope practice section. Only a trained instructor sets and checks this system. Inspect the anchor, harness connection and safety line. Keep the rope above the body and move carefully past one anchor at a time. This is protected practice, not permission to climb a real mountain without expert training."
      },
      {
        "id": "slip",
        "title": "Respond to a Slip",
        "actionId": "recover-stable-stance",
        "evidenceId": "three-contact-recovery-observed",
        "cue": "Stop, stay calm and let the protected system hold while the group follows the instructor.",
        "detail": "The simulation shows a small controlled training slip. The safety connection limits movement, the learner regains three stable contact points, and the team does not pull or rush unpredictably.",
        "actionLabel": "Recover a stable stance",
        "narrationText": "A boot slips a short distance during the protected exercise. Stay calm. The safety connection limits the movement. Follow the instructor, plant the stick or boot securely, and rebuild three stable points of contact before standing upright. Teammates remain steady and do not pull the rope unpredictably."
      },
      {
        "id": "height",
        "title": "Reach the 2,700 Metre Snowfield",
        "actionId": "complete-height-check",
        "evidenceId": "group-arrival-observed",
        "cue": "Arrive together, count the group and observe the snow-covered mountains.",
        "detail": "By afternoon, the textbook group reached the snow-covered mountains at about 2,700 metres. The achievement belongs to the whole group because everyone travelled carefully and helped one another.",
        "actionLabel": "Complete the height check",
        "narrationText": "By afternoon the group reaches the snow-covered mountains at about two thousand seven hundred metres. Count every member, pause in the protected snowfield and observe the white ridges. The chapter celebrates courage, but the achievement also comes from preparation, discipline and helping one another."
      },
      {
        "id": "return",
        "intent": "T",
        "title": "Return Before Conditions Change",
        "actionId": "apply-turnaround-rule",
        "evidenceId": "snow-transfer-evidence",
        "cue": "Turn back on the marked route while visibility and energy remain good.",
        "detail": "Reaching a high point is only half the journey. A responsible group descends together, carries all equipment and waste, reports any discomfort, and never treats this simulation as real mountaineering training.",
        "actionLabel": "Activity complete",
        "narrationText": "Now turn back while visibility, weather and energy remain good. Follow the same marker poles, keep the group together and carry every item and piece of waste down. Snow Mountain Climbing complete. You used route reading, equipment checks, teamwork, walking sticks, a protected rope and careful decisions to reach the snowfield and return responsibly."
      }
    ],
    "assessments": [
      {
        "question": "What does a fixed rope mean?",
        "correct": "It is one instructor-checked part of protected practice, not permission to climb alone.",
        "distractor": "It guarantees safety on any mountain."
      },
      {
        "question": "When should the group turn back?",
        "correct": "Before visibility, weather, time, or energy become unsafe, even after reaching a high point.",
        "distractor": "Only after the last learner is exhausted."
      }
    ],
    "integrity": [
      153126,
      "c650212a1a73002a26847815ef8e1851c9771a2118bc721c9550dc3b43ac3b69"
    ]
  } as const satisfies GuidedClassSeed;
const SNOW_MOUNTAIN_CLIMBING_BUILT = buildGuidedClass(SNOW_MOUNTAIN_CLIMBING_SEED);
export const SNOW_MOUNTAIN_CLIMBING_GUIDANCE = SNOW_MOUNTAIN_CLIMBING_BUILT.guidance;
export const SNOW_MOUNTAIN_CLIMBING_SIMULATION = SNOW_MOUNTAIN_CLIMBING_BUILT.simulation;
export const SNOW_MOUNTAIN_CLIMBING_SCENE_METADATA = SNOW_MOUNTAIN_CLIMBING_BUILT.sceneMetadata;

const ANCIENT_FORT_SEED = {
    "name": "ancient-fort",
    "constant": "ANCIENT_FORT",
    "viewer": "AncientFortVisitViewer",
    "slug": "c5-ch10-a01-a-visit-of-ancient-fort",
    "moduleId": "sim-c05-ch10-a01-a-visit-of-ancient-fort",
    "viewerKey": "guided-ancient-fort",
    "legacyPath": "/simulations/walls-tell-stories-ancient-fort-visit",
    "environment": "walls-tell-stories-ancient-fort-360.png",
    "title": "A Visit of an Ancient Fort",
    "classLevel": 5,
    "subject": "environmentalScience",
    "format": "virtualFieldVisit",
    "duration": 9,
    "maxDuration": 11,
    "comfort": "low",
    "conceptId": "concept-historical-evidence",
    "curriculumId": "cm-cbse-c5-ch10-ancient-fort",
    "packageSize": 225,
    "headline": "Fort evidence investigator",
    "objective": "Use Golconda architecture, water, acoustics, maps, and artefacts as limited historical evidence, then apply monument care.",
    "safety": "Stay on paths; do not touch, scratch, climb, remove material, or leave waste.",
    "stages": [
      {
        "id": "gate",
        "title": "Approach the Great Gate",
        "actionId": "inspect-fort-gate",
        "evidenceId": "defensive-gate-observed",
        "cue": "Observe the height, heavy wooden doors, iron spikes and very thick stone walls.",
        "detail": "At Golconda, the textbook children first notice the huge gate and massive walls. These features controlled entry and helped protect the people, homes and workplaces inside the fort.",
        "actionLabel": "Inspect the gate closely",
        "narrationText": "Welcome to Chapter 10, Walls Tell Stories, Activity 1, A Visit to an Ancient Fort. We are entering Golconda Fort in Hyderabad. Begin at the great gateway. Notice its height, the heavy wooden doors, pointed iron spikes and the enormous thickness of the stone walls. These are not decorations alone. Together they controlled entry and helped protect the busy settlement inside.",
        "audioKey": "1f4n10w",
        "audioSha256": "73be25ca8add7aef1aafc168ba4226650649190ce539db32677755956d151f02",
        "audioByteSize": 189648
      },
      {
        "id": "bastion",
        "title": "Look Out from a Bastion",
        "actionId": "reveal-bastion-view",
        "evidenceId": "wider-field-observed",
        "cue": "Compare a high rounded bastion with a long, straight section of wall.",
        "detail": "A bastion projects outward from the wall, giving observers a wider view in several directions. Golconda's outer wall is described as having 87 bastions, with openings that allowed watch from protected positions.",
        "actionLabel": "Reveal the wider field of view",
        "narrationText": "Now compare the straight fort wall with a rounded bastion. A bastion projects outward and rises above the wall, so a watcher can observe a much wider area and more than one direction. The chapter tells us that the outer wall of Golconda has eighty-seven bastions. Look through the openings and notice how the stone protects the observer while preserving a distant view.",
        "audioKey": "vs01zg",
        "audioSha256": "49716ea1129537b90c036df1f28192e92fbedf4fca8721f972e9a2b153e0a944",
        "audioByteSize": 164736
      },
      {
        "id": "map",
        "title": "Read the Fort as a Town",
        "actionId": "orient-fort-map",
        "evidenceId": "fortified-town-observed",
        "cue": "Use the map and compass to locate gates, palaces, gardens, fields, workshops and water places.",
        "detail": "Golconda was more than a ruler's residence. The map helped the children infer that farmers, craftspeople, workers and many families lived and worked inside this fortified town.",
        "actionLabel": "Orient the fort map",
        "narrationText": "Study the fort map and find the four directions. Mark the gates, palaces, gardens, fields, workshops and water places. Golconda was not only a palace for a ruler. The map suggests a complete fortified town where farmers, craftspeople, workers, families and officials lived and worked. A map turns scattered ruins into connected evidence about a community.",
        "audioKey": "1ek04iz",
        "audioSha256": "aee842a8cd9878a6ca0b6f0a460685de6834fb15b000f02a257520e193d0863b",
        "audioByteSize": 183456
      },
      {
        "id": "ruins",
        "title": "Investigate the Palace Ruins",
        "actionId": "highlight-architectural-clues",
        "evidenceId": "ruin-evidence-observed",
        "cue": "Examine steps, arches, rooms and fine stone carving without touching the surfaces.",
        "detail": "Ruined walls are evidence, not empty space. Their floors, halls, ventilation openings and carved details help us ask how buildings provided light, air and comfortable places centuries ago.",
        "actionLabel": "Highlight the architectural clues",
        "narrationText": "Walk carefully among the palace ruins. Observe the steps, arches, rooms, carved stone and openings for air and daylight. Missing roofs and broken walls do not make the place meaningless. Their shapes help us ask how halls were arranged and how people created comfortable spaces centuries ago. Look closely, but never touch or climb on fragile remains.",
        "audioKey": "dw5nrg",
        "audioSha256": "3fa937c455704262be6eae3eb20986f5e86fbc72d8ee372a86deda711d518919",
        "audioByteSize": 172224
      },
      {
        "id": "water",
        "title": "Trace the Water Engineering",
        "actionId": "start-water-lifting-model",
        "evidenceId": "non-electric-water-system-observed",
        "cue": "Follow water from a well to a chain of pots, storage tanks, clay pipes and terrace fountains.",
        "detail": "The chapter shows how animal power, toothed wheels and a moving chain of pots could lift water. Tanks stored it and clay pipes carried it to different parts of the palace without electric pumps.",
        "actionLabel": "Start the water-lifting model",
        "narrationText": "Trace the old water system. Animal power could turn toothed wheels, moving a chain of pots that lifted water from a well. Water then collected in tanks and travelled through clay pipes to rooms, gardens and fountains, even at higher levels. This engineering used gravity, stored energy and careful planning long before electric pumps were available.",
        "audioKey": "1ifzmpu",
        "audioSha256": "58c6a0d27595e9e1f692b9be6558273329684a821c658f042970f2d7d3dd6677",
        "audioByteSize": 161136
      },
      {
        "id": "sound",
        "title": "Test the Fort's Acoustics",
        "actionId": "send-acoustic-signal",
        "evidenceId": "reflected-sound-observed",
        "cue": "Send a supervised clap from the gateway and watch sound waves travel toward the palace.",
        "detail": "The children learn that a voice or clap near Fateh Darwaza could be heard at the king's palace. The shape and hard surfaces guide reflected sound; the simulation visualises this effect without claiming a single simple path.",
        "actionLabel": "Send the acoustic signal",
        "narrationText": "At Fateh Darwaza, make one supervised clap. The hard curved surfaces reflect and guide sound, allowing a signal from the gateway to be heard near the palace. Watch the rings show several reflected paths. The exact acoustic pattern is complex, but the experience teaches us that builders understood how the form and material of a space could help communication.",
        "audioKey": "1cxmbxz",
        "audioSha256": "1f3b0ec059b666f5c6c778d03204d1fed3614e73dc243c30f9193f89e6b664ed",
        "audioByteSize": 164016
      },
      {
        "id": "evidence",
        "intent": "M",
        "title": "Let Objects Tell Stories",
        "actionId": "compare-historical-sources",
        "evidenceId": "one-object-limit-evidence",
        "cue": "Inspect pottery, metalwork and building traces, then separate evidence from imagination.",
        "detail": "Maps, old paintings, records and excavated objects help historians study daily life. A broken pot is valuable evidence about materials and skills, but one object cannot tell us every detail by itself.",
        "actionLabel": "Connect each clue to a question",
        "narrationText": "Now examine the evidence collected around the fort: pottery fragments, metal objects, maps, paintings, records and building marks. Each clue can answer some questions about materials, work and daily life. Historians compare several sources because one broken pot cannot prove every detail. Use evidence first, and clearly label anything that is only an informed imagination.",
        "audioKey": "g5vwfy",
        "audioSha256": "296eb603e54c9958de0157d3b0dff317409da012138d5c110cca6714f820f936",
        "audioByteSize": 179568
      },
      {
        "id": "care",
        "intent": "T",
        "title": "Protect the Story in the Walls",
        "actionId": "apply-monument-care-rule",
        "evidenceId": "heritage-transfer-evidence",
        "cue": "Leave every surface untouched, carry waste out and report damage instead of adding marks.",
        "detail": "Historic walls have survived rulers, work, celebration, conflict and weather. Visitors protect that shared story by following site rules, staying on paths and never scratching or writing on the monument.",
        "actionLabel": "Visit complete",
        "narrationText": "Complete the visit by protecting the monument. Do not scratch names, touch carvings, remove stones or leave rubbish. Stay on marked paths and tell a responsible adult or site worker if you see damage. The walls have witnessed centuries of life and change. When we care for them, their evidence remains available for the next generation. Your ancient fort visit is complete.",
        "audioKey": "rxzofw",
        "audioSha256": "19348c34befc61514f4f8e1b16e09ecb8f0fa4eb54bc803c8afae679b12a3e3e",
        "audioByteSize": 181728
      }
    ],
    "assessments": [
      {
        "question": "Can one broken pot explain all daily life?",
        "correct": "No; historians compare objects, buildings, maps, paintings, and records.",
        "distractor": "Yes; one artefact proves every detail."
      },
      {
        "question": "How should a visitor respond to damage?",
        "correct": "Avoid touching it, keep the site clean, and report it to a responsible adult/site worker.",
        "distractor": "Scratch a note beside it so others notice."
      }
    ],
    "integrity": [
      156696,
      "8314c25564d8bff0277af1259b839281730ed0741766e14c33f8b08f0df86a7f"
    ]
  } as const satisfies GuidedClassSeed;
const ANCIENT_FORT_BUILT = buildGuidedClass(ANCIENT_FORT_SEED);
export const ANCIENT_FORT_GUIDANCE = ANCIENT_FORT_BUILT.guidance;
export const ANCIENT_FORT_SIMULATION = ANCIENT_FORT_BUILT.simulation;
export const ANCIENT_FORT_SCENE_METADATA = ANCIENT_FORT_BUILT.sceneMetadata;

const COTTON_FARMING_SEED = {
    "name": "cotton-farming",
    "constant": "COTTON_FARMING",
    "viewer": "CottonFarmingViewer",
    "slug": "c6-ch03-a01-cotton-farming",
    "moduleId": "sim-c06-ch03-a01-cotton-farming",
    "viewerKey": "guided-cotton-farming",
    "legacyPath": "/simulations/fibre-to-fabric-cotton-farming",
    "environment": "cotton-field-360.png",
    "title": "Cotton Farming",
    "classLevel": 6,
    "subject": "environmentalScience",
    "format": "interactive3d",
    "duration": 10,
    "maxDuration": 12,
    "comfort": "low",
    "conceptId": "concept-cotton-farming",
    "curriculumId": "cm-cbse-c6-ch03-cotton-farming",
    "packageSize": 250,
    "headline": "Cotton field investigator",
    "objective": "Sequence black-soil preparation, sowing, watering, flowering, boll maturation, and harvest, identifying cotton as plant fibre.",
    "safety": "The field is a visual model; agricultural tools and chemicals require trained adult handling.",
    "stages": [
      {
        "id": "visit",
        "title": "Visit the Cotton Field",
        "actionId": "enter-cotton-field",
        "evidenceId": "plant-fibre-origin-observed",
        "cue": "Discover how soft cotton fibre begins its journey on a farm.",
        "detail": "Cotton is a plant fibre. Farmers grow it as a crop before its fibres can become yarn and fabric.",
        "actionLabel": "Enter the field",
        "narrationText": "Welcome to Activity 1, Cotton Farming. Cotton fibre begins its journey as a crop in the field."
      },
      {
        "id": "soil",
        "title": "Prepare Black Soil",
        "actionId": "prepare-black-soil",
        "evidenceId": "prepared-soil-observed",
        "cue": "Loosen and level the dark soil so roots can spread.",
        "detail": "Cotton grows well in warm conditions and black soil. Prepared soil also helps seeds receive air and water.",
        "actionLabel": "Prepare the soil",
        "narrationText": "Prepare the black soil. Loose, level soil gives cotton roots air, water and room to grow."
      },
      {
        "id": "sow",
        "title": "Sow Cotton Seeds",
        "actionId": "sow-spaced-seeds",
        "evidenceId": "row-spacing-observed",
        "cue": "Place seeds in evenly spaced rows and cover them lightly.",
        "detail": "Spacing gives each cotton plant room for sunlight, water and healthy root growth.",
        "actionLabel": "Sow the seeds",
        "narrationText": "Sow cotton seeds in evenly spaced rows and cover them lightly with soil."
      },
      {
        "id": "water",
        "title": "Give Water and Warmth",
        "actionId": "water-cotton-rows",
        "evidenceId": "seedlings-observed",
        "cue": "Water the field gently and let the warm climate support growth.",
        "detail": "The seeds germinate, and young green cotton plants emerge from the soil.",
        "actionLabel": "Water the rows",
        "narrationText": "Water the rows gently. In warm conditions, seedlings emerge and grow into green cotton plants."
      },
      {
        "id": "flowers",
        "title": "Watch Flowers Form Bolls",
        "actionId": "grow-cotton-bolls",
        "evidenceId": "flower-to-boll-observed",
        "cue": "Observe flowers changing into green fruits called cotton bolls.",
        "detail": "Cotton fibres and seeds develop together inside each protective boll.",
        "actionLabel": "Grow the bolls",
        "narrationText": "Watch the flowers form green fruits called cotton bolls. Fibres and seeds develop inside them."
      },
      {
        "id": "mature",
        "intent": "M",
        "title": "Let the Bolls Mature",
        "actionId": "open-ripe-bolls",
        "evidenceId": "fibre-around-seed-evidence",
        "cue": "Wait until the ripe bolls burst open and reveal white cotton.",
        "detail": "The fluffy fibres surrounding the seeds become visible when mature cotton bolls split open.",
        "actionLabel": "Open the ripe bolls",
        "narrationText": "Let the bolls mature. Ripe cotton bolls burst open and reveal soft white fibres around the seeds."
      },
      {
        "id": "pick",
        "intent": "T",
        "title": "Pick the Cotton",
        "actionId": "apply-field-to-gin-rule",
        "evidenceId": "cotton-farming-transfer-evidence",
        "cue": "Harvest the clean, dry cotton from the open bolls.",
        "detail": "The picked cotton is ready for ginning, where fibres are separated from seeds before spinning.",
        "actionLabel": "Farming complete",
        "narrationText": "Pick the clean, dry cotton. It will next be ginned to separate the fibres from the seeds."
      }
    ],
    "assessments": [
      {
        "question": "Where are cotton fibre and seeds before harvest?",
        "correct": "They develop together inside the boll; ripe bolls open to reveal fibre around seeds.",
        "distractor": "Cotton fibre is made from flower petals after picking."
      },
      {
        "question": "What happens after clean dry cotton is picked?",
        "correct": "Ginning separates fibre from seeds before spinning.",
        "distractor": "It becomes fabric without separation or yarn."
      }
    ],
    "integrity": [
      154134,
      "c9744cdbf040de1ec8adb09ee31273fa9a4cf292325531b2eef7df523c96c47f"
    ]
  } as const satisfies GuidedClassSeed;
const COTTON_FARMING_BUILT = buildGuidedClass(COTTON_FARMING_SEED);
export const COTTON_FARMING_GUIDANCE = COTTON_FARMING_BUILT.guidance;
export const COTTON_FARMING_SIMULATION = COTTON_FARMING_BUILT.simulation;
export const COTTON_FARMING_SCENE_METADATA = COTTON_FARMING_BUILT.sceneMetadata;

const COTTON_GINNING_SEED = {
    "name": "cotton-ginning",
    "constant": "COTTON_GINNING",
    "viewer": "CottonGinningViewer",
    "slug": "c6-ch03-a02-the-process-of-cotton-ginning",
    "moduleId": "sim-c06-ch03-a02-the-process-of-cotton-ginning",
    "viewerKey": "guided-cotton-ginning",
    "legacyPath": "/simulations/fibre-to-fabric-cotton-ginning",
    "environment": "cotton-ginning-workshop-360.png",
    "title": "The Process of Cotton Ginning",
    "classLevel": 6,
    "subject": "science",
    "format": "guidedVisualization",
    "duration": 10,
    "maxDuration": 12,
    "comfort": "low",
    "conceptId": "concept-cotton-ginning",
    "curriculumId": "cm-cbse-c6-ch03-cotton-ginning",
    "packageSize": 210,
    "headline": "Cotton ginning investigator",
    "objective": "Explain how a narrow roller gap separates soft fibre from larger cotton seeds and prepares fibre for spinning.",
    "safety": "The machine is a visual model; keep hands away from real rollers and use guarded equipment only with trained adults.",
    "stages": [
      {
        "id": "mission",
        "title": "The Ginning Mission",
        "actionId": "begin-ginning-investigation",
        "evidenceId": "seeded-cotton-observed",
        "cue": "How can we separate soft cotton fibres from the seeds inside them?",
        "detail": "Freshly picked cotton contains fibres wrapped around many seeds. These must be separated before spinning.",
        "actionLabel": "Begin the investigation",
        "narrationText": "Welcome to Activity 2, the process of cotton ginning. Your mission is to separate cotton fibres from their seeds."
      },
      {
        "id": "inspect",
        "title": "Inspect Picked Cotton",
        "actionId": "inspect-fibre-and-seeds",
        "evidenceId": "clinging-fibre-observed",
        "cue": "Open a cotton boll and look closely at the fibre-covered seeds.",
        "detail": "The white fibres cling tightly to the seeds, so simply shaking the cotton will not separate them.",
        "actionLabel": "Inspect fibre and seeds",
        "narrationText": "Inspect the picked cotton. Soft white fibres are wrapped tightly around several seeds."
      },
      {
        "id": "load",
        "title": "Load the Cotton Gin",
        "actionId": "load-cotton-gin",
        "evidenceId": "even-feed-observed",
        "cue": "Place a small bundle of dry picked cotton on the feed tray.",
        "detail": "Feed an even layer toward the rollers so the machine can grip the fibres safely.",
        "actionLabel": "Load picked cotton",
        "narrationText": "Load a thin, even bundle of dry cotton onto the ginning machine's feed tray."
      },
      {
        "id": "rollers",
        "intent": "M",
        "title": "Turn the Rollers",
        "actionId": "turn-gin-handle",
        "evidenceId": "roller-gap-evidence",
        "cue": "Rotate the handle and watch the rollers pull the fibres forward.",
        "detail": "The narrow gap lets soft fibres pass through while the larger seeds cannot follow them.",
        "actionLabel": "Turn the gin handle",
        "narrationText": "Turn the handle. The rollers pull fibres through a narrow gap while the larger seeds are held back and fall away."
      },
      {
        "id": "outputs",
        "title": "Collect Both Outputs",
        "actionId": "collect-ginning-outputs",
        "evidenceId": "two-outputs-observed",
        "cue": "Gather the clean cotton fibre and the separated cotton seeds.",
        "detail": "Ginning produces two visible groups: fluffy fibre on one side and seeds in a separate tray.",
        "actionLabel": "Collect fibre and seeds",
        "narrationText": "Collect both outputs. Clean fluffy fibre gathers on one side, and separated cotton seeds collect below."
      },
      {
        "id": "confirm",
        "intent": "T",
        "title": "Confirm the Process",
        "actionId": "apply-ginning-rule",
        "evidenceId": "ginning-transfer-evidence",
        "cue": "Compare the input with the two separated outputs.",
        "detail": "Ginning is the process of separating cotton fibres from cotton seeds. The clean fibres are now ready for spinning into yarn.",
        "actionLabel": "Ginning complete",
        "narrationText": "Ginning means separating cotton fibres from cotton seeds. The clean fibre is ready for spinning into yarn."
      }
    ],
    "assessments": [
      {
        "question": "How do the rollers separate cotton?",
        "correct": "Soft fibres pass through the narrow gap while larger seeds are held back.",
        "distractor": "The rollers dissolve the seeds."
      },
      {
        "question": "What is the clean fibre ready for?",
        "correct": "Spinning into yarn, then making fabric.",
        "distractor": "Planting as cotton seed."
      }
    ],
    "integrity": [
      139610,
      "272ff258259f548525761ab3c51e02a85da5b45d576a2ad993ade1b6bedaca4c"
    ]
  } as const satisfies GuidedClassSeed;
const COTTON_GINNING_BUILT = buildGuidedClass(COTTON_GINNING_SEED);
export const COTTON_GINNING_GUIDANCE = COTTON_GINNING_BUILT.guidance;
export const COTTON_GINNING_SIMULATION = COTTON_GINNING_BUILT.simulation;
export const COTTON_GINNING_SCENE_METADATA = COTTON_GINNING_BUILT.sceneMetadata;

export const GUIDED_SIMULATION_DEFINITIONS = [
  FOOD_SPOILAGE_GUIDANCE,
  MILK_SPOILAGE_GUIDANCE,
  AAM_PAPAD_GUIDANCE,
  PITCHER_PLANT_GUIDANCE,
  SEED_DISPERSAL_GUIDANCE,
  RAINWATER_STORAGE_GUIDANCE,
  STEPWELL_STRUCTURE_GUIDANCE,
  DEAD_SEA_SALT_WATER_GUIDANCE,
  MALARIA_DIAGNOSIS_GUIDANCE,
  MOSQUITO_LIFE_CYCLE_GUIDANCE,
  RIVER_CROSSING_GUIDANCE,
  ROCK_CLIMBING_GUIDANCE,
  CAMP_IN_SNOW_GUIDANCE,
  SNOW_MOUNTAIN_CLIMBING_GUIDANCE,
  ANCIENT_FORT_GUIDANCE,
  COTTON_FARMING_GUIDANCE,
  COTTON_GINNING_GUIDANCE,
] as const;
export const GUIDED_IMPLEMENTED_SIMULATIONS = [
  FOOD_SPOILAGE_SIMULATION,
  MILK_SPOILAGE_SIMULATION,
  AAM_PAPAD_SIMULATION,
  PITCHER_PLANT_SIMULATION,
  SEED_DISPERSAL_SIMULATION,
  RAINWATER_STORAGE_SIMULATION,
  STEPWELL_STRUCTURE_SIMULATION,
  DEAD_SEA_SALT_WATER_SIMULATION,
  MALARIA_DIAGNOSIS_SIMULATION,
  MOSQUITO_LIFE_CYCLE_SIMULATION,
  RIVER_CROSSING_SIMULATION,
  ROCK_CLIMBING_SIMULATION,
  CAMP_IN_SNOW_SIMULATION,
  SNOW_MOUNTAIN_CLIMBING_SIMULATION,
  ANCIENT_FORT_SIMULATION,
  COTTON_FARMING_SIMULATION,
  COTTON_GINNING_SIMULATION,
] as const;
export const GUIDED_SCENE_METADATA_BY_MODULE_ID = Object.freeze(Object.fromEntries([
  [FOOD_SPOILAGE_SIMULATION.module.id, FOOD_SPOILAGE_SCENE_METADATA],
  [MILK_SPOILAGE_SIMULATION.module.id, MILK_SPOILAGE_SCENE_METADATA],
  [AAM_PAPAD_SIMULATION.module.id, AAM_PAPAD_SCENE_METADATA],
  [PITCHER_PLANT_SIMULATION.module.id, PITCHER_PLANT_SCENE_METADATA],
  [SEED_DISPERSAL_SIMULATION.module.id, SEED_DISPERSAL_SCENE_METADATA],
  [RAINWATER_STORAGE_SIMULATION.module.id, RAINWATER_STORAGE_SCENE_METADATA],
  [STEPWELL_STRUCTURE_SIMULATION.module.id, STEPWELL_STRUCTURE_SCENE_METADATA],
  [DEAD_SEA_SALT_WATER_SIMULATION.module.id, DEAD_SEA_SALT_WATER_SCENE_METADATA],
  [MALARIA_DIAGNOSIS_SIMULATION.module.id, MALARIA_DIAGNOSIS_SCENE_METADATA],
  [MOSQUITO_LIFE_CYCLE_SIMULATION.module.id, MOSQUITO_LIFE_CYCLE_SCENE_METADATA],
  [RIVER_CROSSING_SIMULATION.module.id, RIVER_CROSSING_SCENE_METADATA],
  [ROCK_CLIMBING_SIMULATION.module.id, ROCK_CLIMBING_SCENE_METADATA],
  [CAMP_IN_SNOW_SIMULATION.module.id, CAMP_IN_SNOW_SCENE_METADATA],
  [SNOW_MOUNTAIN_CLIMBING_SIMULATION.module.id, SNOW_MOUNTAIN_CLIMBING_SCENE_METADATA],
  [ANCIENT_FORT_SIMULATION.module.id, ANCIENT_FORT_SCENE_METADATA],
  [COTTON_FARMING_SIMULATION.module.id, COTTON_FARMING_SCENE_METADATA],
  [COTTON_GINNING_SIMULATION.module.id, COTTON_GINNING_SCENE_METADATA],
]));
