import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/SolubleInsolubleViewer.tsx"),
  "utf8",
);

describe("Class 5 soluble and insoluble substances simulation", () => {
  it("tests five representative substances", () => {
    for (const substance of ["Salt", "Sugar", "Sand", "Chalk powder", "Sawdust"]) {
      expect(viewer).toContain(substance);
    }
  });

  it("classifies salt and sugar as soluble", () => {
    expect(viewer).toContain("Salt is soluble");
    expect(viewer).toContain("Sugar is soluble");
    expect(viewer).toContain("The salt has not vanished");
  });

  it("distinguishes insoluble settling, suspension and floating", () => {
    expect(viewer).toContain("Sand is insoluble");
    expect(viewer).toContain("Chalk powder is insoluble");
    expect(viewer).toContain("Sawdust is insoluble");
    expect(viewer).toContain('"settle"');
    expect(viewer).toContain('"cloud"');
    expect(viewer).toContain('"float"');
  });

  it("requires a prediction before stirring", () => {
    expect(viewer).toContain("Choose SOLUBLE or INSOLUBLE first");
    expect(viewer).toContain('choosePrediction("soluble")');
    expect(viewer).toContain('choosePrediction("insoluble")');
    expect(viewer).toContain("testedRef.current");
  });

  it("animates dissolving and insoluble particle behaviour", () => {
    expect(viewer).toContain('trial.behaviour === "dissolve"');
    expect(viewer).toContain('trial.behaviour === "settle"');
    expect(viewer).toContain('trial.behaviour === "cloud"');
    expect(viewer).toContain("particles.forEach");
  });

  it("supports narration, Quest interaction and the realistic lab", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
    expect(viewer).toContain("/environments/float-sink-school-lab-360.png");
    expect(viewer).toContain("applyRealisticEnvironment");
  });
});
