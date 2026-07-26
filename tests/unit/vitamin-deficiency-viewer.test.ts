import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/VitaminDeficiencyViewer.tsx",
  ),
  "utf8",
);

describe("Class 6 vitamin sources and deficiencies simulation", () => {
  it("covers the four NCERT vitamin cases", () => {
    expect(viewer).toMatch(/id:\s*["']A["']/);
    expect(viewer).toMatch(/id:\s*["']B1["']/);
    expect(viewer).toMatch(/id:\s*["']C["']/);
    expect(viewer).toMatch(/id:\s*["']D["']/);
  });

  it("matches vitamins to characteristic deficiency conditions", () => {
    expect(viewer).toContain('deficiency: "Night blindness"');
    expect(viewer).toContain('deficiency: "Beriberi"');
    expect(viewer).toContain('deficiency: "Scurvy"');
    expect(viewer).toContain('deficiency: "Rickets"');
  });

  it("includes representative food and natural sources", () => {
    for (const source of ["Carrot", "Whole grains", "Orange", "Sunlight"]) {
      expect(viewer).toContain(source);
    }
  });

  it("requires both source and deficiency matches", () => {
    expect(viewer).toContain("sourceCorrect && deficiencyCorrect");
    expect(viewer).toContain("Incorrect choices can be changed");
    expect(viewer).toContain("4 vitamin cases completed");
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
