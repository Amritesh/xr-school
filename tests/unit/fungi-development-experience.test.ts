import { describe, expect, it } from "vitest";
import { FUNGI_DEVELOPMENT_EXPERIENCE } from "../../packages/simulation-content/src/index";
import { createLessonSession } from "../../packages/simulation-runtime/src/index";

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

  it("can complete all seven stages while completion remains distinct from mastery", () => {
    const session = createLessonSession(FUNGI_DEVELOPMENT_EXPERIENCE);
    for (const [
      index,
      stage,
    ] of FUNGI_DEVELOPMENT_EXPERIENCE.stages.entries()) {
      session.performAction(stage.requiredActionIds[0]);
      const snapshot = session.recordEvidence(stage.completionEvidenceIds[0]);
      if (index < FUNGI_DEVELOPMENT_EXPERIENCE.stages.length - 1)
        session.next();
      else expect(snapshot.lessonComplete).toBe(true);
    }

    expect(session.snapshot().lessonComplete).toBe(true);
    expect(session.snapshot()).not.toHaveProperty("mastery");
  });
});
