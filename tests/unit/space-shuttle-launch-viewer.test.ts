import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/SpaceShuttleLaunchViewer.tsx",
  ),
  "utf8",
);

describe("Class 5 Sunita in Space shuttle launch", () => {
  it("covers the complete ten-stage launch mission", () => {
    for (const stage of [
      "Mission Briefing",
      "Inspect the Shuttle Stack",
      "Crew and Ground Safety",
      "Weather and Systems Check",
      "Countdown and Ignition",
      "Liftoff and Tower Clear",
      "Climb Through Max Q",
      "Booster Separation",
      "Main Engine Cutoff",
      "Orbit Earth",
    ]) {
      expect(viewer).toContain(stage);
    }
    expect(viewer).toContain(
      "Inspect → Check → Count down → Launch → Separate → Orbit",
    );
  });

  it("models the historic Shuttle stack and accurate separation sequence", () => {
    expect(viewer).toContain(
      "white winged orbiter carries crew and cargo into orbit",
    );
    expect(viewer).toContain(
      "orange external tank supplies the three main engines",
    );
    expect(viewer).toContain(
      "two white solid rocket boosters provide most liftoff thrust",
    );
    expect(viewer).toContain("About two minutes after liftoff");
    expect(viewer).toContain("descend by parachute");
    expect(viewer).toContain("recovered for reuse");
    expect(viewer).toContain("Only the winged orbiter continues into orbit");
    expect(viewer).toContain("the tank was not recovered for reuse");
  });

  it("teaches thrust, orbital motion and microgravity without misconceptions", () => {
    expect(viewer).toContain(
      "upward thrust becomes greater than the Shuttle's weight",
    );
    expect(viewer).toContain("sideways speed needed to keep circling Earth");
    expect(viewer).toContain("continuously falling around Earth together");
    expect(viewer).toContain("Astronauts are not beyond Earth's gravity");
    expect(viewer).not.toContain("escape Earth's gravity");
  });

  it("connects to Sunita Williams while separating her mission from the real clip", () => {
    expect(viewer).toContain("Discovery on STS-116 in December 2006");
    expect(viewer).toMatch(
      /This is STS-135 historical footage, not Sunita Williams's\s+STS-116 launch\./,
    );
    expect(viewer).toContain("3deA3BXAnHs");
    expect(viewer).toContain("official NASA+ source");
    expect(viewer).not.toMatch(/youtube-nocookie[^\n]+autoplay=1/);
  });

  it("uses four immersive generated environments", () => {
    for (const asset of [
      "space-shuttle-mission-control-360.jpg",
      "space-shuttle-launchpad-360.jpg",
      "space-shuttle-ascent-360.jpg",
      "space-shuttle-orbit-360.jpg",
    ]) {
      expect(viewer).toContain(asset);
      expect(
        existsSync(
          resolve(process.cwd(), "apps/web/public/environments", asset),
        ),
      ).toBe(true);
    }
    expect(viewer).toContain("applyRealisticEnvironment");
    expect(viewer).toContain("realisticEnvironment.dispose()");
  });

  it("supports safe gated interaction, Neerja narration and Quest controls", () => {
    expect(viewer).toContain("completedStagesRef.current.has(currentStage)");
    expect(viewer).toContain("raycaster.intersectObjects");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toMatch(/B\/right\s+grip exits VR/);
    expect(viewer).toContain("startPosition: new THREE.Vector3(0.1, 0, 2.4)");
    expect(viewer).toContain("A real launch is never a classroom experiment");
    const narrationBlock = viewer.slice(
      viewer.indexOf("const NARRATIONS"),
      viewer.indexOf("function wrapText"),
    );
    expect(narrationBlock.match(/^  "/gm)).toHaveLength(10);
  });
});
