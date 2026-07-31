import { describe, expect, it } from "vitest";

import {
  defineGuidedImplementedSimulation,
  defineImplementedSimulation,
  toExperienceDefinition,
  validateGuidedSimulationDefinition,
  validateImplementedSimulationDefinition,
  validateNarrationManifest,
  type AssessmentSequence,
  type AssetManifest,
  type GuidedSimulationDefinition,
  type ImplementedSimulationDefinition,
  type SimulationModuleRecord,
  type SimulationNarrationManifest,
} from "../../packages/simulation-schema/src/index";

const SHA_256 =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function validModule(
  overrides: Partial<SimulationModuleRecord> = {},
): SimulationModuleRecord {
  return {
    id: "sim-guided-class",
    title: "Guided Reference Class",
    slug: "guided-class",
    viewerKey: "guided-reference",
    legacyAliases: ["old-guided-class"],
    summary:
      "A complete reference class used to exercise the implemented simulation contract.",
    gradeBands: ["class6To8"],
    subjects: ["science"],
    applicableBoards: ["cbse"],
    curriculumMapIds: ["cm-guided-class"],
    conceptIds: ["concept-guided-class"],
    simulationFormat: "guidedVisualization",
    evidenceConfidenceLevel: "experimental",
    releaseMaturity: "internalQA",
    publicationStatus: "released",
    evidenceMaturity: "internalQA",
    xrFitType: "strongVrFit",
    xrFitJustification:
      "The spatial sequence makes otherwise hidden evidence visible and comparable.",
    learningObjective:
      "Use observed evidence to reject a misconception and transfer the idea.",
    scientificConceptExplanation:
      "The reference class separates an observation from its interpretation and then applies the resulting model to a new case.",
    misconceptionsAddressed: ["Appearance alone proves the result."],
    visualizationStrategy:
      "A staged scene reveals one relevant observation at a time before asking for an explanation.",
    interactionStrategy:
      "Learners inspect the scene and then answer misconception and transfer prompts.",
    cueCardIds: ["cue-observe", "cue-explain", "cue-transfer"],
    revisionCardIds: ["revision-guided"],
    assessmentHookIds: ["assessment-misconception", "assessment-transfer"],
    instructorScript:
      "SETUP\nPrepare the class.\nDURING HEADSET BATCH\nObserve.\nDEBRIEF\nDiscuss.\nREVISION TRIGGER\nRecall.",
    batchActivityPrompt:
      "Record the observation and explain how it changes the prediction.",
    expectedDurationMinutes: 8,
    maxSessionDurationMinutes: 10,
    comfortRiskLevel: "low",
    safetyNotes: ["Use stationary viewing."],
    estimatedPackageSizeMb: 32,
    targetFrameRateFps: 72,
    minQuestStorageGb: 1,
    stages: 3,
    status: "released",
    ...overrides,
  };
}

function validGuidance(): GuidedSimulationDefinition {
  return {
    id: "experience-guided-class",
    moduleId: "sim-guided-class",
    viewerKey: "guided-reference",
    classContext: "Class 6 science investigation",
    gradeTone: "class6To8",
    objective:
      "Use observed evidence to reject a misconception and transfer the idea.",
    stages: [
      {
        id: "observe",
        title: "Observe the scene",
        cue: "Inspect the visible evidence.",
        detail: "Look closely before deciding what the evidence means.",
        actionLabel: "Record observation",
        requiredActionIds: ["scene.observe"],
        completionEvidenceIds: ["scene-observed"],
        narrationId: "narration-observe",
        sceneCueId: "scene-cue-observe",
        evidenceMode: "scene",
        scaleNote: "The object is shown at twice life size.",
      },
      {
        id: "misconception",
        title: "Explain the evidence",
        cue: "Reject the misconception using the observation.",
        detail: "Use the recorded evidence to replace the incorrect idea.",
        actionLabel: "Submit explanation",
        requiredActionIds: ["assessment.misconception"],
        completionEvidenceIds: ["misconception-complete"],
        narrationId: "narration-misconception",
        sceneCueId: "scene-cue-misconception",
        evidenceMode: "answer",
        misconceptionId: "prompt-misconception",
      },
      {
        id: "transfer",
        title: "Transfer the explanation",
        cue: "Apply the evidence rule to a new case.",
        detail: "Use the same evidence rule when the appearance changes.",
        actionLabel: "Submit transfer",
        requiredActionIds: ["assessment.transfer"],
        completionEvidenceIds: ["transfer-complete"],
        narrationId: "narration-transfer",
        sceneCueId: "scene-cue-transfer",
        evidenceMode: "answer",
        transferPromptId: "prompt-transfer",
      },
    ],
    completion: {
      eyebrow: "Investigation complete",
      headline: "Evidence changes the explanation",
      body: "You used an observation to reject a misconception and transfer the idea.",
      actionLabel: "Review evidence",
    },
  };
}

