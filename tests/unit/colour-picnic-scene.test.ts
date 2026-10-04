import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  createColourPicnicState,
  reduceColourPicnic,
} from "../../apps/web/lib/colourPicnicLesson";
import { createColourPicnicScene } from "../../apps/web/lib/colourPicnicScene";

const requiredTargets = [
  "red-apple",
  "green-apple",
  "banana",
  "basket",
  "paint-red",
  "paint-blue",
  "paint-yellow",
  "cup",
  "brush",
  "flag-red",
  "flag-blue",
  "flag-yellow",
  "flag-stand",
  "bird",
];

describe("Colour Picnic garden scene", () => {
  it("builds recognizable raycastable props in a bounded child-height composition", () => {
    const scene = new THREE.Scene();
    const world = createColourPicnicScene(scene);
    expect(new Set(world.targets.keys())).toEqual(new Set(requiredTargets));
    expect(world.targets.size).toBe(requiredTargets.length);
    for (const id of requiredTargets) {
      const object = world.targets.get(id)!;
      let tagged = 0;
      object.traverse((child) => {
        if (child.userData.targetId === id) tagged += 1;
      });
      expect(tagged).toBeGreaterThan(0);
      const bounds = new THREE.Box3().setFromObject(object);
      expect(bounds.isEmpty()).toBe(false);
      for (const value of [...bounds.min.toArray(), ...bounds.max.toArray()])
        expect(Number.isFinite(value)).toBe(true);
    }
    expect(world.root.children.length).toBeLessThan(45);
    world.dispose();
    expect(scene.children).not.toContain(world.root);
  });

  it("shows the current activity and keeps completed work visible", () => {
    const world = createColourPicnicScene(new THREE.Scene());
    let state = reduceColourPicnic(createColourPicnicState(), {
      type: "start",
    });
    world.update(state, 0.016, 0);
    expect(world.targets.get("red-apple")!.visible).toBe(true);
    expect(world.targets.get("paint-blue")!.visible).toBe(false);
    state = reduceColourPicnic(state, {
      type: "pick-fruit",
      fruit: "red-apple",
    });
    state = reduceColourPicnic(state, { type: "place-fruit" });
    state = reduceColourPicnic(state, { type: "next" });
    world.update(state, 0.016, 1);
    expect(world.targets.get("red-apple")!.visible).toBe(true);
    expect(world.targets.get("paint-blue")!.visible).toBe(true);
    expect(world.targets.get("brush")!.visible).toBe(true);
    state = reduceColourPicnic(state, { type: "select-paint", colour: "red" });
    state = reduceColourPicnic(state, { type: "paint", cell: 0 });
    world.update(state, 0.016, 2);
    const patch = world.root.getObjectByName("cup-paint-cell-0") as THREE.Mesh;
    expect(patch.visible).toBe(true);
    expect((patch.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
      0xc93730,
    );
    world.dispose();
  });

  it("provides finite close frames for every activity", () => {
    const world = createColourPicnicScene(new THREE.Scene());
    for (const phase of [
      "welcome",
      "fruit",
      "paint",
      "decorate",
      "celebrate",
    ] as const) {
      const frame = world.getFrame(phase);
      expect(frame.position.distanceTo(frame.target)).toBeGreaterThan(1.2);
      expect(frame.position.distanceTo(frame.target)).toBeLessThan(4.5);
      expect(frame.position.y).toBeGreaterThan(frame.target.y);
    }
    world.dispose();
  });
});
