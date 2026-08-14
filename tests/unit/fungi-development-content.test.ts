import { describe, expect, it } from "vitest";
import { validateImplementedSimulationDefinition } from "../../packages/simulation-schema/src/index";
import {
  FUNGI_DEVELOPMENT,
  FUNGI_DEVELOPMENT_EXPERIENCE,
  FUNGI_DEVELOPMENT_NARRATION,
} from "../../packages/simulation-content/src/index";

const STAGE_IDS = [
  "fungal-forensics",
  "under-the-cap",
  "spore-flight",
  "five-day-time-lens",
  "fungi-at-work",
  "food-safety-scan",
  "forest-circle",
] as const;

describe("canonical fungi development content", () => {
  it("publishes the exact identity and honest release metadata", () => {
    expect(FUNGI_DEVELOPMENT.module).toMatchObject({
      id: "sim-c08-ch02-a03-fungi-and-its-development",
      slug: "c8-ch02-a03-fungi-and-its-development",
      viewerKey: "fungi-development",
      title: expect.stringMatching(
        /Living Mycelium Lab|Fungi and Its Development/i,
      ),
      publicationStatus: "released",
      status: "released",
      releaseMaturity: "internalQA",
      evidenceMaturity: "internalQA",
      simulationFormat: "immersiveVr",
      gradeBands: ["class6To8"],
      subjects: ["biology", "science"],
      applicableBoards: ["cbse"],
      expectedDurationMinutes: 9,
      maxSessionDurationMinutes: 10,
      stages: 7,
      comfortRiskLevel: "low",
      targetFrameRateFps: 72,
    });
    expect(FUNGI_DEVELOPMENT.module.estimatedPackageSizeMb).toBeGreaterThan(0);
    expect(FUNGI_DEVELOPMENT.module.safetyNotes.join(" ")).toMatch(
      /stationary/i,
    );
    expect(FUNGI_DEVELOPMENT.module.safetyNotes.join(" ")).toMatch(
      /never.*taste|never.*open.*mould/i,
    );
    expect(FUNGI_DEVELOPMENT.module.xrFitJustification).toMatch(
      /scale|inside|time|invisible|spatial/i,
    );
    expect(FUNGI_DEVELOPMENT.module.learningObjective).toMatch(
      /identify|sequence|explain/i,
    );
    expect(
      FUNGI_DEVELOPMENT.module.misconceptionsAddressed.length,
    ).toBeGreaterThanOrEqual(3);
    expect(FUNGI_DEVELOPMENT.module.visualizationStrategy).toMatch(
      /hyphae|mycelium/i,
    );
    expect(FUNGI_DEVELOPMENT.module.interactionStrategy).toMatch(
      /classify|guide|sequence/i,
    );
    expect(FUNGI_DEVELOPMENT.module.imaginationHelperStrategy).toMatch(
      /scale|time/i,
    );
    expect(FUNGI_DEVELOPMENT.module.practicalUseCase).toMatch(
      /food|medicine|forest/i,
    );
    expect(FUNGI_DEVELOPMENT.module.batchActivityPrompt).toMatch(
      /group|batch|headset/i,
    );
    expect(FUNGI_DEVELOPMENT.module.instructorScript).toMatch(
      /Introduction:.*Procedure:.*Observation:.*Assessment:.*Conclusion:/s,
    );
    expect(FUNGI_DEVELOPMENT.contribution).toEqual({
      source: "user-story",
      integration: "new-class",
    });
    expect(FUNGI_DEVELOPMENT.contribution).not.toHaveProperty("contributor");
    expect(FUNGI_DEVELOPMENT.contribution).not.toHaveProperty("sourcePath");
    expect(validateImplementedSimulationDefinition(FUNGI_DEVELOPMENT)).toEqual(
      [],
    );
  });

  it("exports seven authored-action stages in the supplied order", () => {
    expect(FUNGI_DEVELOPMENT.experience).toBe(FUNGI_DEVELOPMENT_EXPERIENCE);
    expect(
      FUNGI_DEVELOPMENT_EXPERIENCE.stages.map((stage) => stage.id),
    ).toEqual(STAGE_IDS);
    for (const stage of FUNGI_DEVELOPMENT_EXPERIENCE.stages) {
      expect(stage.requiredActionIds).toHaveLength(1);
      expect(stage.requiredActionIds[0]).not.toMatch(/^next$|continue/i);
      expect(stage.completionEvidenceIds).toHaveLength(1);
    }
  });

  it("provides one stable en-IN captioned narration cue per stage without invented audio", () => {
    expect(FUNGI_DEVELOPMENT_NARRATION).toMatchObject({
      locale: "en-IN",
      speaker: expect.any(String),
      fallback: "browserTts",
    });
    expect(FUNGI_DEVELOPMENT_NARRATION.cues.map((cue) => cue.stageId)).toEqual(
      STAGE_IDS,
    );
    expect(FUNGI_DEVELOPMENT_NARRATION.cues).toHaveLength(7);
    expect(
      FUNGI_DEVELOPMENT_NARRATION.cues.every((cue) => cue.caption === cue.text),
    ).toBe(true);
    expect(
      FUNGI_DEVELOPMENT_NARRATION.cues.every((cue) => !("audioUrl" in cue)),
    ).toBe(true);
    expect(
      FUNGI_DEVELOPMENT_NARRATION.cues.map((cue) => cue.text).join(" "),
    ).toMatch(
      /not plants.*absorb.*hyphae.*mycelium.*spores.*warm.*moist.*five.*yeast.*medicine.*decompos.*mould.*never.*forest/is,
    );

    const captionByStage = Object.fromEntries(
      FUNGI_DEVELOPMENT_NARRATION.cues.map((cue) => [cue.stageId, cue.caption]),
    );
    expect(captionByStage["fungal-forensics"]).toMatch(/not plants.*absorb/is);
    expect(captionByStage["under-the-cap"]).toMatch(/hyphae.*mycelium/is);
    expect(captionByStage["spore-flight"]).toMatch(/spores.*warm.*moist/is);
    expect(captionByStage["five-day-time-lens"]).toMatch(
      /five.*spore.*hypha.*mycelium.*release/is,
    );
    expect(captionByStage["fungi-at-work"]).toMatch(
      /yeast.*medicine.*decompos/is,
    );
    expect(captionByStage["food-safety-scan"]).toMatch(
      /harmful.*mould.*never/is,
    );
    expect(captionByStage["forest-circle"]).toMatch(
      /conclusion.*forest.*nutrient/is,
    );
  });

  it("covers prediction, observation, misconception, and independent transfer for mastery", () => {
    const { prompts, masteryRule } = FUNGI_DEVELOPMENT.assessment;
    expect(prompts.map((prompt) => prompt.kind)).toEqual(
      expect.arrayContaining([
        "prediction",
        "observation",
        "misconception",
        "transfer",
      ]),
    );
    expect(prompts[0]).toMatchObject({
      kind: "prediction",
      stageId: "fungal-forensics",
      question: expect.stringMatching(/which two.*fungi/i),
    });
    const allText = prompts
      .flatMap((prompt) => [
        prompt.question,
        prompt.hint,
        prompt.explanation,
        ...(prompt.options ?? []).map((option) => option.label),
      ])
      .join(" ");
    expect(allText).toMatch(/mushroom/i);
    expect(allText).toMatch(/bread mould/i);
    expect(allText).toMatch(/mycelium/i);
    expect(allText).toMatch(/warm.*moist/i);
    expect(allText).toMatch(/baking.*yeast|yeast.*baking/i);
    expect(allText).toMatch(/cutting off.*mould|visible mould patch/i);
    expect(allText).toMatch(/hidden hyphae.*beyond.*visible/i);
    expect(allText).toMatch(/sports bag|equipment bag|cloth surface/i);
    expect(
      prompts.every((prompt) => prompt.retryPolicy === "immediateWithHint"),
    ).toBe(true);
    expect(
      prompts.every((prompt) =>
        /evidence|observe|look|return|compare/i.test(prompt.hint),
      ),
    ).toBe(true);
    expect(masteryRule).toEqual({
      requiredEvidenceCount: 3,
      requiredKinds: ["observation", "misconception", "transfer"],
      allowHintedMastery: false,
    });
  });

  it("declares no remote or unverifiable runtime assets", () => {
    expect(FUNGI_DEVELOPMENT.assets.assets).toEqual([]);
  });

  it("uses an unfamiliar condition scenario for independent transfer without stating the answer", () => {
    const prompt = FUNGI_DEVELOPMENT.assessment.prompts.find(
      ({ id }) => id === "forest-transfer",
    );

    expect(prompt).toMatchObject({
      kind: "transfer",
      question: expect.stringMatching(/sports bag|equipment bag|cloth surface/i),
      acceptedEvidenceIds: ["warm-damp-surface"],
    });
    expect(prompt?.question).not.toMatch(/warm.*moist.*best|correct answer/i);
    expect(prompt?.explanation).toMatch(/warm.*moist.*growth/i);
  });

  it("directly challenges cutting visible mould from soft food", () => {
    const prompt = FUNGI_DEVELOPMENT.assessment.prompts.find(
      ({ id }) => id === "mould-safety-misconception",
    );

    expect(prompt).toMatchObject({
      kind: "misconception",
      question: expect.stringMatching(/cutting off.*visible mould.*safe/i),
      acceptedEvidenceIds: ["reject-whole-soft-food"],
    });
    expect(prompt?.explanation).toMatch(/hidden hyphae.*beyond.*visible patch/i);
  });
});
