import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(resolve(process.cwd(), "apps/web/components/simulations/FoodSpoilageViewer.tsx"), "utf8");

describe("Mangoes Round the Year food-spoilage simulation", () => {
  it("compares four controlled storage conditions over time", () => {
    for (const condition of ["Open • Room temperature", "Covered • Room temperature", "Refrigerated", "Mixed with salt"]) expect(viewer).toContain(condition);
    for (const day of ["Day 0", "Day 1", "Day 3", "Day 5"]) expect(viewer).toContain(day);
  });

  it("teaches visible spoilage signs and safe observation", () => {
    expect(viewer).toContain("changed colour");
    expect(viewer).toContain("slimy texture");
    expect(viewer).toContain("mould growth");
    expect(viewer).toContain("do not taste it");
  });

  it("explains that storage methods slow rather than reverse spoilage", () => {
    expect(viewer).toContain("Cooling, covering and preserving");
    expect(viewer).toContain("do not make already spoiled food safe");
  });

  it("supports narration and Quest controls", () => {
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("questVr.update()");
  });
});
