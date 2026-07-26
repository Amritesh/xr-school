import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/RainwaterStorageViewer.tsx"),
  "utf8",
);

describe("Class 5 rainwater storage simulation", () => {
  it("covers the complete rainwater-harvesting path", () => {
    for (const stage of [
      "Save the Rain",
      "The Roof Catchment",
      "Gutter and Downpipe",
      "Discard the First Dirty Flow",
      "Filter the Water",
      "Store and Reuse",
    ]) {
      expect(viewer).toContain(stage);
    }
  });

  it("teaches first flush, filtration and covered storage", () => {
    expect(viewer).toContain("first-flush arrangement");
    expect(viewer).toContain("clean gravel and sand");
    expect(viewer).toContain("covered tank reduces contamination and mosquito breeding");
  });

  it("does not present filtered rainwater as automatically drinkable", () => {
    expect(viewer).toContain("does not automatically make it safe to drink");
    expect(viewer).toContain("drinking requires appropriate treatment and testing");
  });

  it("animates rainfall, flow and tank filling", () => {
    expect(viewer).toContain("rain.forEach");
    expect(viewer).toContain("flowDrops.forEach");
    expect(viewer).toContain("tankWaterRef.current.scale.y");
  });

  it("supports full narration and Quest interaction", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
  });

  it("uses the realistic rainwater-storage courtyard", () => {
    expect(viewer).toContain("/environments/rainwater-storage-courtyard-360.png");
    expect(viewer).toContain("applyRealisticEnvironment");
  });
});
