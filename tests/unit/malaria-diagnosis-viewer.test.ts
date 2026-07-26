import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/MalariaDiagnosisViewer.tsx"),
  "utf8",
);

describe("Class 5 malaria diagnosis simulation", () => {
  it("covers the complete professional diagnostic sequence", () => {
    for (const stage of [
      "Symptoms Are Clues",
      "History and Mosquito Link",
      "Professional Blood Collection",
      "Thick and Thin Blood Films",
      "Stain and Focus",
      "Find the Parasites",
      "Rapid Diagnostic Test",
      "Act on a Confirmed Result",
    ]) {
      expect(viewer).toContain(stage);
    }
  });

  it("does not diagnose malaria from symptoms alone", () => {
    expect(viewer).toContain("Symptoms alone cannot confirm malaria");
    expect(viewer).toContain("laboratory evidence is still required");
    expect(viewer).toContain("parasite-based testing");
  });

  it("correctly distinguishes thick and thin blood films", () => {
    expect(viewer).toContain("The thick film concentrates parasites");
    expect(viewer).toContain("The thin film keeps red blood cells visible");
    expect(viewer).toContain("Giemsa stain");
  });

  it("includes an interactive parasite scan and RDT result", () => {
    expect(viewer).toContain("parasitesFoundRef.current");
    expect(viewer).toContain("parasiteRings.forEach");
    expect(viewer).toContain("controlLine.visible");
    expect(viewer).toContain("testLine.visible");
  });

  it("models a recognisable female Anopheles mosquito", () => {
    expect(viewer).toContain("Realistic female Anopheles mosquito");
    expect(viewer).toContain("compoundEye");
    expect(viewer).toContain("longProboscis");
    expect(viewer).toContain("segmentedLeg");
    expect(viewer).toContain("wingVein");
    expect(viewer).toContain("Math.sin(elapsed * 46)");
  });

  it("includes blood safety and medical-care safeguards", () => {
    expect(viewer).toContain("Learners should never collect or handle blood themselves");
    expect(viewer).toContain("Do not self-diagnose or self-medicate");
    expect(viewer).toContain("prompt professional care");
  });

  it("supports narration, Quest interaction and the realistic clinic laboratory", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
    expect(viewer).toContain("/environments/malaria-diagnosis-lab-360.png");
    expect(viewer).toContain("applyRealisticEnvironment");
  });
});
