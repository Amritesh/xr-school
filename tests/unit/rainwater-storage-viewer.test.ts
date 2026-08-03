import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/RainwaterStorageViewer.tsx",
  ),
  "utf8",
);

describe("Class 5 Lost Raindrops VR adventure", () => {
  it("covers the complete Sundargram story journey", () => {
    for (const stage of [
      "Welcome to Sundargram",
      "The Beautiful Rainy Day",
      "Journey into the Future",
      "Rainwater Guardian Map",
      "Mission 1: Rooftop Collector",
      "Mission 2: Save School Rain",
      "Mission 3: Recharge Groundwater",
      "The Heavy Rain Challenge",
      "The Return of Summer",
      "The Final Choice",
      "Rainwater Guardian Celebration",
    ]) {
      expect(viewer).toContain(stage);
    }
  });

  it("uses distinct realistic environments for rain, drought and recovery", () => {
    expect(viewer).toContain(
      "/environments/rainwater-sundargram-monsoon-360.png",
    );
    expect(viewer).toContain(
      "/environments/rainwater-sundargram-drought-360.png",
    );
    expect(viewer).toContain(
      "/environments/rainwater-sundargram-restored-360.png",
    );
    expect(viewer).toContain("applyRealisticEnvironment");
  });

  it("turns the lesson into controller-selectable Guardian missions", () => {
    expect(viewer).toContain("registerHotspot");
    expect(viewer).toContain("stageInteractables");
    expect(viewer).toMatch(
      /intersectObjects\(\s*\[\.\.\.buttonInteractables, \.\.\.stageInteractables\],\s*true,?\s*\)/,
    );
    expect(viewer).toContain("Point and select the glowing model");
    expect(viewer).toContain("PRESS A AGAIN TO CONTINUE");
  });

  it("requires completing each discovery before continuing", () => {
    expect(viewer).toContain("completedStagesRef");
    expect(viewer).toContain(
      "if (completedStagesRef.current.has(currentStage))",
    );
    expect(viewer).toContain(
      "disabled={!currentComplete || stage === STAGES.length - 1}",
    );
  });

  it("animates rain, rooftop collection, tank filling and groundwater recharge", () => {
    expect(viewer).toContain("rain.forEach");
    expect(viewer).toContain("flowDrops.forEach");
    expect(viewer).toContain("house-tank-water");
    expect(viewer).toContain("rising-groundwater");
    expect(viewer).toContain("Heavy rain routing challenge");
  });

  it("tracks the ten-thousand-litre target across the story", () => {
    expect(viewer).toContain("saved: 2500");
    expect(viewer).toContain("saved: 5000");
    expect(viewer).toContain("saved: 6500");
    expect(viewer).toContain("saved: 10000");
    expect(viewer).toContain("waterSaved.toLocaleString");
  });

  it("teaches filtration, safe storage and groundwater recharge accurately", () => {
    expect(viewer).toContain("stones, sand and charcoal");
    expect(viewer).toContain(
      "Drinking water still requires proper treatment and testing",
    );
    expect(viewer).toContain(
      "large stones at the bottom, small stones above them and sand on top",
    );
    expect(viewer).toContain("helping the groundwater level rise");
  });

  it("supports complete narration, movement and Quest exit controls", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toMatch(/B or\s+right grip exits VR/);
    expect(viewer).toContain("joysticks walk and turn");
  });
});
