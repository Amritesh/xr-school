import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/CottonFarmingViewer.tsx",
  ),
  "utf8",
);

describe("Class 6 cotton farming simulation", () => {
  it("covers the field-to-harvest sequence", () => {
    for (const stage of [
      "Prepare Black Soil",
      "Sow Cotton Seeds",
      "Give Water and Warmth",
      "Watch Flowers Form Bolls",
      "Let the Bolls Mature",
      "Pick the Cotton",
    ]) {
      expect(viewer).toContain(stage);
    }
  });

  it("teaches the key cotton-fibre facts", () => {
    expect(viewer).toContain("Cotton is a plant fibre");
    expect(viewer).toContain("fruits called cotton bolls");
    expect(viewer).toContain("fibres are separated from seeds");
  });

  it("advances one farming task at a time", () => {
    expect(viewer).toContain("goToStage(stageRef.current + 1)");
    expect(viewer).toContain("6 field tasks completed");
    expect(viewer).toContain("Cotton harvested • Ready for ginning");
  });

  it("supports narration and Quest controller interaction", () => {
    expect(viewer).toMatch(/isSessionSupported\?\.\(["']immersive-vr["']\)/);
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toMatch(
      /controller\.addEventListener\(["']selectstart["']/,
    );
    expect(viewer).toContain("playNarration");
  });
});
