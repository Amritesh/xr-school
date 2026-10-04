import {
  createGuidedAssessment,
  createGuidedAssetManifest,
  createGuidedLesson,
  createGuidedModuleRecord,
  defineGuidedImplementedSimulation,
  type GuidedStageAuthoring,
} from "./builders.js";

const moduleId = "sim-c07-ch03-a03-spinning-and-rolling-of-wool";
const slug = "c7-ch03-a03-spinning-and-rolling-of-wool";
const viewerKey = "guided-yarn-maker-mission";

const stages = [
  {
    id: "fibre-vs-yarn",
    title: "Fibre or Yarn?",
    cue: "Pull a loose wool fibre and a finished yarn sample, then inspect both under magnification.",
    detail:
      "A single wool fibre is short and separates easily. Yarn is a longer, continuous strand made by joining and twisting many fibres so that they grip one another.",
    actionId: "compare-loose-fibre-and-yarn",
    actionLabel: "Compare both samples",
    evidenceId: "fibre-yarn-comparison-evidence",
    evidenceMode: "scene",
    narrationText:
      "Welcome back, Junior Yarn Engineer. The wool has been cleaned, sorted and dyed, but loose fibres cannot yet be knitted or woven. Pull the single fibre, then pull the yarn. A fibre is short and separates easily. Yarn is a longer continuous strand made by joining and twisting many fibres, so the fibres grip one another.",
  },
  {
    id: "carding",
    title: "Open the Tangled Wool",
    cue: "Feed the wool, close the safety cover and keep the carding rollers in the green speed zone.",
    detail:
      "Carding opens tangled clumps, separates the cleaned wool fibres and begins arranging them in the same direction. It produces a broad, soft web rather than finished yarn.",
    actionId: "complete-guarded-carding-cycle",
    actionLabel: "Run the carding cycle",
    evidenceId: "carded-wool-web-evidence",
    evidenceMode: "scene",
    narrationText:
      "The dyed wool is still tangled. Carding uses guarded, wire-covered rollers to open the clumps, separate the fibres and begin arranging them in the same direction. Feed the wool, close the transparent safety cover and keep the speed in the green zone. The result is a broad, soft web, not finished yarn.",
  },
  {
    id: "combing",
    title: "Comb and Align the Fibres",
    cue: "Move the protected combing control with the arrows until the longer fibres lie in nearly parallel lines.",
    detail:
      "Combing arranges longer fibres more evenly and nearly parallel, while separating some remaining short fibres and small impurities. The aligned fibres form a soft, untwisted sliver.",
    actionId: "complete-protected-combing-pass",
    actionLabel: "Comb with the arrows",
    evidenceId: "aligned-sliver-evidence",
    evidenceMode: "scene",
    narrationText:
      "Carding has opened the wool, but its fibres are not fully aligned. Follow the arrows through the protected combing station. Combing arranges the longer fibres more evenly in nearly parallel lines and separates some short fibres and small impurities. The aligned fibres form a soft, untwisted strand called a sliver.",
  },
  {
    id: "drawing",
    title: "Draw the Sliver",
    cue: "Adjust the second rollers so the thick sliver becomes thinner and more even without breaking.",
    detail:
      "Drawing gradually pulls out the sliver to make it thinner and more even. In this model, the thinner strand prepared for spinning is called roving.",
    actionId: "draw-sliver-into-roving",
    actionLabel: "Set the drawing speed",
    evidenceId: "even-roving-evidence",
    evidenceMode: "scene",
    narrationText:
      "The sliver is still too thick for this yarn. Drawing gradually pulls it out so the strand becomes thinner and more even without breaking. Set the second rollers slightly faster than the first. In this model, the thinner strand prepared for spinning is called roving. School descriptions may also call this drawing or rolling fibres into a strand.",
  },
  {
    id: "twist",
    title: "Discover the Power of Twist",
    cue: "Test an untwisted strand, an over-twisted strand and a correctly twisted strand.",
    detail:
      "Without enough twist, fibres slide apart. A suitable twist helps fibres grip and produces flexible yarn; excessive twist can make yarn hard, curled and uneven.",
    actionId: "compare-three-twist-levels",
    actionLabel: "Test all twist levels",
    evidenceId: "correct-twist-evidence",
    evidenceMode: "scene",
    narrationText:
      "Test how twist changes a fibre strand. With no twist, fibres slide apart easily. Excessive twist can make the strand hard, curled and uneven. A suitable amount of twist helps neighbouring fibres grip one another and produces yarn that is strong enough yet flexible.",
  },
  {
    id: "spinning",
    title: "Operate the Spinning Machine",
    cue: "Feed the roving, balance drawing speed, set a suitable twist and keep yarn tension in the green zone.",
    detail:
      "Spinning draws and twists fibres together to make continuous yarn. Drawing controls thickness, twist holds fibres together, and suitable tension keeps the yarn moving without loops or breakage.",
    actionId: "spin-continuous-woollen-yarn",
    actionLabel: "Balance the spinning controls",
    evidenceId: "continuous-spun-yarn-evidence",
    evidenceMode: "scene",
    narrationText:
      "Spinning is the process of drawing and twisting fibres together to make yarn. Feed the roving, balance the drawing speed, choose a suitable twist and keep the tension in the green zone. Low tension can form loose loops, while excessive tension can break the strand. Correct settings produce continuous woollen yarn.",
  },
  {
    id: "winding",
    title: "Roll and Wind the Yarn",
    cue: "Attach the yarn, use a safe winding speed and move the guide smoothly across the bobbin.",
    detail:
      "Rolling or winding collects spun yarn evenly onto a bobbin, spool, cone or yarn ball. Even layers help prevent tangles and allow the yarn to unwind smoothly.",
    actionId: "wind-yarn-evenly-on-bobbin",
    actionLabel: "Wind an even bobbin",
    evidenceId: "evenly-wound-bobbin-evidence",
    evidenceMode: "scene",
    narrationText:
      "The newly spun yarn must now be collected. Attach its end to the bobbin, start slowly and move the guide smoothly from side to side. Rolling or winding forms even layers on a bobbin, spool, cone or yarn ball. Even winding helps prevent tangles and lets the yarn unwind smoothly.",
  },
  {
    id: "quality",
    title: "Inspect Yarn Quality",
    cue: "Complete the thickness, strength, twist and winding checks before approving the bobbin.",
    detail:
      "Good-quality yarn is continuous, sufficiently strong for its intended use, evenly twisted and reasonably uniform in thickness, with yarn distributed evenly on its bobbin.",
    actionId: "complete-four-yarn-quality-checks",
    actionLabel: "Run the quality checks",
    evidenceId: "approved-yarn-quality-evidence",
    evidenceMode: "scene",
    narrationText:
      "Inspect the completed yarn. Good-quality yarn should be continuous, sufficiently strong for its intended use, evenly twisted and reasonably uniform in thickness. Check that the yarn is also distributed evenly across the bobbin. Approve it only after all four observations pass.",
  },
  {
    id: "products-summary",
    title: "From Fibre to Useful Products",
    cue: "Inspect the sweater, cloth, scarf and rug, then rebuild the wool-to-yarn process in order.",
    detail:
      "Clean wool is carded, combed into a sliver, drawn into a thinner strand, spun by drawing and twisting, and wound as finished yarn for knitting or weaving.",
    actionId: "inspect-products-and-order-process",
    actionLabel: "Build the wool-to-yarn sequence",
    evidenceId: "wool-to-yarn-sequence-evidence",
    evidenceMode: "answer",
    misconceptionId: `${viewerKey}:misconception`,
    narrationText:
      "Blue, red and green yarn can now be knitted or woven into products such as sweaters, scarves, cloth and rugs. Review the sequence: clean coloured wool, carding, combing, sliver, drawing, roving, spinning, winding and finished yarn. Carding opens, combing aligns, drawing thins, spinning adds twist and winding collects the yarn.",
  },
  {
    id: "final-challenge",
    title: "The Yarn Maker Challenge",
    cue: "Independently card, comb, draw, select the correct twist, balance the tension and wind the yarn evenly.",
    detail:
      "A complete yarn-making plan opens and aligns wool, draws an even strand, adds suitable twist under balanced tension, and winds the finished yarn evenly.",
    actionId: "complete-independent-yarn-maker-challenge",
    actionLabel: "Complete the final challenge",
    evidenceId: "yarn-maker-mastery-evidence",
    evidenceMode: "answer",
    transferPromptId: `${viewerKey}:transfer`,
    narrationText:
      "Complete the mission without guidance. Card the wool at a safe speed, comb the longer fibres into alignment, draw an even strand, choose a suitable twist, balance the tension and wind the yarn evenly. Use the evidence from every station to turn loose fibres into a strong, continuous and neatly collected woollen yarn.",
  },
] satisfies GuidedStageAuthoring[];

