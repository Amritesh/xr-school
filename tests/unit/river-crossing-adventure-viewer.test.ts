import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/RiverCrossingAdventureViewer.tsx",
  ),
  "utf8",
);

describe("Class 5 river-crossing adventure simulation", () => {
  it("covers the complete supervised river-crossing sequence", () => {
    for (const stage of [
      "Survey the Mountain River",
      "Check Before You Cross",
      "Test the Piton Anchors",
      "Clip In to the Main Rope",
      "Cross with Firm Footsteps",
      "Recover from a Slip",
      "Help the Team Across",
      "River Crossing Complete",
    ]) {
      expect(viewer).toContain(stage);
    }
    expect(viewer).toContain(
      "Inspect → Connect → Cross → Recover → Support",
    );
  });

  it("faithfully represents the NCERT river-crossing episode", () => {
    expect(viewer).toContain("After an eight-kilometre trek");
    expect(viewer).toContain("realistic braided main rope tied across the river");
    expect(viewer).toContain("pegs called pitons on both sides");
    expect(viewer).toContain("the rope slipped from her hands");
    expect(viewer).toContain("the sling kept her connected");
  });

  it("models the safety equipment and anchored crossing system", () => {
    expect(viewer).toContain("makePitonAnchor");
    expect(viewer).toContain("tested piton anchor");
    expect(viewer).toContain("properly fitted harness");
    expect(viewer).toContain("locking connector and safety sling");
    expect(viewer).toContain("safety sling remains connected");
    expect(viewer).toContain("trained river crossing instructor");
  });

  it("animates the current, careful crossing and slip recovery", () => {
    expect(viewer).toContain("cold fast-flowing mountain water with animated foam");
    expect(viewer).toContain("makeRiverWaterMaterial");
    expect(viewer).toContain("ShaderMaterial");
    expect(viewer).toContain("fast current foam and spray particles");
    expect(viewer).toContain("learner foot splash");
    expect(viewer).toContain("const RIVER_LENGTH = 18");
    expect(viewer).toContain("const RIVER_WIDTH = 3.8");
    expect(viewer).toContain(
      "new THREE.PlaneGeometry(RIVER_LENGTH, RIVER_WIDTH, 180, 64)",
    );
    expect(viewer).toContain("float riverFade = bankFade * lengthFade");
    expect(viewer).toContain("THREE.MathUtils.lerp(1.65, 0.12, progress)");
    expect(viewer).toContain("THREE.MathUtils.lerp(0.72, 0, recovery)");
    expect(viewer).toContain("regain the rope");
  });

  it("creates an immersive first-person crossing experience", () => {
    expect(viewer).toContain("first-person rope gripping view");
    expect(viewer).toContain("gloved hand gripping rope");
    expect(viewer).toContain("first-person visible safety tether");
    expect(viewer).toContain("immersiveCameraPosition");
    expect(viewer).toContain("createRiverAmbience");
    expect(viewer).toContain("RiverAmbience");
    expect(viewer).toContain("makeBraidedRope");
    expect(viewer).toContain("realistic braided main rope");
    expect(viewer).toContain("startPosition: new THREE.Vector3(0.65, 0, 2.3)");
    expect(viewer).toContain("learner.visible = !crossingActive");
    expect(viewer).toContain("card.visible = !crossingActive");
  });

  it("uses clear safety boundaries for a hazardous real-world activity", () => {
    expect(viewer).toContain("This simulation is for learning");
    expect(viewer).toContain(
      "Never try a real river crossing without expert supervision",
    );
    expect(viewer).toContain("Courage does not mean ignoring risk");
  });

  it("supports full narration, Quest controls and a realistic mountain environment", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
    expect(viewer).toContain(
      "/environments/up-you-go-river-crossing-360.png",
    );
    expect(viewer).toContain("applyRealisticEnvironment");
    expect(viewer.match(/^  "/gm)).toHaveLength(8);
  });
});
