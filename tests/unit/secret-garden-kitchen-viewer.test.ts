import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const viewer = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/SecretGardenKitchenViewer.tsx",
  ),
  "utf8",
);

describe("Class 7 Secret Kitchen of the Garden VR adventure", () => {
  it("covers the complete Chlorie story journey", () => {
    for (const stage of [
      "The Magical Garden",
      "Journey Underground",
      "The Xylem Water Elevator",
      "The Green Food Factory",
      "The Stomata Gates",
      "The Photosynthesis Laboratory",
      "Oxygen Returns to the Air",
      "The Phloem Food Highway",
      "The Garden Comes Alive",
      "Build Photosynthesis",
      "Guardian of the Green Kitchen",
    ]) {
      expect(viewer).toContain(stage);
    }
  });

  it("uses four realistic, topic-specific 360-degree environments", () => {
    for (const environment of [
      "nutrition-plants-garden-360.png",
      "nutrition-plants-roots-360.png",
      "nutrition-plants-xylem-360.png",
      "nutrition-plants-leaf-cell-360.png",
    ]) {
      expect(viewer).toContain(`/environments/${environment}`);
      expect(
        existsSync(
          resolve(process.cwd(), "apps/web/public/environments", environment),
        ),
      ).toBe(true);
    }
    expect(viewer).toContain("applyRealisticEnvironment");
    expect(viewer).toContain("realisticEnvironment.dispose()");
  });

  it("teaches the plant structures and transport pathways accurately", () => {
    for (const concept of [
      "root hairs",
      "Xylem transports water and dissolved minerals upward",
      "chloroplasts contain chlorophyll",
      "Guard cells control their opening and closing",
      "Phloem transports dissolved sugars",
      "stored as starch",
      "Green plants are producers",
    ]) {
      expect(viewer.toLowerCase()).toContain(concept.toLowerCase());
    }
  });

  it("states the photosynthesis inputs, products and chlorophyll role", () => {
    expect(viewer).toContain("CARBON DIOXIDE + WATER");
    expect(viewer).toContain("GLUCOSE + OXYGEN");
    expect(viewer).toContain("light captured by chlorophyll");
    expect(viewer).toContain("is required but is not used up as a reactant");
  });

  it("provides a seven-item challenge with four correct requirements", () => {
    for (const correct of [
      "Sunlight",
      "Water",
      "Carbon Dioxide",
      "Chlorophyll",
    ]) {
      expect(viewer).toContain(`name: \"${correct}\"`);
    }
    for (const distractor of ["Stone", "Fire", "Ready-made Food"]) {
      expect(viewer).toContain(`name: \"${distractor}\"`);
    }
    expect(viewer).toContain("selectedIngredientsRef");
    expect(viewer).toContain("selectIngredient");
  });

  it("turns each discovery into controller-selectable animated work", () => {
    expect(viewer).toContain("registerHotspot");
    expect(viewer).toContain("stageInteractables");
    expect(viewer).toContain("rootDrops.forEach");
    expect(viewer).toContain("xylemDrops.forEach");
    expect(viewer).toContain("chloroplasts.forEach");
    expect(viewer).toContain("carbonDioxide.forEach");
    expect(viewer).toContain("foodParticles.forEach");
    expect(viewer).toContain("PRESS A AGAIN TO CONTINUE");
  });

  it("keeps the proven Quest controls and complete narration flow", () => {
    expect(viewer).toContain("createQuestVrControls");
    expect(viewer).toContain("onPrimary: performAction");
    expect(viewer).toContain("B or right grip");
    expect(viewer).toContain("left joystick walks");
    expect(viewer).toContain("playNarration(NARRATIONS[stageRef.current])");
    expect(viewer).toContain("Replay Chlorie’s narration");
  });

  it("requires each discovery before the next scene", () => {
    expect(viewer).toContain("completedStagesRef");
    expect(viewer).toContain(
      "if (completedStagesRef.current.has(currentStage))",
    );
    expect(viewer).toContain(
      "disabled={!currentComplete || stage === STAGES.length - 1}",
    );
  });
});
