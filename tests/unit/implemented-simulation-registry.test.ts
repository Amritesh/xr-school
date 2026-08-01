import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  IMPLEMENTED_SIMULATIONS,
  createImplementedSimulationRegistry,
  findImplementedSimulation,
  resolveSimulationPath,
  routeForSimulation,
} from "../../packages/simulation-content/src/index";
import { SIMULATION_MODULES } from "../../packages/simulation-content/src/modules";
import {
  validateImplementedSimulationDefinition,
  type ImplementedSimulationDefinition,
} from "../../packages/simulation-schema/src/index";

function mutableClone(
  definition: ImplementedSimulationDefinition,
): ImplementedSimulationDefinition {
  return structuredClone(definition);
}

describe("implemented simulation registry", () => {
  it("contains exactly the 13 current released classes", () => {
    expect(IMPLEMENTED_SIMULATIONS).toHaveLength(13);
    expect(SIMULATION_MODULES).toHaveLength(13);
    expect(IMPLEMENTED_SIMULATIONS.map(({ module }) => module.id).sort()).toEqual(
      SIMULATION_MODULES.map((module) => module.id).sort(),
    );
    expect(
      IMPLEMENTED_SIMULATIONS.every(
        ({ module }) =>
          module.publicationStatus === "released" &&
          module.evidenceMaturity === "internalQA",
      ),
    ).toBe(true);
  });

  it("uses unique module IDs, slugs, routes, and viewer keys", () => {
    const values = [
      IMPLEMENTED_SIMULATIONS.map(({ module }) => module.id),
      IMPLEMENTED_SIMULATIONS.map(({ module }) => module.slug),
      IMPLEMENTED_SIMULATIONS.map(routeForSimulation),
      IMPLEMENTED_SIMULATIONS.map(({ module }) => module.viewerKey),
    ];

    for (const collection of values) {
      expect(new Set(collection).size).toBe(collection.length);
    }
  });

  it("validates every canonical definition through the public schema validator", () => {
    for (const definition of IMPLEMENTED_SIMULATIONS) {
      expect(
        validateImplementedSimulationDefinition(definition),
        definition.module.slug,
      ).toEqual([]);
      expect(definition.module.stages).toBe(definition.experience.stages.length);
      expect(definition.narration.cues.length).toBeGreaterThan(0);
    }
  });

  it("publishes the real packaged SVG manifests with measured integrity", () => {
    const expectedAssetCounts: Record<string, number> = {
      pollination: 19,
      circuit: 16,
      "c9-ch01-a02-states-of-matter": 7,
    };

    for (const [slug, expectedCount] of Object.entries(expectedAssetCounts)) {
      const definition = findImplementedSimulation(slug);
      expect(definition?.assets.assets, slug).toHaveLength(expectedCount);
      for (const asset of definition?.assets.assets ?? []) {
        expect(asset.sha256, asset.id).toMatch(/^[a-f0-9]{64}$/);
        expect(asset.byteSize, asset.id).toBeGreaterThan(0);
        expect(asset.source, asset.id).toMatch(/^XR School/);
        expect(asset.license, asset.id).toContain("self-authored");

        const bytes = readFileSync(
          resolve(process.cwd(), "apps/web/public", asset.url.replace(/^\//, "")),
        );
        expect(bytes.byteLength, asset.id).toBe(asset.byteSize);
        expect(
          createHash("sha256").update(bytes).digest("hex"),
          asset.id,
        ).toBe(asset.sha256);
      }
    }
  });

  it("includes Colour Adventure as an honest 14-stage current class", () => {
    const definition = findImplementedSimulation(
      "c1-art-a01-learning-of-colours",
    );

    expect(definition?.module).toMatchObject({
      id: "sim-c1-art-a01-learning-of-colours",
      slug: "c1-art-a01-learning-of-colours",
      title: "Colour Adventure",
      viewerKey: "colour-adventure",
      publicationStatus: "released",
      evidenceMaturity: "internalQA",
      stages: 14,
    });
    expect(definition?.experience.stages).toHaveLength(14);
    expect(definition?.experience.stages[0]).toMatchObject({
      id: "intro",
      title: "Magical Colour Classroom",
      requiredActionIds: ["start-colour-adventure"],
    });
  });

  it("uses an early-years tone and explicit automatic terminal stages", () => {
    for (const slug of [
      "c1-art-a01-learning-of-colours",
      "c1-math-ch01-introduction-to-money",
      "c2-english-ch01-prepositions",
    ]) {
      const definition = findImplementedSimulation(slug);
      const terminalStage = definition?.experience.stages.at(-1);

      expect(definition?.experience.gradeTone, slug).toBe("class1To2");
      expect(terminalStage, slug).toMatchObject({
        completionMode: "automatic",
        requiredActionIds: [],
        completionEvidenceIds: [],
      });
    }
  });

  it("finds every definition by ID, slug, canonical path, and alias", () => {
    for (const definition of IMPLEMENTED_SIMULATIONS) {
      expect(findImplementedSimulation(definition.module.id)).toBe(definition);
      expect(findImplementedSimulation(definition.module.slug)).toBe(definition);
      expect(findImplementedSimulation(routeForSimulation(definition))).toBe(
        definition,
      );
      for (const alias of definition.module.legacyAliases ?? []) {
        expect(findImplementedSimulation(alias)).toBe(definition);
        expect(findImplementedSimulation(`/simulations/${alias}`)).toBe(
          definition,
        );
      }
      for (const legacyPath of definition.legacyPaths) {
        expect(findImplementedSimulation(legacyPath)).toBe(definition);
      }
    }
    expect(findImplementedSimulation("not-a-simulation")).toBeUndefined();
  });

  it("keeps the PR Solubility contribution on one canonical class", () => {
    const definition = findImplementedSimulation(
      "c5-ch07-a03-soluble-and-insoluble-substances",
    );

    expect(definition?.contribution).toMatchObject({
      source: "pr-8",
      contributor: "Aditya K. R. Pandey",
    });
    expect(definition?.module.legacyAliases).toContain(
      "experiments-with-water-soluble-insoluble",
    );
    expect(definition?.legacyPaths).toContain(
      "/simulations/experiments-with-water-soluble-insoluble",
    );

    const resolved = resolveSimulationPath(
      "/simulations/experiments-with-water-soluble-insoluble/?source=legacy#lab",
    );
    expect(resolved).toEqual({
      definition,
      canonicalPath:
        "/simulations/c5-ch07-a03-soluble-and-insoluble-substances",
      redirect: true,
    });
  });

  it("normalizes safe canonical trailing slash, query, and hash lookup", () => {
    const definition = IMPLEMENTED_SIMULATIONS[0];
    const canonicalPath = routeForSimulation(definition);

    expect(resolveSimulationPath(`${canonicalPath}/?mode=browser#stage-1`)).toEqual(
      {
        definition,
        canonicalPath,
        redirect: false,
      },
    );
    expect(resolveSimulationPath("/simulations/not-real?mode=browser")).toBeUndefined();
  });

  it.each([
    ["module ID", (first: ImplementedSimulationDefinition, second: ImplementedSimulationDefinition) => {
      second.module.id = first.module.id;
    }],
    ["slug", (first: ImplementedSimulationDefinition, second: ImplementedSimulationDefinition) => {
      second.module.slug = first.module.slug;
    }],
    ["viewer key", (first: ImplementedSimulationDefinition, second: ImplementedSimulationDefinition) => {
      second.module.viewerKey = first.module.viewerKey;
    }],
  ])("rejects a duplicate %s before exposing lookup maps", (_label, mutate) => {
    const first = mutableClone(IMPLEMENTED_SIMULATIONS[0]);
    const second = mutableClone(IMPLEMENTED_SIMULATIONS[1]);
    mutate(first, second);

    expect(() => createImplementedSimulationRegistry([first, second])).toThrow(
      /duplicate/i,
    );
  });

  it("rejects canonical slug shadowing and canonical or legacy path collisions", () => {
    const first = mutableClone(IMPLEMENTED_SIMULATIONS[0]);
    const aliasShadow = mutableClone(IMPLEMENTED_SIMULATIONS[1]);
    aliasShadow.module.legacyAliases = [first.module.slug];

    expect(() =>
      createImplementedSimulationRegistry([first, aliasShadow]),
    ).toThrow(/alias.*canonical slug/i);

    const canonicalCollision = mutableClone(IMPLEMENTED_SIMULATIONS[1]);
    canonicalCollision.legacyPaths = [routeForSimulation(first)];
    expect(() =>
      createImplementedSimulationRegistry([first, canonicalCollision]),
    ).toThrow(/legacy path.*canonical path/i);

    const duplicateLegacy = mutableClone(IMPLEMENTED_SIMULATIONS[2]);
    const duplicateLegacyPeer = mutableClone(IMPLEMENTED_SIMULATIONS[3]);
    duplicateLegacy.legacyPaths = ["/simulations/shared-old-path"];
    duplicateLegacyPeer.legacyPaths = ["/simulations/shared-old-path/"];
    expect(() =>
      createImplementedSimulationRegistry([
        duplicateLegacy,
        duplicateLegacyPeer,
      ]),
    ).toThrow(/legacy path.*collision/i);
  });

  it("rejects invalid records before exposing lookup maps", () => {
    const invalid = mutableClone(IMPLEMENTED_SIMULATIONS[0]);
    invalid.module.stages += 1;

    expect(() => createImplementedSimulationRegistry([invalid])).toThrow(
      /implemented\.module\.stages/,
    );
  });

  it("publishes defensively cloned, deeply frozen definitions", () => {
    expect(Object.isFrozen(IMPLEMENTED_SIMULATIONS)).toBe(true);
    expect(Object.isFrozen(IMPLEMENTED_SIMULATIONS[0])).toBe(true);
    expect(Object.isFrozen(IMPLEMENTED_SIMULATIONS[0].module)).toBe(true);
    expect(() =>
      (IMPLEMENTED_SIMULATIONS as ImplementedSimulationDefinition[]).push(
        IMPLEMENTED_SIMULATIONS[0],
      ),
    ).toThrow(TypeError);
    expect(() => {
      (IMPLEMENTED_SIMULATIONS[0].module as { title: string }).title =
        "Mutated title";
    }).toThrow(TypeError);

    const source = [mutableClone(IMPLEMENTED_SIMULATIONS[0])];
    const registry = createImplementedSimulationRegistry(source);
    source[0].module.title = "Changed after construction";
    expect(registry.definitions[0].module.title).not.toBe(
      "Changed after construction",
    );
  });
});
