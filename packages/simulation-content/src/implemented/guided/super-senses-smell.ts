import {
  createGuidedAssessment,
  createGuidedAssetManifest,
  createGuidedLesson,
  createGuidedModuleRecord,
  defineGuidedImplementedSimulation,
  type GuidedStageAuthoring,
} from "./builders.js";

const moduleId = "sim-c05-ch01-a01-supersense-of-smell";
const slug = "c5-ch01-a01-supersense-of-smell";
const viewerKey = "guided-super-senses-smell";

const stages = [
  {
    id: "smell-o-vision",
    title: "Activate Smell-O-Vision",
    cue: "Scan the park, compare four coloured scent models and identify the food odour.",
    detail:
      "Odour molecules released by a source can travel through air. Receptors high inside the nose detect some of these molecules, and the brain helps identify the smell. The coloured trails are an explanatory model, not visible smells.",
    actionId: "identify-food-odour-trail",
    actionLabel: "Track the orange-gold trail",
    evidenceId: "airborne-odour-model-evidence",
    evidenceMode: "scene",
    narrationText:
      "Welcome, Super Senses Detective. Smell-O-Vision shows invisible odour molecules as coloured trails. Objects release molecules that can travel through air. Receptors inside your nose detect some of them, and your brain helps recognise the smell. Find the orange-gold trail from the food cart. Remember, the colours are only our learning model; real smells are invisible.",
  },
  {
    id: "ant-pheromone-trail",
    title: "Follow the Ant Highway",
    cue: "Shrink to ant scale and follow the stronger ground-level pheromone trail to food.",
    detail:
      "Many ants communicate with chemical signals called pheromones. A forager can lay a trail, and other ants detect it with their antennae. Trail strength can change as chemicals evaporate or more ants reinforce a route.",
    actionId: "follow-ant-pheromone-checkpoints",
    actionLabel: "Follow the stronger green trail",
    evidenceId: "ant-pheromone-trail-evidence",
    evidenceMode: "scene",
    scaleNote:
      "The learner and grass are enlarged relative to an ant, while the green glow is a symbolic visualisation of an otherwise invisible chemical trail.",
    narrationText:
      "Now we are ant-sized. A foraging ant can leave a chemical signal called a pheromone near the ground. Other ants detect that signal with their antennae and can follow the route toward food. Choose the stronger green trail. Ants do not see a glowing path; the green light helps us represent an invisible chemical message.",
  },
  {
    id: "dog-odour-tracking",
    title: "Find the Lost Teddy",
    cue: "Separate squirrel, food and target odours, then follow the target scent through the forest.",
    detail:
      "Dogs have many scent receptors and can distinguish mixtures of odours. Trained dogs may follow a target odour, but success also depends on training, wind, weather, terrain and how old the scent is.",
    actionId: "separate-and-track-target-odour",
    actionLabel: "Follow the blue target odour",
    evidenceId: "dog-tracking-evidence",
    evidenceMode: "answer",
    misconceptionId: `${viewerKey}:misconception`,
    narrationText:
      "The forest contains several odours at once: squirrel, food and the missing teddy. Dogs can detect and distinguish many odour mixtures, and a trained dog may follow a selected target scent. Wind, rain, terrain and the age of the scent can change a real search. Filter the distractions and follow the blue target trail. Real dogs do not see coloured scent ribbons; blue marks our model of the chosen odour.",
  },
  {
    id: "silkmoth-recap",
    title: "Silkmoth Signal and Final Recap",
    cue: "Inspect the moth antennae, reveal the pheromone signal and match each animal with its smell-based behaviour.",
    detail:
      "A male domesticated silkmoth can detect tiny amounts of a female sex pheromone with sensitive antennae. Humans, ants, dogs and moths all detect chemicals, but their sensory structures and uses differ.",
    actionId: "match-smell-senses-recap",
    actionLabel: "Complete the Super Sniffer recap",
    evidenceId: "smell-senses-transfer-evidence",
    evidenceMode: "answer",
    transferPromptId: `${viewerKey}:transfer`,
    narrationText:
      "Night mode reveals our final chemical detective, the silkmoth. A male domesticated silkmoth can detect tiny amounts of a female pheromone with its sensitive antennae. Complete the recap: many ants use pheromone trails, trained dogs can track a selected odour, and silkmoths detect pheromones with their antennae. These animals do not see our coloured trails; each trail is a visual model of chemical information.",
  },
] satisfies GuidedStageAuthoring[];

const { guidance, narration } = createGuidedLesson({
  id: viewerKey,
  moduleId,
  viewerKey,
  classContext: "CBSE Class 5 Environmental Science",
  gradeTone: "class3To5",
  objective:
    "Use evidence from people, ants, dogs and silkmoths to explain how airborne or surface chemicals can be detected and used as information.",
  stages,
  completion: {
    eyebrow: "Academy mission complete",
    headline: "Super Sniffer Badge Earned",
    body: "You tracked odours, followed an ant pheromone trail and compared how dogs and silkmoths detect chemical clues.",
    actionLabel: "Review the smell detectives",
  },
});