const { guidance, narration } = createGuidedLesson({
  id: viewerKey,
  moduleId,
  viewerKey,
  classContext: "CBSE Class 7 Science",
  gradeTone: "class6To8",
  objective:
    "Use visible fibre and yarn evidence to explain and order carding, combing, drawing, spinning and winding, then produce and inspect an even woollen yarn.",
  stages,
  completion: {
    eyebrow: "Mission accomplished",
    headline: "Master Yarn Engineer",
    body: "You transformed loose, coloured wool fibres into strong, continuous yarn and wound it evenly for knitting or weaving.",
    actionLabel: "Review the yarn-making journey",
  },
});

const assessment = createGuidedAssessment({
  id: `${viewerKey}:assessment`,
  objectiveId: guidance.id,
  misconception: {
    id: `${viewerKey}:misconception`,
    stageId: "products-summary",
    question: "Which wool-to-yarn sequence is scientifically correct?",
    acceptedEvidenceId: "wool-to-yarn-sequence-evidence",
    acceptedLabel: "Card, comb, draw, spin, then wind the yarn.",
    distractorLabel: "Wind the loose wool first, then card and twist it.",
    hint: "The fibres must be opened, aligned and thinned before twist turns them into yarn.",
    explanation:
      "Carding opens the wool, combing aligns the fibres, drawing makes the strand thinner and more even, spinning adds twist, and winding collects the finished yarn.",
  },
  transfer: {
    id: `${viewerKey}:transfer`,
    stageId: "final-challenge",
    question: "Which plan is most likely to produce usable woollen yarn?",
    acceptedEvidenceId: "yarn-maker-mastery-evidence",
    acceptedLabel:
      "Align and draw the fibres, add a suitable twist with balanced tension, then wind evenly.",
    distractorLabel:
      "Leave the fibres tangled, use maximum twist and tension, then pile yarn at one point on the bobbin.",
    hint: "Check fibre alignment, strand thickness, twist, tension and how the yarn is distributed.",
    explanation:
      "Aligned and evenly drawn fibres need a suitable twist and tension to form continuous yarn, and the yarn guide must distribute it evenly during winding.",
  },
});

