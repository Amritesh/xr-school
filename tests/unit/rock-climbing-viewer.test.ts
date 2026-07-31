import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/RockClimbingViewer.tsx"),
  "utf8",
);

describe("Class 5 rock-climbing simulation", () => {
  it("covers the complete climb and rappel sequence", () => {
    for (const stage of [
      "Arrive at the Training Rock",
      "Identify Hand and Foot Holds",
      "Helmet, Harness, Sling and Rope",
      "The Rope Catches a Slip",
      "Keep the Body at 90 Degrees",
      "Move with Three Secure Points",
      "Prepare to Rappel",
      "Rock Climbing Complete",
    ]) {
      expect(viewer).toContain(stage);
    }
    expect(viewer).toContain("Observe → Connect → Balance → Climb → Rappel");
  });

  it("faithfully represents the NCERT Tekla rock-climbing episode", () => {
    expect(viewer).toContain("walks 15 kilometres to Tekla village");
    expect(viewer).toContain("at 1,600 metres");
    expect(viewer).toContain("90-metre flat rock");
    expect(viewer).toContain("identify holds");
    expect(viewer).toContain("swings from the rope");
    expect(viewer).toContain("angle of 90 degrees");
    expect(viewer).toContain("called rappelling");
  });

  it("models a realistic protected climbing system", () => {
    expect(viewer).toContain("properly fitted climbing harness and sling");
    expect(viewer).toContain("checked climbing helmet");
    expect(viewer).toContain("locked sling connector");
    expect(viewer).toContain("tensioned top rope connected to the learner sling");
    expect(viewer).toContain("belay rope controlled by the trained instructor");
    expect(viewer).toContain("checked top rope piton");
  });

  it("animates route holds, slip recovery, climbing and rappelling", () => {
    expect(viewer).toContain("planned hand and foot hold route");
    expect(viewer).toContain("visible ninety degree body posture guide");
    expect(viewer).toContain("THREE.MathUtils.lerp(1.55, 4.35, progress)");
    expect(viewer).toContain("THREE.MathUtils.lerp(5.45, 0.25, rappel)");
    expect(viewer).toContain("small chalk particles near moving hands");
  });

  it("supports narration, Quest locomotion, VR exit and the dedicated environment", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
    expect(viewer).toContain("startPosition: new THREE.Vector3(0.6, 0, 3.35)");
    expect(viewer).toContain("/environments/up-you-go-rock-climbing-360.png");
    expect(viewer.match(/^  "/gm)).toHaveLength(8);
    expect(
      existsSync(
        resolve(
          process.cwd(),
          "apps/web/public/environments/up-you-go-rock-climbing-360.png",
        ),
      ),
    ).toBe(true);
  });

  it("states the boundary for a hazardous real-world activity", () => {
    expect(viewer).toContain("This simulation is for learning only");
    expect(viewer).toContain(
      "real rock climbing requires qualified supervision and approved equipment",
    );
  });
});
