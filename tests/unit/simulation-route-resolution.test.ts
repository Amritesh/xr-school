import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import {
  IMPLEMENTED_SIMULATIONS,
  resolveSimulationPath,
  routeForSimulation,
} from "@xr-school/simulation-content";
import SimulationRoutePage, {
  resolveCanonicalSimulationRoute,
} from "../../apps/web/components/simulations/shared/SimulationRoutePage";
import { getSimulationViewer } from "../../apps/web/lib/simulations/viewerRegistry";

interface SimulationPageModule {
  default: () => unknown;
}

const simulationPageModules = import.meta.glob<SimulationPageModule>(
  "../../apps/web/app/simulations/*/page.tsx",
);

async function loadPageForSlug(slug: string): Promise<SimulationPageModule> {
  const modulePath = `../../apps/web/app/simulations/${slug}/page.tsx`;
  const load = simulationPageModules[modulePath];
  expect(load, modulePath).toBeDefined();
  return load();
}

describe("registry-driven simulation route resolution", () => {
  it("resolves every released canonical path to its exact viewer", () => {
    const released = IMPLEMENTED_SIMULATIONS.filter(
      ({ module }) => module.publicationStatus === "released",
    );

    for (const definition of released) {
      const canonicalPath = routeForSimulation(definition);
      const route = resolveSimulationPath(canonicalPath);
      const composition = resolveCanonicalSimulationRoute(
        definition.module.slug,
      );

      expect(route).toEqual({
        definition,
        canonicalPath,
        redirect: false,
      });
      expect(composition?.definition).toBe(definition);
      expect(composition?.viewerKey).toBe(definition.module.viewerKey);
      expect(getSimulationViewer(composition!.viewerKey).viewerKey).toBe(
        definition.module.viewerKey,
      );
    }
  });

  it("executes every canonical page as the exact shared composition", async () => {
    for (const definition of IMPLEMENTED_SIMULATIONS) {
      if (definition.module.publicationStatus !== "released") continue;
      const page = await loadPageForSlug(definition.module.slug);
      const element = page.default();

      expect(isValidElement(element), definition.module.slug).toBe(true);
      if (!isValidElement<{ slug: string }>(element)) continue;
      expect(element.type, definition.module.slug).toBe(SimulationRoutePage);
      expect(element.props).toEqual({ slug: definition.module.slug });
    }
  });

  it("executes a Next server redirect for every registered legacy path", async () => {
    const checkedPaths = new Set<string>();

    for (const definition of IMPLEMENTED_SIMULATIONS) {
      const canonicalPath = routeForSimulation(definition);
      const paths = [
        ...definition.legacyPaths,
        ...(definition.module.legacyAliases ?? []).map(
          (alias) => `/simulations/${alias}`,
        ),
      ];
      for (const legacyPath of paths) {
        if (checkedPaths.has(legacyPath)) continue;
        checkedPaths.add(legacyPath);
        const resolution = resolveSimulationPath(legacyPath);
        const slug = legacyPath.slice("/simulations/".length);
        const page = await loadPageForSlug(slug);
        let redirectError: unknown;
        try {
          page.default();
        } catch (error) {
          redirectError = error;
        }

        expect(resolution).toEqual({
          definition,
          canonicalPath,
          redirect: true,
        });
        expect(redirectError).toMatchObject({
          digest: `NEXT_REDIRECT;replace;${canonicalPath};307;`,
        });
      }
    }

    expect(checkedPaths.size).toBe(23);
    expect(checkedPaths).toContain(
      "/simulations/experiments-with-water-soluble-insoluble",
    );
    expect(checkedPaths).toContain(
      "/simulations/mangoes-round-the-year-food-spoilage",
    );
  });

  it("returns a controlled Next not-found for unknown or legacy slugs", () => {
    expect(resolveCanonicalSimulationRoute("not-a-simulation")).toBeUndefined();
    expect(
      resolveCanonicalSimulationRoute(
        "experiments-with-water-soluble-insoluble",
      ),
    ).toBeUndefined();

    for (const slug of [
      "not-a-simulation",
      "experiments-with-water-soluble-insoluble",
    ]) {
      try {
        SimulationRoutePage({ slug });
        throw new Error("Expected SimulationRoutePage to throw not-found");
      } catch (error) {
        expect(error).toMatchObject({
          digest: "NEXT_HTTP_ERROR_FALLBACK;404",
        });
      }
    }
  });
});
