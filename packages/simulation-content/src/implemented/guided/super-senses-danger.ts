import {
  createGuidedAssessment,
  createGuidedAssetManifest,
  createGuidedLesson,
  createGuidedModuleRecord,
  defineGuidedImplementedSimulation,
  type GuidedStageAuthoring,
} from "./builders.js";

const moduleId = "sim-c05-ch01-a03-super-sense-of-danger";
const slug = "c5-ch01-a03-super-sense-of-danger";
const viewerKey = "guided-super-senses-danger";

const stages = [
  {
    id: "vibe-boots",
    title: "Activate the Vibe-Boots",
    cue: "Compare the three ground signals and choose the medium, regular ripple made by the distant footsteps.",
    detail:
      "A vibration is repeated movement around a resting position. The glowing rings make otherwise invisible ground movement easier to compare; larger rings in this model mean a stronger signal, not a coloured wave in nature.",
    actionId: "calibrate-ground-vibration",
    actionLabel: "Choose the distant-footstep vibration",
    evidenceId: "ground-vibration-calibration-evidence",
    evidenceMode: "scene",
    scaleNote:
      "Yellow rings, signal colours and the boot display are explanatory overlays. Real ground vibrations are not visible coloured circles.",
    narrationText:
      "Psst, agent! Professor Tremor reporting from the Super Senses Spy Academy. Your Vibe-Boots are online. Look down and compare the three ground signals. The glowing rings are a model that makes invisible vibration visible: small faint rings show a weak signal here, while larger brighter rings show a stronger signal. Find the medium, regular ripple made by the distant footsteps. Detect, decode, react and survive!",
  },
  {
    id: "elephant-ripples",
    title: "Trace the Elephant Signal",
    cue: "Choose the centre source, then follow three regular seismic-ripple checkpoints back to the distant elephant herd.",
    detail:
      "Elephants produce low-frequency calls and can generate and detect vibrations that travel through the ground. Sensitive structures in their feet and body help receive seismic information, but a vibration does not identify every distant event with certainty.",
    actionId: "trace-elephant-seismic-signal",
    actionLabel: "Trace all three elephant-ripple checkpoints",
    evidenceId: "elephant-seismic-tracking-evidence",
    evidenceMode: "scene",
    scaleNote:
      "The semi-transparent soil, arrows and signal percentage are explanatory tools and are not part of an elephant's natural view.",
    narrationText:
      "Agent, look down. Elephants can communicate with very low-frequency calls, and part of that energy can travel through the ground as vibration. Elephants can detect seismic information through sensitive structures in their feet and body. First choose the large, regular centre signal. Then follow its three checkpoints toward the herd. Remember: vibration is useful information, but it does not tell an animal exactly what every distant event is.",
  },
  {
    id: "web-alarm",
    title: "Decode the Spider-Web Alarm",
    cue: "Read the gentle leaf pulse, identify the urgent patterned strand, then lock the safe escape point.",
    detail:
      "A spider detects web motion with mechanoreceptors and can use vibration timing, strength, frequency and location as evidence. Interpretation depends on the web, spider and context; blue and red are labels in this activity, not universal codes.",
    actionId: "decode-web-vibration-pattern",
    actionLabel: "Classify the web signals and select the escape route",
    evidenceId: "web-vibration-model-evidence",
    evidenceMode: "answer",
    misconceptionId: `${viewerKey}:misconception`,
    scaleNote:
      "Coloured pulses and enlarged strand movement make vibration patterns observable. Real web vibration is not naturally blue for safe or red for danger.",
    narrationText:
      "Welcome to the spider web, agent. When something touches silk, motion travels through connected strands. A spider senses those vibrations with specialised structures on its legs and uses the pattern as evidence. First inspect the gentle leaf pulse. Next find the faster, stronger urgent strand. Finally select the green escape point. Our blue and red colours are teaching labels, not a universal language used by every spider.",
  },
  {
    id: "electro-vision",
    title: "Find the Buried Electric Signals",
    cue: "Scan the sand, rock and pulsing field; reveal the first stingray and then locate the second buried signal.",
    detail:
      "Sharks detect weak electric fields in water using electroreceptors called ampullae of Lorenzini. Bioelectric fields come from living tissue, but the visible halo and heartbeat sound are simulation cues rather than literal electricity that a shark sees or hears.",
    actionId: "locate-buried-bioelectric-fields",
    actionLabel: "Reveal both buried stingray signals",
    evidenceId: "electroreception-transfer-evidence",
    evidenceMode: "answer",
    transferPromptId: `${viewerKey}:transfer`,
    scaleNote:
      "The blue-white halos, percentage meter and confirmation tone visualise weak electric fields that are normally invisible and inaudible.",
    narrationText:
      "Final zone: the ocean. Sharks have electroreceptors called ampullae of Lorenzini that can detect very weak electric fields in water. Living animals produce small bioelectric fields, even when hidden by sand. Scan the empty sand, the rock and the regular pulsing field. Reveal the first buried stingray, then find the second signal. The blue halo and pulse sound are our model; a shark does not literally see or hear electricity this way.",
  },
] satisfies GuidedStageAuthoring[];

