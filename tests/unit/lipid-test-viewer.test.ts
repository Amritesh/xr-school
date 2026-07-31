import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/LipidTestViewer.tsx"),
  "utf8",
);

describe("Class 6 lipid-test simulation", () => {
  it("implements the NCERT paper test in the correct observation order", () => {
    const place = viewer.indexOf("Place and Fold");
    const crush = viewer.indexOf("Crush Carefully");
    const dry = viewer.indexOf("Remove and Dry");
    const light = viewer.indexOf("Hold Against Light");

    expect(place).toBeGreaterThan(-1);
    expect(crush).toBeGreaterThan(place);
    expect(dry).toBeGreaterThan(crush);
    expect(light).toBeGreaterThan(dry);
  });

  it("compares positive and low-lipid food samples", () => {
    expect(viewer).toMatch(/id:\s*["']peanut["']/);
    expect(viewer).toMatch(/id:\s*["']coconut["']/);
    expect(viewer).toMatch(/id:\s*["']rice["']/);
    expect(viewer).toMatch(/lipidLevel:\s*["']high["']/);
    expect(viewer).toMatch(/lipidLevel:\s*["']moderate["']/);
    expect(viewer).toMatch(/lipidLevel:\s*["']low["']/);
  });

  it("distinguishes a lasting lipid patch from a temporary water mark", () => {
    expect(viewer).toContain("a water mark disappears as it dries");
    expect(viewer).toContain("a lipid patch remains");
    expect(viewer).toContain("persistent translucent patch");
  });

  it("supports browser narration and immersive Quest interaction", () => {
    expect(viewer).toMatch(/isSessionSupported\?\.\(["']immersive-vr["']\)/);
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toMatch(
      /controller\.addEventListener\(\s*["']selectstart["']/,
    );
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("Play narration");
    expect(viewer).toContain("new THREE.Vector3(0, 0, 2.6)");
  });

  it("restarts the procedure when another sample is selected after a result", () => {
    expect(viewer).toContain("stage === STAGES.length - 1) goToStage(1)");
    expect(viewer).toContain("stageRef.current === STAGES.length - 1");
  });
});