function validAssessment(
  experienceId = "experience-guided-class",
): AssessmentSequence {
  return {
    id: "assessment-guided-class",
    objectiveId: experienceId,
    prompts: [
      {
        id: "prompt-misconception",
        kind: "misconception",
        stageId: "misconception",
        question: "Does appearance alone prove the result?",
        options: [
          { id: "appearance-only", label: "Yes" },
          { id: "observed-evidence", label: "No" },
        ],
        acceptedEvidenceIds: ["observed-evidence"],
        hint: "Use the recorded observation.",
        explanation:
          "The observation, not appearance alone, supports the result.",
        retryPolicy: "immediateWithHint",
      },
      {
        id: "prompt-transfer",
        kind: "transfer",
        stageId: "transfer",
        question: "Would the same evidence rule apply to a new-looking object?",
        options: [
          { id: "rule-transfers", label: "Yes" },
          { id: "appearance-decides", label: "No" },
        ],
        acceptedEvidenceIds: ["rule-transfers"],
        hint: "Apply the evidence rule, not the appearance.",
        explanation: "The evidence rule transfers to the new case.",
        retryPolicy: "afterObservation",
      },
      {
        id: "prompt-transfer-observation",
        kind: "observation",
        stageId: "transfer",
        question: "What changed in the transfer scene?",
        acceptedEvidenceIds: ["transfer-scene-observed"],
        hint: "Inspect the new-looking object.",
        explanation:
          "The transfer scene provides the observation required before retrying.",
        retryPolicy: "immediateWithHint",
      },
    ],
    masteryRule: {
      requiredEvidenceCount: 2,
      requiredKinds: ["misconception", "transfer"],
      allowHintedMastery: true,
    },
  };
}

function validNarration(): SimulationNarrationManifest {
  return {
    id: "narration-guided-class",
    cues: [
      {
        id: "narration-observe",
        stageId: "observe",
        text: "Inspect the scene before deciding.",
        caption: "Inspect the scene before deciding.",
      },
      {
        id: "narration-misconception",
        stageId: "misconception",
        text: "Use the observation to reject the misconception.",
        caption: "Use the observation to reject the misconception.",
        audioUrl: "/audio/guided-class/misconception.mp3",
      },
      {
        id: "narration-transfer",
        stageId: "transfer",
        text: "Apply the evidence rule to the new case.",
        caption: "Apply the evidence rule to the new case.",
        audioUrl: "/audio/guided-class/transfer.mp3",
      },
    ],
    fallback: "browserTts",
  };
}

function validAssets(): AssetManifest {
  return {
    id: "assets-guided-class",
    assets: [
      {
        id: "asset-guided-model",
        url: "/assets/guided-class/model.glb",
        kind: "model",
        source: "unverified-contributor-supplied",
        license: "unverified-contributor-supplied",
        author: "unverified-contributor-supplied",
        width: 1024,
        height: 1024,
        channels: ["baseColor"],
        compression: "glTF meshopt",
        sha256: SHA_256,
        byteSize: 4096,
      },
    ],
  };
}

function validGuidedInput() {
  return {
    module: validModule(),
    guidance: validGuidance(),
    assessment: validAssessment(),
    narration: validNarration(),
    assets: validAssets(),
    legacyPaths: ["/simulations/old-guided-class"],
    contribution: {
      source: "existing" as const,
      contributor: "XR School",
      sourcePath: "apps/web/components/simulations/GuidedReferenceViewer.tsx",
    },
  };
}

function validInteractiveDefinition(): ImplementedSimulationDefinition {
  const guidance = validGuidance();
  const experience = toExperienceDefinition(guidance);
  return {
    module: validModule({
      id: "sim-interactive-class",
      slug: "interactive-class",
      viewerKey: "interactive-reference",
      legacyAliases: ["old-interactive-class"],
      simulationFormat: "interactive3d",
    }),
    kind: "interactive",
    experience,
    assessment: validAssessment(experience.id),
    narration: validNarration(),
    assets: validAssets(),
    legacyPaths: ["/simulations/old-interactive-class"],
    contribution: { source: "existing" },
  };
}

