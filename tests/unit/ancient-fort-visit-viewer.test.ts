import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/AncientFortVisitViewer.tsx",
  ),
  "utf8",
);

describe("Class 5 ancient-fort virtual field visit", () => {
  it("covers the complete eight-stage Golconda visit", () => {
    for (const stage of [
      "Approach the Great Gate",
      "Look Out from a Bastion",
      "Read the Fort as a Town",
      "Investigate the Palace Ruins",
      "Trace the Water Engineering",
      "Test the Fort's Acoustics",
      "Let Objects Tell Stories",
      "Protect the Story in the Walls",
    ]) {
      expect(viewer).toContain(stage);
    }
    expect(viewer).toContain(
      "Gate → Bastion → Map → Palace → Water → Sound → Evidence → Care",
    );
  });

  it("faithfully represents the chapter's Golconda observations", () => {
    expect(viewer).toContain("iron spikes");
    expect(viewer).toContain("87 bastions");
    expect(viewer).toContain("complete fortified town");
    expect(viewer).toContain("chain of pots");
    expect(viewer).toContain("Fateh Darwaza");
  });

  it("models architecture, water, acoustics and historical evidence", () => {
    expect(viewer).toContain(
      "great Golconda gateway with heavy doors and iron spikes",
    );
    expect(viewer).toContain(
      "high rounded bastion projecting from the straight fort wall",
    );
    expect(viewer).toContain(
      "non-electric water-lifting model with wheels pots tank and clay pipes",
    );
    expect(viewer).toContain(
      "visual model of reflected sound travelling from gateway toward palace",
    );
    expect(viewer).toContain(
      "evidence display comparing pottery metal maps paintings and records",
    );
  });

  it("supports Neerja narration, Quest movement, VR exit and realistic visuals", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
    expect(viewer).toContain("startPosition: new THREE.Vector3(0.2, 0, 2.35)");
    expect(viewer).toContain(
      "/environments/walls-tell-stories-ancient-fort-360.png",
    );
    expect(viewer.match(/^  "/gm)).toHaveLength(8);
    expect(
      existsSync(
        resolve(
          process.cwd(),
          "apps/web/public/environments/walls-tell-stories-ancient-fort-360.png",
        ),
      ),
    ).toBe(true);
  });

  it("teaches evidence-aware and responsible monument care", () => {
    expect(viewer).toContain("separate evidence from imagination");
    expect(viewer).toContain("one object cannot tell us every detail");
    expect(viewer).toContain("without touching the surfaces");
    expect(viewer).toContain("never scratching or writing on the monument");
  });
});
