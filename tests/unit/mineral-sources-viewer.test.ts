import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/MineralSourcesViewer.tsx",
  ),
  "utf8",
);

describe("Class 6 mineral sources simulation", () => {
  it("covers the three NCERT mineral cases", () => {
    for (const mineral of ["Calcium", "Iodine", "Iron"]) {
      expect(viewer).toContain(`id: "${mineral}"`);
    }
  });

  it("includes representative food sources", () => {
    for (const source of [
      "Milk and curd",
      "Iodized salt",
      "Green leafy vegetables",
    ]) {
      expect(viewer).toContain(source);
    }
  });

  it("matches a source and body function before completing a case", () => {
    expect(viewer).toContain("sourceCorrect && bodyFunctionCorrect");
    expect(viewer).toContain("Strong bones and teeth");
    expect(viewer).toContain("Healthy thyroid and growth");
    expect(viewer).toContain("Healthy red blood cells");
    expect(viewer).toContain("3 mineral cases completed");
  });

  it("supports narration and Quest controller interaction", () => {
    expect(viewer).toMatch(/isSessionSupported\?\.\(["']immersive-vr["']\)/);
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toMatch(
      /controller\.addEventListener\(\s*["']selectstart["']/,
    );
    expect(viewer).toContain("playNarration");
  });
});
