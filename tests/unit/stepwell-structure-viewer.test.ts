import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/StepwellStructureViewer.tsx"),
  "utf8",
);

describe("Class 5 stepwell structure simulation", () => {
  it("covers the connected parts of a stepwell", () => {
    for (const stage of [
      "Meet the Stepwell",
      "Steps to the Water",
      "Landings, Pillars and Shade",
      "How Water Enters",
      "Changing Water Level",
      "A Shared Water Place",
    ]) {
      expect(viewer).toContain(stage);
    }
  });

  it("explains access at changing water levels", () => {
    expect(viewer).toContain("level rises after rain or falls during dry months");
    expect(viewer).toContain("descending steps keep lower levels accessible");
    expect(viewer).toContain("rainfall, use and groundwater conditions");
  });

  it("shows runoff, groundwater and water-level animation", () => {
    expect(viewer).toContain("surface runoff");
    expect(viewer).toContain("also reach groundwater");
    expect(viewer).toContain("rain.forEach");
    expect(viewer).toContain("targetHeight");
  });

  it("supports full narration and Quest interaction", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
  });

  it("uses an authentic stepwell panorama", () => {
    expect(viewer).toContain("/environments/stepwell-courtyard-360.png");
    expect(viewer).toContain("applyRealisticEnvironment");
  });
});
