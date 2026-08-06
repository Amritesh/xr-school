import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const assignments: Record<string, string> = {
  "AamPapadViewer.tsx": "food-courtyard-360.png",
  "CircuitViewer.tsx": "electronics-lab-360.png",
  "CottonFarmingViewer.tsx": "cotton-field-360.png",
  "CottonGinningViewer.tsx": "cotton-ginning-workshop-360.png",
  "FoodSpoilageViewer.tsx": "food-courtyard-360.png",
  "LipidTestViewer.tsx": "nutrition-lab-360.png",
  "MilkSpoilageViewer.tsx": "food-courtyard-360.png",
  "MineralSourcesViewer.tsx": "nutrition-lab-360.png",
  "PollinationViewer.tsx": "pollination-garden-360.png",
  "RockClimbingViewer.tsx": "up-you-go-rock-climbing-360.png",
  "SecretGardenKitchenViewer.tsx": "nutrition-plants-garden-360.png",
  "ShapeSortingViewer.tsx": "materials-classroom-360.png",
  "SpaceShuttleLaunchViewer.tsx": "space-shuttle-launchpad-360.jpg",
  "VitaminDeficiencyViewer.tsx": "nutrition-lab-360.png",
};

describe("Realistic simulation environments", () => {
  it("assigns and disposes a topic-specific environment in every applicable viewer", () => {
    for (const [viewer, environment] of Object.entries(assignments)) {
      const source = readFileSync(resolve(process.cwd(), "apps/web/components/simulations", viewer), "utf8");
      expect(source, viewer).toContain("applyRealisticEnvironment");
      expect(source, viewer).toContain(environment);
      expect(source, viewer).toContain("realisticEnvironment.dispose()");
    }
  });

  it("includes every referenced panorama", () => {
    for (const environment of new Set(Object.values(assignments))) {
      expect(existsSync(resolve(process.cwd(), "apps/web/public/environments", environment)), environment).toBe(true);
    }
  });
});