const { guidance, narration } = createGuidedLesson({
  id: viewerKey,
  moduleId,
  viewerKey,
  classContext: "CBSE Class 5 Environmental Science",
  gradeTone: "class3To5",
  objective:
    "Use spatial evidence to compare ground vibration, web vibration and electroreception while distinguishing invisible biological signals from the simulation's visible teaching overlays.",
  stages,
  completion: {
    eyebrow: "Super Senses Spy Academy",
    headline: "Wildlife Spy Badge Earned",
    body: "You calibrated ground vibration, traced an elephant signal, decoded web motion and located weak electric fields underwater.",
    actionLabel: "Review the three hidden-signal systems",
  },
});

const assessment = createGuidedAssessment({
  id: `${viewerKey}:assessment`,
  objectiveId: guidance.id,
  misconception: {
    id: `${viewerKey}:misconception`,
    stageId: "web-alarm",
    question: "What do the red and blue pulses mean in the web investigation?",
    acceptedEvidenceId: "web-vibration-model-evidence",
    acceptedLabel:
      "They are activity labels that help us compare web-vibration patterns; spiders do not see a universal red-and-blue danger code.",
    distractorLabel:
      "Every spider sees web vibrations as red danger waves and blue safe waves.",
    hint: "Professor Tremor called the colours teaching labels.",
    explanation:
      "Spiders sense mechanical motion rather than visible coloured waves. Timing, strength, frequency, location and context help a spider interpret what touched its web.",
  },
  transfer: {
    id: `${viewerKey}:transfer`,
    stageId: "electro-vision",
    question:
      "What idea connects the elephant, spider and shark investigations?",
    acceptedEvidenceId: "electroreception-transfer-evidence",
    acceptedLabel:
      "Animals can detect different physical signals that people may miss: ground vibration, web motion or weak electric fields.",
    distractorLabel:
      "All three animals use the same sense and see the coloured waves shown by the simulation.",
    hint: "Compare the material carrying each signal: soil, silk and water.",
    explanation:
      "Different sensory systems respond to different physical information. The coloured overlays make those normally invisible signals observable for learning.",
  },
});

export const SUPER_SENSES_DANGER_GUIDANCE = guidance;
export const SUPER_SENSES_DANGER_SCENE_METADATA = Object.freeze({
  environmentUrl: `/simulations/${slug}/environment.webp`,
  stageOutcomes: Object.fromEntries(
    stages.map((stage) => [`scene:${stage.id}`, stage.detail]),
  ),
});

