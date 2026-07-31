import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/CottonGinningViewer.tsx",
  ),
  "utf8",
);

describe("Class 6 cotton ginning simulation", () => {
  it("covers the complete ginning sequence", () => {
    for (const stage of [
      "Inspect Picked Cotton",
      "Load the Cotton Gin",
      "Turn the Rollers",
      "Collect Both Outputs",
      "Confirm the Process",
    ]) {
      expect(viewer).toContain(stage);
    }
  });

  it("explains what ginning separates", () => {
    expect(viewer).toContain(
      "Ginning is the process of separating cotton fibres from cotton seeds",
    );
    expect(viewer).toContain("larger seeds cannot follow");
    expect(viewer).toContain("ready for spinning into yarn");
  });

  it("advances one ginning task at a time", () => {
    expect(viewer).toContain("goToStage(stageRef.current + 1)");
    expect(viewer).toContain("5 ginning tasks completed");
    expect(viewer).toContain(
      "Ginning complete • Clean fibre ready for spinning",
    );
  });

  it("supports narration and Quest controller interaction", () => {
    expect(viewer).toMatch(/isSessionSupported\?\.\(["']immersive-vr["']\)/);
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toMatch(
      /controller\.addEventListener\(["']selectstart["']/,
    );
    expect(viewer).toContain("playNarration");
  });
});
