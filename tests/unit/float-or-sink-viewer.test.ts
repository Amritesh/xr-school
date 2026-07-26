import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/FloatOrSinkViewer.tsx"),
  "utf8",
);

describe("Class 5 float-or-sink simulation", () => {
  it("provides six unambiguous prediction trials", () => {
    for (const object of [
      "Dry leaf",
      "Stone",
      "Cork",
      "Steel spoon",
      "Closed empty bottle",
      "Glass marble",
    ]) {
      expect(viewer).toContain(object);
    }
    expect(viewer).toContain('outcome: "float"');
    expect(viewer).toContain('outcome: "sink"');
  });

  it("requires a prediction before testing", () => {
    expect(viewer).toContain("Choose FLOAT or SINK first");
    expect(viewer).toContain("predictionRef.current");
    expect(viewer).toContain("testedRef.current");
    expect(viewer).toContain('choosePrediction("float")');
    expect(viewer).toContain('choosePrediction("sink")');
  });

  it("teaches that size alone does not determine the result", () => {
    expect(viewer).toContain("Never decide only from size");
    expect(viewer).toContain("material, shape and trapped air");
    expect(viewer).toContain("upward push from displaced water");
  });

  it("animates floating, sinking, ripples and bubbles", () => {
    expect(viewer).toContain('targetY = TRIALS[index].outcome === "float"');
    expect(viewer).toContain("ripple.scale.setScalar");
    expect(viewer).toContain('TRIALS[trialIndex].outcome === "sink"');
    expect(viewer).toContain("bubble.position.set");
  });

  it("supports full narration and Meta Quest interaction", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
  });

  it("uses the realistic school science lab", () => {
    expect(viewer).toContain("/environments/float-sink-school-lab-360.png");
    expect(viewer).toContain("applyRealisticEnvironment");
  });
});
