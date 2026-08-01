import { describe, expect, it } from "vitest";

import { IMPLEMENTED_SIMULATIONS } from "@xr-school/simulation-content";
import {
  SIMULATION_VIEWER_KEYS,
  assertSimulationViewerCoverage,
  findSimulationViewer,
  getSimulationViewer,
} from "../../apps/web/lib/simulations/viewerRegistry";

const EXPECTED_VIEWERS = {
  "acid-base": {
    fileName: "AcidBaseViewer.tsx",
    load: () => import("../../apps/web/components/simulations/AcidBaseViewer"),
  },
  "breathing-process": {
    fileName: "BreathingProcessViewer.tsx",
    load: () => import("../../apps/web/components/simulations/BreathingProcessViewer"),
  },
  circuit: {
    fileName: "CircuitViewer.tsx",
    load: () => import("../../apps/web/components/simulations/CircuitViewer"),
  },
  "colour-adventure": {
    fileName: "ColourAdventureViewer.tsx",
    load: () => import("../../apps/web/components/simulations/ColourAdventureViewer"),
  },
  "digestive-system": {
    fileName: "DigestiveSystemViewer.tsx",
    load: () => import("../../apps/web/components/simulations/DigestiveSystemViewer"),
  },
  "force-motion": {
    fileName: "ForceMotionViewer.tsx",
    load: () => import("../../apps/web/components/simulations/ForceMotionViewer"),
  },
  "money-town": {
    fileName: "MoneyTownViewer.tsx",
    load: () => import("../../apps/web/components/simulations/MoneyTownViewer"),
  },
  pollination: {
    fileName: "PollinationViewer.tsx",
    load: () => import("../../apps/web/components/simulations/PollinationViewer"),
  },
  "preposition-adventure": {
    fileName: "PrepositionAdventureViewer.tsx",
    load: () => import("../../apps/web/components/simulations/PrepositionAdventureViewer"),
  },
  "solar-system-mission": {
    fileName: "SolarSystemMissionViewer.tsx",
    load: () => import("../../apps/web/components/simulations/SolarSystemMissionViewer"),
  },
  solubility: {
    fileName: "SolubilityLabViewer.tsx",
    load: () => import("../../apps/web/components/simulations/SolubilityLabViewer"),
  },
  "sources-of-food": {
    fileName: "FoodSourcesSortingViewer.tsx",
    load: () => import("../../apps/web/components/simulations/FoodSourcesSortingViewer"),
  },
  "states-of-matter": {
    fileName: "StatesOfMatterViewer.tsx",
    load: () => import("../../apps/web/components/simulations/StatesOfMatterViewer"),
  },
} as const;

function expectedViewer(viewerKey: string) {
  return EXPECTED_VIEWERS[viewerKey as keyof typeof EXPECTED_VIEWERS];
}

describe("released simulation viewer registry", () => {
  it("has exactly one lazy viewer factory for every released definition", () => {
    const released = IMPLEMENTED_SIMULATIONS.filter(
      ({ module }) => module.publicationStatus === "released",
    );
    const releasedKeys = released.map(({ module }) => module.viewerKey).sort();

    expect(released).toHaveLength(13);
    expect([...SIMULATION_VIEWER_KEYS].sort()).toEqual(releasedKeys);
    expect([...SIMULATION_VIEWER_KEYS].sort()).toEqual(
      Object.keys(EXPECTED_VIEWERS).sort(),
    );

    for (const definition of released) {
      const registration = getSimulationViewer(definition.module.viewerKey);
      expect(registration.viewerKey).toBe(definition.module.viewerKey);
      expect(registration.load).toEqual(expect.any(Function));
      expect(registration.Viewer).toBeDefined();
    }
  });

  it("loads the exact canonical viewer module bound to every viewer key", async () => {
    for (const definition of IMPLEMENTED_SIMULATIONS) {
      if (definition.module.publicationStatus !== "released") continue;
      const viewerKey = definition.module.viewerKey;
      const expected = expectedViewer(viewerKey);
      expect(expected, viewerKey).toBeDefined();

      const [registeredModule, expectedModule] = await Promise.all([
        getSimulationViewer(viewerKey).load(),
        expected.load(),
      ]);

      expect(registeredModule.default, viewerKey).toBe(expectedModule.default);
    }
  });

  it("preserves diagnostic source-path metadata for every viewer", () => {
    for (const [viewerKey, expected] of Object.entries(EXPECTED_VIEWERS)) {
      const registration = getSimulationViewer(viewerKey);
      expect(registration.sourcePath).toBe(
        `apps/web/components/simulations/${expected.fileName}`,
      );
    }
  });

  it("rejects missing, duplicate, and unregistered viewer keys", () => {
    const released = IMPLEMENTED_SIMULATIONS.filter(
      ({ module }) => module.publicationStatus === "released",
    );
    const keys = released.map(({ module }) => module.viewerKey);

    expect(() => assertSimulationViewerCoverage(released, keys.slice(1))).toThrow(
      /missing viewer key/i,
    );
    expect(() => assertSimulationViewerCoverage(released, [...keys, keys[0]])).toThrow(
      /duplicate viewer key/i,
    );
    expect(() => assertSimulationViewerCoverage(released, [...keys, "unlisted-viewer"])).toThrow(
      /viewer key outside content registry/i,
    );
  });

  it("has no default viewer for an unknown key", () => {
    expect(findSimulationViewer("unknown-viewer")).toBeUndefined();
    expect(() => getSimulationViewer("unknown-viewer")).toThrow(
      'Unknown simulation viewer key "unknown-viewer"',
    );
  });
});
