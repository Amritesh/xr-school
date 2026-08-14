import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import {
  GUIDED_SIMULATION_DEFINITIONS,
  IMPLEMENTED_SIMULATIONS,
} from "@xr-school/simulation-content";
import GuidedSimulationViewer from "../../apps/web/components/simulations/shared/GuidedSimulationViewer";
import InteractiveInvestigationViewer from "../../apps/web/components/simulations/shared/InteractiveInvestigationViewer";
import {
  INTERACTIVE_VIEWER_REGISTRATIONS,
} from "../../apps/web/lib/simulations/interactive/registrations";
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
  "fungi-development": {
    fileName: "FungiDevelopmentViewer.tsx",
    load: () => import("../../apps/web/components/simulations/FungiDevelopmentViewer"),
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

    expect(released).toHaveLength(36);
    expect([...SIMULATION_VIEWER_KEYS].sort()).toEqual(releasedKeys);
    expect(SIMULATION_VIEWER_KEYS).toHaveLength(36);
    expect(SIMULATION_VIEWER_KEYS).toEqual(expect.arrayContaining([
      ...Object.keys(EXPECTED_VIEWERS),
      ...GUIDED_SIMULATION_DEFINITIONS.map(definition => definition.viewerKey),
    ]));

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
      const registeredModule = await getSimulationViewer(viewerKey).load();
      if (expected) {
        const expectedModule = await expected.load();
        expect(registeredModule.default, viewerKey).toBe(expectedModule.default);
        continue;
      }

      const guidedDefinition = GUIDED_SIMULATION_DEFINITIONS.find(
        definition => definition.viewerKey === viewerKey,
      );
      const interactiveRegistration = INTERACTIVE_VIEWER_REGISTRATIONS[
        viewerKey as keyof typeof INTERACTIVE_VIEWER_REGISTRATIONS
      ];
      if (interactiveRegistration) {
        const element = (registeredModule.default as () => unknown)();
        expect(isValidElement(element), viewerKey).toBe(true);
        if (!isValidElement(element)) continue;
        expect(element.type, viewerKey).toBe(InteractiveInvestigationViewer);
        expect(element.props).toMatchObject({
          registration: interactiveRegistration,
        });
        continue;
      }
      expect(guidedDefinition, viewerKey).toBeDefined();
      const element = (registeredModule.default as () => unknown)();
      expect(isValidElement(element), viewerKey).toBe(true);
      if (!isValidElement(element)) continue;
      expect(element.type, viewerKey).toBe(GuidedSimulationViewer);
      expect(element.props).toMatchObject({ definition: guidedDefinition });
      expect(element.props.sceneAdapter.id).toBe(`guided:${definition.module.id}`);
    }
  });

  it("preserves diagnostic source-path metadata for every viewer", () => {
    for (const [viewerKey, expected] of Object.entries(EXPECTED_VIEWERS)) {
      const registration = getSimulationViewer(viewerKey);
      expect(registration.sourcePath).toBe(
        `apps/web/components/simulations/${expected.fileName}`,
      );
    }
    for (const definition of GUIDED_SIMULATION_DEFINITIONS) {
      const registration = getSimulationViewer(definition.viewerKey);
      expect(registration.sourcePath).toMatch(
        /^apps\/web\/lib\/simulations\/guided\/.+\.scene\.ts$/,
      );
    }
    for (const [viewerKey] of Object.entries(INTERACTIVE_VIEWER_REGISTRATIONS)) {
      const registration = getSimulationViewer(viewerKey);
      expect(registration.sourcePath).toMatch(
        /^apps\/web\/lib\/simulations\/interactive\/.+\.scene\.ts$/,
      );
    }
  });

  it("binds exactly 17 guided viewer keys without exposing legacy slugs as keys", () => {
    const guidedKeys = GUIDED_SIMULATION_DEFINITIONS.map(item => item.viewerKey);
    expect(guidedKeys).toHaveLength(17);
    expect(new Set(guidedKeys).size).toBe(17);
    for (const definition of IMPLEMENTED_SIMULATIONS.filter(
      item => item.kind === "guided",
    )) {
      expect(SIMULATION_VIEWER_KEYS).toContain(definition.module.viewerKey);
      for (const alias of definition.module.legacyAliases ?? []) {
        expect(SIMULATION_VIEWER_KEYS).not.toContain(alias);
      }
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