describe("guided simulation definition", () => {
  it("accepts a complete guided definition", () => {
    expect(validateGuidedSimulationDefinition(validGuidance())).toEqual([]);
  });

  it("purely derives the generic experience without retaining guided-only fields", () => {
    const guidance = validGuidance();
    const before = structuredClone(guidance);

    const experience = toExperienceDefinition(guidance);

    expect(experience).toEqual({
      id: guidance.id,
      gradeTone: guidance.gradeTone,
      objective: guidance.objective,
      stages: guidance.stages.map((stage) => ({
        id: stage.id,
        title: stage.title,
        cue: stage.cue,
        requiredActionIds: stage.requiredActionIds,
        completionEvidenceIds: stage.completionEvidenceIds,
      })),
    });
    expect(experience.stages[0]).not.toHaveProperty("detail");
    expect(experience.stages[0]).not.toHaveProperty("narrationId");
    experience.stages[0].requiredActionIds.push("derived-only-action");
    expect(guidance).toEqual(before);
  });

  it("rejects unsupported evidence modes", () => {
    const guidance = validGuidance();
    guidance.stages[0].evidenceMode = "automatic" as "scene";

    expect(validateGuidedSimulationDefinition(guidance)).toContain(
      'guidance.stages[0].evidenceMode: expected "scene" or "answer"',
    );
  });

  it("requires answer stages to reference exactly one assessment prompt", () => {
    const missingReference = validGuidance();
    missingReference.stages[1].misconceptionId = undefined;
    const duplicateReference = validGuidance();
    duplicateReference.stages[1].transferPromptId = "prompt-transfer";

    const expected =
      "guidance.stages[1]: answer evidence requires exactly one of misconceptionId or transferPromptId";
    expect(validateGuidedSimulationDefinition(missingReference)).toContain(
      expected,
    );
    expect(validateGuidedSimulationDefinition(duplicateReference)).toContain(
      expected,
    );
  });

  it("rejects answer-only evidence metadata on scene stages", () => {
    const guidance = validGuidance();
    guidance.stages[0].misconceptionId = "prompt-misconception";
    guidance.stages[0].transferPromptId = "prompt-transfer";

    expect(validateGuidedSimulationDefinition(guidance)).toEqual(
      expect.arrayContaining([
        "guidance.stages[0].misconceptionId: not allowed for scene evidence",
        "guidance.stages[0].transferPromptId: not allowed for scene evidence",
      ]),
    );
  });

  it("rejects duplicate stage, action, evidence, and scene cue identifiers", () => {
    const guidance = validGuidance();
    guidance.stages[1].id = guidance.stages[0].id;
    guidance.stages[1].requiredActionIds = [
      ...guidance.stages[0].requiredActionIds,
    ];
    guidance.stages[1].completionEvidenceIds = [
      ...guidance.stages[0].completionEvidenceIds,
    ];
    guidance.stages[1].sceneCueId = guidance.stages[0].sceneCueId;

    expect(validateGuidedSimulationDefinition(guidance)).toEqual(
      expect.arrayContaining([
        'guidance.stages[1].id: duplicate "observe"',
        'guidance.stages[1].requiredActionIds[0]: duplicate "scene.observe"',
        'guidance.stages[1].completionEvidenceIds[0]: duplicate "scene-observed"',
        'guidance.stages[1].sceneCueId: duplicate "scene-cue-observe"',
      ]),
    );
  });

  it("returns stable errors for missing guided objects and arrays", () => {
    expect(
      validateGuidedSimulationDefinition(
        undefined as unknown as GuidedSimulationDefinition,
      ),
    ).toEqual(["guidance: required"]);

    const guidance = validGuidance();
    guidance.stages =
      undefined as unknown as GuidedSimulationDefinition["stages"];
    guidance.completion =
      undefined as unknown as GuidedSimulationDefinition["completion"];

    expect(() => validateGuidedSimulationDefinition(guidance)).not.toThrow();
    expect(validateGuidedSimulationDefinition(guidance)).toEqual(
      expect.arrayContaining([
        "guidance.stages: required",
        "guidance.completion: required",
      ]),
    );
  });

  it("returns stable errors for malformed guided stage entries", () => {
    const guidance = validGuidance();
    guidance.stages[0] =
      undefined as unknown as GuidedSimulationDefinition["stages"][number];
    guidance.stages[1].requiredActionIds = undefined as unknown as string[];
    guidance.stages[1].completionEvidenceIds = undefined as unknown as string[];

    expect(() => validateGuidedSimulationDefinition(guidance)).not.toThrow();
    expect(validateGuidedSimulationDefinition(guidance)).toEqual(
      expect.arrayContaining([
        "guidance.stages[0]: required",
        "guidance.stages[1].requiredActionIds: required",
        "guidance.stages[1].completionEvidenceIds: required",
      ]),
    );
  });
});

