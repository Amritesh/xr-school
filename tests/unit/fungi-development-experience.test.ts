import { describe, expect, it } from "vitest";
import {
  FUNGI_DEVELOPMENT,
  FUNGI_DEVELOPMENT_EXPERIENCE,
} from "../../packages/simulation-content/src/index";
import {
  createAssessmentSession,
  createLessonSession,
  initialFungiDevelopmentState,
  reduceFungiDevelopment,
} from "../../packages/simulation-runtime/src/index";
import type {
  FungalGrowthConditionChoice,
} from "../../packages/simulation-runtime/src/index";

function completeLesson() {
  const session = createLessonSession(FUNGI_DEVELOPMENT_EXPERIENCE);
  for (const [index, stage] of FUNGI_DEVELOPMENT_EXPERIENCE.stages.entries()) {
    session.performAction(stage.requiredActionIds[0]);
    session.recordEvidence(stage.completionEvidenceIds[0]);
    if (index < FUNGI_DEVELOPMENT_EXPERIENCE.stages.length - 1) session.next();
  }
  return session;
}

describe("fungi development lesson experience", () => {
  it("requires both the authored action and observable evidence before advancing", () => {
    const session = createLessonSession(FUNGI_DEVELOPMENT_EXPERIENCE);
    const first = FUNGI_DEVELOPMENT_EXPERIENCE.stages[0];

    expect(() => session.next()).toThrow(/complete stage fungal-forensics/i);
    expect(
      session.performAction(first.requiredActionIds[0]).stageComplete,
    ).toBe(false);
    expect(() => session.next()).toThrow(/complete stage fungal-forensics/i);
    expect(
      session.recordEvidence(first.completionEvidenceIds[0]).stageComplete,
    ).toBe(true);
    expect(session.next().stageId).toBe("under-the-cap");
  });

  it("rejects generic skipping and evidence from another stage", () => {
    const session = createLessonSession(FUNGI_DEVELOPMENT_EXPERIENCE);

    expect(() => session.performAction("next")).toThrow(/not permitted/i);
    expect(() => session.performAction("skip-stage")).toThrow(/not permitted/i);
    expect(() => session.recordEvidence("mycelium-identified")).toThrow(
      /does not belong/i,
    );
    expect(session.snapshot()).toMatchObject({
      stageId: "fungal-forensics",
      performedActionIds: [],
      recordedEvidenceIds: [],
      stageComplete: false,
      lessonComplete: false,
    });
  });

  it("does not award mastery for lesson completion alone", () => {
    const lesson = completeLesson();
    const assessment = createAssessmentSession(FUNGI_DEVELOPMENT.assessment);

    expect(lesson.snapshot().lessonComplete).toBe(true);
    expect(assessment.mastery()).toMatchObject({
      mastered: false,
      evidenceCount: 0,
      missingKinds: ["observation", "misconception", "transfer"],
    });
  });

  it("awards mastery only after observation, misconception, and final transfer evidence", () => {
    const assessment = createAssessmentSession(FUNGI_DEVELOPMENT.assessment);

    assessment.answer("mycelium-observation", "mycelium");
    assessment.answer(
      "mould-safety-misconception",
      "reject-whole-soft-food",
    );
    expect(assessment.mastery()).toMatchObject({
      mastered: false,
      missingKinds: ["transfer"],
    });

    expect(
      assessment.answer("forest-transfer", "warm-damp-surface"),
    ).toMatchObject({ correct: true });
    expect(assessment.mastery()).toMatchObject({
      mastered: true,
      evidenceCount: 3,
      eligibleEvidenceCount: 3,
      missingKinds: [],
    });
  });

  it("allows a supported misconception retry to contribute to mastery while transfer stays independent", () => {
    const assessment = createAssessmentSession(FUNGI_DEVELOPMENT.assessment);

    assessment.answer("mycelium-observation", "mycelium");
    expect(
      assessment.answer(
        "mould-safety-misconception",
        "cutting-makes-safe",
      ),
    ).toMatchObject({ correct: false });
    expect(
      assessment.answer(
        "mould-safety-misconception",
        "reject-whole-soft-food",
      ),
    ).toMatchObject({ correct: true, attempts: 2 });
    expect(assessment.evidence()).toContainEqual(
      expect.objectContaining({
        promptId: "mould-safety-misconception",
        kind: "misconception",
        hinted: true,
      }),
    );
    expect(assessment.mastery()).toMatchObject({
      mastered: false,
      missingKinds: ["transfer"],
    });

    expect(
      assessment.answer("forest-transfer", "warm-damp-surface"),
    ).toMatchObject({ correct: true, attempts: 1 });
    expect(assessment.evidence()).toContainEqual(
      expect.objectContaining({
        promptId: "forest-transfer",
        kind: "transfer",
        hinted: false,
      }),
    );
    expect(assessment.mastery()).toMatchObject({
      mastered: true,
      evidenceCount: 3,
      eligibleEvidenceCount: 3,
      missingKinds: [],
    });
  });

  it("preserves the first dry-cold growth prediction after a warm-moist retry", () => {
    const dryPrediction = reduceFungiDevelopment(
      initialFungiDevelopmentState,
      { type: "choose-growth-condition", condition: "dry-cold" },
    );
    const correctedPrediction = reduceFungiDevelopment(dryPrediction, {
      type: "choose-growth-condition",
      condition: "warm-moist",
    });

    expect(correctedPrediction).toMatchObject({
      firstGrowthPrediction: "dry-cold",
      latestGrowthPrediction: "warm-moist",
    });
  });

  it("shares exact canonical growth-condition option IDs with the reducer", () => {
    const prompt = FUNGI_DEVELOPMENT.assessment.prompts.find(
      ({ id }) => id === "growth-condition-prediction",
    );
    const optionIds = prompt?.options?.map(({ id }) => id) ?? [];

    expect(optionIds).toEqual(["warm-moist", "dry-cold", "hot-dry"]);
    for (const condition of optionIds) {
      const state = reduceFungiDevelopment(initialFungiDevelopmentState, {
        type: "choose-growth-condition",
        condition: condition as FungalGrowthConditionChoice,
      });
      expect(state.latestGrowthPrediction).toBe(condition);
    }
  });

  it("rejects the cut-off-mould claim and resolves it with hidden-hyphae evidence", () => {
    const assessment = createAssessmentSession(FUNGI_DEVELOPMENT.assessment);

    expect(
      assessment.answer(
        "mould-safety-misconception",
        "cutting-makes-safe",
      ),
    ).toMatchObject({
      correct: false,
      hint: expect.stringMatching(/hidden.*hyphae|beyond.*visible/i),
    });
    expect(
      assessment.answer(
        "mould-safety-misconception",
        "reject-whole-soft-food",
      ),
    ).toMatchObject({ correct: true, attempts: 2 });
  });

  it("accepts warm and damp surface reasoning as independent transfer evidence", () => {
    const assessment = createAssessmentSession(FUNGI_DEVELOPMENT.assessment);

    expect(
      assessment.answer("forest-transfer", "warm-damp-surface"),
    ).toMatchObject({ correct: true });
    expect(assessment.evidence()).toContainEqual(
      expect.objectContaining({
        promptId: "forest-transfer",
        kind: "transfer",
        evidenceId: "warm-damp-surface",
        hinted: false,
      }),
    );
  });
});
