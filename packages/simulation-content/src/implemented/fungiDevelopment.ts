import type {
  AssessmentSequence,
  ExperienceDefinition,
  ImplementedSimulationDefinition,
  NarrationCueDefinition,
  SimulationNarrationManifest,
} from "@xr-school/simulation-schema";
import { withPackagedNarration } from "./narrationAssets.js";

const slug = "c8-ch02-a03-fungi-and-its-development";

export const FUNGI_DEVELOPMENT_EXPERIENCE: ExperienceDefinition = {
  id: "experience-fungi-development",
  gradeTone: "class6To8",
  objective:
    "Investigate bread mould from spore to sporangium, compare the conditions that control fungal growth, and explain useful and harmful roles from evidence.",
  stages: [
    {
      id: "fungal-forensics",
      title: "The Mysterious Bread",
      cue: "Scan the sealed bread sample, then classify the mushroom, bread mould, and green plant using visible evidence.",
      requiredActionIds: ["fungi.classify-mushroom-and-mould"],
      completionEvidenceIds: ["fungi-pair-classified"],
    },
    {
      id: "under-the-cap",
      title: "Inside the Colony",
      cue: "Shrink to microscopic scale, trace three hyphae, and identify the connected mycelium network.",
      requiredActionIds: ["fungi.inspect-hypha-network"],
      completionEvidenceIds: ["mycelium-identified"],
    },
    {
      id: "spore-flight",
      title: "The Spore Journey",
      cue: "Release a spore, guide it through the air, and compare a germinating landing with an unsuitable one.",
      requiredActionIds: ["fungi.guide-spore-to-surface"],
      completionEvidenceIds: ["spore-condition-observed"],
    },
    {
      id: "five-day-time-lens",
      title: "Growth Chamber Experiment",
      cue: "Compare warm-moist, warm-dry, cold-moist, and nutrient-rich chambers, then explain one fair trial.",
      requiredActionIds: ["fungi.run-five-day-timeline"],
      completionEvidenceIds: ["five-day-sequence-observed"],
    },
    {
      id: "fungi-at-work",
      title: "Friend or Foe",
      cue: "Use the evidence bench to separate useful fungi in food, medicine, and decomposition from harmful spoilage.",
      requiredActionIds: ["fungi.match-useful-roles"],
      completionEvidenceIds: ["useful-roles-matched"],
    },
    {
      id: "food-safety-scan",
      title: "Food Safety Mission",
      cue: "Inspect the mould scenario without touching it and choose the safe food response.",
      requiredActionIds: ["fungi.choose-safe-mould-response"],
      completionEvidenceIds: ["mould-safety-resolved"],
    },
    {
      id: "forest-circle",
      title: "Build the Life Cycle",
      cue: "Build the six-stage fungal life cycle, cite your experiment, and choose storage conditions that slow mould growth.",
      requiredActionIds: ["fungi.explain-forest-transfer"],
      completionEvidenceIds: ["forest-transfer-explained"],
    },
  ],
};
const assessment: AssessmentSequence = {
  id: "assessment-fungi-development",
  objectiveId: FUNGI_DEVELOPMENT_EXPERIENCE.id,
  prompts: [
    {
      id: "fungi-precheck",
      kind: "prediction",
      stageId: "fungal-forensics",
      question: "Which two objects are fungi?",
      options: [
        { id: "mushroom-and-bread-mould", label: "Mushroom and bread mould" },
        { id: "mushroom-and-green-plant", label: "Mushroom and green plant" },
        {
          id: "bread-mould-and-green-plant",
          label: "Bread mould and green plant",
        },
      ],
      acceptedEvidenceIds: ["mushroom-and-bread-mould"],
      hint: "Look for the observed spore and thread evidence, not green leaves.",
      explanation:
        "Mushroom and bread mould are fungi. Unlike a green plant, fungi do not make food using sunlight.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "mycelium-observation",
      kind: "observation",
      stageId: "under-the-cap",
      question:
        "What is the connected network made by many fungal hyphae called?",
      options: [
        { id: "mycelium", label: "Mycelium" },
        { id: "root-system", label: "Root system" },
      ],
      acceptedEvidenceIds: ["mycelium"],
      hint: "Observe the highlighted branching threads and read their network label.",
      explanation:
        "A hypha is one thread; many connected hyphae form a mycelium.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "growth-condition-prediction",
      kind: "prediction",
      stageId: "spore-flight",
      question:
        "Which condition is best for the modelled spore to begin growing?",
      options: [
        { id: "warm-moist", label: "Warm and moist" },
        { id: "dry-cold", label: "Dry and cold" },
        { id: "hot-dry", label: "Hot and dry" },
      ],
      acceptedEvidenceIds: ["warm-moist"],
      hint: "Compare the observed growth indicators beside moisture and temperature.",
      explanation:
        "In this model, suitable warmth and moisture support faster fungal development.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "development-order-observation",
      kind: "observation",
      stageId: "five-day-time-lens",
      question: "Which sequence matches the complete bread-mould life cycle?",
      options: [
        {
          id: "spore-hyphae-mycelium-structures-release",
          label:
            "Spore lands, germinates, grows hyphae, forms mycelium and sporangia, then releases new spores",
        },
        {
          id: "release-mycelium-spore",
          label: "Spores release, mycelium disappears, then a spore lands",
        },
      ],
      acceptedEvidenceIds: ["spore-hyphae-mycelium-structures-release"],
      hint: "Return to the observed day cards and compare them from day one to day five.",
      explanation:
        "A landed spore germinates, hyphae grow into mycelium, sporangia form, and new spores are released.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "baking-fungus-observation",
      kind: "observation",
      stageId: "fungi-at-work",
      question: "Which fungus helps dough rise in baking?",
      options: [
        { id: "yeast", label: "Yeast" },
        { id: "green-plant", label: "A green plant" },
      ],
      acceptedEvidenceIds: ["yeast"],
      hint: "Observe the baking card and compare the gas bubbles in the dough.",
      explanation:
        "Yeast is a fungus used in baking; its activity produces gas that helps dough rise.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "mould-safety-misconception",
      kind: "misconception",
      stageId: "food-safety-scan",
      question:
        "Does cutting off the visible mould patch make a slice of soft bread safe to eat?",
      options: [
        {
          id: "cutting-makes-safe",
          label: "Yes, the remaining soft bread is safe",
        },
        {
          id: "reject-whole-soft-food",
          label:
            "No, reject the whole visibly mouldy soft food and tell an adult",
        },
      ],
      acceptedEvidenceIds: ["reject-whole-soft-food"],
      hint: "Look for hidden hyphae that may extend beyond the visible mould patch.",
      explanation:
        "No. Hidden hyphae may extend beyond the visible patch in soft food, so reject the whole visibly mouldy item and ask an adult to dispose of it safely.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "forest-transfer",
      kind: "transfer",
      stageId: "forest-circle",
      question:
        "Which storage choice will best slow mould growth on bread after the investigation?",
      options: [
        {
          id: "warm-damp-surface",
          label: "Keep the bread warm and damp in an open bag",
        },
        {
          id: "cool-dry-surface",
          label: "Keep the bread cool, dry, and protected",
        },
      ],
      acceptedEvidenceIds: ["cool-dry-surface"],
      hint: "Compare temperature, moisture, and exposure with your saved chamber evidence.",
      explanation:
        "Cool, dry, protected storage slows fungal development compared with warm, moist conditions.",
      retryPolicy: "immediateWithHint",
    },
  ],
  masteryRule: {
    requiredEvidenceCount: 3,
    requiredKinds: ["observation", "misconception", "transfer"],
    allowHintedMastery: false,
  },
};

