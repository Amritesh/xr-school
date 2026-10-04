import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  YARN_MAKER_GUIDANCE,
  YARN_MAKER_SIMULATION,
} from "../../packages/simulation-content/src/implemented/guided/yarn-maker-mission";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("The Yarn Maker Mission simulation", () => {
  it("publishes a six-minute Class 7 wool-to-yarn journey with ten evidence stages", () => {
    expect(YARN_MAKER_GUIDANCE.stages.map((stage) => stage.id)).toEqual([
      "fibre-vs-yarn",
      "carding",
      "combing",
      "drawing",
      "twist",
      "spinning",
      "winding",
      "quality",
      "products-summary",
      "final-challenge",
    ]);
    expect(YARN_MAKER_SIMULATION.module).toMatchObject({
      id: "sim-c07-ch03-a03-spinning-and-rolling-of-wool",
      slug: "c7-ch03-a03-spinning-and-rolling-of-wool",
      viewerKey: "guided-yarn-maker-mission",
      publicationStatus: "released",
      evidenceMaturity: "internalQA",
      expectedDurationMinutes: 6,
      stages: 10,
    });
    expect(YARN_MAKER_SIMULATION.assessment.prompts).toHaveLength(2);
    expect(YARN_MAKER_SIMULATION.narration.cues).toHaveLength(10);
  });

  it("provides orbit, Quest, exit and packaged narration controls", () => {
    const viewer = source(
      "apps/web/components/simulations/YarnMakerViewer.tsx",
    );
    expect(viewer).toContain("OrbitControls");
    expect(viewer).toContain("controls.enablePan = true");
    expect(viewer).toContain("controls.screenSpacePanning = true");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toContain("movementBounds");
    expect(viewer).toMatch(/B or\s+right grip exits VR/);
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("findInteractionId");
    expect(viewer).toContain("isHierarchyVisible");
    expect(viewer).toContain(
      ".find(({ object }) => isHierarchyVisible(object))",
    );
    expect(viewer).toContain("interactionActionRef.current(interactionId)");
    expect(viewer).toContain('"yarn-maker-magnified-twist": "magnified-twist"');
    expect(viewer).toContain("PROCESS_ORDER");
    expect(viewer).toContain("challengeScore");
  });

  it("models guarded preparation, spinning, winding, inspection and a five-task challenge", () => {
    const world = source("apps/web/lib/world-builder/yarnMakerWorld.ts");
    const environment = resolve(
      process.cwd(),
      "apps/web/public/simulations/c7-ch03-a03-spinning-and-rolling-of-wool/environment.webp",
    );
    expect(statSync(environment).size).toBeGreaterThan(100_000);
    expect(statSync(environment).size).toBeLessThanOrEqual(400_000);
    expect(world).toContain(
      "/simulations/c7-ch03-a03-spinning-and-rolling-of-wool/environment.webp",
    );
    expect(world).toContain("yarn-maker-screen-safe-mission-panel-anchor");
    expect(world).toContain("yarn-maker-carding-cover");
    expect(world).toContain("yarn-maker-combing-handle");
    expect(world).toContain("yarn-maker-drawing-speed");
    expect(world).toContain("yarn-maker-spinning-tension-control");
    expect(world).toContain("yarn-maker-winding-guide");
    expect(world).toContain("yarn-maker-quality-${id}");
    expect(world).toContain("yarn-maker-product-${id}");
    expect(world).toContain("yarn-maker-challenge-${id}");
    expect(world).toContain("const stageGroups = [");
  });

  it("exposes the canonical route and guided-scene adapter", () => {
    const route = source(
      "apps/web/app/simulations/c7-ch03-a03-spinning-and-rolling-of-wool/page.tsx",
    );
    const scene = source(
      "apps/web/lib/simulations/guided/c7-ch03-a03-spinning-and-rolling-of-wool.scene.ts",
    );
    expect(route).toContain('slug="c7-ch03-a03-spinning-and-rolling-of-wool"');
    expect(scene).toContain("YARN_MAKER_GUIDANCE");
    expect(scene).toContain("YARN_MAKER_SCENE_METADATA");
    expect(scene).toContain("createGuidedSceneAdapter");
  });
});