export const SUPER_SENSES_DANGER_SIMULATION = defineGuidedImplementedSimulation(
  {
    module: createGuidedModuleRecord(
      {
        id: moduleId,
        title: "Super Senses: The Sense of Danger",
        slug,
        viewerKey,
        summary:
          "Join Professor Tremor in an exact five-minute wildlife-spy mission about elephant seismic signals, spider-web vibration and shark electroreception.",
        gradeBands: ["class3To5"],
        subjects: ["environmentalScience", "biology", "physics"],
        curriculumMapIds: ["cm-cbse-c5-ch01-super-senses"],
        conceptIds: [
          "concept-seismic-animal-communication",
          "concept-web-vibration-sensing",
          "concept-electroreception",
        ],
        simulationFormat: "immersiveVr",
        xrFitType: "strongVrFit",
        xrFitJustification:
          "A wraparound savanna, giant web and ocean floor make direction, distance and spatial signal tracing meaningful while gaze and controller input support comfortable seated or standing play.",
        learningObjective:
          "Compare how elephants, spiders and sharks obtain information from vibrations or weak electric fields, and explain that the coloured waves are explanatory models.",
        scientificConceptExplanation:
          "Ground and web vibrations are mechanical motion that can carry information. Elephants can detect seismic vibration through sensitive structures in their feet and body; spiders detect patterns moving through silk; and sharks use ampullae of Lorenzini to detect weak electric fields in water.",
        misconceptionsAddressed: [
          "Real vibrations travel as visible yellow, red or blue rings.",
          "A single vibration always identifies a predator, storm or other event with certainty.",
          "Every spider uses a universal red-for-danger and blue-for-safe code.",
          "Sharks literally see or hear electric fields as glowing heartbeats.",
          "Electroreception is an all-purpose danger radar or works the same way in every animal.",
        ],
        visualizationStrategy:
          "A project-generated 360-degree natural-history panorama supports a procedural savanna, macro spider web and shallow ocean, with clearly labelled rings, strand pulses and field halos used only as explanatory overlays.",
        interactionStrategy:
          "Learners use pointer, keyboard, centre-gaze or Quest controllers to calibrate a ground signal, trace three elephant checkpoints, classify web motion, select a safe exit and reveal two buried stingrays; automatic timed support preserves the exact five-minute story.",
        practicalUseCase:
          "Builds evidence-reading and model-literacy skills while connecting animal senses to communication, hunting and survival in different habitats.",
        cueCardIds: stages.map((stage) => `${viewerKey}:cue:${stage.id}`),
        revisionCardIds: [`${viewerKey}:revision`],
        assessmentHookIds: [
          `${viewerKey}:misconception`,
          `${viewerKey}:transfer`,
        ],
        instructorScript:
          "Run all four timed missions. At each glowing signal, ask what physical phenomenon the overlay represents and what the learner can and cannot conclude from it.",
        batchActivityPrompt:
          "Give groups soil, silk and water signal cards. Ask them to match each medium with an animal, receptor or body structure, useful information and one limit of the model.",
        expectedDurationMinutes: 5,
        maxSessionDurationMinutes: 5,
        comfortRiskLevel: "low",
        safetyNotes: [
          "Glowing rings, coloured web pulses, field halos, signal sounds and percentages are explanatory models, not literal recordings of animal perception.",
          "Use a stationary or bounded VR area, keep the floor clear and stop if discomfort occurs.",
          "Observe wildlife only from a safe distance; do not approach elephants, sharks, spiders, wasps or other animals to test these ideas.",
        ],
        estimatedPackageSizeMb: 10,
      },
      guidance,
    ),
    guidance,
    assessment,
    narration,
    assets: createGuidedAssetManifest({
      id: `assets:${moduleId}`,
      environment: {
        id: `${moduleId}:savanna-web-ocean-environment`,
        url: `/simulations/${slug}/environment.webp`,
        source:
          "Project-generated panorama for the user-authored Super Senses simulation",
        license: "project-generated",
        author: "XR School project team",
        width: 1774,
        height: 887,
        channels: ["baseColor"],
        compression: "WebP lossy q76; sharp/libvips effort 6",
        byteSize: 332758,
        sha256:
          "d7540b4ba9186b106feccf7e545b7d29727a014fd2dc6262e3d39a6da9a39707",
      },
    }),
    legacyPaths: [],
    contribution: {
      source: "user-story",
      integration: "new-class",
      contributor: "Aditya K. R. Pandey",
      sourcePath: "apps/web/components/simulations/SuperSensesDangerViewer.tsx",
    },
  },
);
