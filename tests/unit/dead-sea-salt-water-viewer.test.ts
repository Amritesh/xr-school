import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/DeadSeaSaltWaterViewer.tsx"),
  "utf8",
);

describe("Class 5 Dead Sea salt-water simulation", () => {
  it("covers the complete salt-water investigation", () => {
    for (const stage of [
      "Meet the Dead Sea",
      "Fresh Water and Salt Water",
      "Dissolve the Salt",
      "Egg in Fresh Water",
      "Egg in Salt Water",
      "Why Floating Is Easier",
      "Effects of Very Salty Water",
    ]) {
      expect(viewer).toContain(stage);
    }
  });

  it("correctly connects dissolved salt, density and buoyancy", () => {
    expect(viewer).toContain("Dissolved salt does not vanish");
    expect(viewer).toContain("increasing the solution's density");
    expect(viewer).toContain("stronger upward buoyant force");
    expect(viewer).toContain("Salt does not make an object lighter");
  });

  it("animates the fresh-water and salt-water egg comparison", () => {
    expect(viewer).toContain("freshEgg.position.set");
    expect(viewer).toContain("saltEgg.position.set");
    expect(viewer).toContain("saltGrains.forEach");
    expect(viewer).toContain("ripple.scale.setScalar");
  });

  it("includes ecological nuance and safety guidance", () => {
    expect(viewer).toContain("some microorganisms survive");
    expect(viewer).toContain("must not be drunk");
    expect(viewer).toContain("eyes or open cuts");
    expect(viewer).not.toContain("no life can survive");
  });

  it("supports full narration and Meta Quest interaction", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
  });

  it("uses the realistic Dead Sea shore environment", () => {
    expect(viewer).toContain("/environments/dead-sea-salt-shore-360.png");
    expect(viewer).toContain("applyRealisticEnvironment");
  });
});
