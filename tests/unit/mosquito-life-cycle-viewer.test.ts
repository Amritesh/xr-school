import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(process.cwd(), "apps/web/components/simulations/MosquitoLifeCycleViewer.tsx"),
  "utf8",
);
const narrationGenerator = readFileSync(
  resolve(process.cwd(), "scripts/generate-narration-assets.mjs"),
  "utf8",
);

describe("Class 5 mosquito life-cycle simulation", () => {
  it("covers the complete Anopheles life cycle", () => {
    for (const stage of [
      "Meet the Anopheles Cycle",
      "Eggs Float on Water",
      "Larvae — The Wigglers",
      "Pupae — The Tumblers",
      "Adult Emerges",
      "The Adult Female",
      "Protect the Community",
      "Life Cycle Mastered",
    ]) {
      expect(viewer).toContain(stage);
    }
    expect(viewer).toContain("Egg → Larva → Pupa → Adult → Egg");
  });

  it("models the characteristic Anopheles egg and larva", () => {
    expect(viewer).toContain("Anopheles egg with lateral floats");
    expect(viewer).toContain("lateralFloat");
    expect(viewer).toContain("lays eggs one at a time directly on water");
    expect(viewer).toContain("Anopheles larva parallel to water surface");
    expect(viewer).toContain("do not have a breathing siphon");
    expect(viewer).toContain("moult four times");
  });

  it("shows pupal metamorphosis and adult emergence", () => {
    expect(viewer).toContain("comma-shaped mosquito pupa");
    expect(viewer).toContain("it does not feed");
    expect(viewer).toContain("The pupal case splits");
    expect(viewer).toContain("makeAdultAnopheles");
    expect(viewer).toContain("Math.sin(elapsed * 46)");
  });

  it("avoids common biting and malaria misconceptions", () => {
    expect(viewer).toContain("Only female mosquitoes bite");
    expect(viewer).toContain("Male and female mosquitoes use plant sugars for energy");
    expect(viewer).toContain("only after it becomes infected with Plasmodium");
  });

  it("includes safe, practical prevention guidance", () => {
    expect(viewer).toContain("emptying and scrubbing water containers");
    expect(viewer).toContain("Bed nets and screens reduce bites");
    expect(viewer).toContain("trained adults and community teams");
  });

  it("supports full narration, Quest interaction and a realistic wetland", () => {
    expect(viewer).toContain("playNarration");
    expect(viewer).toContain("unlockNarration");
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toMatch(/requestSession\(["']immersive-vr["']/);
    expect(viewer).toContain("B/right grip exits VR");
    expect(viewer).toContain("/environments/mosquito-life-cycle-wetland-360.png");
    expect(viewer).toContain("applyRealisticEnvironment");
    expect(viewer.match(/^  "/gm)).toHaveLength(8);
  });

  it("uses a calm Indian-English teacher voice for every narration stage", () => {
    expect(narrationGenerator).toContain('"MosquitoLifeCycleViewer.tsx"');
    expect(narrationGenerator).toContain('voice: "en-IN-NeerjaExpressiveNeural"');
    expect(narrationGenerator).toContain('description: "Neerja Expressive storyteller"');
  });
});