export const FUNGI_DEVELOPMENT_NARRATION: SimulationNarrationManifest & {
  locale: "en-IN";
  speaker: string;
} = {
  id: "narration-fungi-development",
  locale: "en-IN",
  speaker: "Secret Life of Fungi science guide",
  fallback: "browserTts",
  cues: (
    [
      {
        id: "fungi-narration-fungal-forensics",
        stageId: "fungal-forensics",
        text: "Welcome to the Secret Life of Fungi laboratory. A slice of bread has changed while nobody was watching. Scan the sealed sample and identify the fungal clues. Fungi do not contain chlorophyll, so they cannot make food using sunlight. Instead, they absorb nutrients from their surroundings.",
        caption:
          "Welcome to the Secret Life of Fungi laboratory. A slice of bread has changed while nobody was watching. Scan the sealed sample and identify the fungal clues. Fungi do not contain chlorophyll, so they cannot make food using sunlight. Instead, they absorb nutrients from their surroundings.",
      },
      {
        id: "fungi-narration-under-the-cap",
        stageId: "under-the-cap",
        text: "Shrink to microscopic scale. Each fine fungal thread is a hypha. Many connected hyphae form a mycelium, the hidden feeding network. Above it, stalks carry round sporangia that will produce new spores.",
        caption:
          "Shrink to microscopic scale. Each fine fungal thread is a hypha. Many connected hyphae form a mycelium, the hidden feeding network. Above it, stalks carry round sporangia that will produce new spores.",
      },
      {
        id: "fungi-narration-spore-flight",
        stageId: "spore-flight",
        text: "A mature sporangium opens and microscopic spores drift through the air. Guide one towards a surface. A spore that lands where warmth, moisture, and food are available can germinate; an unsuitable landing stays dormant or fails.",
        caption:
          "A mature sporangium opens and microscopic spores drift through the air. Guide one towards a surface. A spore that lands where warmth, moisture, and food are available can germinate; an unsuitable landing stays dormant or fails.",
      },
      {
        id: "fungi-narration-five-day-time-lens",
        stageId: "five-day-time-lens",
        text: "Now test four sealed chambers. Warm and moist bread should show high growth. Warm but dry bread should show little growth. Cold and moist bread should grow slowly. A warm, moist, nutrient-rich surface should show the greatest growth. Save two fair trials and compare only one changed condition.",
        caption:
          "Now test four sealed chambers. Warm and moist bread should show high growth. Warm but dry bread should show little growth. Cold and moist bread should grow slowly. A warm, moist, nutrient-rich surface should show the greatest growth. Save two fair trials and compare only one changed condition.",
      },
      {
        id: "fungi-narration-fungi-at-work",
        stageId: "fungi-at-work",
        text: "Fungi can be friends or foes. Yeast makes dough rise, mushrooms can be food, some fungi help produce medicines, and decomposers recycle dead matter. Other fungi spoil food or cause disease. Classify each role using the evidence.",
        caption:
          "Fungi can be friends or foes. Yeast makes dough rise, mushrooms can be food, some fungi help produce medicines, and decomposers recycle dead matter. Other fungi spoil food or cause disease. Classify each role using the evidence.",
      },
      {
        id: "fungi-narration-food-safety-scan",
        stageId: "food-safety-scan",
        text: "Mould can spread invisible hyphae beyond the patch you can see. Never taste mouldy food or open a mould culture. Scan the sealed sample, reject the whole visibly mouldy soft food, and tell an adult.",
        caption:
          "Mould can spread invisible hyphae beyond the patch you can see. Never taste mouldy food or open a mould culture. Scan the sealed sample, reject the whole visibly mouldy soft food, and tell an adult.",
      },
      {
        id: "fungi-narration-forest-circle",
        stageId: "forest-circle",
        text: "Complete the fungal life cycle: spore, germination, hyphal growth, mycelium, sporangium, and new spores. Then protect the bread by reducing warmth and moisture. Fungi grow, feed, reproduce, help ecosystems, and sometimes spoil food. Mission complete.",
        caption:
          "Complete the fungal life cycle: spore, germination, hyphal growth, mycelium, sporangium, and new spores. Then protect the bread by reducing warmth and moisture. Fungi grow, feed, reproduce, help ecosystems, and sometimes spoil food. Mission complete.",
      },
    ] satisfies NarrationCueDefinition[]
  ).map(withPackagedNarration),
};

