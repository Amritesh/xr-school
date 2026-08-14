import type {
  AssessmentSequence,
  ExperienceDefinition,
  ImplementedSimulationDefinition,
  SimulationNarrationManifest,
} from "@xr-school/simulation-schema";

const slug = "c8-ch02-a03-fungi-and-its-development";

export const FUNGI_DEVELOPMENT_EXPERIENCE: ExperienceDefinition = {
  id: "experience-fungi-development",
  gradeTone: "class6To8",
  objective:
    "Identify fungi, observe hyphae and mycelium, sequence five days of development, and explain useful, harmful, and ecosystem roles from evidence.",
  stages: [
    {
      id: "fungal-forensics",
      title: "Fungal Forensics",
      cue: "Classify the mushroom, bread mould, and green plant, then cite the two fungal clues.",
      requiredActionIds: ["fungi.classify-mushroom-and-mould"],
      completionEvidenceIds: ["fungi-pair-classified"],
    },
    {
      id: "under-the-cap",
      title: "Under the Cap",
      cue: "Inspect a branching hypha and identify the connected mycelium network.",
      requiredActionIds: ["fungi.inspect-hypha-network"],
      completionEvidenceIds: ["mycelium-identified"],
    },
    {
      id: "spore-flight",
      title: "Spore Flight",
      cue: "Guide a spore to a surface and compare warm, moist conditions with cold or dry ones.",
      requiredActionIds: ["fungi.guide-spore-to-surface"],
      completionEvidenceIds: ["spore-condition-observed"],
    },
    {
      id: "five-day-time-lens",
      title: "Five-Day Time Lens",
      cue: "Run all five days and record the development sequence from landed spore to released spores.",
      requiredActionIds: ["fungi.run-five-day-timeline"],
      completionEvidenceIds: ["five-day-sequence-observed"],
    },
    {
      id: "fungi-at-work",
      title: "Fungi at Work",
      cue: "Match fungi with decomposition, baking, food, and medicine roles using the displayed evidence.",
      requiredActionIds: ["fungi.match-useful-roles"],
      completionEvidenceIds: ["useful-roles-matched"],
    },
    {
      id: "food-safety-scan",
      title: "Food Safety Scan",
      cue: "Inspect the mould scenario without touching it and choose the safe food response.",
      requiredActionIds: ["fungi.choose-safe-mould-response"],
      completionEvidenceIds: ["mould-safety-resolved"],
    },
    {
      id: "forest-circle",
      title: "Forest Circle",
      cue: "Trace how fungal decomposition returns nutrients and explain the result for a new forest case.",
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
        { id: "cold-dry", label: "Cold and dry" },
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
      question: "Which sequence matches the five-day observation?",
      options: [
        {
          id: "spore-hyphae-mycelium-structures-release",
          label:
            "Spore lands, hypha grows, mycelium spreads, spore structures form, spores release",
        },
        {
          id: "release-mycelium-spore",
          label: "Spores release, mycelium disappears, then a spore lands",
        },
      ],
      acceptedEvidenceIds: ["spore-hyphae-mycelium-structures-release"],
      hint: "Return to the observed day cards and compare them from day one to day five.",
      explanation:
        "The ordered model begins with a landed spore, then hyphae and mycelium develop before new spores are released.",
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
      question: "What should you do with visibly mouldy food?",
      options: [
        { id: "taste-small-piece", label: "Taste a small piece to check it" },
        {
          id: "do-not-eat",
          label: "Do not eat it; tell an adult and discard it safely",
        },
      ],
      acceptedEvidenceIds: ["do-not-eat"],
      hint: "Use the observed safety sign: never taste or open a mould culture.",
      explanation:
        "Do not eat mouldy food. Observe unknown fungi without touching or tasting them and ask an adult to handle disposal.",
      retryPolicy: "immediateWithHint",
    },
    {
      id: "forest-transfer",
      kind: "transfer",
      stageId: "forest-circle",
      question:
        "A new forest sample has dead leaves breaking down near fungal threads. What is the best explanation?",
      options: [
        {
          id: "fungi-recycle-nutrients",
          label:
            "Fungi decompose the leaves and return nutrients to the forest system",
        },
        {
          id: "fungi-make-sunlight",
          label: "Fungi make sunlight for nearby plants",
        },
      ],
      acceptedEvidenceIds: ["fungi-recycle-nutrients"],
      hint: "Compare the new sample with the observed forest nutrient circle.",
      explanation:
        "Fungal decomposers absorb materials from dead matter and recycle nutrients that other forest organisms can use.",
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
  speaker: "Living Mycelium Lab guide",
  fallback: "browserTts",
  cues: [
    {
      id: "fungi-narration-fungal-forensics",
      stageId: "fungal-forensics",
      text: "Fungi are not plants. They cannot make their own food using sunlight; they absorb food from their surroundings. Classify the mushroom and bread mould as fungi.",
      caption:
        "Fungi are not plants. They cannot make their own food using sunlight; they absorb food from their surroundings. Classify the mushroom and bread mould as fungi.",
    },
    {
      id: "fungi-narration-under-the-cap",
      stageId: "under-the-cap",
      text: "A fungus is built from tiny threads called hyphae. Many connected hyphae form a mycelium, the hidden feeding network.",
      caption:
        "A fungus is built from tiny threads called hyphae. Many connected hyphae form a mycelium, the hidden feeding network.",
    },
    {
      id: "fungi-narration-spore-flight",
      stageId: "spore-flight",
      text: "Fungi reproduce using spores. Guide one through the air and compare where it lands: suitable warm, moist conditions support growth.",
      caption:
        "Fungi reproduce using spores. Guide one through the air and compare where it lands: suitable warm, moist conditions support growth.",
    },
    {
      id: "fungi-narration-five-day-time-lens",
      stageId: "five-day-time-lens",
      text: "Across five ordered days, a spore lands, a hypha grows, mycelium spreads, spore structures form, and new spores release.",
      caption:
        "Across five ordered days, a spore lands, a hypha grows, mycelium spreads, spore structures form, and new spores release.",
    },
    {
      id: "fungi-narration-fungi-at-work",
      stageId: "fungi-at-work",
      text: "Fungi are at work around us: yeast helps in baking, some fungi provide food or medicine, and decomposers break down dead matter.",
      caption:
        "Fungi are at work around us: yeast helps in baking, some fungi provide food or medicine, and decomposers break down dead matter.",
    },
    {
      id: "fungi-narration-food-safety-scan",
      stageId: "food-safety-scan",
      text: "Some fungi are harmful, and mould on food can be unsafe. Never taste mouldy food or open a mould culture; keep the view stationary, observe without touching, and tell an adult.",
      caption:
        "Some fungi are harmful, and mould on food can be unsafe. Never taste mouldy food or open a mould culture; keep the view stationary, observe without touching, and tell an adult.",
    },
    {
      id: "fungi-narration-forest-circle",
      stageId: "forest-circle",
      text: "In conclusion, fungi are spore-forming absorbers with hyphae and mycelium. In a forest they decompose dead matter and return nutrients to the living circle.",
      caption:
        "In conclusion, fungi are spore-forming absorbers with hyphae and mycelium. In a forest they decompose dead matter and return nutrients to the living circle.",
    },
  ],
};

export const FUNGI_DEVELOPMENT: ImplementedSimulationDefinition = {
  module: {
    id: "sim-c08-ch02-a03-fungi-and-its-development",
    slug,
    viewerKey: "fungi-development",
    title: "Living Mycelium Lab: Fungi and Its Development",
    summary:
      "Enter a scale-shifting fungal lab to classify fungi, inspect hyphae, guide spores, observe five days of development, and reason about uses, safety, and forests.",
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
      "VR lets learners move safely inside an otherwise invisible hyphal network, shift scale beneath a mushroom cap, guide airborne spores in spatial context, and compress five days of development into an inspectable time lens.",
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
      "Shift from life-size specimens to enlarged hyphae and a glowing mycelium network, then use particle spores, condition overlays, a five-day time lens, and a forest nutrient circle.",
    interactionStrategy:
      "Learners classify specimens, inspect a hypha, guide a spore, compare conditions, sequence development, match useful roles, make a safe choice, and explain a forest transfer case.",
    imaginationHelperStrategy:
      "Scale bars and a five-day clock identify when microscopic structures and accelerated time are representations rather than life-size real-time views.",
    practicalUseCase:
      "Connects fungi to bread and yeast, edible mushrooms, medicine, food spoilage safety, composting, and forest nutrient recycling.",
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
      "Introduction: Ask learners which two specimens are fungi and record the prediction before revealing evidence. Procedure: Seat the headset learner in stationary view; classify the specimens, inspect hyphae and mycelium, guide a spore, compare conditions, run all five days, match useful roles, scan food safety, and complete the forest circle. Observation: Require the learner and non-headset group to name visible evidence at every stage, especially the ordered day cards. Assessment: Use the mycelium, yeast, mould-safety, and forest-transfer prompts; incorrect answers return learners to the cited observation before retry. Conclusion: Recap that fungi are not plants, absorb nutrients, grow through hyphae and mycelium, reproduce by spores, may be useful or harmful, and recycle forest nutrients.",
    batchActivityPrompt:
      "In each group, one stationary headset learner reports observations while the non-headset batch records specimen classification, warm/moist prediction, five-day order, one useful role, the safe mould response, and a forest explanation; rotate the reporter after the lesson.",
    expectedDurationMinutes: 9,
    maxSessionDurationMinutes: 10,
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
    id: "assets-fungi-development-procedural",
    assets: [],
  },
  legacyPaths: [],
  contribution: {
    source: "existing",
  },
};
