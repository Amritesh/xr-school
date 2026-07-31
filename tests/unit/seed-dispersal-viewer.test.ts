import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/SeedDispersalViewer.tsx"),
  "utf8",
);

describe("Class 5 seed dispersal simulation", () => {
  it("covers the major methods of seed dispersal", () => {
    for (const stage of [
      "Why Seeds Travel",
      "Carried by Wind",
      "Carried by Water",
      "Hitchhiking on Animals",
      "Seeds Inside Fruits",
      "Explosive Dispersal",
    ]) {
      expect(viewer).toContain(stage);
    }
  });

  it("connects seed adaptations to each journey", () => {
    expect(viewer).toContain("hair-like tufts");
    expect(viewer).toContain("fibrous husk containing air spaces");
    expect(viewer).toContain("Hooks and spines");
    expect(viewer).toContain("walls spring apart");
  });

  it("provides animated, staged interaction", () => {
    expect(viewer).toContain("windSeeds.forEach");
    expect(viewer).toContain("Float the coconut");
    expect(viewer).toContain("Attach the burr");
    expect(viewer).toContain("burstSeeds.forEach");
    expect(viewer).toContain("goToStage(stageRef.current + 1)");
  });

  it("supports full narration and Quest interaction", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
  });

  it("uses the realistic seed-dispersal habitat", () => {
    expect(viewer).toContain("/environments/seed-dispersal-habitat-360.png");
    expect(viewer).toContain("applyRealisticEnvironment");
  });
});