export const YARN_MAKER_GUIDANCE = guidance;
export const YARN_MAKER_SCENE_METADATA = Object.freeze({
  environmentUrl: `/simulations/${slug}/environment.webp`,
  stageOutcomes: Object.fromEntries(
    stages.map((stage) => [`scene:${stage.id}`, stage.detail]),
  ),
});

export const YARN_MAKER_SIMULATION = defineGuidedImplementedSimulation({
  module: createGuidedModuleRecord(
    {
      id: moduleId,
      title: "Spinning and Rolling of Wool",
      slug,
      viewerKey,
      summary:
        "Enter a wool factory as a Junior Yarn Engineer, transform clean coloured fibres through carding, combing, drawing and spinning, then inspect and wind the finished yarn.",
      gradeBands: ["class6To8"],
      subjects: ["biology", "science"],
      curriculumMapIds: ["chapter-cbse-c7-fibre-to-fabric"],
      conceptIds: [
        "concept-wool-carding-combing",
        "concept-wool-drawing-spinning",
        "concept-yarn-winding-quality",
      ],
      simulationFormat: "immersiveVr",
      xrFitType: "strongVrFit",
      xrFitJustification:
        "A spatial factory line lets learners compare fibre and yarn, see otherwise hard-to-observe alignment and twist at enlarged scale, and practise coordinated machine settings without exposure to moving machinery.",
      learningObjective:
        "Distinguish loose fibre from yarn; explain and order carding, combing, drawing, spinning and winding; relate suitable twist to yarn strength; and identify evidence of usable yarn quality.",
      scientificConceptExplanation:
        "Carding opens and partly aligns cleaned wool, combing aligns longer fibres more evenly, drawing makes the strand thinner, spinning draws and twists fibres into continuous yarn, and winding collects that yarn evenly for later use.",
      misconceptionsAddressed: [
        "A single loose wool fibre is already yarn and can be knitted directly.",
        "Carding, combing and spinning are three names for the same process.",
        "More twist and more tension always make better yarn.",
        "Winding the yarn in one place on a bobbin is as effective as distributing it evenly.",
      ],
      visualizationStrategy:
        "A realistic wool factory panorama supports enlarged fibre-versus-yarn views, transparent guarded carding and spinning machinery, aligned-fibre diagrams, twist comparisons, a quality station and a complete process line.",
      interactionStrategy:
        "Learners inspect, compare and operate one evidence-gated station at a time, balancing speed, twist and tension before independently rebuilding the full fibre-to-yarn process.",
      practicalUseCase:
        "Connects clean wool fibres to the yarn used in knitted and woven clothing, blankets and rugs while introducing observable quality checks used in textile processing.",
      cueCardIds: stages.map((stage) => `${viewerKey}:cue:${stage.id}`),
      revisionCardIds: [`${viewerKey}:revision`],
      assessmentHookIds: [
        `${viewerKey}:misconception`,
        `${viewerKey}:transfer`,
      ],
      instructorScript:
        "Run the experience as a six-minute fibre investigation. Ask learners to name the visible change at each station, compare no twist with excessive twist, and justify every setting used in the independent challenge.",
      batchActivityPrompt:
        "Give groups process cards for carding, combing, drawing, spinning and winding. Ask them to order the cards and explain how fibre arrangement, strand thickness, twist and collection change at each step.",
      expectedDurationMinutes: 6,
      maxSessionDurationMinutes: 9,
      comfortRiskLevel: "low",
      safetyNotes: [
        "All carding, combing, spinning and winding machines are protected educational models; real textile machinery must only be operated by trained people with guards in place.",
        "Keep hands, hair and loose clothing away from rollers, spindles and bobbins in real workshops.",
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
      id: `${moduleId}:wool-factory-environment`,
      url: `/simulations/${slug}/environment.webp`,
      source:
        "OpenAI image generation for the user-authored Yarn Maker Mission simulation",
      license: "project-generated",
      author: "OpenAI image generation directed by Aditya K. R. Pandey",
      width: 1774,
      height: 887,
      channels: ["baseColor"],
      compression: "WebP lossy q76; sharp/libvips effort 6",
      byteSize: 182882,
      sha256:
        "d42ff9f5b72d8bdd0cccd61ab165acb892ebc69a8b1bd8b68efe642f8404c105",
    },
  }),
  legacyPaths: [],
  contribution: {
    source: "user-story",
    integration: "new-class",
    contributor: "Aditya K. R. Pandey",
    sourcePath: "apps/web/components/simulations/YarnMakerViewer.tsx",
  },
});