const assessment = createGuidedAssessment({
  id: `${viewerKey}:assessment`,
  objectiveId: guidance.id,
  misconception: {
    id: `${viewerKey}:misconception`,
    stageId: "dog-odour-tracking",
    question: "What do the coloured scent trails in this simulation represent?",
    acceptedEvidenceId: "dog-tracking-evidence",
    acceptedLabel:
      "They are visual models of invisible odour molecules or chemical signals.",
    distractorLabel: "They are coloured lines that dogs and ants really see.",
    hint: "Detective Snout explained why Smell-O-Vision adds colour.",
    explanation:
      "Odours and pheromones are chemical information. The coloured trails make that invisible information easier to investigate; animals do not literally see the colours.",
  },
  transfer: {
    id: `${viewerKey}:transfer`,
    stageId: "silkmoth-recap",
    question: "Which comparison is supported by the investigation?",
    acceptedEvidenceId: "smell-senses-transfer-evidence",
    acceptedLabel:
      "Different animals detect chemical clues with specialised sensory structures and use them for different tasks.",
    distractorLabel:
      "Every animal detects the same chemicals in exactly the same way and for the same purpose.",
    hint: "Compare a human nose, ant and moth antennae, and a dog nose.",
    explanation:
      "Chemical sensing occurs in several animals, but their receptors, sensitivity and behaviours differ. Pheromone communication is also more specific than a general food odour.",
  },
});

export const SUPER_SENSES_SMELL_GUIDANCE = guidance;
export const SUPER_SENSES_SMELL_SCENE_METADATA = Object.freeze({
  environmentUrl: `/simulations/${slug}/environment.webp`,
  stageOutcomes: Object.fromEntries(
    stages.map((stage) => [`scene:${stage.id}`, stage.detail]),
  ),
});

export const SUPER_SENSES_SMELL_SIMULATION = defineGuidedImplementedSimulation({
  module: createGuidedModuleRecord(
    {
      id: moduleId,
      title: "Super Senses: The Sense of Smell",
      slug,
      viewerKey,
      summary:
        "Join Detective Snout in a five-minute smell investigation: reveal invisible odours, follow an ant pheromone trail, track a target with a dog and decode a silkmoth signal.",
      gradeBands: ["class3To5"],
      subjects: ["environmentalScience", "biology"],
      curriculumMapIds: ["cm-cbse-c5-ch01-super-senses"],
      conceptIds: [
        "concept-smell-detection",
        "concept-animal-chemical-signals",
        "concept-animal-odour-tracking",
      ],
      simulationFormat: "immersiveVr",
      xrFitType: "strongVrFit",
      xrFitJustification:
        "Immersive scale changes and spatial particle models make otherwise invisible odours, ground-level pheromone trails and overlapping scent fields observable without implying that animals see coloured trails.",
      learningObjective:
        "Explain that smells and pheromones involve chemicals, compare how humans and selected animals detect them, and interpret scent trails as visual models rather than literal visible paths.",
      scientificConceptExplanation:
        "Odour molecules can reach sensory receptors through air, while pheromones are chemical signals between members of the same species. Many ants detect pheromone trails with antennae, trained dogs can distinguish and follow target odours, and male domesticated silkmoths can detect female pheromones with highly sensitive antennae.",
      misconceptionsAddressed: [
        "Animals see the coloured scent trails shown in the simulation.",
        "Every animal detects the same smells in the same way.",
        "A dog can always follow any scent perfectly, regardless of training or environmental conditions.",
        "Every chemical smell is a pheromone.",
      ],
      visualizationStrategy:
        "A realistic park transforms into an ant-scale grass world, a layered forest scent field and a moonlit silkmoth habitat, with consistent labels distinguishing visible learning models from real chemical signals.",
      interactionStrategy:
        "Learners gaze or point at scent sources, follow evidence checkpoints, reject distractor odours and complete a final animal-to-behaviour match; timed hints prevent the five-minute story from stalling.",
      practicalUseCase:
        "Builds observation and model-reading skills while connecting everyday smells with animal communication, search-and-rescue training and insect behaviour.",
      cueCardIds: stages.map((stage) => `${viewerKey}:cue:${stage.id}`),
      revisionCardIds: [`${viewerKey}:revision`],
      assessmentHookIds: [
        `${viewerKey}:misconception`,
        `${viewerKey}:transfer`,
      ],
      instructorScript:
        "Run the four missions in five minutes. At every coloured trail, ask whether it is a real visible feature or the simulation model, then compare the sensory structure and behaviour of each animal.",
      batchActivityPrompt:
        "Give groups human, ant, dog and silkmoth cards. Ask them to match each animal with its sensory structure, chemical clue and behaviour, then explain which coloured visuals are models.",
      expectedDurationMinutes: 5,
      maxSessionDurationMinutes: 5,
      comfortRiskLevel: "low",
      safetyNotes: [
        "The shrinking, coloured scent trails and particle ribbons are explanatory models and are not literal scale or visible features of real odours.",
        "Search-and-rescue dogs require trained handlers; students should not approach unfamiliar animals or attempt a real tracking search.",
        "Use a stationary or bounded VR area and keep the floor clear before entering immersive mode.",
      ],
      estimatedPackageSizeMb: 8,
    },
    guidance,
  ),
  guidance,
  assessment,
  narration,
  assets: createGuidedAssetManifest({
    id: `assets:${moduleId}`,
    environment: {
      id: `${moduleId}:super-senses-park-environment`,
      url: `/simulations/${slug}/environment.webp`,
      source:
        "Project-generated panorama for the user-authored Super Senses simulation",
      license: "project-generated",
      author: "XR School project team",
      width: 1774,
      height: 887,
      channels: ["baseColor"],
      compression: "WebP lossy q76; sharp/libvips effort 6",
      byteSize: 310962,
      sha256:
        "b3df9b1218a99ecf5c34dceee7e44cbcdcfe1917cbdee2fff1293f239c9d9eed",
    },
  }),
  legacyPaths: [],
  contribution: {
    source: "user-story",
    integration: "new-class",
    contributor: "Aditya K. R. Pandey",
    sourcePath: "apps/web/components/simulations/SuperSensesSmellViewer.tsx",
  },
});
