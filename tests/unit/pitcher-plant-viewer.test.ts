import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(resolve(process.cwd(), "apps/web/components/simulations/PitcherPlantViewer.tsx"), "utf8");

describe("Pitcher plant insect-hunter simulation", () => {
  it("shows the complete trapping sequence", () => {
    for (const stage of ["A Modified Leaf", "Nectar Attracts", "Slippery Rim", "Digestive Fluid", "Nutrients Absorbed", "Plant, Not Animal"]) expect(viewer).toContain(stage);
  });

  it("correctly explains the plant's nutrient strategy", () => {
    expect(viewer).toContain("nutrient poor soil");
    expect(viewer).toContain("nitrogen compounds");
    expect(viewer).toContain("still photosynthesises");
    expect(viewer).toContain("Insects supply minerals");
  });

  it("avoids the misconception that the pitcher is a mouth", () => {
    expect(viewer).toContain("modified leaf—not a flower and not a mouth");
    expect(viewer).toContain("does not chase");
  });

  it("supports narration and Quest controls", () => {
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("questVr.update()");
    expect(viewer).toContain("unlockNarration()");
    expect(viewer).toContain("window.setTimeout(() => speakText");
  });

  it("uses stage-specific story visuals", () => {
    for (const visual of ["nutrient-poor-bog-habitat", "trapHairs", "nectarDrops", "digestiveBubbles", "glowingRoots", "photosynthesis-sunlight-rays", "sugarParticles"]) expect(viewer).toContain(visual);
  });

  it("uses a realistic tropical bog environment", () => {
    expect(viewer).toContain("pitcher-plant-bog-360.png");
    expect(viewer).toContain("EquirectangularReflectionMapping");
    expect(existsSync(resolve(process.cwd(), "apps/web/public/environments/pitcher-plant-bog-360.png"))).toBe(true);
  });
});