export const FUNGI_DEVELOPMENT: ImplementedSimulationDefinition = {
  module: {
    id: "sim-c08-ch02-a03-fungi-and-its-development",
    slug,
    viewerKey: "fungi-development",
    title: "The Secret Life of Fungi",
    summary:
      "Enter a realistic scale-shifting food-science laboratory to investigate bread mould, fly with spores, compare four growth chambers, and build the fungal life cycle.",
    gradeBands: ["class6To8"],
    subjects: ["biology", "science"],
    applicableBoards: ["cbse"],
    curriculumMapIds: ["cm-cbse-c8-ch02-microorganisms"],
    conceptIds: ["concept-fungi", "concept-mycelium", "concept-decomposition"],
    simulationFormat: "immersiveVr",
    evidenceConfidenceLevel: "expertDesigned",
    releaseMaturity: "internalQA",
    publicationStatus: "released",
    evidenceMaturity: "internalQA",
    xrFitType: "strongVrFit",
    xrFitJustification:
      "VR lets learners move safely inside an otherwise invisible hyphal network, guide airborne spores in spatial context, compare controlled growth chambers, and assemble a life cycle that is too small and slow to observe directly.",
    learningObjective: FUNGI_DEVELOPMENT_EXPERIENCE.objective,
    scientificConceptExplanation:
      "Fungi are a distinct kingdom that absorb nutrients rather than photosynthesise. Their bodies contain hyphae that form mycelium, many reproduce by spores, favourable warmth and moisture support development, and fungal species may decompose matter, support food and medicine, or spoil food.",
    misconceptionsAddressed: [
      "Fungi are plants that make their own food.",
      "A mushroom is the whole fungus rather than a visible structure connected to mycelium.",
      "All fungi are safe to touch or eat.",
      "All fungi are harmful and have no useful ecosystem role.",
    ],
    visualizationStrategy:
      "Move from a realistic sealed bread specimen to enlarged hyphae, mycelium, sporangia, particle spores, four controlled growth chambers, and a six-stage life-cycle builder.",
    interactionStrategy:
      "Learners classify specimens, trace hyphae, guide a spore, run fair growth trials, compare four conditions, match useful roles, make a safe food decision, and assemble the fungal life cycle.",
    imaginationHelperStrategy:
      "Scale bars and a five-day clock identify when microscopic structures and accelerated time are representations rather than life-size real-time views.",
    practicalUseCase:
      "Connects fungi to bread storage, yeast, edible mushrooms, medicine, food spoilage safety, composting, and nutrient recycling.",
    cueCardIds: FUNGI_DEVELOPMENT_EXPERIENCE.stages.map(
      (stage) => `cue-${stage.id}`,
    ),
    revisionCardIds: [
      "rev-fungi-identity",
      "rev-fungi-development",
      "rev-fungi-safety",
    ],
    assessmentHookIds: assessment.prompts.map((prompt) => prompt.id),
    instructorScript:
      "Introduction: Present the sealed mysterious bread and ask which visible clues suggest fungal growth. Procedure: Seat the headset learner in stationary view; classify specimens, trace hyphae and mycelium, guide a spore, compare the four growth conditions, match useful roles, scan the mould safely, and build the six-stage life cycle. Observation: Require the learner and non-headset group to name evidence at every stage and record how temperature, moisture, food, and time affect growth. Assessment: Use the mycelium, yeast, mould-safety, growth-condition, and storage prompts; incorrect answers return learners to the relevant observation. Conclusion: Recap that fungi absorb nutrients, grow through hyphae and mycelium, reproduce by spores, may be useful or harmful, and grow fastest under suitable conditions.",
    batchActivityPrompt:
      "In each group, one stationary headset learner reports observations while the non-headset batch records specimen classification, warm/moist prediction, the observed life-cycle order, one useful role, the safe mould response, and a storage recommendation supported by growth-chamber evidence; rotate the reporter after the lesson.",
    expectedDurationMinutes: 8,
    maxSessionDurationMinutes: 12,
    comfortRiskLevel: "low",
    safetyNotes: [
      "Use stationary seated or standing view with no required locomotion.",
      "Never taste mouldy food and never open mould cultures; observe sealed or simulated samples without touching and tell an adult.",
      "Microscopic scale and five-day acceleration are explanatory visualizations, not literal size or real-time speed.",
    ],
    offlineContentPackId: "pack-cbse-class8-fungi-v1",
    estimatedPackageSizeMb: 96,
    targetFrameRateFps: 72,
    minQuestStorageGb: 1,
    stages: FUNGI_DEVELOPMENT_EXPERIENCE.stages.length,
    status: "released",
  },
  kind: "interactive",
  experience: FUNGI_DEVELOPMENT_EXPERIENCE,
  assessment,
  narration: FUNGI_DEVELOPMENT_NARRATION,
  assets: {
    id: "assets-fungi-development-laboratory",
    assets: [
      {
        id: "fungi-development-secret-lab-environment-v2",
        url: `/simulations/${slug}/environment-v2.webp`,
        kind: "environment",
        source:
          "OpenAI image generation for the user-authored Secret Life of Fungi simulation",
        license: "project-generated",
        author: "OpenAI image generation directed by Aditya K. R. Pandey",
        width: 1774,
        height: 887,
        channels: ["baseColor"],
        compression: "WebP lossy q75; sharp/libvips effort 6",
        byteSize: 147742,
        sha256:
          "d643110d812ff97383c88eff73a150ba80377292b7e30f44a0b2b3544e790b90",
      },
    ],
  },
  legacyPaths: [],
  contribution: {
    source: "user-story",
    integration: "new-class",
  },
};
