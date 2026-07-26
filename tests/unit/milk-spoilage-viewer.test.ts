import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(resolve(process.cwd(), "apps/web/components/simulations/MilkSpoilageViewer.tsx"), "utf8");

describe("Milk-spoilage simulation", () => {
  it("compares three storage conditions over 24 hours", () => {
    for (const condition of ["Uncovered • Room temperature", "Boiled + covered", "Covered + refrigerated"]) expect(viewer).toContain(condition);
    for (const time of ["Hour 0", "After 6 Hours", "After 12 Hours", "After 24 Hours"]) expect(viewer).toContain(time);
  });
  it("teaches spoilage signs and their cause", () => {
    expect(viewer).toContain("smells sour");
    expect(viewer).toContain("forming small clumps");
    expect(viewer).toContain("curds and separate from watery whey");
    expect(viewer).toContain("microorganisms multiply");
  });
  it("distinguishes spoilage from controlled fermentation", () => {
    expect(viewer).toContain("controlled curd-making");
    expect(viewer).toContain("Never use spoiled milk to make food");
  });
  it("supports narration and Quest controls", () => {
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("questVr.update()");
  });
});
