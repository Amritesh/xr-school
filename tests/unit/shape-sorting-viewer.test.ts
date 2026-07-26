import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(resolve(process.cwd(), "apps/web/components/simulations/ShapeSortingViewer.tsx"), "utf8");

describe("Class 6 sorting materials by shape simulation", () => {
  it("sorts eight familiar objects into four shape groups", () => {
    for (const object of ["Rubber ball", "Orange", "Tin can", "Piece of chalk", "Book", "Wooden block", "Party hat", "Traffic cone"]) {
      expect(viewer).toContain(object);
    }
    for (const shape of ["Sphere", "Cylinder", "Cuboid", "Cone"]) expect(viewer).toContain(shape);
  });

  it("teaches observable properties of each shape", () => {
    expect(viewer).toContain("no flat face");
    expect(viewer).toContain("two circular faces");
    expect(viewer).toContain("six flat rectangular faces");
    expect(viewer).toContain("narrows to a point");
  });

  it("gives corrective feedback and completes the activity", () => {
    expect(viewer).toContain("Try again:");
    expect(viewer).toContain("8 of 8 objects sorted correctly");
    expect(viewer).toContain("Different materials can have the same shape");
  });

  it("supports narration and Quest interaction", () => {
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toMatch(/controller\.addEventListener\(["']selectstart["']/);
    expect(viewer).toContain("playNarration");
  });
});