describe("simulation narration manifest", () => {
  it("accepts complete captioned narration", () => {
    expect(validateNarrationManifest(validNarration())).toEqual([]);
  });

  it("rejects duplicate cue IDs and missing captions or fallback", () => {
    const narration = validNarration();
    narration.cues[1].id = narration.cues[0].id;
    narration.cues[0].caption = undefined as unknown as string;
    narration.fallback = undefined as unknown as "none";

    expect(validateNarrationManifest(narration)).toEqual(
      expect.arrayContaining([
        "narration.cues[0].caption: required",
        'narration.cues[1].id: duplicate "narration-observe"',
        'narration.fallback: expected "browserTts" or "none"',
      ]),
    );
  });

  it("returns stable errors for missing narration objects and cue arrays", () => {
    expect(
      validateNarrationManifest(
        undefined as unknown as SimulationNarrationManifest,
      ),
    ).toEqual(["narration: required"]);

    const missingCues = validNarration();
    missingCues.cues =
      undefined as unknown as SimulationNarrationManifest["cues"];
    expect(() => validateNarrationManifest(missingCues)).not.toThrow();
    expect(validateNarrationManifest(missingCues)).toContain(
      "narration.cues: required",
    );

    const malformedCue = validNarration();
    malformedCue.cues[0] =
      undefined as unknown as SimulationNarrationManifest["cues"][number];
    expect(() => validateNarrationManifest(malformedCue)).not.toThrow();
    expect(validateNarrationManifest(malformedCue)).toContain(
      "narration.cues[0]: required",
    );
  });
});

