import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/CampInSnowViewer.tsx"),
  "utf8",
);

describe("Class 5 camp-in-the-snow simulation", () => {
  it("covers the complete NCERT snow-camp sequence", () => {
    for (const stage of [
      "Reach the 2,134 Metre Camp",
      "Build a Double-Layer Tent",
      "Secure Pegs and Guy Lines",
      "Dig a Drain Around the Tent",
      "Cook at a Safe Stone Chulha",
      "Leave the Campsite Clean",
      "Rest in Feather Sleeping Bags",
      "Wake to Falling Snow",
    ]) {
      expect(viewer).toContain(stage);
    }
    expect(viewer).toContain(
      "Choose → Insulate → Anchor → Drain → Warm → Clean → Rest",
    );
  });

  it("faithfully represents the textbook story", () => {
    expect(viewer).toContain("18 February 1984");
    expect(viewer).toContain("2,134 metres");
    expect(viewer).toContain("double-layered plastic sheets");
    expect(viewer).toContain("air trapped between the layers");
    expect(viewer).toContain("collected firewood and stones to make a chulha");
    expect(viewer).toContain("soft feathers");
    expect(viewer).toContain("toward 2,700 metres");
  });

  it("models insulation, drainage, clean camping and snowy movement", () => {
    expect(viewer).toContain("inner tent layer trapping still insulating air");
    expect(viewer).toContain("tensioned guy line resisting mountain wind");
    expect(viewer).toContain("meltwater flowing around instead of beneath the tent");
    expect(viewer).toContain("sealed camp waste bag carried back from the mountain");
    expect(viewer).toContain("walking stick improving balance on slippery snow");
    expect(viewer).toContain("soft fluffy snowfall visible throughout the mountain camp");
  });

  it("supports narration, Quest locomotion, VR exit and a realistic environment", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
    expect(viewer).toContain("startPosition: new THREE.Vector3(0.4, 0, 2.5)");
    expect(viewer).toContain("/environments/up-you-go-camp-in-snow-360.png");
    expect(viewer.match(/^  "/gm)).toHaveLength(8);
    expect(
      existsSync(
        resolve(
          process.cwd(),
          "apps/web/public/environments/up-you-go-camp-in-snow-360.png",
        ),
      ),
    ).toBe(true);
  });

  it("states real-world fire and mountain safety boundaries", () => {
    expect(viewer).toContain("only trained adults manage fire");
    expect(viewer).toContain("away from tent fabric");
    expect(viewer).toContain("trained leader checks the weather");
  });
});
