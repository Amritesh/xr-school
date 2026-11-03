import {
  createGuidedAssessment,
  createGuidedAssetManifest,
  createGuidedLesson,
  createGuidedModuleRecord,
  defineGuidedImplementedSimulation,
  type GuidedStageAuthoring,
} from "./builders.js";

const moduleId = "sim-c05-ch01-a02-supersense-of-sights";
const slug = "c5-ch01-a02-supersense-of-sights";
const viewerKey = "guided-super-senses-sight";

const stages = [
  {
    id: "eagle-calibration",
    title: "Activate the Eagle Visor",
    cue: "Choose the eagle and resolve the finest bars on the summit calibration target.",
    detail:
      "Many eagles can resolve finer distant detail than people. The superhero zoom is a comparison model of visual acuity; an eagle eye does not zoom like a mechanical camera lens.",
    actionId: "calibrate-eagle-acuity",
    actionLabel: "Choose the eagle and align the acuity rings",
    evidenceId: "eagle-calibration-evidence",
    evidenceMode: "scene",
    scaleNote:
      "The focus rings and enlarged distant details are explanatory overlays, not a literal reconstruction of an eagle's experience.",
    narrationText:
      "Welcome to the Super Sight Academy. I am Captain Iris, your robotic falcon guide. First, choose the eagle as our long-distance vision specialist, then resolve the finest bars on the summit target. Many eagles can distinguish finer distant detail than people. Our superhero zoom makes that visual acuity easy to compare; an eagle's eye does not zoom like a mechanical camera lens.",
  },
  {
    id: "field-mouse",
    title: "Scan the Eagle's Valley",
    cue: "Inspect the rock, bush and tall grass, then identify the field mouse against its background.",
    detail:
      "High visual acuity can help a bird distinguish a small distant animal, but visibility also depends on light, contrast, movement and whether cover blocks the view.",
    actionId: "locate-field-mouse",
    actionLabel: "Complete the valley scan and lock the field mouse",
    evidenceId: "field-mouse-evidence",
    evidenceMode: "scene",
    narrationText:
      "Your vision system is calibrated. Scan the valley evidence in order: rock, bush and tall grass. Then select the field mouse when you can distinguish it from the background. High visual acuity can help an eagle resolve a small animal at a distance, but visibility also depends on light, contrast, movement and whether anything blocks the view.",
  },
  {
    id: "night-lemur",
    title: "Decode the Night Forest",
    cue: "Scan the left-bush shadow, right-tree leaves and reflected eyeshine, then locate the nocturnal lemur.",
    detail:
      "Some nocturnal animals have large eyes and other low-light adaptations. Eyeshine is available light reflected by structures in some animals' eyes; eyes do not create light and animals still need some light to see.",
    actionId: "trace-night-clues",
    actionLabel: "Trace the three clues and identify the lemur",
    evidenceId: "night-vision-model-evidence",
    evidenceMode: "answer",
    misconceptionId: `${viewerKey}:misconception`,
    narrationText:
      "The forest is dim, not bright. Scan the left-bush shadow, the right-tree leaves and the reflected eyeshine, then locate the nocturnal lemur. Some nocturnal animals have large eyes and other low-light adaptations. Eyeshine is available light reflected by structures in some animals' eyes; the eyes do not create light, and animals still need some light to see.",
  },
  {
    id: "chameleon-fly",
    title: "Track the Chameleon's Fly",
    cue: "Follow the fly left, rear, right and front while observing the chameleon's unusual eye movements.",
    detail:
      "A chameleon can move its eyes largely independently to scan a wide field, then coordinate them on a target. The wide-view overlay is a learning model rather than a literal picture of its experience.",
    actionId: "track-fly-around-chameleon",
    actionLabel: "Track all four fly positions in order",
    evidenceId: "animal-vision-comparison-evidence",
    evidenceMode: "answer",
    transferPromptId: `${viewerKey}:transfer`,
    narrationText:
      "Track the fly left, rear, right and front. A chameleon can move its eyes largely independently and scan a wide field of view. When it targets prey, the eyes coordinate on that target. The wide-view overlay is our learning model, not a literal picture of exactly what the chameleon experiences. You have mastered the loop: See, Upgrade, Scan, Discover and Master.",
  },
] satisfies GuidedStageAuthoring[];

const { guidance, narration } = createGuidedLesson({
  id: viewerKey,
  moduleId,
  viewerKey,
  classContext: "CBSE Class 5 Environmental Science",
  gradeTone: "class3To5",
  objective:
    "Use visual evidence and labelled models to compare distance acuity, low-light adaptations and wide-field eye movements in selected animals.",
  stages,
  completion: {
    eyebrow: "Super Senses Academy",
    headline: "Vision Master Badge Earned",
    body: "You calibrated an eagle acuity model, decoded low-light clues and tracked a fly with a chameleon's wide-field eye system.",
    actionLabel: "Review the vision specialists",
  },
});