describe("implemented simulation definition", () => {
  it("builds a valid guided record from one authored guidance source", () => {
    const input = validGuidedInput();

    const definition = defineGuidedImplementedSimulation(input);

    expect(definition.kind).toBe("guided");
    expect(definition.experience).toEqual(
      toExperienceDefinition(input.guidance),
    );
    expect(validateImplementedSimulationDefinition(definition)).toEqual([]);
    expect(definition).not.toHaveProperty("guidance");
  });

  it("accepts and returns a valid interactive record without repair", () => {
    const definition = validInteractiveDefinition();

    expect(validateImplementedSimulationDefinition(definition)).toEqual([]);
    expect(defineImplementedSimulation(definition)).toBe(definition);
  });

  it("allows released internal-QA records with explicit unverified provenance", () => {
    const definition = validInteractiveDefinition();
    definition.assets.assets[0].source = "unverified-contributor-supplied";
    definition.assets.assets[0].license = "unverified-contributor-supplied";
    definition.assets.assets[0].author = "unverified-contributor-supplied";

    expect(validateImplementedSimulationDefinition(definition)).toEqual([]);
  });

  it("rejects module, guidance, viewer, and stage-count misalignment", () => {
    const input = validGuidedInput();
    input.guidance.moduleId = "sim-somewhere-else";
    input.guidance.viewerKey = "somewhere-else";
    input.module.stages = 4;

    expect(() => defineGuidedImplementedSimulation(input)).toThrow(
      [
        'guided.module.id: expected guidance.moduleId "sim-somewhere-else", received "sim-guided-class"',
        'guided.module.viewerKey: expected guidance.viewerKey "somewhere-else", received "guided-reference"',
        "guided.module.stages: expected 3, received 4",
      ].join("\n"),
    );
  });

  it("rejects generic experience stage-count and assessment objective mismatches", () => {
    const definition = validInteractiveDefinition();
    definition.module.stages = 4;
    definition.assessment.objectiveId = "another-experience";

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        "implemented.module.stages: expected 3, received 4",
        'implemented.assessment.objectiveId: expected "experience-guided-class", received "another-experience"',
      ]),
    );
  });

  it("rejects assessment and narration references to unknown stages", () => {
    const definition = validInteractiveDefinition();
    definition.assessment.prompts[0].stageId = "missing-assessment-stage";
    definition.narration.cues[0].stageId = "missing-narration-stage";

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        'implemented.assessment.prompts[0].stageId: unknown stage "missing-assessment-stage"',
        'implemented.narration.cues[0].stageId: unknown stage "missing-narration-stage"',
      ]),
    );
  });

  it("requires every guided stage narration ID and answer prompt reference to resolve", () => {
    const input = validGuidedInput();
    input.guidance.stages[0].narrationId = "missing-narration";
    input.guidance.stages[1].misconceptionId = "missing-misconception";
    input.guidance.stages[2].transferPromptId = "missing-transfer";

    expect(() => defineGuidedImplementedSimulation(input)).toThrow(
      /guidance\.stages\[0\]\.narrationId: unknown narration cue "missing-narration"/,
    );
    expect(() => defineGuidedImplementedSimulation(input)).toThrow(
      /guidance\.stages\[1\]\.misconceptionId: unknown misconception prompt "missing-misconception"/,
    );
    expect(() => defineGuidedImplementedSimulation(input)).toThrow(
      /guidance\.stages\[2\]\.transferPromptId: unknown transfer prompt "missing-transfer"/,
    );
  });

  it("rejects narration cues assigned to the wrong guided stage", () => {
    const input = validGuidedInput();
    input.narration.cues[0].stageId = "misconception";

    expect(() => defineGuidedImplementedSimulation(input)).toThrow(
      'guidance.stages[0].narrationId: cue "narration-observe" belongs to stage "misconception"',
    );
  });

  it("rejects guided prompt references with the wrong assessment kind", () => {
    const input = validGuidedInput();
    input.guidance.stages[1].misconceptionId = "prompt-transfer";
    input.guidance.stages[2].transferPromptId = "prompt-misconception";

    expect(() => defineGuidedImplementedSimulation(input)).toThrow(
      [
        'guidance.stages[1].misconceptionId: prompt "prompt-transfer" has kind "transfer", expected "misconception"',
        'guidance.stages[2].transferPromptId: prompt "prompt-misconception" has kind "misconception", expected "transfer"',
      ].join("\n"),
    );
  });

  it("rejects guided prompt references assigned to another valid stage", () => {
    const input = validGuidedInput();
    input.assessment.prompts[0].stageId = "transfer";
    input.assessment.prompts[1].stageId = "misconception";

    expect(() => defineGuidedImplementedSimulation(input)).toThrow(
      [
        'guidance.stages[1].misconceptionId: prompt "prompt-misconception" belongs to stage "transfer"',
        'guidance.stages[2].transferPromptId: prompt "prompt-transfer" belongs to stage "misconception"',
      ].join("\n"),
    );
  });

  it("validates all required assessment prompt fields and enums", () => {
    const definition = validInteractiveDefinition();
    const prompt = definition.assessment.prompts[0];
    prompt.question = " ";
    prompt.kind = "recall" as typeof prompt.kind;
    prompt.retryPolicy = "never" as typeof prompt.retryPolicy;
    prompt.hint = undefined as unknown as string;
    prompt.explanation = undefined as unknown as string;

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        'implemented.assessment.prompts[0].kind: expected "prediction", "observation", "misconception", or "transfer"',
        "implemented.assessment.prompts[0].question: required",
        "implemented.assessment.prompts[0].hint: required",
        "implemented.assessment.prompts[0].explanation: required",
        'implemented.assessment.prompts[0].retryPolicy: expected "immediateWithHint" or "afterObservation"',
      ]),
    );
  });

  it("accepts prediction prompts without allowing prediction mastery kinds", () => {
    const withPrediction = validInteractiveDefinition();
    withPrediction.assessment.prompts.push({
      id: "prompt-prediction",
      kind: "prediction",
      stageId: "observe",
      question: "What will the next observation show?",
      options: [
        { id: "same-rule", label: "The evidence rule still applies" },
        { id: "appearance-rule", label: "Appearance decides the result" },
      ],
      acceptedEvidenceIds: ["same-rule"],
      hint: "Predict from the evidence rule.",
      explanation: "The established evidence rule predicts the new result.",
      retryPolicy: "immediateWithHint",
    });

    expect(validateImplementedSimulationDefinition(withPrediction)).toEqual([]);

    const invalidMastery = validInteractiveDefinition();
    invalidMastery.assessment.masteryRule.requiredKinds = [
      "prediction" as unknown as AssessmentSequence["masteryRule"]["requiredKinds"][number],
    ];
    expect(validateImplementedSimulationDefinition(invalidMastery)).toContain(
      'implemented.assessment.masteryRule.requiredKinds[0]: expected "observation", "misconception", or "transfer"',
    );
  });

  it("validates assessment option and accepted-evidence uniqueness and alignment", () => {
    const definition = validInteractiveDefinition();
    const prompt = definition.assessment.prompts[0];
    prompt.options = [
      { id: "duplicate-option", label: "First" },
      { id: "duplicate-option", label: "Second" },
    ];
    prompt.acceptedEvidenceIds = ["missing-option", "missing-option"];

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        'implemented.assessment.prompts[0].options[1].id: duplicate "duplicate-option"',
        'implemented.assessment.prompts[0].acceptedEvidenceIds[1]: duplicate "missing-option"',
        'implemented.assessment.prompts[0].acceptedEvidenceIds[0]: unknown option "missing-option"',
        'implemented.assessment.prompts[0].acceptedEvidenceIds[1]: unknown option "missing-option"',
      ]),
    );
  });

  it("requires after-observation retries to have a distinct same-stage observation prompt", () => {
    const definition = validInteractiveDefinition();
    definition.assessment.prompts = definition.assessment.prompts.filter(
      (prompt) => prompt.id !== "prompt-transfer-observation",
    );

    expect(validateImplementedSimulationDefinition(definition)).toContain(
      'implemented.assessment.prompts[1].retryPolicy: "afterObservation" requires a distinct observation prompt on stage "transfer"',
    );
  });

  it("requires complete prompt objects and non-empty evidence", () => {
    const definition = validInteractiveDefinition();
    const prompt = definition.assessment.prompts[0];
    prompt.options = [
      {
        id: " ",
        label: undefined as unknown as string,
      },
    ];
    prompt.acceptedEvidenceIds = [];

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        "implemented.assessment.prompts[0].options[0].id: required",
        "implemented.assessment.prompts[0].options[0].label: required",
        "implemented.assessment.prompts[0].acceptedEvidenceIds: at least one evidence ID is required",
      ]),
    );
  });

  it("requires released assessments to cover misconception and transfer", () => {
    const definition = validInteractiveDefinition();
    definition.assessment.prompts = [];
    definition.assessment.masteryRule.requiredEvidenceCount = 1;
    definition.assessment.masteryRule.requiredKinds = [];

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        "implemented.assessment.prompts: at least one prompt is required",
        "implemented.assessment.prompts: released simulations require a misconception prompt",
        "implemented.assessment.prompts: released simulations require a transfer prompt",
      ]),
    );
  });

  it("does not impose released prompt coverage on preview assessments", () => {
    const definition = validInteractiveDefinition();
    definition.module.publicationStatus = "preview";
    definition.module.status = "approved";
    definition.assessment.prompts = [definition.assessment.prompts[0]];
    definition.assessment.masteryRule.requiredEvidenceCount = 1;
    definition.assessment.masteryRule.requiredKinds = ["misconception"];

    expect(validateImplementedSimulationDefinition(definition)).toEqual([]);
  });

  it("fully validates assessment mastery rules", () => {
    const invalidCount = validInteractiveDefinition();
    invalidCount.assessment.masteryRule.requiredEvidenceCount = 1.5;
    const invalidKinds = validInteractiveDefinition();
    invalidKinds.assessment.masteryRule.requiredKinds = [
      "misconception",
      "misconception",
      "recall" as "transfer",
    ];
    invalidKinds.assessment.masteryRule.allowHintedMastery =
      "yes" as unknown as boolean;

    expect(validateImplementedSimulationDefinition(invalidCount)).toContain(
      "implemented.assessment.masteryRule.requiredEvidenceCount: expected an integer between 1 and 3",
    );
    expect(validateImplementedSimulationDefinition(invalidKinds)).toEqual(
      expect.arrayContaining([
        'implemented.assessment.masteryRule.requiredKinds[1]: duplicate "misconception"',
        'implemented.assessment.masteryRule.requiredKinds[2]: expected "observation", "misconception", or "transfer"',
        "implemented.assessment.masteryRule.allowHintedMastery: expected boolean",
      ]),
    );
  });

  it("rejects mastery kinds absent from the prompt sequence", () => {
    const definition = validInteractiveDefinition();
    definition.module.publicationStatus = "preview";
    definition.module.status = "approved";
    definition.assessment.prompts = [definition.assessment.prompts[0]];
    definition.assessment.masteryRule.requiredEvidenceCount = 1;
    definition.assessment.masteryRule.requiredKinds = ["transfer"];

    expect(validateImplementedSimulationDefinition(definition)).toContain(
      'implemented.assessment.masteryRule.requiredKinds[0]: no "transfer" prompt is available',
    );
  });

  it("returns stable errors for missing implemented objects and arrays", () => {
    const missingObjects = validInteractiveDefinition();
    missingObjects.experience =
      undefined as unknown as ImplementedSimulationDefinition["experience"];
    missingObjects.assessment =
      undefined as unknown as ImplementedSimulationDefinition["assessment"];
    missingObjects.narration =
      undefined as unknown as ImplementedSimulationDefinition["narration"];
    missingObjects.assets =
      undefined as unknown as ImplementedSimulationDefinition["assets"];
    missingObjects.legacyPaths = undefined as unknown as string[];
    missingObjects.contribution =
      undefined as unknown as ImplementedSimulationDefinition["contribution"];

    expect(() =>
      validateImplementedSimulationDefinition(missingObjects),
    ).not.toThrow();
    expect(validateImplementedSimulationDefinition(missingObjects)).toEqual(
      expect.arrayContaining([
        "implemented.experience: required",
        "implemented.assessment: required",
        "implemented.narration: required",
        "implemented.assets: required",
        "implemented.legacyPaths: required",
        "implemented.contribution: required",
      ]),
    );

    expect(
      validateImplementedSimulationDefinition(
        undefined as unknown as ImplementedSimulationDefinition,
      ),
    ).toEqual(["implemented: required"]);
  });

  it("returns stable errors for malformed implemented array entries", () => {
    const definition = validInteractiveDefinition();
    definition.experience.stages[0] =
      undefined as unknown as ImplementedSimulationDefinition["experience"]["stages"][number];
    definition.assessment.prompts[0] =
      undefined as unknown as AssessmentSequence["prompts"][number];
    definition.narration.cues[0] =
      undefined as unknown as SimulationNarrationManifest["cues"][number];
    definition.assets.assets[0] =
      undefined as unknown as AssetManifest["assets"][number];

    expect(() =>
      validateImplementedSimulationDefinition(definition),
    ).not.toThrow();
    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        "implemented.experience.stages[0]: required",
        "implemented.assessment.prompts[0]: required",
        "implemented.narration.cues[0]: required",
        "implemented.assets.assets[0]: required",
      ]),
    );
  });

  it("returns stable errors when assessment and mastery arrays are missing", () => {
    const definition = validInteractiveDefinition();
    definition.assessment.prompts =
      undefined as unknown as AssessmentSequence["prompts"];
    definition.assessment.masteryRule =
      undefined as unknown as AssessmentSequence["masteryRule"];

    expect(() =>
      validateImplementedSimulationDefinition(definition),
    ).not.toThrow();
    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        "implemented.assessment.prompts: required",
        "implemented.assessment.masteryRule: required",
      ]),
    );
  });

  it("builders join malformed nested-object errors instead of throwing TypeError", () => {
    const definition = validInteractiveDefinition();
    definition.module =
      undefined as unknown as ImplementedSimulationDefinition["module"];
    definition.narration =
      undefined as unknown as ImplementedSimulationDefinition["narration"];

    expect(() => defineImplementedSimulation(definition)).toThrow(
      ["implemented.module: required", "implemented.narration: required"].join(
        "\n",
      ),
    );

    const input = validGuidedInput();
    input.module = undefined as unknown as SimulationModuleRecord;
    input.guidance = undefined as unknown as GuidedSimulationDefinition;
    expect(() => defineGuidedImplementedSimulation(input)).toThrow(
      ["guidance: required", "guided.module: required"].join("\n"),
    );
  });

  it("rejects duplicate assessment, asset, alias, and legacy path identifiers", () => {
    const definition = validInteractiveDefinition();
    definition.assessment.prompts[1].id = definition.assessment.prompts[0].id;
    definition.assets.assets.push({ ...definition.assets.assets[0] });
    definition.module.legacyAliases = [
      "old-interactive-class",
      "old-interactive-class",
    ];
    definition.legacyPaths = [
      "/simulations/old-interactive-class",
      "/simulations/old-interactive-class",
    ];

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        'implemented.assessment.prompts[1].id: duplicate "prompt-misconception"',
        'implemented.assets.assets[1].id: duplicate "asset-guided-model"',
        'implemented.module.legacyAliases[1]: duplicate "old-interactive-class"',
        'implemented.legacyPaths[1]: duplicate "/simulations/old-interactive-class"',
      ]),
    );
  });

  it("rejects aliases and legacy paths that collide with the canonical class", () => {
    const definition = validInteractiveDefinition();
    definition.module.legacyAliases = [definition.module.slug];
    definition.legacyPaths = [`/simulations/${definition.module.slug}`];

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        'implemented.module.legacyAliases[0]: collides with canonical slug "interactive-class"',
        'implemented.legacyPaths[0]: collides with canonical path "/simulations/interactive-class"',
      ]),
    );
  });

  it.each([
    ["released", "approved"],
    ["preview", "released"],
    ["retired", "released"],
  ] as const)(
    "rejects contradictory %s publication and %s legacy status",
    (publicationStatus, status) => {
      const definition = validInteractiveDefinition();
      definition.module.publicationStatus = publicationStatus;
      definition.module.status = status;

      expect(validateImplementedSimulationDefinition(definition)).toContain(
        `implemented.module.status: "${status}" contradicts publicationStatus "${publicationStatus}"`,
      );
    },
  );

  it("requires device and classroom acceptance evidence before maturity upgrades", () => {
    const deviceDefinition = validInteractiveDefinition();
    deviceDefinition.module.evidenceMaturity = "deviceVerified";
    const classroomDefinition = validInteractiveDefinition();
    classroomDefinition.module.evidenceMaturity = "classroomVerified";

    expect(validateImplementedSimulationDefinition(deviceDefinition)).toContain(
      "implemented.module.deviceAcceptanceEvidenceId: required for deviceVerified evidence",
    );
    expect(
      validateImplementedSimulationDefinition(classroomDefinition),
    ).toEqual(
      expect.arrayContaining([
        "implemented.module.deviceAcceptanceEvidenceId: required for classroomVerified evidence",
        "implemented.module.classroomAcceptanceEvidenceId: required for classroomVerified evidence",
      ]),
    );
  });

  it("blocks evidence upgrades while asset provenance remains explicitly unverified", () => {
    const definition = validInteractiveDefinition();
    definition.module.evidenceMaturity = "deviceVerified";
    definition.module.deviceAcceptanceEvidenceId = "quest-acceptance-001";

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        "implemented.assets.assets[0].source: unverified provenance blocks deviceVerified evidence",
        "implemented.assets.assets[0].license: unverified provenance blocks deviceVerified evidence",
        "implemented.assets.assets[0].author: unverified provenance blocks deviceVerified evidence",
      ]),
    );
  });

  it("blocks evidence upgrades while asset provenance is missing", () => {
    const definition = validInteractiveDefinition();
    definition.module.evidenceMaturity = "deviceVerified";
    definition.module.deviceAcceptanceEvidenceId = "quest-acceptance-001";
    definition.assets.assets[0].source = " ";

    expect(validateImplementedSimulationDefinition(definition)).toContain(
      "implemented.assets.assets[0].source: missing provenance blocks deviceVerified evidence",
    );
  });

  it("strictly validates every released asset integrity and provenance field", () => {
    const definition = validInteractiveDefinition();
    Object.assign(definition.assets.assets[0], {
      url: undefined,
      source: undefined,
      license: undefined,
      author: undefined,
      width: undefined,
      height: -1,
      compression: undefined,
      sha256: "ABC123",
      byteSize: undefined,
    });

    expect(validateImplementedSimulationDefinition(definition)).toEqual(
      expect.arrayContaining([
        "implemented.assets.assets[0].url: required for released simulations",
        "implemented.assets.assets[0].source: required for released simulations",
        "implemented.assets.assets[0].license: required for released simulations",
        "implemented.assets.assets[0].author: required for released simulations",
        "implemented.assets.assets[0].width: expected a positive integer for released simulations",
        "implemented.assets.assets[0].height: expected a positive integer for released simulations",
        "implemented.assets.assets[0].compression: required for released simulations",
        "implemented.assets.assets[0].sha256: expected lowercase 64-hex SHA-256 for released simulations",
        "implemented.assets.assets[0].byteSize: expected a positive integer for released simulations",
      ]),
    );
  });

  it("throws joined path-qualified errors instead of repairing invalid records", () => {
    const definition = validInteractiveDefinition();
    definition.module.viewerKey = " ";
    definition.assets.assets[0].sha256 = undefined;

    expect(() => defineImplementedSimulation(definition)).toThrow(
      [
        "implemented.module.viewerKey: required",
        "implemented.assets.assets[0].sha256: expected lowercase 64-hex SHA-256 for released simulations",
      ].join("\n"),
    );
    expect(definition.module.viewerKey).toBe(" ");
    expect(definition.assets.assets[0].sha256).toBeUndefined();
  });
});
