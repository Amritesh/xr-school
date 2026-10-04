import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createColourMemoryScene,
  createColourSpecimen,
} from "../../apps/web/lib/colourAdventureScene";
import {
  COLOUR_MEMORY_QUESTIONS,
  applyColourAdventureAction,
  colourMemoryActionId,
  createColourAdventureProgress,
} from "../../apps/web/lib/colourAdventureLesson";

const panel = (title: string) => {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.5),
    new THREE.MeshBasicMaterial(),
  );
  mesh.userData.text = title;
  return mesh;
};
function visible(object: THREE.Object3D): boolean {
  return object.visible && (!object.parent || visible(object.parent));
}

describe("Colour quiz: rendered 3D / DOM parity", () => {
  it("provides one real specimen and exactly the active question options for all ten questions", () => {
    const parent = new THREE.Group();
    const scene = createColourMemoryScene(parent, panel);
    let progress = createColourAdventureProgress();
    for (const question of COLOUR_MEMORY_QUESTIONS) {
      scene.update(progress);
      const options = scene.targets.filter(
        (target) =>
          visible(target) &&
          target.userData.actionId !== "complete-memory-check",
      );
      expect(options.map((target) => target.userData.actionId)).toEqual(
        question.optionIds.map((id) => colourMemoryActionId(question.id, id)),
      );
      const specimens: string[] = [];
      parent.traverse((object) => {
        if (object.name.startsWith("colour-specimen-") && visible(object))
          specimens.push(object.name);
      });
      expect(specimens).toEqual([
        `colour-specimen-${question.objectName.toLowerCase()}`,
      ]);
      expect(
        scene.targets.find(
          (target) => target.userData.actionId === "complete-memory-check",
        )!.userData.disabled,
      ).toBe(true);
      progress = applyColourAdventureAction(
        progress,
        "memory-check",
        colourMemoryActionId(question.id, question.correctColourId),
      ).progress;
    }
    scene.update(progress);
    expect(scene.targets.filter((target) => visible(target))).toHaveLength(1);
    expect(
      scene.targets.find(
        (target) => target.userData.actionId === "complete-memory-check",
      )!.userData.disabled,
    ).toBe(false);
    scene.update(createColourAdventureProgress());
    expect(
      scene.targets.find(
        (target) => target.userData.actionId === "complete-memory-check",
      )!.userData.disabled,
    ).toBe(true);
  });

  it("gives every authored specimen non-empty finite geometry at a consistent scale", () => {
    for (const question of COLOUR_MEMORY_QUESTIONS) {
      const object = createColourSpecimen(question.objectName);
      const size = new THREE.Box3()
        .setFromObject(object)
        .getSize(new THREE.Vector3());
      expect(size.length()).toBeGreaterThan(0.5);
      expect(size.length()).toBeLessThan(2);
      expect(Number.isFinite(size.length())).toBe(true);
    }
  });
});