const assessment = createGuidedAssessment({
  id: `${viewerKey}:assessment`,
  objectiveId: guidance.id,
  misconception: {
    id: `${viewerKey}:misconception`,
    stageId: "night-lemur",
    question: "What does reflected eyeshine tell us in the night-forest model?",
    acceptedEvidenceId: "night-vision-model-evidence",
    acceptedLabel:
      "Available light is reflecting from structures in some animals' eyes; the eyes do not make their own light.",
    distractorLabel:
      "Nocturnal animals create bright light inside their eyes and can see in complete darkness.",
    hint: "Captain Iris said the forest must still contain some available light.",
    explanation:
      "Low-light adaptations can improve sensitivity, but vision still requires light. Eyeshine is reflected available light in animals with suitable reflective eye structures.",
  },
  transfer: {
    id: `${viewerKey}:transfer`,
    stageId: "chameleon-fly",
    question: "Which comparison is supported by the three investigations?",
    acceptedEvidenceId: "animal-vision-comparison-evidence",
    acceptedLabel:
      "Different visual systems are adapted to different tasks and conditions; no one animal has the best vision for every situation.",
    distractorLabel:
      "All three animals see the same scene, and the simulation overlays reproduce their exact private experience.",
    hint: "Compare distant detail, dim-light clues and wide-field scanning.",
    explanation:
      "Animal visual systems differ in acuity, sensitivity, field of view and eye movement. The simulation makes those comparisons observable with labelled models.",
  },
});

export const SUPER_SENSES_SIGHT_GUIDANCE = guidance;
export const SUPER_SENSES_SIGHT_SCENE_METADATA = Object.freeze({
  environmentUrl: `/simulations/${slug}/environment.webp`,
  stageOutcomes: Object.fromEntries(
    stages.map((stage) => [`scene:${stage.id}`, stage.detail]),
  ),
});

export const SUPER_SENSES_SIGHT_SIMULATION = defineGuidedImplementedSimulation({
  module: createGuidedModuleRecord(
    {
      id: moduleId,
      title: "Super Senses: The Super Sense of Sight",
      slug,
      viewerKey,
      summary:
        "Join Captain Iris in a timed five-minute optical mission comparing eagle distance acuity, nocturnal low-light clues and chameleon eye movements.",
      gradeBands: ["class3To5"],
      subjects: ["environmentalScience", "biology"],
      curriculumMapIds: ["cm-cbse-c5-ch01-super-senses"],
      conceptIds: [
        "concept-distance-visual-acuity",
        "concept-low-light-vision",
        "concept-wide-field-animal-vision",
      ],
      simulationFormat: "immersiveVr",
      xrFitType: "strongVrFit",
      xrFitJustification:
        "A wraparound summit, night forest and jungle let learners turn toward spatial clues and compare visual-field models while the interface clearly labels simulated effects.",
      learningObjective:
        "Compare how selected animals use visual acuity, low-light adaptations and eye movement, while distinguishing explanatory overlays from literal animal vision.",
      scientificConceptExplanation:
        "Visual acuity describes the ability to resolve detail. Some eagles resolve fine distant detail; some nocturnal animals have adaptations that improve vision in dim available light; and chameleons can move their eyes largely independently to survey a wide field before coordinating them on a target.",
      misconceptionsAddressed: [
        "An eagle eye zooms mechanically like a camera lens.",
        "Nocturnal animals can see without any available light or create light in their eyes.",
        "Every lemur is nocturnal and has identical vision.",
        "A chameleon has a perfect blind-spot-free 360-degree image or sees the exact overlay shown in the simulation.",
        "One animal has universally best vision for every task and condition.",
      ],
      visualizationStrategy:
        "A project-generated 360-degree natural-history panorama supports a summit acuity calibration, distant valley evidence, a dim forest clue trail and a jungle fly orbit with explicit model labels.",
      interactionStrategy:
        "Learners gaze, point, click or use keyboard controls to choose the eagle, scan ordered evidence, locate a field mouse and lemur, and track a fly around a chameleon; timed assists preserve the exact five-minute arc.",
      practicalUseCase:
        "Builds careful observation and comparison skills while showing how visual abilities suit different habitats and behaviours.",
      cueCardIds: stages.map((stage) => `${viewerKey}:cue:${stage.id}`),
      revisionCardIds: [`${viewerKey}:revision`],
      assessmentHookIds: [
        `${viewerKey}:misconception`,
        `${viewerKey}:transfer`,
      ],
      instructorScript:
        "Run the four timed missions. At each enhancement, ask whether it is a literal animal view or an explanatory model, then compare the task each visual adaptation supports.",
      batchActivityPrompt:
        "Give groups eagle, nocturnal-animal and chameleon cards. Ask them to match each animal with a task, limitation and visual adaptation, then explain why no single system is best everywhere.",
      expectedDurationMinutes: 5,
      maxSessionDurationMinutes: 5,
      comfortRiskLevel: "low",
      safetyNotes: [
        "Zoom, brightened night scenes, field overlays and target highlights are explanatory models rather than literal recordings of animal perception.",
        "Use a stationary or bounded VR area, keep the floor clear and stop if discomfort occurs.",
        "Do not use laser pointers, bright lights or wildlife disturbance to recreate these activities with real animals.",
      ],
      estimatedPackageSizeMb: 9,
    },
    guidance,
  ),
  guidance,
  assessment,
  narration,
  assets: createGuidedAssetManifest({
    id: `assets:${moduleId}`,
    environment: {
      id: `${moduleId}:mountain-night-jungle-environment`,
      url: `/simulations/${slug}/environment.webp`,
      source:
        "Project-generated panorama for the user-authored Super Senses simulation",
      license: "project-generated",
      author: "XR School project team",
      width: 1774,
      height: 887,
      channels: ["baseColor"],
      compression: "WebP lossy q76; sharp/libvips effort 6",
      byteSize: 309372,
      sha256:
        "351e82a43a45a7a6300f336c13c1d334c905763424da84d3579f48ffebbc942d",
    },
  }),
  legacyPaths: [],
  contribution: {
    source: "user-story",
    integration: "new-class",
    contributor: "Aditya K. R. Pandey",
    sourcePath: "apps/web/components/simulations/SuperSensesSightViewer.tsx",
  },
});
