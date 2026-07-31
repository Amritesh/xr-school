import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/SnowMountainClimbingViewer.tsx",
  ),
  "utf8",
);

describe("Class 5 snow-mountain-climbing simulation", () => {
  it("covers the complete supervised snow journey", () => {
    for (const stage of [
      "Read the Snow-Mountain Route",
      "Prepare Warm Layers and Equipment",
      "Move as One Group",
      "Plant, Step, Balance",
      "Practise on the Fixed Safety Rope",
      "Respond to a Slip",
      "Reach the 2,700 Metre Snowfield",
      "Return Before Conditions Change",
    ]) {
      expect(viewer).toContain(stage);
    }
    expect(viewer).toContain(
      "Observe → Equip → Group → Step → Protect → Recover → Return",
    );
  });

  it("faithfully represents the Up You Go snow-climb episode", () => {
    expect(viewer).toContain("2,134-metre camp");
    expect(viewer).toContain("toward 2,700 metres");
    expect(viewer).toContain("used sticks because it kept slipping");
    expect(viewer).toContain("By afternoon");
    expect(viewer).toContain("helping one another");
  });

  it("models equipment, route finding, balance and protected rope practice", () => {
    expect(viewer).toContain("cold-weather equipment check station");
    expect(viewer).toContain(
      "visible route marker checked before and during the climb",
    );
    expect(viewer).toContain(
      "walking stick planted before each short careful step",
    );
    expect(viewer).toContain("instructor-checked fixed-rope practice system");
    expect(viewer).toContain("group height check at approximately 2700 metres");
  });

  it("supports narration, Quest locomotion, VR exit and a realistic environment", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
    expect(viewer).toContain("startPosition: new THREE.Vector3(0.25, 0, 2.45)");
    expect(viewer).toContain(
      "/environments/up-you-go-snow-mountain-climbing-360.png",
    );
    expect(viewer.match(/^  "/gm)).toHaveLength(8);
    expect(
      existsSync(
        resolve(
          process.cwd(),
          "apps/web/public/environments/up-you-go-snow-mountain-climbing-360.png",
        ),
      ),
    ).toBe(true);
  });

  it("states real-world safety boundaries", () => {
    expect(viewer).toContain("only under trained supervision");
    expect(viewer).toContain(
      "No learner leaves the marked route or climbs alone",
    );
    expect(viewer).toContain("Educational simulation only");
    expect(viewer).toContain(
      "never treats this simulation as real mountaineering training",
    );
  });
});
