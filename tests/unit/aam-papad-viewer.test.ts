import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(resolve(process.cwd(), "apps/web/components/simulations/AamPapadViewer.tsx"), "utf8");

describe("Class 5 aam papad simulation", () => {
  it("covers the complete mamidi tandra process", () => {
    for (const stage of ["Prepare the Sunny Platform", "Choose Ripe Mangoes", "Extract and Strain the Pulp", "Mix Sugar and Jaggery", "Spread a Thin Layer", "Sun-dry and Add Layers", "Peel, Cut and Store"]) expect(viewer).toContain(stage);
  });

  it("matches the chapter's layered drying method", () => {
    expect(viewer).toContain("repeat this process each day for about four weeks");
    expect(viewer).toContain("mamidi tandra");
    expect(viewer).toContain("Removing moisture lets us enjoy mango after its season");
  });

  it("includes food-hygiene and preservation learning", () => {
    expect(viewer).toContain("Wash the fruit, your hands and all utensils");
    expect(viewer).toContain("thin layer dries more evenly");
    expect(viewer).toContain("clean, dry container");
  });

  it("supports narration and Quest controls", () => {
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("playNarration");
    expect(viewer).toMatch(/controller\.addEventListener\(["']selectstart["']/);
  });
});
